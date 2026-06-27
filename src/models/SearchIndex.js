/**
 * FILE: src/models/SearchIndex.js
 * ---------------------------------
 * PURPOSE:
 *   Mongoose schema for the `searchindexes` collection.
 *   A denormalised, searchable snapshot of product data used as an alternative
 *   search index. Currently the primary search is performed directly on the
 *   Product collection by SearchService. This collection exists as a future
 *   optimisation point — it can be populated by a product-events consumer and
 *   queried instead of the main Product collection to isolate search load.
 *
 * NOTE:
 *   Not actively used by SearchService in the current implementation.
 *   SearchService queries the Product collection directly using regex filters.
 *   This model is reserved for a future dedicated search indexing pipeline.
 *
 * USED BY:
 *   - Reserved for future use / search pipeline migration
 */
const mongoose = require('mongoose');

const searchIndexSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
  },
  title: String,
  description: String,
  categoryId: String,
  categoryName: String,
  basePrice: Number,
  salePrice: Number,
  thumbnailUrl: String,
  tags: [String],
  isActive: Boolean,
  createdAt: Date,
}, { timestamps: true });

searchIndexSchema.index({ title: 'text', description: 'text' });
searchIndexSchema.index({ categoryId: 1 });

module.exports = mongoose.model('SearchIndex', searchIndexSchema);
