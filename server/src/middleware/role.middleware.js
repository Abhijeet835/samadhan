import { apiError } from '../utils/apiResponse.js';

/**
 * Authorize user based on required roles
 * Must be used AFTER authenticate middleware
 * @param  {...string} allowedRoles - Array of allowed roles (e.g., 'ADMIN', 'HELPER')
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json(apiError('UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json(
          apiError(
            'FORBIDDEN',
            'You do not have permission to access this resource',
          ),
        );
    }

    next();
  };
}

/**
 * Check if user is admin
 * Shorthand for authorize('ADMIN')
 */
export const requireAdmin = authorize('ADMIN');

/**
 * Check if user is helper or admin
 */
export const requireHelper = authorize('HELPER', 'ADMIN');

/**
 * Check resource ownership
 * Requires req.user and resource userId field
 * Admin can access any resource
 */
export function checkOwnership(getUserIdFromResource) {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json(apiError('UNAUTHORIZED', 'Authentication required'));
    }

    // Admin bypass
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const resourceUserId = getUserIdFromResource(req);

    if (!resourceUserId) {
      return res
        .status(400)
        .json(apiError('VALIDATION_ERROR', 'Resource user ID not found'));
    }

    if (resourceUserId.toString() !== req.user.userId.toString()) {
      return res
        .status(403)
        .json(apiError('FORBIDDEN', 'You can only access your own resources'));
    }

    next();
  };
}
