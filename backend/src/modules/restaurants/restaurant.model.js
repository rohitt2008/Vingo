import mongoose from 'mongoose';

// ── Day Schedule Sub-schema ───────────────────────────────────────────

const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true,
  },
  open: { type: String, default: '09:00' },  // HH:mm
  close: { type: String, default: '22:00' },
  isClosed: { type: Boolean, default: false },
}, { _id: false });

// ── Restaurant Schema ─────────────────────────────────────────────────

const restaurantSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Restaurant must have an owner'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
    maxlength: 150,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  cuisines: [{
    type: String,
    trim: true,
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      default: [0, 0],
    },
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: String,
  },
  coverImage: {
    type: String,  // Cloudinary URL
  },
  gallery: [String],  // Array of Cloudinary URLs
  phone: String,
  email: String,

  // Ratings (denormalized)
  avgRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },

  // Status
  isOpen: {
    type: Boolean,
    default: true,
  },
  openingHours: {
    type: [dayScheduleSchema],
    default: () => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      .map(day => ({ day, open: '09:00', close: '22:00', isClosed: false })),
  },

  // Delivery
  avgDeliveryMin: {
    type: Number,
    default: 30,
  },
  deliveryRadius: {
    type: Number,
    default: 5,  // km
  },
  minOrderAmount: {
    type: Number,
    default: 0,  // paise
  },

  // Pricing
  priceForTwo: {
    type: Number,
    default: 40000,  // ₹400 in paise
  },

  // Platform
  isApproved: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  fssaiLicense: String,

  // Metadata
  tags: [String],  // e.g., 'trending', 'new', 'top-rated'
  totalOrders: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      delete ret.__v;
      return ret;
    },
  },
});

// ── Indexes ───────────────────────────────────────────────────────────

restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ name: 'text', 'cuisines': 'text' });
restaurantSchema.index({ isOpen: 1, isApproved: 1, isDeleted: 1 });
restaurantSchema.index({ avgRating: -1 });
restaurantSchema.index({ priceForTwo: 1 });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;
