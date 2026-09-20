// src/pages/notes/NotesPage.tsx
// Card/list of free & paid notes for the student's exam type.
// Fetches GET /student/notes (filterable by subject/topic/isFree).
// Paid notes show a locked state until access is granted.

import { useState, useMemo } from "react";
import {
  FileText,
  Lock,
  Download,
  AlertTriangle,
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
  Reveal,
} from "../../components/ui";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { cn } from "../../utils/cn";
import { subjectHue } from "../../utils/subjectColor";
import type { SubjectWithCounts } from "../../types/student.types";

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
              {(subjectQuery.data ?? []).map((s: SubjectWithCounts) => (
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
            {filtered.map((note, i) => {
              const hue = subjectHue(note.subject?.name ?? note.topic?.name ?? "Notes");
              return (
                <Reveal key={note.id} delay={i * 50}>
                  <div
                    className={cn(
                      "card-surface card-surface-hover p-5 flex flex-col hover:-translate-y-0.5",
                      hue.hoverBorder
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", hue.tile)}>
                        <FileText className="w-5 h-5" />
                      </div>
                      {note.isFree ? (
                        <Badge variant="success">Free</Badge>
                      ) : (
                        <Badge variant="warning">
                          <Lock className="w-3 h-3" /> Paid
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-900">{note.title}</h3>

                    {(note.subject?.name || note.topic?.name) && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", hue.dot)} />
                        {note.subject?.name}
                        {note.subject?.name && note.topic?.name ? " • " : ""}
                        {note.topic?.name}
                      </p>
                    )}

                    <div className="mt-auto pt-4">
                      {note.fileSizeMb != null && (
                        <p className="text-[11px] text-slate-400 mb-2">
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
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
