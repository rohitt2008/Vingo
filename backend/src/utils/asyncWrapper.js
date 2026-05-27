/**
 * Wraps an async Express route handler to catch errors
 * and forward them to the centralized error handler.
 *
 * Usage: router.get('/path', asyncWrapper(myController));
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware
 */
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncWrapper;
