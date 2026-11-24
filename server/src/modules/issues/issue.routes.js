import express from 'express';

import * as issueController from './issue.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createIssueSchema,
  issueIdParamSchema,
  listIssuesQuerySchema,
  paginationQuerySchema,
  supportIssueSchema,
  transitionIssueSchema,
} from './issue.schema.js';

const router = express.Router();

// Literal paths MUST be registered before "/:issueId" so the param route
// never swallows them.
router.get('/meta', issueController.getMeta);
router.get('/mine', authenticate, validate(paginationQuerySchema, 'query'), issueController.mine);
router.get(
  '/mine/supported',
  authenticate,
  validate(paginationQuerySchema, 'query'),
  issueController.mineSupported,
);
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
router.post('/:issueId/support', authenticate, validate(supportIssueSchema), issueController.support);
router.get(
  '/:issueId/supporters',
  optionalAuth,
  validate(paginationQuerySchema, 'query'),
  issueController.supporters,
);
router.post('/:issueId/transition', authenticate, validate(transitionIssueSchema), issueController.transition);

export default router;