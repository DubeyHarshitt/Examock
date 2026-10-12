// src/pages/notifications/NotificationsPage.tsx
//
// Student-side inbox at /notifications. Newest first. Polled every 60s via
// the same React Query hook the bell uses — single source of truth, no extra
// fetch. Backend caps results at 50 items.
//
// Ticket 11 — on mount, marks the currently-visible items as read so the
// inbox feels lived-in. Server is idempotent so re-mounts are safe.

import { useEffect } from "react";
import { Inbox as InboxIcon, Megaphone } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { PageHeader, EmptyState, Card, Reveal, Skeleton } from "../../components/ui";
import { useNotifications } from "../../hooks/student/useStudentData";
import { cn } from "../../utils/cn";

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { data, isLoading, isError, markRead } = useNotifications(50);

  // `data?.items` is referentially stable between renders that share a
  // query state, so depending on it (rather than re-deriving with `?? []`)
  // means this effect fires only when the cache actually changes.
  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Mark every visible item as read on mount. Idempotent server-side.
  useEffect(() => {
    const unreadIds = items.filter((i) => !i.isRead).map((i) => i.id);
    if (unreadIds.length > 0) markRead(unreadIds);
  }, [items, markRead]);

  return (
    <AppShell section="student">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread`
            : "You're all caught up."
        }
      />

      {isLoading && items.length === 0 ? (
        <div className="space-y-3 mt-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          className="mt-6"
          title="Could not load notifications"
          description="Something went wrong. Please refresh and try again."
          icon={<InboxIcon className="w-6 h-6 text-slate-400" />}
        />
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No notifications yet"
          description="When admins broadcast an announcement, it will show up here."
          icon={<InboxIcon className="w-6 h-6 text-slate-400" />}
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => (
            <Reveal key={n.id}>
              <li aria-label={n.isRead ? "Read notification" : "Unread notification"}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Megaphone
                      className={cn(
                        "w-5 h-5 mt-0.5 shrink-0",
                        n.isRead ? "text-slate-300" : "text-brand-600",
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <h3
                        className={cn(
                          n.isRead
                            ? "font-normal text-slate-500"
                            : "font-semibold text-slate-900",
                        )}
                      >
                        {n.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Posted {formatFull(n.createdAt)}
                        {n.examTypeId === null && " · Global"}
                      </p>
                      <p
                        className={cn(
                          "text-sm mt-2 whitespace-pre-wrap",
                          n.isRead ? "text-slate-400" : "text-slate-700",
                        )}
                      >
                        {n.body}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            </Reveal>
          ))}
        </ul>
      )}
    </AppShell>
  );
}