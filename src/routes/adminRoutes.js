/**
 * FILE: src/routes/adminRoutes.js
 * ---------------------------------
 * PURPOSE:
 *   Defines all HTTP routes for the admin panel backend.
 *   Mounted at /api/admin in app.js.
 *
 * ROUTE GROUPS:
 *   1. Auth   — admin login, logout, session validation (these ARE the admin auth endpoints)
 *   2. Users  — admin user management (CRUD, role/permission management)
 *   3. Coupons — discount coupon management
 *   4. Dashboard & Audit — stats overview, action log
 *
 * AUTH:
 *   - /auth/login is public (needed to get the token in the first place).
 *   - All other routes require authenticateUser + requireAdmin.
 *
 * ROUTE ORDERING NOTES:
 *   - GET /users/roles, /users/permissions MUST come BEFORE GET /users/:id
 *     otherwise 'roles' and 'permissions' would be treated as user IDs.
 *   - GET /coupons/code/:code MUST come BEFORE GET /coupons/:id
 *     otherwise 'code' would be treated as a coupon ID.
 *
 * DEPENDENCIES:
 *   - controllers/AuthController.js   (admin login/logout/session)
 *   - controllers/AdminController.js  (user/coupon/dashboard/audit management)
 *   - middleware/auth.js
 *   - middleware/validate.js
 */

const express = require('express');
const router  = express.Router();

const authController  = require('../controllers/AuthController');  // Admin auth endpoints
const adminController = require('../controllers/AdminController'); // Admin management endpoints
const exportController = require('../controllers/ExportController'); // Data exports
const receiptController = require('../controllers/ReceiptController'); // Receipt management
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const { validateAdminCreate, validateCouponCreate, validateLogin } = require('../middleware/validate');

// ── Admin Auth ─────────────────────────────────────────────────────────────

// POST /api/admin/auth/login  — authenticate an admin and receive a JWT
router.post('/auth/login', validateLogin, authController.adminLogin);

// POST /api/admin/auth/logout — invalidate the current admin session
router.post('/auth/logout', authenticateUser, authController.adminLogout);

// GET  /api/admin/auth/me     — validate session and return current admin info
router.get('/auth/me', authenticateUser, authController.validateAdminSession);

// ── Admin User Management ──────────────────────────────────────────────────
// IMPORTANT: specific sub-paths (/roles, /permissions) MUST be before /:id

// GET  /api/admin/users/roles                       — list all admin roles
router.get('/users/roles', authenticateUser, requireAdmin, adminController.getRoles);

// GET  /api/admin/users/permissions                 — list all permission codes
router.get('/users/permissions', authenticateUser, requireAdmin, adminController.getPermissions);

// GET  /api/admin/users/roles/:roleId/permissions   — permissions assigned to a role
router.get('/users/roles/:roleId/permissions', authenticateUser, requireAdmin, adminController.getRolePermissions);

// PUT  /api/admin/users/roles/:roleId/permissions   — update the permission set of a role
router.put('/users/roles/:roleId/permissions', authenticateUser, requireAdmin, adminController.updateRolePermissions);

// GET    /api/admin/users           — paginated list of all admin users
router.get('/users', authenticateUser, requireAdmin, adminController.getAllUsers);

// POST   /api/admin/users           — create a new admin user
router.post('/users', authenticateUser, requireAdmin, validateAdminCreate, adminController.createUser);

// GET    /api/admin/users/:id       — single admin user detail
router.get('/users/:id', authenticateUser, requireAdmin, adminController.getUser);

// PUT    /api/admin/users/:id       — update admin user profile/role/status
router.put('/users/:id', authenticateUser, requireAdmin, adminController.updateUser);

// DELETE /api/admin/users/:id       — deactivate (soft-delete) an admin user
router.delete('/users/:id', authenticateUser, requireAdmin, adminController.deleteUser);

// POST   /api/admin/users/:id/reset-password — reset an admin's password (admin triggered)
router.post('/users/:id/reset-password', authenticateUser, requireAdmin, adminController.resetPassword);

// ── Coupon Management ──────────────────────────────────────────────────────
// IMPORTANT: /code/:code MUST be before /:id

// GET  /api/admin/coupons/code/:code — find coupon by its string code
router.get('/coupons/code/:code', authenticateUser, requireAdmin, adminController.getCouponByCode);

// GET    /api/admin/coupons          — paginated list of all coupons
router.get('/coupons', authenticateUser, requireAdmin, adminController.getAllCoupons);

// POST   /api/admin/coupons          — create a new discount coupon
router.post('/coupons', authenticateUser, requireAdmin, validateCouponCreate, adminController.createCoupon);

// GET    /api/admin/coupons/:id      — single coupon detail
router.get('/coupons/:id', authenticateUser, requireAdmin, adminController.getCoupon);

// PUT    /api/admin/coupons/:id      — update coupon fields
router.put('/coupons/:id', authenticateUser, requireAdmin, adminController.updateCoupon);

// DELETE /api/admin/coupons/:id      — permanently delete a coupon
router.delete('/coupons/:id', authenticateUser, requireAdmin, adminController.deleteCoupon);

// ── Dashboard & Audit ──────────────────────────────────────────────────────

// GET /api/admin/dashboard    — aggregated stats: revenue, orders, products, customers
router.get('/dashboard', authenticateUser, requireAdmin, adminController.getDashboard);

// GET /api/admin/audit-logs   — paginated admin action audit trail
router.get('/audit-logs', authenticateUser, requireAdmin, adminController.getAuditLogs);

// ── Receipts & Exports ─────────────────────────────────────────────────────

// GET /api/admin/receipts — paginated list of all receipts
router.get('/receipts', authenticateUser, requireAdmin, receiptController.getAllReceipts);

// GET /api/admin/receipts/:id/pdf — download receipt PDF
router.get('/receipts/:id/pdf', authenticateUser, requireAdmin, receiptController.downloadReceiptPdf);

// GET /api/admin/exports/products — export products
router.get('/exports/products', authenticateUser, requireAdmin, exportController.exportProducts);

// GET /api/admin/exports/customers — export customers
router.get('/exports/customers', authenticateUser, requireAdmin, exportController.exportCustomers);

// GET /api/admin/exports/orders — export orders
router.get('/exports/orders', authenticateUser, requireAdmin, exportController.exportOrders);

// GET /api/admin/exports/reviews — export reviews
router.get('/exports/reviews', authenticateUser, requireAdmin, exportController.exportReviews);

module.exports = router;
