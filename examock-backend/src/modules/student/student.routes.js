import { Router } from "express";
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

export default router;