import mongoose from 'mongoose';

// ── Menu Item Variant ─────────────────────────────────────────────────

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },   // e.g., "Small", "Medium", "Large"
  price: { type: Number, required: true },  // paise
}, { _id: true });

// ── Menu Item Extra ───────────────────────────────────────────────────

const extraSchema = new mongoose.Schema({
  name: { type: String, required: true },   // e.g., "Extra Cheese", "Extra Sauce"
  price: { type: Number, required: true },  // paise
}, { _id: true });

// ── Menu Item ─────────────────────────────────────────────────────────

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  image: String,  // Cloudinary URL
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,  // paise
  },
  foodType: {
    type: String,
    enum: ['veg', 'non-veg', 'vegan', 'jain'],
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  variants: [variantSchema],
  extras: [extraSchema],

  // Customisation
  spiceLevels: {
    type: [String],
    default: ['mild', 'medium', 'hot'],
  },

  // Availability
  isAvailable: {
    type: Boolean,
    default: true,
  },
  availableFrom: String,  // HH:mm — availability window start
  availableTo: String,    // HH:mm — availability window end

  // Popularity
  orderCount: { type: Number, default: 0 },

  // Position
  sortOrder: { type: Number, default: 0 },
}, { _id: true, timestamps: true });

// ── Menu Category ─────────────────────────────────────────────────────

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sortOrder: { type: Number, default: 0 },
  items: [menuItemSchema],
}, { _id: true });

// ── Menu Schema ───────────────────────────────────────────────────────

const menuSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true,
  },
  categories: [categorySchema],

  // Versioning
  version: {
    type: Number,
    default: 1,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  publishedAt: Date,
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

menuSchema.index({ restaurantId: 1, isPublished: 1 });

// ── Virtual: total items count ────────────────────────────────────────

menuSchema.virtual('totalItems').get(function () {
  return this.categories.reduce((sum, cat) => sum + cat.items.length, 0);
});

const Menu = mongoose.model('Menu', menuSchema);
export default Menu;
