/**
 * FILE: src/models/AdminPermission.js
 * -------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `adminpermissions` collection.
 *   Defines every available permission code in the system. Permissions are seeded
 *   once by scripts/seed.js and rarely change after that.
 *
 * PERMISSION CODE FORMAT:
 *   "<module>.<action>"  e.g. "products.delete", "orders.manage-status"
 *
 * ALL PERMISSION CODES (seeded):
 *   dashboard.view, dashboard.export
 *   products.view, products.create, products.edit, products.delete, products.manage-inventory
 *   categories.view, categories.create, categories.edit, categories.delete
 *   orders.view, orders.create, orders.edit, orders.delete, orders.manage-status, orders.process-refund
 *   customers.view, customers.edit, customers.delete
 *   content.pages, content.banners, content.popups, content.announcements
 *   marketing.promotions, marketing.coupons, marketing.seo
 *   settings.general, settings.payment, settings.shipping, settings.email
 *   users.manage, roles.manage
 *   reports.view, reports.export
 *   reviews.moderate
 *
 * USED BY:
 *   - src/services/AdminUserService.js (getAllPermissions, getPermissionsByRole)
 *   - scripts/seed.js                 (creates all permission documents on first run)
 */

const mongoose = require('mongoose');

const adminPermissionSchema = new mongoose.Schema({
  code: {
    type:     String,
    required: true,
    unique:   true, // Each permission code must be globally unique
  },
  name:        { type: String, required: true }, // Display name (e.g. "Delete Products")
  module:      { type: String, required: true }, // Grouping label (e.g. "Products")
  description: String,                           // Optional longer description
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('AdminPermission', adminPermissionSchema);
