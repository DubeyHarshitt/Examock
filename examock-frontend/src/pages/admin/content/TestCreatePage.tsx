// src/pages/admin/content/TestCreatePage.tsx
// /admin/content/tests/new?examId=&subjectId= — create a test. Scope is
// inherited from the page the admin is on (design §5.1): a subject page locks
// the scope, an exam page offers "whole-exam" with an optional subject picker.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Lock, Plus } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { Breadcrumbs } from "../../../components/admin/Breadcrumbs";
import { createTestApi, getExamsApi, getSubjectsApi } from "../../../api/admin.api";
import { useToast } from "../../../components/ui/toast/toast-context";

export default function TestCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const queryExamId = searchParams.get("examId") ?? "";
  const querySubjectId = searchParams.get("subjectId") ?? "";

  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  const [examId, setExamId] = useState(queryExamId);
  const [subjectId, setSubjectId] = useState<string | "exam">(querySubjectId || "exam");
  const [title, setTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active exams for the picker.
  useEffect(() => {
    getExamsApi()
      .then((list) => {
        setExams(list.map((e) => ({ id: e.id, name: e.name })));
        if (!examId && list.length > 0) setExamId(list[0].id);
      })
      .catch(() => toast.error("Could not load exams"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load subjects for the current exam (dependent picker).
  useEffect(() => {
    if (!examId) return;
    getSubjectsApi(examId)
      .then((list) => setSubjects((list ?? []).map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => setSubjects([]));
  }, [examId]);

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === examId) ?? null,
    [exams, examId]
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId) ?? null,
    [subjects, subjectId]
  );

  // A subject-scoped create is only valid when the subject belongs to the exam.
  const scopeLocked = !!querySubjectId;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!examId) return setError("Pick an exam first");
    const marksNum = Number(totalMarks);
    const durationNum = Number(durationMins);
    if (!title.trim()) return setError("Title is required");
    if (!Number.isInteger(marksNum) || marksNum < 1)
      return setError("Total marks must be a whole number ≥ 1");
    if (!Number.isInteger(durationNum) || durationNum < 1)
      return setError("Duration must be a whole number ≥ 1");
    if (!scopeLocked && subjectId !== "exam" && !selectedSubject)
      return setError("Pick a subject or choose whole-exam scope");

    setError(null);
    setSubmitting(true);
    try {
      const created = await createTestApi({
        examTypeId: examId,
        title: title.trim(),
        totalMarks: marksNum,
        durationMins: durationNum,
        subjectId: subjectId === "exam" ? null : subjectId,
        isFree,
        instructions: instructions.trim() || undefined,
      });
      toast.success(`"${created.title}" created — add questions next`);
      navigate(`/admin/content/tests/${created.id}`);
    } catch (err: unknown) {
      const serverMessage = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(serverMessage ?? "Could not create the test");
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="New test" subtitle="Scope is inherited from where you clicked">
      <div className="space-y-6">
        <Breadcrumbs
          crumbs={[
            { label: "Content", to: "/admin/content/exams" },
            { label: "Tests", to: "/admin/content/tests" },
            { label: "New test" },
          ]}
        />

        <form
          onSubmit={handleSubmit}
          className="card-surface max-w-2xl space-y-5 p-5"
        >
          {/* Exam — whole-exam path + dependent subject picker */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Exam
            </label>
            <select
              value={examId}
              onChange={(e) => {
                setExamId(e.target.value);
                setSubjectId("exam");
              }}
              disabled={!!queryExamId}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Scope
            </label>
            {scopeLocked && selectedSubject && selectedExam ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                <Lock size={14} className="text-slate-400" />
                {selectedExam.name} › {selectedSubject.name}
                <span className="ml-auto text-[11px] font-semibold text-slate-400">
                  locked to this subject
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setSubjectId("exam")}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                    subjectId === "exam"
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
                  }`}
                >
                  New whole-exam test
                  <span className="text-[11px] font-semibold text-slate-400 normal-case">
                    covers the whole {selectedExam?.name ?? "exam"}
                  </span>
                </button>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    …or pick a subject
                  </span>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="exam">Whole exam (no subject)</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. "JEE Main 2025"'
              autoFocus
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Total marks
              </label>
              <input
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 720"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Duration (minutes)
              </label>
              <input
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 180"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          {/* Free / Paid — Paid disabled until the payment flow exists */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Access
            </label>
            <div className="inline-flex rounded-lg border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setIsFree(true)}
                className={`rounded-md px-4 py-1.5 text-xs font-bold transition-colors ${
                  isFree ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Free
              </button>
              <button
                type="button"
                disabled
                title="Paid tests aren't available yet"
                className={`cursor-not-allowed rounded-md px-4 py-1.5 text-xs font-bold transition-colors ${
                  !isFree ? "bg-brand-600 text-white" : "text-slate-400"
                }`}
              >
                Paid
              </button>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              Paid tests aren't available yet — tests are free by default.
            </p>
          </div>

          {/* Advanced → instructions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs font-bold text-slate-500 transition-colors hover:text-brand-600"
            >
              {showAdvanced ? "▾ Hide advanced" : "▸ Advanced — instructions"}
            </button>
            {showAdvanced && (
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Instructions shown to students before they start…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              {submitting ? "Creating…" : "Create test"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ChevronLeft size={14} /> Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}