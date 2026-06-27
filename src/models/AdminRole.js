/**
 * FILE: src/models/AdminRole.js
 * ------------------------------
 * PURPOSE:
 *   Mongoose schema for the `adminroles` collection.
 *   Each role defines a named set of permissions that can be assigned to admin users.
 *   Roles with isSystem=true (e.g. SUPER_ADMIN, ADMIN) cannot be modified or deleted.
 *
 * RBAC FLOW:
 *   1. AdminPermission documents define all available permission codes.
 *   2. AdminRole stores an array of permission IDs (permissionIds).
 *   3. AdminUser is assigned a roleId.
 *   4. At login, AuthService reads the role's permissionIds and embeds the
 *      permission codes directly into the JWT payload.
 *   5. requirePermission() middleware checks the JWT's permissions array.
 *
 * USED BY:
 *   - src/services/AdminUserService.js (getAllRoles, createRole, updateRole, etc.)
 *   - src/services/AuthService.js      (reads permissions from role at login)
 */

const mongoose = require('mongoose');

const adminRoleSchema = new mongoose.Schema({
  name: {
    type:   String,
    required: true,
    unique: true, // E.g. 'SUPER_ADMIN', 'CATALOG_MANAGER', 'ORDER_MANAGER'
  },
  description:   String,                      // Human-readable description of the role's purpose
  isSystem:      { type: Boolean, default: false }, // true = cannot be modified or deleted
  permissionIds: [String],                    // Array of AdminPermission ObjectId strings
}, { timestamps: true });

module.exports = mongoose.model('AdminRole', adminRoleSchema);
