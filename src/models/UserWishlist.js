/**
 * FILE: src/models/UserWishlist.js
 * ---------------------------------
 * PURPOSE:
 *   Mongoose schema for the `userwishlists` collection.
 *   Each document represents one product saved to one user's wishlist.
 *   The compound unique index on (userId, productId) prevents duplicates.
 *
 * DESIGN NOTE:
 *   Rather than embedding an array of productIds inside the User document,
 *   each wishlist entry is its own document. This approach:
 *   - Prevents unbounded array growth on the User document.
 *   - Makes it trivial to check "is this product in my wishlist" with findOne().
 *   - Keeps addedAt timestamps per item for sorting/analytics.
 *
 * USED BY:
 *   - src/services/UserService.js (getWishlistProductIds, addProductToWishlist, remove)
 *   - src/controllers/UserController.js
 */

const mongoose = require('mongoose');

const userWishlistSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId, // Reference to User document
    ref:      'User',
    required: true,
  },
  productId: {
    type:     String,                          // MongoDB ObjectId string of the Product
    required: true,
  },
  addedAt: {
    type:    Date,
    default: Date.now, // Records exactly when the product was saved to the wishlist
  },
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────────────────
// Compound unique index: a user can only save any given product once
userWishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });
userWishlistSchema.index({ userId: 1 }); // Fast lookup of all wishlist items for a user

module.exports = mongoose.model('UserWishlist', userWishlistSchema);
