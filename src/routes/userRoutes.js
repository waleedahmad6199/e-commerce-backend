/**
 * FILE: src/routes/userRoutes.js
 * --------------------------------
 * PURPOSE:
 *   Defines all HTTP routes for customer authentication and account management.
 *   Mounted at /api/users in app.js.
 *
 * ROUTE GROUPS:
 *   1. Auth (public)          — register, login, forgot/reset password, get current user
 *   2. Admin user management  — admin-only list of all customers
 *   3. Profile management     — view/update/delete own account (owner or admin)
 *   4. Addresses              — CRUD for saved delivery addresses (owner only)
 *   5. Payment methods        — CRUD for saved payment methods (owner only)
 *   6. Wishlist               — add/remove/view saved products (owner only)
 *
 * AUTH GUARDS:
 *   - authenticateUser : requires any valid JWT (customer or admin)
 *   - requireAdmin     : requires role === 'ADMIN' in JWT
 *   Owner checks are enforced in UserController.assertOwnerOrAdmin()
 *
 * VALIDATION MIDDLEWARE (from middleware/validate.js):
 *   - validateRegister      : email format, password min length
 *   - validateLogin         : email format, password presence
 *   - validateAddress       : fullName, street, city required
 *   - validatePaymentMethod : type required
 *   - validateChangePassword: currentPassword + newPassword required
 *
 * DEPENDENCIES:
 *   - controllers/AuthController.js
 *   - controllers/UserController.js
 *   - middleware/auth.js
 *   - middleware/validate.js
 *   - validators/authValidators.js
 */

const express  = require('express');
const router   = express.Router();

const authController = require('../controllers/AuthController'); // Handles auth endpoints
const userController = require('../controllers/UserController'); // Handles profile/address/wishlist
const { authenticateUser, requireAdmin } = require('../middleware/auth'); // JWT guards

// Validation rule sets from the centralised validate middleware
const {
  validateRegister,
  validateLogin,
  validateAddress,
  validatePaymentMethod,
  validateChangePassword,
} = require('../middleware/validate');

// Additional auth validators (forgotPassword, resetPassword rules)
const {
  validate,
  forgotPasswordRules,
  resetPasswordRules,
} = require('../validators/authValidators');

// ── Public Auth Routes ─────────────────────────────────────────────────────

// POST /api/users/register — create a new customer account
router.post('/register', validateRegister, authController.register);

// POST /api/users/login — authenticate and receive a JWT
router.post('/login', validateLogin, authController.login);

// POST /api/users/forgot-password — trigger the password reset email flow
router.post('/forgot-password', forgotPasswordRules, validate, authController.forgotPassword);

// POST /api/users/reset-password — consume reset token and set new password
router.post('/reset-password', resetPasswordRules, validate, authController.resetPassword);

// GET /api/users/me — returns the currently authenticated user's profile
router.get('/me', authenticateUser, authController.getMe);

// ── Admin-Only User Management ─────────────────────────────────────────────

// GET /api/users/all — paginated list of ALL customers (admin only)
router.get('/all', authenticateUser, requireAdmin, userController.getAllUsers);

// PUT /api/users/:id/block — block a user (admin only)
router.put('/:id/block', authenticateUser, requireAdmin, userController.blockUser);

// DELETE /api/users/:id/block — unblock a user (admin only)
router.delete('/:id/block', authenticateUser, requireAdmin, userController.unblockUser);

// ── Individual User Profile ────────────────────────────────────────────────
// These routes verify ownership in the controller (caller must own the resource or be admin)

// GET    /api/users/:id         — view a user's profile
router.get('/:id', authenticateUser, userController.getUserById);

// PUT    /api/users/:id         — update a user's profile fields
router.put('/:id', authenticateUser, userController.updateUser);

// DELETE /api/users/:id         — permanently delete a user account (admin only)
router.delete('/:id', authenticateUser, requireAdmin, userController.deleteUser);

// PUT    /api/users/:id/password — change password (requires current password verification)
router.put('/:id/password', authenticateUser, validateChangePassword, userController.changePassword);

// ── Address Management ─────────────────────────────────────────────────────

// GET    /api/users/:userId/addresses              — list all saved addresses
router.get('/:userId/addresses', authenticateUser, userController.getAddresses);

// POST   /api/users/:userId/addresses              — add a new saved address
router.post('/:userId/addresses', authenticateUser, validateAddress, userController.addAddress);

// PUT    /api/users/:userId/addresses/:addressId   — update an existing address
router.put('/:userId/addresses/:addressId', authenticateUser, validateAddress, userController.updateAddress);

// DELETE /api/users/:userId/addresses/:addressId   — remove a saved address
router.delete('/:userId/addresses/:addressId', authenticateUser, userController.deleteAddress);

// PUT    /api/users/:userId/addresses/:addressId/default — set as the default delivery address
router.put('/:userId/addresses/:addressId/default', authenticateUser, userController.setDefaultAddress);

// ── Payment Method Management ───────────────────────────────────────────────

// GET    /api/users/:userId/payment-methods               — list saved payment methods
router.get('/:userId/payment-methods', authenticateUser, userController.getPaymentMethods);

// POST   /api/users/:userId/payment-methods               — add a new payment method
router.post('/:userId/payment-methods', authenticateUser, validatePaymentMethod, userController.addPaymentMethod);

// DELETE /api/users/:userId/payment-methods/:methodId     — remove a payment method
router.delete('/:userId/payment-methods/:methodId', authenticateUser, userController.deletePaymentMethod);

// PUT    /api/users/:userId/payment-methods/:methodId/default — set as default payment
router.put('/:userId/payment-methods/:methodId/default', authenticateUser, userController.setDefaultPaymentMethod);

// ── Wishlist ────────────────────────────────────────────────────────────────

// GET    /api/users/:userId/wishlist              — list all wishlisted product IDs
router.get('/:userId/wishlist', authenticateUser, userController.getWishlistProductIds);

// POST   /api/users/:userId/wishlist/:productId   — add a product to the wishlist
router.post('/:userId/wishlist/:productId', authenticateUser, userController.addProductToWishlist);

// DELETE /api/users/:userId/wishlist/:productId   — remove a product from the wishlist
router.delete('/:userId/wishlist/:productId', authenticateUser, userController.removeProductFromWishlist);

module.exports = router;
