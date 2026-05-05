import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { ingestFile } from "../rag/pipelines/ingestion.pipeline.js";

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
    where: examTypeId ? { examTypeId } : {},
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
  return prisma.subject.delete({ where: { id } });
};

// ── Topics ───────────────────────────────────────────────────

export const getTopics = async (subjectId) => {
  return prisma.topic.findMany({
    where: subjectId ? { subjectId } : {},
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

export const getMockTests = async ({ examTypeId, page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);

  const [tests, total] = await Promise.all([
    prisma.mockTest.findMany({
      where: examTypeId ? { examTypeId } : {},
      include: {
        examType: { select: { name: true } },
        subject: { select: { name: true } },
        topic: { select: { name: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.mockTest.count({ where: examTypeId ? { examTypeId } : {} }),
  ]);

  return { tests, total, page: Number(page), limit: Number(limit) };
};

export const createMockTest = async (data) => {
  const {
    examTypeId,
    title,
    type,
    isFree,
    durationMins,
    totalMarks,
    topicId,
    subjectId,
    instructions,
  } = data;

  if (!examTypeId || !title || !type || !durationMins || !totalMarks) {
    throw new AppError(
      "examTypeId, title, type, durationMins, totalMarks are required",
      400,
    );
  }

  if (!["CHAPTER", "MODULE", "FULL"].includes(type)) {
    throw new AppError("type must be CHAPTER, MODULE, or FULL", 400);
  }

  return prisma.mockTest.create({
    data: {
      examTypeId,
      title,
      type,
      isFree: isFree ?? false,
      durationMins,
      totalMarks,
      topicId,
      subjectId,
      instructions,
    },
  });
};

export const updateMockTest = async (id, data) => {
  return prisma.mockTest.update({ where: { id }, data });
};

export const deleteMockTest = async (id) => {
  // Soft delete
  return prisma.mockTest.update({ where: { id }, data: { isActive: false } });
};

export const addQuestionToTest = async (testId, questionId, orderIndex = 0) => {
  if (!questionId) throw new AppError("questionId is required", 400);

  // Check question exists
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new AppError("Question not found", 404);

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

// ── Notes ────────────────────────────────────────────────────


export const getNotes = async ({ examTypeId, topicId, subjectId, page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (examTypeId) where.examTypeId = examTypeId;
  if (topicId)    where.topicId    = topicId;
  if (subjectId)  where.subjectId  = subjectId;

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        topic:    { select: { name: true } },
        subject:  { select: { name: true } },
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

  const validTypes = ["PDF"];
  if (!validTypes.includes(fileType)) {
    throw new AppError(
      `fileType must be one of: ${validTypes}`,
      400,
    );
  }

  // Only ingest PDFs into Qdrant — other file types just get stored in DB
  let chunksStored = 0;

  if (fileType === "PDF") {
    const ingested = await ingestFile(filePath, {
      examTypeId, // ← admin tag, NOT userId
      fileName,
    });
    chunksStored = ingested.chunksStored;
    // Note: ingestFile deletes the temp file after ingestion
  }

  // Save metadata to Postgres
  // If not PDF, fileUrl = filePath (swap for S3 URL in production)
  const note = await prisma.note.create({
    data: {
      examTypeId,
      topicId: topicId || null,
      subjectId: subjectId || null,
      title,
      fileUrl: filePath, // replace with S3 URL when you add cloud storage
      fileType,
      fileSizeMb: fileSizeMb ? parseFloat(fileSizeMb) : null,
      isFree: isFree === "true" || isFree === true,
      uploadedBy,
      isActive: true,
    },
  });

  return { note, chunksStored };
};

export const updateNote = async (id, data) => {
  return prisma.note.update({ where: { id }, data });
};

export const deleteNote = async (id) => {
  // Soft delete
  return prisma.note.update({ where: { id }, data: { isActive: false } });
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
        include: { mockTest: { select: { title: true, type: true } } },
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
      type: true,
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
      type: t.type,
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