import dotenv from "dotenv";
dotenv.config();

if (!process.env.PORT) {
  throw new Error("PORT is not defined");
}

if (!process.env.NODE_ENV) {
  throw new Error("NODE ENVis not defined");
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

if (!process.env.MSG91_TEMPLATE_ID) {
  throw new Error("MSG91 TEMPLATE ID is not defined");
}

if (!process.env.MSG91_SENDER_ID) {
  throw new Error("MSG91 SENDER ID is not defined");
}

if (!process.env.MSG91_AUTH_KEY) {
  throw new Error("MSG91 AUTH KEY is not defined");
}

const config = {
  PORT: Number(process.env.PORT),
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_URI: process.env.CLIENT_URI,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_SECRET_EXPIRY: process.env.JWT_ACCESS_SECRET_EXPIRY,
  JWT_REFRESH_SECRET_EXPIRY: process.env.JWT_REFRESH_SECRET_EXPIRY,
  MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID,
  MSG91_SENDER_ID: process.env.MSG91_SENDER_ID,
  MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
};

export default config;
