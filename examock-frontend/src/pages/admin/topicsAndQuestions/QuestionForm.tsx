// pages/admin/questions/component/QuestionForm.tsx
import { useState, useEffect, useRef } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { importCsvToBankApi } from "../../../api/admin.api";
import type { CsvImportResult, Questions } from "../../../store/admin/types/admin.types";
import {
  BookOpen,
  CheckCircle,
  Trash2,
  Edit3,
  XCircle,
  Upload,
  FileUp,
  FileSpreadsheet,
  AlertTriangle,
  X,
} from "lucide-react";
import QuestionImageSlot from "../../../components/admin/QuestionImageSlot";

interface QuestionFormProps {
  topicId: string; // Required — every question belongs to exactly one topic
}

// Adjust this interface to match your exact Store / Backend Question DTO
interface QuestionDTO {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
  topicId: string;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

const QuestionForm = ({ topicId }: QuestionFormProps) => {
  // Assuming your store exposes: questions list, create, update, delete, and error states
  const {
    questions,
    fetchQuestions, // Make sure to call this to sync data
    createQuestion,
    updateQuestion, // Added for edit capabilities
    deleteQuestion, // Added for deletion capabilities
    questionsError,
  } = useAdminStore();

  // Form states
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Marks scheme + figure (ticket 07)
  const [marks, setMarks] = useState<number | "">("");
  const [negMarks, setNegMarks] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [image, setImage] = useState<{ imageUrl?: string | null; imagePublicId?: string | null } | null>(null);

  // Track if we are editing an existing question
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Bulk import states — CSV file upload (ticket 08 replaces the pipe textarea;
  // valid rows commit immediately on the server, per-row errors come back with
  // their CSV line numbers).
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Sync / Fetch questions whenever the topic changes.
  // getQuestions on the backend only accepts topicId, so that's all we pass.
  useEffect(() => {
    if (fetchQuestions && topicId) {
      fetchQuestions(topicId, 1); // Assuming page 1 for simplicity; implement pagination as needed
    }
  }, [topicId, fetchQuestions]);

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  // Populate form with an existing question's values to update it
  const handleEditClick = (q: QuestionDTO) => {
    setEditingQuestionId(q.id);
    setText(q.text);
    setExplanation(q.explanation || "");
    setOptions([q.optionA, q.optionB, q.optionC, q.optionD]);
    setMarks(q.marks ?? "");
    setNegMarks(q.negMarks ?? "");
    setDifficulty(q.difficulty ?? "MEDIUM");
    setImage(q.imageUrl ? { imageUrl: q.imageUrl, imagePublicId: q.imagePublicId } : null);

    const idx = ["A", "B", "C", "D"].indexOf(q.correctOption);
    setCorrectOptionIdx(idx !== -1 ? idx : 0);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setText("");
    setExplanation("");
    setCorrectOptionIdx(0);
    setOptions(["", "", "", ""]);
    setMarks("");
    setNegMarks("");
    setDifficulty("MEDIUM");
    setImage(null);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this question?")) return;
    try {
      await deleteQuestion(id);
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicId) return; // Guard: a question can't be created without a topic
    if (!text.trim() || options.some((opt) => !opt.trim())) return;

    setIsSubmitting(true);
    try {
      const cleanOptions = options.map((o) => o.trim());
      const payload = {
        text: text.trim(),
        optionA: cleanOptions[0] ?? "",
        optionB: cleanOptions[1] ?? "",
        optionC: cleanOptions[2] ?? "",
        optionD: cleanOptions[3] ?? "",
        correctOption: ["A", "B", "C", "D"][correctOptionIdx] as "A" | "B" | "C" | "D",
        explanation: explanation.trim() || undefined,
        topicId, // Always required by the backend — never optional
        // Marks scheme + figure (ticket 07)
        ...(marks !== "" ? { marks: Number(marks) } : {}),
        ...(negMarks !== "" ? { negMarks: Number(negMarks) } : {}),
        difficulty,
        ...(image ? { imageUrl: image.imageUrl ?? null, imagePublicId: image.imagePublicId ?? null } : {}),
      };

      if (editingQuestionId) {
        // Update mode
        await updateQuestion(editingQuestionId, payload);
      } else {
        // Creation mode
        await createQuestion(payload);
      }

      // Reset form controls completely
      handleCancelEdit();
    } catch (err) {
      console.error("Failed compiling bank question operation:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * CSV import (ticket 08) — replaces the old pipe-delimited parser. The CSV
   * uses header columns (any order): text, optionA-D, correctOption,
   * explanation, imageUrl, difficulty, marks, negativeMarks, chapterId.
   * Rows WITHOUT a correctOption are REJECTED for the bank (never guessed) and
   * come back in `errors` with their line number; valid rows commit immediately.
   */
  const handleBulkImport = async () => {
    setCsvError(null);
    setCsvResult(null);
    if (!topicId || !csvFile) return;

    setIsBulkSubmitting(true);
    try {
      const result = await importCsvToBankApi(topicId, csvFile);
      setCsvResult(result);
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      fetchQuestions(topicId, 1); // sync the list — valid rows are already live
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCsvError(msg ?? "CSV import failed.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // The store's fetchQuestions(topicId) already scopes the request server-side,
  // so `questions` should already be this topic's pool. No client-side
  // re-filtering needed (and the old undefined-comparison filter never matched).
  const activeQuestions = questions ?? [];

  if (!topicId) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        Select a topic to manage its questions.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-brand-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Question bank</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeQuestions.length} question{activeQuestions.length !== 1 ? "s" : ""} in this topic
            </p>
          </div>
        </div>

        {/* Add method picker */}
        {!showBulkImport && (
          <button
            type="button"
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
          >
            <Upload size={14} /> Import multiple
          </button>
        )}
      </div>

      {showBulkImport && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-brand-600" /> Import questions from CSV
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowBulkImport(false);
                setCsvError(null);
                setCsvResult(null);
                setCsvFile(null);
              }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCsvFile(file);
                setCsvResult(null);
                setCsvError(null);
              }}
            />
            {csvFile ? (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <FileSpreadsheet size={16} className="text-brand-600" />
                {csvFile.name}
                <button
                  type="button"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvResult(null);
                    if (csvInputRef.current) csvInputRef.current.value = "";
                  }}
                  className="text-slate-400 hover:text-slate-600"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-brand-600 transition-colors"
              >
                <Upload size={20} />
                <span className="text-xs font-bold">Choose a .csv file</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400 leading-relaxed">
              Header row with columns in any order — text, optionA-D, correctOption, explanation,
              imageUrl, difficulty, marks, negativeMarks, chapterId
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every row <strong>must</strong> include a <span className="font-mono">correctOption</span> (A–D) — the
            answer is never guessed. Valid rows are added to the bank immediately; rows without a key are
            rejected and listed below with their line numbers.
          </p>
          {csvError && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{csvError}</p>
          )}
          {csvResult && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                {csvResult.created} question{csvResult.created === 1 ? "" : "s"} imported.
              </p>
              {csvResult.errors.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-red-100 bg-red-50/60 p-2.5">
                  {csvResult.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] font-medium text-red-600">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="font-mono font-bold">Line {err.line}:</span> {err.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={isBulkSubmitting || !csvFile || !topicId}
            onClick={handleBulkImport}
            className="w-full flex items-center justify-center gap-2 py-2 text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-semibold text-sm shadow-sm transition-colors"
          >
            <FileUp size={15} />
            {isBulkSubmitting ? "Importing..." : csvFile ? `Import ${csvFile.name}` : "Import CSV"}
          </button>
        </div>
      )}

      {/* Single question form + existing questions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Add / edit single question */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              {editingQuestionId ? "Edit question" : "Add a question"}
            </h3>
            {editingQuestionId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600 font-semibold"
              >
                <XCircle size={14} /> Cancel edit
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Question prompt *</label>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter question content..."
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Options (4 required) *</label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectOptionIdx(index)}
                  className={`p-1.5 rounded-md transition-colors ${
                    correctOptionIdx === index ? "text-green-600 bg-green-50" : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Mark as correct answer"
                >
                  <CheckCircle
                    size={18}
                    fill={correctOptionIdx === index ? "currentColor" : "none"}
                    className={correctOptionIdx === index ? "text-green-600" : ""}
                  />
                </button>
                <input
                  type="text"
                  required
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1 text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Answer explanation (optional)</label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the selected answer is correct..."
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Marks scheme + figure (ticket 07) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Marks</label>
              <input
                type="number"
                min={1}
                value={marks}
                onChange={(e) => setMarks(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Default 1"
                className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Neg. marks</label>
              <input
                type="number"
                min={0}
                step={0.25}
                value={negMarks}
                onChange={(e) => setNegMarks(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Default 0"
                className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none bg-white"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Figure (optional)</label>
            <QuestionImageSlot
              current={image}
              onChange={(img) => setImage(img ? { imageUrl: img.imageUrl, imagePublicId: img.imagePublicId } : null)}
            />
          </div>

          {questionsError && <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{questionsError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 disabled:opacity-50 text-white rounded-lg font-semibold text-sm shadow-sm transition-colors ${
              editingQuestionId ? "bg-amber-600 hover:bg-amber-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {isSubmitting ? "Saving..." : editingQuestionId ? "Save changes" : "Add to question bank"}
          </button>
        </form>

        {/* Existing questions */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-sm max-h-[calc(100vh-200px)] lg:max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4 text-slate-500">
            <BookOpen size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Questions in this topic ({activeQuestions.length})
            </span>
          </div>

          {activeQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-slate-400 space-y-2">
              <p className="text-sm italic">No questions in this topic yet.</p>
              <p className="text-xs max-w-xs">Use the form on the left to add the first one.</p>
            </div>
          ) : (
            <div className="space-y-6 divide-y divide-slate-100">
              {activeQuestions.map((q: Questions, qIdx: number) => {
                const itemOptions = [q.optionA, q.optionB, q.optionC, q.optionD];
                const correctLetter = q.correctOption;

                return (
                  <div key={q.id} className={`pt-4 first:pt-0 group relative rounded-lg transition-all ${editingQuestionId === q.id ? "bg-amber-50/40 p-3 ring-1 ring-amber-200" : ""}`}>
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEditClick(q)}
                        className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-brand-600 hover:border-brand-200 shadow-sm transition-colors"
                        title="Edit question"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(q.id)}
                        className="p-1.5 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors"
                        title="Delete question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 min-h-12.5 border border-slate-100 pr-16">
                      <span className="text-xs bg-brand-100 text-brand-800 font-bold px-1.5 py-0.5 rounded mr-2">Q{qIdx + 1}.</span>
                      <p className="inline text-sm text-slate-800 font-medium whitespace-pre-wrap">{q.text}</p>
                    </div>
                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt=""
                        loading="lazy"
                        className="mt-2 max-h-40 rounded-lg border border-slate-100 object-contain"
                      />
                    )}

                    <div className="space-y-1.5 mt-3">
                      {itemOptions.map((opt, oIdx) => {
                        const letter = ["A", "B", "C", "D"][oIdx];
                        const isCorrect = letter === correctLetter;

                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                              isCorrect
                                ? "bg-green-50/70 border-green-300 text-green-900 shadow-sm"
                                : "bg-white border-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full border font-bold shrink-0 ${
                                isCorrect ? "bg-green-600 text-white border-green-600" : "bg-slate-50 text-slate-400"
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="break-all">{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-2.5 p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                        <span className="font-bold block mb-0.5">Solution explanation:</span>
                        <p className="whitespace-pre-wrap">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;