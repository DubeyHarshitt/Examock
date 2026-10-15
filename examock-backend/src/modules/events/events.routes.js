// src/modules/events/events.routes.js
import express from "express";
import {
  requireAuth,
  requireAdmin,
  optionalAuth,
} from "../auth/auth.middlewares.js";
import { perUserLimiter } from "../rag/rag.guards.js";
import { track, summary } from "./events.controller.js";

const router = express.Router();

// Tracking is cheap but public, so cap it well above real UX (a page view plus
// a handful of funnel events per navigation) while still bounding abuse. Keyed
// per user when logged in, per IP otherwise.
const trackLimiter = perUserLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many events.",
});

router.post("/", optionalAuth, trackLimiter, track);
router.get("/summary", requireAuth, requireAdmin, summary);

export default router;
