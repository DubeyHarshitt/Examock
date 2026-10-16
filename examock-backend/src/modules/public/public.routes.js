// src/modules/public/public.routes.js — PUBLIC, unauthenticated reads for the
// SEO pages (ticket 24).
//
// ⚠️ This router is mounted with NO auth middleware — by design, and only for
// what you see below: active-only, field-stripped, read-only taxonomy. Never
// add mutations, user-scoped data, or question/answer payloads here; anything
// non-public belongs behind requireAuth (+ requireAdmin where appropriate).
//
// Rate limit: generous but bounded, keyed per user or IP (rag.guards pattern).
// Cache: 5 minutes at the edge/browser so crawler bursts are cheap — taxonomy
// changes are rare and a few minutes of staleness is acceptable for public
// pages (admins should expect edits to appear within ~5 min).
import express from "express";
import { perUserLimiter } from "../rag/rag.guards.js";
import {
  listExamTypes,
  getSyllabus,
  getSubject,
  getTopic,
} from "./public.controller.js";

const router = express.Router();

const publicReadLimiter = perUserLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many requests.",
});

router.use(publicReadLimiter);
router.use((req, res, next) => {
  res.set("Cache-Control", "public, max-age=300");
  next();
});

router.get("/exam-types", listExamTypes);
router.get("/exam-types/:examSlug", getSyllabus);
router.get("/exam-types/:examSlug/subjects/:subjectSlug", getSubject);
router.get(
  "/exam-types/:examSlug/subjects/:subjectSlug/topics/:topicSlug",
  getTopic,
);

export default router;
