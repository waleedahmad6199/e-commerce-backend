/**
 * FILE: src/middleware/errorHandler.js
 * -------------------------------------
 * PURPOSE:
 *   Centralised Express error-handling and 404-handling middleware.
 *   All unhandled errors thrown (or passed via next(err)) in any route or
 *   service eventually reach errorHandler(). This ensures every error response
 *   has a consistent shape that the frontend can rely on.
 *
 * RESPONSE SHAPE (all errors):
 *   {
 *     success:   false,
 *     error:     { code: 'ERROR_CODE', details?: any },
 *     message:   'Human readable description',
 *     timestamp: '2024-01-01T00:00:00.000Z'
 *   }
 *
 * ERROR TYPES HANDLED:
 *   - Mongoose ValidationError   → 400  (schema field validation failed)
 *   - Mongoose CastError         → 400  (invalid ObjectId format)
 *   - MongoDB duplicate key (11000) → 409 (unique constraint violated)
 *   - ApiError (our custom class) → uses its own statusCode
 *   - Everything else             → 500  (logged to console)
 *
 * DEPENDENCIES:
 *   None — this module only uses built-in Node.js functionality.
 *
 * USED BY:
 *   - src/app.js  (registered as the last app.use() call)
 */

/**
 * errorHandler
 * Express error-handling middleware — must have exactly 4 parameters
 * (err, req, res, next) for Express to recognise it as an error handler.
 *
 * @param {Error}    err  - The thrown/passed error object
 * @param {Request}  req  - Express request object
 * @param {Response} res  - Express response object
 * @param {Function} next - Express next function (required by signature, rarely called)
 */
const errorHandler = (err, req, res, next) => {
  // ── Mongoose ValidationError ─────────────────────────────────────────────
  // Thrown when a document fails Mongoose schema validation (e.g. required field missing).
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success:   false,
      error:     { code: 'VALIDATION_ERROR', details: err.message }, // Full Mongoose error text
      message:   'Validation failed',
      timestamp: new Date().toISOString(),
    });
  }

  // ── Mongoose CastError ───────────────────────────────────────────────────
  // Thrown when an invalid value is cast to a Mongoose type (most commonly:
  // an invalid MongoDB ObjectId string is passed as a document _id).
  if (err.name === 'CastError') {
    return res.status(400).json({
      success:   false,
      error:     { code: 'INVALID_ID', details: err.message }, // E.g. "Cast to ObjectId failed"
      message:   'Invalid resource ID',
      timestamp: new Date().toISOString(),
    });
  }

  // ── MongoDB Duplicate Key Error (code 11000) ─────────────────────────────
  // Thrown by MongoDB when an insert/update violates a unique index.
  // err.keyValue contains the field(s) that caused the conflict.
  if (err.code === 11000) {
    return res.status(409).json({
      success:   false,
      error:     { code: 'DUPLICATE_KEY', details: err.keyValue }, // e.g. { email: 'x@y.com' }
      message:   'Resource already exists',
      timestamp: new Date().toISOString(),
    });
  }

  // ── Determine HTTP Status Code ─────────────────────────────────────────
  // Our ApiError class sets err.statusCode explicitly (4xx errors).
  // Unknown errors default to 500 (Internal Server Error).
  const statusCode = err.statusCode || 500;

  // Only log server errors (5xx) — 4xx errors are expected client mistakes
  if (statusCode >= 500) {
    console.error('Error:', err); // Full stack trace for unexpected server errors
  }

  // Use err.message for known errors; generic text for unknown 500 errors
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success:   false,
    error:     { code: err.code || 'INTERNAL_ERROR' }, // Our error code from ApiError
    message,                                            // Human-readable description
    timestamp: new Date().toISOString(),                // ISO timestamp for log correlation
  });
};

/**
 * notFoundHandler
 * Catches all requests that did not match any registered route.
 * Must be registered AFTER all route definitions and BEFORE errorHandler.
 *
 * @param {Request}  req  - Express request object
 * @param {Response} res  - Express response object
 * @param {Function} next - Express next (not used here)
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success:   false,
    error:     { code: 'NOT_FOUND' },
    message:   `Route not found: ${req.method} ${req.originalUrl}`, // Exact path for debugging
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  errorHandler,    // Register last in app.js — catches all thrown errors
  notFoundHandler, // Register second-to-last in app.js — catches unknown routes
};
