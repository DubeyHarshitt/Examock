// src/components/layout/AppShell.tsx
//
// Shared navigation shell used by both student and admin pages.
// Renders a responsive top bar (with a slide-over menu on mobile) plus — for
// the student section — a fixed bottom tab bar with the 5 highest-frequency
// destinations. Nav links differ based on the user's role and the active section.

import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  FileText,
  MonitorPlay,
  BarChart3,
  Users,
  LogOut,
  MessageCircle,
  FolderOpen,
  Bell,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { logout } from "../../api/auth.api";
import { cn } from "../../utils/cn";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

interface AppShellProps {
  children: ReactNode;
  /** Which navigation section is active (drives which links are shown). */
  section: "student" | "admin";
}

const studentNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, end: true },
  { to: "/subjects", label: "Subjects", icon: <FolderOpen className="w-4 h-4" /> },
  { to: "/tests", label: "Mock Tests", icon: <BookOpen className="w-4 h-4" /> },
  { to: "/notes", label: "Notes", icon: <FileText className="w-4 h-4" /> },
  { to: "/channels", label: "Channels", icon: <MonitorPlay className="w-4 h-4" /> },
  { to: "/progress", label: "Progress", icon: <BarChart3 className="w-4 h-4" /> },
  { to: "/chat", label: "Ask AI", icon: <MessageCircle className="w-4 h-4" /> },
];

const adminNav: NavItem[] = [
  { to: "/admin-dashboard", label: "Content", icon: <LayoutDashboard className="w-4 h-4" />, end: true },
  { to: "/admin/users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { to: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { to: "/admin/notifications", label: "Notify", icon: <Bell className="w-4 h-4" /> },
];

/** Mobile bottom tab bar (student only) — surface the 5 core destinations. */
const studentBottomNav: NavItem[] = [
  { to: "/", label: "Home", icon: <LayoutDashboard className="w-5 h-5" />, end: true },
  { to: "/subjects", label: "Subjects", icon: <FolderOpen className="w-5 h-5" /> },
  { to: "/tests", label: "Tests", icon: <BookOpen className="w-5 h-5" /> },
  { to: "/progress", label: "Progress", icon: <BarChart3 className="w-5 h-5" /> },
  { to: "/chat", label: "Ask AI", icon: <MessageCircle className="w-5 h-5" /> },
];

export function AppShell({ children, section }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, logout: clearAuth } = useAuthStore();

  const nav = section === "admin" ? adminNav : studentNav;

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

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      isActive
        ? "bg-brand-50 text-brand-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    );

  return (
    <div className="min-h-screen">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between gap-4">
          {/* Left: menu button (mobile) + brand */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate(section === "admin" ? "/admin-dashboard" : "/")}
              className="flex items-center gap-2"
            >
              <img
                src="/logo-mark.svg"
                alt="Examock"
                className="w-8 h-8"
                draggable={false}
              />
              <span className="font-display text-base font-bold text-slate-900 hidden sm:block">
                Examock
              </span>
            </button>
          </div>

          {/* Center: desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClasses}>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: role switch + user */}
          <div className="flex items-center gap-2">
            {isAdmin() && section === "student" && (
              <button
                onClick={() => navigate("/admin-dashboard")}
                className="text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Admin Panel
              </button>
            )}
            {!isAdmin() && section === "admin" && (
              <button
                onClick={() => navigate("/")}
                className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Student View
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name ?? "User"}
                  className="w-7 h-7 rounded-full ring-2 ring-brand-100"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold uppercase">
                  {user?.name?.[0] ?? "U"}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile slide-over nav (full menu) ───────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100">
              <span className="font-display font-bold text-slate-900">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100"
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
            {user && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold uppercase">
                    {user.name?.[0] ?? "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user.name ?? "User"}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────── */}
      <main
        className={cn(
          "mx-auto max-w-7xl px-4 pt-6",
          section === "student" ? "pb-28 lg:pb-10" : "pb-10"
        )}
      >
        {children}
      </main>

      {/* ── Mobile bottom tab bar (student only) ─────────────── */}
      {section === "student" && <BottomTabBar nav={studentBottomNav} />}
    </div>
  );
}

function BottomTabBar({ nav }: { nav: NavItem[] }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-2 py-1.5 grid grid-cols-5 gap-1">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {({ isActive }) => (
              <span
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-semibold transition-colors",
                  isActive ? "text-brand-700" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                    isActive ? "bg-brand-100" : ""
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default AppShell;