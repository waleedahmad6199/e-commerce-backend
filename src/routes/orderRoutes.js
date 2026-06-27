/**
 * FILE: src/routes/orderRoutes.js
 * ---------------------------------
 * PURPOSE:
 *   Defines all HTTP routes for cart, orders, payments, shipments, returns,
 *   and refunds. This router is mounted directly on the app (no prefix) in
 *   app.js so routes use their full paths: /api/cart, /api/orders, etc.
 *
 * SECURITY:
 *   ALL routes here require authentication (authenticateUser).
 *   - Cart and order reads use req.user.id — customers see only their own data.
 *   - Admin routes (GET /all, PATCH status, shipment/return/refund mutations)
 *     require requireAdmin in addition.
 *   - checkout() and createReturn() override any client-supplied userId with
 *     req.user.id in the controller to prevent IDOR attacks.
 *
 * IMPORTANT ORDERING:
 *   /api/orders/all and /api/orders/checkout MUST be registered BEFORE
 *   /api/orders/:orderId because Express matches routes in definition order.
 *   If /:orderId came first, 'all' and 'checkout' would be treated as IDs.
 *
 * DEPENDENCIES:
 *   - controllers/OrderController.js
 *   - middleware/auth.js
 *   - middleware/validate.js (validateAddToCart, validateCheckout)
 */

const express = require('express');
const router  = express.Router();

const orderController = require('../controllers/OrderController'); // All order/cart handlers
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const { validateAddToCart, validateCheckout } = require('../middleware/validate');

// ── Cart Routes ─────────────────────────────────────────────────────────────

// GET    /api/cart                   — retrieve the authenticated user's cart
router.get('/api/cart', authenticateUser, orderController.getCart);

// POST   /api/cart/items             — add a product to the cart
router.post('/api/cart/items', authenticateUser, validateAddToCart, orderController.addItem);

// PUT    /api/cart/items/:itemId     — change the quantity of a cart item
router.put('/api/cart/items/:itemId', authenticateUser, orderController.updateItem);

// DELETE /api/cart/items/:itemId     — remove one item from the cart
router.delete('/api/cart/items/:itemId', authenticateUser, orderController.removeItem);

// DELETE /api/cart                   — remove all items from the cart
router.delete('/api/cart', authenticateUser, orderController.clearCart);

// ── Order Routes ────────────────────────────────────────────────────────────
// IMPORTANT: /all and /checkout must be BEFORE /:orderId

// GET    /api/orders/all             — paginated list of ALL orders (admin only)
router.get('/api/orders/all', authenticateUser, requireAdmin, orderController.getAllOrders);

// GET    /api/orders                 — authenticated user's own order history
router.get('/api/orders', authenticateUser, orderController.getOrders);

// GET    /api/orders/:orderId        — single order detail (user must own it, or be admin)
router.get('/api/orders/:orderId', authenticateUser, orderController.getOrder);

// POST   /api/orders/checkout        — place an order from the current cart
router.post('/api/orders/checkout', authenticateUser, validateCheckout, orderController.checkout);

// PATCH  /api/orders/:orderId/status — update order status (admin only)
router.patch('/api/orders/:orderId/status', authenticateUser, requireAdmin, orderController.updateOrderStatus);

// ── Payment Routes ───────────────────────────────────────────────────────────

// GET    /api/payments/order/:orderId — retrieve payment record for an order
router.get('/api/payments/order/:orderId', authenticateUser, orderController.getPaymentByOrderId);

// ── Shipment Routes ───────────────────────────────────────────────────────────

// GET    /api/shipments/order/:orderId       — retrieve shipment for an order
router.get('/api/shipments/order/:orderId', authenticateUser, orderController.getShipmentByOrderId);

// PATCH  /api/shipments/:shipmentId/status   — update shipment status (admin only)
router.patch('/api/shipments/:shipmentId/status', authenticateUser, requireAdmin, orderController.updateShipmentStatus);

// ── Return & Refund Routes ────────────────────────────────────────────────────

// GET    /api/returns/order/:orderId   — list all returns for an order
router.get('/api/returns/order/:orderId', authenticateUser, orderController.getReturnsByOrderId);

// GET    /api/returns/:returnId        — single return detail
router.get('/api/returns/:returnId', authenticateUser, orderController.getReturnById);

// POST   /api/returns/order/:orderId   — submit a return request for an order
router.post('/api/returns/order/:orderId', authenticateUser, orderController.createReturn);

// PATCH  /api/returns/:returnId/status — approve or reject a return (admin only)
router.patch('/api/returns/:returnId/status', authenticateUser, requireAdmin, orderController.updateReturnStatus);

// GET    /api/returns/:returnId/refunds        — list refunds for a return
router.get('/api/returns/:returnId/refunds', authenticateUser, orderController.getRefunds);

// POST   /api/returns/:returnId/refunds        — process a refund for a return (admin only)
router.post('/api/returns/:returnId/refunds', authenticateUser, requireAdmin, orderController.processRefund);

// ── Coupon Routes ────────────────────────────────────────────────────────────

// POST   /api/coupons/validate         — validate a coupon code
router.post('/api/coupons/validate', authenticateUser, orderController.validateCoupon);

module.exports = router;
