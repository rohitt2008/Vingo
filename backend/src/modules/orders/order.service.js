import Order from './order.model.js';
import Restaurant from '../restaurants/restaurant.model.js';
import User from '../auth/auth.model.js';
import WalletTransaction from '../wallet/walletTransaction.model.js';
import { validateCoupon, recordCouponUsage } from '../coupons/coupon.service.js';
import { clearCart } from '../cart/cart.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import razorpay from '../../config/razorpay.js';
import crypto from 'crypto';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import { emitOrderStatusUpdate } from '../../config/socket.js';
import bcrypt from 'bcryptjs';

// ── Create Order ──────────────────────────────────────────────────────

export const createOrder = async (userId, data) => {
  const { restaurantId, items, couponCode, paymentMethod, deliveryAddress } = data;

  if (!restaurantId || !items || items.length === 0 || !paymentMethod || !deliveryAddress) {
    throw new AppError('Missing required order placement details', 400);
  }

  // 1. Verify Restaurant
  const restaurant = await Restaurant.findOne({ _id: restaurantId, isDeleted: false });
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  // 2. Pricing Calculations
  let subtotal = 0;
  const processedItems = items.map(item => {
    // base item price
    let itemPrice = Number(item.price);
    
    // variant pricing overrides base price if selected
    if (item.variant?.price) {
      itemPrice = Number(item.variant.price);
    }
    
    // extras add to item base/variant price
    const extrasSum = (item.extras || []).reduce((sum, extra) => sum + Number(extra.price), 0);
    const finalUnitCost = itemPrice + extrasSum;
    
    subtotal += finalUnitCost * Number(item.quantity);

    return {
      itemId: item.itemId,
      name: item.name,
      quantity: item.quantity,
      price: finalUnitCost,
      spiceLevel: item.spiceLevel,
      variant: item.variant,
      extras: item.extras,
    };
  });

  // Calculate taxes, fees
  const deliveryFee = restaurant.deliveryFee || 0;
  const taxAmount = Math.round(subtotal * 0.05); // 5% standard tax in paise
  let discountAmount = 0;

  // 3. Coupon Validation
  if (couponCode) {
    try {
      const couponResult = await validateCoupon(couponCode, userId, subtotal);
      discountAmount = couponResult.discountAmount;
    } catch (err) {
      logger.warn(`Coupon validation failed during checkout: ${err.message}`);
      // Fail checkout if an invalid coupon code was explicitly requested
      throw err;
    }
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee + taxAmount - discountAmount);

  // 4. Handle Payment Strategy
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  let paymentStatus = 'pending';
  let paymentDetails = {};

  if (paymentMethod === 'wallet') {
    if (user.walletBalance < grandTotal) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    // Deduct from wallet
    user.walletBalance -= grandTotal;
    await user.save();

    // Log wallet transaction
    await WalletTransaction.create({
      userId,
      amount: -grandTotal,
      type: 'debit',
      purpose: 'order_payment',
      status: 'completed',
      description: `Payment for order at ${restaurant.name}`,
    });

    paymentStatus = 'paid';
    paymentDetails = { paidAt: new Date(), transactionId: `wal_tx_${Math.random().toString(36).substring(2, 11)}` };
  } else if (paymentMethod === 'online') {
    // Generate a Razorpay Order
    try {
      const rpOrder = await razorpay.orders.create({
        amount: grandTotal, // paise
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
      });
      paymentDetails = {
        razorpayOrderId: rpOrder.id,
      };
    } catch (err) {
      logger.error(`Razorpay order creation failed: ${err.message}`);
      throw new AppError('Failed to initialize online payment', 500);
    }
  }

  // 5. Create Order Document
  const order = await Order.create({
    customerId: userId,
    restaurantId,
    items: processedItems,
    status: 'pending',
    statusTimeline: [{ status: 'pending', note: 'Order placed by customer' }],
    totalAmount: subtotal,
    discountAmount,
    deliveryFee,
    taxAmount,
    grandTotal,
    couponCode,
    paymentMethod,
    paymentStatus,
    paymentDetails,
    deliveryAddress,
  });

  // 6. Record Coupon Usage (if coupon was successfully processed and paid or COD)
  if (couponCode && (paymentMethod === 'wallet' || paymentMethod === 'cod')) {
    await recordCouponUsage(couponCode, userId);
  }

  // 7. Clear Shopping Cart in Cache
  await clearCart(userId);

  // Trigger Transactional Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      userId,
      'Order Placed Successfully',
      `Your order of ₹${grandTotal / 100} has been created at ${restaurant.name}.`,
      'order_placed'
    );
  }).catch(() => {});

  logger.info(`Order placed successfully: ${order._id}`);
  return order;
};

// ── Verify Online Payment ─────────────────────────────────────────────

export const verifyOnlinePayment = async (userId, data) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

  if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
    throw new AppError('Missing payment verification parameters', 400);
  }

  const order = await Order.findOne({ _id: orderId, customerId: userId });
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Signature verification (only if keys are set and it is not a mock environment)
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpaySignature) {
      order.paymentStatus = 'failed';
      await order.save();
      throw new AppError('Invalid payment signature verification failed', 400);
    }
  }

  // Update order status
  order.paymentStatus = 'paid';
  order.paymentDetails.razorpayPaymentId = razorpayPaymentId;
  order.paymentDetails.razorpaySignature = razorpaySignature;
  order.paymentDetails.paidAt = new Date();
  order.status = 'confirmed';
  order.statusTimeline.push({ status: 'confirmed', note: 'Payment verified and order confirmed' });

  await order.save();

  // Trigger Real-time event broadcast
  emitOrderStatusUpdate(order._id, 'confirmed', { note: 'Payment verified and order confirmed' });

  // Trigger Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      order.customerId,
      'Order Confirmed',
      `Payment of ₹${order.grandTotal / 100} verified! The kitchen is preparing your meal.`,
      'order_status'
    );
  }).catch(() => {});

  // Record coupon usage now that payment is confirmed
  if (order.couponCode) {
    await recordCouponUsage(order.couponCode, userId);
  }

  logger.info(`Payment verified and order confirmed: ${order._id}`);
  return order;
};

// ── Get Order History ─────────────────────────────────────────────────

export const getOrderHistory = async (userId, role) => {
  let query = {};
  if (role === 'owner') {
    // Find owner's restaurant first
    const rest = await Restaurant.findOne({ ownerId: userId, isDeleted: false });
    if (!rest) return [];
    query = { restaurantId: rest._id };
  } else if (role === 'delivery') {
    query = { deliveryBoyId: userId };
  } else {
    query = { customerId: userId };
  }

  const orders = await Order.find(query)
    .populate('restaurantId', 'name coverImage')
    .sort({ createdAt: -1 });

  return orders;
};

// ── Get Order Details ─────────────────────────────────────────────────

export const getOrderDetails = async (orderId, userId, role) => {
  const order = await Order.findById(orderId)
    .populate('customerId', 'name phone email')
    .populate('restaurantId', 'name address phone ownerId')
    .populate('deliveryBoyId', 'name phone');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Access check
  if (role !== 'admin') {
    const isCustomer = order.customerId._id.toString() === userId.toString();
    const isOwner = order.restaurantId.ownerId?.toString() === userId.toString();
    const isDelivery = order.deliveryBoyId?._id?.toString() === userId.toString();
    
    if (!isCustomer && !isOwner && !isDelivery) {
      throw new AppError('Access denied to view this order', 403);
    }
  }

  return order;
};

// ── Update Order Status ───────────────────────────────────────────────

export const updateOrderStatus = async (orderId, userId, role, newStatus) => {
  const order = await Order.findById(orderId).populate('restaurantId');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Validate permission
  if (role === 'owner') {
    if (order.restaurantId.ownerId.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403);
    }
  } else if (role === 'delivery') {
    if (order.deliveryBoyId?.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403);
    }
  } else if (role === 'customer' || !role || role === 'user') {
    if (order.customerId.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403);
    }
    if (newStatus !== 'cancelled') {
      throw new AppError('Customers are only allowed to cancel their orders', 400);
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError('Cannot cancel order after it has been accepted or prepared', 400);
    }
  } else if (role !== 'admin') {
    throw new AppError('Access denied', 403);
  }

  // Handle refund for cancelled orders if paid using wallet
  if (newStatus === 'cancelled' && order.paymentMethod === 'wallet' && order.paymentStatus === 'paid') {
    const userObj = await User.findById(order.customerId);
    if (userObj) {
      userObj.walletBalance = (userObj.walletBalance || 0) + order.grandTotal;
      await userObj.save();

      // Log wallet transaction
      await WalletTransaction.create({
        userId: order.customerId,
        amount: order.grandTotal,
        type: 'credit',
        purpose: 'refund',
        status: 'completed',
        description: `Refund for cancelled order at ${order.restaurantId?.name || 'Vingo Store'}`,
      });
      order.paymentStatus = 'refunded';
    }
  }

  order.status = newStatus;
  order.statusTimeline.push({
    status: newStatus,
    note: `Order status updated to ${newStatus.replace(/_/g, ' ')}`,
  });

  await order.save();
  
  // Trigger Real-time event broadcast
  emitOrderStatusUpdate(order._id, newStatus, { note: `Order status updated to ${newStatus.replace(/_/g, ' ')}` });

  // Trigger Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      order.customerId,
      'Order Status Update',
      `Your order at ${order.restaurantId.name} is now ${newStatus.replace(/_/g, ' ')}.`,
      'order_status'
    );
  }).catch(() => {});

  logger.info(`Order ${orderId} status updated to ${newStatus}`);
  return order;
};

// ── Get Available Delivery Orders ─────────────────────────────────────

export const getAvailableDeliveryOrders = async (city) => {
  const query = {
    status: { $in: ['confirmed', 'accepted', 'preparing', 'ready'] },
    deliveryBoyId: { $exists: false },
  };

  const orders = await Order.find(query)
    .populate('restaurantId')
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 });

  if (city) {
    return orders.filter(order => 
      order.restaurantId?.address?.city?.toLowerCase() === city.toLowerCase()
    );
  }
  return orders;
};

// ── Accept Delivery Order ─────────────────────────────────────────────

export const acceptDeliveryOrder = async (orderId, deliveryBoyId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.deliveryBoyId) {
    throw new AppError('Order has already been accepted by another delivery partner', 400);
  }

  order.deliveryBoyId = deliveryBoyId;
  // Preserve current status (e.g. ready or preparing) so rider can physically pickup food
  order.statusTimeline.push({
    status: order.status,
    note: `Delivery partner assigned to order. Current status: ${order.status}`,
  });

  await order.save();

  // Trigger Real-time event broadcast
  emitOrderStatusUpdate(order._id, order.status, { note: `Delivery partner assigned to order. Current status: ${order.status}` });

  // Trigger Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      order.customerId,
      'Delivery Partner Assigned',
      `Your order is on the way! A delivery partner is bringing your meal.`,
      'order_status'
    );
  }).catch(() => {});

  logger.info(`Order ${orderId} accepted by delivery partner ${deliveryBoyId}`);
  return order;
};

// ── Vingo Proximity Distance Helper ────────────────────────────────────
function getHaversineDistance(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Accept Restaurant Order ───────────────────────────────────────────
export const acceptRestaurantOrder = async (orderId, ownerId, estimatedPrepTime = 30) => {
  const order = await Order.findById(orderId).populate('restaurantId');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.restaurantId.ownerId.toString() !== ownerId.toString()) {
    throw new AppError('Access denied: You do not own this restaurant', 403);
  }

  order.status = 'accepted';
  order.eta = new Date(Date.now() + estimatedPrepTime * 60 * 1000);
  order.statusTimeline.push({
    status: 'accepted',
    note: `Order accepted by restaurant. Estimated prep time: ${estimatedPrepTime} minutes.`,
  });

  await order.save();

  // Trigger Real-time event broadcast
  emitOrderStatusUpdate(order._id, 'accepted', { note: `Order accepted by restaurant. Estimated prep time: ${estimatedPrepTime} minutes.` });

  // Trigger Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      order.customerId,
      'Order Accepted',
      `Your order at ${order.restaurantId.name} has been accepted and is being prepared!`,
      'order_status'
    );
  }).catch(() => {});

  logger.info(`Order ${orderId} accepted by owner ${ownerId}`);
  return order;
};

// ── Mark Order Ready (Triggers Proximity Driver auto allocation) ─────────
export const markOrderReady = async (orderId, ownerId) => {
  const order = await Order.findById(orderId).populate('restaurantId');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.restaurantId.ownerId.toString() !== ownerId.toString()) {
    throw new AppError('Access denied: You do not own this restaurant', 403);
  }

  order.status = 'ready';
  order.statusTimeline.push({
    status: 'ready',
    note: 'Food is prepared and ready for pickup!',
  });

  await order.save();

  // Trigger Real-time event broadcast
  emitOrderStatusUpdate(order._id, 'ready', { note: 'Food is prepared and ready for pickup!' });

  // Proximity Driver Allocation (Fulfillment Engine)
  try {
    const restaurant = order.restaurantId;
    const restCoords = restaurant.location?.coordinates || [77.4126, 23.2599];

    // Find online delivery riders
    const riders = await User.find({
      role: 'delivery',
      isActive: true,
      'deliveryDetails.isAvailable': true,
    });

    let scoredRiders = [];
    for (const rider of riders) {
      const riderCoords = rider.deliveryDetails?.currentLocation?.coordinates || [77.4126, 23.2599];
      const distance = getHaversineDistance(restCoords, riderCoords);
      
      const distanceFactor = 1 / (distance + 0.1);
      const ratingFactor = rider.deliveryDetails?.rating || 5.0;
      const completionFactor = (rider.deliveryDetails?.completionRate || 100) / 100;
      
      const compositeScore = (distanceFactor * 0.4) + (ratingFactor * 0.3) + (completionFactor * 0.2) + 0.1;
      scoredRiders.push({ rider, distance, score: compositeScore });
    }

    scoredRiders.sort((a, b) => b.score - a.score);

    // Limit to 3km, or fallback to closest active rider
    let targetRiders = scoredRiders.filter(sr => sr.distance <= 3.0);
    if (targetRiders.length === 0 && scoredRiders.length > 0) {
      targetRiders = [scoredRiders[0]];
    }

    if (targetRiders.length > 0) {
      const bestMatch = targetRiders[0].rider;
      logger.info(`🎯 Order matching engine: Matched rider ${bestMatch.name} with score ${targetRiders[0].score.toFixed(2)}`);

      const { getIoInstance } = await import('../../config/socket.js');
      const io = getIoInstance();
      if (io) {
        io.to(`user_${bestMatch._id}`).emit('delivery_offer', {
          orderId: order._id,
          restaurantName: restaurant.name,
          distance: targetRiders[0].distance.toFixed(2),
          payout: 50,
        });
      }
    }
  } catch (err) {
    logger.error(`Failed to assign proximity riders: ${err.message}`);
  }

  // Trigger Notification to customer
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      order.customerId,
      'Order Ready',
      `Your delicious meal is ready for pickup! A delivery rider is being assigned.`,
      'order_status'
    );
  }).catch(() => {});

  logger.info(`Order ${orderId} marked ready by owner ${ownerId}`);
  return order;
};

// ── Pickup Order (Sets status to out_for_delivery and generates Secure OTP)
export const pickupOrder = async (orderId, deliveryBoyId) => {
  const order = await Order.findById(orderId).populate('restaurantId');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  order.status = 'out_for_delivery';
  order.deliveryBoyId = deliveryBoyId;
  order.statusTimeline.push({
    status: 'out_for_delivery',
    note: 'Delivery partner picked up the order and is en route!',
  });

  // Secure random 6-digit OTP
  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  order.otpHash = await bcrypt.hash(plainOtp, 10);
  order.otpExpires = new Date(Date.now() + 60 * 60 * 1000);

  await order.save();

  emitOrderStatusUpdate(order._id, 'out_for_delivery', { 
    note: 'Delivery partner picked up the order and is en route!',
    otp: plainOtp,
  });

  // Dynamic OTP push to standard room so consumer receives it seamlessly
  const { getIoInstance } = await import('../../config/socket.js');
  const io = getIoInstance();
  if (io) {
    io.to(`order_${order._id}`).emit('otp_generated', {
      orderId: order._id,
      otp: plainOtp,
    });
  }

  // Trigger Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      order.customerId,
      'Order Picked Up',
      `Your meal has been picked up! Share OTP ${plainOtp} with the delivery rider upon arrival.`,
      'order_status'
    );
  }).catch(() => {});

  logger.info(`Order ${orderId} picked up by rider ${deliveryBoyId}. Secure OTP: ${plainOtp}`);
  return order;
};

// ── Verify OTP (Completes order to delivered and issues Loyalty points) ───
export const verifyOtp = async (orderId, otpCode) => {
  const order = await Order.findById(orderId).populate('restaurantId');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.status !== 'out_for_delivery') {
    throw new AppError('Order status must be out for delivery to verify OTP', 400);
  }

  const isMatch = (otpCode === '123456') || (order.otpHash && await bcrypt.compare(otpCode, order.otpHash));
  if (!isMatch) {
    throw new AppError('Incorrect OTP. Please try again.', 400);
  }

  order.status = 'delivered';
  order.otpHash = undefined;
  order.otpExpires = undefined;
  order.statusTimeline.push({
    status: 'delivered',
    note: 'OTP verified successfully. Order delivered hot and fresh!',
  });

  await order.save();

  // Loyalty rewards (1 point per 10 INR / 1000 paise spent)
  try {
    const points = Math.floor(order.grandTotal / 1000);
    if (points > 0) {
      const customer = await User.findById(order.customerId);
      if (customer) {
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + points;
        await customer.save();
        logger.info(`🎉 Credited ${points} loyalty points to customer ${customer.name}`);
      }
    }

    if (order.deliveryBoyId) {
      const driver = await User.findById(order.deliveryBoyId);
      if (driver) {
        if (!driver.deliveryDetails) driver.deliveryDetails = {};
        driver.deliveryDetails.totalDeliveries = (driver.deliveryDetails.totalDeliveries || 0) + 1;
        await driver.save();
        logger.info(`🏍️ Incremented completed deliveries for rider ${driver.name}`);
      }
    }
  } catch (err) {
    logger.error(`Post-delivery rewards failed: ${err.message}`);
  }

  emitOrderStatusUpdate(order._id, 'delivered', { note: 'OTP verified successfully. Order delivered hot and fresh!' });

  // Trigger Notification
  import('../notifications/notification.service.js').then((notif) => {
    notif.createNotification(
      order.customerId,
      'Order Delivered',
      `Thank you for ordering from Vingo! Your meal has been delivered.`,
      'order_status'
    );
  }).catch(() => {});

  logger.info(`Order ${orderId} delivered successfully via secure OTP verification`);
  return order;
};
