import winston from 'winston';
import env from '../config/env.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : combine(colorize(), logFormat)
  ),
  defaultMeta: { service: 'vingo-api' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Silence logs during tests
if (env.NODE_ENV === 'test') {
  logger.silent = true;
}

export default logger;
