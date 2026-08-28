// src/pages/admin/users/UsersPanel.tsx
// Admin page to list, search, and view users; reset exam type; view user detail.

import { useEffect, useState } from "react";
import {
  Search,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  BarChart3,
  FileText,
  CreditCard,
} from "lucide-react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { useToast } from "../../../components/ui/toast/toast-context";
import { AppShell } from "../../../components/layout/AppShell";
import {
  PageHeader,
  Button,
  Badge,
  Modal,
  EmptyState,
  Alert,
  Skeleton,
  SkeletonCard,
} from "../../../components/ui";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRupees(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

export function UsersPanel() {
  const {
    users,
    usersTotal,
    usersLimit,
    usersLoading,
    usersError,
    usersSearch,
    selectedUser,
    selectedUserLoading,
    fetchUsers,
    fetchUserDetail,
    resetUserExam,
    setUsersSearch,
    clearSelectedUser,
  } = useAdminStore();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));

  useEffect(() => {
    fetchUsers({ page: 1 });
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setUsersSearch(searchInput);
      fetchUsers({ page: 1, search: searchInput });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchUsers({ page: p, search: usersSearch });
  };

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    await fetchUserDetail(id);
  };

  const handleResetExam = async (id: string) => {
    setResettingId(id);
    try {
      await resetUserExam(id);
      toast.success("Exam type reset — user must re-onboard");
    } catch {
      toast.error("Failed to reset exam type");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <AppShell section="admin">
      <div className="space-y-6">
        <PageHeader
          title="Users"
          subtitle={`${usersTotal} registered user${usersTotal === 1 ? "" : "s"}`}
          action={<UsersIcon className="w-5 h-5 text-gray-300" />}
        />

        {usersError && <Alert variant="error">{usersError}</Alert>}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {usersLoading && users.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description={
                searchInput ? "Try a different search term." : "Users will appear here once they sign up."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["User", "Mobile", "Exam type", "Attempts", "Purchases", "Joined", ""].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                          {h}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openDetail(u.id)}
                      className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {u.name?.[0] ? (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                              {u.name[0]}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                              ?
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {u.name ?? "Unnamed"}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {u.mobile ?? "—"}
                        </span>
                        {u.mobileVerified && (
                          <CheckCircle2 className="inline w-3.5 h-3.5 text-green-500 ml-1" />
                        )}
                        {u.mobile && !u.mobileVerified && (
                          <XCircle className="inline w-3.5 h-3.5 text-gray-300 ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.examType ? (
                          <Badge variant="primary">{u.examType.name}</Badge>
                        ) : (
                          <Badge variant="muted">Not set</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u._count.testAttempts}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u._count.payments}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(u.id);
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60">
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages} · {usersTotal} users
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || usersLoading}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || usersLoading}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          clearSelectedUser();
        }}
        title="User details"
        size="lg"
        footer={
          <div className="w-full flex items-center justify-between gap-2 pt-1">
            <Button
              variant="danger"
              size="sm"
              onClick={() => selectedUser && handleResetExam(selectedUser.id)}
              disabled={!selectedUser || !selectedUser.examTypeId}
              loading={resettingId === selectedUser?.id}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset exam type
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDetailOpen(false);
                clearSelectedUser();
              }}
            >
              Close
            </Button>
          </div>
        }
      >
        {selectedUserLoading || !selectedUser ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center gap-3">
              {selectedUser.name?.[0] ? (
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold uppercase">
                  {selectedUser.name[0]}
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-lg font-bold uppercase">
                  ?
                </div>
              )}
              <div>
                <p className="text-base font-bold text-gray-900">
                  {selectedUser.name ?? "Unnamed"}
                </p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Mobile</p>
                <p className="text-gray-800 font-medium">
                  {selectedUser.mobile ?? "—"}
                  {selectedUser.mobileVerified && (
                    <CheckCircle2 className="inline w-3.5 h-3.5 text-green-500 ml-1.5" />
                  )}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Exam type</p>
                <p className="text-gray-800 font-medium">
                  {selectedUser.examType?.name ?? "Not set"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Exam date</p>
                <p className="text-gray-800 font-medium">
                  {formatDate(selectedUser.examDate)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Joined</p>
                <p className="text-gray-800 font-medium">{formatDate(selectedUser.createdAt)}</p>
              </div>
            </div>

            {/* Sections */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Recent attempts ({selectedUser.testAttempts.length})
              </h4>
              {selectedUser.testAttempts.length === 0 ? (
                <p className="text-xs text-gray-400">No attempts yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedUser.testAttempts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-700 truncate">{a.mockTest.title}</span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {a.score ?? "—"} · {a.percentile ?? "—"}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Topic progress ({selectedUser.topicProgress.length})
              </h4>
              {selectedUser.topicProgress.length === 0 ? (
                <p className="text-xs text-gray-400">No topic progress yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedUser.topicProgress.map((tp) => (
                    <div
                      key={tp.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-700 truncate">{tp.topic.name}</span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">
                        best {tp.bestScore ?? "—"} · {tp.attemptCount} attempts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Payments ({selectedUser.payments.length})
              </h4>
              {selectedUser.payments.length === 0 ? (
                <p className="text-xs text-gray-400">No payments.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedUser.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-700 truncate">
                        {p.mockTest?.title ?? "Payment"} · {formatRupees(p.amountPaise)}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

export default UsersPanel;
