import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

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
      type: true, // CHAPTER | MODULE | FULL
      isFree: true,
      durationMins: true,
      totalMarks: true,
      topicId: true,
      subjectId: true,
      topic: { select: { name: true } },
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "asc" },
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
      type: true,
      isFree: true,
      durationMins: true,
      totalMarks: true,
      instructions: true,
      topic: { select: { name: true } },
      subject: { select: { name: true } },
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
      await abandonExpiredAttempt(existing.id);
      throw new AppError(
        "Your previous session expired. Please start a new test.",
        410,
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
    await abandonExpiredAttempt(attemptId);
    throw new AppError("Time is up — your test has been auto-submitted", 410);
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

export async function submitTest(userId, attemptId) {
  const attempt = await getActiveAttempt(userId, attemptId);

  const testQuestions = await prisma.testQuestion.findMany({
    where: { testId: attempt.mockTestId },
    orderBy: { orderIndex: "asc" },
    include: {
      question: {
        select: {
          id: true,
          correctOption: true,
          marks: true,
          negMarks: true,
          explanation: true,
        },
      },
    },
  });

  const userAnswers = attempt.answersJson ?? {};
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;

  const questionResults = testQuestions.map(({ question }) => {
    const selected = userAnswers[question.id] ?? null;

    if (!selected) {
      unattempted++;
      return {
        questionId: question.id,
        selected: null,
        isCorrect: false,
        marksAwarded: 0,
        explanation: question.explanation,
      };
    }

    if (selected === question.correctOption) {
      correct++;
      score += question.marks;
      return {
        questionId: question.id,
        selected,
        isCorrect: true,
        marksAwarded: question.marks,
        explanation: question.explanation,
      };
    } else {
      incorrect++;
      score -= question.negMarks;
      return {
        questionId: question.id,
        selected,
        isCorrect: false,
        marksAwarded: -question.negMarks,
        explanation: question.explanation,
      };
    }
  });

  const timeTakenSec = Math.floor(
    (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
  );

  const percentile = await calculatePercentile(attempt.mockTestId, score);

  await prisma.testAttempt.update({
    where: { id: attemptId },
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
    select: { type: true, topicId: true, subjectId: true, totalMarks: true },
  });

  // CHAPTER — update single topic progress
  if (test.type === "CHAPTER" && test.topicId) {
    await updateTopicProgress(userId, test.topicId, score, test.totalMarks);
  }

  // MODULE — update progress for every topic in the subject
  if (test.type === "MODULE" && test.subjectId) {
    const topics = await prisma.topic.findMany({
      where: { subjectId: test.subjectId },
      select: { id: true },
    });
    for (const topic of topics) {
      await updateTopicProgress(userId, topic.id, score, test.totalMarks);
    }
  }

  return {
    attemptId,
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

  return {
    attemptId: attempt.id,
    testTitle: attempt.mockTest.title,
    score: attempt.score,
    totalMarks: attempt.mockTest.totalMarks,
    percentile: attempt.percentile,
    timeTakenSec: attempt.timeTakenSec,
    completedAt: attempt.completedAt,
    answers: attempt.answersJson,
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

async function abandonExpiredAttempt(attemptId) {
  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { status: "ABANDONED", completedAt: new Date() },
  });
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
