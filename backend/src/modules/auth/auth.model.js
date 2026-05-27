import mongoose from 'mongoose';

// ── Embedded Sub-schemas ──────────────────────────────────────────────

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' }, // Home, Work, Other
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  landmark: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

// ── Main User Schema ─────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  // Identity
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    // Null for OAuth-only accounts
  },
  phone: {
    type: String,
    trim: true,
  },

  // Role & RBAC
  role: {
    type: String,
    enum: ['user', 'owner', 'delivery', 'admin'],
    required: [true, 'Role is required'],
    default: 'user',
  },

  // OAuth
  googleId: {
    type: String,
    sparse: true,
    index: true,
  },

  // Profile
  avatar: { type: String }, // Cloudinary URL
  addresses: [addressSchema],

  // Wallet & Loyalty
  walletBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
  },

  // Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Account State
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },

  // Auth Security
  refreshTokens: [{
    token: String,
    device: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
  }],

  // Password Reset
  resetOtp: { type: String },
  otpExpires: { type: Date },
  isOtpVerified: { type: Boolean, default: false },

  // Account Lockout
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // Notification Preferences
  notificationPrefs: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },

  // Delivery Partner specific fields
  deliveryDetails: {
    vehicleType: { type: String, enum: ['bicycle', 'motorcycle', 'car'] },
    vehicleNumber: String,
    licenseNumber: String,
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    rating: { type: Number, default: 5, min: 0, max: 5 },
    totalDeliveries: { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 },
    zones: [String],
    documentsVerified: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      // Never send sensitive fields to the client
      delete ret.passwordHash;
      delete ret.refreshTokens;
      delete ret.resetOtp;
      delete ret.otpExpires;
      delete ret.failedLoginAttempts;
      delete ret.lockUntil;
      delete ret.__v;
      return ret;
    },
  },
});

// ── Indexes ───────────────────────────────────────────────────────────

userSchema.index({ role: 1 });
userSchema.index({ 'deliveryDetails.currentLocation': '2dsphere' });
userSchema.index({ createdAt: 1 });

// ── Virtual: isLocked ─────────────────────────────────────────────────

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Backward compatibility: fullName alias ────────────────────────────

userSchema.virtual('fullName').get(function () {
  return this.name;
});

const User = mongoose.model('User', userSchema);
export default User;
