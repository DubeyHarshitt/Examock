// src/pages/tests/TestListPage.tsx
// Lists all tests for the student's exam type (CHAPTER/MODULE/FULL, free & paid).
// Fetches GET /test → { tests: [...] }

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
import { PageHeader, Badge, Button, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { getTests } from "../../api/test.api";
import type { TestItem } from "../../types/test.types";

function TestTypeBadge({ type }: { type: TestItem["type"] }) {
  const map = {
    CHAPTER: { label: "Chapter", variant: "info" as const, icon: <StickyNote className="w-3 h-3" /> },
    MODULE: { label: "Module", variant: "primary" as const, icon: <Layers className="w-3 h-3" /> },
    FULL: { label: "Full Test", variant: "success" as const, icon: <Trophy className="w-3 h-3" /> },
  };
  const c = map[type] ?? map.CHAPTER;
  return (
    <Badge variant={c.variant}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

export default function TestListPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tests"],
    queryFn: () => getTests(),
    staleTime: 1000 * 60 * 2,
  });

  const tests: TestItem[] = data?.tests ?? [];

  return (
    <AppShell section="student">
      <PageHeader
        title="Mock Tests"
        subtitle="Chapter-wise, module and full syllabus tests for your exam"
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
            icon={<BookOpen className="w-6 h-6 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((test) => (
              <Link
                key={test.id}
                to={`/tests/${test.id}`}
                className="group flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <TestTypeBadge type={test.type} />
                  {!test.isFree && (
                    <Badge variant="warning">
                      <Lock className="w-3 h-3" />
                      {test.isPaid ? "Owned" : "Premium"}
                    </Badge>
                  )}
                </div>

                <h3 className="mt-3 text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                  {test.title}
                </h3>

                {(test.subject?.name || test.topic?.name) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {test.subject?.name}
                    {test.subject?.name && test.topic?.name ? " • " : ""}
                    {test.topic?.name}
                  </p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {test.durationMins} min
                  </span>
                  <span className="flex items-center gap-1">
                    <ListChecks className="w-3 h-3" />
                    {test._count?.questions ?? 0} Qs
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {test.totalMarks} marks
                  </span>
                </div>

                <div className="mt-4">
                  <Button
                    variant={test.isFree || test.isPaid ? "primary" : "outline"}
                    size="sm"
                    className="w-full"
                    icon={
                      test.isFree || test.isPaid ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )
                    }
                  >
                    {test.isFree || test.isPaid ? "View & Start" : "Unlock Test"}
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
