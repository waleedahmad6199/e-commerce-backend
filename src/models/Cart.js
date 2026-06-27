/**
 * FILE: src/models/Cart.js
 * -------------------------
 * PURPOSE:
 *   Mongoose schema for the `carts` collection.
 *   Each logged-in user has exactly one cart document (enforced by the unique
 *   index on userId). Cart items are embedded because they are always read and
 *   written together with the cart — never queried independently.
 *
 * DESIGN DECISIONS:
 *   - One cart per user (userId unique index). CartService.getCart() creates
 *     the document on first access if it does not exist yet.
 *   - Items are embedded sub-documents so a single findOne() + save() handles
 *     all cart operations (add, update quantity, remove).
 *   - priceAtTime is captured when the item is added so the cart total remains
 *     consistent even if the product price changes before checkout.
 *   - variantSku and variantAttrs are stored as strings for display in the cart
 *     UI without a separate product lookup.
 *
 * USED BY:
 *   - src/services/CartService.js   (all cart CRUD operations)
 *   - src/services/OrderService.js  (reads cart during checkout, clears it after)
 */

const mongoose = require('mongoose'); // MongoDB ODM

// ── Cart Item Sub-Document ─────────────────────────────────────────────────
// Represents a single product (with optional variant) in the cart.
const cartItemSchema = new mongoose.Schema({
  id:           String,                          // UUID string — stable client-side key
  productId:    { type: String, required: true },// MongoDB ObjectId string of the Product
  variantId:    String,                          // UUID of the variant, null for base product
  quantity:     { type: Number, required: true, min: 1 }, // Must be at least 1 unit
  priceAtTime:  { type: Number, required: true },// Price per unit when item was added to cart
  productTitle: String,                          // Snapshot of product title for cart display
  productImage: String,                          // Snapshot of primary image URL for cart display
  variantSku:   String,                          // Snapshot of variant SKU for display
  variantAttrs: String,                          // Snapshot of variant attributes as a string
}, { _id: false }); // No separate _id — items identified by their id field or array index

// ── Cart Schema ────────────────────────────────────────────────────────────
const cartSchema = new mongoose.Schema({
  userId: {
    type:     String,
    required: true,
    unique:   true, // Enforces one cart per user at the database level
  },
  items: [cartItemSchema], // Embedded array of cart items
}, { timestamps: true }); // Adds createdAt + updatedAt

// ── Indexes ────────────────────────────────────────────────────────────────
cartSchema.index({ userId: 1 }, { unique: true }); // Fast user cart lookup + uniqueness enforcement

module.exports = mongoose.model('Cart', cartSchema);
