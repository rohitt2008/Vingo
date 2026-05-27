import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * General API rate limiter — 100 requests per 15 minutes per IP (100,000 in dev).
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 100000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Strict rate limiter for auth endpoints — 10 requests per 15 minutes per IP (100,000 in dev).
 * Prevents brute-force login/signup attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

/**
 * OTP rate limiter — 3 requests per 5 minutes (100,000 in dev).
 */
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 100000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 5 minutes.',
  },
});
