/**
 * FILE: src/models/TrendingProduct.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `trendingproducts` collection.
 *   Stores pre-computed trending scores for products. The scores are updated
 *   by RecommendationService.updateTrending() which aggregates UserEvent
 *   documents from the last 30 days.
 *
 * WHY PRE-COMPUTE?
 *   Computing trending scores on every API request by aggregating UserEvent
 *   would be slow at scale. Instead the scores are computed periodically
 *   (by a scheduled job or an admin trigger) and cached here. The
 *   GET /recommendations/trending endpoint simply reads the top N documents
 *   by score and joins with the Product collection.
 *
 * USED BY:
 *   - src/services/RecommendationService.js (getTrending, updateTrending)
 */

const mongoose = require('mongoose');

const trendingProductSchema = new mongoose.Schema({
  productId:  { type: String, required: true, unique: true }, // ObjectId string of the Product
  score:      { type: Number, default: 0 },   // Aggregated weighted event score (last 30 days)
  categoryId: String,                         // Denormalised for category-scoped trending (future)
}, { timestamps: true }); // updatedAt shows when the score was last recomputed

module.exports = mongoose.model('TrendingProduct', trendingProductSchema);
