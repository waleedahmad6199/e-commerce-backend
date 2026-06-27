/**
 * FILE: src/models/Shipment.js
 * -----------------------------
 * PURPOSE:
 *   Mongoose schema for the `shipments` collection.
 *   One shipment record is created when an admin marks an order as shipped.
 *   It stores the courier name, tracking number, and status lifecycle timestamps.
 *
 * LIFECYCLE:
 *   PENDING → SHIPPED (shippedAt set) → DELIVERED (deliveredAt set)
 *
 * USED BY:
 *   - src/services/ShipmentService.js (getByOrderId, updateStatus)
 *   - src/controllers/OrderController.js
 */

const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  orderId: {
    type:  String,
    required: true,
    index: true, // Fast lookup of shipment for a given order
  },
  courier:        String, // Carrier name (e.g. "FedEx", "UPS", "DHL")
  trackingNumber: String, // Carrier tracking number for customer self-tracking

  status: { type: String, default: 'PENDING' }, // PENDING → SHIPPED → DELIVERED

  shippedAt:   Date, // Timestamp when status changed to SHIPPED
  deliveredAt: Date, // Timestamp when status changed to DELIVERED

  items: [{
    orderItemId: String, // References the order item id (uuid string) that is in this shipment
  }],
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
