// src/pages/dashboard/dashboardPage.tsx
// Real student dashboard — replaces the placeholder stub.
// Fetches dashboard data from GET /api/student/dashboard and renders
// welcome hero, count-up summary cards, recent attempts, suggested weak
// topics, and color-coded subject quick links.

import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Target,
  Clock,
  ChevronRight,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { Card, Badge, Button, EmptyState, SkeletonCard, StatCard, ProgressRing, Reveal, Chip } from "../../components/ui";
import { useDashboard } from "../../hooks/student/useStudentData";
import { useAuthStore } from "../../store/auth.store";
import { cn } from "../../utils/cn";
import { subjectHue } from "../../utils/subjectColor";

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

/** Gradient pair used for a percentile ring (higher = greener). */
function ringColors(pct: number): { from: string; to: string } {
  if (pct >= 80) return { from: "#10b981", to: "#059669" };
  if (pct >= 50) return { from: "#f59e0b", to: "#d97706" };
  return { from: "#f43f5e", to: "#e11d48" };
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
          <SkeletonCard className="h-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
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
        {/* ── Welcome hero ────────────────────────────────────── */}
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 sm:p-8 text-white shadow-pop">
            <div
              aria-hidden="true"
              className="absolute -top-20 -right-14 w-72 h-72 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-violet-400/25 blur-2xl"
            />
            <img
              src="/logo-mark.svg"
              alt=""
              aria-hidden="true"
              className="absolute -right-4 -bottom-8 w-44 h-44 opacity-[0.14] rotate-6"
              draggable={false}
            />
            <div className="relative">
              <h1 className="font-display text-xl sm:text-2xl font-extrabold">
                Welcome back{user?.name ? `, ${user.name}` : ""} 👋
              </h1>
              <p className="text-brand-100 text-sm mt-1">
                Preparing for{" "}
                <span className="font-semibold text-white">
                  {examType?.name ?? "your exam"}
                </span>
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
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
          </div>
        </Reveal>

        {/* ── Summary cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            delay={60}
            label="Subjects"
            value={subjects.length}
            icon={<BookOpen className="w-5 h-5" />}
            tile="bg-gradient-to-br from-brand-500 to-brand-600 text-white"
          />
          <StatCard
            delay={120}
            label="Topics Explored"
            value={totalTopicsAttempted}
            icon={<FileText className="w-5 h-5" />}
            tile="bg-gradient-to-br from-violet-500 to-purple-600 text-white"
          />
          <StatCard
            delay={180}
            label="Tests Taken"
            value={recentAttempts.length}
            icon={<BarChart3 className="w-5 h-5" />}
            tile="bg-gradient-to-br from-sky-500 to-blue-600 text-white"
          />
          <StatCard
            delay={240}
            label="Weak Topics"
            value={suggestedTopics.length}
            icon={<Target className="w-5 h-5" />}
            tile="bg-gradient-to-br from-rose-500 to-pink-600 text-white"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Recent attempts ──────────────────────────────────── */}
          <Reveal delay={100}>
            <Card title="Recent Tests" subtitle="Your last completed attempts">
              {recentAttempts.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  You haven&apos;t taken any tests yet.{" "}
                  <Link to="/tests" className="text-brand-600 font-semibold hover:underline">
                    Start one now
                  </Link>
                </p>
              ) : (
                <div className="space-y-2.5">
                  {recentAttempts.map((attempt) => {
                    const pct = Math.max(0, Math.min(100, attempt.percentile));
                    const colors = ringColors(pct);
                    return (
                      <div
                        key={attempt.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 hover:bg-brand-50/60 transition-colors"
                      >
                        <ProgressRing value={pct} size={44} stroke={5} from={colors.from} to={colors.to} className="shrink-0">
                          <span className="text-[10px] font-bold text-slate-800 tabular-nums">
                            P{Math.round(pct)}
                          </span>
                        </ProgressRing>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {attempt.mockTest?.title ?? "Mock Test"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">
                              {attempt.score}/{attempt.mockTest?.totalMarks ?? "—"}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(attempt.timeTakenSec)}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {formatDate(attempt.completedAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </Reveal>

          {/* ── Suggested weak topics ───────────────────────────── */}
          <Reveal delay={160}>
            <Card
              title="Weak Areas"
              subtitle="Topics where you need more practice"
              action={
                <Link
                  to="/progress"
                  className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              }
            >
              {suggestedTopics.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  Take some tests to get personalized suggestions.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {suggestedTopics.slice(0, 5).map((topic) => {
                    const score = topic.bestScore;
                    const severity =
                      score == null ? ("none" as const)
                      : score < 40 ? ("high" as const)
                      : score < 70 ? ("medium" as const)
                      : ("low" as const);
                    return (
                      <div
                        key={topic.topicId}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/80 hover:bg-brand-50/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {topic.topicName}
                          </p>
                          {topic.subjectName && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {topic.subjectName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {score !== null ? (
                            <Badge
                              variant={
                                severity === "high" ? "danger"
                                : severity === "medium" ? "warning"
                                : "success"
                              }
                            >
                              {Math.round(score)}%
                            </Badge>
                          ) : (
                            <Badge variant="muted">Not attempted</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </Reveal>
        </div>

        {/* ── Subjects quick chips (color-coded) ─────────────────── */}
        {subjects.length > 0 && (
          <Reveal delay={200}>
            <Card title="Your Subjects">
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => {
                  const hue = subjectHue(subject.name);
                  return (
                    <Link
                      key={subject.id}
                      to={`/subjects/${subject.id}/topics`}
                      className={cn(
                        "inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 bg-white transition-all hover:shadow-sm",
                        hue.hoverBorder
                      )}
                    >
                      <span className={cn("w-2.5 h-2.5 rounded-full", hue.dot)} />
                      <span className="text-sm font-semibold text-slate-800">
                        {subject.name}
                      </span>
                      <Chip className="!px-1.5 !py-0.5 text-[10px]">
                        {subject.topicCount} topic{subject.topicCount !== 1 ? "s" : ""}
                      </Chip>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </Reveal>
        )}

        {/* Admin shortcut */}
        {isAdmin() && (
          <div className="text-center">
            <Link
              to="/admin-dashboard"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Open Admin Panel →
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}