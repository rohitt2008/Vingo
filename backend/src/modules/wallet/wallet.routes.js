import express from 'express';
import * as walletCtrl from './wallet.controller.js';
import auth from '../../middleware/auth.js';

const router = express.Router();

router.get('/', auth, walletCtrl.getWalletDetails);
router.post('/topup', auth, walletCtrl.topUpWallet);
router.post('/confirm-topup', auth, walletCtrl.confirmTopUp);

export default router;
