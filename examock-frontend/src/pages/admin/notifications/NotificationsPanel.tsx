// src/pages/admin/notifications/NotificationsPanel.tsx
// Admin page to broadcast notifications and view previously sent ones.
//
// Form supports an exam-type selector (ticket 08): null = global broadcast
// (default, safer); a chosen id scopes the notification to one exam.
//
// Ticket 12 — adds a trash button on each sent notification. Clicking it
// opens a confirm dialog; confirming hard-deletes the row. Cascades
// through notification_reads via the FK declared in schema.prisma.

import { useEffect, useState } from "react";
import { Send, AlertCircle, Megaphone, Trash2 } from "lucide-react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { useToast } from "../../../components/ui/toast/toast-context";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import {
  Button,
  Badge,
  Card,
  Alert,
  EmptyState,
  ConfirmDialog,
} from "../../../components/ui";
import { useExamTypes } from "../../../hooks/useExamTypes";

export function NotificationsPanel() {
  const {
    notifications,
    notificationsLoading,
    notificationsError,
    broadcastLoading,
    deletingId,
    fetchNotifications,
    broadcastNotification,
    deleteNotification,
  } = useAdminStore();
  const toast = useToast();
  const { data: examTypes = [] } = useExamTypes();

  // null = global broadcast; a string = scoped to that exam.
  const [examTypeId, setExamTypeId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  // Delete confirmation: which row is currently queued for deletion?
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    setError("");
    try {
      await broadcastNotification({
        title: title.trim(),
        body: body.trim(),
        examTypeId: examTypeId || undefined,
      });
      toast.success("Notification broadcast");
      setTitle("");
      setBody("");
    } catch {
      toast.error("Failed to send notification");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteNotification(id);
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <AdminLayout
      title="Notifications"
      subtitle="Broadcast updates to students. Push delivery (FCM / WebSockets / email) is a backend enhancement."
    >
      <div className="space-y-6">
        {notificationsError && <Alert variant="error">{notificationsError}</Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Broadcast form */}
          <Card
            className="lg:col-span-2"
            title="New broadcast"
            subtitle={
              examTypeId
                ? `Scoped to ${examTypes.find((e) => e.id === examTypeId)?.name ?? "exam"}`
                : "Global — all exams"
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Audience
                </label>
                <select
                  value={examTypeId}
                  onChange={(e) => setExamTypeId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
                >
                  <option value="">Global — all exams</option>
                  {examTypes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New mock test released"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Write your announcement…"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all resize-none"
                />
              </div>
              {error && (
                <Alert variant="error">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle size={13} /> {error}
                  </span>
                </Alert>
              )}
              <Button
                onClick={handleBroadcast}
                loading={broadcastLoading}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Send broadcast
              </Button>
            </div>
          </Card>

          {/* List of past notifications */}
          <Card
            className="lg:col-span-3"
            title="Sent notifications"
            subtitle={`${notifications.length} total`}
          >
            {notificationsLoading && notifications.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                    <div className="h-3 w-full bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                title="No notifications sent yet"
                description="Use the form to broadcast your first announcement."
              />
            ) : (
              <ul className="divide-y divide-slate-50">
                {notifications.map((n) => (
                  <li key={n.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Megaphone className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 break-words">
                            {n.body}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {new Date(n.sentAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {n.examTypeId ? (
                          <Badge variant="primary">Specific exam</Badge>
                        ) : (
                          <Badge variant="success">All</Badge>
                        )}
                        <button
                          onClick={() => setPendingDelete(n.id)}
                          disabled={deletingId === n.id}
                          aria-label={`Delete notification: ${n.title}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this broadcast?"
        message="This permanently removes the announcement from every student's inbox. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        danger
        loading={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AdminLayout>
  );
}

export default NotificationsPanel;