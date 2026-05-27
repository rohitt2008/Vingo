/**
 * Role-Based Access Control middleware.
 * Checks if the authenticated user has one of the allowed roles.
 *
 * Must be used AFTER the auth middleware (req.user must exist).
 *
 * Usage:
 *   router.post('/approve', auth, requireRole('admin'), controller);
 *   router.put('/menu', auth, requireRole('owner', 'admin'), controller);
 *
 * @param {...string} roles - Allowed roles for this route
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

export default requireRole;
