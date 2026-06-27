/**
 * FILE: src/utils/helpers.js
 * ---------------------------
 * PURPOSE:
 *   Shared utility/helper functions used across the backend.
 *   Keeping these here avoids code duplication and makes them independently testable.
 *
 * EXPORTS:
 *   - generateOrderNumber  : Creates a unique human-readable order number
 *   - generateSlug         : Converts a string to a URL-safe slug
 *   - computeCartTotals    : Sums up cart item prices and quantities
 *   - generateUUID         : Generates a random UUID v4 string
 *
 * DEPENDENCIES:
 *   - uuid : npm package for generating standard UUID v4 strings
 *
 * USED BY:
 *   - src/services/OrderService.js    (generateOrderNumber, computeCartTotals)
 *   - src/services/CatalogService.js  (generateSlug)
 *   - src/services/CartService.js     (generateUUID, computeCartTotals)
 *   - src/controllers/UploadController.js (generateUUID)
 *   - src/services/AdminUserService.js    (generateUUID)
 */

const { v4: uuidv4 } = require('uuid'); // uuid v4 generator — cryptographically random

/**
 * generateOrderNumber()
 * Creates a unique, human-readable order number string.
 * Format: 'ORD-<timestamp>' e.g. 'ORD-1700000000000'
 * Using the timestamp guarantees uniqueness for orders created in different milliseconds.
 * For high-volume scenarios, append random characters.
 *
 * @returns {string} Order number string
 */
function generateOrderNumber() {
  return 'ORD-' + Date.now(); // Prefix + current Unix timestamp in milliseconds
}

/**
 * generateSlug(text)
 * Converts a human-readable string into a URL-safe slug.
 * Example: 'Premium Noise-Cancelling Headphones!' → 'premium-noise-cancelling-headphones'
 *
 * Steps:
 *   1. Lowercase the entire string
 *   2. Remove characters that aren't alphanumeric, whitespace, or hyphens
 *   3. Replace spaces and underscores with hyphens
 *   4. Strip leading/trailing hyphens
 *
 * @param {string} text - The input string (e.g. a product title)
 * @returns {string} URL-safe slug
 */
function generateSlug(text) {
  return text
    .toLowerCase()                           // Convert all characters to lowercase
    .replace(/[^\w\s-]/g, '')                // Remove any character that is not a word char, space, or hyphen
    .replace(/[\s_]+/g, '-')                 // Replace one or more spaces or underscores with a single hyphen
    .replace(/^-+|-+$/g, '');               // Strip any leading or trailing hyphens
}

/**
 * computeCartTotals(items)
 * Calculates the subtotal and total item count for a cart.
 *
 * @param {Array} items - Array of cart item objects, each with:
 *   - priceAtTime {number} : price per unit when item was added to cart
 *   - quantity    {number} : number of units
 * @returns {{ subtotal: number, itemCount: number }}
 */
function computeCartTotals(items) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.priceAtTime || 0) * (item.quantity || 0); // Accumulate: price × qty per item
  }, 0); // Starting value of the accumulator

  const itemCount = items.reduce((sum, item) => {
    return sum + (item.quantity || 0); // Sum up all unit quantities
  }, 0);

  return { subtotal, itemCount }; // Return both values as an object
}

/**
 * generateUUID()
 * Returns a randomly generated UUID v4 string.
 * Example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 * Used for variant IDs, media IDs, and reset tokens.
 *
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  return uuidv4(); // Delegate to the uuid library — crypto-random
}

module.exports = { generateOrderNumber, generateSlug, computeCartTotals, generateUUID };
