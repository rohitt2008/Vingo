import mongoose from 'mongoose';

const deliveryTrackingSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  deliveryBoyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  heading: { type: Number },
  speed: { type: Number },
  accuracy: { type: Number },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Spatial index for geo proximity queries
deliveryTrackingSchema.index({ location: '2dsphere' });

// TTL index to automatically clean up logs after 72 hours (259200 seconds)
deliveryTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 259200 });

const DeliveryTracking = mongoose.model('DeliveryTracking', deliveryTrackingSchema);
export default DeliveryTracking;
