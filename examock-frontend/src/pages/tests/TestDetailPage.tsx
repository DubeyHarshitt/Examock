// src/pages/tests/TestDetailPage.tsx
// Test detail with instructions, marks scheme, and access gating.
// Fetches GET /test/:id → { test: TestDetail }

import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Lock,
  Play,
  Trophy,
  Info,
  AlertTriangle,
  FileQuestion,
  CheckCircle2,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, Badge, Button, EmptyState, Reveal } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { getTestById } from "../../api/test.api";
import { cn } from "../../utils/cn";
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
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600"
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
            <Reveal>
              <div className="relative overflow-hidden card-surface p-6">
                <div
                  aria-hidden="true"
                  className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-brand-100/60 blur-2xl"
                />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="primary">{typeLabel(test.type)}</Badge>
                    <h1 className="mt-3 font-display text-xl font-extrabold text-slate-900">
                      {test.title}
                    </h1>
                    {(test.subject?.name || test.topic?.name) && (
                      <p className="text-sm text-slate-500 mt-1">
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
                  <Stat
                    tile="Duration"
                    value={`${test.durationMins} min`}
                    icon={<Clock className="w-4 h-4" />}
                    iconTile="bg-gradient-to-br from-amber-500 to-orange-600"
                  />
                  <Stat
                    tile="Questions"
                    value={`${test.questionCount}`}
                    icon={<FileQuestion className="w-4 h-4" />}
                    iconTile="bg-gradient-to-br from-sky-500 to-blue-600"
                  />
                  <Stat
                    tile="Total Marks"
                    value={`${test.totalMarks}`}
                    icon={<Trophy className="w-4 h-4" />}
                    iconTile="bg-gradient-to-br from-brand-500 to-brand-700"
                  />
                </div>
              </div>
            </Reveal>

            {/* ── Instructions ─────────────────────────────────── */}
            <Reveal delay={60}>
              <div className="card-surface p-6">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </span>
                  Instructions
                </h2>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                  {[
                    "Read each question carefully before selecting an answer.",
                    "You must select an option and it auto-saves as you go.",
                    `Marking scheme: +${4} for correct, -${1} for incorrect (if applicable).`,
                    "The timer runs continuously and the test auto-submits when time is up.",
                    "You can navigate freely between questions before submitting.",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {line}
                    </li>
                  ))}
                  {test.instructions && (
                    <li className="pl-6.5 pt-1 text-slate-500 whitespace-pre-line">
                      {test.instructions}
                    </li>
                  )}
                </ul>
              </div>
            </Reveal>

            {/* ── Access gate / CTA ────────────────────────────── */}
            <Reveal delay={120}>
              <div className="card-surface p-6 flex flex-col items-center text-center">
                {test.hasAccess ? (
                  <>
                    <p className="text-sm text-slate-600 mb-4">
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
                    <p className="text-sm font-semibold text-slate-900">
                      This is a premium test
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Unlock this test to attempt it. Payment integration is
                      coming soon.
                    </p>
                    <Button variant="outline" className="mt-4" disabled>
                      Unlock
                    </Button>
                  </>
                )}
              </div>
            </Reveal>
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
  iconTile,
}: {
  tile: string;
  value: string;
  icon: React.ReactNode;
  iconTile: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm",
          iconTile
        )}
      >
        {icon}
      </div>
      <p className="mt-2.5 text-base font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{tile}</p>
    </div>
  );
}