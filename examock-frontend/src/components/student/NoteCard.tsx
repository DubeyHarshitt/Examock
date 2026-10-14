// src/components/student/NoteCard.tsx
// One study-note card (free / paid). Shared by the Library subject Notes tab
// and the exam-wide "General" list. Extracted from the old NotesPage so the
// same visual language is used everywhere notes appear.

import { FileText, Lock, Download } from "lucide-react";

import { Badge, Button, Reveal } from "../ui";
import { cn } from "../../utils/cn";
import { subjectHue } from "../../utils/subjectColor";
import type { StudentNote } from "../../types/student.types";

interface NoteCardProps {
  note: StudentNote;
  /** Stagger delay (ms) for the mount animation. */
  delay?: number;
}

/** Open a note's file. Prefers an explicit download endpoint when present. */
function openNote(note: StudentNote) {
  if (note.filePath) {
    window.open(note.filePath, "_blank", "noopener,noreferrer");
  }
}

export function NoteCard({ note, delay = 0 }: NoteCardProps) {
  const hue = subjectHue(note.subject?.name ?? note.topic?.name ?? "Notes");

  return (
    <Reveal delay={delay}>
      <div
        className={cn(
          "card-surface card-surface-hover p-5 flex flex-col hover:-translate-y-0.5",
          hue.hoverBorder
        )}
      >
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
              hue.tile
            )}
          >
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
            <p className="text-[11px] text-slate-400 mb-2">{note.fileSizeMb} MB</p>
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
            onClick={() => openNote(note)}
          >
            {note.isFree ? "Download" : "Unlock"}
          </Button>
        </div>
      </div>
    </Reveal>
  );
}

export default NoteCard;
