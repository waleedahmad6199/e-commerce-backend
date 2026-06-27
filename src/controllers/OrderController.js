/**
 * FILE: src/controllers/OrderController.js
 * ------------------------------------------
 * PURPOSE:
 *   HTTP request handlers for cart, orders, payments, shipments, returns, and refunds.
 *   All handlers derive userId from req.user.id (the JWT subject) — never from request
 *   params or body — to prevent IDOR vulnerabilities.
 *
 * KEY SECURITY DECISIONS:
 *   - Cart operations: userId = req.user.id (from JWT, not query string)
 *   - checkout(): merges req.user.id into data, overriding any client-supplied userId
 *   - getOrder(): passes null as userId for admins (bypasses ownership check)
 *   - createReturn(): injects req.user.id as userId into return data
 *   - Admin-only routes (getAllOrders, updateOrderStatus, etc.) are guarded
 *     by requireAdmin in the route file
 *
 * ROUTE FILE: src/routes/orderRoutes.js (mounted without prefix)
 *
 * USED BY:
 *   - src/routes/orderRoutes.js
 */
const payFastService  = require('../services/PayFastService');  // Payment integration
const cartService     = require('../services/CartService');     // Shopping cart operations
const orderService    = require('../services/OrderService');    // Order CRUD + checkout
const paymentService  = require('../services/PaymentService');  // Payment read
const shipmentService = require('../services/ShipmentService'); // Shipment read/update
const returnService   = require('../services/ReturnService');   // Return + refund operations
const couponService   = require('../services/CouponService');   // Coupon validation (checkout)
const ApiResponse     = require('../utils/ApiResponse');        // Response envelope

// ── Cart ────────────────────────────────────────────────────────────────────

const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.status(200).json(ApiResponse.success(cart, 'Cart retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const { productId, variantId, quantity, priceAtTime, productTitle, productImage } = req.body;
    const cart = await cartService.addItem(req.user.id, {
      productId,
      variantId,
      quantity,
      priceAtTime,
      productTitle,
      productImage,
    });
    res.status(200).json(ApiResponse.success(cart, 'Item added to cart'));
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const quantity = parseInt(req.body.quantity ?? req.query.quantity);
    const cart = await cartService.updateItem(req.user.id, req.params.itemId, quantity);
    res.status(200).json(ApiResponse.success(cart, 'Cart item updated'));
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeItem(req.user.id, req.params.itemId);
    res.status(200).json(ApiResponse.success(cart, 'Item removed from cart'));
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    await cartService.clearCart(req.user.id);
    res.status(200).json(ApiResponse.success(null, 'Cart cleared'));
  } catch (error) {
    next(error);
  }
};

// ── Orders ──────────────────────────────────────────────────────────────────

const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = Math.min(parseInt(req.query.size) || 10, 50);
    const result = await orderService.getOrdersByUser(req.user.id, page, size);
    res.status(200).json(ApiResponse.success(result, 'Orders retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = Math.min(parseInt(req.query.size) || 20, 100);
    const sort = req.query.sort || '-createdAt';
    const result = await orderService.getAllOrders(page, size, sort);
    res.status(200).json(ApiResponse.success(result, 'All orders retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    // Admins can view any order; customers can only view their own
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;
    const order = await orderService.getOrderById(req.params.orderId, userId);
    res.status(200).json(ApiResponse.success(order, 'Order retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const checkout = async (req, res, next) => {
  try {
    // Always use authenticated user's ID, never trust client-supplied userId
    const order = await orderService.checkout({
      ...req.body,
      userId: req.user.id,
    });
    
    let paymentUrl = null;
    try {
      const token = await payFastService.getAccessToken();
      const paymentInitiation = await payFastService.initiatePayment(order, token);
      paymentUrl = paymentInitiation.paymentUrl;
    } catch (paymentErr) {
      console.error('Failed to initiate payment:', paymentErr);
      // We still return the order, but paymentUrl remains null
    }

    res.status(201).json(ApiResponse.success(
      { order, paymentUrl },
      'Checkout successful'
    ));
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const status = req.body.status || req.query.status;
    const order = await orderService.updateOrderStatus(req.params.orderId, status);
    res.status(200).json(ApiResponse.success(order, 'Order status updated'));
  } catch (error) {
    next(error);
  }
};

// ── Payments ────────────────────────────────────────────────────────────────

const getPaymentByOrderId = async (req, res, next) => {
  try {
    const payment = await paymentService.getByOrderId(req.params.orderId);
    res.status(200).json(ApiResponse.success(payment, 'Payment retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// ── Shipments ───────────────────────────────────────────────────────────────

const getShipmentByOrderId = async (req, res, next) => {
  try {
    const shipment = await shipmentService.getByOrderId(req.params.orderId);
    res.status(200).json(ApiResponse.success(shipment, 'Shipment retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const updateShipmentStatus = async (req, res, next) => {
  try {
    const status = req.body.status || req.query.status;
    const shipment = await shipmentService.updateStatus(req.params.shipmentId, status);
    res.status(200).json(ApiResponse.success(shipment, 'Shipment status updated'));
  } catch (error) {
    next(error);
  }
};

// ── Returns & Refunds ────────────────────────────────────────────────────────

const getReturnsByOrderId = async (req, res, next) => {
  try {
    const returns = await returnService.getReturnsByOrder(req.params.orderId);
    res.status(200).json(ApiResponse.success(returns, 'Returns retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getReturnById = async (req, res, next) => {
  try {
    const ret = await returnService.getReturnById(req.params.returnId);
    res.status(200).json(ApiResponse.success(ret, 'Return retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createReturn = async (req, res, next) => {
  try {
    const ret = await returnService.createReturn(req.params.orderId, {
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(ApiResponse.success(ret, 'Return created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateReturnStatus = async (req, res, next) => {
  try {
    const status = req.body.status || req.query.status;
    const ret = await returnService.updateReturnStatus(req.params.returnId, status);
    res.status(200).json(ApiResponse.success(ret, 'Return status updated'));
  } catch (error) {
    next(error);
  }
};

const getRefunds = async (req, res, next) => {
  try {
    const refunds = await returnService.getRefundsByReturn(req.params.returnId);
    res.status(200).json(ApiResponse.success(refunds, 'Refunds retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const processRefund = async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount ?? req.query.amount);
    const refund = await returnService.processRefund(req.params.returnId, amount);
    res.status(201).json(ApiResponse.success(refund, 'Refund processed successfully'));
  } catch (error) {
    next(error);
  }
};

const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json(ApiResponse.error('Coupon code is required'));
    }
    const coupon = await couponService.getCouponByCode(code);
    if (!coupon.isActive) {
      return res.status(400).json(ApiResponse.error('This coupon is inactive'));
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return res.status(400).json(ApiResponse.error('This coupon is not yet valid'));
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return res.status(400).json(ApiResponse.error('This coupon has expired'));
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json(ApiResponse.error('This coupon has reached its usage limit'));
    }
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return res.status(400).json(ApiResponse.error(`Minimum order amount for this coupon is ${coupon.minOrderAmount}`));
    }
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === 'FREE_SHIPPING') {
      discountAmount = 0; // Shipping discount is handled on the frontend and checkout calculations
    } else {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;
    res.status(200).json(ApiResponse.success({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      description: coupon.description,
    }, 'Coupon is valid'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  getOrders,
  getAllOrders,
  getOrder,
  checkout,
  updateOrderStatus,
  validateCoupon,
  getPaymentByOrderId,
  getShipmentByOrderId,
  updateShipmentStatus,
  getReturnsByOrderId,
  getReturnById,
  createReturn,
  updateReturnStatus,
  getRefunds,
  processRefund,
};
