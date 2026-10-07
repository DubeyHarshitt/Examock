// src/pages/admin/tests/AddFromBankDialog.tsx
// Add-from-bank dialog (ticket 06 / design §6). A dialog OVER the grid — the
// old two-pane builder is gone. Exam → Subject → Chapter are dependent
// selects; the chapter's questions list with checkboxes; "Add N" appends
// them to the grid as pending ref rows (linked by id on save).

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, Loader2, Search, X } from "lucide-react";
import {
  getExamsApi,
  getQuestionsApi,
  getSubjectsApi,
  getTopicsApi,
} from "../../../api/admin.api";
import type { Questions } from "../../../store/admin/types/admin.types";
import { useToast } from "../../../components/ui/toast/toast-context";
import { cn } from "../../../utils/cn";

interface AddFromBankDialogProps {
  /** Preselect this exam (the test's exam). */
  examTypeId: string;
  /** Preselect this subject (the test's subject, if subject-scoped). */
  subjectId?: string | null;
  /** Called with the selected bank questions; the parent appends ref rows. */
  onAdd: (questions: Questions[]) => void;
  onClose: () => void;
}

export default function AddFromBankDialog({
  examTypeId,
  subjectId,
  onAdd,
  onClose,
}: AddFromBankDialogProps) {
  const toast = useToast();

  const [examId, setExamId] = useState(examTypeId);
  const [subjectIdSel, setSubjectIdSel] = useState<string>(
    subjectId ?? ""
  );
  const [chapterId, setChapterId] = useState<string>("");

  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [chapters, setChapters] = useState<{ id: string; name: string }[]>([]);

  const [questions, setQuestions] = useState<Questions[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Every effect below is a pure `.then` chain — the dependent-select resets
  // live in the change handlers (event handlers may set state synchronously;
  // effect bodies may not, react-hooks/set-state-in-effect).

  // Load exams once.
  useEffect(() => {
    getExamsApi()
      .then((list) => setExams(list.map((e) => ({ id: e.id, name: e.name }))))
      .catch(() => setError("Could not load exams"));
  }, []);

  // Load subjects for the selected exam (mount + exam change).
  useEffect(() => {
    getSubjectsApi(examId)
      .then((list) =>
        setSubjects((list ?? []).map((s) => ({ id: s.id, name: s.name })))
      )
      .catch(() => setError("Could not load subjects"));
  }, [examId]);

  // Load chapters for the selected subject (mount + subject change).
  useEffect(() => {
    if (!subjectIdSel) return;
    getTopicsApi(subjectIdSel)
      .then((list) =>
        setChapters((list ?? []).map((t) => ({ id: t.id, name: t.name })))
      )
      .catch(() => setError("Could not load chapters"));
  }, [subjectIdSel]);

  // Load page 1 of the chapter's questions.
  useEffect(() => {
    if (!chapterId) return;
    getQuestionsApi(chapterId, 1)
      .then((data) => {
        setQuestions(data.questions);
        setTotal(data.total ?? 0);
        setPage(1);
        setError(null);
      })
      .catch(() => setError("Could not load questions"))
      .finally(() => setLoading(false));
  }, [chapterId]);

  const handleExamChange = (id: string) => {
    setExamId(id);
    setSubjectIdSel(subjectId ?? "");
    setChapterId("");
    setQuestions([]);
    setSelected(new Set());
  };

  const handleSubjectChange = (id: string) => {
    setSubjectIdSel(id);
    setChapterId("");
    setQuestions([]);
    setSelected(new Set());
  };

  const handleChapterChange = (id: string) => {
    setChapterId(id);
    setQuestions([]);
    setSelected(new Set());
    setLoading(true);
    setError(null);
  };

  const loadMore = () => {
    if (!chapterId) return;
    setLoading(true);
    getQuestionsApi(chapterId, page + 1)
      .then((data) => {
        setQuestions((prev) => [...prev, ...data.questions]);
        setTotal(data.total ?? 0);
        setPage(page + 1);
        setError(null);
      })
      .catch(() => setError("Could not load questions"))
      .finally(() => setLoading(false));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedQuestions = questions.filter((q) => selected.has(q.id));
  const hasMore = questions.length < total;

  const handleAdd = () => {
    if (selectedQuestions.length === 0) return;
    onAdd(selectedQuestions);
    toast.success(`${selectedQuestions.length} question${selectedQuestions.length === 1 ? "" : "s"} added to the grid`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Add from bank</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dependent selects */}
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Exam
            <select
              value={examId}
              onChange={(e) => handleExamChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Subject
            <div className="relative">
              <select
                value={subjectIdSel}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-8 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Chapter
            <div className="relative">
              <select
                value={chapterId}
                onChange={(e) => handleChapterChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-8 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">All chapters</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </label>
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!chapterId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={26} className="mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">
                Pick a chapter to browse its questions
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Questions are added by reference — the bank is never duplicated.
              </p>
            </div>
          ) : loading && questions.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-xs text-slate-400">
              <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="py-8 text-center text-xs font-semibold text-red-500">
              {error}
            </p>
          ) : questions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No questions in this chapter yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {questions.map((q) => {
                const isSel = selected.has(q.id);
                return (
                  <li key={q.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        isSel
                          ? "border-brand-300 bg-brand-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(q.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800">
                          {q.text}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {q.optionA} · {q.optionB} · {q.optionC} · {q.optionD}
                          {q.marks != null && ` · ${q.marks} marks`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold",
                          q.correctOption
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {q.correctOption ?? "—"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {chapterId && hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Loading…" : `Load more (${questions.length} of ${total})`}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs font-medium text-slate-500">
            {selected.size} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              Add {selected.size > 0 ? selected.size : ""} to grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
