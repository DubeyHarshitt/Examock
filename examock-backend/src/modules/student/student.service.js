import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
  filterNotificationsByExamScope,
  clampNotificationLimit,
} from "./lib/notifications.js";

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
      where:   { examTypeId, isActive: true },
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
        mockTest: { select: { title: true, totalMarks: true } },
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
    where:   { examTypeId, isActive: true },
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
      where:   { subjectId, isActive: true },
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
// 4. Videos — by topicId only (ticket 09 removed the dead subjectId branch).
// ─────────────────────────────────────────────────────────────

export const getVideos = async (userId, { topicId }) => {
  if (!topicId) {
    throw new AppError("topicId is required", 400);
  }

  // Fetch this user's watched-state for the videos we're about to return, so
  // the frontend can render the ✓ toggle correctly on first paint.
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

  const watchedIds = videos.length === 0
    ? []
    : (await prisma.videoWatch.findMany({
        where: { userId, videoId: { in: videos.map((v) => v.id) } },
        select: { videoId: true },
      })).map((r) => r.videoId);

  return { videos, watchedIds };
};

// ─────────────────────────────────────────────────────────────
// 5. Notes — study materials for the student
// ─────────────────────────────────────────────────────────────

export const getNotes = async (userId, { subjectId, topicId, isFree, page = 1, limit = 20 }) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { examTypeId: true },
  });

  if (!user.examTypeId) {
    throw new AppError("Complete onboarding to view notes", 400);
  }

  const skip = (Number(page) - 1) * Number(limit);

  // examTypeId is always the student's own — never trusted from query params
  const where = { isActive: true, examTypeId: user.examTypeId };
  if (subjectId) where.subjectId = subjectId;
  if (topicId) where.topicId = topicId;
  if (isFree !== undefined) where.isFree = isFree === "true" || isFree === true;

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      select: {
        id: true,
        title: true,
        filePath: true,
        fileName: true,
        fileType: true,
        fileSizeMb: true,
        isFree: true,
        createdAt: true,
        topic: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.note.count({ where }),
  ]);

  return { notes, total, page: Number(page), limit: Number(limit) };
};

// ─────────────────────────────────────────────────────────────
// 6. Note by ID — returns fileUrl for download
// ─────────────────────────────────────────────────────────────

export const getNoteById = async (id) => {
  const note = await prisma.note.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      filePath: true, // fixed — was fileUrl, doesn't exist on the schema
      fileName: true, // added — frontend needs this for the download filename
      fileType: true,
      fileSizeMb: true,
      isFree: true,
      isActive: true, // needed below, not returned to client
      examTypeId: true, // needed below, not returned to client
      topic: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });

  if (!note || !note.isActive) throw new AppError("Note not found", 404);

  const { isActive, examTypeId, ...safeNote } = note;
  return safeNote;
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

    // Last 5 completed attempts on tests that contain this chapter's questions
    // (mock_tests.topic_id is gone — scope lives in subjectId, and the link to
    // a chapter is which questions the test actually includes)
    prisma.testAttempt.findMany({
      where:   {
        userId,
        status:   "COMPLETED",
        mockTest: { questions: { some: { question: { topicId } } } },
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

// ─────────────────────────────────────────────────────────────
// 11. Notifications — student read path
//    (Ticket 01: docs/student-pannel/issue-01/ticket/01-notifications-backend.md;
//     ticket 11: docs/student-pannel/issue-01/ticket/11-notifications-read-state.md
//     adds per-user read state.)
// ─────────────────────────────────────────────────────────────

/**
 * Returns notifications visible to the user (global + their exam), each
 * annotated with `isRead` / `readAt` from the `notification_reads` table.
 * `unreadCount` is `visible.length - read.length`.
 *
 * Notifications created before the user signed up still appear in the inbox
 * (they're global or exam-scoped), but they're treated as already-read
 * because there are no rows in `notification_reads` for them yet — which
 * matches the V1 behavior where "items created after join" were unread.
 * Every user starts at 0 unread on first sign-in.
 */
export const listNotifications = async (userId, { limit } = {}) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { examTypeId: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const take = clampNotificationLimit(limit);

  const all = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });

  const visible = filterNotificationsByExamScope(all, user.examTypeId);

  const reads = visible.length === 0
    ? []
    : await prisma.notificationRead.findMany({
        where: {
          userId,
          notificationId: { in: visible.map((n) => n.id) },
        },
        select: { notificationId: true, readAt: true },
      });

  const readMap = new Map(reads.map((r) => [r.notificationId, r.readAt]));
  const items = visible.map((n) => ({
    ...n,
    isRead: readMap.has(n.id),
    readAt: (readMap.get(n.id) ?? null)?.toISOString() ?? null,
  }));
  const unreadCount = items.filter((i) => !i.isRead).length;

  return { items, unreadCount };
};

/**
 * Mark a batch of notifications as read for the given user. Idempotent —
 * re-marking already-read ids is a no-op (createMany + skipDuplicates).
 *
 * @returns number of new rows written (already-read ids not counted).
 */
export const markNotificationsRead = async (userId, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const result = await prisma.notificationRead.createMany({
    data: ids.map((notificationId) => ({ userId, notificationId })),
    skipDuplicates: true,
  });
  return result.count;
};

// ─────────────────────────────────────────────────────────────
// 12. Exam type — destructive re-pick
//    (Ticket 01 / 03)
// ─────────────────────────────────────────────────────────────

/**
 * Change the user's exam type. Resets topic progress for topics that don't
 * belong to the new exam. No-op if the id is unchanged.
 */
export const changeExamType = async (userId, examTypeId) => {
  if (!examTypeId || typeof examTypeId !== "string") {
    throw new AppError("examTypeId is required", 400);
  }

  const target = await prisma.examType.findUnique({ where: { id: examTypeId } });
  if (!target) throw new AppError("Invalid exam type", 400);

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, examTypeId: true },
  });
  if (!current) throw new AppError("User not found", 404);

  if (current.examTypeId === examTypeId) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { examTypeId },
    }),
    prisma.userTopicProgress.deleteMany({
      where: {
        topic: { subject: { examTypeId: { not: examTypeId } } },
      },
    }),
  ]);

  return prisma.user.findUnique({ where: { id: userId } });
};

// ─────────────────────────────────────────────────────────────
// 13. Video watched toggle
//    (Ticket 06)
// ─────────────────────────────────────────────────────────────

/**
 * Toggle the per-user "watched" flag on a video. Toggle semantics: first call
 * marks watched, second call clears. The per-topic counter on
 * `UserTopicProgress.videosWatched` is unchanged — that one is incremented by
 * completing a chapter test (see student-side-v1.md §11).
 */
export const toggleVideoWatched = async (userId, videoId) => {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true },
  });
  if (!video) throw new AppError("Video not found", 404);

  const existing = await prisma.videoWatch.findUnique({
    where: { userId_videoId: { userId, videoId } },
    select: { userId: true },
  });

  if (existing) {
    await prisma.videoWatch.delete({
      where: { userId_videoId: { userId, videoId } },
    });
    return { watched: false };
  }
  await prisma.videoWatch.create({ data: { userId, videoId } });
  return { watched: true };
};