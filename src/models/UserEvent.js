/**
 * FILE: src/models/UserEvent.js
 * ------------------------------
 * PURPOSE:
 *   Mongoose schema for the `userevents` collection.
 *   Tracks user behaviour events for the recommendation engine.
 *   Each document records one type of interaction a user had with a product.
 *
 * EVENT TYPES AND WEIGHTS:
 *   VIEW            → weight 1  (low signal — could be accidental)
 *   ADD_TO_CART     → weight 3  (medium signal — strong purchase intent)
 *   PURCHASE        → weight 5  (highest signal — confirmed interest)
 *   ADD_TO_WISHLIST → weight 4  (high signal — desire without immediate purchase)
 *
 * HOW IT FEEDS RECOMMENDATIONS:
 *   1. POST /recommendations/events creates a UserEvent document.
 *   2. RecommendationService.updateTrending() aggregates events from the last 30 days
 *      to build the TrendingProduct scores.
 *   3. RecommendationService.getPersonalized() reads the user's recent events to
 *      determine their preferred categories, then returns products from those categories.
 *
 * USED BY:
 *   - src/services/RecommendationService.js (trackUserEvent, getPersonalized, updateTrending)
 */

const mongoose = require('mongoose');

const userEventSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true }, // ObjectId string of the user
  productId: { type: String, required: true, index: true }, // ObjectId string of the product

  eventType: {
    type:     String,
    required: true,
    enum:     ['VIEW', 'ADD_TO_CART', 'PURCHASE', 'ADD_TO_WISHLIST'],
  },

  score: { type: Number, default: 1 }, // Accumulated weight for this user+product+type combination
}, { timestamps: true }); // createdAt used by the 30-day rolling window in updateTrending()

module.exports = mongoose.model('UserEvent', userEventSchema);
