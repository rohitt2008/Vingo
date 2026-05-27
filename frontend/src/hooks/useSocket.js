import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { serverUrl } from '../App';

export const useSocket = (orderId, callbacks = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    // Connect to backend Socket.IO server
    const socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Vingo Real-time Socket server');
      // Join Room
      socket.emit('join_order_room', orderId);
    });

    // Listen for live driver location coordinates
    socket.on('location_update', (data) => {
      console.log('Received real-time driver location coordinate update:', data);
      if (callbacks.onLocationUpdate) {
        callbacks.onLocationUpdate(data);
      }
    });

    // Listen for real-time order status transitions
    socket.on('order_status_changed', (data) => {
      console.log('Received real-time order status update:', data);
      if (callbacks.onOrderStatusUpdate) {
        callbacks.onOrderStatusUpdate(data);
      }
    });

    // Listen for ETA and dynamic Mapbox distance updates
    socket.on('eta_update', (data) => {
      console.log('Received real-time ETA update:', data);
      if (callbacks.onEtaUpdate) {
        callbacks.onEtaUpdate(data);
      }
    });

    // Listen for proximity OTP ready signals
    socket.on('otp_ready_near', (data) => {
      console.log('Rider is within 50m proximity OTP range:', data);
      if (callbacks.onOtpReadyNear) {
        callbacks.onOtpReadyNear(data);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Vingo Real-time Socket server');
    });

    return () => {
      if (socket) {
        socket.emit('leave_order_room', orderId);
        socket.disconnect();
      }
    };
  }, [orderId, callbacks.onLocationUpdate, callbacks.onOrderStatusUpdate, callbacks.onEtaUpdate, callbacks.onOtpReadyNear]);

  // Expose emit functions if needed (e.g. driver emitting location coordinates)
  const emitDriverLocation = (latitude, longitude) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('driver_location', {
        orderId,
        latitude,
        longitude,
      });
    }
  };

  const emitGpsPing = (latitude, longitude, deliveryBoyId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('gps_ping', {
        orderId,
        latitude,
        longitude,
        deliveryBoyId,
      });
    }
  };

  return {
    socket: socketRef.current,
    emitDriverLocation,
    emitGpsPing,
  };
};
