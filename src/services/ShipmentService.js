/**
 * FILE: src/services/ShipmentService.js
 * ----------------------------------------
 * PURPOSE:
 *   Business logic for shipment retrieval and status management.
 *   Shipments are created externally (by the admin marking an order as shipped)
 *   and this service handles lookups and status transitions.
 *
 * LIFECYCLE:
 *   PENDING → SHIPPED (shippedAt is set) → DELIVERED (deliveredAt is set)
 *
 * USED BY:
 *   - src/controllers/OrderController.js
 */
const Shipment = require('../models/Shipment'); // Shipment Mongoose model
const ApiError = require('../utils/ApiError');  // Custom error class

class ShipmentService {
  async getByOrderId(orderId) {
    const shipment = await Shipment.findOne({ orderId });
    if (!shipment) throw new ApiError(404, 'Shipment not found for order');
    return this._toDTO(shipment);
  }

  async updateStatus(shipmentId, status) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new ApiError(404, 'Shipment not found');

    shipment.status = status;

    if (status === 'SHIPPED') {
      shipment.shippedAt = new Date();
    }

    if (status === 'DELIVERED') {
      shipment.deliveredAt = new Date();
    }

    await shipment.save();
    return this._toDTO(shipment);
  }

  _toDTO(shipment) {
    return {
      id: shipment._id,
      orderId: shipment.orderId,
      courier: shipment.courier,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      shippedAt: shipment.shippedAt,
      deliveredAt: shipment.deliveredAt,
      items: shipment.items || [],
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }
}

module.exports = new ShipmentService();
