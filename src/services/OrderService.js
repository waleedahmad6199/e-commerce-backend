/**
 * FILE: src/services/OrderService.js
 * ------------------------------------
 * PURPOSE:
 *   Business logic for order creation, retrieval, and status management.
 *   The checkout() method orchestrates the full order creation process:
 *   reads the cart, calculates totals, creates the Order document,
 *   creates the Payment document, and clears the cart.
 *
 * PRICING LOGIC (in checkout):
 *   - subtotal     = sum of (priceAtTime × quantity) for all cart items
 *   - taxAmount    = subtotal × 8% (flat rate — replace with configurable tax in production)
 *   - shippingCost = $0 for orders >= $100, else $9.99 (flat rate)
 *   - grandTotal   = subtotal + taxAmount + shippingCost - discountTotal
 *
 * SNAPSHOT STRATEGY:
 *   Order items store productTitle, productImage, productSku etc. as snapshots
 *   so historical orders remain accurate even after product updates or deletions.
 *
 * DEPENDENCIES:
 *   - models/Order.js
 *   - models/Cart.js
 *   - models/Payment.js
 *   - utils/ApiError.js
 *   - utils/PagedResponse.js
 *   - utils/helpers.js (generateOrderNumber)
 *
 * USED BY:
 *   - src/controllers/OrderController.js
 */

const Order       = require('../models/Order');
const Cart        = require('../models/Cart');
const Payment     = require('../models/Payment');
const WebsiteSetting = require('../models/WebsiteSetting');
const ApiError    = require('../utils/ApiError');
const PagedResponse = require('../utils/PagedResponse');
const { generateOrderNumber } = require('../utils/helpers');

class OrderService {

  /**
   * getOrdersByUser()
   * Returns a paginated list of orders belonging to a specific user.
   * Used on the customer's order history page.
   */
  async getOrdersByUser(userId, page = 0, size = 20) {
    const skip = page * size; // Calculate how many documents to skip for pagination
    const [orders, total] = await Promise.all([
      Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
      Order.countDocuments({ userId }),
    ]);
    return PagedResponse.from(orders.map(o => this._toDTO(o)), total, page, size);
  }

  /**
   * getOrderById()
   * Retrieves a single order. If userId is provided (non-admin), verifies ownership.
   * Admins pass userId=null to bypass the ownership check.
   */
  async getOrderById(orderId, userId) {
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    // Ownership check — admins pass null to skip this
    if (userId && order.userId !== userId) throw new ApiError(403, 'Access denied');
    return this._toDTO(order);
  }

  /**
   * getAllOrders()
   * Returns a paginated list of ALL orders across all customers.
   * Admin-only endpoint.
   */
  async getAllOrders(page = 0, size = 20, sortStr = '-createdAt') {
    const skip = page * size;
    let sortObj = { createdAt: -1 };
    if (sortStr) {
      if (sortStr.startsWith('-')) sortObj = { [sortStr.substring(1)]: -1 };
      else sortObj = { [sortStr]: 1 };
    }
    const [orders, total] = await Promise.all([
      Order.find().sort(sortObj).skip(skip).limit(size).lean(),
      Order.countDocuments(),
    ]);
    return PagedResponse.from(orders.map(o => this._toDTO(o)), total, page, size);
  }

  /**
   * updateOrderStatus()
   * Changes the status of an order and appends to the status history log.
   * Admin-only operation.
   */
  async updateOrderStatus(orderId, status) {
    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status: ${status}`);
    }

    order.status = status; // Update the current status
    order.statusHistory.push({ status, changedAt: new Date() }); // Append to audit log
    await order.save();
    return this._toDTO(order);
  }

  /**
   * checkout()
   * The main checkout transaction. Steps:
   *   1. Load user's cart and validate it is non-empty.
   *   2. Calculate subtotal, tax, shipping, grandTotal.
   *   3. Create Order document with item snapshots.
   *   4. Create Payment document (initially PENDING).
   *   5. Clear the cart.
   *   6. Return the new order.
   *
   * userId is taken from data.userId which the controller sets from req.user.id
   * (IDOR prevention — never trust client-supplied userId).
   */
  async checkout(data) {
    const cart = await Cart.findOne({ userId: data.userId });
    if (!cart || !cart.items.length) throw new ApiError(400, 'Cart is empty');

    // Fetch settings for dynamic tax and shipping
    const settingKeys = ['tax_rate', 'shipping_cost', 'free_shipping_threshold'];
    if (data.currencyCode) {
      settingKeys.push(`tax_rate_${data.currencyCode}`);
    }
    const settings = await WebsiteSetting.find({ settingKey: { $in: settingKeys } });
    const settingsMap = settings.reduce((acc, s) => { acc[s.settingKey] = s.settingValue; return acc; }, {});
    
    let baseTaxRate = 8;
    if (data.currencyCode && settingsMap[`tax_rate_${data.currencyCode}`] !== undefined) {
      baseTaxRate = parseFloat(settingsMap[`tax_rate_${data.currencyCode}`]);
    } else if (settingsMap.tax_rate !== undefined) {
      baseTaxRate = parseFloat(settingsMap.tax_rate);
    }
    const taxRate = baseTaxRate / 100;
    const baseShipping = parseFloat(settingsMap.shipping_cost) || 9.99;
    const freeShippingThreshold = parseFloat(settingsMap.free_shipping_threshold) || 100;

    // Calculate financial totals
    const subtotal    = cart.items.reduce((sum, item) =>
      sum + (item.priceAtTime || 0) * (item.quantity || 0), 0);
    let discountTotal = 0;
    let appliedCouponType = null;
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : baseShipping;

    if (data.couponCode) {
      const Coupon = require('../models/Coupon');
      const coupon = await Coupon.findOne({ code: data.couponCode.toUpperCase() });
      const now = new Date();
      
      if (coupon && coupon.isActive) {
        appliedCouponType = coupon.discountType;
        if (coupon.startsAt && coupon.startsAt > now) {
          throw new ApiError(400, 'This coupon is not yet valid');
        }
        if (coupon.expiresAt && coupon.expiresAt < now) {
          throw new ApiError(400, 'This coupon has expired');
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          throw new ApiError(400, 'This coupon has reached its usage limit');
        }
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          throw new ApiError(400, `Minimum order amount for this coupon is ${coupon.minOrderAmount}`);
        }
        if (coupon.discountType === 'PERCENTAGE') {
          discountTotal = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            discountTotal = Math.min(discountTotal, coupon.maxDiscountAmount);
          }
        } else if (coupon.discountType === 'FREE_SHIPPING') {
          discountTotal = shippingCost;
        } else {
          discountTotal = Math.min(coupon.discountValue, subtotal);
        }
        discountTotal = Math.round(discountTotal * 100) / 100;
        
        // Increment usage count
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    // Calculate tax on the discounted subtotal (if applicable)
    let taxableAmount = subtotal;
    if (discountTotal > 0 && appliedCouponType !== 'FREE_SHIPPING') {
      taxableAmount = Math.max(0, subtotal - discountTotal);
    }
    
    const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;

    const grandTotal  = Math.round((subtotal + taxAmount + shippingCost - discountTotal) * 100) / 100;

    // Build the order items array from cart items as point-in-time snapshots
    const orderItems = cart.items.map(item => ({
      id:           item.id,
      productId:    item.productId,
      variantId:    item.variantId,
      quantity:     item.quantity,
      unitPrice:    item.priceAtTime,
      totalPrice:   (item.priceAtTime || 0) * (item.quantity || 0),
      productTitle: item.productTitle, // Snapshot — survives product rename
      productName:  item.productTitle,
      productImage: item.productImage, // Snapshot — survives product image change
      productSku:   null,
      variantSku:   item.variantSku,
      variantName:  null,
    }));

    // Create the Order document
    const order = await Order.create({
      orderNumber:             generateOrderNumber(), // e.g. 'ORD-1700000000000'
      userId:                  data.userId,
      status:                  'PENDING',             // Awaiting payment confirmation
      subtotal,
      taxAmount,
      shippingCost,
      discountTotal,
      grandTotal,
      shippingAddress:         data.shippingAddress || null,
      userEmail:               data.userEmail,
      userPhone:               data.userPhone,
      shippingAddressSnapshot: data.shippingAddress || null,
      notes:                   data.notes,
      items:                   orderItems,
      statusHistory:           [{ status: 'PENDING', changedAt: new Date() }],
    });

    // Create the associated Payment record (PENDING until gateway confirms)
    await Payment.create({
      orderId:  order._id.toString(),
      userId:   data.userId,
      provider: 'PAYFAST', // Payment gateway
      amount:   grandTotal,
      currency: 'USD',
      status:   'PENDING',
    });

    // Clear the cart — items are now captured in the order
    cart.items = [];
    await cart.save();

    return this._toDTO(order);
  }

  /**
   * _toDTO()
   * Maps a raw Order document to a clean API response object.
   */
  _toDTO(order) {
    return {
      id:                      order._id,
      orderNumber:             order.orderNumber,
      userId:                  order.userId,
      status:                  order.status,
      paymentStatus:           order.paymentStatus,
      fulfillmentStatus:       order.fulfillmentStatus,
      subtotal:                order.subtotal,
      taxAmount:               order.taxAmount,
      shippingCost:            order.shippingCost,
      discountTotal:           order.discountTotal,
      grandTotal:              order.grandTotal,
      shippingAddress:         order.shippingAddress,
      userEmail:               order.userEmail,
      userPhone:               order.userPhone,
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      notes:                   order.notes,
      items: (order.items || []).map(item => ({
        id:           item.id,
        productId:    item.productId,
        variantId:    item.variantId,
        quantity:     item.quantity,
        unitPrice:    item.unitPrice,
        totalPrice:   item.totalPrice,
        productTitle: item.productTitle,
        productName:  item.productName,
        productImage: item.productImage,
        productSku:   item.productSku,
        variantSku:   item.variantSku,
        variantName:  item.variantName,
      })),
      statusHistory: order.statusHistory || [],
      createdAt:     order.createdAt,
      updatedAt:     order.updatedAt,
    };
  }
}

module.exports = new OrderService();
