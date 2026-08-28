// src/hooks/rag/useRag.ts
// React Query hooks for the RAG / AI features (`/api/rag/*`).

import { useMutation } from "@tanstack/react-query";
import * as ragApi from "../../api/rag.api";
import type { ChatResponse, IngestResponse } from "../../types/rag.types";

/** Upload a PDF note for ingestion into the vector store. */
export function useUploadPdf() {
  return useMutation<IngestResponse, Error, File>({
    mutationFn: (file) => ragApi.uploadPdf(file),
  });
}

/** Ask the AI a doubt question (returns answer + source file names). */
export function useAskQuestion() {
  return useMutation<ChatResponse, Error, string>({
    mutationFn: (question) => ragApi.askQuestion(question),
  });
}
