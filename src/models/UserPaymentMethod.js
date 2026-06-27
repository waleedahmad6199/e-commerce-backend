/**
 * FILE: src/models/UserPaymentMethod.js
 * --------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `userpaymentmethods` collection.
 *   Stores saved payment method references for customer accounts.
 *   These are display records only — actual card numbers are never stored.
 *   Only the last four digits, card type, and expiry are kept for UI display.
 *
 * SECURITY NOTE:
 *   This schema stores NO sensitive card data. Full card numbers, CVVs, and
 *   billing addresses must never be stored here. In a real payment integration,
 *   the payment gateway (PayFast, Stripe, etc.) returns a reusable token which
 *   would be stored in a `gatewayToken` field — NOT the raw card number.
 *
 * DESIGN NOTE:
 *   Stored as a separate collection (not embedded in User) for the same
 *   reason as UserAddress — the list changes independently of the user profile,
 *   and entries may need to be individually deleted.
 *   UserService.setDefaultPaymentMethod() ensures exactly one isDefault=true
 *   per user at all times.
 *
 * USED BY:
 *   - src/services/UserService.js (getPaymentMethods, addPaymentMethod, etc.)
 *   - src/controllers/UserController.js
 */

const mongoose = require('mongoose');

const userPaymentMethodSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId, // Reference to User document
    ref:      'User',
    required: true,
    index:    true, // Indexed for fast user payment method lookup
  },

  type:             { type: String, required: true }, // E.g. 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL'
  provider:         String,                           // Card brand: 'Visa', 'Mastercard', 'Amex'
  lastFourDigits:   String,                           // Last 4 digits of card for display only
  expiryMonth:      String,                           // Expiry month (e.g. '12')
  expiryYear:       String,                           // Expiry year (e.g. '2027')
  cardholderName:   String,                           // Name as it appears on the card

  isDefault: { type: Boolean, default: false }, // True for the user's primary payment method
}, { timestamps: { createdAt: true, updatedAt: false } }); // Only createdAt needed

module.exports = mongoose.model('UserPaymentMethod', userPaymentMethodSchema);
