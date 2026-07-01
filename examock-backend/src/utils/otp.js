import bcrypt from "bcrypt";
import crypto from "crypto";

const OTP_LENGTH = 6;
const SALT_ROUNDS = 10;

// Generate a random 6 digit OTP string eg. "873452"
export function generateOtp() {
  const max = Math.pow(10, OTP_LENGTH);
  const otp =  crypto.randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
  console.log("Generated OTP:", otp); // For debugging, remove in production
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
  return new Date(Date.now() + 5 * 60 * 1000);
}

// Returns true is OTP has expired
export function isOtpExpired(expiresAt) {
  return new Date() > expiresAt;
}