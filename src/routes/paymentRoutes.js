/**
 * FILE: src/routes/paymentRoutes.js
 * ------------------------------------
 * PURPOSE:
 *   Defines HTTP routes for payment operations, specifically the PayFast
 *   payment gateway integration. Mounted at /api/payments in app.js.
 *
 * ROUTES:
 *   POST /api/payments/payfast/webhook          — PUBLIC PayFast ITN callback
 *   POST /api/payments/payfast/simulate-confirm — DEV-ONLY sandbox confirmation
 *   GET  /api/payments/payfast/status/:orderId  — check payment status (auth required)
 *
 * PAYFAST ITN WEBHOOK:
 *   PayFast calls POST /api/payments/payfast/webhook server-to-server after
 *   every payment attempt. This endpoint MUST be public (no auth) and MUST
 *   always return HTTP 200 — returning any other status causes PayFast to
 *   retry the notification indefinitely.
 *
 *   The webhook handler:
 *   1. Calls PayFastService.processWebhook() to parse the body.
 *   2. Finds the Order by orderNumber (BASKET_ID in the payload).
 *   3. On success: sets order.status=CONFIRMED, paymentStatus=COMPLETED.
 *   4. On failure: sets order.status=CANCELLED, paymentStatus=FAILED.
 *   5. Always returns 200.
 *
 * SANDBOX SIMULATION:
 *   In development (PAYFAST_SANDBOX=true), real ITN callbacks don't arrive
 *   because PayFast can't reach localhost. Use POST /simulate-confirm to
 *   manually trigger the same payment confirmation logic.
 *
 * DEPENDENCIES:
 *   - models/Order.js
 *   - models/Payment.js
 *   - services/PayFastService.js
 *   - utils/ApiResponse.js
 *   - utils/ApiError.js
 *   - middleware/auth.js
 */
'use strict';

const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const Payment = require('../models/Payment');
const payFastService = require('../services/PayFastService');
const ApiResponse    = require('../utils/ApiResponse');
const ApiError       = require('../utils/ApiError');
const { authenticateUser } = require('../middleware/auth');

// ── POST /api/payments/payfast/webhook ──────────────────────────────────────
// ITN (Instant Transaction Notification) callback from PayFast.
// PayFast POSTs here when a payment is completed or failed.
// This endpoint must be PUBLIC (no auth) — PayFast calls it server-to-server.
router.post('/payfast/webhook', async (req, res) => {
  try {
    const result = payFastService.processWebhook(req.body);

    if (!result.orderNumber) {
      return res.status(400).json({ message: 'Missing BASKET_ID in webhook payload' });
    }

    const order = await Order.findOne({ orderNumber: result.orderNumber });
    if (!order) {
      console.warn(`[PayFast ITN] Order not found: ${result.orderNumber}`);
      // Always return 200 to PayFast — otherwise it will keep retrying
      return res.status(200).json({ message: 'acknowledged' });
    }

    const payment = await Payment.findOne({ orderId: order._id.toString() });

    if (result.success) {
      order.status        = 'CONFIRMED';
      order.paymentStatus = 'COMPLETED';
      order.statusHistory.push({ status: 'CONFIRMED', changedAt: new Date(), note: 'Payment confirmed via PayFast ITN' });
      await order.save();

      if (payment) {
        payment.status         = 'COMPLETED';
        payment.transactionRef = result.transactionId;
        await payment.save();
      }

      console.log(`[PayFast ITN] Payment CONFIRMED for order ${result.orderNumber}`);
    } else {
      order.status        = 'CANCELLED';
      order.paymentStatus = 'FAILED';
      order.statusHistory.push({ status: 'CANCELLED', changedAt: new Date(), note: 'Payment failed via PayFast ITN' });
      await order.save();

      if (payment) {
        payment.status = 'FAILED';
        await payment.save();
      }

      console.warn(`[PayFast ITN] Payment FAILED for order ${result.orderNumber}`);
    }

    // PayFast expects a plain 200 OK
    res.status(200).json({ message: 'acknowledged' });
  } catch (err) {
    console.error('[PayFast ITN] Error:', err.message);
    // Still 200 — we don't want PayFast to retry indefinitely
    res.status(200).json({ message: 'acknowledged' });
  }
});

// ── POST /api/payments/payfast/simulate-confirm ─────────────────────────────
// DEV-ONLY endpoint: simulates a successful PayFast payment callback locally.
// Allows testing the full order flow without a public webhook URL.
router.post('/payfast/simulate-confirm', authenticateUser, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(403, 'This endpoint is only available in development mode');
    }

    const { orderId, transactionId } = req.body;
    if (!orderId) throw new ApiError(400, 'orderId is required');

    const order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');

    if (order.userId !== req.user.id) throw new ApiError(403, 'Access denied');

    order.status        = 'CONFIRMED';
    order.paymentStatus = 'COMPLETED';
    order.statusHistory.push({
      status: 'CONFIRMED',
      changedAt: new Date(),
      note: 'Payment confirmed via sandbox simulation',
    });
    await order.save();

    const payment = await Payment.findOne({ orderId: order._id.toString() });
    if (payment) {
      payment.status         = 'COMPLETED';
      payment.transactionRef = transactionId || `SIM-${Date.now()}`;
      await payment.save();
    }

    res.status(200).json(
      ApiResponse.success(
        {
          orderId:      order._id,
          orderNumber:  order.orderNumber,
          status:       order.status,
          paymentStatus: order.paymentStatus,
        },
        'Payment confirmed (sandbox simulation)'
      )
    );
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payments/payfast/status/:orderId ────────────────────────────────
// Check the payment status for a given order (user must own the order).
router.get('/payfast/status/:orderId', authenticateUser, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.userId !== req.user.id) throw new ApiError(403, 'Access denied');

    const payment = await Payment.findOne({ orderId: order._id.toString() });

    res.status(200).json(
      ApiResponse.success(
        {
          orderId:       order._id,
          orderNumber:   order.orderNumber,
          orderStatus:   order.status,
          paymentStatus: order.paymentStatus,
          transactionRef: payment?.transactionRef || null,
        },
        'Payment status retrieved'
      )
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
