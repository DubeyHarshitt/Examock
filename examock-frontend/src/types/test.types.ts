// src/types/test.types.ts
// DTOs/responses for the test-taking API (`/api/test/*`).
// Mirrors the payloads returned by examock-backend/src/modules/test.

// ── Test listing & detail ─────────────────────────────────────────────────────

export type TestType = "CHAPTER" | "MODULE" | "FULL";

export interface TestItem {
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
  topic?: { name: string } | null;
  subject?: { name: string } | null;
  _count?: { questions: number };
  /** true when the current student already paid for a paid test */
  isPaid?: boolean;
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
