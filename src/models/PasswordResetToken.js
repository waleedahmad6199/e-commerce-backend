/**
 * FILE: src/models/PasswordResetToken.js
 * ----------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `passwordresettokens` collection.
 *   Stores one-time tokens used in the forgot-password / reset-password flow.
 *   Tokens expire after 1 hour and are marked as used after a successful reset.
 *
 * RESET FLOW:
 *   1. POST /api/users/forgot-password { email }
 *      → AuthService.forgotPassword() creates a token document and sends the link.
 *   2. User clicks link: GET /reset-password?token=<uuid>
 *      → Frontend displays the reset form.
 *   3. POST /api/users/reset-password { token, newPassword }
 *      → AuthService.resetPassword() finds the token, validates expiry and usedAt=null,
 *        updates the user's passwordHash, and sets usedAt=now to consume the token.
 *
 * SECURITY:
 *   - Token is a UUID v4 (cryptographically random, not guessable).
 *   - Only tokens where usedAt=null AND expiresAt>now are valid.
 *   - Previously used tokens remain in the collection for audit purposes but
 *     cannot be reused because usedAt is set.
 *   - AuthService.forgotPassword() invalidates any existing unused tokens for the
 *     same user before creating a new one (prevents token accumulation).
 *
 * USED BY:
 *   - src/services/AuthService.js (forgotPassword, resetPassword)
 *   - src/services/AdminUserService.js (createPasswordResetToken, validatePasswordResetToken)
 */

const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type:     String,
    required: true, // ObjectId string of the User or AdminUser this token belongs to
  },
  token: {
    type:     String,
    required: true,
    unique:   true, // UUID v4 string — must be unique to prevent collisions
  },
  type: {
    type:    String,
    enum:    ['USER', 'ADMIN'], // Distinguish between customer and admin reset flows
    default: 'USER',
  },
  expiresAt: {
    type:     Date,
    required: true, // Set to Date.now + 1 hour — rejected if past this time
  },
  usedAt: Date, // Set when the token is consumed — null means token is still valid
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
