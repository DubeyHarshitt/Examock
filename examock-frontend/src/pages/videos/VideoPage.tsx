// src/pages/videos/VideoPage.tsx
// Embedded YouTube playlist for a topic, with "mark as watched" progress.
// Fetches GET /student/videos?topicId=

import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  PlayCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, Badge, Button, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useVideosByTopic } from "../../hooks/student/useStudentData";

/** Format duration seconds as "Xm Ys" */
function formatDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function VideoPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { data, isLoading, isError } = useVideosByTopic(topicId ?? "");
  const [watched, setWatched] = useState<Set<string>>(new Set());

  const videos = data?.videos ?? data ?? [];

  const toggleWatched = (id: string) => {
    // Local "watched" toggle for this session (persisted per-topic as MVP).
    // Future: persist via a progress API call.
    setWatched((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentVideo =
    videos.find((v: { id: string }) => watched.has(v.id) === false) ?? videos[0];

  return (
    <AppShell section="student">
      <PageHeader
        title="Topic Videos"
        subtitle="Watch curated videos for this topic"
        action={
          <Link
            to="/subjects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600"
          >
            <ArrowLeft className="w-3 h-3" /> All subjects
          </Link>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SkeletonCard className="h-72" />
            </div>
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ) : isError || !videos.length ? (
          <EmptyState
            title="No videos yet"
            description="Videos for this topic will appear here once added."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Main player ─────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${currentVideo.youtubeId}`}
                    title={currentVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-sm font-bold text-gray-900">
                    {currentVideo.title}
                  </h2>
                  {currentVideo.durationSec != null && (
                    <Badge variant="muted" className="mt-2">
                      <Clock className="w-3 h-3" />
                      {formatDuration(currentVideo.durationSec)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* ── Playlist sidebar ────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Playlist ({videos.length})
              </h3>
              <div className="space-y-2">
                {videos.map((video: { id: string; youtubeId: string; title: string; durationSec: number | null }, index: number) => {
                  const isWatched = watched.has(video.id);
                  const isCurrent = video.id === currentVideo?.id;
                  return (
                    <button
                      key={video.id}
                      onClick={() => toggleWatched(video.id)}
                      className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
                        isCurrent
                          ? "bg-indigo-50 ring-1 ring-indigo-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-6 h-6 shrink-0 rounded-full text-xs font-bold text-gray-500 bg-gray-100 flex items-center justify-center">
                        {isWatched ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-gray-800">
                          {video.title}
                        </span>
                        {video.durationSec != null && (
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {formatDuration(video.durationSec)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-400">
                  {watched.size} of {videos.length} marked watched. Click a video
                  to toggle its watched status.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
