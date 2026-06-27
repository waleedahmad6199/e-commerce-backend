/**
 * FILE: src/models/Payment.js
 * ----------------------------
 * PURPOSE:
 *   Mongoose schema for the `payments` collection.
 *   One payment record is created per order at checkout time (status: PENDING).
 *   The status is updated to COMPLETED or FAILED by the PayFast ITN webhook handler
 *   in src/routes/paymentRoutes.js.
 *
 * RELATIONSHIP TO ORDER:
 *   - Payment is a sibling of Order (not embedded) because:
 *     - Payment has its own lifecycle (pending → completed → refunded)
 *     - It may be updated independently of the order (by the payment gateway webhook)
 *   - orderId links Payment back to its Order document
 *
 * USED BY:
 *   - src/services/OrderService.js   (creates Payment on checkout)
 *   - src/services/PaymentService.js (reads Payment by orderId)
 *   - src/routes/paymentRoutes.js    (updates status on PayFast ITN)
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type:     String,
    required: true,
    index:    true, // Fast lookup of payment by orderId
  },
  userId: {
    type:     String,
    required: true,
    index:    true, // Fast lookup of all payments by user
  },

  provider: { type: String, default: 'PAYFAST' }, // Payment gateway used (PAYFAST, STUB, etc.)
  amount:   { type: Number, required: true },      // Amount charged in the order's currency
  currency: { type: String, default: 'USD' },      // ISO 4217 currency code

  status: {
    type:    String,
    enum:    ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
    default: 'PENDING', // Set to COMPLETED by the PayFast ITN webhook on success
  },

  transactionRef: String, // Gateway transaction ID (from PayFast ITN pf_payment_id)
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
