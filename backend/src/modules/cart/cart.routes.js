import express from 'express';
import * as cartCtrl from './cart.controller.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

router.get('/', auth, cartCtrl.getCart);
router.post('/add', auth, cartCtrl.addToCart);
router.post('/remove', auth, cartCtrl.removeFromCart);
router.delete('/clear', auth, cartCtrl.clearCart);

export default router;
