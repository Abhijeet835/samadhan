import express from 'express';

import * as adminController from './admin.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  adminIssuesQuerySchema, adminTransitionSchema, adminUsersQuerySchema, assignAuthoritySchema,
  auditQuerySchema, authorityReplySchema, dashboardQuerySchema, idParamSchema, issueIdParamSchema,
  patchCategoriesSchema, patchSettingsSchema, patchUserSchema, platformCreditSchema, userIdParamSchema,
} from './admin.schema.js';

const router = express.Router();
router.use(authenticate, requireAdmin);

// Issues moderation
router.get('/issues', validate(adminIssuesQuerySchema, 'query'), adminController.listIssues);
router.get('/issues/:issueId', validate(issueIdParamSchema, 'params'), adminController.getIssue);
router.post('/issues/:issueId/transition', validate(issueIdParamSchema, 'params'), validate(adminTransitionSchema), adminController.transition);
router.patch('/issues/:issueId/authority', validate(issueIdParamSchema, 'params'), validate(assignAuthoritySchema), adminController.assignAuthority);
router.post('/issues/:issueId/authority-reply', validate(issueIdParamSchema, 'params'), validate(authorityReplySchema), adminController.authorityReply);
router.post('/issues/:issueId/credit', validate(issueIdParamSchema, 'params'), validate(platformCreditSchema), adminController.credit);
router.post('/issues/:issueId/flags/dismiss', validate(issueIdParamSchema, 'params'), adminController.dismissFlags);

// Users
router.get('/users', validate(adminUsersQuerySchema, 'query'), adminController.listUsers);
router.get('/users/:userId', validate(userIdParamSchema, 'params'), adminController.getUser);
router.patch('/users/:userId', validate(userIdParamSchema, 'params'), validate(patchUserSchema), adminController.patchUser);

// Settings + categories
router.get('/settings', adminController.getSettings);
router.patch('/settings', validate(patchSettingsSchema), adminController.patchSettings);
router.get('/categories', adminController.getCategories);
router.patch('/categories', validate(patchCategoriesSchema), adminController.patchCategories);

// Dashboard + audit
router.get('/dashboard', validate(dashboardQuerySchema, 'query'), adminController.dashboard);
router.get('/audit', validate(auditQuerySchema, 'query'), adminController.listAudit);
router.get('/audit/actions', adminController.auditActions);

export default router;
