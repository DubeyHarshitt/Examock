// src/components/layout/AdminLayout.tsx
//
// Dedicated admin shell: brand sidebar, top header with page title and
// user actions. Provides a clean, consistent frame for every admin page.
//
// Branding: "Examock by InitCodes"

import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  GraduationCap,
  PanelRight,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { logout } from "../../api/auth.api";
import { cn } from "../../utils/cn";

interface AdminLayoutProps {
  children: ReactNode;
  /** Optional title for the top bar. Defaults to the section label. */
  title?: string;
  /** Optional subtitle shown under the title. */
  subtitle?: string;
  /** Optional right-side actions in the header. */
  actions?: ReactNode;
}

const NAV = [
  {
    to: "/admin-dashboard",
    label: "Content",
    icon: LayoutDashboard,
    end: true,
    hint: "Questions, tests, notes & videos",
  },
  { to: "/admin/users", label: "Users", icon: Users, end: false, hint: "Manage accounts" },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, end: false, hint: "Performance & revenue" },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, end: false, hint: "Broadcast updates" },
];

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout: clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore — backend may already have invalidated; still clear locally
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  const activeLabel =
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
      ?.label ?? "Admin";

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-800/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shrink-0">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Examock</p>
          <p className="text-[10px] font-medium tracking-wide text-slate-400">by InitCodes</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Admin Panel
        </p>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600/15 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0 opacity-80" />
            <span className="flex-1">
              <span className="block leading-tight">{item.label}</span>
              <span className="block text-[11px] font-normal text-slate-500">
                {item.hint}
              </span>
            </span>
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-slate-800/60 p-3 space-y-3">
        <div className="flex items-center gap-2.5 px-1.5">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name ?? "User"}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/20 text-brand-200 text-xs font-bold uppercase">
              {user?.name?.[0] ?? "A"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name ?? "Admin"}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Fixed sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-slate-900 lg:flex">
        {sidebar}
      </aside>

      {/* Mobile slide-over */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-xl">
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </nav>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-72">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-slate-900">
                {title ?? activeLabel}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-slate-500">{subtitle}</p>
              )}
            </div>

            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

            <div className="hidden sm:flex items-center gap-3 pl-2 shrink-0">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <PanelRight className="h-3.5 w-3.5" />
                Student view
              </button>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name ?? "User"}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase">
                  {user?.name?.[0] ?? "A"}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
