import User from '../modules/auth/auth.model.js';
import Coupon from '../modules/coupons/coupon.model.js';
import Order from '../modules/orders/order.model.js';
import logger from './logger.js';

/**
 * Enterprise-grade Background Job Simulator.
 * Periodically processes system housekeeping tasks without breaking on network proxies.
 */
export const startBackgroundJobs = () => {
  logger.info('Background Cron & Job Sim Queue initialized successfully');

  // Run every 60 seconds
  setInterval(async () => {
    logger.debug('[QUEUE WORKER] Starting scheduled housekeeping jobs...');
    try {
      await cleanupExpiredCoupons();
      await calculateLoyaltyTiers();
    } catch (err) {
      logger.error(`[QUEUE WORKER] Housekeeping job failed: ${err.message}`);
    }
  }, 60000);
};

// ── Housekeeping: Coupon Cleanup ──────────────────────────────────────

const cleanupExpiredCoupons = async () => {
  const result = await Coupon.updateMany(
    { expiresAt: { $lt: new Date() }, isActive: true },
    { isActive: false }
  );
  if (result.modifiedCount > 0) {
    logger.info(`[QUEUE WORKER] Cleaned up ${result.modifiedCount} expired promo coupons.`);
  }
};

// ── Housekeeping: Calculate Loyalty Tiers ─────────────────────────────

const calculateLoyaltyTiers = async () => {
  const users = await User.find();
  for (const user of users) {
    // Fetch user completed order value in paise
    const orders = await Order.find({ customerId: user._id, paymentStatus: 'paid' });
    const totalSpent = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    
    // Loyalty Tier Logic:
    // Gold: > 10,000 INR (1,000,000 paise)
    // Silver: > 3,000 INR (300,000 paise)
    // Bronze: default
    let newTier = 'bronze';
    if (totalSpent >= 1000000) {
      newTier = 'gold';
    } else if (totalSpent >= 300000) {
      newTier = 'silver';
    }

    if (user.loyaltyTier !== newTier) {
      user.loyaltyTier = newTier;
      
      // Auto-assign loyalty reward points
      user.loyaltyPoints = (user.loyaltyPoints || 0) + 100;
      await user.save();
      
      logger.info(`[QUEUE WORKER] Upgraded loyalty status for ${user.name}: -> ${newTier.toUpperCase()}`);
    }
  }
};
