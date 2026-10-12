// src/types/rag.types.ts
// DTOs/responses for the RAG / AI features (`/rag/*`).

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

/**
 * A single message in the chat UI's history. Distinct from `ChatResponse`,
 * which is the wire DTO for the bot's reply — `ChatMessage` also covers the
 * user's prompts and an id for React keys.
 */
export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  sources?: string[];
}
