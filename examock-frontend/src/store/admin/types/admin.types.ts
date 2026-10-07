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

// EXAM TYPES
export interface ExamType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

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
}

export interface updateQuestionDto {
    topicId: string;
  text?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: "A" | "B" | "C" | "D";
  explanation?: string;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  isReusable?: boolean; // grid: reusable toggle (ticket 06)
  imageUrl?: string; // grid: figure slot (ticket 06)
}


// MOCK TEST

export type TestType = "CHAPTER" | "MODULE" | "FULL"; // legacy — taxonomy removed in ticket 02

export interface MockTest {
  id: string;
  examTypeId: string;
  title: string;
  /** Legacy — no longer returned by the API (ticket 02). Kept until ticket 06 retires the old dashboard. */
  type?: TestType;
  isFree: boolean;
  durationMins: number;
  totalMarks: number;
  defaultMarks: number;
  defaultNegMarks: number;
  /** Legacy — no longer returned by the API. Scope now lives in subjectId alone. */
  topicId?: string | null;
  subjectId: string | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  examType?: { name: string };
  subject?: { name: string } | null;
  topic?: { name: string } | null;
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
  /** Legacy — stripped by the backend schemas (ticket 03). Old dashboard only. */
  type?: TestType;
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
    correctOption: "A" | "B" | "C" | "D";
    explanation?: string | null;
    marks?: number;
    negMarks?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    imageUrl?: string | null;
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
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
  imageUrl?: string | null;
  isReusable?: boolean;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
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