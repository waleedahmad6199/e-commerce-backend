/**
 * FILE: src/models/Banner.js
 * ---------------------------
 * PURPOSE:
 *   Mongoose schema for the `banners` collection.
 *   Banners are promotional images displayed in specific positions on the
 *   storefront (hero, sidebar, promotional bar, etc.).
 *   Supports date-range scheduling via startsAt and expiresAt.
 *
 *   CmsService.getActiveBanners() filters banners where:
 *     isActive=true AND (startsAt <= now OR no startsAt) AND (expiresAt >= now OR no expiresAt)
 *
 * USED BY:
 *   - src/services/CmsService.js
 */

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title:          String, // Internal admin label
  subtitle:       String, // Optional sub-heading displayed on the banner
  imageUrl:       String, // Desktop banner image URL
  mobileImageUrl: String, // Separate mobile-optimised image URL (optional)
  linkUrl:        String, // URL to navigate to when banner is clicked
  linkText:       String, // CTA button text (e.g. "Shop Now")
  position:       String, // Display location: 'hero', 'sidebar', 'promo-bar', etc.
  sortOrder:      { type: Number, default: 0 },     // Lower number = displayed first
  isActive:       { type: Boolean, default: true }, // Quick enable/disable
  startsAt:       Date, // Banner becomes visible from this datetime
  expiresAt:      Date, // Banner stops being visible at this datetime
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
