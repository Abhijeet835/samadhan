import { apiError } from '../utils/apiResponse.js';

/**
 * Simple in-memory per-IP sliding-window rate limiter (prototype scale).
 * Returns 429 RATE_LIMITED when the window budget is exhausted.
 */
export function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  const buckets = new Map();
  const limiter = (req, res, next) => {
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json(apiError('RATE_LIMITED', 'Too many requests. Please slow down.'));
    }
    return next();
  };
  // Test hook: clear all buckets between test cases.
  limiter.reset = () => buckets.clear();
  return limiter;
}
