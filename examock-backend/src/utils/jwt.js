import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export function signAccessToken(payload){
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
        expiresIn: config.JWT_ACCESS_SECRET_EXPIRY ?? '10m',
    });
};

export function signRefreshToken(payload){
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
        expiresIn: config.JWT_REFRESH_SECRET_EXPIRY ?? '7d'
    });
}

export function verifyAccessToken(token){
    return jwt.verify(token, config.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token){
    return jwt.verify(token, config.JWT_REFRESH_SECRET);
}

export function issueTokenPair({ userId, email, role }) {
  return {
    accessToken:  signAccessToken({ userId, email, role }),
    refreshToken: signRefreshToken({ userId }),
  }
}