// src/components/student/NotesGrid.tsx
// Responsive grid of study notes with loading / empty / error states.
// Pass `subjectId` to scope to one subject, or `unassigned` for exam-wide
// ("General") material. Backed by GET /student/notes.

import { FileText, AlertTriangle } from "lucide-react";

import { EmptyState } from "../ui";
import { SkeletonCard } from "../ui/Skeleton";
import { useNotes } from "../../hooks/student/useStudentData";
import type { StudentNote } from "../../types/student.types";
import { NoteCard } from "./NoteCard";

interface NotesGridProps {
  /** Scope notes to a single subject. */
  subjectId?: string;
  /** Show notes not attached to any subject (exam-wide material). */
  unassigned?: boolean;
  /** Copy shown when there are no notes. */
  emptyTitle?: string;
  emptyDescription?: string;
}

export function NotesGrid({
  subjectId,
  unassigned,
  emptyTitle = "No notes yet",
  emptyDescription = "Study material will appear here once it is uploaded.",
}: NotesGridProps) {
  const filters = subjectId
    ? { subjectId }
    : unassigned
      ? { unassigned: true }
      : undefined;

  const { data, isLoading, isError } = useNotes(filters);
  const notes: StudentNote[] = data?.notes ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load notes"
        description="Something went wrong fetching your notes."
        icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
      />
    );
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<FileText className="w-6 h-6 text-gray-400" />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note, i) => (
        <NoteCard key={note.id} note={note} delay={i * 50} />
      ))}
    </div>
  );
}

export default NotesGrid;
