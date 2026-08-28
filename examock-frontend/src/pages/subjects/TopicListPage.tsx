// src/pages/subjects/TopicListPage.tsx
// Topic list with per-topic progress bars, video/question counts.
// Fetches GET /student/topics?subjectId= and shows the subject name.

import { useParams, Link } from "react-router-dom";
import {
  PlayCircle,
  ListChecks,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader } from "../../components/ui";
import { Badge } from "../../components/ui";
import { EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useSubjects, useTopics } from "../../hooks/student/useStudentData";

export default function TopicListPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const subjectQuery = useSubjects();
  const { data: topics, isLoading, isError } = useTopics(subjectId ?? "");

  const subjectName =
    subjectQuery.data?.find((s) => s.id === subjectId)?.name ?? "Subject";

  return (
    <AppShell section="student">
      <PageHeader
        title={subjectName}
        subtitle="Topics in this subject — track your progress and jump into videos"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError || !topics ? (
          <EmptyState
            title="Could not load topics"
            description="Something went wrong fetching this subject's topics."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : topics.length === 0 ? (
          <EmptyState
            title="No topics yet"
            description="Topics for this subject will show up here once added."
            icon={<ListChecks className="w-6 h-6 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topics.map((topic) => {
              const progress = topic.progress;
              const pct =
                progress?.bestScore != null
                  ? Math.round(progress.bestScore)
                  : 0;
              return (
                <Link
                  key={topic.id}
                  to={`/topics/${topic.id}/videos`}
                  className="group bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {topic.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Badge variant="muted">
                      <PlayCircle className="w-3 h-3" />
                      {topic.videoCount} video{topic.videoCount !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="muted">
                      <ListChecks className="w-3 h-3" />
                      {topic.questionCount} question{topic.questionCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {progress?.bestScore != null && (
                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                        <span>Best score</span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 70
                              ? "bg-emerald-500"
                              : pct >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!progress && (
                    <p className="mt-3 text-xs text-gray-400">
                      Not started yet
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
