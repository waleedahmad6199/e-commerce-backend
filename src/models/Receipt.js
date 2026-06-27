/**
 * FILE: src/models/Receipt.js
 * ----------------------------
 * PURPOSE:
 *   Mongoose schema for the `receipts` collection.
 *   A receipt is a permanent financial record created after a successful
 *   payment confirmation. It stores a snapshot of the order details at
 *   the time of payment, including store information from WebsiteSetting.
 *
 * RECEIPT NUMBERING:
 *   ReceiptService generates sequential numbers in the format:
 *   RCP-YYYYMM-000001 (e.g. RCP-202501-000042)
 *
 * PDF GENERATION:
 *   ReceiptService.generatePdf(receipt) renders the receipt as an A4
 *   PDF buffer using PDFKit. The customer can download it from:
 *   GET /api/orders/:orderId/receipt → /api/receipts/:id/download (future)
 *
 * USED BY:
 *   - src/services/ReceiptService.js
 *   - src/controllers/ReceiptController.js
 */
const mongoose = require("mongoose");

const receiptItemSchema = new mongoose.Schema(
  {
    productTitle: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
  },
  { _id: false },
);

const receiptSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    storeName: { type: String, default: "" },
    storeEmail: { type: String, default: "" },
    storePhone: { type: String, default: "" },
    storeAddress: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    items: [receiptItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    paymentMethod: { type: String, default: "" },
    paymentStatus: { type: String, default: "PENDING" },
    shippingAddress: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

receiptSchema.index({ createdAt: -1 });
receiptSchema.index({ orderId: 1 });

module.exports = mongoose.model("Receipt", receiptSchema);
