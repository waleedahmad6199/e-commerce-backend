/**
 * FILE: src/services/AdminUserService.js
 * ----------------------------------------
 * PURPOSE:
 *   Business logic for admin user management, role management, and permission management.
 *   Used exclusively by the admin panel backend.
 *
 * KEY OPERATIONS:
 *   - CRUD for AdminUser documents (with bcrypt password hashing on create/reset).
 *   - Soft-delete (sets isActive=false) rather than hard-delete to preserve audit trails.
 *   - Role CRUD (system roles like SUPER_ADMIN cannot be modified or deleted).
 *   - Permission listing and role-permission assignment.
 *   - Password reset token generation for admin accounts.
 *   - _toDTO() strips sensitive fields (passwordHash, mfaSecret) from responses.
 *
 * DEPENDENCIES:
 *   - models/AdminUser.js
 *   - models/AdminRole.js
 *   - models/AdminPermission.js
 *   - models/PasswordResetToken.js
 *   - bcryptjs
 *   - utils/ApiError.js
 *   - utils/helpers.js (generateUUID)
 *
 * USED BY:
 *   - src/controllers/AdminController.js
 */
const AdminUser          = require('../models/AdminUser');           // Admin accounts
const AdminRole          = require('../models/AdminRole');           // RBAC roles
const AdminPermission    = require('../models/AdminPermission');     // Permission codes
const PasswordResetToken = require('../models/PasswordResetToken'); // Reset tokens
const bcrypt             = require('bcryptjs');                      // Password hashing
const ApiError           = require('../utils/ApiError');             // Custom error class
const { generateUUID }   = require('../utils/helpers');              // UUID generator

class AdminUserService {
  async getAllUsers(pageable) {
    const { page = 0, size = 20 } = pageable;
    const skip = page * size;
    const [users, total] = await Promise.all([
      AdminUser.find().sort({ createdAt: -1 }).skip(skip).limit(size),
      AdminUser.countDocuments(),
    ]);
    const content = users.map(u => this._toDTO(u));
    return { content, page, size, totalElements: total, totalPages: Math.ceil(total / size), first: page === 0, last: (page + 1) * size >= total };
  }

  async getUserById(id) {
    const user = await AdminUser.findById(id);
    if (!user) throw new ApiError(404, 'Admin user not found');
    return this._toDTO(user);
  }

  async getUserByEmail(email) {
    return AdminUser.findOne({ email: email.toLowerCase() });
  }

  async createUser(data, adminId) {
    const existing = await AdminUser.findOne({ email: data.email.toLowerCase() });
    if (existing) throw new ApiError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const role = await AdminRole.findById(data.roleId);

    const user = await AdminUser.create({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      roleId: data.roleId,
      roleName: role ? role.name : 'Unknown',
      createdBy: adminId,
    });

    return this._toDTO(user);
  }

  async updateUser(id, data) {
    const user = await AdminUser.findById(id);
    if (!user) throw new ApiError(404, 'Admin user not found');

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.roleId !== undefined) {
      user.roleId = data.roleId;
      const role = await AdminRole.findById(data.roleId);
      user.roleName = role ? role.name : 'Unknown';
    }
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.isLocked !== undefined) user.isLocked = data.isLocked;

    await user.save();
    return this._toDTO(user);
  }

  async deleteUser(id) {
    const user = await AdminUser.findById(id);
    if (!user) throw new ApiError(404, 'Admin user not found');
    user.isActive = false;
    await user.save();
  }

  async resetPassword(id, password) {
    const user = await AdminUser.findById(id);
    if (!user) throw new ApiError(404, 'Admin user not found');
    user.passwordHash = await bcrypt.hash(password, 10);
    user.mustChangePassword = true;
    await user.save();
  }

  async createPasswordResetToken(userId) {
    const token = generateUUID();
    await PasswordResetToken.create({
      userId,
      token,
      type: 'ADMIN',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  async validatePasswordResetToken(token) {
    const resetToken = await PasswordResetToken.findOne({ token, usedAt: null, expiresAt: { $gt: new Date() } });
    if (!resetToken) throw new ApiError(400, 'Invalid or expired reset token');
    return resetToken;
  }

  async getAllRoles() {
    return AdminRole.find().sort({ name: 1 });
  }

  async getRoleById(id) {
    const role = await AdminRole.findById(id);
    if (!role) throw new ApiError(404, 'Role not found');
    return role;
  }

  async createRole(data) {
    const existing = await AdminRole.findOne({ name: data.name });
    if (existing) throw new ApiError(409, 'Role name already exists');
    return AdminRole.create(data);
  }

  async updateRole(id, data) {
    const role = await AdminRole.findById(id);
    if (!role) throw new ApiError(404, 'Role not found');
    if (role.isSystem) throw new ApiError(400, 'Cannot modify system role');
    if (data.name !== undefined) role.name = data.name;
    if (data.description !== undefined) role.description = data.description;
    if (data.permissionIds !== undefined) role.permissionIds = data.permissionIds;
    await role.save();
    return role;
  }

  async deleteRole(id) {
    const role = await AdminRole.findById(id);
    if (!role) throw new ApiError(404, 'Role not found');
    if (role.isSystem) throw new ApiError(400, 'Cannot delete system role');
    await AdminRole.deleteOne({ _id: id });
  }

  async getAllPermissions() {
    return AdminPermission.find().sort({ module: 1, code: 1 });
  }

  async getPermissionsByRole(roleId) {
    const role = await AdminRole.findById(roleId);
    if (!role) throw new ApiError(404, 'Role not found');
    const permissionIds = role.permissionIds || [];
    return AdminPermission.find({ _id: { $in: permissionIds } });
  }

  async updateRolePermissions(roleId, permissionIds) {
    const role = await AdminRole.findById(roleId);
    if (!role) throw new ApiError(404, 'Role not found');
    role.permissionIds = permissionIds || [];
    await role.save();
  }

  _toDTO(user) {
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleName: user.roleName,
      roleId: user.roleId,
      isActive: user.isActive,
      isLocked: user.isLocked,
      isMfaEnabled: user.isMfaEnabled,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
    };
  }
}

module.exports = new AdminUserService();
