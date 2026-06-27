/**
 * FILE: src/models/Inquiry.js
 * ----------------------------
 * PURPOSE:
 *   Mongoose schema for the `inquiries` collection.
 *   Product/service inquiries submitted by visitors via the storefront.
 *   Admins manage inquiries in the admin panel (list, update status).
 *
 *   Lifecycle:  NEW → REVIEWED → RESPONDED → CLOSED
 *
 * USED BY:
 *   - src/services/InquiryService.js
 *   - src/controllers/InquiryController.js
 */
const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      default: "Pcs",
    },
    status: {
      type: String,
      enum: ["NEW", "REVIEWED", "RESPONDED", "CLOSED"],
      default: "NEW",
    },
  },
  {
    timestamps: true,
  },
);

const Inquiry = mongoose.model("Inquiry", inquirySchema);
module.exports = Inquiry;
