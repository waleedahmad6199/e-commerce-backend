/**
 * FILE: src/models/AdminUser.js
 * ------------------------------
 * PURPOSE:
 *   Mongoose schema for the `adminusers` collection.
 *   Admin accounts are completely separate from customer accounts (User model)
 *   for security isolation. An admin account has:
 *     - A role (linked to AdminRole for RBAC permissions)
 *     - An active/locked status with automatic lockout after 5 failed logins
 *     - Optional MFA (Multi-Factor Authentication) support
 *     - A permissions cache (copied from role at login time into the JWT)
 *
 * SECURITY FEATURES:
 *   - failedLoginAttempts increments on bad password in AuthService.adminLogin()
 *   - After 5 failures: isLocked=true and lockedUntil is set to 30 minutes from now
 *   - mustChangePassword flag forces a password change on first login
 *   - passwords are bcrypt-hashed by AdminUserService.createUser() and resetPassword()
 *
 * RELATIONSHIPS:
 *   - AdminUser → AdminRole  (via roleId string)
 *   - AdminUser → AdminSession (one-to-many for session tracking)
 *
 * USED BY:
 *   - src/services/AuthService.js       (login, session management)
 *   - src/services/AdminUserService.js  (CRUD, role assignment)
 */

const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  email: {
    type:      String,
    required:  true,
    unique:    true,  // No two admin accounts can share an email
    lowercase: true,  // Always lowercase for consistent login matching
  },
  passwordHash: { type: String, required: true }, // bcrypt hash — NEVER store plain text

  firstName: String, // Admin's first name for display in the admin panel
  lastName:  String, // Admin's last name

  roleId:   { type: String, required: true }, // ObjectId string of the AdminRole document
  roleName: String,                           // Denormalised role name for display without join

  isActive: { type: Boolean, default: true },  // Deactivated accounts cannot log in
  isLocked: { type: Boolean, default: false }, // Locked accounts are temporarily blocked

  isMfaEnabled: { type: Boolean, default: false }, // Whether TOTP MFA is active
  mfaSecret:    String,                            // TOTP secret (stored encrypted in production)

  failedLoginAttempts: { type: Number, default: 0 }, // Counter — resets on successful login
  lockedUntil: Date,                                 // Lockout expiry timestamp

  lastLoginAt:  Date,   // Timestamp of most recent successful login
  lastLoginIp:  String, // IP address of most recent successful login

  passwordChangedAt: { type: Date, default: Date.now }, // Tracks when password was last changed
  mustChangePassword: { type: Boolean, default: true }, // Forces password change on first login

  permissions: [String], // Cached permission codes from the role (stored in JWT at login)
  createdBy:   String,   // ObjectId string of the admin who created this account
}, { timestamps: true });

module.exports = mongoose.model('AdminUser', adminUserSchema);
