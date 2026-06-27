/**
 * FILE: src/models/HomepageSection.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `homepagesections` collection.
 *   Homepage sections define the configurable blocks that appear on the storefront
 *   home page (e.g. Featured Products, Deals Banner, Category Showcase).
 *   Sections are sorted by sortOrder and only active sections are shown publicly.
 *
 * USED BY:
 *   - src/services/CmsService.js (getHomepageSections, createHomepageSection, etc.)
 */

const mongoose = require('mongoose');

const homepageSectionSchema = new mongoose.Schema({
  sectionKey: String, // Unique string key used by the frontend (e.g. 'featured-products')
  title:      String, // Section heading displayed to customers
  subtitle:   String, // Optional sub-heading
  type:       String, // Section type: 'products', 'banner', 'categories', 'html', etc.
  config:     mongoose.Schema.Types.Mixed, // Flexible config object (query params, HTML, etc.)
  sortOrder:  { type: Number, default: 0 },     // Lower number = displayed higher on page
  isActive:   { type: Boolean, default: true }, // Hidden sections don't appear on the homepage
}, { timestamps: true });

module.exports = mongoose.model('HomepageSection', homepageSectionSchema);
