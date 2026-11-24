import express from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  switchModeSchema,
} from './user.schema.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), userController.register);
router.post('/login', validate(loginSchema), userController.login);
router.post('/refresh', userController.refresh);

// Protected routes
router.get('/me', authenticate, userController.getMe);
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile,
);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword,
);
router.post(
  '/switch-mode',
  authenticate,
  validate(switchModeSchema),
  userController.switchMode,
);

export default router;
