import crypto from 'crypto';

/**
 * Generate a random alphanumeric referral code.
 * @param {number} length - Code length (default 6)
 * @returns {string}
 */
export const generateReferralCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars I/O/0/1
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

/**
 * Generate a numeric OTP.
 * @param {number} digits - OTP length (default 6)
 * @returns {string}
 */
export const generateOTP = (digits = 6) => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

/**
 * Generate an HMAC token for password reset.
 * @param {string} userId - User's MongoDB ObjectId as string
 * @param {string} secret - JWT secret or dedicated HMAC secret
 * @param {number} expiresInMinutes - Token validity in minutes
 * @returns {{ token: string, expires: Date }}
 */
export const generateResetToken = (userId, secret, expiresInMinutes = 15) => {
  const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const payload = `${userId}:${expires.getTime()}`;
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { token, expires };
};

/**
 * Verify an HMAC reset token.
 * @param {string} token - The token to verify
 * @param {string} userId - User's MongoDB ObjectId as string
 * @param {string} secret - Same secret used to generate
 * @param {Date} expires - The expiry date stored with the token
 * @returns {boolean}
 */
export const verifyResetToken = (token, userId, secret, expires) => {
  if (new Date() > new Date(expires)) return false;
  const payload = `${userId}:${new Date(expires).getTime()}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
};

/**
 * Generate a UUID v4 idempotency key.
 * @returns {string}
 */
export const generateIdempotencyKey = () => crypto.randomUUID();
