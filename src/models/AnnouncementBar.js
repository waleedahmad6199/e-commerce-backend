/**
 * FILE: src/models/AnnouncementBar.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `announcementbars` collection.
 *   Announcement bars are thin notice strips displayed at the very top of
 *   every page (e.g. "Free shipping on orders over $50!").
 *   Supports scheduling via startsAt/expiresAt and custom styling.
 *
 * USED BY:
 *   - src/services/CmsService.js (getActiveAnnouncements, createAnnouncement, etc.)
 */

const mongoose = require('mongoose');

const announcementBarSchema = new mongoose.Schema({
  text:            { type: String, required: true }, // The announcement message
  linkUrl:         String, // Optional URL if the announcement is clickable
  linkText:        String, // CTA text for the link (e.g. "Learn more")
  backgroundColor: String, // CSS colour for the bar background (e.g. '#1a1a2e')
  textColor:       String, // CSS colour for the text (e.g. '#ffffff')
  isActive:        { type: Boolean, default: true }, // Quick toggle
  startsAt:        Date, // Start date/time for scheduling
  expiresAt:       Date, // Expiry date/time
}, { timestamps: true });

module.exports = mongoose.model('AnnouncementBar', announcementBarSchema);
