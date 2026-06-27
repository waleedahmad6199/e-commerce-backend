/**
 * FILE: src/routes/receiptRoutes.js
 * ------------------------------------
 * PURPOSE:
 *   Defines the HTTP route for retrieving an order receipt.
 *   Mounted at /api in app.js (no additional prefix).
 *
 * ROUTES:
 *   GET /api/orders/:orderId/receipt — retrieve receipt data for an order
 *     Authentication required — user must own the order (or be admin).
 *     ReceiptController verifies userId ownership before returning the receipt.
 *     Returns the receipt document including all order items, totals,
 *     store information, and customer details.
 *
 * PDF DOWNLOAD:
 *   To download the receipt as a PDF, the frontend sends a GET request
 *   and the server streams the PDF buffer with Content-Type: application/pdf.
 *   The ReceiptService.generatePdf() method renders the A4 receipt using PDFKit.
 *
 * DEPENDENCIES:
 *   - controllers/ReceiptController.js
 *   - middleware/auth.js (authenticateUser)
 */

const express               = require('express');
const router                = express.Router();
const { getReceiptByOrder } = require('../controllers/ReceiptController'); // Receipt handler
const { authenticateUser }  = require('../middleware/auth');               // JWT guard

// GET /api/orders/:orderId/receipt — retrieve or generate a receipt for an order
router.get('/orders/:orderId/receipt', authenticateUser, getReceiptByOrder);

module.exports = router;
