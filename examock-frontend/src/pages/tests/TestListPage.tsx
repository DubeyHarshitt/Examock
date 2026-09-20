// src/pages/tests/TestListPage.tsx
// Lists all tests for the student's exam type (CHAPTER/MODULE/FULL, free & paid)
// with type filter tabs. Fetches GET /test → { tests: [...] }

import { useState } from "react";
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
  StickyNote,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, Badge, EmptyState, FilterTabs, Chip, Reveal } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { getTests } from "../../api/test.api";
import { cn } from "../../utils/cn";
import type { TestItem } from "../../types/test.types";

type TestType = TestItem["type"];

const TYPE_META: Record<TestType, { label: string; chip: string; icon: React.ReactNode }> = {
  CHAPTER: {
    label: "Chapter",
    chip: "bg-sky-50 text-sky-700 border border-sky-200",
    icon: <StickyNote className="w-3 h-3" />,
  },
  MODULE: {
    label: "Module",
    chip: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: <Layers className="w-3 h-3" />,
  },
  FULL: {
    label: "Full Test",
    chip: "bg-brand-50 text-brand-700 border border-brand-200",
    icon: <Trophy className="w-3 h-3" />,
  },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "CHAPTER", label: "Chapter" },
  { id: "MODULE", label: "Module" },
  { id: "FULL", label: "Full Test" },
] as const;

export default function TestListPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tests"],
    queryFn: () => getTests(),
    staleTime: 1000 * 60 * 2,
  });
  const [filter, setFilter] = useState<string>("all");

  const tests: TestItem[] = data?.tests ?? [];
  const counts = {
    all: tests.length,
    CHAPTER: tests.filter((t) => t.type === "CHAPTER").length,
    MODULE: tests.filter((t) => t.type === "MODULE").length,
    FULL: tests.filter((t) => t.type === "FULL").length,
  };
  const visible =
    filter === "all" ? tests : tests.filter((t) => t.type === filter);

  return (
    <AppShell section="student">
      <PageHeader
        title="Mock Tests"
        subtitle="Chapter-wise, module and full syllabus tests for your exam"
        action={
          tests.length > 0 ? (
            <FilterTabs
              tabs={FILTERS.map((f) => ({
                id: f.id,
                label: f.label,
                count: counts[f.id as keyof typeof counts],
              }))}
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
            title="No tests of this type yet"
            description="Try another filter to see available tests."
            icon={<BookOpen className="w-6 h-6 text-slate-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((test, i) => {
              const meta = TYPE_META[test.type] ?? TYPE_META.CHAPTER;
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
                        {meta.label}
                      </span>
                      {!test.isFree && (
                        <Badge variant="warning">
                          <Lock className="w-3 h-3" />
                          {test.isPaid ? "Owned" : "Premium"}
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-3 font-display text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                      {test.title}
                    </h3>

                    {(test.subject?.name || test.topic?.name) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {test.subject?.name}
                        {test.subject?.name && test.topic?.name ? " • " : ""}
                        {test.topic?.name}
                      </p>
                    )}

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
                        {accessible ? "View & Start" : "Unlock Test"}
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