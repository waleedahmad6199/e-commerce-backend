/**
 * FILE: src/models/CmsPage.js
 * ----------------------------
 * PURPOSE:
 *   Mongoose schema for the `cmspages` collection.
 *   CMS pages are editable content pages managed from the admin panel.
 *   Examples: About Us, Contact, FAQ, Privacy Policy, Terms of Service.
 *
 *   Public pages are accessible via GET /api/cms/pages/public/:slug.
 *   System pages (isSystem=true) cannot be deleted from the admin UI.
 *
 * USED BY:
 *   - src/services/CmsService.js (getPageBySlug, getAllPages, createPage, etc.)
 */

const mongoose = require('mongoose');

const cmsPageSchema = new mongoose.Schema({
  title:           { type: String, required: true }, // Page heading (e.g. "About Us")
  slug:            { type: String, required: true, unique: true }, // URL path (e.g. "about-us")
  content:         String, // Full HTML/Markdown content of the page
  metaTitle:       String, // SEO <title> override
  metaDescription: String, // SEO meta description
  layout:          String, // Optional layout template identifier
  isSystem:        { type: Boolean, default: false }, // true = protected from deletion
  status:          { type: String, default: 'published' }, // 'published' or 'draft'
}, { timestamps: true });

module.exports = mongoose.model('CmsPage', cmsPageSchema);
