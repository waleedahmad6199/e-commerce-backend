/**
 * FILE: src/controllers/ReceiptController.js
 * --------------------------------------------
 * PURPOSE:
 *   HTTP handlers for receipt retrieval and PDF download.
 *   A receipt is created automatically when an order payment is confirmed.
 *   Customers can view and download their receipt from the order detail page.
 *
 * OWNERSHIP ENFORCEMENT:
 *   getReceiptByOrder() passes req.user.id to ReceiptService, which throws 403
 *   if the receipt's userId does not match (unless user is admin).
 *
 * USED BY:
 *   - src/routes/receiptRoutes.js (mounted at /api)
 */
const ApiResponse    = require('../utils/ApiResponse');      // Response envelope
const ReceiptService = require('../services/ReceiptService'); // Receipt retrieval + PDF generation

const getReceiptByOrder = async (req, res, next) => {
  try {
    const receipt = await ReceiptService.getReceiptByOrder(req.params.orderId, req.user?.id);
    if (!receipt) {
      return res.status(404).json(ApiResponse.error('Receipt not found for this order', 'NOT_FOUND'));
    }
    res.json(ApiResponse.success(receipt, 'Receipt retrieved'));
  } catch (error) {
    next(error);
  }
};

const getReceiptById = async (req, res, next) => {
  try {
    const receipt = await ReceiptService.getReceiptById(req.params.id);
    res.json(ApiResponse.success(receipt, 'Receipt retrieved'));
  } catch (error) {
    next(error);
  }
};

const getAllReceipts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 0;
    const size = parseInt(req.query.size, 10) || 20;
    const result = await ReceiptService.getAllReceipts(page, size);
    res.json(ApiResponse.success(result, 'Receipts retrieved'));
  } catch (error) {
    next(error);
  }
};

const downloadReceiptPdf = async (req, res, next) => {
  try {
    const receipt = await ReceiptService.getReceiptById(req.params.id);
    const pdfBuffer = await ReceiptService.generatePdf(receipt);

    const filename = `receipt-${receipt.receiptNumber || receipt.orderNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { getReceiptByOrder, getReceiptById, getAllReceipts, downloadReceiptPdf };
