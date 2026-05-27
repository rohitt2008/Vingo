import * as walletService from './wallet.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

export const getWalletDetails = asyncWrapper(async (req, res) => {
  const data = await walletService.getWalletDetails(req.userId);
  res.status(200).json({ success: true, data });
});

export const topUpWallet = asyncWrapper(async (req, res) => {
  const { amount } = req.body;
  if (!amount) {
    return res.status(400).json({ success: false, message: 'amount is required' });
  }
  const data = await walletService.topUpWallet(req.userId, amount);
  res.status(200).json({ success: true, data });
});

export const confirmTopUp = asyncWrapper(async (req, res) => {
  const result = await walletService.confirmTopUp(req.userId, req.body);
  res.status(200).json({ success: true, message: 'Wallet credited successfully', data: result });
});
