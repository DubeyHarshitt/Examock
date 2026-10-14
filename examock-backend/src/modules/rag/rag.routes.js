import express from "express";
import { requireAuth } from "../auth/auth.middlewares.js";
import { handleChat, handleIngest } from "./rag.controller.js";
import {
  perUserLimiter,
  uploadPdfSingle,
  requireFile,
  validateChat,
} from "./rag.guards.js";

const router = express.Router();

// ── Cost caps (audit F4) ─────────────────────────────────────
// /chat   = 1 Gemini embedding + 1 generation + a Qdrant search
// /ingest = parse + one embedding PER CHUNK, so the pricier of the two
//
// Keyed per user and counting successful requests, so a single account cannot
// loop either endpoint. Both routes still require auth.
const chatBurstLimiter = perUserLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: "Too many AI requests. Please wait a few minutes.",
});

const chatDailyLimiter = perUserLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 h
  max: 100,
  message: "Daily AI limit reached. Try again tomorrow.",
});

const ingestDailyLimiter = perUserLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 h
  max: 10,
  message: "Daily upload limit reached. Try again tomorrow.",
});

router.post(
  "/ingest",
  requireAuth,
  ingestDailyLimiter,
  uploadPdfSingle,
  requireFile,
  handleIngest,
);

router.post(
  "/chat",
  requireAuth,
  chatBurstLimiter,
  chatDailyLimiter,
  validateChat,
  handleChat,
);

export default router;
