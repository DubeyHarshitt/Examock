// src/pages/admin/users/UsersPanel.tsx
// Admin page to list and search users. Clicking a user opens the full
// user-detail screen (/admin/users/:id).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { Badge, EmptyState, Alert, SkeletonCard } from "../../../components/ui";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UsersPanel() {
  const {
    users,
    usersTotal,
    usersLimit,
    usersLoading,
    usersError,
    usersSearch,
    fetchUsers,
    setUsersSearch,
  } = useAdminStore();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

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

  const openUser = (id: string) => navigate(`/admin/users/${id}`);

  return (
    <AdminLayout title="Users" subtitle={`${usersTotal} registered user${usersTotal === 1 ? "" : "s"}`}>
      <div className="space-y-6">
        {usersError && <Alert variant="error">{usersError}</Alert>}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
          />
        </div>

        {/* Users table */}
        <div className="card-surface overflow-hidden">
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
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    {["User", "Mobile", "Exam type", "Attempts", "Purchases", "Joined", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          {h}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openUser(u.id)}
                      className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {u.name?.[0] ? (
                            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                              {u.name[0]}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                              ?
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {u.name ?? "Unnamed"}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">
                          {u.mobile ?? "—"}
                        </span>
                        {u.mobileVerified && (
                          <CheckCircle2 className="inline w-3.5 h-3.5 text-emerald-500 ml-1" />
                        )}
                        {u.mobile && !u.mobileVerified && (
                          <XCircle className="inline w-3.5 h-3.5 text-slate-300 ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.examType ? (
                          <Badge variant="primary">{u.examType.name}</Badge>
                        ) : (
                          <Badge variant="muted">Not set</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u._count.testAttempts}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u._count.payments}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openUser(u.id);
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
              <span className="text-xs text-slate-400">
                Page {page} of {totalPages} · {usersTotal} users
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || usersLoading}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || usersLoading}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default UsersPanel;
