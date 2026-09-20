import dotenv from "dotenv";
dotenv.config();

const rawNodeEnv = process.env.NODE_ENV;

if (!rawNodeEnv) {
  throw new Error("NODE ENV is not defined");
}

// Normalize "prod" → "production" so a host's NODE_ENV setting can never
// silently toggle secure cookies or real SMS off/on inconsistently
// (see auth.controller.js and utils/sms.js — they must agree on one value).
const NODE_ENV = rawNodeEnv === "prod" ? "production" : rawNodeEnv;
const isProduction = NODE_ENV === "production";

if (!process.env.PORT) {
  throw new Error("PORT is not defined");
}

if (!process.env.CLIENT_URI) {
  throw new Error("CLIENT URL is not defined");
}

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE CLIENT ID is not defined");
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE CLIENT SECRET is not defined");
}

if (!process.env.GOOGLE_REDIRECT_URI) {
  throw new Error("GOOGLE REDIRECT URI is not defined");
}

if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error("JWT ACCESS SECRET is not defined");
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT REFRESH SECRETis not defined");
}

if (!process.env.JWT_ACCESS_SECRET_EXPIRY) {
  throw new Error("JWT ACCESS SECRET EXPIRY is not defined");
}

if (!process.env.JWT_REFRESH_SECRET_EXPIRY) {
  throw new Error("JWT REFRESH SECRET EXPIRY is not defined");
}

// ── OTP delivery channel ─────────────────────────────────────
// "console" → OTP printed to the server log (dev/tests, no credentials)
// "email"   → Gmail SMTP via nodemailer (needs GMAIL_USER + GMAIL_APP_PASSWORD)
// "sms"     → MSG91 (currently paused — the phone flow is commented out)
const OTP_DELIVERY = process.env.OTP_DELIVERY || "console";
if (!["console", "email", "sms"].includes(OTP_DELIVERY)) {
  throw new Error("OTP_DELIVERY must be one of: console, email, sms");
}

if (OTP_DELIVERY === "email") {
  if (!process.env.GMAIL_USER) {
    throw new Error("GMAIL_USER is required when OTP_DELIVERY=email");
  }
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error(
      "GMAIL_APP_PASSWORD is required when OTP_DELIVERY=email " +
        "(enable 2FA, then create one at https://myaccount.google.com/apppasswords)",
    );
  }
}

// MSG91 is only needed when the SMS channel is active (currently disabled —
// keep the MSG91_* vars for when OTP_DELIVERY=sms is re-enabled).
if (OTP_DELIVERY === "sms") {
  if (!process.env.MSG91_TEMPLATE_ID) {
    throw new Error("MSG91 TEMPLATE ID is required when OTP_DELIVERY=sms");
  }

  if (!process.env.MSG91_SENDER_ID) {
    throw new Error("MSG91 SENDER ID is required when OTP_DELIVERY=sms");
  }

  if (!process.env.MSG91_AUTH_KEY) {
    throw new Error("MSG91 AUTH KEY is required when OTP_DELIVERY=sms");
  }
}

if (!process.env.QDRANT_URL){
  throw new Error("QDRANT URL is not defined")
}

if (!process.env.QDRANT_API_KEY){
  throw new Error("QDRANT Api Key is not defined")
}

if (!process.env.GEMINI_API_KEY){
  throw new Error("GEMINI Api Key is not defined")
}

if (!process.env.CLOUDINARY_CLOUD_NAME){
  throw new Error("CLOUDINARY CLOUD NAME is not defined")
}

if (!process.env.CLOUDINARY_API_KEY){
  throw new Error("CLOUDINARY API KEY is not defined")
}

if (!process.env.CLOUDINARY_API_SECRET){
  throw new Error("CLOUDINARY API SECRET is not defined")
}

if (!process.env.DATABASE_URL){
  throw new Error("DATABASE URL is not defined")
}

// Session-mode Postgres used by pg-boss (LISTEN/NOTIFY + advisory locks don't
// work over the transaction pooler `?pgbouncer=true`, which is DATABASE_URL).
if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is not defined (session-mode Postgres for pg-boss)");
}

const config = {
  PORT: Number(process.env.PORT),
  NODE_ENV,
  isProduction,
  CLIENT_URI: process.env.CLIENT_URI,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_SECRET_EXPIRY: process.env.JWT_ACCESS_SECRET_EXPIRY,
  JWT_REFRESH_SECRET_EXPIRY: process.env.JWT_REFRESH_SECRET_EXPIRY,
  OTP_DELIVERY,
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID,
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID,
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
  QDRANT_URL: process.env.QDRANT_URL,
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
};

export default config;
