import express from 'express';

import * as issueController from './issue.controller.js';
import * as socialController from '../social/social.controller.js';
import { trendingQuerySchema } from '../social/social.schema.js';
import { issueFlagSchema } from '../admin/admin.schema.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { rateLimit } from '../../middleware/rateLimit.middleware.js';
import {
  createIssueSchema,
  issueIdParamSchema,
  listIssuesQuerySchema,
  mapQuerySchema,
  paginationQuerySchema,
  resolveIssueSchema,
  supportIssueSchema,
  transitionIssueSchema,
  utilizationSchema,
} from './issue.schema.js';

const router = express.Router();

// Literal paths MUST be registered before "/:issueId" so the param route
// never swallows them.
router.get('/meta', issueController.getMeta);
router.get('/stats/locations', issueController.locationStats);
router.get('/stats/partners', issueController.partners);
router.get('/mine', authenticate, validate(paginationQuerySchema, 'query'), issueController.mine);
router.get(
  '/mine/supported',
  authenticate,
  validate(paginationQuerySchema, 'query'),
  issueController.mineSupported,
);
router.get('/trending', validate(trendingQuerySchema, 'query'), socialController.trending);
router.get('/map', rateLimit({ windowMs: 60_000, max: 60 }), validate(mapQuerySchema, 'query'), issueController.map);
router.get('/', validate(listIssuesQuerySchema, 'query'), issueController.list);
router.post('/', authenticate, validate(createIssueSchema), issueController.create);

router.param('issueId', (req, _res, next, value) => {
  try {
    issueIdParamSchema.parse({ issueId: value });
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/:issueId', optionalAuth, issueController.detail);
router.get('/:issueId/social', socialController.getIssuePosts);
router.post('/:issueId/support', authenticate, validate(supportIssueSchema), issueController.support);
router.get(
  '/:issueId/supporters',
  optionalAuth,
  validate(paginationQuerySchema, 'query'),
  issueController.supporters,
);
router.post('/:issueId/transition', authenticate, validate(transitionIssueSchema), issueController.transition);
router.post('/:issueId/resolve', authenticate, validate(resolveIssueSchema), issueController.resolveIssue);
router.post('/:issueId/utilization', authenticate, validate(utilizationSchema), issueController.addUtilization);
router.post('/:issueId/flag', authenticate, rateLimit({ windowMs: 60_000, max: 20 }), validate(issueFlagSchema), issueController.flag);

export default router;