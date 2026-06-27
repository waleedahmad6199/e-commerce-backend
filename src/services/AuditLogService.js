/**
 * FILE: src/services/AuditLogService.js
 * ---------------------------------------
 * PURPOSE:
 *   Provides methods to create and retrieve admin action audit log entries.
 *   Used by admin controllers to record sensitive mutations (create/update/delete
 *   operations on admin users, coupons, products, orders, settings, etc.).
 *
 * USED BY:
 *   - src/controllers/AdminController.js
 *   - Any service that needs to record an admin action for compliance
 */
const AuditLog = require('../models/AuditLog'); // AuditLog Mongoose model

class AuditLogService {
  async getAuditLogs(pageable) {
    const { page = 0, size = 50 } = pageable;
    const skip = page * size;
    const [logs, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(size),
      AuditLog.countDocuments(),
    ]);
    return {
      content: logs,
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      first: page === 0,
      last: (page + 1) * size >= total,
    };
  }

  async createLog(data) {
    return AuditLog.create({
      adminUserId: data.adminUserId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      previousValues: data.previousValues,
      newValues: data.newValues,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: data.status || 'success',
      errorMessage: data.errorMessage,
    });
  }
}

module.exports = new AuditLogService();
