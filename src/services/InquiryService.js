/**
 * FILE: src/services/InquiryService.js
 * ---------------------------------------
 * PURPOSE:
 *   Business logic for product/service inquiries submitted by visitors.
 *   Inquiries are stored in MongoDB and managed by admins in the admin panel.
 *
 * USED BY:
 *   - src/controllers/InquiryController.js
 */
const Inquiry = require('../models/Inquiry');   // Inquiry Mongoose model
const ApiError = require('../utils/ApiError');

class InquiryService {
  async createInquiry(data) {
    const inquiry = new Inquiry(data);
    await inquiry.save();
    return inquiry;
  }

  async getAllInquiries(page = 0, size = 20) {
    const limit = Math.max(1, Math.min(size, 100));
    const skip = Math.max(0, page) * limit;

    const [inquiries, totalElements] = await Promise.all([
      Inquiry.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments()
    ]);

    return {
      content: inquiries,
      page,
      size: limit,
      totalElements,
      totalPages: Math.ceil(totalElements / limit)
    };
  }

  async updateInquiryStatus(id, status) {
    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!inquiry) throw new ApiError(404, 'Inquiry not found');
    return inquiry;
  }
}

module.exports = new InquiryService();
