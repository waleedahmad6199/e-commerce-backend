/**
 * FILE: src/routes/catalogRoutes.js
 * ------------------------------------
 * PURPOSE:
 *   Defines all HTTP routes for the product catalog:
 *   products, categories, attributes, reviews, media, and variants.
 *   Mounted at /catalog in app.js.
 *
 * ACCESS PATTERN:
 *   - Read (GET) routes are public — no auth required for browsing.
 *   - Write (POST/PUT/DELETE) routes are admin-only except:
 *       POST /products/:productId/reviews — requires authenticated customer
 *
 * IMPORTANT ROUTE ORDERING:
 *   Express matches routes in registration order. Within each group,
 *   specific named paths (/featured, /trending, /slug/:slug, /batch)
 *   MUST be registered BEFORE the generic /:id path. Otherwise
 *   'featured', 'trending', 'batch', etc. would be treated as product IDs.
 *
 *   Similarly for attributes: /product/:productId and /category/:categoryId
 *   MUST come before /:id.
 *
 * DEPENDENCIES:
 *   - controllers/CatalogController.js
 *   - middleware/auth.js
 *   - middleware/validate.js
 */

const express = require("express");
const router = express.Router();

const catalogController = require("../controllers/CatalogController");
const { authenticateUser, requireAdmin } = require("../middleware/auth");
const {
  validateProductCreate,
  validateReview,
  validateCategory,
  validateAttributeCreate,
  validateVariantCreate,
  validateMediaCreate,
} = require("../middleware/validate");

// ── Product Routes ────────────────────────────────────────────────────────
// IMPORTANT: Named paths (/featured, /trending, /batch, /slug/:slug) BEFORE /:id

// GET /catalog/products/featured             — products where featured=true
router.get("/products/featured", catalogController.getFeaturedProducts);

// GET /catalog/products/trending             — products sorted by soldCount desc
router.get("/products/trending", catalogController.getTrendingProducts);

// GET /catalog/products/batch?ids=id1,id2    — fetch multiple products by comma-separated IDs
router.get("/products/batch", catalogController.getProductsByIds);

// GET /catalog/products/slug/:slug           — find product by SEO slug
router.get("/products/slug/:slug", catalogController.getProductBySlug);

// ── Review Routes ─────────────────────────────────────────────────────────

// GET  /catalog/products/reviews                    — all reviews (admin moderation view)
router.get("/products/reviews", catalogController.getAllReviews);

// GET  /catalog/products/:productId/reviews         — reviews for one product (public)
router.get("/products/:productId/reviews", catalogController.getReviews);

// POST /catalog/products/:productId/reviews         — submit a review (requires login)
router.post(
  "/products/:productId/reviews",
  authenticateUser,
  validateReview,
  catalogController.createReview,
);

// PUT /catalog/products/reviews/:id                 — update user's own review
router.put(
  "/products/reviews/:id",
  authenticateUser,
  catalogController.updateUserReview,
);

// DELETE /catalog/products/user-reviews/:id         — delete user's own review
router.delete(
  "/products/user-reviews/:id",
  authenticateUser,
  catalogController.deleteUserReview,
);

// DELETE /catalog/products/reviews/:id              — delete a review (admin only)
router.delete(
  "/products/reviews/:id",
  authenticateUser,
  requireAdmin,
  catalogController.deleteReview,
);

// GET /catalog/products/:id                  — single product by MongoDB ID (increments viewCount)
router.get("/products/:id", catalogController.getProductById);

// GET /catalog/products                      — paginated active product list
router.get("/products", catalogController.getAllProducts);

// POST   /catalog/products           — create a new product (admin only)
router.post(
  "/products",
  authenticateUser,
  requireAdmin,
  validateProductCreate,
  catalogController.createProduct,
);

// PUT    /catalog/products/:id       — update product fields (admin only)
router.put(
  "/products/:id",
  authenticateUser,
  requireAdmin,
  catalogController.updateProduct,
);

// DELETE /catalog/products/:id       — soft-delete product: sets status=INACTIVE (admin only)
router.delete(
  "/products/:id",
  authenticateUser,
  requireAdmin,
  catalogController.deleteProduct,
);

// ── Category Routes ───────────────────────────────────────────────────────
// IMPORTANT: /all, /tree named routes BEFORE /:id to avoid being matched as IDs

// GET /catalog/categories/all                — flat list of all categories
router.get("/categories/all", catalogController.getAllCategories);

// GET /catalog/categories/tree               — full nested category tree structure
router.get("/categories/tree", catalogController.getCategoryTree);

// GET /catalog/categories/:id/children       — sub-categories of a given parent
router.get("/categories/:id/children", catalogController.getSubCategories);

// GET /catalog/categories/:id/products       — paginated products in a category
router.get("/categories/:id/products", catalogController.getProductsByCategory);

// GET /catalog/categories/:id                — single category by ID
router.get("/categories/:id", catalogController.getCategoryById);

// GET /catalog/categories                    — root categories (parentId=null)
router.get("/categories", catalogController.getRootCategories);

// POST   /catalog/categories     — create a category (admin only)
router.post(
  "/categories",
  authenticateUser,
  requireAdmin,
  validateCategory,
  catalogController.createCategory,
);

// PUT    /catalog/categories/:id — update a category (admin only)
router.put(
  "/categories/:id",
  authenticateUser,
  requireAdmin,
  catalogController.updateCategory,
);

// DELETE /catalog/categories/:id — delete a category (admin only)
router.delete(
  "/categories/:id",
  authenticateUser,
  requireAdmin,
  catalogController.deleteCategory,
);

// ── Attribute Routes ──────────────────────────────────────────────────────
// IMPORTANT: /product/:productId and /category/:categoryId BEFORE /:id

// GET /catalog/attributes/product/:productId         — attribute values set on a product
router.get(
  "/attributes/product/:productId",
  catalogController.getProductAttributeValues,
);

// GET /catalog/attributes/category/:categoryId       — attributes associated with a category
router.get(
  "/attributes/category/:categoryId",
  catalogController.getCategoryAttributes,
);

// GET /catalog/attributes/:id                        — single attribute definition
router.get("/attributes/:id", catalogController.getAttributeById);

// GET /catalog/attributes                            — all attribute definitions
router.get("/attributes", catalogController.getAllAttributes);

// POST   /catalog/attributes                                         — create attribute (admin)
router.post(
  "/attributes",
  authenticateUser,
  requireAdmin,
  validateAttributeCreate,
  catalogController.createAttribute,
);

// PUT    /catalog/attributes/:id                                     — update attribute (admin)
router.put(
  "/attributes/:id",
  authenticateUser,
  requireAdmin,
  catalogController.updateAttribute,
);

// DELETE /catalog/attributes/:id                                     — delete attribute (admin)
router.delete(
  "/attributes/:id",
  authenticateUser,
  requireAdmin,
  catalogController.deleteAttribute,
);

// PUT    /catalog/attributes/product/:productId/:attributeId         — set attribute value on product (admin)
router.put(
  "/attributes/product/:productId/:attributeId",
  authenticateUser,
  requireAdmin,
  catalogController.setProductAttribute,
);

// DELETE /catalog/attributes/product/:productId/:attributeId         — remove attribute value (admin)
router.delete(
  "/attributes/product/:productId/:attributeId",
  authenticateUser,
  requireAdmin,
  catalogController.deleteProductAttributeValue,
);

// POST   /catalog/attributes/category/:categoryId/:attributeId       — link attribute to category (admin)
router.post(
  "/attributes/category/:categoryId/:attributeId",
  authenticateUser,
  requireAdmin,
  catalogController.addAttributeToCategory,
);

// DELETE /catalog/attributes/category/:categoryId/:attributeId       — unlink attribute from category (admin)
router.delete(
  "/attributes/category/:categoryId/:attributeId",
  authenticateUser,
  requireAdmin,
  catalogController.removeAttributeFromCategory,
);

// ── Media Routes ──────────────────────────────────────────────────────────

// GET    /catalog/products/:productId/media          — media items for a product (public)
router.get("/products/:productId/media", catalogController.getMedia);

// POST   /catalog/products/:productId/media          — add a media URL to a product (admin)
router.post(
  "/products/:productId/media",
  authenticateUser,
  requireAdmin,
  validateMediaCreate,
  catalogController.addMedia,
);

// DELETE /catalog/products/media/:mediaId            — remove a media item (admin)
router.delete(
  "/products/media/:mediaId",
  authenticateUser,
  requireAdmin,
  catalogController.deleteMedia,
);

// ── Variant Routes ────────────────────────────────────────────────────────

// GET    /catalog/products/:productId/variants        — variants for a product (public)
router.get("/products/:productId/variants", catalogController.getVariants);

// POST   /catalog/products/:productId/variants        — add a variant to a product (admin)
router.post(
  "/products/:productId/variants",
  authenticateUser,
  requireAdmin,
  validateVariantCreate,
  catalogController.addVariant,
);

// PUT    /catalog/products/variants/:variantId        — update a variant (admin)
router.put(
  "/products/variants/:variantId",
  authenticateUser,
  requireAdmin,
  catalogController.updateVariant,
);

// DELETE /catalog/products/variants/:variantId        — delete a variant (admin)
router.delete(
  "/products/variants/:variantId",
  authenticateUser,
  requireAdmin,
  catalogController.deleteVariant,
);

module.exports = router;
