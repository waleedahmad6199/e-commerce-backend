/**
 * FILE: src/services/RecommendationService.js
 * ---------------------------------------------
 * PURPOSE:
 *   Business logic for all product recommendation features:
 *   trending, similar, frequently-bought-together, personalised, and event tracking.
 *
 * RECOMMENDATION TYPES:
 *
 *   getTrending(limit):
 *     Reads pre-computed TrendingProduct scores, then hydrates with full Product data.
 *     Falls back gracefully if no trending data exists yet.
 *
 *   getSimilarProducts(productId, limit):
 *     Reads ProductRelation documents with type='SIMILAR'.
 *     Currently populated manually or by future admin tooling.
 *
 *   getFrequentlyTogether(productId, limit):
 *     Reads ProductRelation documents with type='FREQUENTLY_TOGETHER'.
 *     Computed by updateProductRelations() from order co-occurrence analysis.
 *
 *   getPersonalized(userId, limit):
 *     Reads the user's last 50 UserEvent documents, scores categories by
 *     event type weights, returns products from the top 3 categories.
 *     Falls back to trending if the user has no event history.
 *
 *   trackUserEvent(userId, productId, eventType):
 *     Creates or increments a UserEvent document (upsert by userId+productId+eventType).
 *     Called by POST /recommendations/events from the frontend on view, cart, purchase.
 *
 *   updateTrending():
 *     Aggregates UserEvent scores from the last 30 days, bulk-upserts TrendingProduct.
 *     Should be called periodically (daily cron job or admin trigger).
 *
 *   updateProductRelations():
 *     Analyses co-purchased products from delivered orders in the last 30 days.
 *     Bulk-upserts FREQUENTLY_TOGETHER ProductRelation documents.
 *
 * EVENT WEIGHTS:
 *   VIEW=1, ADD_TO_CART=3, ADD_TO_WISHLIST=4, PURCHASE=5
 *
 * DEPENDENCIES:
 *   - models/TrendingProduct.js
 *   - models/ProductRelation.js
 *   - models/Product.js
 *   - models/UserEvent.js
 *   - models/Order.js
 *
 * USED BY:
 *   - src/controllers/RecommendationController.js
 */
const TrendingProduct  = require('../models/TrendingProduct');  // Pre-computed trending scores
const ProductRelation  = require('../models/ProductRelation'); // Similar/frequently-together pairs
const Product          = require('../models/Product');          // Product data for hydration
const UserEvent        = require('../models/UserEvent');        // User behaviour events
const Order            = require('../models/Order');            // Orders for co-purchase analysis

// Weights determine how strongly each event type influences recommendations
const EVENT_WEIGHTS = {
  VIEW:             1, // Weakest signal — user may have just browsed
  ADD_TO_CART:      3, // Medium signal — strong purchase intent
  PURCHASE:         5, // Strongest signal — confirmed interest
  ADD_TO_WISHLIST:  4, // Strong signal — desire without immediate purchase
};

class RecommendationService {
  async getTrending(limit = 10) {
    const trendingItems = await TrendingProduct.find()
      .sort({ score: -1 })
      .limit(limit)
      .lean();

    const productIds = trendingItems.map(t => t.productId);
    const products = await Product.find({ _id: { $in: productIds }, status: 'ACTIVE' })
      .lean();

    const productMap = {};
    for (const p of products) {
      productMap[p._id.toString()] = p;
    }

    return trendingItems
      .filter(t => productMap[t.productId])
      .map(t => ({
        ...productMap[t.productId],
        trendingScore: t.score,
      }));
  }

  async getSimilarProducts(productId, limit = 6) {
    const relations = await ProductRelation.find({
      productId,
      relationType: 'SIMILAR',
    })
      .sort({ score: -1 })
      .limit(limit)
      .lean();

    const relatedIds = relations.map(r => r.relatedProductId);
    const products = await Product.find({ _id: { $in: relatedIds }, status: 'ACTIVE' })
      .lean();

    const productMap = {};
    for (const p of products) {
      productMap[p._id.toString()] = p;
    }

    return relations
      .filter(r => productMap[r.relatedProductId])
      .map(r => productMap[r.relatedProductId]);
  }

  async getFrequentlyTogether(productId, limit = 6) {
    const relations = await ProductRelation.find({
      productId,
      relationType: 'FREQUENTLY_TOGETHER',
    })
      .sort({ score: -1 })
      .limit(limit)
      .lean();

    const relatedIds = relations.map(r => r.relatedProductId);
    const products = await Product.find({ _id: { $in: relatedIds }, status: 'ACTIVE' })
      .lean();

    const productMap = {};
    for (const p of products) {
      productMap[p._id.toString()] = p;
    }

    return relations
      .filter(r => productMap[r.relatedProductId])
      .map(r => productMap[r.relatedProductId]);
  }

  async getPersonalized(userId, limit = 10) {
    const userEvents = await UserEvent.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (!userEvents.length) {
      return this.getTrending(limit);
    }

    const scoredCategories = {};
    const productIds = [...new Set(userEvents.map(e => e.productId))];

    const products = await Product.find({ _id: { $in: productIds } })
      .select('categoryId categoryName')
      .lean();

    for (const p of products) {
      if (!p.categoryId) continue;
      if (!scoredCategories[p.categoryId]) {
        scoredCategories[p.categoryId] = { categoryId: p.categoryId, categoryName: p.categoryName, score: 0 };
      }
    }

    for (const event of userEvents) {
      const p = products.find(pr => pr._id.toString() === event.productId);
      if (p && p.categoryId && scoredCategories[p.categoryId]) {
        scoredCategories[p.categoryId].score += (EVENT_WEIGHTS[event.eventType] || 1);
      }
    }

    const topCategories = Object.values(scoredCategories)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(c => c.categoryId);

    const recommended = await Product.find({
      categoryId: { $in: topCategories },
      status: 'ACTIVE',
      _id: { $nin: productIds },
    })
      .sort({ soldCount: -1 })
      .limit(limit)
      .lean();

    if (recommended.length < limit) {
      const existingIds = [...new Set([...productIds, ...recommended.map(r => r._id.toString())])];
      const fillers = await Product.find({
        status: 'ACTIVE',
        _id: { $nin: existingIds },
      })
        .sort({ soldCount: -1 })
        .limit(limit - recommended.length)
        .lean();
      return [...recommended, ...fillers];
    }

    return recommended;
  }

  async trackUserEvent(userId, productId, eventType) {
    const weight = EVENT_WEIGHTS[eventType] || 1;

    const existing = await UserEvent.findOne({ userId, productId, eventType });
    if (existing) {
      existing.score += weight;
      await existing.save();
      return existing;
    }

    return UserEvent.create({ userId, productId, eventType, score: weight });
  }

  async updateTrending() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const aggregated = await UserEvent.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$productId',
          totalScore: { $sum: '$score' },
          eventCount: { $sum: 1 },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 100 },
    ]);

    const productIds = aggregated.map(a => a._id);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('categoryId')
      .lean();
    const categoryMap = {};
    for (const p of products) {
      categoryMap[p._id.toString()] = p.categoryId;
    }

    const bulkOps = aggregated.map(item => ({
      updateOne: {
        filter: { productId: item._id },
        update: {
          $set: {
            productId: item._id,
            score: item.totalScore,
            categoryId: categoryMap[item._id] || null,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await TrendingProduct.bulkWrite(bulkOps);
    }
  }

  async updateProductRelations() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await Order.find({
      status: 'DELIVERED',
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select('items')
      .lean();

    const pairCounts = {};

    for (const order of orders) {
      const productIds = [...new Set(order.items.map(i => i.productId))];
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const key = [productIds[i], productIds[j]].sort().join('::');
          if (!pairCounts[key]) {
            pairCounts[key] = { productId: productIds[i], relatedProductId: productIds[j], count: 0 };
          }
          pairCounts[key].count++;
        }
      }
    }

    const bulkOps = Object.values(pairCounts)
      .filter(p => p.count > 1)
      .map(p => ({
        updateOne: {
          filter: {
            productId: p.productId,
            relatedProductId: p.relatedProductId,
            relationType: 'FREQUENTLY_TOGETHER',
          },
          update: {
            $set: {
              productId: p.productId,
              relatedProductId: p.relatedProductId,
              relationType: 'FREQUENTLY_TOGETHER',
              score: p.count,
            },
          },
          upsert: true,
        },
      }));

    if (bulkOps.length > 0) {
      await ProductRelation.bulkWrite(bulkOps);
    }
  }
}

module.exports = new RecommendationService();
