// src/types/test.types.ts
// DTOs/responses for the test-taking API (`/test/*`).
// Mirrors the payloads returned by examock-backend/src/modules/test.

// ── Test listing & detail ─────────────────────────────────────────────────────

// Scope is derived from `subjectId`, never a stored "type" (ticket 10): a test
// is either subject-scoped or exam-wide. `scopeLabel` produces the badge text
// used by the student list and detail pages.
export type Scope = "exam" | "subject";

export interface TestItem {
  id: string;
  examTypeId: string;
  title: string;
  isFree: boolean;
  durationMins: number;
  totalMarks: number;
  subjectId: string | null;
  instructions: string | null;
  isActive: boolean;
  subject?: { name: string } | null;
  examType?: { name: string } | null;
  _count?: { questions: number };
  /** true when the current student already paid for a paid test */
  isPaid?: boolean;
}

/** `subjectId` null ⇒ whole exam, shown as the exam name ("Full JEE"). */
export function testScope(test: Pick<TestItem, "subjectId">): Scope {
  return test.subjectId ? "subject" : "exam";
}

export function scopeLabel(
  test: Pick<TestItem, "subjectId" | "subject" | "examType">,
): string {
  if (test.subject?.name) return test.subject.name;
  if (test.examType?.name) return `Full ${test.examType.name}`;
  return "Full Exam";
}

export interface TestsResponse {
  tests: TestItem[];
}

export interface TestDetail extends TestItem {
  questionCount: number;
  /** true when student can take the test (free or paid) */
  hasAccess: boolean;
}

// ── Session / start ───────────────────────────────────────────────────────────

export interface TestSession {
  attemptId: string;
  timeRemainingSec: number;
  totalQuestions: number;
  resumed: boolean;
}

// ── Question (single-fetch during test) ───────────────────────────────────────
// NOTE: correctOption/explanation are intentionally NOT included pre-submission
// (the backend omits them for in-progress sessions).

export interface TestQuestion {
  id: string;
  topicId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  marks: number;
  negMarks: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  imageUrl?: string | null; // stem figure (ticket 07)
}

export interface QuestionResponse {
  question: TestQuestion;
  questionIndex: number;
  totalQuestions: number;
  timeRemainingSec: number;
  savedAnswer: "A" | "B" | "C" | "D" | null;
}

export type OptionKey = "A" | "B" | "C" | "D";

export interface AnswerResponse {
  message: string;
  questionId: string;
  selectedOption: OptionKey | null;
}

// ── Submit / result ───────────────────────────────────────────────────────────

export interface QuestionResult {
  questionId: string;
  text?: string;
  selectedOption: OptionKey | null;
  correctOption: OptionKey;
  isCorrect: boolean;
  explanation?: string | null;
  marks: number;
  negMarks: number;
}

export interface TestSubmitResult {
  attemptId: string;
  score: number;
  totalMarks: number;
  percentile: number;
  timeTakenSec: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  questionResults: QuestionResult[];
}

export interface TestResultResponse {
  result: {
    attemptId: string;
    testTitle: string;
    score: number;
    totalMarks: number;
    percentile: number;
    timeTakenSec: number;
    completedAt: string;
    answers: {
      questionId: string;
      text: string;
      selectedOption: OptionKey | null;
      correctOption: OptionKey;
      isCorrect: boolean;
      explanation?: string | null;
      marks: number;
      negMarks: number;
    }[];
  };
}
