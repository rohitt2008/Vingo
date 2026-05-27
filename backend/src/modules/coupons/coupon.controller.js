import * as couponService from './coupon.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const createCoupon = asyncWrapper(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  res.status(201).json({ success: true, message: 'Coupon created', data: { coupon } });
});

export const validateCoupon = asyncWrapper(async (req, res) => {
  const { code, orderAmount } = req.body;
  if (!code || !orderAmount) {
    return res.status(400).json({ success: false, message: 'code and orderAmount (paise) are required' });
  }
  const result = await couponService.validateCoupon(code, req.userId, orderAmount);
  res.status(200).json({ success: true, message: 'Coupon valid', data: result });
});

export const listActiveCoupons = asyncWrapper(async (req, res) => {
  const coupons = await couponService.listActiveCoupons();
  res.status(200).json({ success: true, data: { coupons } });
});

export const deleteCoupon = asyncWrapper(async (req, res) => {
  const result = await couponService.deleteCoupon(req.params.id);
  res.status(200).json({ success: true, ...result });
});
