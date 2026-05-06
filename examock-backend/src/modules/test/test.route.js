import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth, requireOnboarded } from "../auth/auth.middlewares.js";
import {
  listTests,
  getTest,
  startTestSession,
  fetchQuestion,
  answerQuestion,
  submitTestSession,
  fetchResult,
} from "./test.controller.js";

const router = Router();

// All test routes require a logged-in, fully onboarded user
router.use(requireAuth, requireOnboarded);

// ── Rate limiter ─────────────────────────────────────────────

const testActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please slow down." },
});

// ── Validation ───────────────────────────────────────────────

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }
  req.body = result.data;
  next();
};

const schemas = {
  answer: z.object({
    attemptId: z.string().uuid("Invalid attempt ID"),
    questionId: z.string().uuid("Invalid question ID"),
    selectedOption: z.enum(["A", "B", "C", "D"]).nullable(),
  }),

  submit: z.object({
    attemptId: z.string().uuid("Invalid attempt ID"),
  }),
};

// ── Routes ───────────────────────────────────────────────────

// List all tests (CHAPTER + MODULE + FULL, free + paid)
router.get("/", listTests);

// Single test details + access status
router.get("/:id", getTest);

// Start or resume test session → returns attemptId
// POST /tests/:id/start
router.post("/:id/start", testActionLimiter, startTestSession);

// Get one question by index
// GET /tests/:id/question?index=0&attemptId=uuid
router.get("/:id/question", fetchQuestion);

// Save answer on every option select
// POST /tests/:id/answer  { attemptId, questionId, selectedOption }
router.post("/:id/answer", validate(schemas.answer), answerQuestion);

// Submit and score the test
// POST /tests/:id/submit  { attemptId }
router.post(
  "/:id/submit",
  testActionLimiter,
  validate(schemas.submit),
  submitTestSession,
);

// Get result after completion
// GET /tests/:id/result?attemptId=uuid
router.get("/:id/result", fetchResult);

export default router;
