import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './auth.model.js';
import env from '../../config/env.js';
import { generateReferralCode, generateOTP } from '../../utils/crypto.js';
import { sendOtpMail } from '../../utils/mail.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REFRESH_TOKENS = 5; // Max active sessions per user

// ── Token Generation ──────────────────────────────────────────────────

/**
 * Generate an access token (short-lived).
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });
};

/**
 * Generate a refresh token (long-lived).
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId, type: 'refresh' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });
};

/**
 * Set auth cookies on the response.
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = env.NODE_ENV === 'production';

  // Access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Also set as 'token' for backward compatibility
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
  });

  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth/refresh', // Only sent to refresh endpoint
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ── Sign Up ───────────────────────────────────────────────────────────

export const signUp = async (data) => {
  const { name, email, password, phone, role, referralCode: refCode } = data;

  // Check for existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Generate unique referral code
  let referralCode;
  let isUnique = false;
  while (!isUnique) {
    referralCode = generateReferralCode();
    const existing = await User.findOne({ referralCode });
    if (!existing) isUnique = true;
  }

  // Handle referral
  let referredBy = null;
  if (refCode) {
    const referrer = await User.findOne({ referralCode: refCode, isActive: true });
    if (referrer) {
      referredBy = referrer._id;
      // Credit referrer with 50 points (₹50) — will be enhanced with wallet in Sprint 3
      referrer.loyaltyPoints += 50;
      await referrer.save();
    }
  }

  // Create user
  const user = await User.create({
    name,
    email,
    passwordHash,
    phone,
    role,
    referralCode,
    referredBy,
    loyaltyPoints: referredBy ? 75 : 0, // ₹75 for referee
    lastLogin: new Date(),
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  user.refreshTokens = [{
    token: refreshToken,
    device: 'web',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }];
  await user.save();

  logger.info(`New user signed up: ${email} (${role})`);

  return { user, accessToken, refreshToken };
};

// ── Sign In ───────────────────────────────────────────────────────────

export const signIn = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+passwordHash +failedLoginAttempts +lockUntil');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account has been suspended. Contact support.', 403);
  }

  // Check lockout
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new AppError(
      `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      423
    );
  }

  // Verify password
  if (!user.passwordHash) {
    throw new AppError('This account uses Google sign-in. Please use Google to log in.', 400);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    // Increment failed attempts
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
      await user.save();
      throw new AppError('Account locked due to too many failed login attempts. Try again in 30 minutes.', 423);
    }

    await user.save();
    throw new AppError(
      `Invalid email or password. ${MAX_FAILED_ATTEMPTS - user.failedLoginAttempts} attempts remaining.`,
      401
    );
  }

  // Reset failed attempts on successful login
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token (keep max sessions limit)
  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push({
    token: refreshToken,
    device: 'web',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Prune old tokens — keep only the most recent N
  if (user.refreshTokens.length > MAX_REFRESH_TOKENS) {
    user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS);
  }

  await user.save();

  logger.info(`User signed in: ${email}`);

  return { user, accessToken, refreshToken };
};

// ── Refresh Token Rotation ────────────────────────────────────────────

export const refreshAccessToken = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  // Verify the refresh token
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', 401);
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  // Find and invalidate the old refresh token
  const tokenIndex = user.refreshTokens.findIndex((rt) => rt.token === oldRefreshToken);
  if (tokenIndex === -1) {
    // Token not found — possible token reuse attack
    // Invalidate ALL refresh tokens for this user
    user.refreshTokens = [];
    await user.save();
    logger.warn(`Possible token reuse detected for user: ${user.email}`);
    throw new AppError('Session invalidated. Please log in again.', 401);
  }

  // Remove the old token
  user.refreshTokens.splice(tokenIndex, 1);

  // Generate new token pair
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store new refresh token
  user.refreshTokens.push({
    token: refreshToken,
    device: 'web',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await user.save();

  return { accessToken, refreshToken, user };
};

// ── Sign Out ──────────────────────────────────────────────────────────

export const signOut = async (userId, refreshToken) => {
  const user = await User.findById(userId);
  if (user) {
    // Remove the specific refresh token (sign out this device)
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    await user.save();
  }
};

/**
 * Sign out from all devices by clearing all refresh tokens.
 */
export const signOutAll = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshTokens: [] });
};

// ── Google Auth ───────────────────────────────────────────────────────

export const googleAuth = async (data) => {
  const { name, email, phone, role, googleId } = data;

  let user = await User.findOne({ email });

  if (!user) {
    // First-time Google auth — create new user
    if (!name || !role) {
      throw new AppError('Please complete your profile: name and role are required for new Google accounts', 400);
    }

    let referralCode;
    let isUnique = false;
    while (!isUnique) {
      referralCode = generateReferralCode();
      const existing = await User.findOne({ referralCode });
      if (!existing) isUnique = true;
    }

    user = await User.create({
      name,
      email,
      phone,
      role,
      googleId,
      referralCode,
      lastLogin: new Date(),
    });

    logger.info(`New Google user created: ${email}`);
  } else {
    // Existing user — link Google account if not already linked
    if (!user.googleId && googleId) {
      user.googleId = googleId;
    }
    user.lastLogin = new Date();
    await user.save();
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push({
    token: refreshToken,
    device: 'web',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  if (user.refreshTokens.length > MAX_REFRESH_TOKENS) {
    user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS);
  }

  await user.save();

  return { user, accessToken, refreshToken };
};

// ── OTP / Password Reset ─────────────────────────────────────────────

export const sendOtp = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No account found with this email', 404);
  }

  const otp = generateOTP(4);
  user.resetOtp = otp;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  user.isOtpVerified = false;
  await user.save();

  await sendOtpMail(email, otp);

  logger.info(`OTP sent to ${email}`);
};

export const verifyOtp = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('No account found with this email', 404);
  }

  if (!user.resetOtp || user.resetOtp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  user.isOtpVerified = true;
  user.resetOtp = undefined;
  user.otpExpires = undefined;
  await user.save();

  logger.info(`OTP verified for ${email}`);
};

export const resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });
  if (!user || !user.isOtpVerified) {
    throw new AppError('Please verify OTP before resetting password', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordHash = passwordHash;
  user.isOtpVerified = false;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  // Invalidate all existing sessions
  user.refreshTokens = [];
  await user.save();

  logger.info(`Password reset for ${email}`);
};

// ── Profile Management ───────────────────────────────────────────────

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId)
    .select('-passwordHash -refreshTokens -resetOtp -otpExpires -failedLoginAttempts -lockUntil');
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

export const updateProfile = async (userId, updates) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Only allow safe fields to be updated
  const allowedFields = ['name', 'phone', 'avatar', 'notificationPrefs'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      user[field] = updates[field];
    }
  }

  if (updates.deliveryDetails !== undefined) {
    user.deliveryDetails = {
      ...(user.deliveryDetails ? user.deliveryDetails.toObject() : {}),
      ...updates.deliveryDetails,
    };
  }

  await user.save();
  return user;
};

export const addAddress = async (userId, addressData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const address = {
    ...addressData,
    location: {
      type: 'Point',
      coordinates: [addressData.longitude || 0, addressData.latitude || 0],
    },
  };

  // If this is the first address or marked as default, ensure only one default
  if (addressData.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => { a.isDefault = false; });
    address.isDefault = true;
  }

  user.addresses.push(address);
  await user.save();

  return user.addresses;
};

export const removeAddress = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.addresses = user.addresses.filter((a) => a._id.toString() !== addressId);
  await user.save();

  return user.addresses;
};

// ── Export Cookie Setter ──────────────────────────────────────────────

export { setAuthCookies };
