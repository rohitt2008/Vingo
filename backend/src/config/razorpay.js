import Razorpay from 'razorpay';
import env from './env.js';
import logger from '../utils/logger.js';

let razorpay = null;

if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
    logger.info('Razorpay initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize Razorpay client: ${error.message}`);
  }
} else {
  logger.warn('Razorpay credentials not provided. Online payment features will run in Mock mode.');
  
  // High fidelity Mock implementation for seamless local testing
  razorpay = {
    orders: {
      create: async (options) => {
        logger.info(`[MOCK RAZORPAY] Creating order with options: ${JSON.stringify(options)}`);
        return {
          id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
          entity: 'order',
          amount: options.amount,
          amount_paid: 0,
          amount_due: options.amount,
          currency: options.currency || 'INR',
          receipt: options.receipt,
          status: 'created',
          attempts: 0,
          notes: options.notes || [],
          created_at: Math.floor(Date.now() / 1000),
        };
      },
    },
  };
}

export default razorpay;
