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
// One scored-result shape for the whole app. `POST /test/:id/submit` and
// `GET /test/:id/result` return the same per-question payload (see
// test.service.js `buildScoredResult`), so the result page never branches on
// how it arrived.

export interface QuestionResult {
  questionId: string;
  /** selected option, or null when the question was left unattempted */
  selected: OptionKey | null;
  /** the correct option, shown in the post-test review */
  correctOption: OptionKey | null;
  /** option text by key, shown in the post-test review */
  options: Record<OptionKey, string>;
  isCorrect: boolean;
  /** marks added (or deducted) for this question */
  marksAwarded: number;
  explanation?: string | null;
  text?: string;
  imageUrl?: string | null;
}

/** Payload returned by submit and by the timeout auto-submit. */
export interface TestScoredResult {
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

/** Back-compat alias — submit uses the same shape. */
export type TestSubmitResult = TestScoredResult;

export interface TestResultResponse {
  /** Same scored payload, plus test metadata unique to the fetch path. */
  result: TestScoredResult & {
    testTitle: string;
    completedAt: string;
  };
}
