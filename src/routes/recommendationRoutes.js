/**
 * FILE: src/routes/recommendationRoutes.js
 * ------------------------------------------
 * PURPOSE:
 *   Defines HTTP routes for the product recommendation engine.
 *   Mounted at /recommendations in app.js.
 *
 * ROUTE SUMMARY:
 *   GET  /recommendations/trending                  — top trending products (public)
 *   GET  /recommendations/similar/:productId        — similar products (public)
 *   GET  /recommendations/frequently-together/:id   — co-purchased products (public)
 *   GET  /recommendations/personalized              — user-personalised list (optional auth)
 *   POST /recommendations/events                    — track a user behaviour event (optional auth)
 *
 * AUTH:
 *   - GET routes are public — recommendations work for guests (return trending/generic)
 *   - optionalAuth on /personalized: if authenticated, uses the user's event history;
 *     if anonymous, falls back to trending products.
 *   - optionalAuth on /events: anonymous events are silently ignored in the controller.
 *
 * DEPENDENCIES:
 *   - controllers/RecommendationController.js
 *   - middleware/auth.js (optionalAuth)
 */

const express = require('express');
const router  = express.Router();

const recommendationController = require('../controllers/RecommendationController');
const { optionalAuth }         = require('../middleware/auth');

// GET /recommendations/trending        — products with highest trend scores
router.get('/trending', recommendationController.getTrending);

// GET /recommendations/similar/:productId — products related to the given product
router.get('/similar/:productId', recommendationController.getSimilarProducts);

// GET /recommendations/frequently-together/:productId — products bought with the given product
router.get('/frequently-together/:productId', recommendationController.getFrequentlyTogether);

// GET /recommendations/personalized    — personalised for logged-in user, or trending for guest
router.get('/personalized', optionalAuth, recommendationController.getPersonalized);

// POST /recommendations/events         — record a user behaviour event (VIEW, ADD_TO_CART, etc.)
router.post('/events', optionalAuth, recommendationController.trackEvent);

module.exports = router;
