import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true, // positive for credits, negative for debits (paise)
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  purpose: {
    type: String,
    enum: ['deposit', 'order_payment', 'refund', 'referral_bonus', 'cashback', 'payout'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  referenceId: {
    type: String, // e.g. Razorpay orderId or paymentId, orderId, referral user's name
  },
  description: String,
}, {
  timestamps: true,
});

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
export default WalletTransaction;
