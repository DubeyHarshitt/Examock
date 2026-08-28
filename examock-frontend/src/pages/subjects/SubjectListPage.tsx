// src/pages/subjects/SubjectListPage.tsx
// Card grid of subjects for the student's exam type.
// Fetches from GET /student/subjects.

import { Link } from "react-router-dom";
import { FolderOpen, FileText, ChevronRight, AlertTriangle } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader } from "../../components/ui";
import { Badge } from "../../components/ui";
import { EmptyState } from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useSubjects } from "../../hooks/student/useStudentData";

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
            {data.map((subject) => (
              <Link
                key={subject.id}
                to={`/subjects/${subject.id}/topics`}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-gray-900">{subject.name}</h3>
                <div className="flex gap-2 mt-3">
                  <Badge variant="primary">
                    {subject.topicCount} topic{subject.topicCount !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="muted">
                    <FileText className="w-3 h-3" />
                    {subject.noteCount} note{subject.noteCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
