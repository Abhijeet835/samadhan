import express from 'express';

import * as issueController from './issue.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createIssueSchema,
  issueIdParamSchema,
  listIssuesQuerySchema,
  transitionIssueSchema,
} from './issue.schema.js';

const router = express.Router();

router.get('/meta', issueController.getMeta);
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
router.post('/:issueId/transition', authenticate, validate(transitionIssueSchema), issueController.transition);

export default router;