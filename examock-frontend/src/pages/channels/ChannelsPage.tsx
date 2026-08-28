// src/pages/channels/ChannelsPage.tsx
// Grid of recommended YouTube channels with a Subscribe button embed.
// Fetches GET /student/yt-channels.

import { useEffect } from "react";
import { MonitorPlay, AlertTriangle, ExternalLink } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useYtChannels } from "../../hooks/student/useStudentData";

// Loads the YouTube subscribe button widget JS (once).
function useYtSubscribeScript() {
  useEffect(() => {
    if (document.getElementById("ytsubscribe-script")) return;
    const script = document.createElement("script");
    script.id = "ytsubscribe-script";
    script.src = "https://apis.google.com/js/platform.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // leave the script; it is idempotent
    };
  }, []);
}

function YtSubscribeButton({ channelId }: { channelId: string }) {
  useYtSubscribeScript();
  return (
    <div className="g-ytsubscribe" data-channelid={channelId} data-layout="default" data-count="default" />
  );
}

export default function ChannelsPage() {
  const { data, isLoading, isError } = useYtChannels();

  const channels = Array.isArray(data) ? data : (data?.channels ?? data ?? []);

  return (
    <AppShell section="student">
      <PageHeader
        title="Recommended Channels"
        subtitle="Subscribe to top educators for your exam prep"
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError || channels.length === 0 ? (
          <EmptyState
            title="No channels yet"
            description="Recommended YouTube channels will appear here once added."
            icon={
              isError ? (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              ) : (
                <MonitorPlay className="w-6 h-6 text-gray-400" />
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(
              (channel: {
                id: string;
                channelId: string;
                channelName: string;
                logoUrl?: string | null;
              }) => (
                <div
                  key={channel.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                >
                  {channel.logoUrl ? (
                    <img
                      src={channel.logoUrl}
                      alt={channel.channelName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                      <MonitorPlay className="w-7 h-7 text-red-500" />
                    </div>
                  )}
                  <h3 className="mt-3 text-sm font-bold text-gray-900">
                    {channel.channelName}
                  </h3>

                  <div className="mt-4 w-full">
                    {/* YouTube Subscribe button embed */}
                    <div className="flex justify-center">
                      <YtSubscribeButton channelId={channel.channelId} />
                    </div>
                    {/* Fallback link for non-JS environments */}
                    <a
                      href={`https://www.youtube.com/channel/${channel.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Open on YouTube
                    </a>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
