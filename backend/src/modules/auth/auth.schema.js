import { z } from 'zod';

// ── Sign Up ───────────────────────────────────────────────────────────

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  phone: z.preprocess((val) => (val === '' ? undefined : val), z.string().min(10, 'Phone must be at least 10 digits').max(15).optional()),
  role: z.enum(['user', 'owner', 'delivery']).default('user'),
  referralCode: z.preprocess((val) => (val === '' ? undefined : val), z.string().length(6).optional()),
});

// ── Sign In ───────────────────────────────────────────────────────────

export const signinSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

// ── Google Auth ───────────────────────────────────────────────────────

export const googleAuthSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email('Email is required').toLowerCase().trim(),
  phone: z.preprocess((val) => (val === '' ? undefined : val), z.string().min(10).max(15).optional()),
  role: z.enum(['user', 'owner', 'delivery']).default('user'),
  googleId: z.string().optional(),
});

// ── Send OTP ──────────────────────────────────────────────────────────

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

// ── Verify OTP ────────────────────────────────────────────────────────

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  otp: z.string().min(4).max(6),
});

// ── Reset Password ────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

// ── Update Profile ────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  phone: z.preprocess((val) => (val === '' ? undefined : val), z.string().min(10).max(15).optional()),
  avatar: z.string().url().optional(),
  notificationPrefs: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
});

// ── Add Address ───────────────────────────────────────────────────────

export const addAddressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
  street: z.string().min(3, 'Street is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(5, 'Pincode is required').max(10),
  landmark: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

/**
 * Validate a Zod schema against request body.
 * Returns a middleware that parses and replaces req.body with validated data.
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  req.body = result.data;
  next();
};
