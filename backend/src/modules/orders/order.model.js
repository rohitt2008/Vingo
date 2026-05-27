import mongoose from 'mongoose';

// ── Order Item Sub-schema ─────────────────────────────────────────────

const orderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }, // paise
  spiceLevel: String,
  variant: {
    name: String,
    price: Number,
  },
  extras: [{
    name: String,
    price: Number,
  }],
}, { _id: false });

// ── Order Schema ──────────────────────────────────────────────────────

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  },
  items: [orderItemSchema],

  // Statuses
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  },
  statusTimeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  }],

  // Financial Breakdown (all in paise)
  totalAmount: { type: Number, required: true },     // Sum of items
  discountAmount: { type: Number, default: 0 },      // Coupon/Promo discount
  deliveryFee: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },      // Final payable amount

  // Coupon applied
  couponCode: String,

  // Payments
  paymentMethod: {
    type: String,
    enum: ['cod', 'wallet', 'online'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true,
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: String,
    paidAt: Date,
  },

  // Logistics
  deliveryAddress: {
    label: String,
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
  deliveryBoyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  
  // Extra Details
  cancellationReason: String,
  eta: Date, // Estimated delivery time
  otpHash: String,
  otpExpires: Date,
  pickupOtpHash: String,
  pickupOtpExpires: Date,
  
  // Feedback
  rating: { type: Number, min: 1, max: 5 },
  review: String,
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.__v;
      return ret;
    },
  },
});

// ── Indexes ───────────────────────────────────────────────────────────

orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
