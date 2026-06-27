/**
 * FILE: src/controllers/ExportController.js
 * -------------------------------------------
 * PURPOSE:
 *   HTTP handlers for data export endpoints.
 *   Generates downloadable XLSX or CSV files for admin users.
 *   All exports are admin-only (protected in the route file).
 *
 * QUERY PARAMETER:
 *   ?format=csv  — returns a CSV file
 *   ?format=xlsx — returns an Excel file (default)
 *
 * RESPONSE:
 *   Sets Content-Type and Content-Disposition headers, then sends the
 *   ExportService-generated buffer directly as a file download.
 *
 * USED BY:
 *   - Route file that mounts these handlers (admin export routes)
 */
const ApiResponse    = require('../utils/ApiResponse');  // Response envelope (for errors)
const ExportService  = require('../services/ExportService'); // Export generation logic

const exportService = new ExportService(); // Create instance (class not singleton)

const exportProducts = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const { buffer, contentType, ext } = await exportService.exportProducts(format);
    const filename = `products-export.${ext}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const exportCustomers = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const { buffer, contentType, ext } = await exportService.exportCustomers(format);
    const filename = `customers-export.${ext}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const exportOrders = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const { buffer, contentType, ext } = await exportService.exportOrders(format);
    const filename = `orders-export.${ext}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const exportReviews = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const { buffer, contentType, ext } = await exportService.exportReviews(format);
    const filename = `reviews-export.${ext}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { exportProducts, exportCustomers, exportOrders, exportReviews };
