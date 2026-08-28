// src/pages/dashboard/dashboardPage.tsx
// Real student dashboard — replaces the placeholder stub.
// Fetches dashboard data from GET /api/student/dashboard and renders
// summary cards, recent attempts, suggested weak topics, and quick links.

import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Target,
  TrendingUp,
  ArrowRight,
  Award,
  Clock,
  ChevronRight,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { Card } from "../../components/ui";
import { Badge } from "../../components/ui";
import { Button } from "../../components/ui";
import { EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useDashboard } from "../../hooks/student/useStudentData";
import { useAuthStore } from "../../store/auth.store";

/** Format seconds into "Xm Ys" */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/** Format ISO date to a short human-readable string */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const { user, isAdmin } = useAuthStore();

  // Real dashboard payload fields (mirror backend student.service.js)
  const examType = data?.examType;
  const subjects: { id: string; name: string; topicCount: number }[] =
    data?.subjects ?? [];
  const recentAttempts: {
    id: string;
    score: number;
    percentile: number;
    timeTakenSec: number;
    completedAt: string;
    mockTest?: { title?: string; totalMarks?: number };
  }[] = data?.recentAttempts ?? [];
  const suggestedTopics: {
    topicId: string;
    topicName: string;
    subjectName: string;
    bestScore: number | null;
  }[] = data?.suggestedTopics ?? [];
  const totalTopicsAttempted = data?.totalTopicsAttempted ?? 0;

  // ── Loading skeleton ───────────────────────────────────────
  if (isLoading) {
    return (
      <AppShell section="student">
        <div className="space-y-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (isError || !data) {
    return (
      <AppShell section="student">
        <EmptyState
          title="Could not load dashboard"
          description="Something went wrong while fetching your data. Please try again."
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          action={
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell section="student">
      <div className="space-y-6">
        {/* ── Welcome banner ──────────────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
          <h1 className="text-xl font-bold">
            Welcome back{user?.name ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="text-indigo-100 text-sm mt-1">
            Preparing for{" "}
            <span className="font-semibold text-white">
              {examType?.name ?? "your exam"}
            </span>
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link to="/tests">
              <Button
                variant="secondary"
                size="sm"
                icon={<Target className="w-4 h-4" />}
              >
                Take a Test
              </Button>
            </Link>
            <Link to="/subjects">
              <Button
                variant="ghost"
                size="sm"
                className="text-white border border-white/30 hover:bg-white/10"
                icon={<BookOpen className="w-4 h-4" />}
              >
                Browse Subjects
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Summary cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
            label="Subjects"
            value={subjects.length}
          />
          <StatCard
            icon={<FileText className="w-5 h-5 text-emerald-600" />}
            label="Topics Explored"
            value={totalTopicsAttempted}
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
            label="Tests Taken"
            value={recentAttempts.length}
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-rose-600" />}
            label="Weak Topics"
            value={suggestedTopics.length}
          />
        </div>

        {/* ── Quick links ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink to="/tests" icon={<Target className="w-5 h-5" />} label="Mock Tests" />
          <QuickLink to="/notes" icon={<FileText className="w-5 h-5" />} label="Notes" />
          <QuickLink to="/channels" icon={<BookOpen className="w-5 h-5" />} label="Channels" />
          <QuickLink to="/progress" icon={<TrendingUp className="w-5 h-5" />} label="Progress" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Recent attempts ──────────────────────────────────── */}
          <Card title="Recent Tests" subtitle="Your last completed attempts">
            {recentAttempts.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                You haven&apos;t taken any tests yet.{" "}
                <Link to="/tests" className="text-indigo-600 font-semibold hover:underline">
                  Start one now
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {attempt.mockTest?.title ?? "Mock Test"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {attempt.score}/{attempt.mockTest?.totalMarks ?? "—"}
                        </span>
                        <span>Pctl {Math.round(attempt.percentile)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(attempt.timeTakenSec)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">
                      {formatDate(attempt.completedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Suggested weak topics ───────────────────────────── */}
          <Card
            title="Weak Areas"
            subtitle="Topics where you need more practice"
            action={
              <Link
                to="/progress"
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            }
          >
            {suggestedTopics.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Take some tests to get personalized suggestions.
              </p>
            ) : (
              <div className="space-y-3">
                {suggestedTopics.slice(0, 5).map((topic) => (
                  <div
                    key={topic.topicId}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {topic.topicName}
                      </p>
                      {topic.subjectName && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {topic.subjectName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {topic.bestScore !== null ? (
                        <Badge variant="warning">{Math.round(topic.bestScore)}%</Badge>
                      ) : (
                        <Badge variant="muted">Not attempted</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Subjects overview ──────────────────────────────────── */}
        {subjects.length > 0 && (
          <Card title="Your Subjects">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <Link
                  key={subject.id}
                  to={`/subjects/${subject.id}/topics`}
                  className="flex items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {subject.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {subject.topicCount} topic{subject.topicCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Admin shortcut */}
        {isAdmin() && (
          <div className="text-center">
            <Link
              to="/admin-dashboard"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Open Admin Panel →
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Helper sub-components ──────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
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

function QuickLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
    >
      <div className="text-indigo-600">{icon}</div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
    </Link>
  );
}
