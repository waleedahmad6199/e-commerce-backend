/**
 * FILE: src/models/RegistrationVerification.js
 * ----------------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `registrationverifications` collection.
 *   Stores pending registrations awaiting email verification.
 *   When a user registers, their hashed password and profile data are stored
 *   here along with a 6-digit OTP code. The actual User document is only
 *   created after the OTP is verified.
 *
 * TTL AUTO-DELETION:
 *   The `expiresAt` field has `index: { expires: 0 }` — MongoDB's TTL index
 *   automatically deletes the document when the current time passes `expiresAt`.
 *   This means unverified registrations are automatically cleaned up after 10 minutes
 *   without any cron job or manual cleanup required.
 *
 * FLOW:
 *   1. POST /api/users/register → AuthService creates RegistrationVerification,
 *      sends OTP code via EmailService.sendVerificationEmail()
 *   2. POST /api/users/verify-email { code } → AuthService finds matching document,
 *      creates the User, deletes the RegistrationVerification, returns JWT
 *
 * USED BY:
 *   - src/services/AuthService.js (register, verifyEmail)
 */
const mongoose = require('mongoose');

const registrationVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  firstName: String,
  lastName: String,
  phone: String,
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Document will be automatically deleted at this date
  }
}, { timestamps: true });

module.exports = mongoose.model('RegistrationVerification', registrationVerificationSchema);
