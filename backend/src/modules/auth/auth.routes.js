import express from 'express';
import * as authCtrl from './auth.controller.js';
import { validate, signupSchema, signinSchema, googleAuthSchema, sendOtpSchema, verifyOtpSchema, resetPasswordSchema, updateProfileSchema, addAddressSchema } from './auth.schema.js';
import auth from '../../middleware/auth.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

// ── Public Routes ─────────────────────────────────────────────────────

router.post('/signup', authLimiter, validate(signupSchema), authCtrl.signUp);
router.post('/signin', authLimiter, validate(signinSchema), authCtrl.signIn);
router.post('/google-auth', authLimiter, validate(googleAuthSchema), authCtrl.googleAuth);

// OTP flow
router.post('/send-otp', otpLimiter, validate(sendOtpSchema), authCtrl.sendOtp);
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), authCtrl.verifyOtp);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authCtrl.resetPassword);

// Refresh token (uses refreshToken cookie, not auth middleware)
router.post('/refresh', authCtrl.refresh);

// ── Protected Routes ──────────────────────────────────────────────────

router.get('/signout', auth, authCtrl.signOut);
router.post('/signout-all', auth, authCtrl.signOutAll);

// User profile
router.get('/current', auth, authCtrl.getCurrentUser);
router.put('/profile', auth, validate(updateProfileSchema), authCtrl.updateProfile);

// Address management
router.post('/address', auth, validate(addAddressSchema), authCtrl.addAddress);
router.delete('/address/:addressId', auth, authCtrl.removeAddress);

export default router;
