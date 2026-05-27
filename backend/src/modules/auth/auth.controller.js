import * as authService from './auth.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

// ── Sign Up ───────────────────────────────────────────────────────────

export const signUp = asyncWrapper(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.signUp(req.body);

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user,
      accessToken,
    },
  });
});

// ── Sign In ───────────────────────────────────────────────────────────

export const signIn = asyncWrapper(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.signIn(req.body);

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    data: {
      user,
      accessToken,
    },
  });
});

// ── Refresh Token ─────────────────────────────────────────────────────

export const refresh = asyncWrapper(async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  const { accessToken, refreshToken, user } = await authService.refreshAccessToken(oldRefreshToken);

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Tokens refreshed',
    data: {
      user,
      accessToken,
    },
  });
});

// ── Sign Out ──────────────────────────────────────────────────────────

export const signOut = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const userId = req.user?._id || req.userId;

  if (userId) {
    await authService.signOut(userId, refreshToken);
  }

  // Clear all auth cookies
  res.clearCookie('accessToken');
  res.clearCookie('token');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

  res.status(200).json({
    success: true,
    message: 'Signed out successfully',
  });
});

// ── Sign Out All Devices ──────────────────────────────────────────────

export const signOutAll = asyncWrapper(async (req, res) => {
  await authService.signOutAll(req.user._id);

  res.clearCookie('accessToken');
  res.clearCookie('token');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

  res.status(200).json({
    success: true,
    message: 'Signed out from all devices',
  });
});

// ── Google Auth ───────────────────────────────────────────────────────

export const googleAuth = asyncWrapper(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.googleAuth(req.body);

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Google authentication successful',
    data: {
      user,
      accessToken,
    },
  });
});

// ── Send OTP ──────────────────────────────────────────────────────────

export const sendOtp = asyncWrapper(async (req, res) => {
  await authService.sendOtp(req.body.email);

  res.status(200).json({
    success: true,
    message: 'OTP sent to your email',
  });
});

// ── Verify OTP ────────────────────────────────────────────────────────

export const verifyOtp = asyncWrapper(async (req, res) => {
  await authService.verifyOtp(req.body.email, req.body.otp);

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
  });
});

// ── Reset Password ────────────────────────────────────────────────────

export const resetPassword = asyncWrapper(async (req, res) => {
  await authService.resetPassword(req.body.email, req.body.newPassword);

  res.status(200).json({
    success: true,
    message: 'Password reset successfully. Please sign in.',
  });
});

// ── Get Current User ──────────────────────────────────────────────────

export const getCurrentUser = asyncWrapper(async (req, res) => {
  const user = await authService.getCurrentUser(req.userId);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// ── Update Profile ────────────────────────────────────────────────────

export const updateProfile = asyncWrapper(async (req, res) => {
  const user = await authService.updateProfile(req.userId, req.body);

  res.status(200).json({
    success: true,
    message: 'Profile updated',
    data: { user },
  });
});

// ── Address Management ────────────────────────────────────────────────

export const addAddress = asyncWrapper(async (req, res) => {
  const addresses = await authService.addAddress(req.userId, req.body);

  res.status(201).json({
    success: true,
    message: 'Address added',
    data: { addresses },
  });
});

export const removeAddress = asyncWrapper(async (req, res) => {
  const addresses = await authService.removeAddress(req.userId, req.params.addressId);

  res.status(200).json({
    success: true,
    message: 'Address removed',
    data: { addresses },
  });
});
