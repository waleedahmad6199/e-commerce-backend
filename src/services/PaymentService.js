/**
 * FILE: src/services/PaymentService.js
 * --------------------------------------
 * PURPOSE:
 *   Read-only service for retrieving payment records.
 *   Payment records are created by OrderService.checkout() and updated
 *   by the PayFast ITN webhook handler in paymentRoutes.js.
 *   This service only exposes the read side for the order detail view.
 *
 * USED BY:
 *   - src/controllers/OrderController.js (getPaymentByOrderId)
 */
const Payment  = require('../models/Payment');  // Payment Mongoose model
const ApiError = require('../utils/ApiError'); // Custom error class

class PaymentService {
  async getByOrderId(orderId) {
    const payment = await Payment.findOne({ orderId });
    if (!payment) throw new ApiError(404, 'Payment not found for order');
    return {
      id: payment._id,
      orderId: payment.orderId,
      userId: payment.userId,
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionRef: payment.transactionRef,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

module.exports = new PaymentService();
