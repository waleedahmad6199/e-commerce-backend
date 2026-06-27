/**
 * FILE: src/controllers/AdminController.js
 * ------------------------------------------
 * PURPOSE:
 *   HTTP request handlers for the admin panel backend.
 *   Handles admin user management, coupon management, dashboard statistics,
 *   and audit log retrieval.
 *
 *   All endpoints are protected by authenticateUser + requireAdmin middleware
 *   in adminRoutes.js — they will never be reached by unauthenticated users.
 *
 * ROUTE FILE: src/routes/adminRoutes.js (mounted at /api/admin)
 *
 * ENDPOINTS HANDLED:
 *   Users:      getAllUsers, getUser, createUser, updateUser, deleteUser, resetPassword
 *   Roles:      getRoles, getPermissions, getRolePermissions, updateRolePermissions
 *   Coupons:    getAllCoupons, getCoupon, getCouponByCode, createCoupon, updateCoupon, deleteCoupon
 *   Dashboard:  getDashboard
 *   Audit:      getAuditLogs
 *
 * USED BY:
 *   - src/routes/adminRoutes.js
 */
const adminUserService = require('../services/AdminUserService'); // Admin user + role logic
const couponService    = require('../services/CouponService');    // Coupon CRUD logic
const auditLogService  = require('../services/AuditLogService'); // Audit log retrieval
const dashboardService = require('../services/DashboardService'); // Stats aggregation
const ApiResponse      = require('../utils/ApiResponse');         // Response envelope

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const result = await adminUserService.getAllUsers({ page, size });
    res.status(200).json(ApiResponse.success(result, 'Admin users retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await adminUserService.getUserById(req.params.id);
    res.status(200).json(ApiResponse.success(user, 'Admin user retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await adminUserService.createUser(req.body, req.user.id);
    res.status(201).json(ApiResponse.success(user, 'Admin user created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await adminUserService.updateUser(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(user, 'Admin user updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await adminUserService.deleteUser(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Admin user deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    await adminUserService.resetPassword(req.params.id, req.body.password);
    res.status(200).json(ApiResponse.success(null, 'Password reset successfully'));
  } catch (error) {
    next(error);
  }
};

const getRoles = async (req, res, next) => {
  try {
    const roles = await adminUserService.getAllRoles();
    res.status(200).json(ApiResponse.success(roles, 'Roles retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getPermissions = async (req, res, next) => {
  try {
    const permissions = await adminUserService.getAllPermissions();
    res.status(200).json(ApiResponse.success(permissions, 'Permissions retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getRolePermissions = async (req, res, next) => {
  try {
    const permissions = await adminUserService.getPermissionsByRole(req.params.roleId);
    res.status(200).json(ApiResponse.success(permissions, 'Role permissions retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const updateRolePermissions = async (req, res, next) => {
  try {
    await adminUserService.updateRolePermissions(req.params.roleId, req.body.permissionIds);
    res.status(200).json(ApiResponse.success(null, 'Role permissions updated successfully'));
  } catch (error) {
    next(error);
  }
};

const getAllCoupons = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const result = await couponService.getAllCoupons({ page, size });
    res.status(200).json(ApiResponse.success(result, 'Coupons retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.getCouponById(req.params.id);
    res.status(200).json(ApiResponse.success(coupon, 'Coupon retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getCouponByCode = async (req, res, next) => {
  try {
    const coupon = await couponService.getCouponByCode(req.params.code);
    res.status(200).json(ApiResponse.success(coupon, 'Coupon retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.createCoupon(req.body, req.user.id);
    res.status(201).json(ApiResponse.success(coupon, 'Coupon created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(coupon, 'Coupon updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    await couponService.deleteCoupon(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Coupon deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.status(200).json(ApiResponse.success(stats, 'Dashboard data retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 50;
    const result = await auditLogService.getAuditLogs({ page, size });
    res.status(200).json(ApiResponse.success(result, 'Audit logs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getRoles,
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getAllCoupons,
  getCoupon,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getDashboard,
  getAuditLogs,
};
