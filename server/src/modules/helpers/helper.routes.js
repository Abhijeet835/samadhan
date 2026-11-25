import express from 'express';

import * as helperController from './helper.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { rateLimit } from '../../middleware/rateLimit.middleware.js';
import {
  adminHelperPatchSchema,
  adminHelperQuerySchema,
  flagSchema,
  helperIdParamSchema,
  paginationQuerySchema,
  registerHelperSchema,
  reviewSchema,
  searchQuerySchema,
  updateHelperSchema,
} from './helper.schema.js';

const router = express.Router();

// Exported so tests can reset the per-IP buckets between cases.
export const searchRateLimiter = rateLimit({ windowMs: 60_000, max: 100 });
export const connectRateLimiter = rateLimit({ windowMs: 60_000, max: 20 });

// Static routes BEFORE /:helperId so the param never swallows them.
router.get('/meta', helperController.meta);
router.get('/search', searchRateLimiter, validate(searchQuerySchema, 'query'), helperController.search);
router.post('/', authenticate, validate(registerHelperSchema), helperController.register);
router.get('/me/dashboard', authenticate, validate(paginationQuerySchema, 'query'), helperController.dashboard);
router.patch('/me', authenticate, validate(updateHelperSchema), helperController.updateMe);
router.get('/mine/connected', authenticate, validate(paginationQuerySchema, 'query'), helperController.mineConnected);

router.param('helperId', (req, _res, next, value) => {
  try {
    helperIdParamSchema.parse({ helperId: value });
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/:helperId', optionalAuth, validate(paginationQuerySchema, 'query'), helperController.detail);
router.post('/:helperId/connect', authenticate, connectRateLimiter, helperController.connect);
router.post('/:helperId/review', authenticate, validate(reviewSchema), helperController.review);
router.post('/:helperId/flag', authenticate, validate(flagSchema), helperController.flag);

export default router;

// Minimal admin queue — full Admin UI expands in Phase 8.
export const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);
adminRouter.get('/', validate(adminHelperQuerySchema, 'query'), helperController.adminList);
adminRouter.patch('/:helperId', validate(helperIdParamSchema, 'params'), validate(adminHelperPatchSchema), helperController.adminPatch);
