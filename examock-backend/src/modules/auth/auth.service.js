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

// ─────────────────────────────────────────────────────────────
// 1. Google Login (idToken flow)
// Frontend sends idToken → we verify → find/create user → issue tokens
// ─────────────────────────────────────────────────────────────

export async function googleLogin(idToken) {
  // Verify the idToken with Google — throws if invalid or expired
  const payload = await verifyGoogleToken(idToken);

  // Upsert — create on first login, update name/avatar on every login
  // Instead of If Else here is Update & Create

  const user = await prisma.user.upsert({
    where: { gmailId: payload.sub },
    update: { name: payload.name, avatarUrl: payload.picture },
    create: {
      gmailId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    },
  });

  const token = issueTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      examTypeId: user.examTypeId,
    },
    onboarding: {
      needsExamSelection: !user.examTypeId,
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
    throw new Error("Exam type is already set and cannot be changed");
  }

  const examType = await prisma.examType.findFirst({
    where: { id: examTypeId, isActive: true },
  });

  if (!examType) {
    throw new Error("Invalid or inactive exam type");
  }

  await prisma.user.update({ where: { id: userId }, data: { examTypeId } });

  return examType;
}

// ─────────────────────────────────────────────────────────────
// 3. Send OTP
// ─────────────────────────────────────────────────────────────

export async function sendMobileOtp(userId, mobile) {
  const normalised = mobile.replace(/^\+?91/, "").replace(/\D/g, "");

  if (normalised.length() !== 10) {
    throw new Error("Invalid mobile number — must be 10 digits");
  }

  // Check number isn't already taken by another user
  const taken = await prisma.user.findFirst({
    where: { mobile: normalised, NOT: { id: userId } },
  });
  if (taken) {
    throw new Error("This mobile number is already registered");
  }

  // Invalidate previous unused OTPs for this user
  await prisma.otpRecord.updateMany({
    where: { userId, verified: false },
    data: { verified: true },
  });

  // Generate, hash, store
  const otp = generateOtp();
  const hashed = hashOtp(otp);

  await prisma.otpRecord.create({
    data: {
      userId,
      mobile: normalised,
      otp: hashed,
      expiresAt: otpExpiresAt(),
    },
  });

  const result = await sendOtp(normalised, otp);
  if (!result.success) throw new Error(result.message);

  return { message: "OTP sent successfully", mobile: normalised };
}

// ─────────────────────────────────────────────────────────────
// 4. Verify OTP
// ─────────────────────────────────────────────────────────────

export async function verifyMobileOtp(userId, mobile, otp) {
  const normalised = mobile.replace(/^\+?91/, "").replace(/\D/g, "");

  // 1. Getting Latest Otp form otpRecord
  const record = await prisma.otpRecord.findFirst({
    where: { userId, mobile: normalised, verified: false },
    orderBy: { createdAt: "desc" }, // Picks latest created
  });

  if (!record) {
    throw newError("No pending OTP found — please request a new one");
  }

  // 2. Checking if Otp is expired
  if (isOtpExpired(record.expiresAt)) {
    throw new Error("OTP has expired — please request a new one");
  }

  // 3. Verify Otp
  const isValid = verifyOtp(otp, record.otp);
  if (!isValid) throw new Error("Incorrect OTP");

  // 4. Mark OTP as used
  await prisma.otpRecord.update({
    where: { id: userId },
    data: { verified: true },
  });

  // 5. Save mobile on user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { mobile: normalised, mobileVerified: true },
  });

  // 6. Issue tokens for Updated User
  const tokens = issueTokenPair({
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
  });

  return { message: "Mobile verified successfully", tokens };
}

// ─────────────────────────────────────────────────────────────
// 5. Refresh access token (with rotation)
// ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken) {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new Error('Invalid or expired refresh token')
  }
 
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) throw new Error('User not found')
 
  // Issue full new pair — old refresh token is now dead
  return issueTokenPair({ userId: user.id, email: user.email, role: user.role })
}