import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../modules/auth/auth.model.js';

/**
 * Authentication middleware.
 * Verifies the JWT access token from the Authorization header or cookie.
 * Attaches the full user document (minus password) to req.user.
 */
const auth = async (req, res, next) => {
  try {
    // Extract token from Bearer header or cookie
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.cookies?.token) {
      // Backward compatibility with existing cookie name
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Fetch the user and exclude sensitive fields
    const user = await User.findById(decoded.userId)
      .select('-passwordHash -refreshTokens -resetOtp -otpExpires')
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Contact support.',
      });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
};

export default auth;
