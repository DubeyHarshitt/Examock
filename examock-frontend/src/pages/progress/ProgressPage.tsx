// src/pages/progress/ProgressPage.tsx
// Student progress overview — topic completion across all subjects, an overall
// readiness ring, count-up summary stats, a study-planner widget, and
// color-coded per-subject topic rows.
// Fetches GET /student/progress (grouped by subject) plus the dashboard's
// suggested weak topics.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  TrendingUp,
  Target,
  ListVideo,
  Smartphone,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { Card, Badge, StatCard, ProgressRing, Reveal, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useProgress, useDashboard } from "../../hooks/student/useStudentData";
import { cn } from "../../utils/cn";
import { subjectHue, type SubjectHue } from "../../utils/subjectColor";
import type {
  SubjectProgressGroup,
  TopicProgressRow,
} from "../../types/student.types";

export default function ProgressPage() {
  const { data, isLoading, isError } = useProgress();
  const dash = useDashboard();

  // Normalise the response (array directly, or { groups: [...] })
  const groups: SubjectProgressGroup[] = Array.isArray(data)
    ? data
    : (data?.groups ?? []);

  // Summary numbers
  const totals = useMemo(() => {
    let topicsDone = 0;
    let attempts = 0;
    let videos = 0;
    for (const g of groups) {
      for (const t of g.topics) {
        if (t.bestScore != null) topicsDone += 1;
        attempts += t.attemptCount ?? 0;
        videos += t.videosWatched ?? 0;
      }
    }
    return { topicsDone, attempts, videos };
  }, [groups]);

  // Compute an overall completion percentage (avg best score, or topics attempted)
  const allTopics = groups.flatMap((g) => g.topics);
  const avgBest =
    allTopics.length > 0
      ? Math.round(
          allTopics.reduce((acc, t) => acc + (t.bestScore ?? 0), 0) /
            allTopics.length
        )
      : 0;

  const suggested = dash.data?.suggestedTopics ?? [];

  const readiness =
    allTopics.length === 0
      ? 0
      : Math.round((totals.topicsDone / allTopics.length) * 100);

  if (isLoading) {
    return (
      <AppShell section="student">
        <div className="space-y-6">
          <SkeletonCard className="h-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  if (isError || (!data && !Array.isArray(data))) {
    return (
      <AppShell section="student">
        <EmptyState
          title="Could not load progress"
          description="Something went wrong while fetching your progress. Please try again."
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
        />
      </AppShell>
    );
  }

  return (
    <AppShell section="student">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
            Your Progress
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track topic mastery, test attempts, and videos watched
          </p>
        </div>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <Smartphone className="w-4 h-4" /> Ask AI about these
        </Link>
      </div>

      {/* ── Readiness hero ─────────────────────────────────── */}
      <Reveal>
        <div className="mt-6 card-surface p-6 flex flex-col sm:flex-row items-center gap-6">
          <ProgressRing value={readiness} size={124} stroke={11} className="shrink-0">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {readiness}%
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                Ready
              </p>
            </div>
          </ProgressRing>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-display text-lg font-extrabold text-slate-900">
              Overall preparedness
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {readiness >= 70
                ? "Great momentum — keep the pace! Targeted revision will push you further."
                : readiness >= 40
                  ? "Good work — a steady test rhythm will close the gap."
                  : "Let's build momentum with a few chapter-wise tests."}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3" />
                {totals.topicsDone} topics with a score
              </Badge>
              <Badge variant="primary">{allTopics.length} total topics</Badge>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Summary cards ────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          delay={60}
          label="Topics with a score"
          value={totals.topicsDone}
          icon={<CheckCircle2 className="w-5 h-5" />}
          tile="bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
        />
        <StatCard
          delay={120}
          label="Avg best score"
          value={avgBest}
          suffix="%"
          icon={<Target className="w-5 h-5" />}
          tile="bg-gradient-to-br from-brand-500 to-brand-700 text-white"
        />
        <StatCard
          delay={180}
          label="Total attempts"
          value={totals.attempts}
          icon={<BarChart3 className="w-5 h-5" />}
          tile="bg-gradient-to-br from-sky-500 to-blue-600 text-white"
        />
        <StatCard
          delay={240}
          label="Videos watched"
          value={totals.videos}
          icon={<ListVideo className="w-5 h-5" />}
          tile="bg-gradient-to-br from-rose-500 to-pink-600 text-white"
        />
      </div>

      {/* ── Study planner widget ─────────────────────────────── */}
      <Reveal delay={200}>
        <StudyPlanner
          suggestedCount={suggested.length}
          stats={{ avgBest, topicsDone: totals.topicsDone, totalTopics: allTopics.length }}
        />
      </Reveal>

      {/* ── Progress by subject ──────────────────────────────── */}
      {groups.length === 0 && allTopics.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No progress yet"
            description="Attempt a mock test or watch videos to start building your progress."
            icon={<BarChart3 className="w-6 h-6 text-slate-400" />}
            action={
              <Link
                to="/tests"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700"
              >
                Take a test
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group, gi) => {
            const hue = subjectHue(group.subjectName);
            return (
              <Reveal key={group.subjectId} delay={gi * 60}>
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full", hue.dot)} />
                      {group.subjectName}
                    </span>
                  }
                  subtitle={`${group.topics.length} topic${group.topics.length !== 1 ? "s" : ""}`}
                >
                  <div className="space-y-4">
                    {group.topics.map((topic) => (
                      <TopicRow key={topic.topicId} topic={topic} hue={hue} />
                    ))}
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

// ── Topic progress row with a completion bar ─────────────────────

function TopicRow({ topic, hue }: { topic: TopicProgressRow; hue: SubjectHue }) {
  const pct =
    topic.bestScore != null
      ? Math.max(0, Math.min(100, Math.round(topic.bestScore)))
      : 0;

  return (
    <Link
      to={`/progress/${topic.topicId}`}
      className={cn(
        "group block rounded-xl border border-slate-200 p-4 transition-colors",
        hue.hoverBorder
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-brand-700 transition-colors">
            {topic.topicName}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {topic.attemptCount} attempt{topic.attemptCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <ListVideo className="w-3 h-3" />
              {topic.videosWatched} watched
            </span>
            {topic.lastActivity && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(topic.lastActivity)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={pct >= 75 ? "success" : pct >= 40 ? "warning" : "danger"}>
            {topic.bestScore != null ? `${pct}%` : "No score"}
          </Badge>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", hue.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

// ── Study planner (client-side heuristic) ───────────────────────

function StudyPlanner({
  suggestedCount,
  stats,
}: {
  suggestedCount: number;
  stats: { avgBest: number; topicsDone: number; totalTopics: number };
}) {
  const readiness =
    stats.totalTopics === 0
      ? 0
      : Math.round((stats.topicsDone / stats.totalTopics) * 100);

  const recommendation = useMemo(() => {
    if (suggestedCount > 0)
      return `You have ${suggestedCount} weak topic${suggestedCount !== 1 ? "s" : ""} worth revisiting. Focus on them, then attempt chapter-wise mock tests to raise your best scores.`;
    if (stats.avgBest < 70)
      return "Your average best score is below 70%. Try daily chapter-wise tests and review explanations to close the gap.";
    return "Great momentum! Keep a steady test cadence and use the Ask AI feature to clarify doubts as they come up.";
  }, [suggestedCount, stats.avgBest]);

  return (
    <Card
      title="Study Planner"
      subtitle="A suggested focus based on your activity"
      action={
        <span className="flex items-center gap-1 text-xs font-semibold text-brand-600">
          <TrendingUp className="w-3 h-3" /> {readiness}% ready
        </span>
      }
    >
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
          style={{ width: `${readiness}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-700 flex items-start gap-2">
        <Target className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
        {recommendation}
      </p>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}