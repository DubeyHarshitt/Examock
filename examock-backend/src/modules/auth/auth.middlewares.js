import { verifyAccessToken } from "../../utils/jwt.js";
import prisma from "../../config/prisma.js";
import * as authService from "./auth.service.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyAccessToken(token); // { userId, email, role }
    next();
  } catch (err) {
    const expired = err?.name === "TokenExpiredError";
    return res.status(401).json({
      error: expired ? "Access token expired" : "Invalid access token",
      code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
}

// Attaches req.user when a valid Bearer token is present, but never rejects.
// Used by the public event-tracking endpoint (ticket 27), where logged-out
// traffic is expected and must still be recorded — just without a userId.
export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7));
    } catch {
      // Invalid or expired token → treat as an anonymous visitor.
    }
  }
  next();
}

export const getExamTypes = async (req, res) => {
  try {
    const examTypes = await authService.getAllExamTypes();

    res.status(200).json({
      success: true,
      examTypes,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch exam types",
    });
  }
};

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function requireOnboarded(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { examTypeId: true, mobileVerified: true },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (!user.examTypeId) {
      return res.status(403).json({
        error: "Please select your exam type to continue",
        code: "NEEDS_EXAM_SELECTION",
      });
    }
    // if (!user.mobileVerified) {
    //   return res.status(403).json({
    //     error: "Please verify your mobile number to continue",
    //     code: "NEEDS_MOBILE_VERIFICATION",
    //   });
    // }

    next();
  } catch (err) {
    next(err);
  }
}
