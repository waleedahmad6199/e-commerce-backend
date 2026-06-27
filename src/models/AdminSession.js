/**
 * FILE: src/models/AdminSession.js
 * ---------------------------------
 * PURPOSE:
 *   Mongoose schema for the `adminsessions` collection.
 *   Tracks active admin login sessions so tokens can be explicitly revoked
 *   on logout. One session document is created per login and deleted on logout.
 *
 * WHY SESSIONS FOR ADMINS BUT NOT CUSTOMERS?
 *   Admin accounts have higher-privilege access. Explicit session tracking allows:
 *   - Immediate token revocation on logout (JWT alone cannot be invalidated).
 *   - Visibility of active sessions in a future "Active Sessions" admin UI.
 *   - IP/user-agent logging for security audits.
 *
 * USED BY:
 *   - src/services/AuthService.js (creates on adminLogin, deletes on adminLogout)
 */

const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema({
  adminUserId: {
    type:     String,
    required: true,
    index:    true, // Fast lookup of all sessions for one admin user
  },
  token: {
    type:     String,
    required: true,
    unique:   true, // The JWT string — used as the lookup key on logout
  },

  refreshToken: String,                   // Optional refresh token (future use)
  ipAddress:    String,                   // Client IP address at login time
  userAgent:    String,                   // Browser user-agent string at login time

  expiresAt: {
    type:     Date,
    required: true, // When the JWT itself expires — for cleanup queries
  },
  lastActivityAt: Date,                   // Updated on activity (future use)

  isRevoked: { type: Boolean, default: false }, // Manual revocation flag (future use)
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('AdminSession', adminSessionSchema);
