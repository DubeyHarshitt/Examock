// src/pages/videos/VideoPage.tsx
//
// Embedded YouTube playlist for a topic, with a per-video "mark as watched"
// toggle that persists server-side via POST /student/videos/:id/watched.
//
// Two definitions of "watched" exist in this codebase (see student-side-v1.md
// §11): this page is the per-video toggle; the progress pages' counter is
// incremented by completing a chapter test. They measure different things.

import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { PageHeader, Badge, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import {
  useToggleVideoWatched,
  useVideosByTopic,
} from "../../hooks/student/useStudentData";

/** Format duration seconds as "Xm Ys" */
function formatDuration(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

interface VideoRow {
  id: string;
  youtubeId: string;
  title: string;
  durationSec: number | null;
}

export default function VideoPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { data, isLoading, isError } = useVideosByTopic(topicId ?? "");
  const toggleMutation = useToggleVideoWatched();

  const videos = useMemo<VideoRow[]>(() => data?.videos ?? [], [data]);

  // Local view of "watched" — seeded from the server's `watchedIds` and
  // updated optimistically on click. The mutation invalidates the videos
  // query on success so the seed re-syncs to the new server state.
  const serverWatchedIds = data?.watchedIds ?? [];
  const [optimisticWatched, setOptimisticWatched] = useState<Set<string>>(
    () => new Set(serverWatchedIds),
  );
  // Re-seed when server data arrives / changes — guarded by length so we only
  // re-sync on actual changes, not on every render.
  const [lastSeenLen, setLastSeenLen] = useState(serverWatchedIds.length);
  if (serverWatchedIds.length !== lastSeenLen) {
    setLastSeenLen(serverWatchedIds.length);
    setOptimisticWatched(new Set(serverWatchedIds));
  }

  // Currently-playing video — explicit selection so clicking a row doesn't
  // also mark it watched.
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const currentVideo =
    videos.find((v) => v.id === selectedVideoId) ?? videos[0];

  const handleToggle = (id: string) => {
    const wasWatched = optimisticWatched.has(id);
    // Optimistic update — reflect immediately, then fire the mutation.
    setOptimisticWatched((prev) => {
      const next = new Set(prev);
      if (wasWatched) next.delete(id);
      else next.add(id);
      return next;
    });
    toggleMutation.mutate(id, {
      onError: () => {
        // Roll back on failure.
        setOptimisticWatched((prev) => {
          const rolled = new Set(prev);
          if (wasWatched) rolled.add(id);
          else rolled.delete(id);
          return rolled;
        });
      },
    });
  };

  return (
    <AppShell section="student">
      <PageHeader
        title="Topic Videos"
        subtitle="Watch curated videos for this topic"
        action={
          <Link
            to="/subjects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600"
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
              <div className="card-surface overflow-hidden">
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
            <div className="card-surface p-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">
                Playlist ({videos.length})
              </h3>
              <ul className="space-y-2">
                {videos.map((video, index) => {
                  const watched = optimisticWatched.has(video.id);
                  const isCurrent = video.id === currentVideo?.id;
                  return (
                    <li
                      key={video.id}
                      className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-brand-50 ring-1 ring-brand-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedVideoId(video.id)}
                        aria-label={`Play ${video.title}`}
                        className="w-6 h-6 shrink-0 rounded-full text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      >
                        {watched ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          index + 1
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedVideoId(video.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block text-xs font-semibold text-gray-800 line-clamp-2">
                          {video.title}
                        </span>
                        {video.durationSec != null && (
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {formatDuration(video.durationSec)}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handleToggle(video.id)}
                        aria-label={
                          watched ? "Mark as unwatched" : "Mark as watched"
                        }
                        title={
                          watched ? "Mark as unwatched" : "Mark as watched"
                        }
                        className="shrink-0 p-1 rounded text-gray-400 hover:text-emerald-500"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            watched
                              ? "text-emerald-500"
                              : "text-gray-300 hover:text-emerald-400"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-400">
                  {optimisticWatched.size} of {videos.length} marked watched.
                  Click the ✓ to toggle.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}