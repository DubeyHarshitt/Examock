// src/pages/tests/TestEnginePage.tsx
// JEE / NEET / CET-style exam console.
// Left = question + options; right = candidate info + timer + question palette +
// action buttons (Save & Next / Clear / Mark for Review & Next / Submit).
//
// Uses useTestStore + test.api to start/resume, fetch questions by index,
// auto-save answers, track a countdown timer, and submit.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
} from "lucide-react";

import { useAuthStore } from "../../store/auth.store";
import { useTestStore } from "../../store/test.store";
import {
  startTest,
  getQuestion,
  saveAnswer,
  submitTest,
} from "../../api/test.api";
import { useToast } from "../../components/ui/toast/toast-context";
import { ConfirmDialog, Skeleton } from "../../components/ui";
import { cn } from "../../utils/cn";
import type { OptionKey, QuestionResponse } from "../../types/test.types";

const OPTIONS: OptionKey[] = ["A", "B", "C", "D"];

function formatClock(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ── Status of a palette cell ───────────────────────────────────
type CellStatus = "answered" | "notAnswered" | "notVisited" | "marked" | "current";

function cellStatus(opts: {
  answered: boolean;
  isMarked: boolean;
  isVisited: boolean;
  isCurrent: boolean;
}): CellStatus {
  if (opts.isCurrent) return "current";
  if (opts.answered) return "answered";
  if (opts.isMarked) return "marked";
  if (opts.isVisited) return "notAnswered";
  return "notVisited";
}

const CELL_STYLES: Record<CellStatus, string> = {
  answered: "bg-green-500 text-white border-green-500",
  notAnswered: "bg-red-400 text-white border-red-400",
  notVisited: "bg-white text-gray-500 border-gray-300",
  marked: "bg-purple-500 text-white border-purple-500",
  current: "ring-2 ring-indigo-500 bg-indigo-100 text-indigo-700 border-indigo-300",
};

export default function TestEnginePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  // Test store state
  const attemptId = useTestStore((s) => s.attemptId);
  const answers = useTestStore((s) => s.answers);
  const currentIndex = useTestStore((s) => s.currentIndex);
  const totalQuestions = useTestStore((s) => s.totalQuestions);
  const startTestSession = useTestStore((s) => s.startTest);
  const saveAnswerLocal = useTestStore((s) => s.saveAnswer);
  const setCurrentIndex = useTestStore((s) => s.setCurrentIndex);
  const clearTest = useTestStore((s) => s.clearTest);

  // Engine-local state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionResponse | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [markedReview, setMarkedReview] = useState<Set<number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set());

  const submittedRef = useRef(false);

  // Map of question-index → questionId, learned as we load each question.
  // Lets the palette know the answered status of any visited question,
  // not just the currently-displayed one.
  const indexToIdRef = useRef<Record<number, string>>({});

  // ── Load a question by index ────────────────────────────────
  const loadQuestion = useCallback(
    async (index: number, overrideAttemptId?: string) => {
      const aid = overrideAttemptId ?? attemptId ?? useTestStore.getState().attemptId;
      if (!aid || !id) return;
      setQuestionLoading(true);
      try {
        const res = await getQuestion(id, aid, index);
        // Remember which questionId lives at this index for palette accuracy
        indexToIdRef.current[index] = res.question.id;
        setCurrentQuestion(res);
        setTimeRemaining(res.timeRemainingSec);
        setVisited((prev) => new Set(prev).add(index));
      } catch (err: any) {
        if (err?.response?.status === 410) {
          toast.error("Time is up — your test has ended.");
          handleExpire();
        } else {
          toast.error("Failed to load question. Please try again.");
        }
      } finally {
        setQuestionLoading(false);
      }
    },
    [attemptId, id]
  );

  // ── Start or resume on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      // Guard: if we already have this attempt in the store, don't reset.
      // Prevents a state wipe (answers/currentIndex) on accidental remount.
      if (submittedRef.current) return;
      setStarting(true);
      try {
        const { session } = await startTest(id);
        if (cancelled) return;

        // If we already initialized THIS exact attempt (e.g. a remount/revisit of
        // the same test), don't wipe answers/currentIndex — just refresh the timer
        // and reload the question at the current position. Prevents a "restart".
        if (
          useTestStore.getState().attemptId === session.attemptId &&
          useTestStore.getState().totalQuestions > 0
        ) {
          const savedIndex = useTestStore.getState().currentIndex;
          setTimeRemaining(session.timeRemainingSec);
          if (savedIndex >= 0 && savedIndex < session.totalQuestions) {
            await loadQuestion(savedIndex, session.attemptId);
          }
          return;
        }

        startTestSession(session.attemptId, session.totalQuestions);
        setTimeRemaining(session.timeRemainingSec);
        await loadQuestion(0, session.attemptId);
      } catch (err: any) {
        if (err?.response?.status === 410) {
          handleExpire();
        } else if (err?.response?.status === 403) {
          toast.error("Please purchase this test to continue.");
          navigate(`/tests/${id}`, { replace: true });
        } else {
          toast.error("Could not start the test. Please try again.");
          navigate(`/tests/${id}`, { replace: true });
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleExpire() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const aid = attemptId ?? useTestStore.getState().attemptId;
    clearTest();
    if (aid && id) {
      navigate(`/tests/${id}/result?attemptId=${aid}`, { replace: true });
    } else {
      navigate(`/tests/${id}`, { replace: true });
    }
  }

  // ── Countdown timer ─────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining == null) return;
    if (timeRemaining <= 0) {
      handleExpire();
      return;
    }
    const t = setTimeout(() => setTimeRemaining((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [timeRemaining]);

  // ── Actions ─────────────────────────────────────────────────
  const selectOption = async (option: OptionKey | null) => {
    if (!currentQuestion || !attemptId || !id) return;
    const q = currentQuestion.question;
    saveAnswerLocal(q.id, option);
    try {
      await saveAnswer(id, { attemptId, questionId: q.id, selectedOption: option });
    } catch {
      toast.error("Could not save answer. It may be lost on submit.");
    }
  };

  const toggleReview = () => {
    setMarkedReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const goTo = (index: number) => {
    if (index < 0 || index >= totalQuestions) return;
    setCurrentIndex(index);
    loadQuestion(index);
  };

  // Save & Next / Save & Mark — standard JEE console semantics
  const saveAndNext = () => {
    if (currentIndex < totalQuestions - 1) goTo(currentIndex + 1);
  };
  // Mark the current question for review, then advance
  const markAndNext = () => {
    setMarkedReview((prev) => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
    if (currentIndex < totalQuestions - 1) goTo(currentIndex + 1);
  };

  const clearResponse = () => {
    if (currentQuestion) selectOption(null);
  };

  const handleSubmit = async () => {
    if (!attemptId || !id || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const { result } = await submitTest(id, attemptId);
      clearTest();
      navigate(`/tests/${id}/result?attemptId=${result.attemptId}`, {
        state: result,
        replace: true,
      });
    } catch (err: any) {
      submittedRef.current = false;
      setSubmitting(false);
      if (err?.response?.status === 410) {
        handleExpire();
      } else {
        toast.error("Could not submit. Please try again.");
      }
    }
  };

  // ── Question status helpers ─────────────────────────────────
  const q = currentQuestion?.question;
  const saved = currentQuestion ? answers[currentQuestion.question.id] ?? null : null;
  const answeredCount = Object.values(answers).filter(Boolean).length;

  // ── Loading + not started ───────────────────────────────────
  if (starting || !attemptId || (questionLoading && !currentQuestion)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">
            {starting ? "Starting test…" : "Loading question…"}
          </p>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-500">Question not available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ═══════════ Top header bar ═══════════ */}
      <header className="sticky top-0 z-30 bg-[#1f4e78] text-white shadow">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "E"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate leading-tight">
                {user?.name ?? "Candidate"}
              </p>
              <p className="text-[11px] text-white/70 truncate">Online Examination</p>
            </div>
          </div>

          <div className="text-sm font-bold text-center hidden sm:block">
            EXAMOCK — MOCK TEST
          </div>

          {/* Timer */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-base font-bold",
              (timeRemaining ?? 0) < 60
                ? "bg-red-600 text-white"
                : "bg-white/15 text-white"
            )}
          >
            <span className="text-[11px] font-sans uppercase tracking-wide opacity-80 hidden sm:inline">
              Time
            </span>
            {formatClock(timeRemaining ?? 0)}
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Submit Test</span>
          </button>
        </div>
      </header>

      {/* ═══════════ Main exam body ═══════════ */}
      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
        {/* ── LEFT: Question area ────────────────────────────── */}
        <div className="bg-white border-2 border-gray-300 rounded-md shadow-sm flex flex-col">
          {/* Section bar */}
          <div className="bg-gray-100 border-b border-gray-300 px-5 py-2.5 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1f4e78]">
              Section A — MCQ
            </span>
            <span className="text-xs text-gray-500">
              Question No. {currentIndex + 1} of {totalQuestions}
            </span>
          </div>

          <div className="flex-1 p-6">
            {/* Show a lightweight loader while a question is being fetched
                so the previous question doesn't linger on screen. */}
            {questionLoading ? (
              <div aria-busy="true" aria-label="Loading question" className="py-2">
                {/* Question heading: number bubble + question text lines */}
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="space-y-2.5 flex-1 pt-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>

                {/* Four option rows: letter bubble + text lines */}
                <div className="mt-8 space-y-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-3 rounded-lg border-2 border-gray-200 bg-white"
                    >
                      <Skeleton className="mt-1 h-7 w-7 shrink-0 rounded-full" />
                      <div className="space-y-2 flex-1 pt-1.5">
                        <Skeleton className="h-3.5 w-11/12" />
                        <Skeleton className="h-3.5 w-7/12" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Question text */}
                <div className="flex gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#1f4e78] text-white flex items-center justify-center text-sm font-bold">
                    {currentIndex + 1}
                  </span>
                  <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                    {q.text}
                  </p>
                </div>

                {/* Options */}
                <div className="mt-8 space-y-4">
                  {OPTIONS.map((opt) => {
                    const text = q[`option${opt}` as keyof typeof q] as string;
                    const selected = saved === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => selectOption(selected ? null : opt)}
                        className={cn(
                          "w-full flex items-start gap-4 p-3 rounded-lg border-2 text-left transition-colors",
                          selected
                            ? "border-[#1f4e78] bg-indigo-50"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center text-sm font-bold",
                            selected
                              ? "border-[#1f4e78] bg-[#1f4e78] text-white"
                              : "border-gray-400 text-gray-500"
                          )}
                        >
                          {opt}
                        </span>
                        <span className="text-base text-gray-800">{text}</span>
                        {selected && (
                          <CheckCircle2 className="ml-auto w-5 h-5 text-[#1f4e78] shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Marks footnote */}
                <p className="mt-6 text-xs text-gray-400">
                  Marks: +{q.marks}
                  {q.negMarks > 0 ? ` / -${q.negMarks}` : " (no negative marks)"} •{" "}
                  {saved
                    ? "Answer saved"
                    : saved === null && currentQuestion
                      ? "Not answered yet"
                      : ""}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Candidate / palette / actions ───────────── */}
        <div className="space-y-4">
          {/* Candidate info + timer */}
          <div className="bg-white border-2 border-gray-300 rounded-md shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1f4e78] flex items-center justify-center text-white font-bold">
                {user?.name?.[0]?.toUpperCase() ?? "E"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user?.name ?? "Candidate"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Time Remaining</span>
              <span
                className={cn(
                  "font-mono text-lg font-bold",
                  (timeRemaining ?? 0) < 60 ? "text-red-600" : "text-[#1f4e78]"
                )}
              >
                {formatClock(timeRemaining ?? 0)}
              </span>
            </div>
          </div>

          {/* Question palette */}
          <div className="bg-white border-2 border-gray-300 rounded-md shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
              Question Palette
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              {answeredCount} answered • {totalQuestions - answeredCount} unanswered
            </p>

            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: totalQuestions }).map((_, i) => {
                const qid = indexToIdRef.current[i];
                const status = cellStatus({
                  answered: !!(qid && answers[qid]),
                  isMarked: markedReview.has(i),
                  isVisited: visited.has(i),
                  isCurrent: i === currentIndex,
                });
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "h-9 rounded-md border-2 text-xs font-bold flex items-center justify-center transition-colors",
                      CELL_STYLES[status]
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
              <Legend color="bg-green-500 border-green-500" label="Answered" />
              <Legend color="bg-red-400 border-red-400" label="Not Answered" />
              <Legend color="bg-white border-gray-300" label="Not Visited" />
              <Legend color="bg-purple-500 border-purple-500" label="Marked for Review" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <ActionButton
              primary
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={saveAndNext}
              disabled={currentIndex >= totalQuestions - 1 || submitting}
            >
              Save &amp; Next
            </ActionButton>
            <div className="grid grid-cols-2 gap-2.5">
              <ActionButton disabled={!saved || submitting} onClick={clearResponse}>
                Clear Response
              </ActionButton>
              <ActionButton disabled={submitting} onClick={markAndNext}>
                Mark for Review
              </ActionButton>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <ActionButton disabled={currentIndex === 0 || questionLoading || submitting} onClick={() => goTo(currentIndex - 1)}>
                <ChevronLeft className="w-4 h-4" /> Previous
              </ActionButton>
              <ActionButton disabled={currentIndex >= totalQuestions - 1 || questionLoading || submitting} onClick={() => goTo(currentIndex + 1)}>
                Next <ChevronRight className="w-4 h-4" />
              </ActionButton>
            </div>
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="w-full mt-1 py-2.5 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition-colors"
            >
              {submitting ? "Submitting…" : "Submit Test"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Submit confirmation ──────────────────────────────── */}
      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit test?"
        message={`You have answered ${answeredCount} of ${totalQuestions} questions. Once submitted, you cannot change your answers.`}
        confirmLabel="Submit"
        loading={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </div>
  );
}

// ── Small presentational helpers ───────────────────────────────

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-3 h-3 rounded border", color)} />
      {label}
    </span>
  );
}

function ActionButton({
  primary = false,
  disabled = false,
  onClick,
  children,
  icon,
}: {
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        primary
          ? "bg-[#1f4e78] text-white hover:bg-[#163a5c]"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
