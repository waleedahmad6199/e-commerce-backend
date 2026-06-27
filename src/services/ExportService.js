/**
 * FILE: src/services/ExportService.js
 * -------------------------------------
 * PURPOSE:
 *   Generates downloadable data exports for admin users in XLSX or CSV format.
 *   Uses ExcelJS to build styled spreadsheets with column headers, alternating
 *   row colours, and borders.
 *
 * SUPPORTED EXPORTS:
 *   - exportProducts()  : all products with inventory, ratings, media, variant counts
 *   - exportCustomers() : all customer accounts (email, name, phone, verified status)
 *   - exportOrders()    : all orders with totals, status, shipping address
 *   - exportReviews()   : all reviews with product title, reviewer name, rating, status
 *
 * OUTPUT FORMAT:
 *   _buildWorkbook(columns, rows, format) returns: { buffer, contentType, ext }
 *   - format='xlsx' → Excel XLSX file (default)
 *   - format='csv'  → CSV file
 *   The buffer is sent directly to the browser via res.send() with the appropriate
 *   Content-Type and Content-Disposition headers in ExportController.
 *
 * STYLING:
 *   - Header row: white bold text on blue (#2563EB) background
 *   - Even data rows: white background
 *   - Odd data rows: light grey (#F8FAFC) background
 *   - All cells: thin border on all sides
 *
 * DEPENDENCIES:
 *   - exceljs        : Excel/CSV generation library
 *   - models/Product.js, User.js, Order.js, Review.js
 *
 * USED BY:
 *   - src/controllers/ExportController.js
 */
const ExcelJS = require('exceljs');          // Excel + CSV file generation
const Product = require('../models/Product'); // Products collection
const User    = require('../models/User');    // Customers collection
const Order   = require('../models/Order');   // Orders collection
const Review  = require('../models/Review'); // Reviews collection

class ExportService {
  async exportProducts(format = 'xlsx') {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .lean();

    const columns = [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Slug', key: 'slug', width: 40 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'Category', key: 'categoryName', width: 20 },
      { header: 'Base Price', key: 'basePrice', width: 14 },
      { header: 'Sale Price', key: 'salePrice', width: 14 },
      { header: 'Cost Price', key: 'costPrice', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Featured', key: 'featured', width: 10 },
      { header: 'View Count', key: 'viewCount', width: 12 },
      { header: 'Sold Count', key: 'soldCount', width: 12 },
      { header: 'Rating Avg', key: 'averageRating', width: 12 },
      { header: 'Rating Count', key: 'reviewCount', width: 12 },
      { header: 'Total Stock', key: 'totalStock', width: 12 },
      { header: 'Available Stock', key: 'available', width: 14 },
      { header: 'Variants', key: 'variantsCount', width: 12 },
      { header: 'Media Count', key: 'mediaCount', width: 12 },
      { header: 'Image URL', key: 'imageUrl', width: 60 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ];

    const rows = products.map(p => ({
      id: p._id.toString(),
      title: p.title,
      slug: p.slug || '',
      description: (p.description || '').replace(/<[^>]*>/g, ''),
      categoryName: p.categoryName || '',
      basePrice: p.basePrice ?? '',
      salePrice: p.salePrice ?? '',
      costPrice: p.costPrice ?? '',
      currency: p.currency || 'USD',
      status: p.status || 'DRAFT',
      featured: p.featured ? 'Yes' : 'No',
      viewCount: p.viewCount ?? 0,
      soldCount: p.soldCount ?? 0,
      averageRating: p.ratingSummary?.average ?? 0,
      reviewCount: p.ratingSummary?.count ?? 0,
      totalStock: p.inventory?.totalStock ?? 0,
      available: p.inventory?.available ?? 0,
      variantsCount: p.variants?.length ?? 0,
      mediaCount: p.media?.length ?? 0,
      imageUrl: (p.media && p.media.length > 0) ? p.media[0].url : '',
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : '',
    }));

    return this._buildWorkbook(columns, rows, format);
  }

  async exportCustomers(format = 'xlsx') {
    const users = await User.find({ role: 'CUSTOMER' })
      .sort({ createdAt: -1 })
      .lean();

    const columns = [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Email Verified', key: 'emailVerified', width: 14 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ];

    const rows = users.map(u => ({
      id: u._id.toString(),
      email: u.email || '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      phone: u.phone || '',
      emailVerified: u.emailVerified ? 'Yes' : 'No',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : '',
    }));

    return this._buildWorkbook(columns, rows, format);
  }

  async exportOrders(format = 'xlsx') {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean();

    const columns = [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Order Number', key: 'orderNumber', width: 22 },
      { header: 'User ID', key: 'userId', width: 28 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Tax', key: 'taxAmount', width: 12 },
      { header: 'Shipping Cost', key: 'shippingCost', width: 14 },
      { header: 'Discount', key: 'discountAmount', width: 12 },
      { header: 'Grand Total', key: 'grandTotal', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 },
      { header: 'Shipping Name', key: 'shippingName', width: 24 },
      { header: 'Shipping Address', key: 'shippingAddress', width: 50 },
      { header: 'Item Count', key: 'itemCount', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Updated At', key: 'updatedAt', width: 22 },
    ];

    const rows = orders.map(o => {
      const addr = o.shippingAddress || {};
      const addressStr = [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
        .filter(Boolean).join(', ');
      return {
        id: o._id.toString(),
        orderNumber: o.orderNumber || '',
        userId: o.userId || '',
        email: o.email || '',
        status: o.status || '',
        subtotal: o.subtotal ?? '',
        taxAmount: o.taxAmount ?? '',
        shippingCost: o.shippingCost ?? '',
        discountAmount: o.discountAmount ?? '',
        grandTotal: o.grandTotal ?? '',
        currency: o.currency || 'USD',
        paymentStatus: o.payment?.status || '',
        paymentMethod: o.payment?.method || '',
        shippingName: addr.fullName || '',
        shippingAddress: addressStr,
        itemCount: o.items?.length ?? 0,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : '',
        updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : '',
      };
    });

    return this._buildWorkbook(columns, rows, format);
  }

  async exportReviews(format = 'xlsx') {
    const reviews = await Review.find()
      .populate('productId', 'title')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const columns = [
      { header: 'ID', key: 'id', width: 28 },
      { header: 'Product ID', key: 'productId', width: 28 },
      { header: 'Product Title', key: 'productTitle', width: 40 },
      { header: 'User ID', key: 'userId', width: 28 },
      { header: 'User Name', key: 'userName', width: 30 },
      { header: 'User Email', key: 'userEmail', width: 35 },
      { header: 'Rating', key: 'rating', width: 8 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Comment', key: 'comment', width: 60 },
      { header: 'Verified Purchase', key: 'verifiedPurchase', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];

    const rows = reviews.map(r => ({
      id: r._id.toString(),
      productId: r.productId?._id?.toString() || r.productId?.toString() || '',
      productTitle: r.productId?.title || '',
      userId: r.userId?._id?.toString() || r.userId?.toString() || '',
      userName: r.userId ? `${r.userId.firstName || ''} ${r.userId.lastName || ''}`.trim() : '',
      userEmail: r.userId?.email || '',
      rating: r.rating ?? '',
      title: r.title || '',
      comment: (r.comment || '').replace(/<[^>]*>/g, ''),
      verifiedPurchase: r.verifiedPurchase ? 'Yes' : 'No',
      status: r.status || 'PENDING',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
    }));

    return this._buildWorkbook(columns, rows, format);
  }

  async _buildWorkbook(columns, rows, format) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    worksheet.columns = columns;

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const headerRow = worksheet.getRow(1);
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.style = headerStyle;
    });
    headerRow.commit();

    rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.addRow(row);
      const isEven = rowIndex % 2 === 0;
      excelRow.eachCell((cell) => {
        cell.style = {
          ...cell.style,
          alignment: { vertical: 'middle' },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
          fill: isEven
            ? undefined
            : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
        };
      });
      excelRow.commit();
    });

    if (format === 'csv') {
      const buffer = await workbook.csv.writeBuffer();
      return { buffer, contentType: 'text/csv', ext: 'csv' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
  }
}

module.exports = ExportService;
