/**
 * FILE: src/controllers/RecommendationController.js
 * ---------------------------------------------------
 * PURPOSE:
 *   HTTP handlers for the product recommendation engine endpoints.
 *   Includes trending products, similar products, frequently-bought-together,
 *   personalised recommendations, and user behaviour event tracking.
 *
 * PERSONALISATION:
 *   getPersonalized() uses req.user.id (from optional auth) if available,
 *   otherwise falls back to trending products for anonymous visitors.
 *
 * ROUTE FILE: src/routes/recommendationRoutes.js (mounted at /recommendations)
 *
 * USED BY:
 *   - src/routes/recommendationRoutes.js
 */
const recommendationService = require('../services/RecommendationService'); // Recommendation logic
const ApiResponse           = require('../utils/ApiResponse');               // Response envelope

const getTrending = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await recommendationService.getTrending(limit);
    res.status(200).json(ApiResponse.success(products, 'Trending products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getSimilarProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const products = await recommendationService.getSimilarProducts(req.params.productId, limit);
    res.status(200).json(ApiResponse.success(products, 'Similar products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getFrequentlyTogether = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const products = await recommendationService.getFrequentlyTogether(req.params.productId, limit);
    res.status(200).json(ApiResponse.success(products, 'Frequently bought together products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getPersonalized = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    // Use authenticated user ID if available, otherwise fall back to query param
    const userId = (req.user && req.user.id) || req.query.userId;
    const products = await recommendationService.getPersonalized(userId, limit);
    res.status(200).json(ApiResponse.success(products, 'Personalized recommendations retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const trackEvent = async (req, res, next) => {
  try {
    const { productId, eventType } = req.body;
    if (!productId || !eventType) {
      return res.status(400).json(ApiResponse.error('productId and eventType are required', 'VALIDATION_ERROR'));
    }

    const validEvents = ['VIEW', 'ADD_TO_CART', 'PURCHASE', 'ADD_TO_WISHLIST'];
    if (!validEvents.includes(eventType)) {
      return res.status(400).json(ApiResponse.error(`eventType must be one of: ${validEvents.join(', ')}`, 'VALIDATION_ERROR'));
    }

    // Use authenticated user ID if available
    const userId = (req.user && req.user.id) || req.body.userId;
    if (!userId) {
      // Skip tracking anonymous events silently
      return res.status(200).json(ApiResponse.success(null, 'Event acknowledged'));
    }

    await recommendationService.trackUserEvent(userId, productId, eventType);
    res.status(200).json(ApiResponse.success(null, 'Event tracked successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrending,
  getSimilarProducts,
  getFrequentlyTogether,
  getPersonalized,
  trackEvent,
};
