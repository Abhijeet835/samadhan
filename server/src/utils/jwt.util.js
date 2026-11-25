import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Generate JWT access token
 * @param {Object} payload - User data to encode
 * @returns {string} JWT token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/**
 * Generate JWT refresh token (longer expiry)
 * @param {Object} payload - User data to encode
 * @returns {string} JWT token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: '30d',
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

export function normalizeRole(role) {
  if (role === 'CITIZEN') return 'CONSUMER';
  if (role === 'HELPER') return 'PROVIDER';
  return role;
}

/**
 * Create token payload from user
 * @param {Object} user - Mongoose user document
 * @returns {Object} Token payload
 */
export function createTokenPayload(user) {
  return {
    userId: user._id.toString(),
    email: user.email,
    role: normalizeRole(user.role),
  };
}
