// src/pages/rag/UploadPage.tsx
// RAG PDF upload. Sends a PDF to POST /rag/ingest (multipart) with progress,
// success toast, and an entry point to chat about the uploaded notes.

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  MessageCircle,
  X,
  Loader2,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { Button, EmptyState } from "../../components/ui";
import { useToast } from "../../components/ui/toast/toast-context";
import { useUploadPdf } from "../../hooks/rag/useRag";
import { cn } from "../../utils/cn";

const MAX_MB = 25;

export default function UploadPage() {
  const toast = useToast();
  const upload = useUploadPdf();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lastResult, setLastResult] = useState<{
    fileName: string;
    chunksStored: number;
  } | null>(null);

  const acceptFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setLastResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const res = await upload.mutateAsync(file);
      setLastResult({
        fileName: res.fileName,
        chunksStored: res.chunksStored,
      });
      toast.success("PDF uploaded & processed successfully!");
    } catch {
      toast.error("Upload failed. Please try again.");
    }
  };

  return (
    <AppShell section="student">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload Study Notes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add a PDF so the AI can answer questions from your material
          </p>
        </div>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          <MessageCircle className="w-4 h-4" /> Ask AI your doubts
        </Link>
      </div>

      {/* ── Dropzone ─────────────────────────────────────────── */}
      <div className="mt-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center text-center p-10 rounded-2xl border-2 border-dashed transition-colors",
            dragOver
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0] ?? undefined)}
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <UploadCloud className="w-7 h-7 text-indigo-600" />
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-900">
            {file ? file.name : "Drag & drop your PDF here"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            or click to browse from your device (max {MAX_MB} MB)
          </p>
          {file && (
            <div className="mt-4 w-full max-w-sm flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-left">
              <FileText className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setLastResult(null);
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-500"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleUpload}
              loading={upload.isPending}
              disabled={!file || upload.isPending}
              icon={<UploadCloud className="w-4 h-4" />}
            >
              {upload.isPending ? "Uploading & processing…" : "Upload PDF"}
            </Button>
          </div>
        )}

        {upload.isPending && (
          <p className="mt-3 text-xs text-gray-500 text-center flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Chunking & embedding your document…
          </p>
        )}

        {/* ── Success state ───────────────────────────────────── */}
        {lastResult && (
          <div className="mt-6">
            <EmptyState
              title={`"${lastResult.fileName}" processed successfully`}
              description={`${lastResult.chunksStored} chunks stored. You can now ask the AI questions grounded in this material.`}
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              action={
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <MessageCircle className="w-4 h-4" /> Ask about it
                </Link>
              }
            />
          </div>
        )}
      </div>

      {/* ── How it works ─────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StepCard step={1} title="Upload a PDF" desc="Your notes or study material" />
        <StepCard step={2} title="We chunk & embed" desc="Text is indexed for search" />
        <StepCard step={3} title="Ask AI anything" desc="Answers cite your sources" />
      </div>
    </AppShell>
  );
}

function StepCard({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}
