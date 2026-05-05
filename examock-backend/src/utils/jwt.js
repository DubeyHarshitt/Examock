import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/config.js';

// ── Sign / Verify ────────────────────────────────────────────

export function signAccessToken(payload) {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_SECRET_EXPIRY ?? '10m',
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_SECRET_EXPIRY ?? '7d',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET);
}

// ── Issue a token pair ───────────────────────────────────────

export function issueTokenPair({ userId, email, role }) {
  return {
    accessToken:  signAccessToken({ userId, email, role }),
    refreshToken: signRefreshToken({ userId }),
  };
}

// ── Hash a refresh token for DB storage ──────────────────────
// SHA-256 is fine here — the token itself is the secret,
// we just need a one-way fingerprint to compare against.

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}