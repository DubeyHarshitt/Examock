// components/admin/QuestionImageSlot.tsx
import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Trash2, Upload, X } from "lucide-react";
import { destroyQuestionImageApi, uploadQuestionImageApi } from "../../api/admin.api";
import { cn } from "../../utils/cn";

export interface QuestionImageValue {
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

interface QuestionImageSlotProps {
  /** Current attachment on the row/question being edited. */
  current?: QuestionImageValue | null;
  /** Called with the new attachment (upload or pasted URL) or null when removed. */
  onChange: (value: { imageUrl: string; imagePublicId?: string | null } | null) => void;
  compact?: boolean;
}

/**
 * Ticket 07 — upload / paste / remove a question-stem image in one slot.
 * Uploads go straight to Cloudinary and return `imagePublicId`, which is what
 * lets "remove" and "replace" destroy the previous asset instead of orphaning
 * it. A pasted URL carries no public id, so it can never be destroyed — that
 * is an accepted limitation of hand-pasted links.
 */
export default function QuestionImageSlot({ current, onChange, compact }: QuestionImageSlotProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = current?.imageUrl || null;
  const publicId = current?.imagePublicId || null;

  /** Best-effort: destroy the asset the slot previously held (replace/remove). */
  const destroyPrevious = async () => {
    if (!publicId) return;
    try {
      await destroyQuestionImageApi(publicId);
    } catch {
      // The slot still moves on — the old file just lingers on Cloudinary.
      setError("Note: the previous image could not be deleted from Cloudinary.");
    }
  };

  /** Pull the backend message out of an axios-shaped error, if there is one. */
  const apiError = (err: unknown): string | null =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await destroyPrevious();
      const img = await uploadQuestionImageApi(file);
      onChange(img);
    } catch (err: unknown) {
      setError(apiError(err) ?? "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const attachUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setBusy(true);
    try {
      await destroyPrevious();
      onChange({ imageUrl: trimmed });
      setUrl("");
      setUrlOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy(true);
    try {
      await destroyPrevious();
      onChange(null);
    } catch (err: unknown) {
      setError(apiError(err) ?? "Could not remove the image.");
    } finally {
      setBusy(false);
    }
  };

  const base = compact
    ? "rounded-lg border border-dashed border-slate-200 bg-white px-2 text-xs"
    : "rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3";

  return (
    <div className={cn(base, "w-full")}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />

      {imageUrl ? (
        <div className={cn("flex items-center gap-2", compact ? "h-[38px]" : "")}>
          <img src={imageUrl} alt="Figure" className={cn("rounded object-cover", compact ? "h-8 w-8" : "h-14 w-14")} />
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-semibold text-slate-700", compact ? "text-[11px]" : "text-xs")}>
              Figure attached
            </p>
            <p className="truncate font-mono text-[10px] text-slate-400">{imageUrl}</p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            title="Replace image"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Replace
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-50"
            title="Remove image (deletes it from Cloudinary)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ) : (
        <div className={cn("flex items-center gap-2", compact ? "h-[38px]" : "")}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[11px] font-bold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            Upload
          </button>
          <button
            type="button"
            onClick={() => setUrlOpen((v) => !v)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
          >
            <Link2 size={13} />
            Paste URL
          </button>
          {urlOpen && (
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…/figure.png"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={attachUrl}
                disabled={busy || !url.trim()}
                className="rounded-lg bg-brand-600 px-2 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                Attach
              </button>
              <button
                type="button"
                onClick={() => setUrlOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-[10px] font-medium text-amber-600">{error}</p>}
    </div>
  );
}