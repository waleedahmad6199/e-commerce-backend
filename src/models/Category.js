/**
 * FILE: src/models/Category.js
 * -----------------------------
 * PURPOSE:
 *   Mongoose schema for the `categories` collection.
 *   Categories form a tree structure using a self-referencing parentId field.
 *   Root categories have parentId = null. Sub-categories store their parent's
 *   ObjectId string. The tree can be arbitrarily deep.
 *
 * TREE STRUCTURE EXAMPLE:
 *   Electronics (parentId: null)
 *     └── Smartphones (parentId: "electronics_id")
 *     └── Laptops     (parentId: "electronics_id")
 *
 * DESIGN DECISIONS:
 *   - parentId is a String (not ObjectId ref) to allow CatalogService to build
 *     the tree without Mongoose population (.populate()), reducing query count.
 *   - parentName is denormalised so category breadcrumbs render without a
 *     second query to find the parent.
 *   - attributes array defines which product attributes are relevant for this
 *     category (e.g. "Shoes" → ["Size", "Color"]). Used by admin attribute UI.
 *   - sortOrder controls display order within a parent level.
 *
 * USED BY:
 *   - src/services/CatalogService.js  (CRUD, tree building, attribute management)
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type:     String,
    required: true, // Display name (e.g. "Smartphones")
  },
  slug: {
    type:      String,
    required:  true,
    unique:    true,  // URL-safe slug must be unique across all categories
    lowercase: true,  // Always stored lowercase for consistent URL matching
  },
  description: String, // Optional category description for SEO / display

  parentId:   { type: String, default: null }, // ObjectId string of parent category, null = root
  parentName: String,                          // Denormalised parent name for breadcrumb display

  // Array of attribute definitions associated with this category.
  // Used by the admin UI to suggest relevant attributes when creating products.
  attributes: [{
    attributeId: String, // MongoDB ObjectId string of the Attribute document
    name:        String, // Denormalised attribute name (e.g. "Color")
    type:        String, // Attribute data type (e.g. "STRING", "NUMBER")
  }],

  imageUrl:  String,                            // Category header/thumbnail image URL
  sortOrder: { type: Number, default: 0 },      // Display order (lower = shown first)
  isActive:  { type: Boolean, default: true },  // Hidden categories don't appear in navigation
}, { timestamps: true });

// ── Indexes ────────────────────────────────────────────────────────────────
categorySchema.index({ slug: 1 }, { unique: true }); // Unique slug for URL lookup
categorySchema.index({ parentId: 1 });               // Fast sub-category lookup by parent

module.exports = mongoose.model('Category', categorySchema);
