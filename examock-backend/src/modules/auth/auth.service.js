import prisma from "../../config/prisma.js";
import { verifyGoogleToken } from "./google.service.js";
import { issueTokenPair, verifyRefreshToken } from "../../utils/jwt.js";
import {
  generateOtp,
  hashOtp,
  isOtpExpired,
  otpExpiresAt,
  verifyOtp,
} from "../../utils/otp.js";
import { sendOtp } from "../../utils/sms.js";
import { AppError } from "../../utils/AppError.js";

// ─────────────────────────────────────────────────────────────
// 1. Google Login (idToken flow)
// ─────────────────────────────────────────────────────────────

export async function googleLogin(idToken) {
  const payload = await verifyGoogleToken(idToken);

  const user = await prisma.user.upsert({
    where:  { gmailId: payload.sub },
    update: { name: payload.name, avatarUrl: payload.picture },
    create: {
      gmailId:   payload.sub,
      email:     payload.email,
      name:      payload.name,
      avatarUrl: payload.picture,
    },
  });

  const token = issueTokenPair({
    userId: user.id,
    email:  user.email,
    role:   user.role,
  });

  return {
    token,
    user: {
      id:         user.id,
      email:      user.email,
      name:       user.name,
      avatarUrl:  user.avatarUrl,
      role:       user.role,
      examTypeId: user.examTypeId,
    },
    onboarding: {
      needsExamSelection:      !user.examTypeId,
      needsMobileVerification: !user.mobileVerified,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 2. Set exam type (once during onboarding, locked after)
// ─────────────────────────────────────────────────────────────

export async function setExamType(userId, examTypeId) {
  const user = await prisma.user.findFirstOrThrow({ where: { id: userId } });

  if (user.examTypeId) {
    throw new AppError("Exam type is already set and cannot be changed", 400);
  }

  const examType = await prisma.examType.findFirst({
    where: { id: examTypeId, isActive: true },
  });
  if (!examType) {
    throw new AppError("Invalid or inactive exam type", 404); 
  }

  await prisma.user.update({ where: { id: userId }, data: { examTypeId } });
  return examType;
}

// ─────────────────────────────────────────────────────────────
// 3. Send OTP
// ─────────────────────────────────────────────────────────────

export async function sendMobileOtp(userId, mobile) {
  const normalised = mobile.replace(/^\+?91/, "").replace(/\D/g, "");

  if (normalised.length !== 10) {
    throw new AppError("Invalid mobile number — must be 10 digits", 400);
  }

  const taken = await prisma.user.findFirst({
    where: { mobile: normalised, NOT: { id: userId } },
  });
  if (taken) {
    throw new AppError("This mobile number is already registered", 409);
  }

  await prisma.otpRecord.updateMany({
    where: { userId, verified: false },
    data:  { verified: true },
  });

  const otp    = generateOtp();
  const hashed = await hashOtp(otp);  

  await prisma.otpRecord.create({
    data: {
      userId,
      mobile:    normalised,
      otp:       hashed,
      expiresAt: otpExpiresAt(),
    },
  });

  const result = await sendOtp(normalised, otp);
  if (!result.success) throw new AppError(result.message, 502);

  return { message: "OTP sent successfully", mobile: normalised };
}

// ─────────────────────────────────────────────────────────────
// 4. Verify OTP
// ─────────────────────────────────────────────────────────────

export async function verifyMobileOtp(userId, mobile, otp) {
  const normalised = mobile.replace(/^\+?91/, "").replace(/\D/g, "");

  const record = await prisma.otpRecord.findFirst({
    where:   { userId, mobile: normalised, verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("No pending OTP found — please request a new one", 404);
  }

  if (isOtpExpired(record.expiresAt)) {
    throw new AppError("OTP has expired — please request a new one", 410); // 410 Gone
  }

  const isValid = await verifyOtp(otp, record.otp); 
  if (!isValid) {
    throw new AppError("Incorrect OTP", 401);
  }

  await prisma.otpRecord.update({
    where: { id: record.id },
    data:  { verified: true },
  });

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data:  { mobile: normalised, mobileVerified: true },
  });

  const tokens = issueTokenPair({
    userId: updatedUser.id,
    email:  updatedUser.email,
    role:   updatedUser.role,
  });

  return { message: "Mobile verified successfully", tokens };
}

// ─────────────────────────────────────────────────────────────
// 5. Refresh access token (with rotation)
// ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401); // 401 Unauthorized
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError("User not found", 404);          // 404 Not Found

  return issueTokenPair({ userId: user.id, email: user.email, role: user.role });
}