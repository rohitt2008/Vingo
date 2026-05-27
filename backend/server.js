import http from 'http';
import createApp from './src/app.js';
import connectDb from './src/config/db.js';
import env from './src/config/env.js';
import logger from './src/utils/logger.js';
import { initSocket } from './src/config/socket.js';
import { startBackgroundJobs } from './src/utils/queueManager.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDb();

    // Auto-approve all restaurants in development environment
    if (env.NODE_ENV === 'development') {
      try {
        const { default: Restaurant } = await import('./src/modules/restaurants/restaurant.model.js');
        const res = await Restaurant.updateMany({ isDeleted: false }, { $set: { isApproved: true } });
        logger.info(`🔧 [DEV] Automatically approved all registered restaurants (${res.modifiedCount} updated)`);
      } catch (err) {
        logger.error(`🔧 [DEV] Auto-approval failed: ${err.message}`);
      }
    }

    // Start cron background workers
    startBackgroundJobs();

    // Create Express app
    const app = createApp();

    // Create HTTP server & Attach Socket.IO
    const server = http.createServer(app);
    initSocket(server);

    // Start listening
    const PORT = env.PORT;
    server.listen(PORT, () => {
      logger.info(`🚀 Vingo API server running on port ${PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
