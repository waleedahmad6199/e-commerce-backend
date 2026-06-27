/**
 * FILE: src/models/Product.js
 * ----------------------------
 * PURPOSE:
 *   Mongoose schema and model for the `products` collection.
 *   Products are the core entity of the catalog. This schema uses
 *   embedded sub-documents for variants and media because they are
 *   always read together with the product and never queried in isolation.
 *
 * EMBEDDED SUB-DOCUMENTS:
 *   - variants  : product variants (size/color combinations) with their own SKU, price, stock
 *   - media     : product images/videos with sort order and alt text
 *
 * REFERENCED COLLECTIONS:
 *   - Category  (via categoryId string — denormalised name/slug stored for performance)
 *   - Review    (separate collection — referenced by productId)
 *
 * KEY DESIGN DECISIONS:
 *   - attributes is a Mongoose Map (key-value) allowing arbitrary attribute names
 *   - ratingSummary is a denormalised cache updated by CatalogService._updateProductRating()
 *     to avoid expensive aggregation on every product view
 *   - inventory.available is kept in sync manually (totalStock - reserved)
 *   - slug is sparse+unique: allows null (auto-generated) but must be unique when set
 *   - status is an enum — only ACTIVE products appear in public listings
 *
 * INDEXES:
 *   - text index on (title, description) for full-text search fallback
 *   - compound index on (status, featured) for featured products query
 *   - index on categoryId for category-filtered product listings
 *   - unique sparse index on slug for SEO URL lookup
 *
 * USED BY:
 *   - src/services/CatalogService.js
 *   - src/services/SearchService.js
 *   - src/services/RecommendationService.js
 *   - src/services/DashboardService.js
 *   - src/services/OrderService.js  (reads product title/price for order snapshots)
 */

const mongoose = require('mongoose'); // MongoDB ODM

// ── Variant Sub-Document Schema ────────────────────────────────────────────
// A variant represents a specific purchasable configuration of a product
// (e.g. "Blue / Large"). Variants have their own SKU, price, and stock level.
const variantSchema = new mongoose.Schema({
  id:         String,                           // UUID string — stable identifier within product
  sku:        String,                           // Stock Keeping Unit — unique product code
  name:       String,                           // Display name (e.g. "Navy Blue / XL")
  attributes: { type: Map, of: String },        // Key-value pairs: { Color: 'Blue', Size: 'L' }
  price:      Number,                           // Variant-specific price (overrides basePrice)
  stock:      { type: Number, default: 0 },     // Units in stock for this variant
  image:      String,                           // URL of variant-specific image
  isActive:   { type: Boolean, default: true }, // Hide discontinued variants without deleting
}, { _id: false }); // _id: false — no separate _id for embedded sub-docs

// ── Media Sub-Document Schema ──────────────────────────────────────────────
// A media item is a single image or video associated with the product.
const mediaSchema = new mongoose.Schema({
  id:           String,                           // UUID string — stable identifier
  url:          String,                           // Full URL (Cloudinary or local /uploads/)
  thumbnailUrl: String,                           // Smaller optimized image for lists
  altText:      String,                           // Accessibility text for the image
  sortOrder:    { type: Number, default: 0 },     // Display order (0 = primary/first image)
  type:         { type: String, default: 'IMAGE' }, // 'IMAGE' or 'VIDEO'
}, { _id: false }); // _id: false — no separate _id for embedded sub-docs

// ── Product Schema ─────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema({
  title:        { type: String, required: true },   // Product display name (required)
  slug:         { type: String, unique: true, sparse: true }, // URL slug (auto-generated from title)
  description:  String,                              // Long-form product description
  categoryId:   String,                              // MongoDB ObjectId string of parent Category
  categoryName: String,                              // Denormalised: category display name
  categorySlug: String,                              // Denormalised: category URL slug
  categoryPath: String,                              // Denormalised: breadcrumb path string

  basePrice:  Number,                                // Regular price (shown when no salePrice)
  salePrice:  Number,                                // Discounted price (shown when set)
  costPrice:  Number,                                // Cost of goods (for margin reports — admin only)
  currency:   { type: String, default: 'USD' },      // ISO 4217 currency code

  status: {
    type:    String,
    enum:    ['ACTIVE', 'INACTIVE', 'DRAFT'],        // Only ACTIVE products are shown publicly
    default: 'ACTIVE',
  },
  featured:   { type: Boolean, default: false },     // Pinned to featured sections
  viewCount:  { type: Number, default: 0 },          // Incremented on each product detail view
  soldCount:  { type: Number, default: 0 },          // Incremented when included in a delivered order

  variants:   [variantSchema],                       // Embedded array of purchasable variants
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed }, // Free-form key-value attributes
  media:      [mediaSchema],                         // Embedded array of images/videos

  seo: {
    metaTitle:       String, // <title> tag override
    metaDescription: String, // <meta name="description"> tag
    metaKeywords:    String, // <meta name="keywords"> tag
    ogImage:         String, // Open Graph image URL for social sharing
  },

  ratingSummary: {
    average:      { type: Number, default: 0 },      // Weighted average rating (1–5)
    count:        { type: Number, default: 0 },      // Total number of published reviews
    distribution: { type: Map, of: Number, default: {} }, // { '5': 10, '4': 5, ... }
  },

  inventory: {
    totalStock:        { type: Number, default: 0 }, // Total physical stock (all variants combined)
    reserved:          { type: Number, default: 0 }, // Stock reserved for pending orders
    available:         { type: Number, default: 0 }, // available = totalStock - reserved
    lowStockThreshold: { type: Number, default: 5 }, // Show 'Low Stock' badge below this level
  },
}, { timestamps: true }); // timestamps: true adds createdAt and updatedAt automatically

// ── Indexes ────────────────────────────────────────────────────────────────
productSchema.index({ title: 'text', description: 'text' }); // Full-text search fallback
productSchema.index({ status: 1, featured: 1 });              // Featured products query
productSchema.index({ categoryId: 1 });                       // Products by category
productSchema.index({ slug: 1 }, { unique: true, sparse: true }); // SEO URL lookup

module.exports = mongoose.model('Product', productSchema); // Compile and export the model
