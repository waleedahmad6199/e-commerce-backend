/**
 * FILE: src/models/Return.js
 * ---------------------------
 * PURPOSE:
 *   Mongoose schema for the `returns` collection.
 *   A return is a customer request to send back one or more items from an order.
 *   Each return is associated with one order and tracks which items are being returned.
 *
 * LIFECYCLE:
 *   REQUESTED → APPROVED → RECEIVED → REFUNDED (or REJECTED)
 *
 * USED BY:
 *   - src/services/ReturnService.js (create, getByOrder, updateStatus)
 *   - src/controllers/OrderController.js
 */

const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  orderId: {
    type:     String,
    required: true,
    index:    true, // Fast lookup of all returns for a given order
  },
  userId: {
    type:     String,
    required: true,
    index:    true, // Fast lookup of all returns by a given user
  },

  reason: { type: String, required: true }, // Customer's reason for returning (e.g. "Wrong size")
  status: { type: String, default: 'REQUESTED' }, // Current lifecycle stage

  items: [{
    orderItemId: String,                      // References the order item UUID being returned
    quantity:    { type: Number, default: 1 }, // How many units of this item are being returned
  }],
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
