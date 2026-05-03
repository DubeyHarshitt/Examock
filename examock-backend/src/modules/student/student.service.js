import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

// ─────────────────────────────────────────────────────────────
// Helper — get examTypeId for a user (used in multiple services)
// ─────────────────────────────────────────────────────────────

async function getUserExamTypeId(userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { examTypeId: true },
  });
  if (!user?.examTypeId) throw new AppError("Exam type not set", 403);
  return user.examTypeId;
}

// ─────────────────────────────────────────────────────────────
// 1. Dashboard — single call for entire home page
// ─────────────────────────────────────────────────────────────

export const getDashboard = async (userId) => {
  const examTypeId = await getUserExamTypeId(userId);

  const [examType, subjects, recentAttempts, progressRecords] = await Promise.all([
    // Exam type details
    prisma.examType.findUnique({
      where:  { id: examTypeId },
      select: { name: true, slug: true, description: true },
    }),

    // All subjects with topic count
    prisma.subject.findMany({
      where:   { examTypeId },
      select:  {
        id: true,
        name: true,
        orderIndex: true,
        _count: { select: { topics: true } },
      },
      orderBy: { orderIndex: "asc" },
    }),

    // Last 3 completed test attempts
    prisma.testAttempt.findMany({
      where:   { userId, status: "COMPLETED" },
      select:  {
        id: true,
        score: true,
        percentile: true,
        timeTakenSec: true,
        completedAt: true,
        mockTest: { select: { title: true, type: true, totalMarks: true } },
      },
      orderBy: { completedAt: "desc" },
      take:    3,
    }),

    // All topic progress for this user
    prisma.userTopicProgress.findMany({
      where:  { userId },
      select: {
        topicId: true,
        bestScore: true,
        attemptCount: true,
        videosWatched: true,
        lastActivity: true,
        topic: {
          select: {
            name: true,
            subject: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  // Topics where student hasn't attempted or has low score — suggest these
  const suggestedTopics = progressRecords
    .filter((p) => p.bestScore === null || p.bestScore < 50)
    .slice(0, 5)
    .map((p) => ({
      topicId:      p.topicId,
      topicName:    p.topic.name,
      subjectName:  p.topic.subject.name,
      bestScore:    p.bestScore,
      attemptCount: p.attemptCount,
    }));

  return {
    examType,
    subjects: subjects.map((s) => ({
      id:         s.id,
      name:       s.name,
      orderIndex: s.orderIndex,
      topicCount: s._count.topics,
    })),
    recentAttempts,
    suggestedTopics,
    totalTopicsAttempted: progressRecords.filter((p) => p.attemptCount > 0).length,
  };
};

// ─────────────────────────────────────────────────────────────
// 2. Subjects — all subjects for the student's exam type
// ─────────────────────────────────────────────────────────────

export const getSubjects = async (userId) => {
  const examTypeId = await getUserExamTypeId(userId);

  const subjects = await prisma.subject.findMany({
    where:   { examTypeId },
    select:  {
      id: true,
      name: true,
      orderIndex: true,
      _count: { select: { topics: true, notes: true } },
    },
    orderBy: { orderIndex: "asc" },
  });

  return subjects.map((s) => ({
    id:         s.id,
    name:       s.name,
    orderIndex: s.orderIndex,
    topicCount: s._count.topics,
    noteCount:  s._count.notes,
  }));
};

// ─────────────────────────────────────────────────────────────
// 3. Topics — topics under a subject with student's progress
// ─────────────────────────────────────────────────────────────

export const getTopics = async (userId, subjectId) => {
  if (!subjectId) throw new AppError("subjectId is required", 400);

  const [topics, progressRecords] = await Promise.all([
    prisma.topic.findMany({
      where:   { subjectId },
      select:  {
        id: true,
        name: true,
        orderIndex: true,
        _count: { select: { videos: true, questions: true } },
      },
      orderBy: { orderIndex: "asc" },
    }),

    prisma.userTopicProgress.findMany({
      where:  { userId, topic: { subjectId } },
      select: {
        topicId: true,
        bestScore: true,
        attemptCount: true,
        videosWatched: true,
        lastActivity: true,
      },
    }),
  ]);

  // Map progress onto topics
  const progressMap = new Map(progressRecords.map((p) => [p.topicId, p]));

  return topics.map((t) => {
    const progress = progressMap.get(t.id) || null;
    return {
      id:            t.id,
      name:          t.name,
      orderIndex:    t.orderIndex,
      videoCount:    t._count.videos,
      questionCount: t._count.questions,
      progress: progress
        ? {
            bestScore:     progress.bestScore,
            attemptCount:  progress.attemptCount,
            videosWatched: progress.videosWatched,
            lastActivity:  progress.lastActivity,
          }
        : null, // null means student hasn't touched this topic yet
    };
  });
};

// ─────────────────────────────────────────────────────────────
// 4. Videos — by topicId or subjectId
// ─────────────────────────────────────────────────────────────

export const getVideos = async ({ topicId, subjectId }) => {
  if (!topicId && !subjectId) {
    throw new AppError("topicId or subjectId is required", 400);
  }

  // If subjectId — get all topics in subject then all their videos
  if (subjectId && !topicId) {
    const topics = await prisma.topic.findMany({
      where:   { subjectId },
      select:  {
        id: true,
        name: true,
        orderIndex: true,
        videos: {
          where:   { isActive: true },
          select:  {
            id: true,
            youtubeId: true,
            title: true,
            durationSec: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    // Return videos grouped by topic
    return topics.map((t) => ({
      topicId:   t.id,
      topicName: t.name,
      videos:    t.videos,
    }));
  }

  // If topicId — flat list of videos
  const videos = await prisma.video.findMany({
    where:   { topicId, isActive: true },
    select:  {
      id: true,
      youtubeId: true,
      title: true,
      durationSec: true,
      orderIndex: true,
    },
    orderBy: { orderIndex: "asc" },
  });

  return videos;
};

// ─────────────────────────────────────────────────────────────
// 5. Notes — study materials for the student
// ─────────────────────────────────────────────────────────────

export const getNotes = async (userId, { topicId, subjectId }) => {
  const examTypeId = await getUserExamTypeId(userId);

  const where = {
    examTypeId,
    isActive: true,
  };

  // Optional filters
  if (topicId)   where.topicId   = topicId;
  if (subjectId) where.subjectId = subjectId;

  const notes = await prisma.note.findMany({
    where,
    select: {
      id: true,
      title: true,
      fileType: true,
      fileSizeMb: true,
      isFree: true,
      createdAt: true,
      topic:   { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return notes;
};

// ─────────────────────────────────────────────────────────────
// 6. Note by ID — returns fileUrl for download
// ─────────────────────────────────────────────────────────────

export const getNoteById = async (id) => {
  const note = await prisma.note.findUnique({
    where:  { id },
    select: {
      id: true,
      title: true,
      fileUrl: true,   // frontend uses this to open/download
      fileType: true,
      fileSizeMb: true,
      isFree: true,
      topic:   { select: { name: true } },
      subject: { select: { name: true } },
    },
  });

  if (!note || !note.isActive) throw new AppError("Note not found", 404);
  return note;
};

// ─────────────────────────────────────────────────────────────
// 7. YT Channels — recommended channels for student's exam type
// ─────────────────────────────────────────────────────────────

export const getYtChannels = async (userId) => {
  const examTypeId = await getUserExamTypeId(userId);

  return prisma.ytChannel.findMany({
    where:   { examTypeId, isActive: true },
    select:  {
      id: true,
      channelId: true,    // used by frontend to build subscribe button
      channelName: true,
      logoUrl: true,
    },
    orderBy: { createdAt: "asc" },
  });
};

// ─────────────────────────────────────────────────────────────
// 8. Progress — all topic progress for the student
// ─────────────────────────────────────────────────────────────

export const getProgress = async (userId) => {
  const examTypeId = await getUserExamTypeId(userId);

  const progressRecords = await prisma.userTopicProgress.findMany({
    where:  { userId },
    select: {
      topicId: true,
      bestScore: true,
      attemptCount: true,
      videosWatched: true,
      lastActivity: true,
      topic: {
        select: {
          name: true,
          orderIndex: true,
          subject: {
            select: {
              id: true,
              name: true,
              examTypeId: true,
            },
          },
        },
      },
    },
    orderBy: { lastActivity: "desc" },
  });

  // Filter to only topics belonging to the student's exam type
  const filtered = progressRecords.filter(
    (p) => p.topic.subject.examTypeId === examTypeId
  );

  // Group by subject for the progress page
  const bySubject = {};

  for (const p of filtered) {
    const subjectId   = p.topic.subject.id;
    const subjectName = p.topic.subject.name;

    if (!bySubject[subjectId]) {
      bySubject[subjectId] = {
        subjectId,
        subjectName,
        topics: [],
      };
    }

    bySubject[subjectId].topics.push({
      topicId:       p.topicId,
      topicName:     p.topic.name,
      bestScore:     p.bestScore,
      attemptCount:  p.attemptCount,
      videosWatched: p.videosWatched,
      lastActivity:  p.lastActivity,
    });
  }

  return Object.values(bySubject);
};

// ─────────────────────────────────────────────────────────────
// 9. Single topic progress
// ─────────────────────────────────────────────────────────────

export const getTopicProgress = async (userId, topicId) => {
  const [progress, recentAttempts] = await Promise.all([
    prisma.userTopicProgress.findUnique({
      where:  { userId_topicId: { userId, topicId } },
      select: {
        bestScore: true,
        attemptCount: true,
        videosWatched: true,
        lastActivity: true,
        topic: {
          select: {
            name: true,
            subject: { select: { name: true } },
            _count: { select: { videos: true, questions: true } },
          },
        },
      },
    }),

    // Last 5 attempts on tests linked to this topic
    prisma.testAttempt.findMany({
      where:   {
        userId,
        status:   "COMPLETED",
        mockTest: { topicId },
      },
      select:  {
        id: true,
        score: true,
        percentile: true,
        timeTakenSec: true,
        completedAt: true,
        mockTest: { select: { title: true, totalMarks: true } },
      },
      orderBy: { completedAt: "desc" },
      take:    5,
    }),
  ]);

  if (!progress) {
    return {
      topicId,
      started:      false,
      bestScore:    null,
      attemptCount: 0,
      recentAttempts: [],
    };
  }

  return {
    topicId,
    started:       true,
    topicName:     progress.topic.name,
    subjectName:   progress.topic.subject.name,
    bestScore:     progress.bestScore,
    attemptCount:  progress.attemptCount,
    videosWatched: progress.videosWatched,
    lastActivity:  progress.lastActivity,
    totalVideos:   progress.topic._count.videos,
    totalQuestions: progress.topic._count.questions,
    recentAttempts,
  };
};