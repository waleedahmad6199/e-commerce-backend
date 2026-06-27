/**
 * FILE: src/models/Popup.js
 * --------------------------
 * PURPOSE:
 *   Mongoose schema for the `popups` collection.
 *   Popups are overlay modals triggered by visitor behaviour
 *   (page load, scroll depth, exit intent, or a time delay).
 *   Used for newsletter signups, promotions, or announcements.
 *
 * TRIGGER TYPES:
 *   - 'immediate'   : Shows as soon as the page loads
 *   - 'delay'       : Shows after delaySeconds seconds
 *   - 'scroll'      : Shows when user scrolls a certain percentage
 *   - 'exit-intent' : Shows when user moves cursor toward browser chrome
 *
 * FREQUENCY:
 *   - 'once'        : Show only once per browser session (localStorage flag)
 *   - 'daily'       : Show once per day
 *   - 'always'      : Show every page view
 *
 * USED BY:
 *   - src/services/CmsService.js (getActivePopups, createPopup, etc.)
 */

const mongoose = require('mongoose');

const popupSchema = new mongoose.Schema({
  title:        String, // Internal admin label and optional displayed heading
  content:      String, // HTML or text content of the popup body
  imageUrl:     String, // Optional image displayed in the popup
  buttonText:   String, // CTA button label (e.g. "Subscribe")
  buttonUrl:    String, // URL the CTA button links to
  triggerType:  String, // 'immediate', 'delay', 'scroll', 'exit-intent'
  delaySeconds: Number, // Seconds to wait before showing (for 'delay' type)
  frequency:    String, // 'once', 'daily', 'always'
  isActive:     { type: Boolean, default: true }, // Quick toggle
  startsAt:     Date, // Scheduling start
  expiresAt:    Date, // Scheduling end
}, { timestamps: true });

module.exports = mongoose.model('Popup', popupSchema);
