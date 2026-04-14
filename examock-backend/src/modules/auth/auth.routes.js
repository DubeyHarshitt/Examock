import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth } from "./auth.middlewares.js";
import {
  googleAuth,
  selectExamType,
  sendOtp,
  verifyOtp,
  refresh,
  logout,
} from "./auth.controller.js";

const router = Router();

// ── Rate limiters ────────────────────────────────────────────

const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { error: "Too many OTP requests. Please wait 10 minutes." },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: "Too many attempts. Please wait 10 minutes." },
});

// ── Validation middleware ────────────────────────────────────

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }
  req.body = result.data;
  next();
};

const schemas = {
  googleAuth: z.object({
    idToken: z.string().min(1, "idToken is required"),
  }),

  examType: z.object({
    examTypeId: z.string().uuid("Invalid exam type ID"),
  }),

  sendOtp: z.object({
    mobile: z
      .string()
      .regex(/^(\+?91)?[6-9]\d{9}$/, "Invalid Indian mobile number"),
  }),

  verifyOtp: z.object({
    mobile: z
      .string()
      .regex(/^(\+?91)?[6-9]\d{9}$/, "Invalid Indian mobile number"),
    otp: z
      .string()
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must be numeric"),
  }),
};

// ── Routes ───────────────────────────────────────────────────

// Frontend sends idToken → backend verifies → returns JWT
router.post("/google", validate(schemas.googleAuth), googleAuth);

// Onboarding — lock in exam type
router.post(
  "/exam-type",
  requireAuth,
  validate(schemas.examType),
  selectExamType,
);

// Onboarding — send OTP
router.post(
  "/otp/send",
  requireAuth,
  otpSendLimiter,
  validate(schemas.sendOtp),
  sendOtp,
);

// Onboarding — verify OTP
router.post(
  "/otp/verify",
  requireAuth,
  otpVerifyLimiter,
  validate(schemas.verifyOtp),
  verifyOtp,
);

// Silent token refresh using httpOnly cookie
router.post("/refresh", refresh);

// Logout — clears cookie
router.post("/logout", logout);

export default router;
