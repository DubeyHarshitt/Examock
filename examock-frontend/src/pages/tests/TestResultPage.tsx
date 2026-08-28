// src/pages/tests/TestResultPage.tsx
// Shows score, percentile, time taken, and a per-question breakdown.
// Prefers the rich submit result passed via router state; otherwise
// fetches GET /test/:id/result?attemptId=

import { useLocation, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Trophy,
  Target,
  Clock,
  RotateCcw,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, Button, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { getResult } from "../../api/test.api";
import { cn } from "../../utils/cn";

interface QuestionReview {
  questionId: string;
  selected: "A" | "B" | "C" | "D" | null;
  isCorrect: boolean;
  marksAwarded: number;
  explanation?: string | null;
}

interface SubmitPayload {
  attemptId: string;
  score: number;
  totalMarks: number;
  percentile: number;
  timeTakenSec: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  questionResults: QuestionReview[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function TestResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const submitResult = (location.state as SubmitPayload | null) ?? null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["test-result", id, submitResult?.attemptId],
    queryFn: () => getResult(id!, submitResult!.attemptId),
    enabled: !!id && !!submitResult?.attemptId,
    staleTime: 1000 * 60 * 5,
  });

  // Prefer the rich submit payload passed in router state
  const result = submitResult;

  return (
    <AppShell section="student">
      <PageHeader
        title="Test Result"
        action={
          <Link
            to="/tests"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600"
          >
            <ArrowLeft className="w-3 h-3" /> All tests
          </Link>
        }
      />

      <div className="mt-6 max-w-3xl space-y-6">
        {!result && isLoading ? (
          <SkeletonCard />
        ) : !result ? (
          <EmptyState
            title="No result yet"
            description="Complete a test to view your result here."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : (
          <>
            {/* ── Score summary ──────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-700">
                      {result.score}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      / {result.totalMarks}
                    </p>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                  <SummaryStat
                    icon={<Trophy className="w-4 h-4 text-amber-500" />}
                    label="Percentile"
                    value={`${Math.round(result.percentile)}`}
                  />
                  <SummaryStat
                    icon={<Clock className="w-4 h-4 text-gray-500" />}
                    label="Time taken"
                    value={formatTime(result.timeTakenSec)}
                  />
                  <SummaryStat
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    label="Correct"
                    value={`${result.correct ?? 0}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <ResultChip
                  label="Correct"
                  count={result.correct ?? 0}
                  variant="success"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                />
                <ResultChip
                  label="Incorrect"
                  count={result.incorrect ?? 0}
                  variant="danger"
                  icon={<XCircle className="w-4 h-4" />}
                />
                <ResultChip
                  label="Unattempted"
                  count={result.unattempted ?? 0}
                  variant="muted"
                  icon={<MinusCircle className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* ── Question-by-question review ───────────────── */}
            {result.questionResults?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-bold text-gray-900 mb-4">
                  Question Review
                </h2>
                <div className="space-y-3">
                  {result.questionResults.map((item, i) => (
                    <div
                      key={item.questionId}
                      className={cn(
                        "rounded-xl border p-4",
                        item.isCorrect
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-red-200 bg-red-50/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          {item.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          Q{i + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            Your answer:{" "}
                            <span className="font-semibold">
                              {item.selected ?? "—"}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold",
                              item.marksAwarded > 0
                                ? "text-emerald-600"
                                : item.marksAwarded < 0
                                  ? "text-red-600"
                                  : "text-gray-400"
                            )}
                          >
                            {item.marksAwarded > 0 ? "+" : ""}
                            {item.marksAwarded}
                          </span>
                        </div>
                      </div>
                      {item.explanation && (
                        <p className="mt-2 text-xs text-gray-500">
                          {item.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link to={`/tests/${id}/take`} className="flex-1">
                <Button className="w-full" icon={<RotateCcw className="w-4 h-4" />}>
                  Retake Test
                </Button>
              </Link>
              <Link to="/tests" className="flex-1">
                <Button variant="outline" className="w-full">
                  More Tests
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function ResultChip({
  label,
  count,
  variant,
  icon,
}: {
  label: string;
  count: number;
  variant: "success" | "danger" | "muted";
  icon: React.ReactNode;
}) {
  const colors = {
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-700",
    muted: "bg-gray-50 text-gray-500",
  };
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-1",
        colors[variant]
      )}
    >
      <div className="flex items-center gap-1.5">{icon}</div>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
