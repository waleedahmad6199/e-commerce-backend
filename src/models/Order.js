/**
 * FILE: src/models/Order.js
 * --------------------------
 * PURPOSE:
 *   Mongoose schema and model for the `orders` collection.
 *   An order is a completed purchase transaction. It embeds all item details
 *   as point-in-time snapshots so that historical orders remain accurate
 *   even if product prices, names, or images change after the order was placed.
 *
 * EMBEDDED SUB-DOCUMENTS:
 *   - items         : order line items with product snapshots
 *   - statusHistory : log of every status transition with timestamps
 *
 * KEY DESIGN DECISIONS:
 *   - Items are embedded (not referenced) because: the order must permanently
 *     record the exact product name, price, and image at purchase time.
 *     If we only stored productId, a deleted or updated product would break
 *     the order history display.
 *   - statusHistory is an append-only log embedded in the order document.
 *     This keeps all order state in one document query.
 *   - userId is stored as a string (not ObjectId ref) because: orders must
 *     survive user account deletion. The string is compared to req.user.id
 *     for access control in OrderService.getOrderById().
 *
 * STATUSES:
 *   Order:   PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → CANCELLED / REFUNDED
 *   Payment: PENDING → COMPLETED / FAILED / REFUNDED / PARTIALLY_REFUNDED
 *
 * INDEXES:
 *   - orderNumber: unique — human-readable order reference
 *   - userId: index — fast lookup of a user's order history
 *   - status: index — admin order list filtered by status
 *   - createdAt: descending — default sort for most-recent orders first
 *
 * USED BY:
 *   - src/services/OrderService.js
 *   - src/services/DashboardService.js
 *   - src/services/RecommendationService.js  (for frequently-bought-together)
 *   - src/routes/paymentRoutes.js            (PayFast webhook updates order)
 */

const mongoose = require('mongoose'); // MongoDB ODM

// ── Order Item Sub-Document ────────────────────────────────────────────────
// Stores a point-in-time snapshot of each purchased product line.
const orderItemSchema = new mongoose.Schema({
  id:           String,                          // UUID string — stable item identifier
  productId:    { type: String, required: true },// MongoDB ObjectId string of the product
  variantId:    String,                          // UUID of the specific variant purchased (if any)
  quantity:     { type: Number, required: true },// Number of units ordered
  unitPrice:    { type: Number, required: true },// Price per unit at time of purchase (snapshot)
  totalPrice:   { type: Number, required: true },// unitPrice × quantity
  productTitle: String,                          // Product name snapshot (survives product rename)
  productName:  String,                          // Alias for productTitle (backward compat)
  productImage: String,                          // Primary image URL snapshot
  productSku:   String,                          // Product-level SKU snapshot
  variantSku:   String,                          // Variant SKU snapshot
  variantName:  String,                          // Variant display name snapshot
}, { _id: false }); // No separate _id — these are embedded, not independently queryable

// ── Status History Sub-Document ────────────────────────────────────────────
// Append-only log of order status transitions for auditing and customer display.
const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true }, // The new status value
  note:      String,                           // Optional admin note (reason for change)
  changedAt: { type: Date, default: Date.now },// When the transition occurred
}, { _id: false }); // No separate _id

// ── Order Schema ───────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type:     String,
    required: true,
    unique:   true, // Human-readable reference (e.g. 'ORD-1700000000000')
  },
  userId: {
    type:     String,
    required: true,
    index:    true, // Indexed for fast user order history lookup
  },

  status: {
    type:    String,
    enum:    ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING', // New orders start as PENDING until payment is confirmed
  },
  paymentStatus: {
    type:    String,
    enum:    ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
    default: 'PENDING', // Updated by PayFast ITN webhook
  },
  fulfillmentStatus: {
    type:    String,
    default: 'UNFULFILLED', // Updated when shipment is created/delivered
  },

  subtotal:      { type: Number, required: true }, // Sum of all item prices before tax/shipping
  taxAmount:     { type: Number, default: 0 },     // Calculated tax (8% of subtotal)
  shippingCost:  { type: Number, default: 0 },     // Shipping fee (free for orders >= $100)
  discountTotal: { type: Number, default: 0 },     // Coupon/discount reduction
  grandTotal:    { type: Number, required: true }, // Final amount charged: subtotal + tax + shipping - discount

  shippingAddress:         mongoose.Schema.Types.Mixed, // Delivery address object snapshot
  userEmail:               String,                      // Customer email snapshot (for receipts)
  userPhone:               String,                      // Customer phone snapshot
  shippingAddressSnapshot: mongoose.Schema.Types.Mixed, // Duplicate snapshot (legacy compat)
  notes:                   String,                      // Customer order notes

  items:         [orderItemSchema],    // Embedded array of purchased items (snapshots)
  statusHistory: [statusHistorySchema],// Embedded append-only status change log
}, { timestamps: true }); // Adds createdAt + updatedAt automatically

// ── Indexes ────────────────────────────────────────────────────────────────
orderSchema.index({ orderNumber: 1 }, { unique: true }); // Unique order reference
orderSchema.index({ userId: 1 });                        // User order history lookup
orderSchema.index({ status: 1 });                        // Admin filter by status
orderSchema.index({ createdAt: -1 });                    // Default sort: newest first

module.exports = mongoose.model('Order', orderSchema); // Compile and export
