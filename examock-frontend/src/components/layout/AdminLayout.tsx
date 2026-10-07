// src/components/layout/AdminLayout.tsx
//
// Dedicated admin shell: brand sidebar, top header with page title and
// user actions. Provides a clean, consistent frame for every admin page.
//
// Branding: "Examock by InitCodes"

import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  PanelRight,
  GraduationCap,
  ListChecks,
  Wrench,
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

// Content → Exams · Tests (ticket 05). The management dashboard at
// /admin-dashboard still hosts the question bank, notes, videos and channels
// (Phase 3) — the legacy two-pane test builder is gone (ticket 06).
const NAV_SECTIONS = [
  {
    label: "Content",
    items: [
      {
        to: "/admin/content/exams",
        label: "Exams",
        icon: GraduationCap,
        hint: "Exams & subjects tree",
        end: false,
      },
      {
        to: "/admin/content/tests",
        label: "Tests",
        icon: ListChecks,
        hint: "Build & manage tests",
        end: false,
      },
      {
        to: "/admin-dashboard",
        label: "Bank & content",
        icon: Wrench,
        hint: "Question bank, notes & videos",
        end: true,
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        to: "/admin/users",
        label: "Users",
        icon: Users,
        hint: "Manage accounts",
        end: false,
      },
      {
        to: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        hint: "Performance & revenue",
        end: false,
      },
      {
        to: "/admin/notifications",
        label: "Notifications",
        icon: Bell,
        hint: "Broadcast updates",
        end: false,
      },
    ],
  },
];

type NavItem = (typeof NAV_SECTIONS)[number]["items"][number];

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
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

  const isActive = (item: NavItem) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const activeLabel =
    NAV_SECTIONS.flatMap((s) => s.items).find(isActive)?.label ?? "Admin";

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-800/60">
        <img
          src="/logo-mark.svg"
          alt="Examock"
          className="h-9 w-9 shrink-0"
          draggable={false}
        />
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Examock</p>
          <p className="text-[10px] font-medium tracking-wide text-slate-400">by InitCodes</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.label} className={sectionIndex > 0 ? "border-t border-slate-800/60 pt-4" : ""}>
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive: linkActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      linkActive
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
            </div>
          </div>
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
