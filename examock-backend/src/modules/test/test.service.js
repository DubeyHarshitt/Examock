import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { contributingChapters } from "../admin/lib/progress.js";
import {
  fetchTestQuestions,
  gradeAttempt,
  toStudentQuestionResults,
} from "./lib/scoring.js";

// ─────────────────────────────────────────────────────────────
// 1. List tests for user's exam type
// ─────────────────────────────────────────────────────────────

export async function getTests(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      examTypeId: true,
    },
  });

  if (!user?.examTypeId) throw new AppError("Exam type not set", 403);

  const test = await prisma.mockTest.findMany({
    where: { examTypeId: user.examTypeId, isActive: true },
    select: {
      id: true,
      title: true,
      isFree: true,
      durationMins: true,
      totalMarks: true,
      subjectId: true,
      subject: { select: { name: true } },
      examType: { select: { name: true } }, // "Full JEE" scope badge (ticket 10)
      _count: { select: { questions: true } },
    },
    // Newest first — a test list ordered by ascending creation date buries
    // everything the admin just published (ticket 10).
    orderBy: { createdAt: "desc" },
  });

  // Fetch all paid test IDs for this user in one query
  const payments = await prisma.payment.findMany({
    where: { userId, status: "PAID" },
    select: { mockTestId: true },
  });

  const paidTestIds = new Set(payments.map((p) => p.mockTestId));

  // Map through tests and add isPaid property
  const testsWithPaymentInfo = test.map((t) => ({
    ...t,
    isPaid: !t.isFree && paidTestIds.has(t.id),
  }));
  
  return testsWithPaymentInfo;
}

// ─────────────────────────────────────────────────────────────
// 2. Get single test details
// ─────────────────────────────────────────────────────────────

export async function getTestById(userId, testId) {
  const test = await prisma.mockTest.findFirst({
    where: { id: testId, isActive: true },
    select: {
      id: true,
      title: true,
      isFree: true,
      durationMins: true,
      totalMarks: true,
      instructions: true,
      subjectId: true, // scope is derived from this (ticket 10)
      subject: { select: { name: true } },
      examType: { select: { name: true } }, // "Full JEE" scope label
      _count: { select: { questions: true } },
    },
  });

  if (!test) throw new AppError("Test not found", 404);

  const hasAccess = test.isFree || (await checkPayment(userId, testId));

  return { ...test, questionCount: test._count.questions, hasAccess };
}

// ─────────────────────────────────────────────────────────────
// 3. Start test — create attempt or resume existing
// ─────────────────────────────────────────────────────────────

export async function startTest(userId, testId) {
  const test = await prisma.mockTest.findFirst({
    where: { id: testId, isActive: true },
    select: {
      id: true,
      isFree: true,
      durationMins: true,
      _count: { select: { questions: true } },
    },
  });

  if (!test) throw new AppError("Test not found", 404);

  const hasAccess = test.isFree || (await checkPayment(userId, testId));
  if (!hasAccess)
    throw new AppError("Please purchase this test to continue", 403);

  // Check for existing in-progress attempt
  const existing = await prisma.testAttempt.findFirst({
    where: { userId, mockTestId: testId, status: "IN_PROGRESS" },
  });

  if (existing) {
    const elapsed = Math.floor(
      (Date.now() - new Date(existing.startedAt).getTime()) / 1000,
    );
    const remaining = test.durationMins * 60 - elapsed;

    if (remaining <= 0) {
      // Score the expired attempt instead of discarding it (F6), then tell the
      // client where the (now available) result lives.
      const result = await finalizeExpiredAttempt(existing);
      throw new AppError(
        "Your previous session expired. Please start a new test.",
        410,
        { attemptId: result.attemptId },
      );
    }
    return {
      attemptId: existing.id,
      timeRemainingSec: remaining,
      totalQuestions: test._count.questions,
      resumed: true,
    };
  }

  const attempt = await prisma.testAttempt.create({
    data: {
      userId,
      mockTestId: testId,
      status: "IN_PROGRESS",
      answersJson: {},
    },
  });
  return {
    attemptId: attempt.id,
    timeRemainingSec: test.durationMins * 60,
    totalQuestions: test._count.questions,
    resumed: false,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. Get a single question by index
// ─────────────────────────────────────────────────────────────

export async function getQuestion(userId, attemptId, questionIndex) {
  const attempt = await getActiveAttempt(userId, attemptId);

  const test = await prisma.mockTest.findUnique({
    where: { id: attempt.mockTestId },
    select: { durationMins: true, _count: { select: { questions: true } } },
  });

  const total = test._count.questions;

  if (questionIndex < 0 || questionIndex >= total) {
    throw new AppError(
      `Question index must be between 0 and ${total - 1}`,
      400,
    );
  }

  const elapsed = Math.floor(
    (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
  );
  const remaining = test.durationMins * 60 - elapsed;

  if (remaining <= 0) {
    // Time's up: auto-submit (score) the attempt rather than abandoning it, so
    // the student's answers become a real, fetchable result (F6) instead of
    // being thrown away unscored.
    await finalizeExpiredAttempt(attempt);
    throw new AppError("Time is up — your test has been auto-submitted", 410, {
      attemptId: attempt.id,
    });
  }

  // correctOption and explanation NOT exposed here — only after submission
  const testQuestion = await prisma.testQuestion.findFirst({
    where: { testId: attempt.mockTestId },
    orderBy: { orderIndex: "asc" },
    skip: questionIndex,
    include: {
      question: {
        select: {
          id: true,
          text: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          marks: true,
          negMarks: true,
          difficulty: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!testQuestion) throw new AppError("Question not found", 404);

  const answers = attempt.answersJson ?? {};
  const savedAnswer = answers[testQuestion.question.id] ?? null;

  return {
    question: testQuestion.question,
    questionIndex,
    totalQuestions: total,
    timeRemainingSec: remaining,
    savedAnswer,
  };
}

// ─────────────────────────────────────────────────────────────
// 5. Save answer (called on every option select)
// ─────────────────────────────────────────────────────────────

export async function saveAnswer(
  userId,
  attemptId,
  questionId,
  selectedOption,
) {
  const attempt = await getActiveAttempt(userId, attemptId);

  // Answering after the clock has run out must not silently extend the test:
  // finalize (auto-submit) and reject, exactly like getQuestion does.
  const meta = await prisma.mockTest.findUnique({
    where: { id: attempt.mockTestId },
    select: { durationMins: true },
  });
  const elapsed = Math.floor(
    (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
  );
  if ((meta?.durationMins ?? 0) * 60 - elapsed <= 0) {
    await finalizeExpiredAttempt(attempt);
    throw new AppError("Time is up — your test has been auto-submitted", 410, {
      attemptId: attempt.id,
    });
  }

  if (!["A", "B", "C", "D", null].includes(selectedOption)) {
    throw new AppError(
      "Invalid option — must be A, B, C, D or null to clear",
      400,
    );
  }

  const answers = attempt.answersJson ?? {};

  if (selectedOption === null) {
    delete answers[questionId];
  } else {
    answers[questionId] = selectedOption;
  }

  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { answersJson: answers },
  });

  return { message: "Answer saved", questionId, selectedOption };
}

// ─────────────────────────────────────────────────────────────
// 6. Submit test — score + save result
// ─────────────────────────────────────────────────────────────

// Grading lives in ./lib/scoring.js so the admin attempt-breakdown view grades
// with the exact same rules. This adapter shape trims the rich rows down to the
// student-facing review payload (which hides the correct answer).
function buildScoredResult(testQuestions, userAnswers) {
  const { rows, score, correct, incorrect, unattempted } = gradeAttempt(
    testQuestions,
    userAnswers,
  );

  return {
    questionResults: toStudentQuestionResults(rows),
    score,
    correct,
    incorrect,
    unattempted,
  };
}

// Score an attempt, persist it as COMPLETED, then fan the score out to the
// chapters that actually contributed questions (ticket 04 / decision Q3).
// Used by BOTH the manual submit path and the timeout path, so a timed-out
// attempt is auto-submitted with exactly the same scoring as a normal submit
// instead of being discarded as ABANDONED (F6).
async function finalizeAttempt(attempt, testQuestions) {
  const userAnswers = attempt.answersJson ?? {};
  const { questionResults, score, correct, incorrect, unattempted } =
    buildScoredResult(testQuestions, userAnswers);

  const timeTakenSec = Math.floor(
    (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
  );

  const percentile = await calculatePercentile(attempt.mockTestId, score);

  await prisma.testAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "COMPLETED",
      score,
      percentile,
      timeTakenSec,
      answersJson: userAnswers,
      completedAt: new Date(),
    },
  });

  const test = await prisma.mockTest.findUnique({
    where: { id: attempt.mockTestId },
    select: { totalMarks: true },
  });

  // Fan out in parallel — one round-trip instead of a sequential for/await.
  await Promise.all(
    contributingChapters(testQuestions.map((tq) => tq.question)).map(
      (chapterId) =>
        updateTopicProgress(attempt.userId, chapterId, score, test.totalMarks),
    ),
  );

  return {
    attemptId: attempt.id,
    score,
    totalMarks: test.totalMarks,
    percentile,
    timeTakenSec,
    correct,
    incorrect,
    unattempted,
    questionResults,
  };
}

// Called when the clock has run out but the attempt is still IN_PROGRESS
// (browser closed, network dropped, or the client never sent /submit). Scores
// it like a normal submit so the result + progress are recoverable.
async function finalizeExpiredAttempt(attempt) {
  const testQuestions = await fetchTestQuestions(attempt.mockTestId);
  return finalizeAttempt(attempt, testQuestions);
}

export async function submitTest(userId, attemptId) {
  const attempt = await getActiveAttempt(userId, attemptId);
  const testQuestions = await fetchTestQuestions(attempt.mockTestId);
  return finalizeAttempt(attempt, testQuestions);
}

// ─────────────────────────────────────────────────────────────
// 7. Get result (after submission)
// ─────────────────────────────────────────────────────────────

export async function getResult(userId, attemptId) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId, status: "COMPLETED" },
    include: {
      mockTest: {
        select: { title: true, totalMarks: true, durationMins: true },
      },
    },
  });

  if (!attempt) throw new AppError("Result not found", 404);

  // Rebuild the same per-question payload the submit path returns, so a
  // refetched result (page refresh, shared link, timeout) renders identically
  // to a fresh submit (F11).
  const testQuestions = await fetchTestQuestions(attempt.mockTestId);
  const { questionResults, correct, incorrect, unattempted } =
    buildScoredResult(testQuestions, attempt.answersJson ?? {});

  return {
    attemptId: attempt.id,
    testTitle: attempt.mockTest.title,
    score: attempt.score,
    totalMarks: attempt.mockTest.totalMarks,
    percentile: attempt.percentile,
    timeTakenSec: attempt.timeTakenSec,
    completedAt: attempt.completedAt,
    correct,
    incorrect,
    unattempted,
    questionResults,
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function checkPayment(userId, testId) {
  const payment = await prisma.payment.findFirst({
    where: { userId, mockTestId: testId, status: "PAID" },
  });
  return !!payment;
}

async function getActiveAttempt(userId, attemptId) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
  });
  if (!attempt) throw new AppError("No active session found", 404);
  return attempt;
}

async function calculatePercentile(testId, score) {
  const [below, total] = await Promise.all([
    prisma.testAttempt.count({
      where: { mockTestId: testId, status: "COMPLETED", score: { lt: score } },
    }),
    prisma.testAttempt.count({
      where: { mockTestId: testId, status: "COMPLETED" },
    }),
  ]);
  if (total === 0) return 100;
  return Math.round((below / total) * 100);
}

async function updateTopicProgress(userId, topicId, score, totalMarks) {
  const scorePercent = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

  const existing = await prisma.userTopicProgress.findUnique({
    where: { userId_topicId: { userId, topicId } },
  });

  await prisma.userTopicProgress.upsert({
    where: { userId_topicId: { userId, topicId } },
    create: {
      userId,
      topicId,
      attemptCount: 1,
      bestScore: scorePercent,
      lastActivity: new Date(),
    },
    update: {
      attemptCount: { increment: 1 },
      lastActivity: new Date(),
      // Only improve bestScore — never lower it
      bestScore:
        existing?.bestScore == null || scorePercent > existing.bestScore
          ? scorePercent
          : existing.bestScore,
    },
  });
}
