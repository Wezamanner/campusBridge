/**
 * Rate Limiting Middleware — SEC-05
 *
 * Protects login, registration, and AI endpoints from brute-force and abuse.
 * Uses express-rate-limit with in-memory store (suitable for single-instance deployment;
 * swap store for Redis in multi-instance setup per NFR-05).
 */

import rateLimit from 'express-rate-limit';

/**
 * Login rate limiter — SEC-05
 * 10 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: false,
});

/**
 * Registration rate limiter — SEC-05
 * 5 registration attempts per hour per IP
 * Disabled in test environment to allow automated regression runs.
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' ? 0 : 5, // 0 = unlimited in test
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after 1 hour.',
  },
});

/**
 * AI endpoint rate limiter — SEC-05 / NFR-02
 * 30 AI requests per 10 minutes per authenticated user (uses IP as fallback)
 */
export const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?._id?.toString() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many AI requests. Please wait before making more requests.',
  },
});
