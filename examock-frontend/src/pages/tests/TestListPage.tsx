// src/pages/tests/TestListPage.tsx
// Lists all tests for the student's exam type (subject-scoped or exam-wide,
// free & paid) with scope-derived filter tabs. Fetches GET /test → { tests }.
// Scope is derived from `subjectId` — there is no stored "type" (ticket 10).

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Layers,
  ListChecks,
  Lock,
  Play,
  Trophy,
  AlertTriangle,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, EmptyState, FilterTabs, Chip, Reveal } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { getTests } from "../../api/test.api";
import { PremiumBadge } from "../../components/shared/PremiumBadge";
import { cn } from "../../utils/cn";
import { testScope, scopeLabel } from "../../types/test.types";
import type { TestItem, Scope } from "../../types/test.types";

const SCOPE_META: Record<Scope, { chip: string; icon: React.ReactNode }> = {
  subject: {
    chip: "bg-sky-50 text-sky-700 border border-sky-200",
    icon: <Layers className="w-3 h-3" />,
  },
  exam: {
    chip: "bg-brand-50 text-brand-700 border border-brand-200",
    icon: <Trophy className="w-3 h-3" />,
  },
};

export default function TestListPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tests"],
    queryFn: () => getTests(),
    staleTime: 1000 * 60 * 2,
  });
  const [filter, setFilter] = useState<string>("all");

  const tests = useMemo<TestItem[]>(() => data?.tests ?? [], [data]);

  // Filters are subject-aware: "All", a "Full Exam" bucket, then one tab per
  // subject that actually has tests.
  const filters = useMemo(() => {
    const subjects = new Map<string, { id: string; label: string; count: number }>();
    for (const t of tests) {
      if (!t.subjectId) continue;
      const entry =
        subjects.get(t.subjectId) ??
        { id: t.subjectId, label: t.subject?.name ?? "Subject", count: 0 };
      entry.count += 1;
      subjects.set(t.subjectId, entry);
    }
    const fullCount = tests.filter((t) => !t.subjectId).length;
    return [
      { id: "all", label: "All", count: tests.length },
      ...(fullCount > 0 ? [{ id: "__exam", label: "Full Exam", count: fullCount }] : []),
      ...[...subjects.values()].sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [tests]);

  const visible =
    filter === "all"
      ? tests
      : filter === "__exam"
        ? tests.filter((t) => !t.subjectId)
        : tests.filter((t) => t.subjectId === filter);

  return (
    <AppShell section="student">
      <PageHeader
        title="Mock Tests"
        subtitle="Subject-wise and full-syllabus tests for your exam"
        action={
          tests.length > 0 ? (
            <FilterTabs
              tabs={filters.map((f) => ({ id: f.id, label: f.label, count: f.count }))}
              value={filter}
              onChange={setFilter}
            />
          ) : undefined
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load tests"
            description="Something went wrong fetching your mock tests."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : tests.length === 0 ? (
          <EmptyState
            title="No tests available"
            description="Tests for your exam will appear here once published."
            icon={<BookOpen className="w-6 h-6 text-slate-400" />}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No tests in this filter yet"
            description="Try another filter to see available tests."
            icon={<BookOpen className="w-6 h-6 text-slate-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((test, i) => {
              const meta = SCOPE_META[testScope(test)];
              const accessible = test.isFree || test.isPaid;
              return (
                <Reveal key={test.id} delay={i * 50}>
                  <Link
                    to={`/tests/${test.id}`}
                    className={cn(
                      "group card-surface card-surface-hover flex flex-col p-5 hover:-translate-y-0.5",
                      "hover:border-brand-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", meta.chip)}>
                        {meta.icon}
                        {scopeLabel(test)}
                      </span>
                      {!test.isFree && <PremiumBadge size="sm" />}
                    </div>

                    <h3 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                      {test.title}
                    </h3>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <Chip icon={<Clock className="w-3.5 h-3.5" />}>
                        {test.durationMins} min
                      </Chip>
                      <Chip icon={<ListChecks className="w-3.5 h-3.5" />}>
                        {test._count?.questions ?? 0} Qs
                      </Chip>
                      <Chip icon={<Trophy className="w-3.5 h-3.5" />}>
                        {test.totalMarks} marks
                      </Chip>
                    </div>

                    <div className="mt-auto pt-4">
                      <span
                        className={cn(
                          "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                          accessible
                            ? "bg-brand-600 text-white hover:bg-brand-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {accessible ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                        {accessible ? "View & Start" : "View Details"}
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
