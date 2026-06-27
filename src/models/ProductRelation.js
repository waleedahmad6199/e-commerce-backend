/**
 * FILE: src/models/ProductRelation.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `productrelations` collection.
 *   Stores computed relationships between pairs of products.
 *   Used by the recommendation engine to power "Similar Products" and
 *   "Frequently Bought Together" features.
 *
 * RELATION TYPES:
 *   SIMILAR              : Products that share category, attributes, or are often
 *                          viewed together. (Currently populated manually or via future ML.)
 *   FREQUENTLY_TOGETHER  : Products that appear in the same delivered orders.
 *                          Computed by RecommendationService.updateProductRelations()
 *                          which analyses order co-occurrence in the last 30 days.
 *
 * HOW SCORES WORK:
 *   For FREQUENTLY_TOGETHER: score = number of orders containing both productId and relatedProductId.
 *   Higher score = stronger association = appears first in the "Frequently Bought Together" section.
 *
 * USED BY:
 *   - src/services/RecommendationService.js (getSimilarProducts, getFrequentlyTogether, updateProductRelations)
 */

const mongoose = require('mongoose');

const productRelationSchema = new mongoose.Schema({
  productId:        { type: String, required: true }, // Source product ObjectId string
  relatedProductId: { type: String, required: true }, // Target product ObjectId string
  relationType: {
    type:     String,
    required: true,
    enum:     ['SIMILAR', 'FREQUENTLY_TOGETHER'], // The nature of the relationship
  },
  score: { type: Number, default: 0 }, // Relationship strength (higher = more relevant)
}, { timestamps: true }); // updatedAt shows when relation was last recomputed

// Ensure no duplicate (productId + relatedProductId + relationType) combinations
productRelationSchema.index(
  { productId: 1, relatedProductId: 1, relationType: 1 },
  { unique: true }
);

module.exports = mongoose.model('ProductRelation', productRelationSchema);
