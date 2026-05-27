import express from 'express';
import * as couponCtrl from './coupon.controller.js';
import auth from '../../middleware/auth.js';
import requireRole from '../../middleware/requireRole.js';

const router = express.Router();

router.get('/active', auth, couponCtrl.listActiveCoupons);
router.post('/validate', auth, couponCtrl.validateCoupon);

// Admin Coupon Management
router.post('/', auth, requireRole('admin'), couponCtrl.createCoupon);
router.delete('/:id', auth, requireRole('admin'), couponCtrl.deleteCoupon);

export default router;
