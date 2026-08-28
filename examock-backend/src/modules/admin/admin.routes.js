import express from "express";
import multer from "multer";
import { requireAuth, requireAdmin } from "../auth/auth.middlewares.js";
import {
  // Exam Types
  listExamTypes, createExamType, updateExamType, deleteExamType,
  // Subjects
  listSubjects, createSubject, updateSubject, deleteSubject,
  // Topics
  listTopics, createTopic, updateTopic, deleteTopic,
  // Videos
  listVideos, createVideo, updateVideo, deleteVideo,
  // YT Channels
  listYtChannels, createYtChannel, updateYtChannel, deleteYtChannel,
  // Questions
  listQuestions, createQuestion, bulkCreateQuestions, updateQuestion, deleteQuestion,
  // Mock Tests
  listMockTests, createMockTest, updateMockTest, deleteMockTest,
  addQuestionToTest, removeQuestionFromTest, reorderTestQuestions,
  // Notes
  listNotes, createNote, updateNote, deleteNote,
  // Users
  listUsers, getUserDetail, resetUserExamType,
  // Analytics
  getOverview, getTestAnalytics, getPaymentRecords,
  // Notifications
  listNotifications, broadcastNotification,
  getNoteDownloadUrl,
} from "./admin.controller.js";
import { getMockTestDetail } from "./admin.service.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// ── Exam Types ───────────────────────────────────────────────
router.get("/exam-types",          listExamTypes);
router.post("/exam-types",         createExamType);
router.patch("/exam-types/:id",    updateExamType);
router.delete("/exam-types/:id",   deleteExamType);

// ── Subjects ─────────────────────────────────────────────────
router.get("/subjects",            listSubjects);       // ?examTypeId=
router.post("/subjects",           createSubject);
router.patch("/subjects/:id",      updateSubject);
router.delete("/subjects/:id",     deleteSubject);

// ── Topics ───────────────────────────────────────────────────
router.get("/topics",              listTopics);         // ?subjectId=
router.post("/topics",             createTopic);
router.patch("/topics/:id",        updateTopic);
router.delete("/topics/:id",       deleteTopic);

// ── Questions ────────────────────────────────────────────────
router.get("/questions",           listQuestions);      // ?topicId= &page= &limit=
router.post("/questions",          createQuestion);
router.post("/questions/bulk",     bulkCreateQuestions);
router.patch("/questions/:id",     updateQuestion);
router.delete("/questions/:id",    deleteQuestion);

// ── Mock Tests ───────────────────────────────────────────────
router.get("/mock-tests",                              listMockTests);
router.get("/mock-tests/:id",                           getMockTestDetail);
router.post("/mock-tests",                             createMockTest);
router.patch("/mock-tests/:id",                        updateMockTest);
router.delete("/mock-tests/:id",                       deleteMockTest);
router.post("/mock-tests/:id/questions",               addQuestionToTest);
router.delete("/mock-tests/:id/questions/:qid",        removeQuestionFromTest);
router.patch("/mock-tests/:id/questions/reorder",      reorderTestQuestions);

// ── Notes ────────────────────────────────────────────────────
router.get("/notes",               listNotes);
router.post("/notes",              upload.single("file"), createNote);
router.patch("/notes/:id",         updateNote);
router.delete("/notes/:id",        deleteNote);
router.get("/notes/:id/download", getNoteDownloadUrl);

// ── Videos ───────────────────────────────────────────────────
router.get("/videos",              listVideos);         // ?topicId=
router.post("/videos",             createVideo);
router.patch("/videos/:id",        updateVideo);
router.delete("/videos/:id",       deleteVideo);

// ── YouTube Channels ─────────────────────────────────────────
router.get("/yt-channels",         listYtChannels);     // ?examTypeId=
router.post("/yt-channels",        createYtChannel);
router.patch("/yt-channels/:id",   updateYtChannel);
router.delete("/yt-channels/:id",  deleteYtChannel);

// ── Users ────────────────────────────────────────────────────
router.get("/users",               listUsers);          // ?examTypeId= &page= &limit=
router.get("/users/:id",           getUserDetail);
router.patch("/users/:id/reset-exam", resetUserExamType);

// ── Analytics ────────────────────────────────────────────────
router.get("/analytics/overview",  getOverview);
router.get("/analytics/tests",     getTestAnalytics);
router.get("/analytics/payments",  getPaymentRecords);

// ── Notifications ────────────────────────────────────────────
router.get("/notifications",       listNotifications);
router.post("/notifications",      broadcastNotification);

export default router;