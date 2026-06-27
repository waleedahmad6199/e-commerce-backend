/**
 * FILE: src/models/WebsiteSetting.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `websitesettings` collection.
 *   A flexible key-value store for site-wide configuration that admins
 *   can change at runtime without a code deploy (e.g. site name, contact email,
 *   default currency, maintenance mode toggle).
 *
 * HOW SETTINGS ARE STRUCTURED:
 *   Each document = one setting. Fields:
 *     settingKey   : unique string identifier (e.g. "site.name")
 *     settingValue : the value (any type stored as Mixed)
 *     group        : grouping label for admin UI tabs (e.g. "general", "seo")
 *
 *   SettingsService.getAllSettings() returns a flat { key: value } map.
 *   SettingsService.updateSetting() uses findOneAndUpdate with upsert=true
 *   so settings can be created or updated via the same call.
 *
 * USED BY:
 *   - src/services/SettingsService.js
 */

const mongoose = require('mongoose');

const websiteSettingSchema = new mongoose.Schema({
  settingKey:   { type: String, required: true, unique: true }, // Unique dot-notation key
  settingValue: mongoose.Schema.Types.Mixed, // String, Number, Boolean, Array, or Object
  group:        String, // Admin UI grouping: 'general', 'seo', 'shipping', 'appearance'
  label:        String, // Human-readable label for admin display
  type:         String, // Value type hint: 'text', 'number', 'boolean', 'color', 'json'
  description:  String, // Tooltip/help text shown in the admin settings form
  isPublic:     { type: Boolean, default: true }, // false = never exposed via GET /api/settings
}, { timestamps: true });

module.exports = mongoose.model('WebsiteSetting', websiteSettingSchema);
