/**
 * errorHandler.js  —  Centralized Express error handling middleware
 *
 * Catches errors thrown anywhere in the route handlers and returns
 * a consistent JSON error response so the API never leaks stack traces.
 */

export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`❌ [${status}] ${message}`);

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
