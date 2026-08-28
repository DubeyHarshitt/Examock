// src/pages/progress/TopicProgressPage.tsx
// Per-topic progress detail — stats + last 5 attempts on tests linked to the topic.
// Fetches GET /student/progress/:topicId.

import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ListVideo,
  Target,
  AlertTriangle,
  Clock,
  Trophy,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { Card } from "../../components/ui";
import { Badge } from "../../components/ui";
import { EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useTopicProgress } from "../../hooks/student/useStudentData";

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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
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

  return (
    <AppShell section="student">
      <Link
        to="/progress"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-indigo-600"
      >
        <ArrowLeft className="w-4 h-4" /> All Progress
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {data.topicName ?? "Topic"}
          </h1>
          {data.subjectName && (
            <p className="text-sm text-gray-500 mt-1">{data.subjectName}</p>
          )}
        </div>
        {!data.started ? (
          <Badge variant="muted">Not started</Badge>
        ) : (
          <div className="text-right">
            <p className={`text-2xl font-bold ${color}`}>{pct}%</p>
            <p className="text-[11px] text-gray-400">Best score</p>
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Award className="w-5 h-5 text-indigo-600" />}
          label="Best score"
          value={data.bestScore != null ? `${Math.round(data.bestScore)}%` : "—"}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-amber-600" />}
          label="Attempts"
          value={data.attemptCount ?? 0}
        />
        <StatCard
          icon={<ListVideo className="w-5 h-5 text-rose-600" />}
          label="Videos watched"
          value={data.videosWatched ?? 0}
        />
      </div>

      {/* ── Quick actions ────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to={`/topics/${topicId}/videos`}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
            <ListVideo className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Watch videos</p>
            <p className="text-xs text-gray-500">
              {data.totalVideos ?? 0} video{(data.totalVideos ?? 0) !== 1 ? "s" : ""} for this topic
            </p>
          </div>
        </Link>
        <Link
          to="/tests"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Take a test</p>
            <p className="text-xs text-gray-500">{data.totalQuestions ?? 0} questions on this topic</p>
          </div>
        </Link>
      </div>

      {/* ── Recent attempts ──────────────────────────────────── */}
      <div className="mt-6">
        <Card title="Recent Attempts" subtitle="Last 5 tests on this topic">
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No completed attempts on this topic yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentAttempts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {a.mockTestTitle ?? "Mock Test"}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
