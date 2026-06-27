/**
 * FILE: src/controllers/CatalogController.js
 * -------------------------------------------
 * PURPOSE:
 *   HTTP request handlers for the product catalog.
 *   All methods follow the same pattern: extract params → call service → wrap in ApiResponse.
 *   Business logic lives entirely in CatalogService.
 *
 * ROUTE FILE: src/routes/catalogRoutes.js (mounted at /catalog)
 *
 * ENDPOINTS HANDLED:
 *   Products: getAllProducts, getFeaturedProducts, getTrendingProducts, getProductsByIds,
 *             getProductById, getProductBySlug, createProduct, updateProduct, deleteProduct
 *   Categories: getRootCategories, getAllCategories, getCategoryTree, getCategoryById,
 *               getSubCategories, getProductsByCategory, createCategory, deleteCategory
 *   Attributes: getAllAttributes, getAttributeById, createAttribute, updateAttribute,
 *               deleteAttribute, getProductAttributeValues, setProductAttribute,
 *               deleteProductAttributeValue, getCategoryAttributes, addAttributeToCategory,
 *               removeAttributeFromCategory
 *   Reviews: getReviews, getAllReviews, createReview, deleteReview
 *   Media: getMedia, addMedia, deleteMedia
 *   Variants: getVariants, addVariant, updateVariant, deleteVariant
 *   Search: search (delegates to CatalogService.searchWithFilters)
 *
 * SECURITY NOTE on createReview:
 *   userId and userName are taken from req.user (JWT) — never from the request body.
 *   This prevents users from submitting reviews as other users.
 *
 * USED BY:
 *   - src/routes/catalogRoutes.js
 */
const catalogService = require('../services/CatalogService'); // All catalog business logic
const ApiResponse    = require('../utils/ApiResponse');        // Consistent response envelope

const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir || 'desc';
    const result = await catalogService.getAllProducts(page, size, sortBy, sortDir);
    res.status(200).json(ApiResponse.success(result, 'Products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await catalogService.getFeaturedProducts(limit);
    res.status(200).json(ApiResponse.success(products, 'Featured products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getTrendingProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await catalogService.getTrendingProducts(limit);
    res.status(200).json(ApiResponse.success(products, 'Trending products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getProductsByIds = async (req, res, next) => {
  try {
    const ids = req.query.ids ? req.query.ids.split(',').map(id => id.trim()) : [];
    const products = await catalogService.getProductsByIds(ids);
    res.status(200).json(ApiResponse.success(products, 'Products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await catalogService.getProductById(req.params.id);
    res.status(200).json(ApiResponse.success(product, 'Product retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const product = await catalogService.getProductBySlug(req.params.slug);
    res.status(200).json(ApiResponse.success(product, 'Product retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await catalogService.createProduct(req.body);
    res.status(201).json(ApiResponse.success(product, 'Product created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await catalogService.updateProduct(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(product, 'Product updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await catalogService.deleteProduct(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Product deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getRootCategories = async (req, res, next) => {
  try {
    const categories = await catalogService.getRootCategories();
    res.status(200).json(ApiResponse.success(categories, 'Categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await catalogService.getAllCategories();
    res.status(200).json(ApiResponse.success(categories, 'Categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getCategoryTree = async (req, res, next) => {
  try {
    const tree = await catalogService.getCategoryTree();
    res.status(200).json(ApiResponse.success(tree, 'Category tree retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await catalogService.getCategoryById(req.params.id);
    res.status(200).json(ApiResponse.success(category, 'Category retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getSubCategories = async (req, res, next) => {
  try {
    const subCategories = await catalogService.getSubCategories(req.params.id);
    res.status(200).json(ApiResponse.success(subCategories, 'Sub-categories retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getProductsByCategory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const result = await catalogService.getProductsByCategory(req.params.id, page, size);
    res.status(200).json(ApiResponse.success(result, 'Products retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await catalogService.createCategory(req.body);
    res.status(201).json(ApiResponse.success(category, 'Category created successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    await catalogService.deleteCategory(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Category deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await catalogService.updateCategory(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(category, 'Category updated successfully'));
  } catch (error) {
    next(error);
  }
};

const getAllAttributes = async (req, res, next) => {
  try {
    const attributes = await catalogService.getAllAttributes();
    res.status(200).json(ApiResponse.success(attributes, 'Attributes retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getAttributeById = async (req, res, next) => {
  try {
    const attribute = await catalogService.getAttributeById(req.params.id);
    res.status(200).json(ApiResponse.success(attribute, 'Attribute retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createAttribute = async (req, res, next) => {
  try {
    const attribute = await catalogService.createAttribute(req.body);
    res.status(201).json(ApiResponse.success(attribute, 'Attribute created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateAttribute = async (req, res, next) => {
  try {
    const attribute = await catalogService.updateAttribute(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(attribute, 'Attribute updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteAttribute = async (req, res, next) => {
  try {
    await catalogService.deleteAttribute(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Attribute deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getProductAttributeValues = async (req, res, next) => {
  try {
    const values = await catalogService.getProductAttributeValues(req.params.productId);
    res.status(200).json(ApiResponse.success(values, 'Product attribute values retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const setProductAttribute = async (req, res, next) => {
  try {
    await catalogService.setProductAttributeValue(req.params.productId, req.params.attributeId, req.body.value);
    res.status(200).json(ApiResponse.success(null, 'Product attribute set successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteProductAttributeValue = async (req, res, next) => {
  try {
    await catalogService.deleteProductAttributeValue(req.params.productId, req.params.attributeId);
    res.status(200).json(ApiResponse.success(null, 'Product attribute value deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getCategoryAttributes = async (req, res, next) => {
  try {
    const attributes = await catalogService.getCategoryAttributes(req.params.categoryId);
    res.status(200).json(ApiResponse.success(attributes, 'Category attributes retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const addAttributeToCategory = async (req, res, next) => {
  try {
    await catalogService.addAttributeToCategory(req.params.categoryId, req.params.attributeId);
    res.status(200).json(ApiResponse.success(null, 'Attribute added to category successfully'));
  } catch (error) {
    next(error);
  }
};

const removeAttributeFromCategory = async (req, res, next) => {
  try {
    await catalogService.removeAttributeFromCategory(req.params.categoryId, req.params.attributeId);
    res.status(200).json(ApiResponse.success(null, 'Attribute removed from category successfully'));
  } catch (error) {
    next(error);
  }
};

const getReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const sort = req.query.sort || '-createdAt';
    const result = await catalogService.getReviewsByProductId(req.params.productId, page, size, sort);
    res.status(200).json(ApiResponse.success(result, 'Reviews retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getAllReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const sort = req.query.sort || '-createdAt';
    const result = await catalogService.getAllReviews(page, size, sort);
    res.status(200).json(ApiResponse.success(result, 'Reviews retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    // Always use the authenticated user's ID and email from the token
    const review = await catalogService.createReview(req.params.productId, {
      ...req.body,
      userId: req.user.id,
      userName: req.body.userName || req.user.email,
    });
    res.status(201).json(ApiResponse.success(review, 'Review created successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    await catalogService.deleteReview(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Review deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const updateUserReview = async (req, res, next) => {
  try {
    const review = await catalogService.updateUserReview(req.params.id, req.user.id, req.body);
    res.status(200).json(ApiResponse.success(review, 'Review updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteUserReview = async (req, res, next) => {
  try {
    await catalogService.deleteUserReview(req.params.id, req.user.id);
    res.status(200).json(ApiResponse.success(null, 'Review deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getMedia = async (req, res, next) => {
  try {
    const media = await catalogService.getMediaByProductId(req.params.productId);
    res.status(200).json(ApiResponse.success(media, 'Media retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const addMedia = async (req, res, next) => {
  try {
    const mediaItem = await catalogService.addMedia(req.params.productId, req.body);
    res.status(201).json(ApiResponse.success(mediaItem, 'Media added successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteMedia = async (req, res, next) => {
  try {
    await catalogService.deleteMedia(req.params.mediaId);
    res.status(200).json(ApiResponse.success(null, 'Media deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getVariants = async (req, res, next) => {
  try {
    const variants = await catalogService.getVariantsByProductId(req.params.productId);
    res.status(200).json(ApiResponse.success(variants, 'Variants retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const addVariant = async (req, res, next) => {
  try {
    const variant = await catalogService.addVariant(req.params.productId, req.body);
    res.status(201).json(ApiResponse.success(variant, 'Variant added successfully'));
  } catch (error) {
    next(error);
  }
};

const updateVariant = async (req, res, next) => {
  try {
    const variant = await catalogService.updateVariant(req.params.variantId, req.body);
    res.status(200).json(ApiResponse.success(variant, 'Variant updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteVariant = async (req, res, next) => {
  try {
    await catalogService.deleteVariant(req.params.variantId);
    res.status(200).json(ApiResponse.success(null, 'Variant deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const { q, categoryId, minPrice, maxPrice, sort } = req.query;
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const result = await catalogService.searchWithFilters({ q, categoryId, minPrice, maxPrice, sort, page, size });
    res.status(200).json(ApiResponse.success(result, 'Search completed'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getFeaturedProducts,
  getTrendingProducts,
  getProductsByIds,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getRootCategories,
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  getSubCategories,
  getProductsByCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getProductAttributeValues,
  setProductAttribute,
  deleteProductAttributeValue,
  getCategoryAttributes,
  addAttributeToCategory,
  removeAttributeFromCategory,
  getReviews,
  getAllReviews,
  createReview,
  deleteReview,
  updateUserReview,
  deleteUserReview,
  getMedia,
  addMedia,
  deleteMedia,
  getVariants,
  addVariant,
  updateVariant,
  deleteVariant,
  search,
};
