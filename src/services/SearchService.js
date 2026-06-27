/**
 * FILE: src/services/SearchService.js
 * --------------------------------------
 * PURPOSE:
 *   Handles product search with filters, autocomplete suggestions, and
 *   search analytics recording (popular searches + per-query tracking).
 *
 * SEARCH IMPLEMENTATION:
 *   - Uses MongoDB regex queries on title, description, and categoryName fields.
 *   - Supports filter by categoryId, minPrice, maxPrice.
 *   - Supports sort by price_asc, price_desc, popularity (soldCount), or newest.
 *   - For production at scale, replace with MongoDB Atlas Search or Elasticsearch.
 *
 * ANALYTICS SIDE-EFFECT:
 *   recordSearch() is called asynchronously (fire-and-forget) after returning
 *   results so it never blocks or fails the search response.
 *   It updates two collections:
 *     - PopularSearch  : upserted counter per keyword
 *     - SearchAnalytics: individual log entry per search
 *
 * DEPENDENCIES:
 *   - models/Product.js
 *   - models/PopularSearch.js
 *   - models/SearchAnalytics.js
 *   - utils/PagedResponse.js
 *
 * USED BY:
 *   - src/routes/searchRoutes.js (inline route handlers)
 *   - src/controllers/CatalogController.js (searchWithFilters)
 */
const Product         = require('../models/Product');          // Products collection
const PopularSearch   = require('../models/PopularSearch');    // Aggregated search counter
const SearchAnalytics = require('../models/SearchAnalytics'); // Per-query log
const PagedResponse   = require('../utils/PagedResponse');    // Pagination wrapper

class SearchService {
  async search(params) {
    const { q, categoryId, minPrice, maxPrice, sort = 'relevance', page = 0, size = 20 } = params;
    const query = { status: 'ACTIVE' };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { categoryName: { $regex: q, $options: 'i' } },
      ];
    }

    if (categoryId) {
      const Category = require('../models/Category');
      const allCategories = await Category.find({}, '_id parentId');
      
      const getDescendants = (parentId) => {
        const children = allCategories.filter(c => c.parentId === parentId);
        return children.reduce((acc, child) => {
          const childId = child._id.toString();
          return [...acc, childId, ...getDescendants(childId)];
        }, []);
      };

      const descendantIds = getDescendants(categoryId);
      query.categoryId = { $in: [categoryId, ...descendantIds] };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.basePrice = {};
      if (minPrice !== undefined) query.basePrice.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.basePrice.$lte = Number(maxPrice);
    }

    let sortOption;
    switch (sort) {
      case 'price_asc':
        sortOption = { basePrice: 1 };
        break;
      case 'price_desc':
        sortOption = { basePrice: -1 };
        break;
      case 'popularity':
        sortOption = { soldCount: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = page * size;
    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(size).lean(),
      Product.countDocuments(query),
    ]);

    const content = products.map(p => ({
      productId: p._id,
      title: p.title,
      description: p.description,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      thumbnailUrl: p.media && p.media.length > 0 ? (p.media[0].thumbnailUrl || p.media[0].url) : null,
      popularityScore: p.soldCount || 0,
    }));

    return PagedResponse.from(content, total, page, size);
  }

  async getSuggestions(query, limit = 10) {
    if (!query || query.length < 2) return [];
    const products = await Product.find({
      status: 'ACTIVE',
      title: { $regex: query, $options: 'i' },
    })
      .select('title')
      .limit(limit)
      .lean();

    return products.map(p => p.title);
  }

  async recordSearch(query, userId, resultCount) {
    if (!query) return;

    await PopularSearch.findOneAndUpdate(
      { keyword: query.toLowerCase().trim() },
      {
        $inc: { searchCount: 1 },
        $set: { lastSearchedAt: new Date() },
      },
      { upsert: true }
    );

    await SearchAnalytics.create({
      query: query.toLowerCase().trim(),
      userId,
      resultCount,
    });
  }

  async getPopularSearches(limit = 10) {
    return PopularSearch.find()
      .sort({ searchCount: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new SearchService();
