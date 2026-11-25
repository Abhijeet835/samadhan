import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import healthRoutes from './modules/health/health.routes.js';
import userRoutes from './modules/users/user.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import issueRoutes from './modules/issues/issue.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import authorityRoutes from './modules/authorities/authority.routes.js';
import dispatchRoutes from './modules/dispatch/dispatch.routes.js';
import { adminRouter as socialAdminRoutes, publicRouter as socialPublicRoutes } from './modules/social/social.routes.js';
import helperRoutes, { adminRouter as helperAdminRoutes } from './modules/helpers/helper.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import internalRoutes from './modules/internal/internal.routes.js';
import { ogPage } from './modules/social/og.controller.js';
import * as dispatchController from './modules/dispatch/dispatch.controller.js';
import { issueIdParamSchema } from './modules/issues/issue.schema.js';
import { authenticate } from './middleware/auth.middleware.js';
import { requireAdmin } from './middleware/role.middleware.js';
import { validate } from './middleware/validate.middleware.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

const allowedOrigins = env.clientUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, server-to-server) are allowed.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin/authorities', authorityRoutes);
app.use('/api/admin/dispatch', dispatchRoutes);
app.use('/api/admin/social', socialAdminRoutes);
app.use('/api/admin/helpers', helperAdminRoutes);
app.use('/api/social', socialPublicRoutes);
app.use('/api/helpers', helperRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/internal', internalRoutes);
// Public OG share page — deliberately NOT under /api.
app.get('/i/:id', ogPage);
app.post(
  '/api/admin/issues/:issueId/recheck-tiers',
  authenticate,
  requireAdmin,
  validate(issueIdParamSchema, 'params'),
  dispatchController.recheck,
);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
