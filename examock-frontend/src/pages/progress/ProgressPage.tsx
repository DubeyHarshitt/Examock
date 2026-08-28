// src/pages/progress/ProgressPage.tsx
// Student progress overview — topic completion across all subjects.
// Fetches GET /student/progress (grouped by subject) plus the dashboard's
// suggested weak topics, and renders a study-planner-style allocation widget
// using a client-side heuristic (exam date + per-topic completion + scores).

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
import { Card } from "../../components/ui";
import { Badge } from "../../components/ui";
import { EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useProgress, useDashboard } from "../../hooks/student/useStudentData";
import type { SubjectProgressGroup } from "../../types/student.types";

interface TopicProgressRow {
  topicId: string;
  topicName: string;
  bestScore: number | null;
  attemptCount: number;
  videosWatched: number;
  lastActivity: string | null;
}

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

  if (isLoading) {
    return (
      <AppShell section="student">
        <div className="space-y-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
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
          <h1 className="text-xl font-bold text-gray-900">Your Progress</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track topic mastery, test attempts, and videos watched
          </p>
        </div>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          <Smartphone className="w-4 h-4" /> Ask AI about these
        </Link>
      </div>

      {/* ── Summary cards ────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          label="Topics with a score"
          value={totals.topicsDone}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-indigo-600" />}
          label="Avg best score"
          value={`${avgBest}%`}
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
          label="Total attempts"
          value={totals.attempts}
        />
        <StatCard
          icon={<ListVideo className="w-5 h-5 text-rose-600" />}
          label="Videos watched"
          value={totals.videos}
        />
      </div>

      {/* ── Study planner widget ─────────────────────────────── */}
      <StudyPlanner
        suggestedCount={suggested.length}
        stats={{ avgBest, topicsDone: totals.topicsDone, totalTopics: allTopics.length }}
      />

      {/* ── Progress by subject ──────────────────────────────── */}
      {groups.length === 0 && allTopics.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No progress yet"
            description="Attempt a mock test or watch videos to start building your progress."
            icon={<BarChart3 className="w-6 h-6 text-gray-400" />}
            action={
              <Link
                to="/tests"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Take a test
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <Card
              key={group.subjectId}
              title={group.subjectName}
              subtitle={`${group.topics.length} topic${group.topics.length !== 1 ? "s" : ""}`}
            >
              <div className="space-y-4">
                {group.topics.map((topic) => (
                  <TopicRow key={topic.topicId} topic={topic} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

// ── Topic progress row with a completion bar ─────────────────────

function TopicRow({ topic }: { topic: TopicProgressRow }) {
  const pct =
    topic.bestScore != null
      ? Math.max(0, Math.min(100, Math.round(topic.bestScore)))
      : 0;
  const color =
    pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <Link
      to={`/progress/${topic.topicId}`}
      className="block rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {topic.topicName}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
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
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

// ── Stat card ───────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
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
        <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
          <TrendingUp className="w-3 h-3" /> {readiness}% ready
        </span>
      }
    >
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
          style={{ width: `${readiness}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-gray-700 flex items-start gap-2">
        <Target className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
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
