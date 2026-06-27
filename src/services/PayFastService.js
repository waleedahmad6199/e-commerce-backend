/**
 * FILE: src/services/PayFastService.js
 * --------------------------------------
 * PURPOSE:
 *   Integration with PayFast Pakistan (payfast.pk) payment gateway.
 *   Handles the full payment lifecycle: token acquisition, payment initiation,
 *   transaction verification, and ITN (Instant Transaction Notification) webhook processing.
 *
 * FLOW:
 *   1. checkout() in OrderService creates an Order with status=PENDING.
 *   2. Frontend calls POST /api/orders/checkout → receives the order.
 *   3. Frontend calls PayFastService.getAccessToken() + initiatePayment() indirectly
 *      (or the frontend directly hits the PayFast-hosted checkout URL).
 *   4. User completes payment on PayFast's hosted page.
 *   5. PayFast POSTs to NOTIFY_URL → POST /api/payments/payfast/webhook.
 *   6. paymentRoutes.js calls PayFastService.processWebhook() to parse the payload.
 *   7. Order and Payment statuses are updated to CONFIRMED/COMPLETED.
 *
 * SANDBOX MODE (PAYFAST_SANDBOX=true, the default):
 *   - Real API calls are skipped entirely.
 *   - initiatePayment() returns a local simulation URL (/checkout/payment).
 *   - POST /api/payments/payfast/simulate-confirm lets the frontend confirm
 *     a sandbox order without a real PayFast callback.
 *
 * ENVIRONMENT VARIABLES:
 *   PAYFAST_MERCHANT_ID  : Your PayFast merchant ID
 *   PAYFAST_SECURED_KEY  : Your PayFast secured/secret key
 *   PAYFAST_API_URL      : PayFast API base URL
 *   PAYFAST_RETURN_URL   : Frontend URL after successful payment
 *   PAYFAST_CANCEL_URL   : Frontend URL after cancelled/failed payment
 *   PAYFAST_NOTIFY_URL   : Publicly accessible webhook URL for ITN
 *   PAYFAST_SANDBOX      : 'false' to enable live payments (default: sandbox)
 *   FRONTEND_URL         : Base URL of the Next.js frontend
 *
 * USED BY:
 *   - src/routes/paymentRoutes.js
 */
'use strict';
/*
 * PayFast Pakistan uses a two-step flow:
 *   1. POST /token  → exchange Merchant_ID + Secured_Key for an access_token
 *   2. POST /Transaction/PostTransaction → initiate payment, receive hosted payment URL
 *   3. PayFast POSTs to NOTIFY_URL (ITN) on completion
 *
 * In sandbox/dev mode (PAYFAST_SANDBOX=true), real API calls are skipped and
 * a local simulated payment URL is returned instead, so the full flow can be
 * tested without a live merchant account.
 */

const axios = require('axios');

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '10000001';
const SECURED_KEY = process.env.PAYFAST_SECURED_KEY || 'sandbox_secured_key_abc123xyz';
const API_URL = process.env.PAYFAST_API_URL || 'https://ipg1.apps.net.pk/Ecommerce/api';
const RETURN_URL = process.env.PAYFAST_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-success`;
const CANCEL_URL = process.env.PAYFAST_CANCEL_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-failure`;
const NOTIFY_URL = process.env.PAYFAST_NOTIFY_URL || `${process.env.UPLOAD_BASE_URL || `http://localhost:${process.env.PORT || 8080}`}/api/payments/payfast/webhook`;
const IS_SANDBOX = process.env.PAYFAST_SANDBOX !== 'false';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a Basic-Auth-like Base64 credential string.
 * PayFast Pakistan: Authorization header = Base64(merchant_id:secured_key)
 */
function buildAuthHeader() {
  const credentials = Buffer.from(`${MERCHANT_ID}:${SECURED_KEY}`).toString('base64');
  return `Basic ${credentials}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

class PayFastService {
  /**
   * Step 1 — Obtain a one-time access token from PayFast.
   * In sandbox mode this is skipped and a fake token is returned.
   */
  async getAccessToken() {
    if (IS_SANDBOX) {
      return 'sandbox_access_token_' + Date.now();
    }

    const response = await axios.post(
      `${API_URL}/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
      }),
      {
        headers: {
          Authorization: buildAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    if (!response.data || !response.data.access_token) {
      throw new Error('PayFast: failed to obtain access token');
    }

    return response.data.access_token;
  }

  /**
   * Step 2 — Initiate a payment with PayFast.
   * Returns { paymentUrl, transactionId } so the frontend can redirect the user.
   *
   * In sandbox mode returns a local simulation URL.
   */
  async initiatePayment(order, accessToken) {
    const transactionId = `PF-${order.orderNumber}-${Date.now()}`;

    if (IS_SANDBOX) {
      // Local simulation URL — handled by the frontend /checkout/payment page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const simulationUrl =
        `${frontendUrl}/checkout/payment` +
        `?orderId=${order._id || order.id}` +
        `&orderNumber=${encodeURIComponent(order.orderNumber)}` +
        `&amount=${order.grandTotal}` +
        `&transactionId=${transactionId}`;

      return { paymentUrl: simulationUrl, transactionId };
    }

    const payload = {
      MERCHANT_ID,
      MERCHANT_NAME: 'ShopEase Store',
      TOKEN: accessToken,
      PROCCODE: '00',               // 00 = Purchase
      TXNAMT: order.grandTotal.toFixed(2),
      CUSTOMER_MOBILE_NO: order.userPhone || '',
      CUSTOMER_EMAIL_ADDRESS: order.userEmail || '',
      SIGNATURE: '',                // PayFast generates this on their end
      VERSION: 'MERCHANT-CART-0001',
      TXNDESC: `Order ${order.orderNumber}`,
      SUCCESS_URL: `${RETURN_URL}?orderId=${order._id || order.id}&orderNumber=${encodeURIComponent(order.orderNumber)}`,
      FAILURE_URL: `${CANCEL_URL}?orderId=${order._id || order.id}&orderNumber=${encodeURIComponent(order.orderNumber)}&failed=true`,
      BASKET_ID: order.orderNumber,
      ORDER_DATE: new Date().toISOString().split('T')[0],
      CHECKOUT_URL: NOTIFY_URL,
    };

    const response = await axios.post(
      `${API_URL}/Transaction/PostTransaction`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const data = response.data;

    if (!data || !data.SUCCESS || data.SUCCESS !== 'true') {
      const reason = data?.TRANSACTION_STATUS || data?.RESPONSE_MESSAGE || 'Unknown error';
      throw new Error(`PayFast payment initiation failed: ${reason}`);
    }

    return {
      paymentUrl: data.PAYMENT_URL || data.URL,
      transactionId: data.TRANSACTION_ID || transactionId,
    };
  }

  /**
   * Verify a transaction status — used to double-check ITN callbacks.
   * In sandbox mode always returns success.
   */
  async verifyTransaction(transactionId, accessToken) {
    if (IS_SANDBOX) {
      return { status: 'COMPLETED', transactionId };
    }

    const response = await axios.get(
      `${API_URL}/Transaction/GetTransaction?TRANSACTION_ID=${transactionId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      }
    );

    const data = response.data;
    const isCompleted =
      data?.TRANSACTION_STATUS === 'PAID' ||
      data?.TRANSACTION_STATUS === 'SUCCESS';

    return {
      status: isCompleted ? 'COMPLETED' : 'FAILED',
      transactionId,
      raw: data,
    };
  }

  /**
   * Process an ITN (Instant Transaction Notification) webhook payload from PayFast.
   * Returns { success, orderId, transactionId, amount }
   */
  processWebhook(body) {
    // PayFast sends BASKET_ID = our orderNumber
    const {
      BASKET_ID,
      TRANSACTION_ID,
      PAID_AMOUNT,
      TRANSACTION_STATUS,
      CUSTOMER_EMAIL_ADDRESS,
    } = body;

    const success =
      TRANSACTION_STATUS === 'PAID' || TRANSACTION_STATUS === 'SUCCESS';

    return {
      success,
      orderNumber: BASKET_ID,
      transactionId: TRANSACTION_ID,
      amount: parseFloat(PAID_AMOUNT || '0'),
      customerEmail: CUSTOMER_EMAIL_ADDRESS,
    };
  }
}

module.exports = new PayFastService();
