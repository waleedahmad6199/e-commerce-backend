/**
 * FILE: src/services/ReceiptService.js
 * --------------------------------------
 * PURPOSE:
 *   Generates and stores order receipts as both database documents and
 *   downloadable PDF files. Called after a successful payment confirmation.
 *
 * HOW IT WORKS:
 *   1. generateReceipt(order) — creates a Receipt document from an Order.
 *      The receipt number is formatted as: RCP-YYYYMM-000001 (sequential).
 *      Store name, email, phone, and address are pulled from WebsiteSetting.
 *   2. generatePdf(receipt) — renders a styled A4 PDF using PDFKit.
 *      Returns a Buffer that can be sent as a file download response.
 *   3. getReceiptByOrder(orderId, userId) — looks up the receipt for an order.
 *      Throws 403 if the requesting userId doesn't own the receipt.
 *
 * DEPENDENCIES:
 *   - pdfkit               : PDF generation library
 *   - models/Receipt.js    : Receipt Mongoose model
 *   - models/WebsiteSetting.js : Store info for PDF header
 *   - utils/ApiError.js
 *
 * USED BY:
 *   - src/controllers/ReceiptController.js
 *   - src/routes/receiptRoutes.js (GET /api/orders/:orderId/receipt)
 */
const PDFDocument    = require('pdfkit');           // PDF generation
const Receipt = require('../models/Receipt');
const WebsiteSetting = require('../models/WebsiteSetting');
const ApiError = require('../utils/ApiError');

class ReceiptService {
  async generateReceipt(order) {
    const settings = await WebsiteSetting.find().lean();
    const settingMap = {};
    for (const s of settings) {
      settingMap[s.settingKey] = s.settingValue;
    }

    const count = await Receipt.countDocuments();
    const receiptNumber = `RCP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(6, '0')}`;

    const shippingAddr = order.shippingAddress || order.shippingAddressSnapshot || {};

    const receipt = await Receipt.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      receiptNumber,
      userId: order.userId,
      storeName: settingMap.site_name || 'Online Store',
      storeEmail: settingMap.contact_email || '',
      storePhone: settingMap.contact_phone || '',
      storeAddress: settingMap.company_address || '',
      customerName: shippingAddr.fullName || '',
      customerEmail: order.userEmail || '',
      items: (order.items || []).map(item => ({
        productTitle: item.productTitle || item.productName || 'Product',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      shippingCost: order.shippingCost,
      discountTotal: order.discountTotal,
      grandTotal: order.grandTotal,
      currency: 'USD',
      paymentStatus: order.paymentStatus || 'COMPLETED',
      shippingAddress: shippingAddr,
    });

    return receipt;
  }

  async getReceiptByOrder(orderId, userId) {
    let receipt = await Receipt.findOne({ orderId }).lean();
    if (!receipt) {
      const Order = require('../models/Order');
      const order = await Order.findById(orderId);
      if (!order) return null;
      if (userId && order.userId.toString() !== userId.toString()) throw new ApiError(403, 'Access denied');
      
      const newReceipt = await this.generateReceipt(order);
      receipt = newReceipt.toObject ? newReceipt.toObject() : newReceipt;
    }
    if (userId && receipt.userId.toString() !== userId.toString()) throw new ApiError(403, 'Access denied');
    return receipt;
  }

  async getReceiptById(receiptId) {
    const receipt = await Receipt.findById(receiptId).lean();
    if (!receipt) throw new ApiError(404, 'Receipt not found');
    return receipt;
  }

  async getAllReceipts(page = 0, size = 20) {
    const skip = page * size;
    const [receipts, total] = await Promise.all([
      Receipt.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(size)
        .lean(),
      Receipt.countDocuments(),
    ]);
    return { receipts, total, page, size };
  }

  async generatePdf(receipt) {
    if (!receipt) throw new ApiError(404, 'Receipt not found');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));

    const addPromise = new Promise((resolve) => doc.on('end', resolve));

    const pageWidth = doc.page.width - 100;
    const centerX = doc.page.width / 2;

    doc.fontSize(22).font('Helvetica-Bold').text(receipt.storeName || 'Online Store', { align: 'center' });
    doc.fontSize(9).font('Helvetica');
    if (receipt.storeAddress) doc.text(receipt.storeAddress, { align: 'center' });
    const contactParts = [receipt.storeEmail, receipt.storePhone].filter(Boolean);
    if (contactParts.length) doc.text(contactParts.join(' | '), { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).strokeColor('#2563EB').lineWidth(2).stroke();
    doc.moveDown(0.5);

    doc.fontSize(16).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(0.3);

    doc.moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).strokeColor('#CCCCCC').lineWidth(1).stroke();
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica');
    doc.text(`Receipt #: ${receipt.receiptNumber}`, { continued: true });
    doc.text(`Date: ${new Date(receipt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });
    doc.text(`Order #: ${receipt.orderNumber}`);
    doc.moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).strokeColor('#CCCCCC').lineWidth(1).stroke();
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const colX = { item: 50, qty: 340, price: 420, total: 490 };

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.roundedRect(colX.item - 4, tableTop - 4, pageWidth + 8, 18, 3).fill('#2563EB');
    doc.fillColor('#FFFFFF');
    doc.text('Item', colX.item, tableTop);
    doc.text('Qty', colX.qty, tableTop, { width: 60, align: 'center' });
    doc.text('Price', colX.price, tableTop, { width: 60, align: 'right' });
    doc.text('Total', colX.total, tableTop, { width: 60, align: 'right' });
    doc.fillColor('#000000');

    let yPos = tableTop + 22;

    for (const item of receipt.items || []) {
      doc.font('Helvetica').fontSize(9);
      doc.text(item.productTitle, colX.item, yPos, { width: colX.qty - colX.item - 10 });
      doc.text(String(item.quantity), colX.qty, yPos, { width: 60, align: 'center' });
      doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, colX.price, yPos, { width: 60, align: 'right' });
      doc.text(`$${(item.totalPrice || 0).toFixed(2)}`, colX.total, yPos, { width: 60, align: 'right' });

      yPos += 18;
    }

    doc.moveTo(50, yPos + 2).lineTo(pageWidth + 50, yPos + 2).strokeColor('#CCCCCC').lineWidth(1).stroke();
    yPos += 12;

    const totalsX = 370;
    doc.font('Helvetica').fontSize(9);
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(`$${(receipt.subtotal || 0).toFixed(2)}`, pageWidth + 50 - 60, yPos, { width: 60, align: 'right' });
    yPos += 14;

    if (receipt.taxAmount) {
      doc.text('Tax:', totalsX, yPos);
      doc.text(`$${(receipt.taxAmount || 0).toFixed(2)}`, pageWidth + 50 - 60, yPos, { width: 60, align: 'right' });
      yPos += 14;
    }

    if (receipt.shippingCost) {
      doc.text('Shipping:', totalsX, yPos);
      const shippingLabel = receipt.shippingCost === 0 ? 'FREE' : `$${(receipt.shippingCost || 0).toFixed(2)}`;
      doc.text(shippingLabel, pageWidth + 50 - 60, yPos, { width: 60, align: 'right' });
      yPos += 14;
    }

    if (receipt.discountTotal) {
      doc.text('Discount:', totalsX, yPos);
      doc.text(`-$${(receipt.discountTotal || 0).toFixed(2)}`, pageWidth + 50 - 60, yPos, { width: 60, align: 'right' });
      yPos += 14;
    }

    doc.moveTo(totalsX, yPos).lineTo(pageWidth + 50, yPos).strokeColor('#000000').lineWidth(1.5).stroke();
    yPos += 8;

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', totalsX, yPos);
    doc.text(`$${(receipt.grandTotal || 0).toFixed(2)}`, pageWidth + 50 - 60, yPos, { width: 60, align: 'right' });
    yPos += 24;

    doc.font('Helvetica').fontSize(9);
    doc.moveTo(50, yPos).lineTo(pageWidth + 50, yPos).strokeColor('#CCCCCC').lineWidth(1).stroke();
    yPos += 8;

    doc.font('Helvetica-Bold').fontSize(10).text('Payment', 50, yPos);
    yPos += 14;
    doc.font('Helvetica').fontSize(9);
    doc.text(`Method: ${receipt.paymentMethod || 'N/A'}`);
    doc.text(`Status: ${receipt.paymentStatus}`);
    yPos += 16;

    doc.moveTo(50, yPos).lineTo(pageWidth + 50, yPos).strokeColor('#CCCCCC').lineWidth(1).stroke();
    yPos += 8;

    const addr = receipt.shippingAddress || {};
    const addrLines = [addr.fullName, [addr.street, addr.city].filter(Boolean).join(', '), [addr.state, addr.zipCode, addr.country].filter(Boolean).join(', ')].filter(Boolean);

    doc.font('Helvetica-Bold').fontSize(10).text('Shipping Address', 50, yPos);
    yPos += 14;
    doc.font('Helvetica').fontSize(9);
    for (const line of addrLines) {
      doc.text(line, 50, yPos);
      yPos += 12;
    }

    yPos = Math.max(yPos + 20, doc.page.height - 80);

    doc.moveTo(50, yPos).lineTo(pageWidth + 50, yPos).strokeColor('#2563EB').lineWidth(2).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2563EB').text('Thank you for your purchase!', { align: 'center' });

    doc.end();
    await addPromise;

    return Buffer.concat(buffers);
  }
}

module.exports = new ReceiptService();
