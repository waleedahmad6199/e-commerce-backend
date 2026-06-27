/**
 * FILE: src/models/User.js
 * -------------------------
 * PURPOSE:
 *   Mongoose schema and model for the `users` collection.
 *   Stores customer account information. Admin accounts are stored
 *   separately in the `adminusers` collection for security isolation.
 *
 * SECURITY NOTES:
 *   - Passwords are NEVER stored in plain text. AuthService.register()
 *     hashes with bcrypt (salt rounds = 10) before saving to passwordHash.
 *   - The password field is named `passwordHash` intentionally so it is
 *     obvious at a glance that it contains a bcrypt hash, not a password.
 *   - passwordHash is NOT returned in API responses — controllers call
 *     AuthService._toUserDTO() which explicitly excludes it.
 *
 * RELATIONSHIPS:
 *   - One user → many UserAddress documents (userId reference)
 *   - One user → many UserPaymentMethod documents (userId reference)
 *   - One user → one Cart document (userId reference)
 *   - One user → many Order documents (userId string)
 *   - One user → many UserWishlist documents (userId reference)
 *
 * USED BY:
 *   - src/services/AuthService.js     (register, login, forgotPassword, resetPassword)
 *   - src/services/UserService.js     (CRUD, addresses, payment methods, wishlist)
 *   - src/services/DashboardService.js (customer counts)
 */

const mongoose = require('mongoose'); // MongoDB ODM

const userSchema = new mongoose.Schema({
  email: {
    type:     String,
    required: true,  // Every account must have an email
    unique:   true,  // No two accounts can share an email
    lowercase: true, // Always stored as lowercase for case-insensitive login
    trim:     true,  // Strip leading/trailing whitespace before saving
  },
  passwordHash: {
    type:     String,
    required: true,  // bcrypt hash of the user's password
  },
  firstName: {
    type: String,
    trim: true,      // Strip whitespace
  },
  lastName: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,      // Optional phone number for delivery notifications
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isEmailVerified: {
    type:    Boolean,
    default: false,  // Set to true after email verification flow
  },
  avatarUrl: String, // URL of profile picture (Cloudinary or local upload)
  role: {
    type:    String,
    enum:    ['CUSTOMER', 'ADMIN'], // Customers use this collection; admins use AdminUser
    default: 'CUSTOMER',            // All new registrations are customers
  },
  lastLoginAt: Date, // Timestamp of most recent successful login (for admin display)
}, { timestamps: true }); // Adds createdAt + updatedAt automatically

// ── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true }); // Unique email index for fast login lookup

module.exports = mongoose.model('User', userSchema); // Compile and export
