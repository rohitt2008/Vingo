import Coupon from './coupon.model.js';
import { AppError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

// ── Create Coupon ─────────────────────────────────────────────────────

export const createCoupon = async (data) => {
  const existing = await Coupon.findOne({ code: data.code.toUpperCase() });
  if (existing) {
    throw new AppError('A coupon with this code already exists', 409);
  }

  const coupon = await Coupon.create({
    code: data.code.toUpperCase(),
    discountType: data.discountType,
    discountValue: Number(data.discountValue),
    minOrderAmount: Number(data.minOrderAmount || 0),
    maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : undefined,
    expiresAt: new Date(data.expiresAt),
    usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
    userUsageLimit: data.userUsageLimit ? Number(data.userUsageLimit) : 1,
  });

  logger.info(`Coupon created: ${coupon.code}`);
  return coupon;
};

// ── Validate and Apply Coupon ─────────────────────────────────────────

export const validateCoupon = async (code, userId, orderAmountPaise) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  
  if (!coupon) {
    throw new AppError('Invalid coupon code', 404);
  }

  if (!coupon.isActive) {
    throw new AppError('This coupon is no longer active', 400);
  }

  if (coupon.expiresAt < new Date()) {
    throw new AppError('This coupon has expired', 400);
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('This coupon usage limit has been reached', 400);
  }

  // Min Order check
  if (orderAmountPaise < coupon.minOrderAmount) {
    throw new AppError(`Minimum order amount of ₹${coupon.minOrderAmount / 100} is required`, 400);
  }

  // User Usage limit check
  const userRecord = coupon.userUsage.find(u => u.userId.toString() === userId.toString());
  if (userRecord && userRecord.count >= coupon.userUsageLimit) {
    throw new AppError('You have already reached the maximum usage limit for this coupon', 400);
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === 'flat') {
    discount = coupon.discountValue;
  } else {
    discount = Math.round((orderAmountPaise * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  }

  // Cap discount at order amount
  if (discount > orderAmountPaise) {
    discount = orderAmountPaise;
  }

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount: discount,
  };
};

// ── Increment Used Count ──────────────────────────────────────────────

export const recordCouponUsage = async (code, userId) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (coupon) {
    coupon.usedCount += 1;
    
    const userIndex = coupon.userUsage.findIndex(u => u.userId.toString() === userId.toString());
    if (userIndex > -1) {
      coupon.userUsage[userIndex].count += 1;
    } else {
      coupon.userUsage.push({ userId, count: 1 });
    }
    
    await coupon.save();
  }
};

// ── List Active Coupons ───────────────────────────────────────────────

export const listActiveCoupons = async () => {
  const coupons = await Coupon.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).select('code discountType discountValue minOrderAmount maxDiscountAmount expiresAt');
  return coupons;
};

// ── Delete Coupon ─────────────────────────────────────────────────────

export const deleteCoupon = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) {
    throw new AppError('Coupon not found', 404);
  }
  return { message: 'Coupon deleted' };
};
