// src/pages/progress/TopicProgressPage.tsx
// Per-topic progress detail — stats + last 5 attempts on tests linked to the
// topic, with a client-side sparkline of the attempt trend.
// Fetches GET /student/progress/:topicId.

import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  ListVideo,
  Target,
  AlertTriangle,
  Clock,
  Trophy,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { Card, Badge, StatCard, Sparkline, Reveal, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useTopicProgress } from "../../hooks/student/useStudentData";
import { cn } from "../../utils/cn";
import { subjectHue } from "../../utils/subjectColor";
import type { TopicAttemptSummary } from "../../types/student.types";

export default function TopicProgressPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { data, isLoading, isError } = useTopicProgress(topicId ?? "");

  if (isLoading) {
    return (
      <AppShell section="student">
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell section="student">
        <EmptyState
          title="Could not load topic progress"
          description="Something went wrong while fetching this topic."
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          action={
            <Link
              to="/progress"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Progress
            </Link>
          }
        />
      </AppShell>
    );
  }

  const pct =
    data.bestScore != null ? Math.round(data.bestScore) : 0;
  const color =
    pct >= 75 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-rose-600";
  const hue = subjectHue(data.subjectName ?? data.topicName ?? "Topic");

  // Trend of recent attempt percentages (score / totalMarks)
  const trend = (data.recentAttempts as TopicAttemptSummary[])
    .filter((a) => a.totalMarks > 0)
    .map((a) => (a.score / a.totalMarks) * 100);

  return (
    <AppShell section="student">
      <Link
        to="/progress"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="w-4 h-4" /> All Progress
      </Link>

      <Reveal>
        <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-xl font-extrabold text-slate-900">
              {data.topicName ?? "Topic"}
            </h1>
            {data.subjectName && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", hue.dot)} />
                {data.subjectName}
              </p>
            )}
          </div>
          {!data.started ? (
            <Badge variant="muted">Not started</Badge>
          ) : (
            <div className="text-right">
              <p className={cn("text-2xl font-extrabold tabular-nums", color)}>{pct}%</p>
              <p className="text-[11px] text-slate-400">Best score</p>
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Best score"
          value={data.bestScore != null ? Math.round(data.bestScore) : 0}
          suffix="%"
          icon={<Award className="w-5 h-5" />}
          tile="bg-gradient-to-br from-brand-500 to-brand-700 text-white"
          delay={40}
        />
        <StatCard
          label="Attempts"
          value={data.attemptCount ?? 0}
          icon={<Target className="w-5 h-5" />}
          tile="bg-gradient-to-br from-amber-500 to-orange-600 text-white"
          delay={80}
        />
        <StatCard
          label="Videos watched"
          value={data.videosWatched ?? 0}
          icon={<ListVideo className="w-5 h-5" />}
          tile="bg-gradient-to-br from-rose-500 to-pink-600 text-white"
          delay={120}
        />
      </div>

      {/* ── Quick actions ────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to={`/topics/${topicId}/videos`}
          className={cn(
            "group flex items-center gap-3 p-4 card-surface card-surface-hover transition-colors",
            hue.hoverBorder
          )}
        >
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", hue.tile)}>
            <ListVideo className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Watch videos</p>
            <p className="text-xs text-slate-500">
              {data.totalVideos ?? 0} video{(data.totalVideos ?? 0) !== 1 ? "s" : ""} for this topic
            </p>
          </div>
        </Link>
        <Link
          to="/tests"
          className="group flex items-center gap-3 p-4 card-surface card-surface-hover transition-colors hover:border-brand-300"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Take a test</p>
            <p className="text-xs text-slate-500">{data.totalQuestions ?? 0} questions on this topic</p>
          </div>
        </Link>
      </div>

      {/* ── Recent attempts ──────────────────────────────────── */}
      <div className="mt-6">
        <Card
          title="Recent Attempts"
          subtitle="Last 5 tests on this topic"
          action={
            trend.length >= 2 ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Score trend
                </span>
                <Sparkline points={trend} width={120} height={32} />
              </div>
            ) : undefined
          }
        >
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No completed attempts on this topic yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.recentAttempts.map((a: TopicAttemptSummary) => {
                const attemptPct =
                  a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0;
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/80 hover:bg-brand-50/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {a.mockTestTitle ?? "Mock Test"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {a.score}/{a.totalMarks}
                        </span>
                        <span>Pctl {Math.round(a.percentile)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(a.timeTakenSec)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={attemptPct >= 70 ? "success" : attemptPct >= 40 ? "warning" : "danger"}>
                      {attemptPct}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}