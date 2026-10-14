import * as studentService from "./student.service.js";

const handle = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Coerce a query-string value to a number (or undefined) for limit-style
// params. Empty / non-numeric → undefined so the service treats it as "no
// limit" → capped at MAX.
const parseLimit = (v) => {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export const getDashboard = handle((req) =>
  studentService.getDashboard(req.user.userId),
);
export const getSubjects = handle((req) =>
  studentService.getSubjects(req.user.userId),
);
export const getTopics = handle((req) =>
  studentService.getTopics(req.user.userId, req.query.subjectId),
);
export const getVideos = handle((req) => studentService.getVideos(req.user.userId, req.query));
export const getNotes = handle((req) =>
  studentService.getNotes(req.user.userId, req.query),
);
export const getNoteById = handle((req) =>
  studentService.getNoteById(req.params.id),
);
export const getYtChannels = handle((req) =>
  studentService.getYtChannels(req.user.userId),
);
export const getProgress = handle((req) =>
  studentService.getProgress(req.user.userId),
);
export const getTopicProgress = handle((req) =>
  studentService.getTopicProgress(req.user.userId, req.params.topicId),
);
export const getAttempts = handle((req) =>
  studentService.getAttempts(req.user.userId, {
    page: parseLimit(req.query.page),
    pageSize: parseLimit(req.query.pageSize),
  }),
);

// ── Ticket 01: student notifications ────────────────────────────

export const listNotifications = handle((req) =>
  studentService.listNotifications(req.user.userId, { limit: parseLimit(req.query.limit) }),
);

// ── Ticket 11: batch mark-as-read ──────────────────────────────
//
// Returns a small JSON body (200) instead of 204 because the controller
// helper `handle()` always calls `res.json(result)` — see student.controller.js:3-10.

export const markNotificationsRead = handle(async (req) => {
  const marked = await studentService.markNotificationsRead(
    req.user.userId,
    req.body.ids,
  );
  return { success: true, marked };
});

export const changeExamType = handle((req) =>
  studentService.changeExamType(req.user.userId, req.body.examTypeId),
);

export const toggleVideoWatched = handle((req) =>
  studentService.toggleVideoWatched(req.user.userId, req.params.videoId),
);
