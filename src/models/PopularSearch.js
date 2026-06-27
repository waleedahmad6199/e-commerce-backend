/**
 * FILE: src/models/PopularSearch.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `popularsearches` collection.
 *   Aggregated counter of how many times each keyword has been searched.
 *   Used to power the GET /search/popular endpoint which returns the top N
 *   trending search terms for the autocomplete dropdown and "Popular Searches" UI.
 *
 * HOW IT STAYS CURRENT:
 *   SearchService.recordSearch() calls findOneAndUpdate with:
 *     { $inc: { searchCount: 1 }, $set: { lastSearchedAt: now } }
 *   on the document with the matching keyword. upsert:true creates it if new.
 *   This is an O(1) update per search — no expensive aggregation at read time.
 *
 * USED BY:
 *   - src/services/SearchService.js (recordSearch, getPopularSearches)
 */

const mongoose = require('mongoose');

const popularSearchSchema = new mongoose.Schema({
  keyword:        { type: String, required: true, unique: true }, // Lowercase trimmed search term
  searchCount:    { type: Number, default: 1 },  // Total number of times this term was searched
  lastSearchedAt: { type: Date,   default: Date.now }, // Timestamp of most recent search
}, { timestamps: true });

module.exports = mongoose.model('PopularSearch', popularSearchSchema);
