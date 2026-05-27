import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// ── Module Routes ─────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes.js';
import restaurantRoutes from './modules/restaurants/restaurant.routes.js';
import menuRoutes from './modules/menus/menu.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import couponRoutes from './modules/coupons/coupon.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

// ── Create Express App ────────────────────────────────────────────────

const createApp = () => {
  const app = express();

  // ── Security ──────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // ── CORS ──────────────────────────────────────────────────────────
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isVercel = origin.endsWith('.vercel.app');
      const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      if (isVercel || isLocal || origin === env.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  }));

  // ── Body Parsing ──────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Request Logging ───────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }));
  }

  // ── Rate Limiting ─────────────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── Static Files ──────────────────────────────────────────────────
  app.use('/uploads', express.static('public/uploads'));

  // ── Health Check ──────────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Vingo API is running',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ── API Routes ────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/menus', menuRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/wallet', walletRoutes);

  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);

  // ── 404 Handler ───────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // ── Error Handler (must be last) ──────────────────────────────────
  app.use(errorHandler);

  return app;
};

export default createApp;
