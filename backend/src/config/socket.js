import { Server } from 'socket.io';
import env from './env.js';
import logger from '../utils/logger.js';
import Order from '../modules/orders/order.model.js';
import User from '../modules/auth/auth.model.js';
import bcrypt from 'bcryptjs';

let io = null;

// Haversine Distance helper
function getDistanceInMeters(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371e3; // Radius of Earth in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join Order Tracking Room
    socket.on('join_order_room', (orderId) => {
      socket.join(`order_${orderId}`);
      logger.info(`Socket ${socket.id} joined room: order_${orderId}`);
    });

    // Leave Order Tracking Room
    socket.on('leave_order_room', (orderId) => {
      socket.leave(`order_${orderId}`);
      logger.info(`Socket ${socket.id} left room: order_${orderId}`);
    });

    // Join Private User Room for delivery offers
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      logger.info(`Socket ${socket.id} joined private room: user_${userId}`);
    });

    // ── Vingo telemetry stream handler (gps_ping) ──────────────────────
    socket.on('gps_ping', async (data) => {
      const { orderId, latitude, longitude, deliveryBoyId } = data;
      if (!orderId || !latitude || !longitude) return;

      try {
        const order = await Order.findById(orderId);
        if (!order) return;

        // Update driver's location on their User profile so proximity queries stay fresh
        if (deliveryBoyId) {
          await User.findByIdAndUpdate(deliveryBoyId, {
            'deliveryDetails.currentLocation': {
              type: 'Point',
              coordinates: [longitude, latitude],
            }
          });
        }

        // Kalman / Rolling-Average coordinates smoothing
        const { default: DeliveryTracking } = await import('../modules/tracking/tracking.model.js');
        await DeliveryTracking.create({
          orderId,
          deliveryBoyId: deliveryBoyId || order.deliveryBoyId,
          location: { type: 'Point', coordinates: [longitude, latitude] },
          timestamp: new Date(),
        });

        const trackingPoints = await DeliveryTracking.find({ orderId })
          .sort({ timestamp: -1 })
          .limit(3);

        let smoothLat = latitude;
        let smoothLng = longitude;
        if (trackingPoints.length >= 2) {
          const sumLat = trackingPoints.reduce((sum, p) => sum + p.location.coordinates[1], 0);
          const sumLng = trackingPoints.reduce((sum, p) => sum + p.location.coordinates[0], 0);
          smoothLat = sumLat / trackingPoints.length;
          smoothLng = sumLng / trackingPoints.length;
        }

        // Calculate distance to customer's destination address
        const destCoords = order.deliveryAddress?.coordinates || [77.4350, 23.2750]; // Default Bhopal if not set
        const distanceMeters = getDistanceInMeters([smoothLng, smoothLat], destCoords);

        // Compute simulated dynamic ETA (20km/h base speed + buffer minutes)
        const etaMinutes = Math.max(1, Math.round((distanceMeters / 1000) / 20 * 60) + 2);

        // Broadcast smoothed coordinate coordinates to room
        io.to(`order_${orderId}`).emit('location_update', {
          orderId,
          latitude: smoothLat,
          longitude: smoothLng,
          timestamp: new Date().toISOString(),
        });

        // Broadcast ETA update
        io.to(`order_${orderId}`).emit('eta_update', {
          orderId,
          etaMinutes,
          distanceMeters: Math.round(distanceMeters),
        });

        // OTP Gating: generates or pulls OTP when within 50 meters of customer
        if (distanceMeters < 50) {
          let plainOtp = '123456';
          if (!order.otpHash) {
            // Generate OTP dynamically if not already set
            plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
            order.otpHash = await bcrypt.hash(plainOtp, 10);
            order.otpExpires = new Date(Date.now() + 60 * 60 * 1000);
            await order.save();
          }

          // Push otp_request event containing OTP to standard room
          io.to(`order_${orderId}`).emit('otp_ready_near', {
            orderId,
            message: 'Rider is close! Please prepare to provide the secure OTP.',
          });
        }

        logger.debug(`[SOCKET] gps_ping processed for order ${orderId}: Smooth(${smoothLat.toFixed(6)}, ${smoothLng.toFixed(6)}), Distance: ${distanceMeters.toFixed(1)}m`);
      } catch (err) {
        logger.error(`[SOCKET] gps_ping error: ${err.message}`);
      }
    });

    // Legacy driver location mapping (backward compatibility helper)
    socket.on('driver_location', (data) => {
      const { orderId, latitude, longitude } = data;
      if (!orderId || !latitude || !longitude) return;

      io.to(`order_${orderId}`).emit('location_update', {
        orderId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// ── Trigger Order Status Broadcasts ───────────────────────────────────
export const emitOrderStatusUpdate = (orderId, status, details = {}) => {
  if (io) {
    io.to(`order_${orderId}`).emit('order_status_changed', {
      orderId,
      status,
      details,
      timestamp: new Date().toISOString(),
    });
    logger.info(`[SOCKET] Broadcasted order status update for ${orderId}: ${status}`);
  }
};

export const getIoInstance = () => io;
