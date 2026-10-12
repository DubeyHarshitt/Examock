// store/admin/admin.types.ts

// SUBJECTS TYPES
export interface Subject {
  id: string;
  name: string;
  examTypeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectDto {
  name: string;
  examTypeId: string;
  orderIndex?: number;
}

export type UpdateSubjectDto = Partial<CreateSubjectDto>;

// EXAM TYPES — re-exported from the neutral location so existing admin code
// keeps working. New code should import from "../../../types/exam.types".
export type { ExamType } from "../../../types/exam.types";

export interface CreateExamTypeDto {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateExamTypeDto {
  name?: string;
  slug?: string;
  description?: string;
}

// TOPICS
export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  orderIndex?: number;
}

export interface CreateTopicDto {
  name: string;
  subjectId: string;
  orderIndex?: number;
}

export interface UpdateTopicDto {
  name?: string;
  orderIndex?: number;
}

// Questions

export interface Questions {
  id: string;
  topicId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

export interface GetQuestionsResponse {
  questions: Questions[];
  total: number;
  page: number;
  limit: number;
}
export interface createQuestionsDto {
  topicId?: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  imageUrl?: string | null; // stem figure (ticket 07)
  imagePublicId?: string | null;
}

export interface updateQuestionDto {
    topicId: string;
  text?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: "A" | "B" | "C" | "D" | null; // null = unticked (CSV/PDF import)
  explanation?: string;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  isReusable?: boolean; // grid: reusable toggle (ticket 06)
  imageUrl?: string | null; // grid: figure slot (ticket 06)
  imagePublicId?: string | null; // Cloudinary id, so the asset can be destroyed (ticket 07)
}


// MOCK TEST

export interface MockTest {
  id: string;
  examTypeId: string;
  title: string;
  isFree: boolean;
  durationMins: number;
  totalMarks: number;
  defaultMarks: number;
  defaultNegMarks: number;
  /** Scope now lives in subjectId alone (design §3). */
  subjectId: string | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  examType?: { name: string };
  subject?: { name: string } | null;
  _count?: { questions: number; attempts: number };
}

export interface CreateMockTestDto {
  examTypeId: string;
  title: string;
  isFree?: boolean;
  durationMins: number;
  totalMarks: number;
  subjectId?: string | null;
  /** Legacy — resolved to its subject by the backend. */
  topicId?: string;
  defaultMarks?: number;
  defaultNegMarks?: number;
  instructions?: string;
}

export type UpdateMockTestDto = Partial<CreateMockTestDto> & { isActive?: boolean };

/** GET /admin/tests (ticket 05 — real server-side filters). */
export interface TestsResponse {
  tests: MockTest[];
  total: number;
  page: number;
  limit: number;
}

/** GET /admin/exams (ticket 05 — content tree, active exams only). */
export interface ExamNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  subjectCount: number;
  testCount: number;
}

export interface ExamDetailSubject {
  id: string;
  name: string;
  examTypeId: string;
  orderIndex: number;
  _count: { topics: number; mockTests: number };
}

export interface ExamDetail extends ExamNode {
  subjects: ExamDetailSubject[];
  wholeExamTestCount: number;
}

export interface TestQuestionWithDetail {
  testId: string;
  questionId: string;
  orderIndex: number;
  question: {
    id: string;
    topicId: string;
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: "A" | "B" | "C" | "D" | null;
    explanation?: string | null;
    marks?: number;
    negMarks?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    imageUrl?: string | null;
    imagePublicId?: string | null; // Cloudinary id — allows asset destroy (ticket 07)
    isReusable?: boolean;
    hadFigure?: boolean;
    topic?: { name: string };
  };
}
 
export interface MockTestDetail extends MockTest {
  questions: TestQuestionWithDetail[];
  subject?: { name: string } | null;
  examType?: { name: string };
}

// ── Paper-grid draft rows (ticket 06) ────────────────────────

/**
 * A draft row before it is persisted. "new" rows create a question (or reuse
 * a same-chapter exact-text match on save); "ref" rows link an existing bank
 * question by id. `clientId` is a local key for React lists — stripped by the
 * backend zod schemas.
 */
export interface NewDraftRow {
  kind: "new";
  clientId: string;
  chapterId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D" | null;
  explanation?: string;
  imageUrl?: string | null;
  imagePublicId?: string | null; // Cloudinary id, so the asset can be destroyed (ticket 07)
  isReusable?: boolean;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  /** PDF review flag (ticket 09): parser says a figure was probably dropped. */
  hadFigure?: boolean;
}

export interface RefDraftRow {
  kind: "ref";
  clientId: string;
  questionId: string;
}

export type DraftRow = NewDraftRow | RefDraftRow;

export interface CreateTestWithQuestionsDto extends CreateMockTestDto {
  rows?: DraftRow[];
}

/** Response of the atomic create / bulk append endpoints. */
export interface RowsSaveSummary {
  created: number;
  reused: number;
  linked: number;
}

// ── CSV import (ticket 08) ───────────────────────────────────

/** One row of the server-side CSV parse — the shared draft-row contract
 *  minus `clientId` (added when the row lands in the grid). */
export interface CsvImportRow {
  kind: "new";
  isReusable: false;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: "A" | "B" | "C" | "D" | null;
  explanation?: string;
  imageUrl?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  marks?: number;
  negMarks?: number;
  chapterId?: string;
}

/** Response of POST /tests/:id/import/csv (and the bank variant). */
export interface CsvImportResult {
  rows: CsvImportRow[];
  errors: Array<{ line: number; message: string }>;
  created?: number; // bank variant only — rows are committed immediately there
}

// ── PDF ingestion (ticket 09) ────────────────────────────────

export type PdfImportStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

/**
 * One draft row from the server-side PDF parse — the shared draft-row contract
 * plus parse diagnostics. `correctOption` is always null (never extracted) and
 * `hadFigure` defaults the grid's figure checkbox on.
 */
export interface PdfImportRow {
  kind: "new";
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: null;
  parseStatus: "OK" | "NEEDS_REVIEW";
  parseError: string | null;
  hadFigure: boolean;
  isReusable?: boolean;
}

/** A testPdfImport row — POST (202) returns it; GET /pdf-imports/:id polls it. */
export interface PdfImport {
  id: string;
  testId: string;
  fileName: string;
  filePath: string;
  status: PdfImportStatus;
  error: string | null;
  rowCount: number;
  parsedAt: string | null;
  createdAt: string;
  rows: PdfImportRow[];
}

// NOTES

export type FileType = "PDF" | "DOC" | "DOCX" | "PPT" | "PPTX" | "IMAGE";
export type EmbeddingStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface Note {
  id: string;
  topicId?: string | null;
  subjectId?: string | null;
  examTypeId: string;
  title: string;
  filePath: string;
  fileName: string;
  fileType: FileType;
  fileSizeMb?: number | null;  
  embeddingStatus: EmbeddingStatus;
  embeddingError?: string | null;
  isFree: boolean;
  isActive: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  // Prisma include fields (from getNotes → findMany with include)
  topic?:    { name: string } | null;
  subject?:  { name: string } | null;
  examType?: { name: string };
  uploader?: { name: string; email: string };
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreateNoteDto {
  examTypeId: string;
  topicId?: string;
  subjectId?: string;
  title: string;
  file: File;          // multipart – converted to FormData in the slice
  isFree: boolean;
}

export interface UpdateNoteDto {
  title?: string;
  isFree?: boolean;
  isActive?: boolean;
  topicId?: string;
  subjectId?: string;
}

// ─── Response shapes ─────────────────────────────────────────────────────────
export interface GetNotesResponse {
  notes: Note[];
  total: number;
  page: number;
  limit: number;
}

export interface GetNotesFilters {
  examTypeId?: string;
  topicId?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
}