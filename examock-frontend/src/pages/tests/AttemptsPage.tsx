// src/pages/tests/AttemptsPage.tsx
//
// Attempt history — every completed mock test, newest first, paginated.
// Fetches GET /student/attempts → { attempts, total, page, pageSize, totalPages }.
// Each row links to the detailed result page (which now fetches on its own, so
// a shared/opened link works — see TestResultPage / F11).
//
// Reached from the Progress page's "Test attempts" card (not the desktop nav —
// the top bar is already full at 7 items).

import { useState } from "react";
import { Link } from "react-router-dom";
import { History, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, Button, EmptyState, Reveal } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { AttemptRow } from "../../components/shared/AttemptRow";
import { useAttempts } from "../../hooks/student/useStudentData";

const PAGE_SIZE = 20;

export default function AttemptsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAttempts(page, PAGE_SIZE);

  const attempts = data?.attempts ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <AppShell section="student">
      <PageHeader
        title="My Attempts"
        subtitle={
          data
            ? `${data.total} completed test${data.total === 1 ? "" : "s"}`
            : "Your test history and scores"
        }
        action={
          <Link
            to="/tests"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Take a test <ChevronRight className="w-3 h-3" />
          </Link>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load your attempts"
            description="Something went wrong fetching your test history."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : attempts.length === 0 ? (
          <EmptyState
            title="No attempts yet"
            description="Once you finish a mock test, it will appear here with your score and a full question review."
            icon={<History className="w-6 h-6" />}
            action={
              <Link
                to="/tests"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700"
              >
                Browse tests
              </Link>
            }
          />
        ) : (
          <>
            <div className="space-y-3">
              {attempts.map((a, i) => (
                <Reveal key={a.id} delay={Math.min(i, 8) * 40}>
                  <AttemptRow attempt={a} />
                </Reveal>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500">
                  Page {data?.page ?? page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
