/**
 * FILE: src/models/AuditLog.js
 * -----------------------------
 * PURPOSE:
 *   Mongoose schema for the `auditlogs` collection.
 *   Records every significant admin action for compliance, security auditing,
 *   and debugging. Each document captures who did what to which entity, when,
 *   from where, and whether it succeeded.
 *
 * WHEN LOGS ARE CREATED:
 *   AuditLogService.createLog() is called inside service methods after
 *   sensitive mutations (admin user create/update/delete, coupon create,
 *   order status change, etc.).
 *
 * RETENTION:
 *   These logs are append-only (no updates). For large deployments, add a
 *   TTL index or archive old documents to cold storage.
 *
 * USED BY:
 *   - src/services/AuditLogService.js  (create, paginated list)
 *   - src/controllers/AdminController.js
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminUserId: String,                    // ObjectId string of the admin who performed the action
  action:      { type: String, required: true }, // Verb (e.g. 'CREATE_PRODUCT', 'DELETE_USER')
  entityType:  { type: String, required: true }, // Collection name (e.g. 'Product', 'Order')
  entityId:    String,                    // ObjectId string of the affected document

  previousValues: mongoose.Schema.Types.Mixed, // Snapshot of the document before the change
  newValues:      mongoose.Schema.Types.Mixed, // Snapshot of the document after the change

  ipAddress:    String, // Client IP address for security tracing
  userAgent:    String, // Browser/client user-agent string

  status:       { type: String, default: 'success' }, // 'success' or 'failure'
  errorMessage: String, // Filled when status is 'failure'
}, { timestamps: { createdAt: true, updatedAt: false } }); // Only createdAt — logs never change

// ── Indexes ────────────────────────────────────────────────────────────────
auditLogSchema.index({ createdAt: -1 });    // Default sort: newest first in admin UI
auditLogSchema.index({ adminUserId: 1 });   // Filter by specific admin
auditLogSchema.index({ entityType: 1 });    // Filter by entity type

module.exports = mongoose.model('AuditLog', auditLogSchema);
