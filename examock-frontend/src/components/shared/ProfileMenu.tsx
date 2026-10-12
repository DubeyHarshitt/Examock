// src/components/shared/ProfileMenu.tsx
//
// Avatar + dropdown for the AppShell top bar. Replaces the bare avatar button
// that did nothing before. Two items: Profile (link) and Logout (action).
//
// Hand-rolled popover (same pattern as NotificationBell) — no headless-ui
// dependency.
//
// Ticket: docs/student-pannel/issue-01/ticket/03-profile.md

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { logout } from "../../api/auth.api";
import { cn } from "../../utils/cn";

interface ProfileMenuProps {
  /** Called when the menu should close (used after a click navigation). */
  onNavigate?: () => void;
}

export function ProfileMenu({ onNavigate }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { user, logout: clearAuth } = useAuthStore();

  // Close on click outside + ESC.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    onNavigate?.();
    try {
      await logout();
    } catch {
      // ignore — backend may already have invalidated; still clear locally
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  const handleProfile = () => {
    setOpen(false);
    onNavigate?.();
    navigate("/profile");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1 p-1 rounded-full transition-colors",
          open ? "bg-slate-100" : "hover:bg-slate-100",
        )}
        aria-label="Profile menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
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
        <ChevronDown className="w-3 h-3 text-slate-500 hidden sm:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 z-50 overflow-hidden"
        >
          {user && (
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user.name ?? "User"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
          )}
          <div className="p-1">
            <button
              role="menuitem"
              onClick={handleProfile}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left"
            >
              <UserIcon className="w-4 h-4" />
              Profile
            </button>
            <button
              role="menuitem"
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;