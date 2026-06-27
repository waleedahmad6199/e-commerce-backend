/**
 * FILE: src/controllers/UserController.js
 * ------------------------------------------
 * PURPOSE:
 *   HTTP handlers for customer profile management, addresses, payment methods,
 *   and wishlist. All handlers enforce ownership via assertOwnerOrAdmin() —
 *   a customer can only access their own data; admins can access any user's data.
 *
 * IDOR PREVENTION:
 *   assertOwnerOrAdmin(req, targetUserId) throws 403 if:
 *     req.user.role !== 'ADMIN' AND req.user.id !== targetUserId
 *   This is called at the top of every handler that operates on a specific user's data.
 *
 * ROUTE FILE: src/routes/userRoutes.js (mounted at /api/users)
 *
 * USED BY:
 *   - src/routes/userRoutes.js
 */
const userService = require('../services/UserService'); // User business logic
const ApiResponse = require('../utils/ApiResponse');    // Response envelope
const ApiError    = require('../utils/ApiError');       // Custom error class

// Helper: check caller owns the resource, or is an admin
const assertOwnerOrAdmin = (req, targetUserId) => {
  if (req.user.role !== 'ADMIN' && req.user.id !== targetUserId) {
    throw new ApiError(403, 'You can only access your own data');
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = Math.min(parseInt(req.query.size) || 20, 100);
    const sort = req.query.sort || '-createdAt';
    const result = await userService.getAllUsers(page, size, sort);
    res.status(200).json(ApiResponse.success(result, 'Users retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.id);
    const user = await userService.getUserById(req.params.id);
    res.status(200).json(ApiResponse.success(user, 'User retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.id);
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(user, 'User updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'User deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.id);
    await userService.changePassword(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(null, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};

// ── Addresses ────────────────────────────────────────────────────────────────

const getAddresses = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    const addresses = await userService.getAddresses(req.params.userId);
    res.status(200).json(ApiResponse.success(addresses, 'Addresses retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const addAddress = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    const address = await userService.addAddress(req.params.userId, req.body);
    res.status(201).json(ApiResponse.success(address, 'Address added successfully'));
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    const address = await userService.updateAddress(req.params.userId, req.params.addressId, req.body);
    res.status(200).json(ApiResponse.success(address, 'Address updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    await userService.deleteAddress(req.params.userId, req.params.addressId);
    res.status(200).json(ApiResponse.success(null, 'Address deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const setDefaultAddress = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    await userService.setDefaultAddress(req.params.userId, req.params.addressId);
    res.status(200).json(ApiResponse.success(null, 'Default address updated successfully'));
  } catch (error) {
    next(error);
  }
};

// ── Payment Methods ──────────────────────────────────────────────────────────

const getPaymentMethods = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    const methods = await userService.getPaymentMethods(req.params.userId);
    res.status(200).json(ApiResponse.success(methods, 'Payment methods retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const addPaymentMethod = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    const method = await userService.addPaymentMethod(req.params.userId, req.body);
    res.status(201).json(ApiResponse.success(method, 'Payment method added successfully'));
  } catch (error) {
    next(error);
  }
};

const deletePaymentMethod = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    await userService.deletePaymentMethod(req.params.userId, req.params.methodId);
    res.status(200).json(ApiResponse.success(null, 'Payment method deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    await userService.setDefaultPaymentMethod(req.params.userId, req.params.methodId);
    res.status(200).json(ApiResponse.success(null, 'Default payment method updated successfully'));
  } catch (error) {
    next(error);
  }
};

// ── Wishlist ─────────────────────────────────────────────────────────────────

const getWishlistProductIds = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    const productIds = await userService.getWishlistProductIds(req.params.userId);
    res.status(200).json(ApiResponse.success(productIds, 'Wishlist retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const addProductToWishlist = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    await userService.addProductToWishlist(req.params.userId, req.params.productId);
    res.status(200).json(ApiResponse.success(null, 'Product added to wishlist'));
  } catch (error) {
    next(error);
  }
};

const removeProductFromWishlist = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.userId);
    await userService.removeProductFromWishlist(req.params.userId, req.params.productId);
    res.status(200).json(ApiResponse.success(null, 'Product removed from wishlist'));
  } catch (error) {
    next(error);
  }
};

const getWishlist = async (req, res, next) => {
  try {
    assertOwnerOrAdmin(req, req.params.id);
    const wishlist = await userService.getWishlist(req.params.id);
    res.status(200).json(ApiResponse.success(wishlist, 'Wishlist retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const blockUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Admin only');
    const user = await userService.blockUser(req.params.id, true);
    res.status(200).json(ApiResponse.success(user, 'User blocked successfully'));
  } catch (error) {
    next(error);
  }
};

const unblockUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Admin only');
    const user = await userService.blockUser(req.params.id, false);
    res.status(200).json(ApiResponse.success(user, 'User unblocked successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getWishlistProductIds,
  addProductToWishlist,
  removeProductFromWishlist,
  getWishlist,
  blockUser,
  unblockUser,
};
