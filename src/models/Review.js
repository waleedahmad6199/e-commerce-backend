/**
 * FILE: src/models/Review.js
 * ---------------------------
 * PURPOSE:
 *   Mongoose schema for the `reviews` collection.
 *   Reviews are stored as a separate collection (not embedded in Product) because:
 *   - Volume can be high (thousands of reviews per popular product).
 *   - Embedding would make the Product document extremely large.
 *   - Reviews are sometimes queried independently (admin moderation view, user review history).
 *   - The Product.ratingSummary cache is updated after each review write so the
 *     product listing never needs to join the reviews collection.
 *
 * BUSINESS RULES (enforced in CatalogService):
 *   - A user can only submit one review per product (checked via findOne before insert).
 *   - After every create or delete, CatalogService._updateProductRating() recalculates
 *     and updates Product.ratingSummary.
 *   - Only PUBLISHED reviews count toward the rating average.
 *   - Admin can change status to PENDING or REJECTED to hide reviews.
 *
 * USED BY:
 *   - src/services/CatalogService.js  (create, delete, list, rating recalculation)
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type:  String,
    required: true,
    index: true, // Indexed for fast lookup of all reviews for one product
  },
  userId:   { type: String, required: true }, // MongoDB ObjectId string of the reviewer
  userName: String,                           // Display name snapshot (survives user rename)

  rating: {
    type:     Number,
    required: true,
    min:      1, // Minimum star rating
    max:      5, // Maximum star rating
  },
  title:   String, // Optional review headline (e.g. "Great product!")
  comment: String, // Optional review body text

  verified: { type: Boolean, default: false }, // True if reviewer has purchased the product

  status: {
    type:    String,
    enum:    ['PUBLISHED', 'PENDING', 'REJECTED'],
    default: 'PUBLISHED', // New reviews are immediately visible
  },
}, { timestamps: true }); // Adds createdAt + updatedAt

// ── Indexes ────────────────────────────────────────────────────────────────
reviewSchema.index({ productId: 1, createdAt: -1 }); // Product reviews sorted by newest
reviewSchema.index({ status: 1 });                   // Admin moderation: filter by status

module.exports = mongoose.model('Review', reviewSchema);
