import User from '../auth/auth.model.js';
import WalletTransaction from './walletTransaction.model.js';
import razorpay from '../../config/razorpay.js';
import { AppError } from '../../middleware/errorHandler.js';
import crypto from 'crypto';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

// ── Get Wallet Details ────────────────────────────────────────────────

export const getWalletDetails = async (userId) => {
  const user = await User.findById(userId).select('walletBalance loyaltyPoints loyaltyTier referralCode referralCount');
  if (!user) throw new AppError('User not found', 404);

  const transactions = await WalletTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50);

  return {
    balance: user.walletBalance || 0,
    loyaltyPoints: user.loyaltyPoints || 0,
    loyaltyTier: user.loyaltyTier || 'bronze',
    referralCode: user.referralCode,
    referralCount: user.referralCount || 0,
    transactions,
  };
};

// ── Top Up Wallet (Initialize Online Order) ───────────────────────────

export const topUpWallet = async (userId, amountINR) => {
  if (!amountINR || Number(amountINR) <= 0) {
    throw new AppError('Invalid top up amount', 400);
  }

  const amountPaise = Number(amountINR) * 100;

  try {
    const rpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_topup_${Date.now()}`,
    });

    return {
      razorpayOrderId: rpOrder.id,
      amount: amountPaise,
    };
  } catch (err) {
    logger.error(`Razorpay Top-Up Order creation failed: ${err.message}`);
    throw new AppError('Failed to initialize wallet top-up payment', 500);
  }
};

// ── Confirm Top Up (Verify Payment) ───────────────────────────────────

export const confirmTopUp = async (userId, data) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = data;

  if (!razorpayOrderId || !razorpayPaymentId || !amount) {
    throw new AppError('Missing top-up verification parameters', 400);
  }

  // Signature verification (only if keys are set and it is not a mock environment)
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && razorpaySignature) {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpaySignature) {
      throw new AppError('Top-up payment verification signature failed', 400);
    }
  }

  // Update user wallet balance
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const amountPaise = Number(amount);
  user.walletBalance = (user.walletBalance || 0) + amountPaise;
  await user.save();

  // Log Wallet Transaction
  const transaction = await WalletTransaction.create({
    userId,
    amount: amountPaise,
    type: 'credit',
    purpose: 'deposit',
    status: 'completed',
    referenceId: razorpayPaymentId,
    description: `Funds added via Online Checkout`,
  });

  // Create Transactional Alert Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      userId,
      'Wallet Balance Credited',
      `₹${amountPaise / 100} has been successfully added to your Vingo Pay Wallet.`,
      'wallet_update'
    );
  }).catch(() => {});

  logger.info(`Wallet topped up successfully for user ${userId}: +₹${amountPaise / 100}`);
  return { balance: user.walletBalance, transaction };
};
