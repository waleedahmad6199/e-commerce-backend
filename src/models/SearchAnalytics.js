/**
 * FILE: src/models/SearchAnalytics.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `searchanalytics` collection.
 *   Records every individual search query for analytics reporting.
 *   High-write, append-only — one document per search action.
 *
 * DIFFERENCE FROM PopularSearch:
 *   - SearchAnalytics = raw event log (every single search, with userId if logged in)
 *   - PopularSearch   = aggregated counter (total search count per keyword)
 *
 * USED BY:
 *   - src/services/SearchService.js (recordSearch — called async after search results returned)
 */

const mongoose = require('mongoose');

const searchAnalyticsSchema = new mongoose.Schema({
  query:       { type: String, required: true }, // The search term entered by the user
  userId:      String,                           // ObjectId string if user was logged in (null for guests)
  resultCount: Number,                           // Number of results returned for this query
}, { timestamps: true }); // createdAt used for time-based analytics reports

module.exports = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
