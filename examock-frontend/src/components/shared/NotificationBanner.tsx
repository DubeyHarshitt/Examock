// src/components/shared/NotificationBanner.tsx
//
// Dismissible banner rendered at the top of the dashboard. Shows the newest
// *unread* broadcast. Dismiss state is stored in localStorage keyed by
// notification id — reappears when a newer broadcast lands.
//
// localStorage is read inside `useState`'s initializer (lazy initialisation,
// runs once). `typeof window` ensures no SSR / pre-hydration access.
//
// Ticket 12 (retention extension) — the response now contains unread AND
// recently-read rows, so we can't just take `items[0]`. The banner
// surfaces only unread items; if everything in the inbox is read but
// still inside the 24h window, the banner hides.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import { useNotifications } from "../../hooks/student/useStudentData";

const STORAGE_PREFIX = "examock:banner:dismissed:";

function readDismissed(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, "1");
  } catch {
    // ignore (private mode / quota)
  }
}

export function NotificationBanner() {
  const { data } = useNotifications(1);
  // The server returns items newest-first; pick the first one that is
  // still unread. If every row in the inbox is read (but inside the 24h
  // window), the banner hides — there is nothing new to announce.
  const newest = data?.items?.find((n) => !n.read);

  // `tick` is a render-bumper used only to invalidate the cached "dismissed"
  // state when the user clicks ✕. Incrementing it forces a fresh localStorage
  // read on the next render.
  const [tick, setTick] = useState(0);

  if (!newest) return null;
  if (readDismissed(newest.id) && tick === 0) return null;

  const handleDismiss = () => {
    writeDismissed(newest.id);
    setTick((t) => t + 1);
  };

  return (
    <div
      role="status"
      className="relative flex items-start gap-3 rounded-xl bg-brand-50 ring-1 ring-brand-200 px-4 py-3"
    >
      <Megaphone
        className="w-5 h-5 text-brand-700 mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-900 truncate">
          {newest.title}
        </p>
        <p className="text-xs text-brand-800 mt-0.5 line-clamp-2">
          {newest.body}
        </p>
        <Link
          to="/notifications"
          className="inline-block mt-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 underline-offset-2 hover:underline"
        >
          Read the full announcement →
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded text-brand-700 hover:bg-brand-100"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default NotificationBanner;