// src/pages/subjects/SubjectDetailPage.tsx
// One subject in the Library: a Chapters tab (topics → videos) and a Notes tab
// (study material for the subject). The pseudo-id "general" renders exam-wide
// ("unassigned") notes only. Backed by GET /student/topics and /student/notes.

import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, FolderOpen } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { PageHeader, FilterTabs, EmptyState } from "../../components/ui";
import { NotesGrid } from "../../components/student/NotesGrid";
import { SubjectChapters } from "../../components/student/SubjectChapters";
import { useSubjects } from "../../hooks/student/useStudentData";
import type { SubjectWithCounts } from "../../types/student.types";

/** Pseudo subject id for exam-wide (unassigned) material. */
export const GENERAL_SUBJECT_ID = "general";

export default function SubjectDetailPage() {
  const { subjectId = "" } = useParams<{ subjectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isGeneral = subjectId === GENERAL_SUBJECT_ID;

  const subjectQuery = useSubjects();
  const subject =
    subjectQuery.data?.find((s: SubjectWithCounts) => s.id === subjectId) ?? null;

  const subjectName = isGeneral ? "General" : (subject?.name ?? "Subject");

  const tabParam = searchParams.get("tab");
  const activeTab = isGeneral
    ? "notes"
    : tabParam === "notes"
      ? "notes"
      : "chapters";

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === "chapters") next.delete("tab");
    else next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  const tabs = isGeneral
    ? [{ id: "notes", label: "Notes" }]
    : [
        { id: "chapters", label: "Chapters", count: subject?.topicCount },
        { id: "notes", label: "Notes", count: subject?.noteCount },
      ];

  // Only treat as missing once subjects have loaded and this id isn't one.
  const notFound =
    !isGeneral &&
    !subjectQuery.isLoading &&
    !!subjectQuery.data &&
    !subject;

  return (
    <AppShell section="student">
      <PageHeader
        title={subjectName}
        subtitle={
          isGeneral
            ? "Exam-wide study material"
            : "Chapters and notes for this subject"
        }
        action={
          <Link
            to="/subjects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Library
          </Link>
        }
      />

      {notFound ? (
        <div className="mt-6">
          <EmptyState
            title="Subject not found"
            description="This subject may have been removed from your exam."
            icon={<FolderOpen className="w-6 h-6 text-slate-400" />}
          />
        </div>
      ) : (
        <>
          <div className="mt-6">
            <FilterTabs tabs={tabs} value={activeTab} onChange={setTab} />
          </div>

          <div className="mt-5">
            {activeTab === "chapters" ? (
              <SubjectChapters subjectId={subjectId} subjectName={subjectName} />
            ) : (
              <NotesGrid
                subjectId={isGeneral ? undefined : subjectId}
                unassigned={isGeneral}
                emptyTitle={isGeneral ? "No general notes yet" : "No notes yet"}
                emptyDescription={
                  isGeneral
                    ? "Exam-wide material will appear here once it is uploaded."
                    : "Study material for this subject will appear here once it is uploaded."
                }
              />
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
