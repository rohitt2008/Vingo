import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  discountType: {
    type: String,
    enum: ['flat', 'percentage'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrderAmount: {
    type: Number,
    default: 0, // paise
  },
  maxDiscountAmount: {
    type: Number, // paise (relevant for percentage type)
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    default: null, // null means unlimited total usage
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  userUsageLimit: {
    type: Number,
    default: 1, // limit per user
  },
  // Tracks user usage
  userUsage: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 },
  }],
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.__v;
      return ret;
    },
  },
});

// ── Virtual: isValid ──────────────────────────────────────────────────

couponSchema.virtual('isValid').get(function () {
  return this.isActive && this.expiresAt > new Date() && (this.usageLimit === null || this.usedCount < this.usageLimit);
});

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
