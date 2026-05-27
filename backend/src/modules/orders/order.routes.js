import express from 'express';
import * as orderCtrl from './order.controller.js';
import auth from '../../middleware/auth.js';
import requireRole from '../../middleware/requireRole.js';

const router = express.Router();

router.post('/', auth, orderCtrl.createOrder);
router.post('/verify-payment', auth, orderCtrl.verifyOnlinePayment);
router.get('/history', auth, orderCtrl.getOrderHistory);

// Delivery specific routes
router.get('/available', auth, requireRole('delivery', 'admin'), orderCtrl.getAvailableDeliveryOrders);
router.patch('/:id/accept', auth, requireRole('delivery', 'owner', 'admin'), orderCtrl.acceptDeliveryOrder);
router.patch('/:id/ready', auth, requireRole('owner', 'admin'), orderCtrl.markOrderReady);
router.patch('/:id/pickup', auth, requireRole('delivery', 'admin'), orderCtrl.pickupOrder);
router.post('/:id/verify-otp', auth, requireRole('delivery', 'admin'), orderCtrl.verifyOtp);

router.get('/:id', auth, orderCtrl.getOrderDetails);

// Status updates (Owner, Admin, Delivery boys, or Customers)
router.patch('/:id/status', auth, requireRole('owner', 'admin', 'delivery', 'user'), orderCtrl.updateOrderStatus);

export default router;
