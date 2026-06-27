/**
 * FILE: src/models/Refund.js
 * ---------------------------
 * PURPOSE:
 *   Mongoose schema for the `refunds` collection.
 *   A refund is created when an admin approves a return and processes the
 *   monetary reimbursement. Each refund is linked to a Return document.
 *
 * USED BY:
 *   - src/services/ReturnService.js (getRefundsByReturn, processRefund)
 *   - src/controllers/OrderController.js
 */

const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  returnId: {
    type:     String,
    required: true,
    index:    true, // Fast lookup of all refunds for a given return
  },

  amount:      { type: Number, required: true }, // Amount refunded to the customer
  status:      { type: String, default: 'PENDING' }, // PENDING → COMPLETED
  processedAt: Date, // Timestamp when the refund was issued
}, { timestamps: { createdAt: true, updatedAt: false } }); // Only createdAt needed for audit

module.exports = mongoose.model('Refund', refundSchema);
