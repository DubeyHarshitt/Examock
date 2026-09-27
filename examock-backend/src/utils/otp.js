import bcrypt from "bcrypt";
import crypto from "crypto";
import config from "../config/config.js";

const OTP_LENGTH = 6;
const SALT_ROUNDS = 10;

// How long a generated OTP stays valid. Single source of truth: the email
// copy in utils/email.js quotes this, so the number the user reads and the
// number the server enforces can never drift apart.
export const OTP_TTL_MINUTES = 10;

// Generate a random 6 digit OTP string eg. "873452"
export function generateOtp() {
  const max = Math.pow(10, OTP_LENGTH);
  const otp =  crypto.randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
  // Never log the raw OTP in production. pm2 logs are readable by anyone with
  // shell access, and a logged OTP is enough to verify someone else's account.
  if (!config.isProduction) console.log("Generated OTP:", otp);
  return otp;
}

// Hashing the OTP before storing , should never stored raw
export async function hashOtp(otp) {
  return bcrypt.hash(otp, SALT_ROUNDS);
}

// Comparing raw OTP against stored hash
export async function verifyOtp(raw, hashed) {
  return bcrypt.compare(raw, hashed);
  // returns a Boolean
}

// Returns a Date mins from now
export function otpExpiresAt() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

// Returns true is OTP has expired
export function isOtpExpired(expiresAt) {
  return new Date() > expiresAt;
}