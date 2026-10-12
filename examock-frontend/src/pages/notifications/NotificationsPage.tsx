// src/pages/notifications/NotificationsPage.tsx
//
// Student-side inbox at /notifications. Newest first. Polled every 60s via
// the same React Query hook the bell uses — single source of truth, no extra
// fetch. Backend caps results at 50 items, and the response only contains
// *unread* items (ticket 12): the moment the user opens a notification's
// full view, the server marks it as read and it disappears from this list.
//
// Click a card to open the modal. The modal fires
// `markNotificationsReadApi([id])` on open — server-side idempotent — then
// invalidates the notifications query so the badge and the list both refresh.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Inbox as InboxIcon, Megaphone } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import {
  PageHeader,
  EmptyState,
  Card,
  Reveal,
  Skeleton,
  Modal,
} from "../../components/ui";
import {
  useNotifications,
  studentKeys,
} from "../../hooks/student/useStudentData";
import * as studentApi from "../../api/student.api";
import { cn } from "../../utils/cn";
import type { StudentNotification } from "../../types/student.types";

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
  const { data, isLoading, isError } = useNotifications(50);
  const queryClient = useQueryClient();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Modal state — null = closed. On open, fire mark-read for that single id
  // and invalidate the notifications queries so the bell + banner refresh.
  const [openItem, setOpenItem] = useState<StudentNotification | null>(null);

  const handleOpen = async (item: StudentNotification) => {
    setOpenItem(item);
    // Fire-and-forget: even if the request fails, the modal stays open
    // and the user still sees the notification. Next refetch will reconcile.
    try {
      await studentApi.markNotificationsReadApi([item.id]);
      queryClient.invalidateQueries({
        queryKey: studentKeys.notifications(),
      });
    } catch {
      // The global error handler / toast surface network errors elsewhere.
    }
  };

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
              <li>
                <button
                  onClick={() => handleOpen(n)}
                  aria-label={`Open notification: ${n.title}`}
                  className="block w-full text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <Card className="p-4 transition-colors hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <Megaphone
                        className="w-5 h-5 text-brand-600 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900">
                          {n.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Posted {formatFull(n.createdAt)}
                          {n.examTypeId === null && " · Global"}
                        </p>
                        {/* Preview line — clamped so the card height stays
                            predictable; the full body opens in the modal. */}
                        <p
                          className={cn(
                            "text-sm text-slate-700 mt-2",
                            "line-clamp-2 whitespace-pre-wrap",
                          )}
                        >
                          {n.body}
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              </li>
            </Reveal>
          ))}
        </ul>
      )}

      {/* Full-view modal — opens on row click, marks the item read on open. */}
      <Modal
        open={openItem !== null}
        onClose={() => setOpenItem(null)}
        title={openItem?.title}
        description={
          openItem
            ? `Posted ${formatFull(openItem.createdAt)}` +
              (openItem.examTypeId === null ? " · Global" : "")
            : undefined
        }
        size="lg"
      >
        {openItem && (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {openItem.body}
          </p>
        )}
      </Modal>
    </AppShell>
  );
}