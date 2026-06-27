/**
 * FILE: src/utils/ApiResponse.js
 * --------------------------------
 * PURPOSE:
 *   Provides two static factory methods that produce a consistent JSON response
 *   envelope for all API endpoints. Using a shared response format means:
 *     - The frontend always knows where to find data (response.data).
 *     - The frontend always knows where to find error messages (response.message).
 *     - Every response has a timestamp for log correlation.
 *
 * SUCCESS SHAPE:
 *   {
 *     success:   true,
 *     data:      <any>,          // The actual payload (object, array, null)
 *     message:   'Optional msg', // Optional human-readable description
 *     timestamp: '2024-01-01T00:00:00.000Z'
 *   }
 *
 * ERROR SHAPE:
 *   {
 *     success:   false,
 *     error:     { code: 'ERROR_CODE', details?: any },
 *     message:   'Description of what went wrong',
 *     timestamp: '2024-01-01T00:00:00.000Z'
 *   }
 *
 * USAGE:
 *   res.status(200).json(ApiResponse.success(products, 'Products retrieved'));
 *   res.status(404).json(ApiResponse.error('Product not found', 'NOT_FOUND'));
 *
 * DEPENDENCIES:
 *   None
 *
 * USED BY:
 *   Every controller in the backend.
 */

class ApiResponse {
  /**
   * success()
   * Builds a successful response envelope.
   *
   * @param {*}      data    - The payload to return to the client
   * @param {string} message - Optional human-readable success message
   * @returns {object} The response object to pass to res.json()
   */
  static success(data, message = null) {
    const response = {
      success:   true,                       // Indicates the operation succeeded
      data,                                  // The actual response payload
      timestamp: new Date().toISOString(),   // ISO 8601 timestamp for log correlation
    };
    if (message) response.message = message; // Only include message field if provided
    return response;                         // Return the fully-formed response object
  }

  /**
   * error()
   * Builds an error response envelope.
   *
   * @param {string} message - Human-readable description of what went wrong
   * @param {string} code    - Machine-readable error code (e.g. 'NOT_FOUND')
   * @param {*}      details - Optional extra context (validation errors, etc.)
   * @returns {object} The response object to pass to res.json()
   */
  static error(message, code = 'INTERNAL_ERROR', details = null) {
    const response = {
      success:   false,                      // Indicates the operation failed
      error:     { code },                   // Machine-readable code the frontend can switch on
      message,                               // Human-readable explanation for display
      timestamp: new Date().toISOString(),   // ISO 8601 timestamp
    };
    if (details) response.error.details = details; // Attach extra context if provided
    return response;                               // Return the fully-formed error response
  }
}

module.exports = ApiResponse; // Export class for use in controllers
