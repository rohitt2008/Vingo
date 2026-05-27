import * as orderService from './order.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const createOrder = asyncWrapper(async (req, res) => {
  const order = await orderService.createOrder(req.userId, req.body);
  res.status(201).json({ success: true, message: 'Order created successfully', data: { order } });
});

export const verifyOnlinePayment = asyncWrapper(async (req, res) => {
  const order = await orderService.verifyOnlinePayment(req.userId, req.body);
  res.status(200).json({ success: true, message: 'Payment verified and order confirmed', data: { order } });
});

export const getOrderHistory = asyncWrapper(async (req, res) => {
  const orders = await orderService.getOrderHistory(req.userId, req.userRole);
  res.status(200).json({ success: true, data: { orders } });
});

export const getOrderDetails = asyncWrapper(async (req, res) => {
  const order = await orderService.getOrderDetails(req.params.id, req.userId, req.userRole);
  res.status(200).json({ success: true, data: { order } });
});

export const updateOrderStatus = asyncWrapper(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: 'status is required' });
  }
  const order = await orderService.updateOrderStatus(req.params.id, req.userId, req.userRole, status);
  res.status(200).json({ success: true, message: 'Order status updated', data: { order } });
});

export const getAvailableDeliveryOrders = asyncWrapper(async (req, res) => {
  const { city } = req.query;
  const orders = await orderService.getAvailableDeliveryOrders(city);
  res.status(200).json({ success: true, data: { orders } });
});

export const acceptDeliveryOrder = asyncWrapper(async (req, res) => {
  if (req.userRole === 'owner') {
    const { estimatedPrepTime } = req.body;
    const order = await orderService.acceptRestaurantOrder(req.params.id, req.userId, estimatedPrepTime);
    res.status(200).json({ success: true, message: 'Order accepted by restaurant', data: { order } });
  } else {
    const order = await orderService.acceptDeliveryOrder(req.params.id, req.userId);
    res.status(200).json({ success: true, message: 'Order accepted for delivery', data: { order } });
  }
});

export const markOrderReady = asyncWrapper(async (req, res) => {
  const order = await orderService.markOrderReady(req.params.id, req.userId);
  res.status(200).json({ success: true, message: 'Order marked as ready', data: { order } });
});

export const pickupOrder = asyncWrapper(async (req, res) => {
  const order = await orderService.pickupOrder(req.params.id, req.userId);
  res.status(200).json({ success: true, message: 'Order picked up', data: { order } });
});

export const verifyOtp = asyncWrapper(async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP is required' });
  }
  const order = await orderService.verifyOtp(req.params.id, otp);
  res.status(200).json({ success: true, message: 'OTP verified and order delivered', data: { order } });
});
