import express from "express";
import multer from "multer";
import { z } from "zod";
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
  uploadQuestionImage, destroyQuestionImage,
  importCsvToTest, importCsvToBank,
  // PDF ingestion (ticket 09)
  importTestPdf, getTestPdfImport,
  // Mock Tests
  listMockTests, createMockTest, updateMockTest, deleteMockTest,
  activateMockTest,
  addQuestionToTest, removeQuestionFromTest, reorderTestQuestions,
  getMockTestDetail,
  // Exams tree + test lifecycle (ticket 05)
  listExams, getExamDetail, duplicateMockTest, archiveMockTest, restoreMockTest,
  // Paper-grid rows (ticket 06)
  createTestWithQuestions, bulkAddQuestions,
  // Notes
  listNotes, createNote, updateNote, deleteNote,
  // Users
  listUsers, getUserDetail, getUserAttempts, getUserAttemptDetail, resetUserExamType,
  // Analytics
  getOverview, getTestAnalytics, getPaymentRecords,
  // Notifications
  listNotifications, broadcastNotification, deleteNotification,
  getNoteDownloadUrl,
} from "./admin.controller.js";
import { rowsSchema } from "./lib/rows.js";
import { AppError } from "../../utils/AppError.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Image uploads (ticket 07) — unlike the PDF/doc uploads, this one refuses
// non-images and enforces a 5 MB cap instead of silently accepting anything.
const uploadImage = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new AppError("Only image files are allowed (got " + file.mimetype + ")", 400));
    }
    cb(null, true);
  },
});
// Maps multer's error codes to useful HTTP statuses (the global handler would
// otherwise turn LIMIT_FILE_SIZE into a 500).
const uploadImageSingle = (req, res, next) => {
  uploadImage.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("Image must be 5 MB or smaller", 413));
    }
    next(err);
  });
};

// CSV uploads (ticket 08) — same discipline as images: size cap + fileFilter.
// Accept text/csv plus Excel's legacy mime type and a .csv extension fallback
// (some platforms send application/octet-stream for .csv files).
const uploadCsv = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const csvMime = ["text/csv", "application/csv", "application/vnd.ms-excel"].includes(file.mimetype);
    if (!csvMime && !/\.csv$/i.test(file.originalname)) {
      return cb(new AppError("Only CSV files are allowed (got " + file.mimetype + ")", 400));
    }
    cb(null, true);
  },
});
const uploadCsvSingle = (req, res, next) => {
  uploadCsv.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("CSV file must be 5 MB or smaller", 413));
    }
    next(err);
  });
};

// PDF ingestion upload (ticket 09) — strict: application/pdf only, 25 MB cap,
// single file. The page-count and scanned-text checks happen AFTER parse in
// the worker — pdf-parse gives no page count before reading the file.
const uploadPdf = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new AppError("Only PDF files are allowed (got " + file.mimetype + ")", 400));
    }
    cb(null, true);
  },
});
const uploadPdfSingle = (req, res, next) => {
  uploadPdf.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("PDF must be 25 MB or smaller", 413));
    }
    next(err);
  });
};

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// ── Validation ───────────────────────────────────────────────
// The admin module had zero schema validation before ticket 03 — guards were
// ad-hoc `if (!x) throw` checks and `PATCH /mock-tests/:id` was a raw
// pass-through of the body straight into Prisma. Same validate(schema)
// factory pattern as test.route.js:30-49, but rejects with field-level
// messages for every failing field.

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid request body",
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  req.body = result.data;
  next();
};

// "" ⇒ null (legacy forms send "" for "no subject"); absent stays absent so
// PATCH partial bodies never wipe a field that wasn't sent.
const subjectIdField = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid("subjectId must be a valid uuid").nullable().optional(),
);

// JSON bodies carry real booleans; tolerate "true"/"false" strings from forms.
const booleanish = z.preprocess(
  (value) => (value === "true" ? true : value === "false" ? false : value),
  z.boolean("must be a boolean"),
);

const mockTestBody = {
  examTypeId: z.string().uuid("examTypeId must be a valid uuid"),
  title: z.string().trim().min(1, "title is required").max(300, "title is too long"),
  subjectId: subjectIdField,
  durationMins: z.coerce.number().int("durationMins must be an integer").min(1, "durationMins must be at least 1"),
  totalMarks: z.coerce.number().int("totalMarks must be an integer").min(1, "totalMarks must be at least 1"),
  defaultMarks: z.coerce.number().int("defaultMarks must be an integer").min(1, "defaultMarks must be at least 1").optional(),
  defaultNegMarks: z.coerce.number().min(0, "defaultNegMarks cannot be negative").optional(),
  isFree: booleanish.optional(),
  instructions: z.string().optional(),
  // legacy fields the old form still sends: topicId is honoured (resolved to
  // its subject), `type` is stripped by the schema — the taxonomy is gone.
  topicId: z.string().uuid("topicId must be a valid uuid").optional(),
};

const createMockTestSchema = z.object(mockTestBody);
// `isActive` is deliberately NOT here: publishing is gated exclusively by
// POST /tests/:id/activate (the 5-step gate) and POST /tests/:id/restore.
// A PATCH-carried `isActive` would let a client bypass the gate (bug 07).
const updateMockTestSchema = z.object(mockTestBody).partial();

// ── Paper-grid rows (ticket 06) ──────────────────────────────
// The draft-row union from lib/rows.js: "new" (typed/pasted/imported) and
// "ref" (add-from-bank) rows. Reused by the atomic create and the bulk append.
const withQuestionsSchema = z.object({
  ...mockTestBody,
  rows: rowsSchema.optional(), // rows supplied ⇒ atomic save (no 0-question state)
});
const bulkRowsSchema = z.object({ rows: rowsSchema });

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
router.post("/questions/image",    uploadImageSingle, uploadQuestionImage); // multipart, field: "image" (ticket 07)
router.post("/questions/image/destroy", destroyQuestionImage); // body: { publicId } — remove/replace slot (ticket 07)
router.post("/questions/import-csv", uploadCsvSingle, importCsvToBank); // multipart: topicId + file (ticket 08)
router.patch("/questions/:id",     updateQuestion);
router.delete("/questions/:id",    deleteQuestion);

// ── Mock Tests ───────────────────────────────────────────────
router.get("/mock-tests",                              listMockTests);
router.get("/mock-tests/:id",                           getMockTestDetail);
router.post("/mock-tests",                validate(createMockTestSchema), createMockTest);
router.patch("/mock-tests/:id",           validate(updateMockTestSchema), updateMockTest);
router.delete("/mock-tests/:id",                       deleteMockTest);
router.post("/mock-tests/:id/activate",                activateMockTest);
router.post("/mock-tests/:id/questions",               addQuestionToTest);
router.delete("/mock-tests/:id/questions/:qid",        removeQuestionFromTest);
router.patch("/mock-tests/:id/questions/reorder",      reorderTestQuestions);

// ── Exams tree (ticket 05) ──────────────────────────────────
// New content-tree surface: active exams + per-exam detail with subjects and
// whole-exam test count. The legacy /exam-types management surface above is
// untouched (it must still list inactive exams for reactivation).
router.get("/exams",                                   listExams);
router.get("/exams/:examId",                           getExamDetail);

// ── Tests (ticket 05) ───────────────────────────────────────
// The content-tree alias of /mock-tests with the ticket's lifecycle actions:
// duplicate (metadata only), archive and restore.
router.get("/tests",                                   listMockTests);
router.get("/tests/:id",                               getMockTestDetail);
router.post("/tests",                    validate(createMockTestSchema), createMockTest);
router.patch("/tests/:id",               validate(updateMockTestSchema), updateMockTest);
router.post("/tests/:id/activate",                     activateMockTest);
router.post("/tests/:id/duplicate",                    duplicateMockTest);
router.post("/tests/:id/archive",                      archiveMockTest);
router.post("/tests/:id/restore",                      restoreMockTest);
// Paper-grid surface (ticket 06): atomic create with rows, bulk append, and
// the reorder endpoint — implemented since ticket 02 but previously unused.
router.post("/tests/with-questions",   validate(withQuestionsSchema), createTestWithQuestions);
router.post("/tests/:id/questions/bulk", validate(bulkRowsSchema), bulkAddQuestions);
router.patch("/tests/:id/questions/reorder", reorderTestQuestions);
router.post("/tests/:id/import/csv",   uploadCsvSingle, importCsvToTest); // multipart, field: "file" (ticket 08)
// PDF ingestion (ticket 09): multipart, field "file" → 202 + PENDING row; the
// worker parses off the HTTP path. GET /pdf-imports/:id polls the result.
router.post("/tests/:id/import/pdf",   uploadPdfSingle, importTestPdf);
router.get("/pdf-imports/:id",         getTestPdfImport);
// Row delete for the grid (bulk "delete" action). Same service as the legacy
// /mock-tests surface — the link row is removed, the bank question is kept.
router.delete("/tests/:id/questions/:qid", removeQuestionFromTest);

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
router.get("/users/:id/attempts",  getUserAttempts);    // ?page= &limit= &status=
router.get("/users/:id/attempts/:attemptId", getUserAttemptDetail);
router.patch("/users/:id/reset-exam", resetUserExamType);

// ── Analytics ────────────────────────────────────────────────
router.get("/analytics/overview",  getOverview);
router.get("/analytics/tests",     getTestAnalytics);
router.get("/analytics/payments",  getPaymentRecords);

// ── Notifications ────────────────────────────────────────────
router.get("/notifications",             listNotifications);
router.post("/notifications",            broadcastNotification);
router.delete("/notifications/:id",      deleteNotification);

export default router;