// src/components/admin/TestsTable.tsx
//
// The shared tests table (ticket 05 / design §5.2). One table, one filter row:
//   Exam → Subject (dependent) → Access → Status → title search.
// All filtering and pagination is server-side (`GET /admin/tests`).
//
// The same component is embedded pre-filtered on the exam page (whole-exam
// scope) and the subject page (that subject's tests), so there is never a
// page where the test list lacks context.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  Copy,
  FileText,
  ListChecks,
  RotateCcw,
  Search,
  Inbox,
} from "lucide-react";
import {
  archiveTestApi,
  duplicateTestApi,
  getExamsApi,
  getSubjectsApi,
  getTestsApi,
  restoreTestApi,
} from "../../api/admin.api";
import type { TestsFilters } from "../../api/admin.api";
import type { MockTest } from "../../store/admin/types/admin.types";
import { useToast } from "../ui/toast/toast-context";
import { cn } from "../../utils/cn";

const PAGE_SIZE = 10;

function timeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function Pill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "green" | "slate" | "blue" | "amber";
}) {
  const tones: Record<typeof tone, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
  allLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        <option value="__all__">{allLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

interface TestsTableProps {
  /** Preset server-side filters (exam/subject pages embed the table pre-filtered). */
  examTypeId?: string;
  /** Preset subject. `null` on the exam page = whole-exam scope. */
  subjectId?: string | null;
  scope?: "exam" | "subject";
  /** Show the interactive filter row (the all-tests page). Defaults to hidden. */
  filters?: boolean;
  /** Called after any mutation (archive/restore/duplicate) so parents can sync counts. */
  onChanged?: () => void;
}

export function TestsTable({
  examTypeId: presetExam,
  subjectId: presetSubject,
  scope: presetScope,
  filters = false,
  onChanged,
}: TestsTableProps) {
  const toast = useToast();

  // Interactive filter state (all-tests page).
  const [examFilter, setExamFilter] = useState<string>("__all__");
  const [subjectFilter, setSubjectFilter] = useState<string>("__all__");
  const [accessFilter, setAccessFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Lookup data for the filter row.
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  // Data + fetch state.
  const [tests, setTests] = useState<MockTest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveExam = filters
    ? examFilter === "__all__"
      ? undefined
      : examFilter
    : presetExam;
  const effectiveSubject = filters
    ? subjectFilter === "__all__"
      ? undefined
      : subjectFilter
    : presetSubject ?? undefined;
  const effectiveScope = filters ? undefined : presetScope;

  useEffect(() => {
    if (!filters) return;
    getExamsApi()
      .then((list) => {
        setExams(list.map((e) => ({ id: e.id, name: e.name })));
        if (list.length === 1) setExamFilter(list[0].id);
      })
      .catch(() => setError("Could not load exams"));
  }, [filters]);

  useEffect(() => {
    if (!filters) return;
    const examId = examFilter === "__all__" ? undefined : examFilter;
    getSubjectsApi(examId)
      .then((list) => setSubjects((list ?? []).map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => setError("Could not load subjects"));
  }, [filters, examFilter]);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: TestsFilters = {
        examTypeId: effectiveExam,
        subjectId: effectiveSubject,
        scope: effectiveScope,
        isFree: accessFilter === "__all__" ? undefined : accessFilter === "true",
        isActive:
          statusFilter === "__all__" ? undefined : statusFilter === "true",
        q: q.trim() || undefined,
        page,
        limit: PAGE_SIZE,
      };
      // Drop the "empty on purpose" keys the backend treats as present.
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      );
      const data = await getTestsApi(clean);
      setTests(data.tests ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Could not load tests");
    } finally {
      setLoading(false);
    }
  }, [
    effectiveExam,
    effectiveSubject,
    effectiveScope,
    accessFilter,
    statusFilter,
    q,
    page,
  ]);

  // Debounce the title search so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(fetchTests, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchTests, q]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDuplicate = async (test: MockTest) => {
    try {
      const copy = await duplicateTestApi(test.id);
      toast.success(`Duplicated as "${copy.title}" (no questions)`);
      fetchTests();
      onChanged?.();
    } catch {
      toast.error("Could not duplicate test");
    }
  };

  const handleArchive = async (test: MockTest) => {
    try {
      await archiveTestApi(test.id);
      toast.success(`"${test.title}" archived`);
      fetchTests();
      onChanged?.();
    } catch {
      toast.error("Could not archive test");
    }
  };

  const handleRestore = async (test: MockTest) => {
    try {
      await restoreTestApi(test.id);
      toast.success(`"${test.title}" restored`);
      fetchTests();
      onChanged?.();
    } catch {
      toast.error("Could not restore test");
    }
  };

  const rows = useMemo(() => tests, [tests]);

  return (
    <div className="card-surface overflow-hidden">
      {filters && (
        <div className="border-b border-slate-100 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SelectFilter
              label="Exam"
              value={examFilter}
              options={exams}
              onChange={(v) => {
                setExamFilter(v);
                setSubjectFilter("__all__");
                setPage(1);
              }}
              allLabel="All exams"
            />
            <SelectFilter
              label="Subject"
              value={subjectFilter}
              options={subjects}
              onChange={(v) => {
                setSubjectFilter(v);
                setPage(1);
              }}
              allLabel="All subjects"
            />
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Access
              <select
                value={accessFilter}
                onChange={(e) => {
                  setAccessFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="__all__">All access</option>
                <option value="true">Free</option>
                <option value="false">Paid</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Status
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="__all__">All statuses</option>
                <option value="true">Live</option>
                <option value="false">Archived</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Search
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Title…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-xs font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 text-xs font-semibold text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3 text-right">Questions</th>
              <th className="px-4 py-3 text-right">Duration</th>
              <th className="px-4 py-3 text-right">Marks</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-400">
                  <ListChecks size={20} className="mx-auto mb-2 text-slate-300" />
                  Loading tests…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-400">
                  <Inbox size={20} className="mx-auto mb-2 text-slate-300" />
                  {error ? "Could not load tests." : "No tests match these filters."}
                </td>
              </tr>
            ) : (
              rows.map((test) => {
                const scopeLabel = test.subjectId
                  ? test.subject?.name ?? "Subject"
                  : `Full ${test.examType?.name ?? "exam"}`;
                return (
                  <tr
                    key={test.id}
                    className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/content/tests/${test.id}`}
                        className="flex items-center gap-2 font-semibold text-slate-900 hover:text-brand-600"
                      >
                        <FileText size={14} className="shrink-0 text-slate-300" />
                        <span className="truncate max-w-[220px]">{test.title}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={test.subjectId ? "blue" : "amber"}>
                        {scopeLabel}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {test._count?.questions ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {test.durationMins} min
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {test.totalMarks}
                    </td>
                    <td className="px-4 py-3">
                      {test.isFree ? (
                        <Pill tone="green">Free</Pill>
                      ) : (
                        <Pill tone="slate">Paid</Pill>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {test.isActive ? (
                        <Pill tone="green">Live</Pill>
                      ) : (
                        <Pill tone="slate">Archived</Pill>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {timeAgo(test.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        <Link
                          to={`/admin/content/tests/${test.id}`}
                          className="rounded-md px-2 py-1 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => handleDuplicate(test)}
                          title="Duplicate (metadata only, questions start empty)"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Copy size={12} /> Duplicate
                        </button>
                        {test.isActive ? (
                          <button
                            onClick={() => handleArchive(test)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-700"
                          >
                            <Archive size={12} /> Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(test)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <p className="text-xs font-medium text-slate-500">
          {total} test{total !== 1 ? "s" : ""}
          {maxPage > 1 && ` · page ${page} of ${maxPage}`}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled={page >= maxPage}
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}