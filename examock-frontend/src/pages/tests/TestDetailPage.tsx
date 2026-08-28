// src/pages/tests/TestDetailPage.tsx
// Test detail with instructions, marks scheme, and access gating.
// Fetches GET /test/:id → { test: TestDetail }

import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  ListChecks,
  Lock,
  Play,
  Trophy,
  Info,
  AlertTriangle,
  FileQuestion,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, Badge, Button, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { getTestById } from "../../api/test.api";
import type { TestDetail } from "../../types/test.types";

function typeLabel(type: TestDetail["type"]) {
  return type === "CHAPTER"
    ? "Chapter Test"
    : type === "MODULE"
      ? "Module Test"
      : "Full Syllabus Test";
}

export default function TestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["test", id],
    queryFn: () => getTestById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

  const test: TestDetail | undefined = data?.test;

  return (
    <AppShell section="student">
      <PageHeader
        title="Test Details"
        action={
          <Link
            to="/tests"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600"
          >
            <ArrowLeft className="w-3 h-3" /> All tests
          </Link>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <SkeletonCard className="max-w-2xl" />
        ) : isError || !test ? (
          <EmptyState
            title="Test not found"
            description="We couldn't find this test."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* ── Header card ──────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="primary">{typeLabel(test.type)}</Badge>
                  <h1 className="mt-3 text-xl font-bold text-gray-900">
                    {test.title}
                  </h1>
                  {(test.subject?.name || test.topic?.name) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {test.subject?.name}
                      {test.subject?.name && test.topic?.name ? " • " : ""}
                      {test.topic?.name}
                    </p>
                  )}
                </div>
                {!test.isFree && (
                  <Badge variant="warning">
                    <Lock className="w-3 h-3" />
                    {test.hasAccess ? "Unlocked" : "Premium"}
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <Stat tile="Duration" value={`${test.durationMins} min`} icon={<Clock className="w-4 h-4" />} />
                <Stat tile="Questions" value={`${test.questionCount}`} icon={<FileQuestion className="w-4 h-4" />} />
                <Stat tile="Total Marks" value={`${test.totalMarks}`} icon={<Trophy className="w-4 h-4" />} />
              </div>
            </div>

            {/* ── Instructions ─────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Info className="w-4 h-4 text-indigo-600" /> Instructions
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
                <li>Read each question carefully before selecting an answer.</li>
                <li>You must select an option and it auto-saves as you go.</li>
                <li>Marking scheme: +{4} for correct, -{1} for incorrect (if applicable).</li>
                <li>The timer runs continuously and the test auto-submits when time is up.</li>
                <li>You can navigate freely between questions before submitting.</li>
                {test.instructions && (
                  <li className="pt-2 text-gray-500 whitespace-pre-line">
                    {test.instructions}
                  </li>
                )}
              </ul>
            </div>

            {/* ── Access gate / CTA ────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center text-center">
              {test.hasAccess ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    You can take this test now. Good luck!
                  </p>
                  <Button
                    size="lg"
                    icon={<Play className="w-5 h-5" />}
                    onClick={() => navigate(`/tests/${test.id}/take`)}
                  >
                    Start Test
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    This is a premium test
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Unlock this test to attempt it. Payment integration is
                    coming soon.
                  </p>
                  <Button variant="outline" className="mt-4" disabled>
                    Unlock
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  tile,
  value,
  icon,
}: {
  tile: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
      <div className="text-indigo-600">{icon}</div>
      <div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wide">{tile}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
