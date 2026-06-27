/**
 * FILE: src/utils/ApiError.js
 * ----------------------------
 * PURPOSE:
 *   Custom error class that extends the native JavaScript Error class.
 *   By using ApiError instead of generic Error objects, every thrown error
 *   automatically carries:
 *     - statusCode  : the HTTP status code to send back (400, 401, 403, 404, 409, 500, ...)
 *     - code        : a machine-readable string code (e.g. 'NOT_FOUND', 'CONFLICT')
 *     - details     : optional extra context (field names, validation messages, etc.)
 *
 * WHY THIS MATTERS:
 *   The errorHandler middleware (src/middleware/errorHandler.js) checks for
 *   err.statusCode. If it is set, the error is considered "expected" (a known
 *   client/business error) and is returned to the caller. If statusCode is
 *   missing, the error is treated as a server bug and returns a generic 500.
 *
 * USAGE:
 *   throw new ApiError(404, 'Product not found');
 *   throw ApiError.conflict('Email already in use');
 *   throw ApiError.badRequest('Invalid coupon code', { field: 'code' });
 *
 * DEPENDENCIES:
 *   None — extends native Error
 *
 * USED BY:
 *   Almost every service and controller in the backend.
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 409)
   * @param {string} message    - Human-readable error description
   * @param {string} code       - Machine-readable error code string
   * @param {*}      details    - Optional extra context (object, string, array)
   */
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = null) {
    super(message);           // Call the native Error constructor (sets this.message and stack)
    this.statusCode = statusCode; // HTTP status code used by errorHandler middleware
    this.code       = code;       // Machine-readable code for the frontend to switch on
    this.details    = details;    // Optional extra data (field names, upstream error, etc.)
    Error.captureStackTrace(this, this.constructor); // Remove constructor frame from stack trace
  }

  // ── Static Factory Methods ────────────────────────────────────────────────
  // Convenience methods so callers don't have to remember status codes.

  /** 400 Bad Request — client sent malformed or invalid data */
  static badRequest(message = 'Bad request', details = null) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  /** 401 Unauthorized — authentication required or token invalid */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  /** 403 Forbidden — authenticated but does not have permission */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  /** 404 Not Found — requested resource does not exist */
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  /** 409 Conflict — resource already exists (unique constraint violation) */
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message, 'CONFLICT');
  }

  /** 500 Internal Server Error — unexpected server-side failure */
  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

module.exports = ApiError; // Export the class for use in services and controllers
