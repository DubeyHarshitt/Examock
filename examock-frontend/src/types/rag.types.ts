// src/types/rag.types.ts
// DTOs/responses for the RAG / AI features (`/api/rag/*`).

// ── Ingest (student PDF upload) ───────────────────────────────────────────────

export interface IngestResponse {
  success: boolean;
  chunksStored: number;
  fileName: string;
}

// ── Chat (AI doubt-solving) ───────────────────────────────────────────────────

export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  answer: string;
  /** File names whose chunks were retrieved as context (may be empty) */
  sources: string[];
}
