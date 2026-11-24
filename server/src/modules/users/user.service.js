import bcrypt from 'bcrypt';
import User from './user.model.js';
import {
  createTokenPayload,
  generateAccessToken,
  generateRefreshToken,
} from '../../utils/jwt.util.js';

const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user and tokens
 */
export async function registerUser(userData) {
  // Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error('EMAIL_EXISTS');
  }

  // Check phone uniqueness
  const existingPhone = await User.findOne({ phone: userData.phone });
  if (existingPhone) {
    throw new Error('PHONE_EXISTS');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

  // Create user
  const user = await User.create({
    ...userData,
    password: hashedPassword,
  });

  // Generate tokens
  const payload = createTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Return user without password
  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    accessToken,
    refreshToken,
  };
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User and tokens
 */
export async function loginUser(email, password) {
  // Find user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new Error('ACCOUNT_DISABLED');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate tokens
  const payload = createTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Return user without password
  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    accessToken,
    refreshToken,
  };
}

/**
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return user.toObject();
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Updated user
 */
export async function updateUserProfile(userId, updates) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Check phone uniqueness if updating phone
  if (updates.phone && updates.phone !== user.phone) {
    const existingPhone = await User.findOne({ phone: updates.phone });
    if (existingPhone) {
      throw new Error('PHONE_EXISTS');
    }
  }

  // Handle home location updates
  if (updates.homeLocation) {
    user.homeLocation = {
      type: 'Point',
      coordinates: updates.homeLocation.coordinates,
      address: updates.homeLocation.address,
      city: updates.homeLocation.city,
      state: updates.homeLocation.state,
      pincode: updates.homeLocation.pincode,
    };
    delete updates.homeLocation;
  }

  // Apply other updates
  Object.assign(user, updates);

  await user.save();

  return user.toObject();
}

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new Error('INVALID_PASSWORD');
  }

  // Hash and save new password
  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

/**
 * Switch user mode (GLOBAL/LOCAL)
 * @param {string} userId - User ID
 * @param {string} mode - Mode to switch to
 * @returns {Promise<Object>} Updated user
 */
export async function switchMode(userId, mode) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  user.activeMode = mode;
  await user.save();

  return user.toObject();
}

/**
 * Refresh access token
 * @param {string} userId - User ID from refresh token
 * @returns {Promise<Object>} New tokens
 */
export async function refreshAccessToken(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw new Error('ACCOUNT_DISABLED');
  }

  const payload = createTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
  };
}
