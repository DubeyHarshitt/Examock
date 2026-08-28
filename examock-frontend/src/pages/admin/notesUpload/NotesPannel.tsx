import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Trash2,
  PencilLine,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  X,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import { useAdminStore } from "../../../store/admin/admin.store";
import type {
  Note,
  CreateNoteDto,
} from "../../../store/admin/types/admin.types";
// import { toCloudinaryDownloadUrl } from "../../../utils/cloudinary";
import { getNoteDownloadUrlApi } from "../../../api/admin.api";

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotesPanelProps {
  examTypeId: string;
  subjectId?: string;
  topicId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(mb: number | null | undefined) {
  if (mb == null) return "—";
  return mb < 1 ? `${Math.round(mb * 1024)} KB` : `${mb.toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Upload form ──────────────────────────────────────────────────────────────

interface UploadFormProps {
  examTypeId: string;
  subjectId?: string;
  topicId?: string;
  onClose: () => void;
  onSubmit: (dto: CreateNoteDto) => Promise<void>;
  loading: boolean;
}

function UploadForm({
  examTypeId,
  subjectId,
  topicId,
  onClose,
  onSubmit,
  loading,
}: UploadFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    setError("");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
    setError("");

    await onSubmit({
      examTypeId,
      subjectId: subjectId || undefined,
      topicId: topicId || undefined,
      title: title.trim(),
      file,
      isFree,
    });
    onClose();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Upload note</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Algebra Basics"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
        />
      </div>

      {/* File drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-all ${
          dragOver
            ? "border-brand-400 bg-brand-50"
            : file
              ? "border-green-300 bg-green-50"
              : "border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <>
            <FileText size={24} className="text-green-500" />
            <p className="text-xs font-semibold text-green-700">{file.name}</p>
            <p className="text-xs text-slate-400">
              {formatSize(file.size / (1024 * 1024))}
            </p>
          </>
        ) : (
          <>
            <Upload size={24} className="text-slate-300" />
            <p className="text-xs font-medium text-slate-500">
              Drop a PDF here, or{" "}
              <span className="text-brand-600 font-semibold">browse</span>
            </p>
            <p className="text-xs text-slate-400">PDF only · max 50 MB</p>
          </>
        )}
      </div>

      {/* isFree toggle */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-semibold text-slate-700">Free access</p>
          <p className="text-xs text-slate-400">
            Students can view without a subscription
          </p>
        </div>
        <button
          onClick={() => setIsFree((v) => !v)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            isFree ? "bg-brand-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              isFree ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-xs font-medium">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-all"
        >
          {loading ? (
            "Uploading…"
          ) : (
            <>
              <Upload size={13} /> Upload
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Inline edit row ──────────────────────────────────────────────────────────

interface EditRowProps {
  note: Note;
  onSave: (id: string, title: string, isFree: boolean) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

function EditRow({ note, onSave, onCancel, loading }: EditRowProps) {
  const [title, setTitle] = useState(note.title);
  const [isFree, setIsFree] = useState(note.isFree);

  return (
    <tr className="bg-brand-50/40">
      <td className="px-4 py-3" colSpan={2}>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-brand-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => setIsFree((v) => !v)}
          className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
            isFree
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {isFree ? "Free" : "Paid"}
        </button>
      </td>
      <td className="px-4 py-3" colSpan={2} />
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => onSave(note.id, title, isFree)}
            disabled={loading}
            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const NotesPanel = ({ examTypeId, subjectId, topicId }: NotesPanelProps) => {
  const {
    notes,
    notesTotal,
    notesPage,
    notesLimit,
    notesLoading,
    notesError,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  } = useAdminStore();

  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(notesTotal / notesLimit));

  // Fetch whenever the context changes
  useEffect(() => {
    fetchNotes({ examTypeId, subjectId, topicId, page: 1 });
    setShowUpload(false);
    setEditingId(null);
  }, [examTypeId, subjectId, topicId]);

  const handlePageChange = (p: number) => {
    fetchNotes({ examTypeId, subjectId, topicId, page: p });
  };

  const handleSaveEdit = async (id: string, title: string, isFree: boolean) => {
    await updateNote(id, { title, isFree });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteNote(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-brand-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Study notes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {notesTotal} note{notesTotal !== 1 ? "s" : ""} uploaded
            </p>
          </div>
        </div>
        {!showUpload && (
          <button
            onClick={() => {
              setShowUpload(true);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Upload size={14} /> Upload note
          </button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <UploadForm
          examTypeId={examTypeId}
          subjectId={subjectId}
          topicId={topicId}
          onClose={() => setShowUpload(false)}
          onSubmit={createNote}
          loading={notesLoading}
        />
      )}

      {/* Error banner */}
      {notesError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-lg text-xs font-medium">
          <AlertCircle size={13} />
          {notesError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {notesLoading && notes.length === 0 ? (
          // Skeleton
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 animate-pulse"
              >
                <div className="h-4 w-4 bg-slate-100 rounded" />
                <div className="h-3 flex-1 bg-slate-100 rounded" />
                <div className="h-3 w-12 bg-slate-100 rounded" />
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <FileText size={28} className="text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No notes yet</p>
            <p className="text-xs text-slate-300">Upload a PDF to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-2.5 text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Title
                  </span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Topic
                  </span>
                </th>
                <th className="px-4 py-2.5 text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Access
                  </span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Size
                  </span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Added
                  </span>
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {notes.map((note) =>
                editingId === note.id ? (
                  <EditRow
                    key={note.id}
                    note={note}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingId(null)}
                    loading={notesLoading}
                  />
                ) : (
                  <tr
                    key={note.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Title */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText
                          size={14}
                          className="text-brand-400 shrink-0"
                        />
                        <a
                          href={note.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-800 hover:text-brand-600 transition-colors truncate max-w-[240px]"
                        >
                          {note.title}
                        </a>
                      </div>
                    </td>

                    {/* Topic / subject */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">
                        {note.topic?.name ?? note.subject?.name ?? "—"}
                      </span>
                    </td>

                    {/* Access badge */}
                    <td className="px-4 py-3 text-center">
                      {note.isFree ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                          <Unlock size={10} /> Free
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          <Lock size={10} /> Paid
                        </span>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">
                        {formatSize(note.fileSizeMb)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">
                        {formatDate(note.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={async () => {
                            const url = await getNoteDownloadUrlApi(note.id);
                            window.open(url, "_blank");
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(note.id);
                            setShowUpload(false);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit"
                        >
                          <PencilLine size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className="text-xs text-slate-400">
              Page {notesPage} of {totalPages} · {notesTotal} notes
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(notesPage - 1)}
                disabled={notesPage === 1 || notesLoading}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => handlePageChange(notesPage + 1)}
                disabled={notesPage === totalPages || notesLoading}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPanel;
