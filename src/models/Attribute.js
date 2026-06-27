/**
 * FILE: src/models/Attribute.js
 * ------------------------------
 * PURPOSE:
 *   Mongoose schema for the `attributes` collection.
 *   Attributes define the filterable/displayable properties that products can have,
 *   such as Color, Size, Material, Connectivity, etc.
 *
 * HOW ATTRIBUTES WORK:
 *   1. Admin creates an Attribute (e.g. { name: "Color", type: "STRING" }).
 *   2. Admin associates the attribute with a Category (stored in Category.attributes[]).
 *   3. When creating a product in that category, the admin sets values on the
 *      product's `attributes` Map (e.g. { "Color": "Blue", "Size": "L" }).
 *   4. The `isFilterable` flag controls whether this attribute appears in the
 *      storefront's filter sidebar.
 *   5. The `options` array provides pre-defined allowed values for STRING attributes.
 *
 * USED BY:
 *   - src/services/CatalogService.js (CRUD, product attribute value management)
 */

const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: {
    type:     String,
    required: true,
    unique:   true, // Attribute names must be globally unique (e.g. only one "Color")
  },
  slug: { type: String, unique: true }, // URL-safe version of name for filter query params

  type: {
    type:    String,
    default: 'STRING',
    // STRING: free text or from options list
    // NUMBER: numeric value (e.g. Weight: 2.5)
    // BOOLEAN: yes/no flag (e.g. Waterproof: true)
  },

  options: [String], // Pre-defined allowed values for STRING type (e.g. ["Red","Blue","Green"])

  isFilterable:        { type: Boolean, default: false }, // Show in storefront filter sidebar
  isVisibleOnProduct:  { type: Boolean, default: true },  // Show on product detail page
  sortOrder:           { type: Number, default: 0 },      // Display order in filter sidebar
}, { timestamps: true });

module.exports = mongoose.model('Attribute', attributeSchema);
