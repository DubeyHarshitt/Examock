// src/pages/admin/analytics/AnalyticsPanel.tsx
// Admin analytics: overview KPIs, per-test performance bars, and payment records.

import { useEffect } from "react";
import {
  Users as UsersIcon,
  FileText,
  CheckCircle2,
  IndianRupee,
  ListChecks,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import {
  Card,
  Badge,
  Alert,
  EmptyState,
  Skeleton,
} from "../../../components/ui";
import type { PaymentStatus } from "../../../types/admin.types";

function formatRupees(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const statusStyles: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  REFUNDED: "bg-slate-100 text-slate-600 border-slate-200",
};

const typeBadge: Record<string, BadgeVariantLike> = {
  CHAPTER: "primary",
  MODULE: "info",
  FULL: "warning",
};

type BadgeVariantLike = "primary" | "info" | "warning" | "success" | "default";

export function AnalyticsPanel() {
  const {
    overview,
    overviewLoading,
    testAnalytics,
    testAnalyticsLoading,
    payments,
    paymentsTotal,
    paymentsPage,
    paymentsLimit,
    paymentsStatus,
    analyticsError,
    fetchOverview,
    fetchTestAnalytics,
    fetchPayments,
    setPaymentsStatus,
  } = useAdminStore();

  const totalPages = Math.max(1, Math.ceil(paymentsTotal / paymentsLimit));

  useEffect(() => {
    fetchOverview();
    fetchTestAnalytics();
    fetchPayments(1, "");
  }, []);

  const handlePage = (p: number) => {
    fetchPayments(p, paymentsStatus);
  };

  const handleStatusFilter = (s: PaymentStatus | "") => {
    setPaymentsStatus(s);
    fetchPayments(1, s);
  };

  // Build performance bars for each test (share of max attempts = visual weight)
  const maxAttempts = Math.max(
    1,
    ...testAnalytics.map((t) => t.totalAttempts)
  );

  const kpis = overview
    ? [
        { label: "Total users", value: overview.totalUsers, icon: <UsersIcon className="w-5 h-5" />, color: "from-brand-500 to-brand-700" },
        { label: "Total attempts", value: overview.totalAttempts, icon: <FileText className="w-5 h-5" />, color: "from-sky-500 to-sky-700" },
        { label: "Completed", value: overview.completedAttempts, icon: <CheckCircle2 className="w-5 h-5" />, color: "from-emerald-500 to-emerald-700" },
        { label: "Revenue", value: formatRupees(overview.totalRevenueRupees * 100), icon: <IndianRupee className="w-5 h-5" />, color: "from-amber-500 to-amber-700" },
        { label: "Active tests", value: overview.totalTests, icon: <ListChecks className="w-5 h-5" />, color: "from-fuchsia-500 to-fuchsia-700" },
        { label: "Questions", value: overview.totalQuestions, icon: <HelpCircle className="w-5 h-5" />, color: "from-rose-500 to-rose-700" },
      ]
    : [];

  return (
    <AdminLayout title="Analytics" subtitle="Platform-wide overview and per-test performance">
      <div className="space-y-6">
        {analyticsError && <Alert variant="error">{analyticsError}</Alert>}

        {/* KPI cards */}
        {overviewLoading || !overview ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="card-surface card-surface-hover p-4"
              >
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.color} text-white flex items-center justify-center mb-3 shadow-sm`}
                >
                  {k.icon}
                </div>
                <p className="text-xl font-bold text-slate-900 leading-tight">
                  {typeof k.value === "number" ? k.value.toLocaleString("en-IN") : k.value}
                </p>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                  {k.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Per-test analytics */}
        <Card
          title="Test performance"
          subtitle="Attempts, completions, and average score per active test"
        >
          {testAnalyticsLoading && testAnalytics.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : testAnalytics.length === 0 ? (
            <EmptyState
              title="No test analytics"
              description="Once students attempt mock tests, the data will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {testAnalytics.map((t) => {
                const width =
                  t.totalAttempts > 0
                    ? Math.round((t.totalAttempts / maxAttempts) * 100)
                    : 0;
                return (
                  <li key={t.id}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {t.title}
                        </span>
                        <Badge variant={typeBadge[t.type] ?? "default"}>{t.type}</Badge>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">
                        {t.completedAttempts}/{t.totalAttempts} completed · avg{" "}
                        <span className="font-semibold text-slate-700">
                          {t.averageScore}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          width > 60
                            ? "bg-emerald-500"
                            : width > 30
                              ? "bg-amber-500"
                              : "bg-slate-300"
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Payment records */}
        <Card
          title="Payments"
          subtitle={`${paymentsTotal} total`}
          action={
            <div className="flex gap-1 flex-wrap">
              {(["", "PAID", "PENDING", "FAILED", "REFUNDED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusFilter(s)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                    paymentsStatus === s
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {s || "All"}
                </button>
              ))}
            </div>
          }
        >
          {payments.length === 0 ? (
            <EmptyState
              title="No payment records"
              description="Paid test purchases will appear here."
            />
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["User", "Test", "Amount", "Status", "Date"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          {h}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-2 py-2.5">
                        <p className="text-sm text-slate-800 truncate max-w-[180px]">
                          {p.user?.name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">
                          {p.user?.email}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-slate-600">
                        {p.mockTest?.title ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 text-xs font-semibold text-slate-700">
                        {formatRupees(p.amountPaise)}
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${statusStyles[p.status]}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-slate-400">
                        {formatDate(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Page {paymentsPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePage(paymentsPage - 1)}
                  disabled={paymentsPage === 1}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => handlePage(paymentsPage + 1)}
                  disabled={paymentsPage === totalPages}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}

export default AnalyticsPanel;
