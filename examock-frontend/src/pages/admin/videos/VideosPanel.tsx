// src/pages/admin/videos/VideosPanel.tsx
// Admin CRUD for YouTube videos mapped to a topic.

import { useEffect, useState } from "react";
import {
  MonitorPlay,
  Plus,
  Trash2,
  PencilLine,
  X,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { useToast } from "../../../components/ui/toast/toast-context";
import { EmptyState } from "../../../components/ui/EmptyState";

interface VideosPanelProps {
  topicId: string;
}

interface VideoFormValues {
  youtubeId: string;
  title: string;
  durationSec: string;
  orderIndex: string;
}

const emptyForm: VideoFormValues = {
  youtubeId: "",
  title: "",
  durationSec: "",
  orderIndex: "",
};

function formatDuration(sec: number | null | undefined) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideosPanel({ topicId }: VideosPanelProps) {
  const { videos, videosLoading, videosError, fetchVideos, createVideo, updateVideo, deleteVideo } =
    useAdminStore();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VideoFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (topicId) {
      fetchVideos(topicId);
    }
  }, [topicId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.youtubeId.trim() || !form.title.trim()) {
      setFormError("YouTube ID and title are required.");
      return;
    }
    setFormError("");
    const durationSec = form.durationSec ? Number(form.durationSec) : undefined;
    const orderIndex = form.orderIndex ? Number(form.orderIndex) : 0;
    try {
      if (editingId) {
        await updateVideo(editingId, {
          youtubeId: form.youtubeId.trim(),
          title: form.title.trim(),
          durationSec,
          orderIndex,
        });
        toast.success("Video updated");
      } else {
        await createVideo({
          topicId,
          youtubeId: form.youtubeId.trim(),
          title: form.title.trim(),
          durationSec,
          orderIndex,
        });
        toast.success("Video added");
      }
      resetForm();
    } catch {
      toast.error("Failed to save video");
    }
  };

  const handleAddClick = () => {
    if (!topicId) return;
    if (showForm) {
      resetForm();
    } else {
      setEditingId(null);
      setForm(emptyForm);
      setShowForm(true);
    }
  };

  const handleEdit = (id: string) => {
    const v = videos.find((x) => x.id === id);
    if (!v) return;
    setEditingId(id);
    setForm({
      youtubeId: v.youtubeId,
      title: v.title,
      durationSec: v.durationSec?.toString() ?? "",
      orderIndex: v.orderIndex?.toString() ?? "",
    });
    setShowForm(true);
    setFormError("");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteVideo(id);
      toast.success("Video removed");
    } catch {
      toast.error("Failed to delete video");
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all";

  return (
    <div className="space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MonitorPlay size={16} className="text-brand-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Videos</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {videos.length} video{videos.length !== 1 ? "s" : ""} linked to this topic
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            disabled={!topicId}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> Add video
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              {editingId ? "Edit video" : "Add video"}
            </h3>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                YouTube video ID
              </label>
              <input
                value={form.youtubeId}
                onChange={(e) => setForm({ ...form, youtubeId: e.target.value })}
                placeholder="e.g. dQw4w9WgXcQ"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Title
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Kinematics — Lecture 1"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                min={0}
                value={form.durationSec}
                onChange={(e) => setForm({ ...form, durationSec: e.target.value })}
                placeholder="e.g. 900"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Order index
              </label>
              <input
                type="number"
                min={0}
                value={form.orderIndex}
                onChange={(e) => setForm({ ...form, orderIndex: e.target.value })}
                placeholder="0"
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
              disabled={videosLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              <Check size={13} />
              {editingId ? "Save changes" : "Add video"}
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {videosError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-lg text-xs font-medium">
          <AlertCircle size={13} />
          {videosError}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {videosLoading && videos.length === 0 ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 w-4 bg-slate-100 rounded" />
                <div className="h-3 flex-1 bg-slate-100 rounded" />
                <div className="h-3 w-10 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptyState
            title="No videos for this topic"
            description="Add YouTube videos to help students learn this topic."
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {videos.map((video, idx) => (
              <div
                key={video.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 group"
              >
                <span className="text-xs font-semibold text-slate-300 w-5">
                  {video.orderIndex ?? idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {video.title}
                  </p>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    youtube.com/watch?v={video.youtubeId}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Clock size={12} />
                  {formatDuration(video.durationSec)}
                </span>
                <button
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${video.youtubeId}`, "_blank")}
                  className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                  title="Preview"
                >
                  <MonitorPlay size={14} />
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(video.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                    title="Edit"
                  >
                    <PencilLine size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(video.id)}
                    disabled={deletingId === video.id}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideosPanel;
