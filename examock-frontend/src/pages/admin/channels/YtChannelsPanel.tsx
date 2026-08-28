// src/pages/admin/channels/YtChannelsPanel.tsx
// Admin CRUD for recommended YouTube channels for an exam type.

import { useEffect, useState } from "react";
import {
  MonitorPlay,
  Plus,
  Trash2,
  PencilLine,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { useToast } from "../../../components/ui/toast/toast-context";
import { EmptyState } from "../../../components/ui/EmptyState";

interface YtChannelsPanelProps {
  examTypeId: string;
}

interface FormValues {
  channelId: string;
  channelName: string;
  logoUrl: string;
}

const emptyForm: FormValues = { channelId: "", channelName: "", logoUrl: "" };

export function YtChannelsPanel({ examTypeId }: YtChannelsPanelProps) {
  const {
    ytChannels,
    ytChannelsLoading,
    ytChannelsError,
    fetchYtChannels,
    createYtChannel,
    updateYtChannel,
    deleteYtChannel,
  } = useAdminStore();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (examTypeId) {
      fetchYtChannels(examTypeId);
    }
  }, [examTypeId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.channelId.trim() || !form.channelName.trim()) {
      setFormError("Channel ID and channel name are required.");
      return;
    }
    setFormError("");
    try {
      if (editingId) {
        await updateYtChannel(editingId, {
          channelId: form.channelId.trim(),
          channelName: form.channelName.trim(),
          logoUrl: form.logoUrl.trim() || undefined,
        });
        toast.success("Channel updated");
      } else {
        await createYtChannel({
          examTypeId,
          channelId: form.channelId.trim(),
          channelName: form.channelName.trim(),
          logoUrl: form.logoUrl.trim() || undefined,
        });
        toast.success("Channel added");
      }
      resetForm();
    } catch {
      toast.error("Failed to save channel");
    }
  };

  const handleEdit = (id: string) => {
    const c = ytChannels.find((x) => x.id === id);
    if (!c) return;
    setEditingId(id);
    setForm({
      channelId: c.channelId,
      channelName: c.channelName,
      logoUrl: c.logoUrl ?? "",
    });
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteYtChannel(id);
      toast.success("Channel removed");
    } catch {
      toast.error("Failed to delete channel");
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MonitorPlay size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            YouTube Channels
          </span>
          {ytChannels.length > 0 && (
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
              {ytChannels.length}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
            showForm
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Plus size={13} />
          {showForm ? "Cancel" : "Add channel"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              {editingId ? "Edit channel" : "Add channel"}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Channel name
              </label>
              <input
                value={form.channelName}
                onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                placeholder="e.g. Physics Wallah"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                YouTube channel ID
              </label>
              <input
                value={form.channelId}
                onChange={(e) => setForm({ ...form, channelId: e.target.value })}
                placeholder="e.g. UCcN3I0I1_..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Logo URL (optional)
              </label>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-xs font-medium">
              <AlertCircle size={13} />
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={ytChannelsLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              <Check size={13} />
              {editingId ? "Save changes" : "Add channel"}
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {ytChannelsError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-lg text-xs font-medium">
          <AlertCircle size={13} />
          {ytChannelsError}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ytChannelsLoading && ytChannels.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                <div className="h-10 w-10 bg-slate-100 rounded-full mb-3" />
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
              </div>
            ))
          : ytChannels.map((channel) => (
              <div
                key={channel.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 group"
              >
                <div className="flex items-center gap-3">
                  {channel.logoUrl ? (
                    <img
                      src={channel.logoUrl}
                      alt={channel.channelName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                      {channel.channelName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {channel.channelName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      {channel.channelId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-0.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.youtube.com/channel/${channel.channelId}`,
                        "_blank"
                      )
                    }
                    className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                    title="Open channel"
                  >
                    <MonitorPlay size={14} />
                  </button>
                  <button
                    onClick={() => handleEdit(channel.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                    title="Edit"
                  >
                    <PencilLine size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(channel.id)}
                    disabled={deletingId === channel.id}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
      </div>

      {!ytChannelsLoading && ytChannels.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            title="No channels for this exam type"
            description="Add recommended YouTube channels students should subscribe to."
          />
        </div>
      )}
    </div>
  );
}

export default YtChannelsPanel;
