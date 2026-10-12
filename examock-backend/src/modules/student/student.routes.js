import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireOnboarded } from "../auth/auth.middlewares.js";
import {
  getDashboard,
  getSubjects,
  getTopics,
  getVideos,
  getNotes,
  getNoteById,
  getYtChannels,
  getProgress,
  getTopicProgress,
  listNotifications,
  markNotificationsRead,
  changeExamType,
  toggleVideoWatched,
} from "./student.controller.js";

const router = Router();

// All student routes require auth + fully onboarded
router.use(requireAuth, requireOnboarded);

router.get("/dashboard",          getDashboard);
router.get("/subjects",           getSubjects);
router.get("/topics",             getTopics);        // ?subjectId=
router.get("/videos",             getVideos);        // ?topicId= or ?subjectId=
router.get("/notes",              getNotes);         // ?topicId= or ?subjectId=
router.get("/notes/:id",          getNoteById);
router.get("/yt-channels",        getYtChannels);
router.get("/progress",           getProgress);
router.get("/progress/:topicId",  getTopicProgress);

// ── Ticket 01: student notifications ────────────────────────────

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }
  req.body = result.data;
  next();
};

const changeExamTypeSchema = z.object({
  examTypeId: z.string().uuid(),
});

// ── Ticket 11: mark notifications as read ─────────────────────
// Cap of 200 ids covers the popover (3) + inbox page (50) use cases and
// bounds a single request to a reasonable size.
const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

router.get("/notifications",                       listNotifications);
router.post("/notifications/read", validate(markReadSchema), markNotificationsRead);
router.post("/me/exam-type",     validate(changeExamTypeSchema), changeExamType);
router.post("/videos/:videoId/watched",            toggleVideoWatched);

export default router;