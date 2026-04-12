import {
  googleLogin,
  refreshAccessToken,
  sendMobileOtp,
  setExamType,
  verifyMobileOtp,
} from "./auth.service.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─────────────────────────────────────────────────────────────
// POST /auth/google
// Frontend sends idToken from Google → we verify → return tokens
// ─────────────────────────────────────────────────────────────

export async function googleAuth(req, res, next) {
  try {
    const result = await googleLogin(req.body.idToken);

    // Refresh token → secure httpOnly cookie
    res.cookie("refreshToken", result.token.refreshToken, COOKIE_OPTIONS);

    // Access token + user + onboarding state → response body
    res.json({
      accessToken: result.token.accessToken,
      user: result.user,
      onboarding: result.onboarding,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /auth/exam-type
// Lock in exam type during onboarding (called once)
// ─────────────────────────────────────────────────────────────

export async function selectExamType(req, res, next) {
  try {
    const examType = await setExamType(req.user.userId, req.body.examTypeId);
    res.json({ message: "Exam type set successfully", examType });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /auth/otp/send
// Send OTP to user's mobile via MSG91
// ─────────────────────────────────────────────────────────────

export async function sendOtp(req, res, next) {
  try {
    const result = await sendMobileOtp(req.user.userId, req.body.mobile);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /auth/otp/verify
// Verify OTP and complete mobile verification
// ─────────────────────────────────────────────────────────────

export async function verifyOtp(req, res, next) {
  try {
    const result = await verifyMobileOtp(
      req.user.userId,
      req.body.mobile,
      req.body.otp,
    );

    // Rotate refresh token cookie
    res.cookie("refreshToken", result.tokens.refreshToken, COOKIE_OPTIONS);

    res.json({
      message: result.message,
      accessToken: result.tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /auth/refresh
// Get new access token using httpOnly cookie (with rotation)
// ─────────────────────────────────────────────────────────────

export async function refresh(req, res, next) {
  const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
  if (!token) return res.status(401).json({ error: "Refresh token missing" });

  try {
    const result = await refreshAccessToken(token);

    // Rotate — replace old cookie with new refresh token
    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    res.json({ accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /auth/logout
// Clear the refresh token cookie
// ─────────────────────────────────────────────────────────────

export function logout(req, res) {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
}
