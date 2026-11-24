import express from 'express';
import { z } from 'zod';

import * as dispatchController from './dispatch.controller.js';
import { DISPATCH_STATUSES } from './dispatchLog.model.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(DISPATCH_STATUSES).optional(),
  issueId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const logIdParamSchema = z.object({
  logId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid dispatch log id'),
});

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', validate(listQuerySchema, 'query'), dispatchController.list);
router.post('/:logId/retry', validate(logIdParamSchema, 'params'), dispatchController.retry);

export default router;
