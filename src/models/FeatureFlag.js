/**
 * FILE: src/models/FeatureFlag.js
 * ---------------------------------
 * PURPOSE:
 *   Mongoose schema for the `featureflags` collection.
 *   Feature flags are boolean toggles that enable or disable specific
 *   features at runtime without a code deploy (e.g. enable_reviews,
 *   enable_wishlist, enable_recommendations, maintenance_mode).
 *
 *   Admins toggle flags via the Settings panel: GET/PUT /api/settings/features.
 *
 * USED BY:
 *   - src/services/SettingsService.js (getFeatureFlags, updateFeatureFlag)
 *   - Frontend: reads flags to conditionally show/hide UI sections
 */
const mongoose = require("mongoose");

const featureFlagSchema = new mongoose.Schema(
  {
    flagKey: {
      type: String,
      required: true,
      unique: true,
    },
    flagName: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    description: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("FeatureFlag", featureFlagSchema);
