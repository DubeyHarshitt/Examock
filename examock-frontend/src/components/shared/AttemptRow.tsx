// src/components/shared/AttemptRow.tsx
//
// One completed-attempt row, shared by the full attempts page and the
// "Test attempts" card on the Progress page. Links into the detailed result
// page (which fetches on its own, so a shared/opened link works).

import { Link } from "react-router-dom";
import { ChevronRight, Clock, Trophy } from "lucide-react";

import { Badge, ProgressRing } from "../ui";
import { cn } from "../../utils/cn";
import type { AttemptSummary } from "../../types/student.types";

function formatAttemptTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatAttemptDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function attemptScorePct(score: number, totalMarks: number): number {
  return totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
}

function ringColors(pct: number): { from: string; to: string } {
  if (pct >= 60) return { from: "#10b981", to: "#059669" };
  if (pct >= 40) return { from: "#f59e0b", to: "#d97706" };
  return { from: "#6366f1", to: "#4538d6" };
}

interface AttemptRowProps {
  attempt: AttemptSummary;
  /** Tighter spacing/smaller ring for the Progress-page card. */
  compact?: boolean;
}

export function AttemptRow({ attempt, compact = false }: AttemptRowProps) {
  const pct = attemptScorePct(attempt.score, attempt.totalMarks);
  const colors = ringColors(pct);

  return (
    <Link
      to={`/tests/${attempt.mockTestId}/result?attemptId=${attempt.id}`}
      className={cn(
        "group card-surface card-surface-hover flex items-center gap-4",
        compact ? "p-3" : "p-4",
        "hover:border-brand-300"
      )}
    >
      <ProgressRing
        value={pct}
        size={compact ? 40 : 48}
        stroke={5}
        from={colors.from}
        to={colors.to}
        className="shrink-0"
      >
        <span className="text-[11px] font-bold text-slate-800 tabular-nums">
          {pct}%
        </span>
      </ProgressRing>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
            {attempt.title}
          </p>
          {attempt.subjectName ? (
            <Badge variant="info">{attempt.subjectName}</Badge>
          ) : attempt.examTypeName ? (
            <Badge variant="primary">Full {attempt.examTypeName}</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            <span className="font-semibold text-slate-700">
              {attempt.score}/{attempt.totalMarks}
            </span>{" "}
            marks
          </span>
          <span>Percentile {Math.round(attempt.percentile)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatAttemptTime(attempt.timeTakenSec)}
          </span>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[11px] text-slate-400 whitespace-nowrap">
          {formatAttemptDate(attempt.completedAt)}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
      </div>
    </Link>
  );
}

export default AttemptRow;
