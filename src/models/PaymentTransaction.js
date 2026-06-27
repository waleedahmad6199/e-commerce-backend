/**
 * FILE: src/models/PaymentTransaction.js
 * ----------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `paymenttransactions` collection.
 *   Each document is an immutable audit record of a single gateway interaction —
 *   a snapshot of what the payment gateway returned for a given payment attempt.
 *   Used for debugging payment failures and chargebacks.
 *
 * USED BY:
 *   - Payment gateway webhook handlers (future — not yet actively written to)
 */
const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
  },
  gatewayResponse: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    required: true,
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
