import { verifyToken, normalizeRole } from '../utils/jwt.util.js';
import { apiError } from '../utils/apiResponse.js';
import User from '../modules/users/user.model.js';

/**
 * Authenticate JWT token from Authorization header
 * Sets req.user with authenticated user data
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json(apiError('UNAUTHORIZED', 'Authentication required'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error.message === 'Token expired') {
        return res.status(401).json(apiError('TOKEN_EXPIRED', 'Token has expired'));
      }
      return res.status(401).json(apiError('INVALID_TOKEN', 'Invalid token'));
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json(apiError('USER_NOT_FOUND', 'User not found'));
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json(apiError('ACCOUNT_DISABLED', 'Account has been disabled'));
    }

    // Attach user to request object
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: normalizeRole(user.role),
      name: user.name,
    };

    next();
  } catch (error) {
    console.error('[auth] Authentication error:', error);
    return res
      .status(500)
      .json(apiError('INTERNAL_SERVER_ERROR', 'Authentication failed'));
  }
}

/**
 * Optional authentication - does not fail if no token provided
 * Sets req.user if valid token exists
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = {
          userId: user._id.toString(),
          email: user.email,
          role: normalizeRole(user.role),
          name: user.name,
        };
      }
    } catch (error) {
      // Silent fail for optional auth
    }

    next();
  } catch (error) {
    console.error('[auth] Optional authentication error:', error);
    next();
  }
}
