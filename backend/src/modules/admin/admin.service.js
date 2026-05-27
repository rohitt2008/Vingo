import User from '../auth/auth.model.js';
import Restaurant from '../restaurants/restaurant.model.js';
import Order from '../orders/order.model.js';
import Coupon from '../coupons/coupon.model.js';
import { AppError } from '../../middleware/errorHandler.js';

// ── Get Admin Dashboard Total Metrics ─────────────────────────────────

export const getMetrics = async () => {
  const usersCount = await User.countDocuments();
  const restaurantsCount = await Restaurant.countDocuments({ isDeleted: false });
  const activeOrdersCount = await Order.countDocuments({ status: { $nin: ['delivered', 'cancelled'] } });
  
  // Total Sales & Completed orders
  const completedOrders = await Order.find({ paymentStatus: 'paid' });
  const totalSales = completedOrders.reduce((sum, order) => sum + order.grandTotal, 0);

  // Cuisines / Restaurants details
  const restaurants = await Restaurant.find({ isDeleted: false });
  const activeCount = restaurants.filter(r => r.isApproved).length;

  return {
    usersCount,
    restaurantsCount,
    activeRestaurantsCount: activeCount,
    activeOrdersCount,
    totalSalesPaise: totalSales,
    completedOrdersCount: completedOrders.length,
  };
};

// ── Manage Users ──────────────────────────────────────────────────────

export const getUsers = async () => {
  return await User.find().select('-password -refreshTokens');
};

export const updateUserRole = async (userId, role) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  user.role = role;
  await user.save();
  return user;
};

export const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new AppError('User not found', 404);
  return { message: 'User deleted successfully' };
};

// ── Manage Restaurants ────────────────────────────────────────────────

export const getRestaurants = async () => {
  return await Restaurant.find({ isDeleted: false });
};

export const approveRestaurant = async (restaurantId, isApproved) => {
  const rest = await Restaurant.findById(restaurantId);
  if (!rest) throw new AppError('Restaurant not found', 404);

  rest.isApproved = isApproved;
  await rest.save();
  return rest;
};
