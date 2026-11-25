import express from 'express';
import * as socialController from './social.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  issueIdParamSchema,
  listPostsQuerySchema,
  postIdParamSchema,
  settingsSchema,
  takedownSchema,
} from './social.schema.js';
import { apiError } from '../../utils/apiResponse.js';

// Simple IP-scoped fixed-window rate limiter for public click tracking.
const clickBuckets = new Map();
function clickRateLimit(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const max = 60;
  const entry = clickBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    clickBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }
  entry.count += 1;
  if (entry.count > max) {
    return res.status(429).json(apiError('RATE_LIMITED', 'Too many requests, please try again shortly.'));
  }
  return next();
}

// Public routes
export const publicRouter = express.Router();

publicRouter.get(
  '/issues/:issueId/social',
  validate(issueIdParamSchema, 'params'),
  socialController.getIssuePosts,
);
publicRouter.post(
  '/:postId/click',
  clickRateLimit,
  validate(postIdParamSchema, 'params'),
  socialController.clickPost,
);

// Admin routes
export const adminRouter = express.Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.param('postId', (req, _res, next, value) => {
  try {
    postIdParamSchema.parse({ postId: value });
    next();
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/', validate(listPostsQuerySchema, 'query'), socialController.listPosts);
adminRouter.post('/:postId/publish', socialController.publishPost);
adminRouter.post('/:postId/retry', socialController.retryPost);
adminRouter.post('/:postId/regenerate', socialController.regeneratePost);
adminRouter.post('/:postId/takedown', validate(takedownSchema), socialController.takedownPost);
adminRouter.patch('/settings', validate(settingsSchema), socialController.updateSettings);
