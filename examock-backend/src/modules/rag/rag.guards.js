// src/modules/rag/rag.guards.js
//
// Request guards for the RAG endpoints (audit F4: the LLM routes had no spend
// cap, no body schema and no upload limits).
//
// Deliberately pure — no config / prisma / pipeline imports — so it is
// unit-testable in CI without env vars. Importing rag.routes.js instead would
// pull in the pipelines, which build the Gemini client and Prisma at import
// time and throw when config.js sees no NODE_ENV.

import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../../utils/AppError.js";

// ── Rate limiting ────────────────────────────────────────────
// Keyed by authenticated user so one account on a shared/campus IP can't lock
// everyone else out; anonymous traffic falls back to an IPv6-safe IP key.
//
// Crucially these COUNT successful requests — unlike the global limiter in
// index.js (skipSuccessfulRequests: true), under which every successful Gemini
// call was invisible, i.e. unlimited.

export const userKey = (req) => req.user?.userId ?? ipKeyGenerator(req.ip);

/** A per-user limiter that counts both successful and failed requests. */
export const perUserLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: userKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

// ── Upload guard ─────────────────────────────────────────────
// PDF only, 25 MB, single file — mirrors admin.routes.js:98-116. The previous
// `multer({ dest })` accepted any MIME type at any size, i.e. unbounded disk
// usage plus one embedding call per chunk.
export const PDF_MAX_BYTES = 25 * 1024 * 1024;

export const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new AppError("Only PDF files are allowed (got " + file.mimetype + ")", 400));
  }
  cb(null, true);
};

export const uploadPdf = multer({
  dest: "uploads/",
  limits: { fileSize: PDF_MAX_BYTES, files: 1 },
  fileFilter: pdfFileFilter,
});

export const uploadPdfSingle = (req, res, next) => {
  uploadPdf.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("PDF must be 25 MB or smaller", 413));
    }
    next(err);
  });
};

// multer does NOT error when the field is simply absent, so `req.file` can be
// undefined — the controller dereferenced `req.file.path` and turned a missing
// file into a 500.
export const requireFile = (req, res, next) => {
  if (!req.file) return next(new AppError("A PDF file is required.", 400));
  next();
};

// ── Validation ───────────────────────────────────────────────

export const CHAT_QUESTION_MAX = 2000;

export const chatSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Question is required.")
    .max(CHAT_QUESTION_MAX, `Question is too long (max ${CHAT_QUESTION_MAX} characters).`),
});

export const validateChat = (req, res, next) => {
  const result = chatSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }
  req.body = result.data;
  next();
};
