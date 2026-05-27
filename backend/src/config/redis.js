import Redis from 'ioredis';
import env from './env.js';
import logger from '../utils/logger.js';

let redis = null;

/**
 * In-memory fallback for development when Redis is not available.
 * Implements the subset of Redis commands used in the project.
 */
class InMemoryRedis {
  constructor() {
    this._store = new Map();
    this._ttls = new Map();
    logger.warn('⚠️  Using in-memory Redis fallback (not for production)');
  }

  async get(key) {
    if (this._ttls.has(key) && Date.now() > this._ttls.get(key)) {
      this._store.delete(key);
      this._ttls.delete(key);
      return null;
    }
    return this._store.get(key) || null;
  }

  async set(key, value, ...args) {
    const nx = args.includes('NX');
    if (nx && this._store.has(key)) {
      if (!this._ttls.has(key) || Date.now() <= this._ttls.get(key)) {
        return null;
      }
    }
    this._store.set(key, value);
    // Handle EX (seconds) or PX (ms) expiry
    const exIdx = args.indexOf('EX');
    const pxIdx = args.indexOf('PX');
    if (exIdx !== -1 && args[exIdx + 1]) {
      this._ttls.set(key, Date.now() + Number(args[exIdx + 1]) * 1000);
    } else if (pxIdx !== -1 && args[pxIdx + 1]) {
      this._ttls.set(key, Date.now() + Number(args[pxIdx + 1]));
    }
    return 'OK';
  }

  async del(key) {
    this._store.delete(key);
    this._ttls.delete(key);
    return 1;
  }

  async incr(key) {
    const val = Number(this._store.get(key) || 0) + 1;
    this._store.set(key, String(val));
    return val;
  }

  async expire(key, seconds) {
    this._ttls.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key) {
    if (!this._ttls.has(key)) return -1;
    const remaining = Math.ceil((this._ttls.get(key) - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async hset(key, field, value) {
    let hash = this._store.get(key);
    if (!hash || typeof hash !== 'object') hash = {};
    hash[field] = value;
    this._store.set(key, hash);
    return 1;
  }

  async hget(key, field) {
    const hash = this._store.get(key);
    if (!hash || typeof hash !== 'object') return null;
    return hash[field] || null;
  }

  async hgetall(key) {
    const hash = this._store.get(key);
    if (!hash || typeof hash !== 'object') return null;
    return Object.keys(hash).length > 0 ? hash : null;
  }

  async hdel(key, field) {
    const hash = this._store.get(key);
    if (!hash || typeof hash !== 'object') return 0;
    delete hash[field];
    this._store.set(key, hash);
    return 1;
  }

  async keys(pattern) {
    // Simple glob support for pattern like "cart:*"
    const prefix = pattern.replace('*', '');
    return [...this._store.keys()].filter(k => k.startsWith(prefix));
  }

  // No-op for compatibility
  async quit() { return 'OK'; }
  async ping() { return 'PONG'; }
}

const createRedisClient = () => {
  if (redis) return redis;

  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('⚠️  Redis connection failed, falling back to in-memory store');
          redis = new InMemoryRedis();
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => logger.info('✅ Redis connected'));
    redis.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
      if (!(redis instanceof InMemoryRedis)) {
        redis = new InMemoryRedis();
      }
    });

    // Attempt connection — if it fails, fallback kicks in
    redis.connect().catch(() => {
      if (!(redis instanceof InMemoryRedis)) {
        redis = new InMemoryRedis();
      }
    });
  } catch {
    redis = new InMemoryRedis();
  }

  return redis;
};

// Initialize the active client
createRedisClient();

// Export a Proxy that dynamically delegates to the active client
const redisProxy = new Proxy({}, {
  get(target, prop) {
    const activeClient = redis || createRedisClient();
    const value = activeClient[prop];
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});

export default redisProxy;
