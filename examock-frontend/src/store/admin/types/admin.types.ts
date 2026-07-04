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
}


// MOCK TEST

export type TestType = "CHAPTER" | "MODULE" | "FULL";

export interface MockTest {
  id: string;
  examTypeId: string;
  title: string;
  type: TestType;
  isFree: boolean;
  durationMins: number;
  totalMarks: number;
  topicId: string | null;
  subjectId: string | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  examType?: { name: string };
  subject?: { name: string };
  topic?: { name: string };
  _count?: { questions: number; attempts: number };
}

export interface CreateMockTestDto {
  examTypeId: string;
  title: string;
  type: TestType;
  isFree?: boolean;
  durationMins: number;
  totalMarks: number;
  topicId?: string;
  subjectId?: string;
  instructions?: string;
}

export type UpdateMockTestDto = Partial<CreateMockTestDto> & { isActive?: boolean };

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
    topic?: { name: string };
  };
}
 
export interface MockTestDetail extends MockTest {
  questions: TestQuestionWithDetail[];
}

// NOTES

export type FileType = "PDF" | "DOC" | "DOCX" | "PPT" | "PPTX" | "IMAGE";
export interface Note {
  id: string;
  topicId?: string | null;
  subjectId?: string | null;
  examTypeId: string;
  title: string;
  fileUrl: string;
  fileType: FileType;
  fileSizeMb?: number | null;
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