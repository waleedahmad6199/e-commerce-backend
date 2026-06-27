/**
 * FILE: src/utils/PagedResponse.js
 * ---------------------------------
 * PURPOSE:
 *   Utility class that wraps a paginated dataset in a consistent envelope.
 *   All list endpoints that support pagination use this format so the frontend
 *   always has the same fields to read for pagination controls.
 *
 * OUTPUT SHAPE:
 *   {
 *     content:       [...],  // Array of items for the current page
 *     page:          0,      // Zero-based current page number
 *     size:          20,     // Items per page
 *     totalElements: 150,    // Total items across all pages
 *     totalPages:    8,      // Math.ceil(totalElements / size)
 *     first:         true,   // true if this is the first page
 *     last:          false   // true if this is the last page
 *   }
 *
 * USAGE:
 *   const result = PagedResponse.from(products, total, page, size);
 *   res.json(ApiResponse.success(result, 'Products retrieved'));
 *
 * DEPENDENCIES:
 *   None
 *
 * USED BY:
 *   - src/services/CatalogService.js
 *   - src/services/OrderService.js
 *   - src/services/SearchService.js
 *   - src/services/UserService.js
 *   - src/services/AdminUserService.js
 *   - src/services/CouponService.js
 *   - src/services/AuditLogService.js
 */

class PagedResponse {
  /**
   * from()
   * Wraps an array of data items with pagination metadata.
   *
   * @param {Array}  data  - The items for the current page
   * @param {number} total - Total number of items across all pages
   * @param {number} page  - Current zero-based page index
   * @param {number} size  - Number of items per page
   * @returns {object} Paginated response envelope
   */
  static from(data, total, page, size) {
    const totalPages = Math.ceil(total / size); // Calculate how many pages exist in total
    return {
      content:       data,              // The actual items for this page
      page,                             // Zero-based page index (0, 1, 2, ...)
      size,                             // Items per page
      totalElements: total,             // Grand total items in the collection
      totalPages,                       // Number of pages: Math.ceil(total / size)
      first: page === 0,                // true when on the very first page
      last:  page >= totalPages - 1,    // true when on the very last page
    };
  }
}

module.exports = PagedResponse; // Export for use in services
