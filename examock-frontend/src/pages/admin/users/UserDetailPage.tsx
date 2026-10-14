// src/pages/admin/users/UserDetailPage.tsx
//
// Full-screen admin view of a single user: identity & account, an activity
// summary, every test attempt (paginated, with a question-by-question
// breakdown per attempt), topic progress, and payment history.
//
// Replaces the old /admin/users modal. Reached from UsersPanel by clicking a
// row. Data: GET /admin/users/:id, /admin/users/:id/attempts,
// /admin/users/:id/attempts/:attemptId.

import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Calendar,
  GraduationCap,
  BarChart3,
  CreditCard,
  Trophy,
  Clock,
  ListVideo,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Activity,
  BookOpen,
  Wallet,
} from "lucide-react";

import { AdminLayout } from "../../../components/layout/AdminLayout";
import {
  Button,
  Badge,
  Modal,
  EmptyState,
  Alert,
  Skeleton,
  SkeletonCard,
  StatCard,
  FilterTabs,
} from "../../../components/ui";
import { useAdminStore } from "../../../store/admin/admin.store";
import { useToast } from "../../../components/ui/toast/toast-context";
import {
  getUserDetailApi,
  getUserAttemptsApi,
  getUserAttemptDetailApi,
} from "../../../api/admin.api";
import { cn } from "../../../utils/cn";
import type {
  AdminUserAttempt,
  AdminAttemptDetail,
  AdminAttemptQuestion,
} from "../../../types/admin.types";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatRupees(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

const ATTEMPT_STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  ABANDONED: "muted",
};

function attemptStatusVariant(status: string) {
  return ATTEMPT_STATUS_VARIANT[status] ?? "muted";
}

function statusLabel(status: string) {
  return status === "IN_PROGRESS" ? "In progress" : status.charAt(0) + status.slice(1).toLowerCase();
}

// ── Small building blocks ─────────────────────────────────────────────────────

function InfoField({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
      <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <div className="text-sm text-slate-800 font-medium mt-0.5 break-words">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count?: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card-surface p-5">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
        <span className="text-slate-400">{icon}</span>
        {title}
        {count != null && (
          <span className="text-xs font-semibold text-slate-400">({count})</span>
        )}
      </h3>
      {children}
    </div>
  );
}

// ── Attempt breakdown modal ───────────────────────────────────────────────────

function QuestionRow({ q, index }: { q: AdminAttemptQuestion; index: number }) {
  const options: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  return (
    <div className="border border-slate-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-slate-800">{q.text}</p>
        </div>
        <Badge
          variant={q.selected == null ? "muted" : q.isCorrect ? "success" : "danger"}
          className="shrink-0"
        >
          {q.selected == null
            ? "Unattempted"
            : q.isCorrect
              ? `+${q.marksAwarded}`
              : `${q.marksAwarded}`}
        </Badge>
      </div>

      {q.imageUrl && (
        <img
          src={q.imageUrl}
          alt=""
          className="rounded-lg max-h-48 mb-3 border border-slate-100"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {options.map((key) => {
          const isCorrect = key === q.correctOption;
          const isSelected = key === q.selected;
          return (
            <div
              key={key}
              className={cn(
                "flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                isCorrect
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : isSelected
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-slate-50 text-slate-600 border border-transparent"
              )}
            >
              <span className="font-bold shrink-0">{key}.</span>
              <span className="flex-1">{q.options[key]}</span>
              {isSelected && (
                <span className="shrink-0 text-[10px] font-bold uppercase opacity-80">
                  Picked
                </span>
              )}
              {isCorrect && (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              )}
            </div>
          );
        })}
      </div>

      {q.explanation && (
        <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          <span className="font-semibold text-slate-600">Explanation: </span>
          {q.explanation}
        </p>
      )}
    </div>
  );
}

function AttemptBreakdown({
  detail,
  loading,
  onClose,
}: {
  detail: AdminAttemptDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Attempt breakdown" size="lg">
      {loading || !detail ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-slate-900 flex-1 min-w-[12rem]">
              {detail.mockTestTitle}
            </p>
            <Badge variant={attemptStatusVariant(detail.status)}>
              {statusLabel(detail.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Score</p>
              <p className="text-sm font-bold text-slate-800">
                {detail.score ?? "—"}/{detail.totalMarks}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Percentile</p>
              <p className="text-sm font-bold text-slate-800">
                {detail.percentile != null ? Math.round(detail.percentile) : "—"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Time</p>
              <p className="text-sm font-bold text-slate-800">
                {formatDuration(detail.timeTakenSec)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Submitted</p>
              <p className="text-sm font-bold text-slate-800">
                {formatDate(detail.completedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-emerald-600">✓ {detail.correct} correct</span>
            <span className="text-red-600">✗ {detail.incorrect} incorrect</span>
            <span className="text-slate-400">– {detail.unattempted} unattempted</span>
          </div>

          <div className="space-y-3">
            {detail.questionResults.map((q, i) => (
              <QuestionRow key={q.questionId} q={q} index={i} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Attempts table ────────────────────────────────────────────────────────────

function AttemptsTable({
  attempts,
  onView,
}: {
  attempts: AdminUserAttempt[];
  onView: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-100">
            {["Test", "Subject", "Status", "Score", "Percentile", "Time", "Date", ""].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {h}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {attempts.map((a) => (
            <tr
              key={a.id}
              onClick={() => onView(a.id)}
              className="hover:bg-slate-50/60 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2.5">
                <span className="text-sm text-slate-800 font-medium">{a.mockTestTitle}</span>
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-500">
                {a.subjectName ?? "Full length"}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={attemptStatusVariant(a.status)}>
                  {statusLabel(a.status)}
                </Badge>
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-700 font-semibold">
                {a.score != null ? `${a.score}/${a.totalMarks}` : "—"}
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-500">
                {a.percentile != null ? Math.round(a.percentile) : "—"}
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-500">
                {formatDuration(a.timeTakenSec)}
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-400">
                {formatDate(a.completedAt ?? a.startedAt)}
              </td>
              <td className="px-3 py-2.5 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(a.id);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ATTEMPT_TABS = [
  { id: "", label: "All" },
  { id: "COMPLETED", label: "Completed" },
  { id: "IN_PROGRESS", label: "In progress" },
];

const DEFAULT_PAGE_SIZE = 20;

export default function UserDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const toast = useToast();
  const resetUserExam = useAdminStore((s) => s.resetUserExam);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [openAttemptId, setOpenAttemptId] = useState<string | null>(null);

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => getUserDetailApi(id),
    enabled: !!id,
  });

  const { data: attemptsData, isLoading: attemptsLoading } = useQuery({
    queryKey: ["admin", "user", id, "attempts", page, statusFilter],
    queryFn: () =>
      getUserAttemptsApi(id, {
        page,
        limit: DEFAULT_PAGE_SIZE,
        status: statusFilter || undefined,
      }),
    enabled: !!id,
    placeholderData: (prev) => prev,
  });

  const { data: attemptDetail, isLoading: attemptDetailLoading } = useQuery({
    queryKey: ["admin", "user", id, "attempt", openAttemptId],
    queryFn: () => getUserAttemptDetailApi(id, openAttemptId as string),
    enabled: !!id && !!openAttemptId,
  });

  const attempts = attemptsData?.attempts ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((attemptsData?.total ?? 0) / (attemptsData?.limit ?? DEFAULT_PAGE_SIZE)),
  );

  const handleReset = async () => {
    try {
      await resetUserExam(id);
      toast.success("Exam type reset — user must re-onboard");
      refetch();
    } catch {
      toast.error("Failed to reset exam type");
    }
  };

  const title = user?.name ?? user?.email ?? "User";

  return (
    <AdminLayout
      title={title}
      subtitle="User profile, results and activity"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All users
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={handleReset}
            disabled={!user?.examTypeId}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset exam type
          </Button>
        </div>
      }
    >
      {isError ? (
        <Alert variant="error">
          Could not load this user. {(error as Error)?.message}
        </Alert>
      ) : isLoading || !user ? (
        <div className="space-y-5">
          <SkeletonCard />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Identity & account ─────────────────────────────── */}
          <div className="card-surface p-5">
            <div className="flex items-start gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-2xl font-bold uppercase shrink-0">
                  {user.name?.[0] ?? "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                  <Badge variant={user.role === "ADMIN" ? "primary" : "info"}>
                    {user.role}
                  </Badge>
                  {user.mobileVerified ? (
                    <Badge variant="success">
                      <CheckCircle2 className="w-3 h-3" /> Mobile verified
                    </Badge>
                  ) : (
                    <Badge variant="muted">
                      <XCircle className="w-3 h-3" /> Mobile unverified
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">{user.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Joined {formatDate(user.createdAt)} · Last active{" "}
                  {formatDateTime(user.summary.lastActive)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <InfoField icon={<Mail className="w-3 h-3" />} label="Email">
                {user.email}
              </InfoField>
              <InfoField icon={<Phone className="w-3 h-3" />} label="Mobile">
                {user.mobile ?? "Not set"}
                {user.mobileVerified && (
                  <CheckCircle2 className="inline w-3.5 h-3.5 text-emerald-500 ml-1.5" />
                )}
              </InfoField>
              <InfoField icon={<GraduationCap className="w-3 h-3" />} label="Exam type">
                {user.examType?.name ?? "Not set"}
              </InfoField>
              <InfoField icon={<Calendar className="w-3 h-3" />} label="Exam date">
                {formatDate(user.examDate)}
              </InfoField>
            </div>
          </div>

          {/* ── Activity summary ───────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total attempts"
              value={user.summary.totalAttempts}
              icon={<BarChart3 className="w-5 h-5" />}
            />
            <StatCard
              label="Completed"
              value={user.summary.completedAttempts}
              icon={<CheckCircle2 className="w-5 h-5" />}
              tile="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
            />
            <StatCard
              label="Avg score"
              value={user.summary.averageScore ?? 0}
              icon={<Trophy className="w-5 h-5" />}
              tile="bg-gradient-to-br from-amber-500 to-amber-600 text-white"
            />
            <StatCard
              label="Best score"
              value={user.summary.bestScore ?? 0}
              icon={<Trophy className="w-5 h-5" />}
              tile="bg-gradient-to-br from-violet-500 to-violet-600 text-white"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Chapters started"
              value={user.summary.chaptersStarted}
              icon={<BookOpen className="w-5 h-5" />}
              tile="bg-gradient-to-br from-sky-500 to-sky-600 text-white"
            />
            <StatCard
              label="Videos watched"
              value={user.summary.videosWatched}
              icon={<ListVideo className="w-5 h-5" />}
              tile="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
            />
            <StatCard
              label="Payments"
              value={user.summary.paymentsCount}
              icon={<CreditCard className="w-5 h-5" />}
              tile="bg-gradient-to-br from-slate-500 to-slate-600 text-white"
            />
            <div className="card-surface flex items-center gap-3 p-4">
              <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-rose-500 to-rose-600 text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight">
                  {formatRupees(user.summary.totalPaidPaise)}
                </p>
                <p className="text-xs text-slate-500 truncate">Total spent</p>
              </div>
            </div>
          </div>

          {/* ── Full test results ──────────────────────────────── */}
          <div className="card-surface overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 flex-wrap">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" /> Test results
                <span className="text-xs font-semibold text-slate-400">
                  ({attemptsData?.total ?? 0})
                </span>
              </h3>
              <FilterTabs
                tabs={ATTEMPT_TABS}
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              />
            </div>

            {attemptsLoading && attempts.length === 0 ? (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : attempts.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  title="No attempts"
                  description={
                    statusFilter
                      ? "No attempts match this filter."
                      : "This user hasn't taken any tests yet."
                  }
                />
              </div>
            ) : (
              <AttemptsTable attempts={attempts} onView={setOpenAttemptId} />
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                <span className="text-xs text-slate-400">
                  Page {attemptsData?.page ?? page} of {totalPages} · {attemptsData?.total ?? 0} attempts
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || attemptsLoading}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || attemptsLoading}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Topic progress + payments ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard
              title="Topic progress"
              count={user.topicProgress.length}
              icon={<BookOpen className="w-4 h-4" />}
            >
              {user.topicProgress.length === 0 ? (
                <p className="text-xs text-slate-400">No topic progress yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {user.topicProgress.map((tp) => (
                    <div
                      key={tp.id}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-slate-700 truncate">{tp.topic.name}</span>
                      <span className="text-xs text-slate-500 shrink-0 ml-2 flex items-center gap-2">
                        <span>best {tp.bestScore ?? "—"}</span>
                        <span className="text-slate-300">·</span>
                        <span>{tp.attemptCount} attempts</span>
                        {tp.videosWatched > 0 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1">
                              <ListVideo className="w-3 h-3" />
                              {tp.videosWatched}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Payments"
              count={user.payments.length}
              icon={<CreditCard className="w-4 h-4" />}
            >
              {user.payments.length === 0 ? (
                <p className="text-xs text-slate-400">No payments.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {user.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700 truncate">
                          {p.mockTest?.title ?? "Payment"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-semibold text-slate-700">
                          {formatRupees(p.amountPaise)}
                        </span>
                        <Badge
                          variant={
                            ({
                              PAID: "success",
                              PENDING: "warning",
                              FAILED: "danger",
                              REFUNDED: "default",
                            } as const)[p.status] ?? "default"
                          }
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Engagement footnote ────────────────────────────── */}
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Last active {formatDateTime(user.summary.lastActive)} ·{" "}
            <Clock className="w-3.5 h-3.5" /> {user.summary.inProgressAttempts} attempt(s) in progress
          </p>
        </div>
      )}

      {openAttemptId && (
        <AttemptBreakdown
          detail={attemptDetail ?? null}
          loading={attemptDetailLoading}
          onClose={() => setOpenAttemptId(null)}
        />
      )}
    </AdminLayout>
  );
}
