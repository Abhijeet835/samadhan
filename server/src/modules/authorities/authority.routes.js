import express from 'express';

import * as authorityController from './authority.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  authorityIdParamSchema,
  createAuthoritySchema,
  updateAuthoritySchema,
} from './authority.schema.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', authorityController.list);
router.post('/', validate(createAuthoritySchema), authorityController.create);
router.patch('/:id', validate(authorityIdParamSchema, 'params'), validate(updateAuthoritySchema), authorityController.update);

export default router;
