// pages/admin/questions/component/QuestionForm.tsx
import { useState, useEffect } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { Eye, CheckCircle, Trash2, Edit3, XCircle } from "lucide-react";

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

  // Track if we are editing an existing question
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

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

    const idx = ["A", "B", "C", "D"].indexOf(q.correctOption);
    setCorrectOptionIdx(idx !== -1 ? idx : 0);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setText("");
    setExplanation("");
    setCorrectOptionIdx(0);
    setOptions(["", "", "", ""]);
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

  // The store's fetchQuestions(topicId) already scopes the request server-side,
  // so `questions` should already be this topic's pool. No client-side
  // re-filtering needed (and the old undefined-comparison filter never matched).
  const activeQuestions = questions ?? [];

  if (!topicId) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
        Select a topic to manage its questions.
      </div>
    );
  }

  return (
  /* Added items-start to prevent layout stretching glitches */
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start bg-gray-50 border border-gray-200 rounded-xl p-5">
    
    {/* Left Column: Form Controls */}
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-sm h-fit sticky top-6">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          {editingQuestionId ? "Modify question" : "Create new question"}
        </h3>
        {editingQuestionId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600 font-semibold"
          >
            <XCircle size={14} /> Cancel edit
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Question prompt *</label>
        <textarea
          required
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter question content..."
          className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Options Pool */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Options (4 required) *</label>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrectOptionIdx(index)}
              className={`p-1.5 rounded-md transition-colors ${
                correctOptionIdx === index ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-gray-600"
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
              className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        ))}
      </div>

      {/* Optional Context Explanation */}
      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Answer explanation (optional)</label>
        <textarea
          rows={2}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explain why the selected answer is correct..."
          className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {questionsError && <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{questionsError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-2 disabled:opacity-50 text-white rounded-lg font-semibold text-sm shadow-sm transition-colors ${
          editingQuestionId ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {isSubmitting ? "Saving..." : editingQuestionId ? "Save changes" : "Add question to bank"}
      </button>
    </form>

    {/* Right Column: Live Data Bank Display (Updatable / Deletable) */}
    {/* Added sticky top-6 here to keep both sides balanced, preventing weird overlapping when scrolling */}
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col shadow-sm max-h-[calc(100vh-200px)] lg:max-h-[80vh] overflow-y-auto sticky top-6">
      <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2 mb-4 text-gray-500">
        <Eye size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">
          Questions in this topic ({activeQuestions.length})
        </span>
      </div>

      {activeQuestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 text-gray-400 space-y-2">
          <p className="text-sm italic">No questions in this topic yet.</p>
          <p className="text-xs max-w-xs">Use the form on the left to add the first one.</p>
        </div>
      ) : (
        <div className="space-y-6 divide-y divide-gray-100">
          {activeQuestions.map((q: any, qIdx: number) => {
            const itemOptions = [q.optionA, q.optionB, q.optionC, q.optionD];
            const correctLetter = q.correctOption;

            return (
              <div key={q.id} className={`pt-4 first:pt-0 group relative rounded-lg transition-all ${editingQuestionId === q.id ? "bg-amber-50/40 p-3 ring-1 ring-amber-200" : ""}`}>
                {/* Action Bar */}
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleEditClick(q)}
                    className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"
                    title="Edit question"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(q.id)}
                    className="p-1.5 bg-white border border-gray-200 rounded-md text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors"
                    title="Delete question"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Question Prompt */}
                <div className="bg-gray-50 rounded-lg p-3 min-h-12.5 border border-gray-100 pr-16">
                  <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded mr-2">Q{qIdx + 1}.</span>
                  <p className="inline text-sm text-gray-800 font-medium whitespace-pre-wrap">{q.text}</p>
                </div>

                {/* Options Render */}
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
                            : "bg-white border-gray-100 text-gray-600"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full border font-bold shrink-0 ${
                            isCorrect ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="break-all">{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation context */}
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
);
};

export default QuestionForm;