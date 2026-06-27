/**
 * FILE: src/models/Coupon.js
 * ---------------------------
 * PURPOSE:
 *   Mongoose schema for the `coupons` collection.
 *   Coupons allow customers to apply discount codes at checkout.
 *   Supports PERCENTAGE discounts (e.g. 20% off) and FIXED amount discounts (e.g. $10 off).
 *
 * BUSINESS RULES (enforced in OrderService and CouponService):
 *   - code is always stored uppercase (enforced by uppercase: true in schema)
 *   - usedCount increments each time a coupon is applied at checkout
 *   - isActive=false disables the coupon without deleting it (preserves history)
 *   - startsAt/expiresAt allow scheduling future promotions
 *   - minOrderAmount sets a minimum cart value for the coupon to apply
 *   - usageLimit caps total uses; usageLimitPerUser caps per-customer uses
 *
 * USED BY:
 *   - src/services/CouponService.js  (CRUD, validation)
 *   - src/controllers/AdminController.js
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type:      String,
    required:  true,
    unique:    true,    // Coupon codes must be globally unique
    uppercase: true,    // Always stored uppercase (e.g. "SAVE20")
  },
  description: String, // Admin-facing note about the coupon purpose

  discountType: {
    type:     String,
    required: true,
    enum:     ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'], // PERCENTAGE: 20% off; FIXED: $10 off; FREE_SHIPPING: free shipping
  },
  discountValue: { type: Number, required: true }, // 20 for 20%, or 10.00 for $10

  minOrderAmount:    Number, // Minimum cart subtotal for coupon to be valid
  maxDiscountAmount: Number, // Cap on discount amount (for PERCENTAGE type)

  usageLimit:        Number,                    // Max total times this coupon can be used (null = unlimited)
  usageLimitPerUser: { type: Number, default: 1 }, // Max uses per customer (default: 1)
  usedCount:         { type: Number, default: 0 }, // Running total of redemptions

  minQuantity:  { type: Number, default: 1 }, // Minimum cart item count required
  appliesTo:    { type: String, default: 'all' }, // 'all', 'category', 'product'
  appliesToIds: String, // Comma-separated IDs when appliesTo is 'category' or 'product'

  buyXQty: Number, // For buy-X-get-Y type coupons: how many items to buy
  getYQty: Number, // For buy-X-get-Y type coupons: how many items to get free

  isActive:  { type: Boolean, default: true }, // Quick enable/disable without deletion
  startsAt:  Date,  // Coupon becomes valid from this date (null = valid immediately)
  expiresAt: Date,  // Coupon expires at this date (null = never expires)
  createdBy: String, // ObjectId string of the admin who created this coupon
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
