/**
 * FILE: src/services/CatalogService.js
 * --------------------------------------
 * PURPOSE:
 *   The largest service in the backend. Handles all product catalog operations:
 *   products, categories, attributes, media, variants, and reviews.
 *
 * SECTION OVERVIEW:
 *   Product   : CRUD, featured/trending/slug/id/batch lookups, search with filters.
 *   Category  : CRUD, tree building, root/sub-category lists.
 *   Attribute : CRUD, product attribute value management, category-attribute linking.
 *   Media     : Add/remove product images/videos (embedded in Product document).
 *   Variant   : Add/update/remove product variants (embedded in Product document).
 *   Review    : CRUD, automatic rating recalculation after write.
 *
 * SLUG GENERATION:
 *   createProduct() auto-generates a slug from the title if none is supplied.
 *   If the slug already exists, Date.now() is appended to ensure uniqueness.
 *
 * RATING RECALCULATION:
 *   _updateProductRating() recalculates and updates Product.ratingSummary after
 *   every review create or delete. This keeps the cached averages accurate
 *   without requiring an aggregation query on every product read.
 *
 * SOFT-DELETE:
 *   deleteProduct() sets status='INACTIVE' rather than removing the document,
 *   preserving order history that references the product.
 *
 * DEPENDENCIES:
 *   - models/Product.js, Category.js, Attribute.js, Review.js
 *   - utils/ApiError.js, PagedResponse.js, helpers.js
 *
 * USED BY:
 *   - src/controllers/CatalogController.js
 */
const Product       = require('../models/Product');       // Product documents
const Category      = require('../models/Category');      // Category documents
const Attribute     = require('../models/Attribute');     // Attribute definitions
const Review        = require('../models/Review');        // Customer reviews
const ApiError      = require('../utils/ApiError');       // Custom error class
const PagedResponse = require('../utils/PagedResponse'); // Pagination wrapper
const { generateSlug } = require('../utils/helpers');    // URL slug generator
const crypto        = require('crypto');                  // Built-in crypto for randomUUID
const mongoose      = require('mongoose');                // MongoDB ODM

const _uuid = () => crypto.randomUUID(); // Shorthand for UUID generation

const mapToSummary = (p) => ({
  id: p._id.toString(),
  title: p.title,
  slug: p.slug,
  basePrice: p.basePrice,
  salePrice: p.salePrice,
  categoryId: p.categoryId,
  categoryName: p.categoryName,
  categorySlug: p.categorySlug,
  thumbnailUrl: p.media && p.media.length > 0 ? (p.media[0].thumbnailUrl || p.media[0].url) : null,
  media: p.media || [],
  variants: p.variants || [],
  isActive: p.status === 'ACTIVE',
  isFeatured: p.featured || false,
  soldCount: p.soldCount || 0,
  averageRating: p.ratingSummary ? p.ratingSummary.average : 0,
  reviewCount: p.ratingSummary ? p.ratingSummary.count : 0,
  createdAt: p.createdAt,
});

class CatalogService {

  // ─── Product ────────────────────────────────────────────────

  async getAllProducts(page, size, sortBy = 'createdAt', sortDir = 'desc') {
    // Allow sorting by 'title' or 'basePrice' as well as 'createdAt'
    const allowedSortFields = ['createdAt', 'title', 'basePrice', 'soldCount'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort = sortDir === 'desc' ? { [safeSortBy]: -1 } : { [safeSortBy]: 1 };
    const skip = page * size;
    const [products, total] = await Promise.all([
      // Include ALL status so admins can see inactive products too
      Product.find().sort(sort).skip(skip).limit(size),
      Product.countDocuments(),
    ]);
    // Map to a consistent summary shape (same as searchWithFilters)
    const content = products.map(p => mapToSummary(p));
    return PagedResponse.from(content, total, page, size);
  }

  async getFeaturedProducts(limit) {
    const products = await Product.find({ featured: true, status: 'ACTIVE' }).limit(limit);
    return products.map(p => mapToSummary(p));
  }

  async getTrendingProducts(limit) {
    const products = await Product.find({ status: 'ACTIVE' }).sort({ soldCount: -1 }).limit(limit);
    return products.map(p => mapToSummary(p));
  }

  async getProductById(id) {
    const product = await Product.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');
    product.viewCount += 1;
    await product.save();
    return product;
  }

  async getProductBySlug(slug) {
    const product = await Product.findOne({ slug });
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  }

  async getProductsByIds(ids) {
    const products = await Product.find({ _id: { $in: ids } });
    return products.map(p => mapToSummary(p));
  }

  async getProductsByCategory(categoryId, page, size) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    const skip = page * size;
    const [products, total] = await Promise.all([
      Product.find({ categoryId, status: 'ACTIVE' }).sort({ createdAt: -1 }).skip(skip).limit(size),
      Product.countDocuments({ categoryId, status: 'ACTIVE' }),
    ]);
    const content = products.map(p => mapToSummary(p));
    return PagedResponse.from(content, total, page, size);
  }

  async createProduct(data) {
    let slug = data.slug || generateSlug(data.title);

    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = slug + '-' + Date.now();
    }

    let category = null;
    if (data.categoryId) {
      category = await Category.findById(data.categoryId);
      if (!category) throw new ApiError(404, 'Category not found');
    }

    const product = await Product.create({
      title: data.title,
      slug,
      description: data.description,
      categoryId: category ? category._id.toString() : undefined,
      categoryName: category ? category.name : undefined,
      categorySlug: category ? category.slug : undefined,
      basePrice: data.basePrice,
      salePrice: data.salePrice,
      costPrice: data.costPrice,
      currency: data.currency || 'USD',
      status: data.isActive !== undefined ? (data.isActive ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE',
      featured: data.isFeatured || false,
      variants: data.variants || [],
      media: data.media || [],
      attributes: new Map(),
      seo: data.seo || {},
      ratingSummary: { average: 0, count: 0, distribution: {} },
      inventory: {
        totalStock: data.inventory?.totalStock || data.stock || 0,
        reserved: 0,
        available: data.inventory?.totalStock || data.stock || 0,
        lowStockThreshold: data.inventory?.lowStockThreshold || data.lowStockThreshold || 5,
      },
    });

    return product;
  }

  async updateProduct(id, data) {
    const product = await Product.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');

    if (data.title !== undefined) product.title = data.title;
    if (data.description !== undefined) product.description = data.description;
    if (data.basePrice !== undefined) product.basePrice = data.basePrice;
    if (data.salePrice !== undefined) product.salePrice = data.salePrice;
    if (data.costPrice !== undefined) product.costPrice = data.costPrice;
    if (data.currency !== undefined) product.currency = data.currency;

    if (data.isActive !== undefined) {
      product.status = data.isActive ? 'ACTIVE' : 'INACTIVE';
    }
    if (data.isFeatured !== undefined) {
      product.featured = data.isFeatured;
    }

    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const category = await Category.findById(data.categoryId);
        if (!category) throw new ApiError(404, 'Category not found');
        product.categoryId = category._id.toString();
        product.categoryName = category.name;
        product.categorySlug = category.slug;
      } else {
        product.categoryId = undefined;
        product.categoryName = undefined;
        product.categorySlug = undefined;
      }
    }

    if (data.seo !== undefined) {
      product.seo = { ...product.seo, ...data.seo };
    }

    if (data.media !== undefined) {
      product.media = data.media;
    }

    if (data.variants !== undefined) {
      product.variants = data.variants;
    }

    if (data.inventory !== undefined) {
      product.inventory = { ...product.inventory, ...data.inventory };
    }

    if (data.soldCount !== undefined) {
      product.soldCount = data.soldCount;
    }

    await product.save();
    return product;
  }

  async deleteProduct(id) {
    const product = await Product.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');
    await Product.deleteOne({ _id: id });
  }

  async searchWithFilters({ q, categoryId, minPrice, maxPrice, sort, page, size }) {
    const query = { status: 'ACTIVE' };

    if (q && q.trim()) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    if (categoryId && categoryId.trim()) {
      query.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.basePrice = {};
      if (minPrice !== undefined) query.basePrice.$gte = minPrice;
      if (maxPrice !== undefined) query.basePrice.$lte = maxPrice;
    }

    let sortObj;
    switch (sort) {
      case 'price_asc':
        sortObj = { basePrice: 1 };
        break;
      case 'price_desc':
        sortObj = { basePrice: -1 };
        break;
      case 'popularity':
        sortObj = { soldCount: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const skip = page * size;
    const [products, total] = await Promise.all([
      Product.find(query).sort(sortObj).skip(skip).limit(size),
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

  // ─── Category ───────────────────────────────────────────────

  async getRootCategories() {
    return Category.find({ parentId: null }).sort({ sortOrder: 1, name: 1 });
  }

  async getAllCategories() {
    return Category.find().sort({ sortOrder: 1, name: 1 });
  }

  async getCategoryById(id) {
    const category = await Category.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  }

  async getSubCategories(parentId) {
    return Category.find({ parentId }).sort({ sortOrder: 1, name: 1 });
  }

  async getCategoryTree() {
    const roots = await Category.find({ parentId: null }).sort({ sortOrder: 1, name: 1 });
    return this._buildTree(roots);
  }

  async _buildTree(categories) {
    const result = [];
    for (const cat of categories) {
      const children = await Category.find({ parentId: cat._id.toString() }).sort({ sortOrder: 1, name: 1 });
      const dto = {
        id: cat._id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        imageUrl: cat.imageUrl,
        sortOrder: cat.sortOrder,
      };
      if (children.length > 0) {
        dto.children = await this._buildTree(children);
      }
      result.push(dto);
    }
    return result;
  }

  async createCategory(data) {
    const existing = await Category.findOne({ slug: data.slug });
    if (existing) {
      throw new ApiError(400, 'Slug already exists: ' + data.slug);
    }

    let parentName = null;
    if (data.parentId) {
      const parent = await Category.findById(data.parentId);
      if (!parent) throw new ApiError(404, 'Parent category not found');
      parentName = parent.name;
    }

    const category = await Category.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      parentId: data.parentId || null,
      parentName,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return category;
  }

  async deleteCategory(id) {
    const category = await Category.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');
    await Category.deleteOne({ _id: id });
  }

  async updateCategory(id, data) {
    const category = await Category.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');

    // Check slug uniqueness if slug is changing
    if (data.slug && data.slug !== category.slug) {
      const existing = await Category.findOne({ slug: data.slug });
      if (existing) throw new ApiError(400, 'Slug already in use: ' + data.slug);
    }

    if (data.name !== undefined) category.name = data.name;
    if (data.slug !== undefined) category.slug = data.slug;

    if (data.parentId !== undefined) {
      if (data.parentId) {
        const parent = await Category.findById(data.parentId);
        if (!parent) throw new ApiError(404, 'Parent category not found');
        category.parentId = data.parentId;
        category.parentName = parent.name;
      } else {
        category.parentId = null;
        category.parentName = null;
      }
    }

    await category.save();
    return category;
  }

  // ─── Attribute ──────────────────────────────────────────────

  async getAllAttributes() {
    return Attribute.find().sort({ sortOrder: 1, name: 1 });
  }

  async getAttributeById(id) {
    const attr = await Attribute.findById(id);
    if (!attr) throw new ApiError(404, 'Attribute not found');
    return attr;
  }

  async createAttribute(data) {
    const existing = await Attribute.findOne({ name: data.name });
    if (existing) {
      throw new ApiError(400, 'Attribute already exists: ' + data.name);
    }

    const attr = await Attribute.create({
      name: data.name,
      slug: data.slug || generateSlug(data.name),
      type: data.type || 'STRING',
      options: data.options || [],
      isFilterable: data.isFilterable || false,
      isVisibleOnProduct: data.isVisibleOnProduct !== undefined ? data.isVisibleOnProduct : true,
      sortOrder: data.sortOrder || 0,
    });

    return attr;
  }

  async updateAttribute(id, data) {
    const attr = await Attribute.findById(id);
    if (!attr) throw new ApiError(404, 'Attribute not found');

    if (data.name !== undefined) attr.name = data.name;
    if (data.slug !== undefined) attr.slug = data.slug;
    if (data.type !== undefined) attr.type = data.type;
    if (data.options !== undefined) attr.options = data.options;
    if (data.isFilterable !== undefined) attr.isFilterable = data.isFilterable;
    if (data.isVisibleOnProduct !== undefined) attr.isVisibleOnProduct = data.isVisibleOnProduct;
    if (data.sortOrder !== undefined) attr.sortOrder = data.sortOrder;

    await attr.save();
    return attr;
  }

  async deleteAttribute(id) {
    const attr = await Attribute.findById(id);
    if (!attr) throw new ApiError(404, 'Attribute not found');
    await Attribute.deleteOne({ _id: id });
  }

  async getProductAttributeValues(productId) {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const values = [];
    if (product.attributes) {
      for (const [key, value] of product.attributes) {
        values.push({ attributeName: key, value });
      }
    }
    return values;
  }

  async setProductAttributeValue(productId, attributeId, value) {
    const attr = await Attribute.findById(attributeId);
    if (!attr) throw new ApiError(404, 'Attribute not found');

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    product.attributes.set(attr.name, value);
    await product.save();
  }

  async deleteProductAttributeValue(productId, attributeId) {
    const attr = await Attribute.findById(attributeId);
    if (!attr) throw new ApiError(404, 'Attribute not found');

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    product.attributes.delete(attr.name);
    await product.save();
  }

  async getCategoryAttributes(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    const attrIds = (category.attributes || []).map(a => a.attributeId);
    return Attribute.find({ _id: { $in: attrIds } });
  }

  async addAttributeToCategory(categoryId, attributeId) {
    const attr = await Attribute.findById(attributeId);
    if (!attr) throw new ApiError(404, 'Attribute not found');

    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    const alreadyExists = (category.attributes || []).some(a => a.attributeId === attributeId);
    if (!alreadyExists) {
      category.attributes.push({
        attributeId,
        name: attr.name,
        type: attr.type,
      });
      await category.save();
    }
  }

  async removeAttributeFromCategory(categoryId, attributeId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new ApiError(404, 'Category not found');

    category.attributes = (category.attributes || []).filter(a => a.attributeId !== attributeId);
    await category.save();
  }

  // ─── Media ──────────────────────────────────────────────────

  async getMediaByProductId(productId) {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');
    return (product.media || []).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async addMedia(productId, data) {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const mediaItem = {
      id: _uuid(),
      url: data.url,
      altText: data.altText || '',
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : (product.media || []).length,
      type: data.type || 'IMAGE',
    };

    product.media.push(mediaItem);
    await product.save();
    return mediaItem;
  }

  async deleteMedia(mediaId) {
    const product = await Product.findOne({ 'media.id': mediaId });
    if (!product) throw new ApiError(404, 'Media not found');

    const before = product.media.length;
    product.media = product.media.filter(m => m.id !== mediaId);
    if (product.media.length === before) {
      throw new ApiError(404, 'Media not found');
    }
    await product.save();
  }

  // ─── Variant ────────────────────────────────────────────────

  async getVariantsByProductId(productId) {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');
    return product.variants || [];
  }

  async addVariant(productId, data) {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const skuExists = (product.variants || []).some(v => v.sku === data.sku);
    if (skuExists) {
      throw new ApiError(400, 'SKU already exists: ' + data.sku);
    }

    const variant = {
      id: _uuid(),
      sku: data.sku,
      name: data.name,
      attributes: data.attributes || {},
      price: data.price,
      stock: data.stockQty !== undefined ? data.stockQty : 0,
      image: data.image || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    product.variants.push(variant);
    await product.save();
    return variant;
  }

  async updateVariant(variantId, data) {
    const product = await Product.findOne({ 'variants.id': variantId });
    if (!product) throw new ApiError(404, 'Variant not found');

    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) throw new ApiError(404, 'Variant not found');

    const skuExists = product.variants.some(v => v.id !== variantId && v.sku === data.sku);
    if (skuExists) {
      throw new ApiError(400, 'SKU already exists: ' + data.sku);
    }

    if (data.sku !== undefined) variant.sku = data.sku;
    if (data.name !== undefined) variant.name = data.name;
    if (data.price !== undefined) variant.price = data.price;
    if (data.stockQty !== undefined) variant.stock = data.stockQty;
    if (data.image !== undefined) variant.image = data.image;
    if (data.isActive !== undefined) variant.isActive = data.isActive;
    if (data.attributes !== undefined) {
      variant.attributes = typeof data.attributes === 'string'
        ? this._parseAttributesString(data.attributes)
        : data.attributes;
    }

    await product.save();
    return variant;
  }

  async deleteVariant(variantId) {
    const product = await Product.findOne({ 'variants.id': variantId });
    if (!product) throw new ApiError(404, 'Variant not found');

    const before = product.variants.length;
    product.variants = product.variants.filter(v => v.id !== variantId);
    if (product.variants.length === before) {
      throw new ApiError(404, 'Variant not found');
    }
    await product.save();
  }

  _parseAttributesString(attrsStr) {
    if (!attrsStr || !attrsStr.trim()) return {};
    try {
      if (attrsStr.startsWith('{')) {
        return JSON.parse(attrsStr);
      }
    } catch (e) { }

    const result = {};
    const pairs = attrsStr.split(';');
    for (const pair of pairs) {
      const kv = pair.split(':');
      if (kv.length === 2) {
        result[kv[0].trim()] = kv[1].trim();
      }
    }
    return result;
  }

  // ─── Review ─────────────────────────────────────────────────

  async getReviewsByProductId(productId, page, size, sortStr = '-createdAt') {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const skip = page * size;
    let sortObj = { createdAt: -1 };
    if (sortStr) {
      if (sortStr.startsWith('-')) sortObj = { [sortStr.substring(1)]: -1 };
      else sortObj = { [sortStr]: 1 };
    }
    const [reviews, total] = await Promise.all([
      Review.find({ productId }).sort(sortObj).skip(skip).limit(size),
      Review.countDocuments({ productId }),
    ]);
    return PagedResponse.from(reviews, total, page, size);
  }

  async getAllReviews(page, size, sortStr = '-createdAt') {
    const skip = page * size;
    let sortObj = { createdAt: -1 };
    if (sortStr) {
      if (sortStr.startsWith('-')) sortObj = { [sortStr.substring(1)]: -1 };
      else sortObj = { [sortStr]: 1 };
    }
    const [reviews, total] = await Promise.all([
      Review.find().sort(sortObj).skip(skip).limit(size),
      Review.countDocuments(),
    ]);
    return PagedResponse.from(reviews, total, page, size);
  }

  async createReview(productId, data) {
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const existing = await Review.findOne({ productId, userId: data.userId });
    if (existing) {
      throw new ApiError(400, 'User has already reviewed this product');
    }

    const review = await Review.create({
      productId,
      userId: data.userId,
      userName: data.userName,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      verified: data.verified || false,
      status: data.status || 'PUBLISHED',
    });

    await this._updateProductRating(productId);
    return review;
  }

  async deleteReview(id) {
    const review = await Review.findById(id);
    if (!review) throw new ApiError(404, 'Review not found');

    const productId = review.productId;
    await Review.deleteOne({ _id: id });
    await this._updateProductRating(productId);
  }

  async updateUserReview(id, userId, data) {
    const review = await Review.findById(id);
    if (!review) throw new ApiError(404, 'Review not found');
    if (review.userId !== userId) throw new ApiError(403, 'Unauthorized to edit this review');

    if (data.rating !== undefined) review.rating = data.rating;
    if (data.comment !== undefined) review.comment = data.comment;
    if (data.title !== undefined) review.title = data.title;
    
    await review.save();
    await this._updateProductRating(review.productId);
    return review;
  }

  async deleteUserReview(id, userId) {
    const review = await Review.findById(id);
    if (!review) throw new ApiError(404, 'Review not found');
    if (review.userId !== userId) throw new ApiError(403, 'Unauthorized to delete this review');

    const productId = review.productId;
    await Review.deleteOne({ _id: id });
    await this._updateProductRating(productId);
  }

  async _updateProductRating(productId) {
    const reviews = await Review.find({ productId, status: 'PUBLISHED' });

    if (reviews.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        'ratingSummary.average': 0,
        'ratingSummary.count': 0,
        'ratingSummary.distribution': {},
      });
      return;
    }

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = Math.round((total / reviews.length) * 10) / 10;

    const distribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = reviews.filter(r => r.rating === i).length;
    }

    await Product.findByIdAndUpdate(productId, {
      'ratingSummary.average': avg,
      'ratingSummary.count': reviews.length,
      'ratingSummary.distribution': distribution,
    });
  }
}

module.exports = new CatalogService();
