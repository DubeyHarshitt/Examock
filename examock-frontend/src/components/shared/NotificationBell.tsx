// src/components/shared/NotificationBell.tsx
//
// Bell icon + unread badge + hand-rolled popover listing the most recent
// notifications. Polled by `useNotifications` (React Query). Hand-rolled
// popover (click-outside, ESC, focus management) to match the existing slide-
// over pattern in AppShell and avoid adding a headless-ui dependency.
//
// Visibility: desktop only. On mobile the notifications inbox is reachable via
// the slide-over menu (see AppShell.tsx).
//
// Ticket: docs/student-pannel/issue-01/ticket/02-notifications-frontend.md
// Ticket 11 — when the popover opens, mark the currently-loaded items as
// read in one batch call. Bell badge decrements, blue dots become rings.
// The unread selector + effect use a ref so the callback identity doesn't
// re-trigger the effect on every render.

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useNotifications } from "../../hooks/student/useStudentData";
import { cn } from "../../utils/cn";
import type { StudentNotification } from "../../types/student.types";

const POPOVER_LIMIT = 3;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationBell() {
  const { data, isLoading, markRead } = useNotifications(POPOVER_LIMIT);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  // Keep the latest `markRead` in a ref so opening the popover doesn't
  // re-run the effect when the callback identity changes after a refetch.
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

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

  // Mark currently-visible items as read (ticket 11).
  // Runs on open and on every refetch while open — idempotent server-side.
  //
  // We read `data?.items` directly (rather than the `items` derived below)
  // because `items` falls back to `?? []` which produces a fresh array
  // reference on every render — that would re-fire this effect on every
  // render of an open popover. React Query keeps the `data?.items` array
  // referentially stable between renders that share a query state, so this
  // effect only fires when the underlying cache actually changes.
  const loadedItems = data?.items;
  useEffect(() => {
    if (!open) return;
    if (!loadedItems || loadedItems.length === 0) return;
    const unreadIds = loadedItems.filter((i) => !i.isRead).map((i) => i.id);
    if (unreadIds.length > 0) markReadRef.current(unreadIds);
    // `markRead` is read via the ref so we don't re-fire when its identity
    // changes after a refetch invalidation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadedItems]);

  const handleItemClick = () => {
    setOpen(false);
    navigate("/notifications");
  };

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open
            ? "bg-slate-100 text-slate-900"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 z-50 overflow-hidden"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-sm text-slate-900">Notifications</h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && items.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    item={n}
                    onClick={handleItemClick}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-slate-100 px-4 py-2 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              See all →
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onClick,
}: {
  item: StudentNotification;
  onClick: () => void;
}) {
  // Read items get a hollow ring; unread get a solid brand dot. The visual
  // difference alone isn't accessible, so the row also carries aria-label
  // state and screen-reader-only text.
  return (
    <li>
      <button
        onClick={onClick}
        aria-label={`${item.isRead ? "Read" : "Unread"} notification: ${item.title}`}
        className="block w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 w-1.5 h-1.5 rounded-full shrink-0",
              item.isRead
                ? "bg-transparent border border-slate-300"
                : "bg-brand-500",
            )}
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm truncate",
                item.isRead
                  ? "font-normal text-slate-500"
                  : "font-medium text-slate-900",
              )}
            >
              {item.title}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Posted {relativeTime(item.createdAt)}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

export default NotificationBell;