// src/pages/subjects/SubjectListPage.tsx
// Card grid of color-coded subjects for the student's exam type.
// Fetches from GET /student/subjects.

import { Link } from "react-router-dom";
import { FolderOpen, FileText, ChevronRight, AlertTriangle } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, Badge, EmptyState, Reveal } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useSubjects } from "../../hooks/student/useStudentData";
import { cn } from "../../utils/cn";
import { subjectHue } from "../../utils/subjectColor";
import type { SubjectWithCounts } from "../../types/student.types";

export default function SubjectListPage() {
  const { data, isLoading, isError } = useSubjects();

  return (
    <AppShell section="student">
      <PageHeader
        title="Subjects"
        subtitle="Browse study material by subject for your exam"
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError || !data ? (
          <EmptyState
            title="Could not load subjects"
            description="Something went wrong fetching your subjects."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : data.length === 0 ? (
          <EmptyState
            title="No subjects yet"
            description="Subjects for your exam will appear here once they are added."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((subject: SubjectWithCounts, i: number) => {
              const hue = subjectHue(subject.name);
              return (
                <Reveal key={subject.id} delay={i * 50}>
                  <Link
                    to={`/subjects/${subject.id}/topics`}
                    className={cn(
                      "group card-surface card-surface-hover block p-5",
                      hue.hoverBorder,
                      "hover:-translate-y-0.5"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                          hue.tile
                        )}
                      >
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                    </div>
                    <h3 className="mt-4 font-display text-sm font-bold text-slate-900">
                      {subject.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="muted">
                        {subject.topicCount} topic{subject.topicCount !== 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="muted">
                        <FileText className="w-3 h-3" />
                        {subject.noteCount} note{subject.noteCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}