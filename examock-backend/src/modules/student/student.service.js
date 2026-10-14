import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
  filterNotificationsByExamScope,
  clampNotificationLimit,
  readCutoff,
  shapeInboxItem,
  countUnread,
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

  const [examType, subjects, recentAttempts, totalAttempts, progressRecords] = await Promise.all([
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

    // Last 3 completed test attempts. `mockTestId` is selected so each row can
    // link through to its result page (`/tests/:mockTestId/result?attemptId=…`).
    prisma.testAttempt.findMany({
      where:   { userId, status: "COMPLETED" },
      select:  {
        id: true,
        mockTestId: true,
        score: true,
        percentile: true,
        timeTakenSec: true,
        completedAt: true,
        mockTest: { select: { title: true, totalMarks: true } },
      },
      orderBy: { completedAt: "desc" },
      take:    3,
    }),

    // Real total of completed attempts. The list above is capped at 3, so its
    // length must never be shown as "Tests Taken" — that would max out at 3.
    prisma.testAttempt.count({
      where: { userId, status: "COMPLETED" },
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
    totalAttempts,
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
        mockTestId: true,
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
    // Flatten to the shape `TopicAttemptSummary` declares — the raw Prisma rows
    // nest title/totalMarks under `mockTest`, which left `mockTestTitle` and
    // `totalMarks` undefined in the UI (it rendered "score/undefined").
    recentAttempts: recentAttempts.map((a) => ({
      id: a.id,
      mockTestId: a.mockTestId,
      mockTestTitle: a.mockTest.title,
      score: a.score,
      totalMarks: a.mockTest.totalMarks,
      percentile: a.percentile,
      timeTakenSec: a.timeTakenSec,
      completedAt: a.completedAt,
    })),
  };
};

// ─────────────────────────────────────────────────────────────
// 10. Attempts — paginated history of completed tests
// ─────────────────────────────────────────────────────────────

const ATTEMPTS_PAGE_SIZE = 20;
const ATTEMPTS_MAX_PAGE_SIZE = 50;

export const getAttempts = async (userId, { page, pageSize } = {}) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), ATTEMPTS_MAX_PAGE_SIZE)
      : ATTEMPTS_PAGE_SIZE;

  const where = { userId, status: "COMPLETED" };

  const [total, attempts] = await Promise.all([
    prisma.testAttempt.count({ where }),
    prisma.testAttempt.findMany({
      where,
      select: {
        id: true,
        mockTestId: true,
        score: true,
        percentile: true,
        timeTakenSec: true,
        completedAt: true,
        mockTest: {
          select: {
            title: true,
            totalMarks: true,
            durationMins: true,
            subjectId: true,
            subject: { select: { name: true } },
            examType: { select: { name: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      skip: (safePage - 1) * safeSize,
      take: safeSize,
    }),
  ]);

  return {
    attempts: attempts.map((a) => ({
      id: a.id,
      mockTestId: a.mockTestId,
      title: a.mockTest.title,
      subjectId: a.mockTest.subjectId,
      subjectName: a.mockTest.subject?.name ?? null,
      examTypeName: a.mockTest.examType?.name ?? null,
      score: a.score,
      totalMarks: a.mockTest.totalMarks,
      percentile: a.percentile,
      timeTakenSec: a.timeTakenSec,
      completedAt: a.completedAt,
    })),
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
};

// ─────────────────────────────────────────────────────────────
// 11. Notifications — student read path
//    (Ticket 01: docs/student-pannel/issue-01/ticket/01-notifications-backend.md;
//     ticket 11: docs/student-pannel/issue-01/ticket/11-notifications-read-state.md
//     adds per-user read state;
//     ticket 12: docs/student-pannel/issue-01/ticket/12-notifications-full-view-and-admin-delete.md
//     changes semantics so read items disappear from the inbox;
//     24h retention: read items linger for READ_RETENTION_MS after readAt
//     so the user can re-open something they just dismissed.)
// ─────────────────────────────────────────────────────────────

/**
 * Returns the user's notifications still in their inbox, filtered by exam
 * scope (global + the user's exam). A row stays visible for 24 hours after
 * the user marks it as read (see `readRetentionMs`), then drops off.
 *
 * The response carries every inbox row — unread AND recently-read — with
 * a `read` flag (and matching `readAt`) so the client can style read
 * items differently. `unreadCount` counts only the unread ones, so the
 * bell badge drops the moment a row is read; the row itself stays in
 * `items` until 24h after `readAt`.
 *
 * `inboxCount` is `items.length` — included for clarity in clients that
 * also want to render the total. The Prisma `where` keeps the unread
 * rows PLUS read rows whose `readAt` is still inside the retention
 * window, and `include.reads` is scoped to `userId` so we only ever
 * see the current user's read state (composite PK caps it at 1).
 */
export const listNotifications = async (userId, { limit } = {}) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { examTypeId: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const take = clampNotificationLimit(limit);
  const cutoff = readCutoff();

  const rows = await prisma.notification.findMany({
    where: {
      OR: [
        // Never read — always in the inbox.
        { reads: { none: { userId } } },
        // Read inside the retention window — still in the inbox.
        { reads: { some: { userId, readAt: { gte: cutoff } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      reads: {
        where:  { userId },
        select: { readAt: true },
        take: 1,
      },
    },
  });

  const scoped = filterNotificationsByExamScope(rows, user.examTypeId);
  const items  = scoped.map((n) => shapeInboxItem(n, n.reads[0] ?? null));
  return {
    items,
    unreadCount: countUnread(items),
    inboxCount:  items.length,
  };
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