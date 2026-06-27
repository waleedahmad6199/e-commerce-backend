/**
 * FILE: src/services/ReturnService.js
 * -------------------------------------
 * PURPOSE:
 *   Business logic for return requests and refund processing.
 *   Customers submit returns via the storefront; admins approve/reject
 *   and process refunds. Each return can have multiple refund records.
 *
 * LIFECYCLE:
 *   Return:  REQUESTED → APPROVED → RECEIVED → REFUNDED (or REJECTED)
 *   Refund:  Created with status COMPLETED when processRefund() is called.
 *            processRefund() also sets the Return status to REFUNDED.
 *
 * USED BY:
 *   - src/controllers/OrderController.js
 */
const Return   = require('../models/Return');  // Return Mongoose model
const Refund   = require('../models/Refund');  // Refund Mongoose model
const ApiError = require('../utils/ApiError'); // Custom error class

class ReturnService {
  async getReturnsByOrder(orderId) {
    const returns = await Return.find({ orderId }).sort({ createdAt: -1 }).lean();
    return returns.map(r => this._toDTO(r));
  }

  async getReturnById(returnId) {
    const ret = await Return.findById(returnId);
    if (!ret) throw new ApiError(404, 'Return not found');
    return this._toDTO(ret);
  }

  async createReturn(orderId, data) {
    const ret = await Return.create({
      orderId,
      userId: data.userId,
      reason: data.reason,
      status: 'REQUESTED',
      items: data.items || [],
    });

    return this._toDTO(ret);
  }

  async updateReturnStatus(returnId, status) {
    const ret = await Return.findById(returnId);
    if (!ret) throw new ApiError(404, 'Return not found');

    ret.status = status;
    await ret.save();

    return this._toDTO(ret);
  }

  async getRefundsByReturn(returnId) {
    const refunds = await Refund.find({ returnId }).sort({ createdAt: -1 }).lean();
    return refunds.map(r => ({
      id: r._id,
      returnId: r.returnId,
      amount: r.amount,
      status: r.status,
      processedAt: r.processedAt,
      createdAt: r.createdAt,
    }));
  }

  async processRefund(returnId, amount) {
    const ret = await Return.findById(returnId);
    if (!ret) throw new ApiError(404, 'Return not found');

    const refund = await Refund.create({
      returnId,
      amount,
      status: 'COMPLETED',
      processedAt: new Date(),
    });

    ret.status = 'REFUNDED';
    await ret.save();

    return {
      id: refund._id,
      returnId: refund.returnId,
      amount: refund.amount,
      status: refund.status,
      processedAt: refund.processedAt,
      createdAt: refund.createdAt,
    };
  }

  _toDTO(ret) {
    return {
      id: ret._id,
      orderId: ret.orderId,
      userId: ret.userId,
      reason: ret.reason,
      status: ret.status,
      items: (ret.items || []).map(item => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      })),
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
    };
  }
}

module.exports = new ReturnService();
