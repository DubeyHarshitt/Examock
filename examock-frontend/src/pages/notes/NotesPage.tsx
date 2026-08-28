// src/pages/notes/NotesPage.tsx
// Card/list of free & paid notes for the student's exam type.
// Fetches GET /student/notes (filterable by subject/topic/isFree).
// Paid notes show a locked state until access is granted.

import { useState, useMemo } from "react";
import {
  FileText,
  Lock,
  Download,
  Search,
  AlertTriangle,
  Filter,
} from "lucide-react";
import {
  useNotes,
  useSubjects,
} from "../../hooks/student/useStudentData";

import AppShell from "../../components/layout/AppShell";
import {
  PageHeader,
  Badge,
  Button,
  EmptyState,
  Select,
} from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";

interface NoteItem {
  id: string;
  title: string;
  filePath: string;
  fileName: string;
  isFree: boolean;
  subjectId?: string | null;
  fileSizeMb?: number | null;
  topic?: { name: string } | null;
  subject?: { name: string } | null;
}

export default function NotesPage() {
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const { data, isLoading, isError } = useNotes(
    subjectFilter ? { subjectId: subjectFilter } : undefined
  );
  const subjectQuery = useSubjects();

  // Normalise the response (backend may return array or { notes: [...] })
  const notes: NoteItem[] = Array.isArray(data)
    ? data
    : (data?.notes ?? []);

  const filtered = useMemo(() => {
    if (!subjectFilter) return notes;
    return notes.filter((n) => n.subjectId === undefined || n.subjectId === subjectFilter);
  }, [notes, subjectFilter]);

  const downloadNote = (note: NoteItem) => {
    // Open the file via its returned path. For future-proofing, an explicit
    // GET /notes/:id/download endpoint is preferred when available.
    if (note.filePath) {
      window.open(note.filePath, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <AppShell section="student">
      <PageHeader
        title="Study Notes"
        subtitle="Download free & premium study material"
        action={
          <div className="w-48">
            <Select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filter by subject"
            >
              <option value="">All subjects</option>
              {(subjectQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Could not load notes"
            description="Something went wrong fetching your notes."
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No notes found"
            description={
              subjectFilter
                ? "No notes for this subject yet."
                : "Study notes will appear here once uploaded."
            }
            icon={<FileText className="w-6 h-6 text-gray-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  {note.isFree ? (
                    <Badge variant="success">Free</Badge>
                  ) : (
                    <Badge variant="warning">
                      <Lock className="w-3 h-3" /> Paid
                    </Badge>
                  )}
                </div>

                <h3 className="mt-4 text-sm font-bold text-gray-900">{note.title}</h3>

                {(note.subject?.name || note.topic?.name) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {note.subject?.name}
                    {note.subject?.name && note.topic?.name ? " • " : ""}
                    {note.topic?.name}
                  </p>
                )}

                <div className="mt-auto pt-4">
                  {note.fileSizeMb != null && (
                    <p className="text-[11px] text-gray-400 mb-2">
                      {note.fileSizeMb} MB
                    </p>
                  )}
                  <Button
                    variant={note.isFree ? "primary" : "outline"}
                    size="sm"
                    className="w-full"
                    icon={
                      note.isFree ? (
                        <Download className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )
                    }
                    onClick={() => downloadNote(note)}
                  >
                    {note.isFree ? "Download" : "Unlock"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
