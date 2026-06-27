/**
 * FILE: src/controllers/InquiryController.js
 * --------------------------------------------
 * PURPOSE:
 *   HTTP handlers for product inquiry submission and management.
 *   Public endpoint for submission; admin endpoints for viewing and updating status.
 *
 * USED BY:
 *   - src/routes/inquiryRoutes.js (mounted at /api/inquiries)
 */
const inquiryService = require('../services/InquiryService'); // Inquiry business logic
const ApiResponse    = require('../utils/ApiResponse');        // Response envelope

const createInquiry = async (req, res, next) => {
  try {
    const result = await inquiryService.createInquiry(req.body);
    res.status(201).json(ApiResponse.success(result, 'Inquiry sent successfully'));
  } catch (error) {
    next(error);
  }
};

const getAllInquiries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const result = await inquiryService.getAllInquiries(page, size);
    res.status(200).json(ApiResponse.success(result, 'Inquiries retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const updateInquiryStatus = async (req, res, next) => {
  try {
    const result = await inquiryService.updateInquiryStatus(req.params.id, req.body.status);
    res.status(200).json(ApiResponse.success(result, 'Inquiry updated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInquiry,
  getAllInquiries,
  updateInquiryStatus
};
