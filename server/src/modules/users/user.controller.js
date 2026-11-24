import * as userService from './user.service.js';
import { apiSuccess, apiError } from '../../utils/apiResponse.js';
import { verifyToken } from '../../utils/jwt.util.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const result = await userService.registerUser(req.body);

    return res.status(201).json(
      apiSuccess({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }),
    );
  } catch (error) {
    console.error('[auth] Registration error:', error);

    if (error.message === 'EMAIL_EXISTS') {
      return res
        .status(409)
        .json(apiError('EMAIL_EXISTS', 'Email address already registered'));
    }

    if (error.message === 'PHONE_EXISTS') {
      return res
        .status(409)
        .json(apiError('PHONE_EXISTS', 'Phone number already registered'));
    }

    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Registration failed'));
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await userService.loginUser(email, password);

    return res.status(200).json(
      apiSuccess({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }),
    );
  } catch (error) {
    console.error('[auth] Login error:', error);

    if (error.message === 'INVALID_CREDENTIALS') {
      return res
        .status(401)
        .json(apiError('INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    if (error.message === 'ACCOUNT_DISABLED') {
      return res
        .status(403)
        .json(apiError('ACCOUNT_DISABLED', 'Your account has been disabled'));
    }

    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Login failed'));
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  try {
    const user = await userService.getUserProfile(req.user.userId);

    return res.status(200).json(apiSuccess({ user }));
  } catch (error) {
    console.error('[auth] Get profile error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(apiError('USER_NOT_FOUND', 'User not found'));
    }

    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Failed to fetch profile'));
  }
}

/**
 * Update user profile
 * PATCH /api/auth/profile
 */
export async function updateProfile(req, res) {
  try {
    const user = await userService.updateUserProfile(req.user.userId, req.body);

    return res.status(200).json(apiSuccess({ user }));
  } catch (error) {
    console.error('[auth] Update profile error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(apiError('USER_NOT_FOUND', 'User not found'));
    }

    if (error.message === 'PHONE_EXISTS') {
      return res
        .status(409)
        .json(apiError('PHONE_EXISTS', 'Phone number already in use'));
    }

    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Failed to update profile'));
  }
}

/**
 * Change password
 * POST /api/auth/change-password
 */
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
    );

    return res
      .status(200)
      .json(apiSuccess({ message: 'Password changed successfully' }));
  } catch (error) {
    console.error('[auth] Change password error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(apiError('USER_NOT_FOUND', 'User not found'));
    }

    if (error.message === 'INVALID_PASSWORD') {
      return res
        .status(401)
        .json(apiError('INVALID_PASSWORD', 'Current password is incorrect'));
    }

    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Failed to change password'));
  }
}

/**
 * Switch mode (GLOBAL/LOCAL)
 * POST /api/auth/switch-mode
 */
export async function switchMode(req, res) {
  try {
    const { mode } = req.body;
    const user = await userService.switchMode(req.user.userId, mode);

    return res.status(200).json(apiSuccess({ user }));
  } catch (error) {
    console.error('[auth] Switch mode error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(apiError('USER_NOT_FOUND', 'User not found'));
    }

    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Failed to switch mode'));
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refresh(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json(apiError('UNAUTHORIZED', 'Refresh token required'));
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.message === 'Token expired') {
        return res
          .status(401)
          .json(apiError('TOKEN_EXPIRED', 'Refresh token has expired'));
      }
      return res
        .status(401)
        .json(apiError('INVALID_TOKEN', 'Invalid refresh token'));
    }

    const result = await userService.refreshAccessToken(decoded.userId);

    return res.status(200).json(apiSuccess(result));
  } catch (error) {
    console.error('[auth] Refresh token error:', error);

    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(apiError('USER_NOT_FOUND', 'User not found'));
    }

    if (error.message === 'ACCOUNT_DISABLED') {
      return res
        .status(403)
        .json(apiError('ACCOUNT_DISABLED', 'Your account has been disabled'));
    }

    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Failed to refresh token'));
  }
}
