// src/pages/admin/tests/PdfImportModal.tsx
// Ticket 09: upload a question paper, watch the worker parse it, then drop the
// draft rows into the paper grid. Mirrors the CSV-import modal — nothing is
// persisted here; the grid's Save commits (and the same-chapter duplicate-reuse
// rules apply). Correct answers are never extracted; flagged rows default the
// grid's figure checkbox on.

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  FileText,
  ImageOff,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { importPdfApi, getPdfImportApi } from "../../../api/admin.api";
import type { PdfImport } from "../../../store/admin/types/admin.types";
import { cn } from "../../../utils/cn";

interface PdfImportModalProps {
  testId: string;
  onAdd: (importRow: PdfImport) => void;
  onClose: () => void;
}

const POLL_MS = 2000;

export default function PdfImportModal({ testId, onAdd, onClose }: PdfImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imp, setImp] = useState<PdfImport | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const polling = imp != null && (imp.status === "PENDING" || imp.status === "PROCESSING");

  // Poll while the worker is parsing. Keyed on id+status so a new poll cycle
  // starts only when the status actually moves, not on every row mutation.
  useEffect(() => {
    if (!imp || (imp.status !== "PENDING" && imp.status !== "PROCESSING")) return;
    const timer = setInterval(async () => {
      try {
        setImp(await getPdfImportApi(imp.id));
      } catch {
        // Transient poll failure: keep the last known state and try again.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [imp?.id, imp?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = async (file: File) => {
    setError(null);
    setImp(null);
    if (!/\.pdf$/i.test(file.name)) {
      setError("Please choose a .pdf file.");
      return;
    }
    setUploading(true);
    try {
      setImp(await importPdfApi(testId, file));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Could not upload the PDF.");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setImp(null);
    setError(null);
  };

  const rows = imp?.rows ?? [];
  const reviewCount = rows.filter((r) => r.parseStatus === "NEEDS_REVIEW").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Import question paper (PDF)</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // allow re-selecting the same file
              if (file) void handleFile(file);
            }}
          />

          {!imp ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={20} className="animate-spin text-brand-600" />
              ) : (
                <Upload size={20} className="text-slate-400" />
              )}
              <span className="text-xs font-bold text-slate-700">
                {uploading ? "Uploading…" : "Choose a .pdf question paper"}
              </span>
              <span className="text-[11px] text-slate-400">
                Up to 25 MB. Text is extracted and split into draft rows for review — scans
                without selectable text are rejected.
              </span>
            </button>
          ) : polling ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center">
              <Loader2 size={20} className="animate-spin text-brand-600" />
              <span className="text-xs font-bold text-slate-700">Parsing “{imp.fileName}”…</span>
              <span className="text-[11px] text-slate-400">
                The worker is extracting questions. This page keeps polling.
              </span>
            </div>
          ) : imp.status === "FAILED" ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3.5">
              <p className="flex items-center gap-2 text-xs font-bold text-red-700">
                <AlertTriangle size={14} /> Import failed
              </p>
              <p className="mt-1 text-[11px] font-medium text-red-600">
                {imp.error ?? "The PDF could not be parsed."}
              </p>
              <button
                onClick={reset}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                <RefreshCw size={12} /> Try another file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Check size={13} className="text-emerald-600" />
                  {rows.length} row{rows.length === 1 ? "" : "s"} parsed
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    reviewCount > 0 ? "text-amber-600" : "text-emerald-600"
                  )}
                >
                  {reviewCount} need review
                </span>
              </div>

              {/* Ticket 09 §verify: figures are never extracted, and the admin
                  must know that before trusting the parse. */}
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-amber-800">
                <ImageOff size={14} className="mt-0.5 shrink-0" />
                Figures could not be extracted — any diagram is missing. Rows the parser
                suspects had one arrive flagged; re-add the image in the grid.
              </p>

              {reviewCount > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50/60 p-2.5">
                  {rows
                    .map((r, i) => ({ r, i }))
                    .filter(({ r }) => r.parseStatus === "NEEDS_REVIEW")
                    .map(({ r, i }) => (
                      <li key={i} className="text-[11px] font-medium text-amber-700">
                        <span className="font-bold">Row {i + 1}:</span>{" "}
                        {r.parseError ?? "needs review"}
                      </li>
                    ))}
                </ul>
              )}

              <p className="text-[11px] leading-relaxed text-slate-500">
                Answers are never guessed — every row arrives unticked (—). Pick a chapter per
                row in the grid, resolve the flags, then Save. Activate blocks until every row
                is ticked and the marks reconcile.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          {imp?.status === "READY" && rows.length > 0 && (
            <button
              onClick={() => onAdd(imp)}
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
            >
              Add {rows.length} row{rows.length === 1 ? "" : "s"} to grid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
