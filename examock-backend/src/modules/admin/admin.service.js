import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { boss, QUEUE } from "../../config/queue.js";
import cloudinary from "../../config/cloudinary.js";
import { ingestFile } from "../rag/pipelines/ingestion.pipeline.js";
import { reconcileMarks } from "./lib/marks.js";
import { deriveScope, SCOPE } from "./lib/scope.js";
import fs from "fs";

// ── Exam Types ───────────────────────────────────────────────

export const getAllExamTypes = async () => {
  return prisma.examType.findMany({ orderBy: { createdAt: "asc" } });
};

export const createExamType = async ({ name, slug, description }) => {
  if (!name || !slug) throw new AppError("name and slug are required", 400);
  return prisma.examType.create({ data: { name, slug, description } });
};

export const updateExamType = async (
  id,
  { name, slug, description, isActive },
) => {
  return prisma.examType.update({
    where: { id },
    data: { name, slug, description, isActive },
  });
};

export const deleteExamType = async (id) => {
  // Soft delete
  return prisma.examType.update({
    where: { id },
    data: { isActive: false },
  });
};

// ── Subjects ─────────────────────────────────────────────────

export const getSubjects = async (examTypeId) => {
  return prisma.subject.findMany({
    where: { ...(examTypeId ? { examTypeId } : {}), isActive: true },
    include: { examType: { select: { name: true } } },
    orderBy: { orderIndex: "asc" },
  });
};

export const createSubject = async ({ examTypeId, name, orderIndex = 0 }) => {
  if (!examTypeId || !name)
    throw new AppError("examTypeId and name are required", 400);
  return prisma.subject.create({ data: { examTypeId, name, orderIndex } });
};

export const updateSubject = async (id, data) => {
  return prisma.subject.update({ where: { id }, data });
};

export const deleteSubject = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: { _count: { select: { topics: true, mockTests: true, notes: true } } },
  });
  if (!subject) throw new AppError("Subject not found", 404);

  const { topics, mockTests, notes } = subject._count;
  if (topics || mockTests || notes) {
    // Hard delete is refused: `mock_tests.subject_id` is ON DELETE SET NULL,
    // so deleting here would silently promote subject tests to full-exam
    // tests on live data (design §1.5/§8.4). Soft-delete instead via
    // PATCH /subjects/:id { isActive: false }.
    throw new AppError(
      `Cannot delete "${subject.name}" — it has ${topics} chapters, ${mockTests} tests, ${notes} notes. ` +
        `Deactivate it instead (PATCH isActive: false).`,
      409,
    );
  }
  return prisma.subject.delete({ where: { id } });
};

// ── Topics ───────────────────────────────────────────────────

export const getTopics = async (subjectId) => {
  return prisma.topic.findMany({
    where: { ...(subjectId ? { subjectId } : {}), isActive: true },
    include: { subject: { select: { name: true } } },
    orderBy: { orderIndex: "asc" },
  });
};

export const createTopic = async ({ subjectId, name, orderIndex = 0 }) => {
  if (!subjectId || !name)
    throw new AppError("subjectId and name are required", 400);
  return prisma.topic.create({ data: { subjectId, name, orderIndex } });
};

export const updateTopic = async (id, data) => {
  return prisma.topic.update({ where: { id }, data });
};

export const deleteTopic = async (id) => {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { _count: { select: { questions: true, notes: true, videos: true } } },
  });
  if (!topic) throw new AppError("Topic not found", 404);

  const { questions, notes, videos } = topic._count;
  if (questions || notes || videos) {
    throw new AppError(
      `Cannot delete "${topic.name}" — it has ${questions} questions, ${notes} notes, ${videos} videos. ` +
        `Deactivate it instead (PATCH isActive: false).`,
      409,
    );
  }
  return prisma.topic.delete({ where: { id } });
};

// ── Videos ───────────────────────────────────────────────────

export const getVideos = async (topicId) => {
  return prisma.video.findMany({
    where: topicId ? { topicId } : {},
    include: { topic: { select: { name: true } } },
    orderBy: { orderIndex: "asc" },
  });
};

export const createVideo = async ({
  topicId,
  youtubeId,
  title,
  durationSec,
  orderIndex = 0,
}) => {
  if (!topicId || !youtubeId || !title) {
    throw new AppError("topicId, youtubeId, and title are required", 400);
  }
  return prisma.video.create({
    data: { topicId, youtubeId, title, durationSec, orderIndex },
  });
};

export const updateVideo = async (id, data) => {
  return prisma.video.update({ where: { id }, data });
};

export const deleteVideo = async (id) => {
  // Soft delete
  return prisma.video.update({ where: { id }, data: { isActive: false } });
};

// ── YT Channels ──────────────────────────────────────────────

export const getYtChannels = async (examTypeId) => {
  return prisma.ytChannel.findMany({
    where: examTypeId ? { examTypeId } : {},
    orderBy: { createdAt: "asc" },
  });
};

export const createYtChannel = async ({
  examTypeId,
  channelId,
  channelName,
  logoUrl,
}) => {
  if (!examTypeId || !channelId || !channelName) {
    throw new AppError(
      "examTypeId, channelId, and channelName are required",
      400,
    );
  }
  return prisma.ytChannel.create({
    data: { examTypeId, channelId, channelName, logoUrl },
  });
};

export const updateYtChannel = async (id, data) => {
  return prisma.ytChannel.update({ where: { id }, data });
};

export const deleteYtChannel = async (id) => {
  return prisma.ytChannel.update({ where: { id }, data: { isActive: false } });
};

// ── Questions ────────────────────────────────────────────────

export const getQuestions = async ({ topicId, page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where: topicId ? { topicId } : {},
      include: { topic: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.question.count({ where: topicId ? { topicId } : {} }),
  ]);

  return { questions, total, page: Number(page), limit: Number(limit) };
};

export const createQuestion = async (data) => {
  const {
    topicId,
    subjectId,
    text,
    optionA,
    optionB,
    optionC,
    optionD,
    correctOption,
    explanation,
    marks,
    negMarks,
    difficulty,
  } = data;

  if (
    !topicId ||
    !text ||
    !optionA ||
    !optionB ||
    !optionC ||
    !optionD ||
    !correctOption
  ) {
    throw new AppError("All question fields are required", 400);
  }

  if (!["A", "B", "C", "D"].includes(correctOption)) {
    throw new AppError("correctOption must be A, B, C, or D", 400);
  }

  return prisma.question.create({
    data: {
      topicId,
      text,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      marks,
      negMarks,
      difficulty,
    },
  });
};

// FIX: Make the bulk upload for csv format
export const bulkCreateQuestions = async (questions) => {
  // questions = array of question objects
  if (!Array.isArray(questions) || !questions.length) {
    throw new AppError("questions must be a non-empty array", 400);
  }

  // Validate each
  for (const q of questions) {
    if (
      !q.topicId ||
      !q.text ||
      !q.optionA ||
      !q.optionB ||
      !q.optionC ||
      !q.optionD ||
      !q.correctOption
    ) {
      throw new AppError("Each question must have all required fields", 400);
    }
    if (!["A", "B", "C", "D"].includes(q.correctOption)) {
      throw new AppError(`Invalid correctOption: ${q.correctOption}`, 400);
    }
  }

  return prisma.question.createMany({ data: questions, skipDuplicates: true });
};

export const updateQuestion = async (id, data) => {
  return prisma.question.update({ where: { id }, data });
};

export const deleteQuestion = async (id) => {
  return prisma.question.delete({ where: { id } });
};

// ── Mock Tests ───────────────────────────────────────────────

const TEST_SORTS = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  title: { title: "asc" },
  updated: { updatedAt: "desc" },
};

const asBool = (value) =>
  value === true || value === "true" ? true : value === false || value === "false" ? false : null;

/**
 * List tests with real server-side filters (design §5.2):
 *   ?examTypeId= &subjectId= &scope=exam|subject &isFree= &isActive=
 *   &q= &sort=newest|oldest|title|updated &page= &limit=
 * `scope=exam` means subjectId: null; `scope=subject` means subjectId not null.
 * `subject { name }` and `examType { name }` are always returned so the UI
 * can label scope (scope is derived, never stored).
 */
export const getMockTests = async ({
  examTypeId,
  subjectId,
  scope,
  isFree,
  isActive,
  q,
  sort,
  page = 1,
  limit = 20,
} = {}) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const where = {};
  if (examTypeId) where.examTypeId = examTypeId;
  if (subjectId) where.subjectId = subjectId;
  if (scope === "exam") where.subjectId = null;
  else if (scope === "subject") where.subjectId = { not: null };

  const free = asBool(isFree);
  if (free !== null) where.isFree = free;
  const active = asBool(isActive);
  if (active !== null) where.isActive = active;
  if (q) where.title = { contains: q, mode: "insensitive" };

  const orderBy = TEST_SORTS[sort] ?? TEST_SORTS.newest;
  const skip = (pageNum - 1) * limitNum;

  const [tests, total] = await Promise.all([
    prisma.mockTest.findMany({
      where,
      include: {
        examType: { select: { name: true } },
        subject: { select: { name: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy,
      skip,
      take: limitNum,
    }),
    prisma.mockTest.count({ where }),
  ]);

  return { tests, total, page: pageNum, limit: limitNum };
};

export const getMockTestDetail = async (id) => {
  const test = await prisma.mockTest.findUnique({
    where: { id },
    include: {
      examType: { select: { name: true } },
      subject: { select: { name: true } },
      questions: {
        include: { question: { include: { topic: { select: { name: true } } } } },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!test) throw new AppError("Mock test not found", 404);
  return test;
};

export const createMockTest = async (data) => {
  const {
    examTypeId,
    title,
    isFree,
    durationMins,
    totalMarks,
    subjectId,
    topicId, // legacy input from the old CHAPTER form — resolved, not stored
    defaultMarks,
    defaultNegMarks,
    instructions,
  } = data;

  if (!examTypeId || !title || !durationMins || !totalMarks) {
    throw new AppError(
      "examTypeId, title, durationMins, totalMarks are required",
      400,
    );
  }

  // The old form sent topicId for CHAPTER tests; scope now lives in
  // subjectId alone, so resolve the topic's subject rather than lose scope.
  // `|| null` because the legacy form sends "" for "no subject".
  let resolvedSubjectId = subjectId || null;
  if (!resolvedSubjectId && topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { subjectId: true },
    });
    resolvedSubjectId = topic?.subjectId ?? null;
  }
  if (resolvedSubjectId) {
    await assertSubjectBelongsToExam(resolvedSubjectId, examTypeId);
  }

  return prisma.mockTest.create({
    data: {
      examTypeId,
      subjectId: resolvedSubjectId,
      title,
      isFree: isFree ?? true,
      durationMins: Number(durationMins),
      totalMarks: Number(totalMarks),
      ...(defaultMarks !== undefined ? { defaultMarks: Number(defaultMarks) } : {}),
      ...(defaultNegMarks !== undefined ? { defaultNegMarks: Number(defaultNegMarks) } : {}),
      instructions,
      // isActive stays at its schema default: false (design §4.1) —
      // nothing reaches students until POST /mock-tests/:id/activate.
    },
  });
};

const MOCK_TEST_EDITABLE = [
  "title",
  "isFree",
  "durationMins",
  "totalMarks",
  "defaultMarks",
  "defaultNegMarks",
  "instructions",
  "subjectId",
  "isActive",
];

/** "Physics" under JEE must mean the Physics that belongs to JEE (ticket 03 §1). */
const assertSubjectBelongsToExam = async (subjectId, examTypeId) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { name: true, examTypeId: true },
  });
  if (!subject) throw new AppError("subjectId: subject not found", 400);
  if (subject.examTypeId !== examTypeId) {
    throw new AppError(
      `subjectId: "${subject.name}" does not belong to the given exam`,
      400,
    );
  }
};

export const updateMockTest = async (id, data) => {
  // Allowlist instead of the old raw pass-through: `type`/`topicId` no longer
  // exist, and arbitrary keys would surface as opaque Prisma validation errors.
  const payload = Object.fromEntries(
    Object.entries(data ?? {}).filter(
      ([key, value]) => MOCK_TEST_EDITABLE.includes(key) && value !== undefined,
    ),
  );
  if (payload.subjectId !== undefined) payload.subjectId = payload.subjectId || null; // "" ⇒ exam scope
  if (Object.keys(payload).length === 0) {
    throw new AppError(
      `No editable field provided. Allowed: ${MOCK_TEST_EDITABLE.join(", ")}`,
      400,
    );
  }

  const current = await prisma.mockTest.findUnique({
    where: { id },
    select: { id: true, examTypeId: true, subjectId: true },
  });
  if (!current) throw new AppError("Mock test not found", 404);

  if (payload.subjectId !== undefined) {
    // Filing must be internally consistent: the subject belongs to the exam.
    if (payload.subjectId) {
      await assertSubjectBelongsToExam(payload.subjectId, current.examTypeId);
    }

    // Scope changes are blocked while out-of-scope questions exist — the
    // response lists them so the admin can remove them in the same flow
    // (decision Q39). Widening to exam scope (null) is always allowed.
    if (payload.subjectId !== null && payload.subjectId !== current.subjectId) {
      const offenders = await prisma.testQuestion.findMany({
        where: {
          testId: id,
          question: { topic: { subjectId: { not: payload.subjectId } } },
        },
        select: {
          question: {
            select: {
              id: true,
              text: true,
              topic: {
                select: {
                  name: true,
                  subject: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      if (offenders.length > 0) {
        throw new AppError(
          `Cannot narrow scope: ${offenders.length} questions belong to other subjects.`,
          409,
          {
            problems: [
              {
                code: "OUT_OF_SCOPE_QUESTIONS",
                message: `${offenders.length} questions are outside the new scope. Remove them, then change scope.`,
                offenders: offenders.map(({ question }) => ({
                  questionId: question.id,
                  text:
                    question.text.length > 80
                      ? question.text.slice(0, 80) + "…"
                      : question.text,
                  chapter: question.topic.name,
                  subject: question.topic.subject.name,
                })),
              },
            ],
          },
        );
      }
    }
  }

  return prisma.mockTest.update({ where: { id }, data: payload });
};

/**
 * Activation gate (ticket 03 §4 / decision Q27). `isActive` defaults to
 * false; a test goes live only when every rule holds. This is also the
 * safety net for partial PDF extraction (ticket 09): an extracted row that
 * failed to parse can never reach students.
 */
export const activateMockTest = async (id) => {
  const test = await prisma.mockTest.findUnique({
    where: { id },
    select: {
      id: true,
      totalMarks: true,
      questions: {
        select: {
          question: {
            select: { id: true, text: true, topicId: true, correctOption: true, marks: true },
          },
        },
      },
    },
  });
  if (!test) throw new AppError("Mock test not found", 404);

  const rows = test.questions.map((tq) => tq.question);
  const problems = [];
  const idsOf = (list) => list.map((q) => q.id);

  // 1. at least one question
  if (rows.length === 0) {
    problems.push({
      code: "NO_QUESTIONS",
      message: "The test has no questions.",
    });
  }

  // 2. every question has a chapter
  const missingChapter = rows.filter((q) => !q.topicId);
  if (missingChapter.length > 0) {
    problems.push({
      code: "MISSING_CHAPTER",
      message: `${missingChapter.length} questions have no chapter.`,
      questionIds: idsOf(missingChapter),
    });
  }

  // 3. every question has a correct answer ticked
  const missingAnswer = rows.filter((q) =>
    !["A", "B", "C", "D"].includes(q.correctOption),
  );
  if (missingAnswer.length > 0) {
    problems.push({
      code: "MISSING_ANSWER",
      message: `${missingAnswer.length} questions have no correct answer ticked.`,
      questionIds: idsOf(missingAnswer),
    });
  }

  // 4. marks reconcile: totalMarks === Σ question.marks
  const marks = reconcileMarks(test.totalMarks, rows);
  if (!marks.ok) {
    problems.push({
      code: "MARKS_MISMATCH",
      message: `${marks.count} questions add up to ${marks.computed} marks, but the test says ${test.totalMarks}.`,
      computed: marks.computed,
      totalMarks: test.totalMarks,
    });
  }

  if (problems.length > 0) {
    throw new AppError("Test cannot be activated yet.", 409, { problems });
  }

  return prisma.mockTest.update({
    where: { id },
    data: { isActive: true },
    select: { id: true, isActive: true },
  });
};

export const deleteMockTest = async (id) => {
  // Soft delete
  return prisma.mockTest.update({ where: { id }, data: { isActive: false } });
};

// ── Exams tree (ticket 05) ──────────────────────────────────
// The management surface (exam-types above) shows every exam so admins can
// reactivate one. The content tree must only ever present *active* exams —
// a deactivated track disappears from the sidebar tree, subjects and tests
// list (design §5).

export const getExams = async () => {
  const [exams, subjectCounts, testCounts] = await Promise.all([
    prisma.examType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.subject.groupBy({
      by: ["examTypeId"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.mockTest.groupBy({ by: ["examTypeId"], _count: { _all: true } }),
  ]);

  const subjectsByExam = new Map(
    subjectCounts.map((s) => [s.examTypeId, s._count._all]),
  );
  const testsByExam = new Map(
    testCounts.map((t) => [t.examTypeId, t._count._all]),
  );

  return exams.map((exam) => ({
    ...exam,
    subjectCount: subjectsByExam.get(exam.id) ?? 0,
    testCount: testsByExam.get(exam.id) ?? 0,
  }));
};

export const getExamDetail = async (examId) => {
  const [exam, subjects, wholeExamTestCount] = await Promise.all([
    prisma.examType.findFirst({ where: { id: examId, isActive: true } }),
    prisma.subject.findMany({
      where: { examTypeId: examId, isActive: true },
      orderBy: { orderIndex: "asc" },
      include: { _count: { select: { topics: true, mockTests: true } } },
    }),
    prisma.mockTest.count({ where: { examTypeId: examId, subjectId: null } }),
  ]);
  if (!exam) throw new AppError("Exam not found", 404);
  return { ...exam, subjects, wholeExamTestCount };
};

// ── Test lifecycle actions (ticket 05) ──────────────────────

/**
 * Duplicate copies metadata only (decision Q8): same scope, marks, duration,
 * access and defaults — but zero questions. The real use is "build JEE Main
 * 2026 from 2025's settings, different questions"; a 90-question clone would
 * just be painful to edit. The copy stays inactive until activated.
 */
export const duplicateMockTest = async (id) => {
  const source = await prisma.mockTest.findUnique({
    where: { id },
    select: {
      examTypeId: true,
      subjectId: true,
      title: true,
      isFree: true,
      durationMins: true,
      totalMarks: true,
      defaultMarks: true,
      defaultNegMarks: true,
      instructions: true,
    },
  });
  if (!source) throw new AppError("Mock test not found", 404);

  return prisma.mockTest.create({
    data: {
      examTypeId: source.examTypeId,
      subjectId: source.subjectId,
      title: `${source.title} (copy)`,
      isFree: source.isFree,
      durationMins: source.durationMins,
      totalMarks: source.totalMarks,
      defaultMarks: source.defaultMarks,
      defaultNegMarks: source.defaultNegMarks,
      instructions: source.instructions,
      // isActive stays false — the copy must be activated deliberately.
    },
  });
};

export const archiveMockTest = async (id) => {
  const test = await prisma.mockTest.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!test) throw new AppError("Mock test not found", 404);
  return prisma.mockTest.update({ where: { id }, data: { isActive: false } });
};

export const restoreMockTest = async (id) => {
  const test = await prisma.mockTest.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!test) throw new AppError("Mock test not found", 404);
  return prisma.mockTest.update({ where: { id }, data: { isActive: true } });
};

// ── Scope guard (ticket 03 §2) ───────────────────────────────
// A subject test may only contain that subject's questions — enforced
// server-side, not just hidden in the UI (design §6). `loadTestScope`,
// `loadScopeView` and `assertQuestionsInScope` are deliberately reusable:
// the bulk add path (ticket 06) runs the same check.

const loadTestScope = async (testId) => {
  const test = await prisma.mockTest.findUnique({
    where: { id: testId },
    select: { id: true, subjectId: true, subject: { select: { name: true } } },
  });
  if (!test) throw new AppError("Mock test not found", 404);
  return test;
};

/** Question rows with the chapter → subject chain needed to resolve scope. */
const loadScopeView = (questionIds) =>
  prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      text: true,
      topic: { select: { subjectId: true, subject: { select: { name: true } } } },
    },
  });

const snippet = (text, max = 60) =>
  text.length > max ? text.slice(0, max) + "…" : text;

const assertQuestionsInScope = (test, questions) => {
  if (deriveScope(test.subjectId) !== SCOPE.SUBJECT) return; // exam scope: anything goes
  const offenders = questions.filter((q) => q.topic.subjectId !== test.subjectId);
  if (offenders.length > 0) {
    const first = offenders[0];
    throw new AppError(
      `Out of scope: "${snippet(first.text)}" belongs to ${first.topic.subject.name}, ` +
        `but this test is scoped to ${test.subject.name}.` +
        (offenders.length > 1 ? ` (${offenders.length} questions out of scope.)` : ""),
      400,
      {
        problems: [
          {
            code: "OUT_OF_SCOPE_QUESTIONS",
            message: `${offenders.length} questions do not belong to ${test.subject.name}.`,
            offenders: offenders.map((q) => ({
              questionId: q.id,
              text: snippet(q.text, 80),
              subject: q.topic.subject.name,
            })),
          },
        ],
      },
    );
  }
};

export const addQuestionToTest = async (testId, questionId, orderIndex = 0) => {
  if (!questionId) throw new AppError("questionId is required", 400);

  const test = await loadTestScope(testId);

  const [question] = await loadScopeView([questionId]);
  if (!question) throw new AppError("Question not found", 404);

  assertQuestionsInScope(test, [question]);

  // Check already added
  const existing = await prisma.testQuestion.findUnique({
    where: { testId_questionId: { testId, questionId } },
  });
  if (existing) throw new AppError("Question already added to this test", 409);

  return prisma.testQuestion.create({
    data: { testId, questionId, orderIndex },
  });
};

export const removeQuestionFromTest = async (testId, questionId) => {
  return prisma.testQuestion.delete({
    where: { testId_questionId: { testId, questionId } },
  });
};

export const reorderTestQuestions = async (testId, questions) => {
  // questions = [{ questionId, orderIndex }, ...]
  if (!Array.isArray(questions))
    throw new AppError("questions must be an array", 400);

  const updates = questions.map(({ questionId, orderIndex }) =>
    prisma.testQuestion.update({
      where: { testId_questionId: { testId, questionId } },
      data: { orderIndex },
    }),
  );

  return prisma.$transaction(updates);
};

// ── Paper-grid rows (ticket 06) ──────────────────────────────
// One surface, many sources: the grid, the add-from-bank dialog and the
// future CSV/PDF ingestors all produce the same draft-row union (lib/rows.js)
// and persist through `persistRows` — atomically with the test when creating
// (`createTestWithQuestions`) or as an append (`bulkAddQuestions`).
//
// "ref" rows link existing bank questions by id (after the scope check);
// "new" rows are first matched by exact text within the same chapter
// (decision Q18 — reuse rather than duplicate, because duplicates in a shared
// bank quietly corrupt progress), otherwise the question is created with the
// test's default marks / negative marks unless the row overrides them.
// Ordering is positional: orderIndex grows from `startIndex`.

async function persistRows({ test, rows, tx, startIndex = 0 }) {
  const refs = rows.filter((r) => r.kind === "ref");
  const news = rows.filter((r) => r.kind === "new");

  // Chapters carry the subject chain, so the scope check is one query per
  // save instead of one per row.
  const chapterIds = [...new Set(news.map((r) => r.chapterId))];
  const chapters = chapterIds.length
    ? await tx.topic.findMany({
        where: { id: { in: chapterIds } },
        select: {
          id: true,
          name: true,
          subjectId: true,
          subject: { select: { name: true } },
        },
      })
    : [];
  const chaptersById = new Map(chapters.map((c) => [c.id, c]));

  const missingChapters = chapterIds.filter((id) => !chaptersById.has(id));
  if (missingChapters.length > 0) {
    throw new AppError(`chapterId not found: ${missingChapters[0]}`, 400);
  }

  const refIds = refs.map((r) => r.questionId);
  const refQuestions = refIds.length
    ? await tx.question.findMany({
        where: { id: { in: refIds } },
        select: {
          id: true,
          text: true,
          topic: { select: { subjectId: true, subject: { select: { name: true } } } },
        },
      })
    : [];
  const refById = new Map(refQuestions.map((q) => [q.id, q]));

  const missingRefs = refs.filter((r) => !refById.has(r.questionId));
  if (missingRefs.length > 0) {
    throw new AppError(`Question not found: ${missingRefs[0].questionId}`, 404);
  }

  // Scope guard (design §6): a subject test may only contain that subject's
  // questions — enforced here and in addQuestionToTest, never just in the UI.
  if (deriveScope(test.subjectId) === SCOPE.SUBJECT) {
    const refOffenders = refs
      .map((r) => refById.get(r.questionId))
      .filter((q) => q.topic.subjectId !== test.subjectId);
    const newOffenders = news
      .map((r) => chaptersById.get(r.chapterId))
      .filter((c) => c.subjectId !== test.subjectId);
    const count = refOffenders.length + newOffenders.length;
    if (count > 0) {
      const firstRef = refOffenders[0];
      const firstNew = newOffenders[0];
      const label = firstRef
        ? `"${snippet(firstRef.text)}" belongs to ${firstRef.topic.subject.name}`
        : `"${firstNew.name}" belongs to ${firstNew.subject.name}`;
      throw new AppError(
        `Out of scope: ${count} row${count === 1 ? "" : "s"} — ${label}, ` +
          `but this test is scoped to ${test.subject.name}.`,
        400,
        {
          problems: [
            {
              code: "OUT_OF_SCOPE_QUESTIONS",
              message: `${count} rows do not belong to ${test.subject.name}.`,
              offenders: [
                ...refOffenders.map((q) => ({ questionId: q.id, text: snippet(q.text, 80), subject: q.topic.subject.name })),
                ...newOffenders.map((c) => ({ chapterId: c.id, chapter: c.name, subject: c.subject.name })),
              ],
            },
          ],
        },
      );
    }
  }

  let orderIndex = startIndex;
  const summary = { created: 0, reused: 0, linked: 0 };

  const link = async (questionId) => {
    await tx.testQuestion.create({
      data: { testId: test.id, questionId, orderIndex: orderIndex++ },
    });
    summary.linked += 1;
  };

  for (const row of rows) {
    if (row.kind === "ref") {
      await link(row.questionId);
      continue;
    }

    // Duplicate detection (Q18): exact text within the same chapter → reuse,
    // but never a question that is already a row of this test (unique
    // `testId_questionId` constraint would otherwise blow up on re-append).
    const match = await tx.question.findFirst({
      where: {
        topicId: row.chapterId,
        text: { equals: row.text, mode: "insensitive" },
        testQuestions: { none: { testId: test.id } },
      },
      select: { id: true },
    });
    if (match) {
      summary.reused += 1;
      await link(match.id);
      continue;
    }

    // Same-text question exists but is already a row of this test — the
    // pending row is a no-op (already present), counted as reused.
    const alreadyInTest = await tx.question.findFirst({
      where: {
        topicId: row.chapterId,
        text: { equals: row.text, mode: "insensitive" },
        testQuestions: { some: { testId: test.id } },
      },
      select: { id: true },
    });
    if (alreadyInTest) {
      summary.reused += 1;
      continue;
    }

    const created = await tx.question.create({
      data: {
        topicId: row.chapterId,
        text: row.text,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctOption: row.correctOption,
        explanation: row.explanation ?? null,
        imageUrl: row.imageUrl ?? null,
        isReusable: row.isReusable ?? true,
        marks: row.marks ?? test.defaultMarks ?? 1,
        negMarks: row.negMarks ?? test.defaultNegMarks ?? 0,
        difficulty: row.difficulty ?? undefined,
      },
    });
    summary.created += 1;
    await link(created.id);
  }

  return summary;
}

/**
 * Atomic create: test + its rows in ONE transaction — never an intermediate
 * "test with 0 questions" state when rows are supplied (ticket 06, done-when #1).
 */
export const createTestWithQuestions = async (data) => {
  const { rows, ...testBody } = data;
  const {
    examTypeId,
    title,
    isFree,
    durationMins,
    totalMarks,
    subjectId,
    topicId, // legacy input from the old CHAPTER form — resolved, not stored
    defaultMarks,
    defaultNegMarks,
    instructions,
  } = testBody;

  if (!examTypeId || !title || !durationMins || !totalMarks) {
    throw new AppError(
      "examTypeId, title, durationMins, totalMarks are required",
      400,
    );
  }

  let resolvedSubjectId = subjectId || null;
  if (!resolvedSubjectId && topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { subjectId: true },
    });
    resolvedSubjectId = topic?.subjectId ?? null;
  }
  if (resolvedSubjectId) {
    await assertSubjectBelongsToExam(resolvedSubjectId, examTypeId);
  }

  return prisma.$transaction(async (tx) => {
    const test = await tx.mockTest.create({
      data: {
        examTypeId,
        subjectId: resolvedSubjectId,
        title,
        isFree: isFree ?? true,
        durationMins: Number(durationMins),
        totalMarks: Number(totalMarks),
        ...(defaultMarks !== undefined ? { defaultMarks: Number(defaultMarks) } : {}),
        ...(defaultNegMarks !== undefined ? { defaultNegMarks: Number(defaultNegMarks) } : {}),
        instructions,
        // isActive stays false (schema default) — nothing reaches students
        // until POST /tests/:id/activate.
      },
      // `test.subject` is needed by the scope guard in persistRows.
      include: { subject: { select: { name: true } } },
    });

    const summary = rows?.length
      ? await persistRows({ test, rows, tx })
      : { created: 0, reused: 0, linked: 0 };
    return { test, ...summary };
  });
};

/** Append rows to an existing test — `orderIndex` continues after the last row. */
export const bulkAddQuestions = async (testId, rows) => {
  const test = await loadTestScope(testId);

  const [defaults, maxRow] = await Promise.all([
    prisma.mockTest.findUnique({
      where: { id: testId },
      select: { defaultMarks: true, defaultNegMarks: true },
    }),
    prisma.testQuestion.aggregate({
      where: { testId },
      _max: { orderIndex: true },
    }),
  ]);

  const startIndex = (maxRow._max.orderIndex ?? -1) + 1;
  return prisma.$transaction(async (tx) =>
    persistRows({ test: { ...test, ...(defaults ?? {}) }, rows, tx, startIndex }),
  );
};

// ── Notes ────────────────────────────────────────────────────


export const getNotes = async ({ examTypeId, topicId, subjectId, page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (examTypeId) where.examTypeId = examTypeId;
  if (topicId) where.topicId = topicId;
  if (subjectId) where.subjectId = subjectId;

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        topic: { select: { name: true } },
        subject: { select: { name: true } },
        examType: { select: { name: true } },
        uploader: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.note.count({ where }),
  ]);

  return { notes, total, page: Number(page), limit: Number(limit) };
};

export const createNote = async ({
  examTypeId,
  topicId,
  subjectId,
  title,
  filePath,
  fileName,
  fileType,
  fileSizeMb,
  isFree,
  uploadedBy,
}) => {
  if (!examTypeId || !title || !filePath || !fileType || !uploadedBy) {
    throw new AppError(
      "examTypeId, title, filePath, fileType, uploadedBy are required",
      400,
    );
  }

  let uploadResult;
  try {
    uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "raw", // PDFs/docs — not "image" or "video"
      folder: `examock/notes/${examTypeId}`,
      public_id: fileName.replace(/\.[^/.]+$/, ""), // strip extension, Cloudinary adds its own
      use_filename: true,
      unique_filename: true,
    });
  } finally {
    // Always clean up the local temp file, whether upload succeeded or not
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const note = await prisma.note.create({
    data: {
      examTypeId,
      topicId: topicId || null,
      subjectId: subjectId || null,
      title,
      filePath: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      fileName,
      fileType,
      fileSizeMb: fileSizeMb ? parseFloat(fileSizeMb) : null,
      isFree: isFree === "true" || isFree === true,
      uploadedBy,
      isActive: true,
      embeddingStatus: "PENDING",
    },
  });

  await boss.send(QUEUE.INGEST_NOTE, { noteId: note.id });

  return note;
};

export const updateNote = async (id, data) => {
  // Title/topic/subject/isFree edits don't touch Qdrant — just update the row.
  // A file *replacement* should be its own endpoint (see note below).
  return prisma.note.update({ where: { id }, data });
};

export const deleteNote = async (id) => {
  const note = await prisma.note.findUniqueOrThrow({ where: { id } });

  await prisma.note.update({ where: { id }, data: { isActive: false } });
  // DELETE_NOTE_CHUNKS jobs are deliberately NOT produced: their consumer is
  // commented out (workers/noteIngestion.worker.js:53-55), so every send added
  // an unprocessable row to pgboss forever (ticket 02 / decision Q36).
  // vectorStore.js also drops metadata.noteId, so restoring the consumer is a
  // separate follow-up — fixing the leak does not restore deletion.

  if (note.cloudinaryPublicId) {
    await cloudinary.uploader.destroy(note.cloudinaryPublicId, { resource_type: "raw" });
  }
};

export const getNoteDownloadUrl = async (id) => {
  const note = await prisma.note.findUniqueOrThrow({ where: { id } });

  return cloudinary.utils.url(note.cloudinaryPublicId, {
    resource_type: "raw",
    type: "upload",
    flags: "attachment",
    sign_url: true, // uses your api_secret to sign — bypasses strict-transformation 400
  });
};


// ── Users ────────────────────────────────────────────────────

export const getUsers = async ({ examTypeId, page = 1, limit = 20, search }) => {
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (examTypeId) where.examTypeId = examTypeId;
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, mobile: true,
        mobileVerified: true, role: true, examTypeId: true,
        examDate: true, createdAt: true,
        examType: { select: { name: true } },
        _count: { select: { testAttempts: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page: Number(page), limit: Number(limit) };
};


export const getUserDetail = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      examType: { select: { name: true } },
      topicProgress: {
        include: { topic: { select: { name: true } } },
        orderBy: { lastActivity: "desc" },
      },
      testAttempts: {
        include: { mockTest: { select: { title: true, subjectId: true } } },
        orderBy: { startedAt: "desc" },
        take: 10,
      },
      payments: {
        include: { mockTest: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);
  return user;
};


export const resetUserExamType = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);

  return prisma.user.update({
    where: { id },
    data: { examTypeId: null },
  });
};


// ── Analytics ────────────────────────────────────────────────

export const getOverview = async () => {
  const [
    totalUsers,
    totalAttempts,
    completedAttempts,
    totalRevenuePaise,
    totalTests,
    totalQuestions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.testAttempt.count(),
    prisma.testAttempt.count({ where: { status: "COMPLETED" } }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amountPaise: true },
    }),
    prisma.mockTest.count({ where: { isActive: true } }),
    prisma.question.count(),
  ]);

  return {
    totalUsers,
    totalAttempts,
    completedAttempts,
    totalRevenueRupees: (totalRevenuePaise._sum.amountPaise ?? 0) / 100,
    totalTests,
    totalQuestions,
  };
};

export const getTestAnalytics = async () => {
  const tests = await prisma.mockTest.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      subjectId: true,
      subject: { select: { name: true } },
      isFree: true,
      _count: { select: { attempts: true } },
      attempts: {
        where: { status: "COMPLETED" },
        select: { score: true },
      },
    },
  });

  return tests.map((t) => {
    const scores = t.attempts.map((a) => a.score ?? 0);
    const avgScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      id: t.id,
      title: t.title,
      // scope is derived, never stored: subjectId null ⇒ whole exam (design §3)
      subjectId: t.subjectId,
      subjectName: t.subject?.name ?? null,
      isFree: t.isFree,
      totalAttempts: t._count.attempts,
      completedAttempts: t.attempts.length,
      averageScore: Math.round(avgScore * 10) / 10,
    };
  });
};


export const getPaymentRecords = async ({ page = 1, limit = 20, status }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = status ? { status } : {};

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user:     { select: { name: true, email: true } },
        mockTest: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, total, page: Number(page), limit: Number(limit) };
};


// ── Notifications ────────────────────────────────────────────

export const getNotifications = async () => {
  return prisma.notification.findMany({ orderBy: { createdAt: "desc" } });
};

export const broadcastNotification = async ({ examTypeId, title, body }) => {
  if (!title || !body) throw new AppError("title and body are required", 400);

  // Create the notification record
  const notification = await prisma.notification.create({
    data: {
      examTypeId: examTypeId ?? null, // null = broadcast to all
      title,
      body,
      sentAt: new Date(),
    },
  });

  // TODO: hook this into FCM / WebSockets / email later
  // For now it just persists to DB — frontend can poll /notifications

  return { success: true, notification };
};