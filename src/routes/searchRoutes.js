/**
 * FILE: src/routes/searchRoutes.js
 * ----------------------------------
 * PURPOSE:
 *   Defines HTTP routes for product search, autocomplete suggestions,
 *   and popular search terms. Mounted at /search in app.js.
 *
 * ALL ROUTES ARE PUBLIC (no auth required).
 *
 * ANALYTICS SIDE-EFFECT:
 *   GET /search/products also calls searchService.recordSearch() asynchronously
 *   after returning results. This updates the SearchAnalytics and PopularSearch
 *   collections without blocking the search response.
 *
 * DEPENDENCIES:
 *   - services/SearchService.js
 *   - utils/ApiResponse.js
 */

const express       = require('express');
const router        = express.Router();
const searchService = require('../services/SearchService'); // Search business logic
const ApiResponse   = require('../utils/ApiResponse');      // Response envelope

// ── Product Search ──────────────────────────────────────────────────────────

/**
 * GET /search/products
 * Full-text product search with optional filters.
 * Query parameters:
 *   q          : search query string (regex on title + description)
 *   categoryId : filter by category MongoDB ID
 *   minPrice   : minimum basePrice filter
 *   maxPrice   : maximum basePrice filter
 *   sort       : 'price_asc' | 'price_desc' | 'popularity' | default (newest)
 *   page       : zero-based page number (default 0)
 *   size       : items per page (default 20, max 100)
 */
router.get('/products', async (req, res, next) => {
  try {
    const { q, categoryId, minPrice, maxPrice, sort } = req.query;
    const page = parseInt(req.query.page) || 0;               // Zero-based page index
    const size = Math.min(parseInt(req.query.size) || 20, 100); // Cap at 100 items per page

    // Execute the search and get paginated results
    const result = await searchService.search({ q, categoryId, minPrice, maxPrice, sort, page, size });

    // Record search analytics asynchronously — NEVER fail the search request because of this
    // The catch ensures analytics errors are swallowed silently
    if (q) {
      const userId = req.user ? req.user.id : null; // Log userId if authenticated
      searchService.recordSearch(q, userId, result.totalElements).catch(() => {});
    }

    res.status(200).json(ApiResponse.success(result, 'Search completed'));
  } catch (error) {
    next(error); // Pass to global error handler
  }
});

// ── Autocomplete Suggestions ────────────────────────────────────────────────

/**
 * GET /search/suggestions?q=<query>&limit=<n>
 * Returns product title strings matching the query for autocomplete dropdowns.
 * Query parameters:
 *   q     : the partial search term (minimum 2 characters)
 *   limit : max suggestions to return (default 10, max 20)
 */
router.get('/suggestions', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20); // Cap at 20 suggestions
    const suggestions = await searchService.getSuggestions(req.query.q, limit);
    res.status(200).json(ApiResponse.success(suggestions, 'Suggestions retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

// ── Popular Searches ────────────────────────────────────────────────────────

/**
 * GET /search/popular?limit=<n>
 * Returns the top N most-searched terms from the PopularSearch collection.
 * Used in the search bar's "Popular Searches" section.
 * Query parameters:
 *   limit : max terms to return (default 10, max 20)
 */
router.get('/popular', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const popular = await searchService.getPopularSearches(limit);
    res.status(200).json(ApiResponse.success(popular, 'Popular searches retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
