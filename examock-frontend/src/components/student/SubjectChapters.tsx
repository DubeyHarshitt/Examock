// src/components/student/SubjectChapters.tsx
// Topic (chapter) grid with per-topic progress, video/question counts.
// Extracted from the old TopicListPage so the Library subject page can render
// it inside the "Chapters" tab. Backed by GET /student/topics?subjectId=.

import { Link } from "react-router-dom";
import { PlayCircle, ListChecks, ChevronRight, AlertTriangle } from "lucide-react";

import { Chip, EmptyState, Reveal } from "../ui";
import { SkeletonCard } from "../ui/Skeleton";
import { useTopics } from "../../hooks/student/useStudentData";
import { cn } from "../../utils/cn";
import { subjectHue } from "../../utils/subjectColor";
import type { TopicWithProgress } from "../../types/student.types";

interface SubjectChaptersProps {
  subjectId: string;
  /** Subject name — drives the deterministic color hue. */
  subjectName: string;
}

export function SubjectChapters({ subjectId, subjectName }: SubjectChaptersProps) {
  const { data: topics, isLoading, isError } = useTopics(subjectId);
  const hue = subjectHue(subjectName);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError || !topics) {
    return (
      <EmptyState
        title="Could not load chapters"
        description="Something went wrong fetching this subject's chapters."
        icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
      />
    );
  }

  if (topics.length === 0) {
    return (
      <EmptyState
        title="No chapters yet"
        description="Chapters for this subject will show up here once added."
        icon={<ListChecks className="w-6 h-6 text-slate-400" />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {topics.map((topic: TopicWithProgress, i: number) => {
        const progress = topic.progress;
        const pct =
          progress?.bestScore != null ? Math.round(progress.bestScore) : 0;
        return (
          <Reveal key={topic.id} delay={i * 50}>
            <Link
              to={`/topics/${topic.id}/videos`}
              className={cn(
                "group card-surface card-surface-hover block p-5 hover:-translate-y-0.5",
                hue.hoverBorder
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", hue.dot)} />
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                    {topic.name}
                  </h3>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 shrink-0 transition-colors" />
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Chip icon={<PlayCircle className="w-3.5 h-3.5" />}>
                  {topic.videoCount} video{topic.videoCount !== 1 ? "s" : ""}
                </Chip>
                <Chip icon={<ListChecks className="w-3.5 h-3.5" />}>
                  {topic.questionCount} question{topic.questionCount !== 1 ? "s" : ""}
                </Chip>
              </div>

              {progress?.bestScore != null ? (
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Best score</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct >= 70
                          ? "bg-emerald-500"
                          : pct >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5" /> Not started yet
                </p>
              )}
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}

export default SubjectChapters;
