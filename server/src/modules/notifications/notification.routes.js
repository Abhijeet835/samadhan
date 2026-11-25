import express from 'express';

import * as notificationController from './notification.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { rateLimit } from '../../middleware/rateLimit.middleware.js';
import { listNotificationsQuerySchema, notificationIdParamSchema } from './notification.schema.js';

const router = express.Router();
router.use(authenticate);

// Static routes before /:id.
router.get('/', rateLimit({ windowMs: 60_000, max: 120 }), validate(listNotificationsQuerySchema, 'query'), notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.post('/read-all', notificationController.readAll);
router.patch('/:id/read', validate(notificationIdParamSchema, 'params'), notificationController.read);

export default router;
