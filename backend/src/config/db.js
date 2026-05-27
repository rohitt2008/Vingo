import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URL, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    logger.warn('⚠️  Continuing without DB in development mode — will retry on first request');
  }
};

export default connectDb;

