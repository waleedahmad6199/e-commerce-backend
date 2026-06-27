/**
 * FILE: src/services/AuthService.js
 * ----------------------------------
 * PURPOSE:
 *   Handles all authentication business logic for both customers and admins.
 *   Responsible for: registration, login, JWT generation, password reset,
 *   admin session tracking, and session validation.
 *
 * SECURITY PRACTICES IMPLEMENTED:
 *   - Passwords are hashed with bcrypt (10 salt rounds) before storage.
 *   - JWTs are signed with the JWT_SECRET from config using HS256 algorithm.
 *   - The 'sub' (subject) claim holds the MongoDB ObjectId string of the user.
 *   - Admin accounts lock after 5 consecutive failed login attempts (30 min lockout).
 *   - forgotPassword() always returns the same response to prevent email enumeration.
 *   - Password reset tokens are UUID v4 (cryptographically random), expire in 1 hour,
 *     and are single-use (usedAt is set after consumption).
 *   - Admin sessions are tracked in the AdminSession collection for revocation.
 *
 * DEPENDENCIES:
 *   - models/User.js
 *   - models/AdminUser.js
 *   - models/AdminSession.js
 *   - models/PasswordResetToken.js
 *   - bcryptjs
 *   - jsonwebtoken
 *   - ../config (jwtSecret, jwtExpirationMs, adminJwtExpirationMs, nodeEnv)
 *   - ../utils/ApiError.js
 *   - ../utils/helpers.js (generateUUID)
 *
 * USED BY:
 *   - src/controllers/AuthController.js
 */

const User                = require('../models/User');               // Customer accounts
const AdminUser           = require('../models/AdminUser');           // Admin accounts
const AdminSession        = require('../models/AdminSession');        // Admin session tracking
const PasswordResetToken  = require('../models/PasswordResetToken'); // Password reset tokens
const bcrypt              = require('bcryptjs');                      // Password hashing library
const jwt                 = require('jsonwebtoken');                  // JWT creation and verification
const config              = require('../config');                     // App configuration
const ApiError            = require('../utils/ApiError');             // Custom error class
const { generateUUID }    = require('../utils/helpers');              // UUID v4 generator

class AuthService {

  // ── Customer Registration ───────────────────────────────────────────────

  /**
   * register()
   * Creates a new customer account, hashes their password, and returns a JWT.
   *
   * @param {object} data - { email, password, firstName, lastName, phone }
   * @returns {{ token: string, user: object }} JWT and sanitised user object
   */
  async register(data) {
    const { email, password, firstName, lastName, phone } = data;

    // Check if this email is already registered — throw 400 if so
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ApiError(400, 'Email already in use');
    }

    // Hash the password with bcrypt using 10 salt rounds (strong but not too slow)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user document in MongoDB
    const user = await User.create({
      email: email.toLowerCase(), // Ensure consistent lowercase storage
      passwordHash,               // Store the hash, NEVER the plain password
      firstName,
      lastName,
      phone,
      role: 'CUSTOMER', // All self-registered users are customers
    });

    // Generate a JWT for immediate login after registration
    const token = this._generateUserToken(user);
    return { token, user: this._toUserDTO(user) }; // Return token + sanitised user (no passwordHash)
  }

  // ── Customer Login ──────────────────────────────────────────────────────

  /**
   * login()
   * Verifies customer credentials and returns a JWT on success.
   *
   * @param {object} data - { email, password }
   * @returns {{ token: string, user: object }}
   */
  async login(data) {
    const { email, password } = data;

    // Look up the user by email — use generic error to prevent email enumeration
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password'); // Generic message
    }

    // bcrypt.compare() computes the hash of `password` and compares with stored hash
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid email or password'); // Same generic message
    }

    // Update last login timestamp for admin display
    user.lastLoginAt = new Date();
    await user.save();

    const token = this._generateUserToken(user); // Sign and return a new JWT
    return { token, user: this._toUserDTO(user) };
  }

  // ── Get Current User ────────────────────────────────────────────────────

  /**
   * getMe()
   * Retrieves the current authenticated user's profile by their ID (from JWT).
   *
   * @param {string} userId - MongoDB ObjectId string (from req.user.id)
   * @returns {object} Sanitised user DTO
   */
  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    return this._toUserDTO(user);
  }

  // ── Forgot Password ─────────────────────────────────────────────────────

  /**
   * forgotPassword()
   * Generates a password reset token and logs it (email sending not implemented here).
   * Always returns silently — never reveals whether the email exists (enumeration prevention).
   *
   * @param {string} email - The email address to send the reset link to
   */
  async forgotPassword(email) {
    if (!email) return; // Silently ignore missing email

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return; // Silently ignore unknown emails — do NOT throw

    // Invalidate any existing unused reset tokens for this user before creating a new one
    await PasswordResetToken.updateMany(
      { userId: user._id.toString(), type: 'USER', usedAt: null },
      { usedAt: new Date() } // Mark existing tokens as used
    );

    const token = generateUUID(); // Cryptographically random UUID v4

    // Create the token document — expires in 1 hour
    await PasswordResetToken.create({
      userId:    user._id.toString(),
      token,
      type:      'USER',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    });

    // In production: send an email with a link like /reset-password?token=<uuid>
    // For now, log it so local development can test the flow without email setup
    if (config.nodeEnv === 'development') {
      console.log(`[AUTH] Password reset token for ${email}: ${token}`);
      console.log(`[AUTH] Reset link: http://localhost:3000/reset-password?token=${token}`);
    }

    return token; // Returned only for internal use (testing). NOT exposed in API response.
  }

  // ── Reset Password ──────────────────────────────────────────────────────

  /**
   * resetPassword()
   * Validates a reset token and updates the user's password.
   * Consumes the token so it cannot be reused.
   *
   * @param {string} token       - The UUID reset token from the email link
   * @param {string} newPassword - The new password (plain text — will be hashed)
   */
  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw new ApiError(400, 'Token and new password are required');
    }
    if (newPassword.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }

    // Find a matching token that hasn't been used yet and hasn't expired
    const resetToken = await PasswordResetToken.findOne({
      token,
      type:      'USER',
      usedAt:    null,                       // Not yet consumed
      expiresAt: { $gt: new Date() },        // Not yet expired
    });

    if (!resetToken) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    const user = await User.findById(resetToken.userId);
    if (!user) throw new ApiError(404, 'User not found');

    // Hash the new password and save it
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Consume the token — mark it as used so it cannot be reused
    resetToken.usedAt = new Date();
    await resetToken.save();
  }

  // ── Admin Login ─────────────────────────────────────────────────────────

  /**
   * adminLogin()
   * Authenticates an admin user with lockout protection and session tracking.
   *
   * @param {object} data      - { email, password }
   * @param {string} ipAddress - Client IP (from req.ip)
   * @param {string} userAgent - Browser user-agent (from req.headers['user-agent'])
   * @returns {object} Admin details + JWT token
   */
  async adminLogin(data, ipAddress, userAgent) {
    const { email, password } = data;

    // Find the admin account — generic error prevents email enumeration
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Reject deactivated accounts entirely
    if (!admin.isActive) {
      throw new ApiError(403, 'Account is deactivated');
    }

    // Check lockout — but allow login if lockout period has expired
    if (admin.isLocked) {
      if (admin.lockedUntil && admin.lockedUntil > new Date()) {
        throw new ApiError(423, 'Account is locked. Please try again later.');
      }
      // Lockout period has passed — automatically unlock
      admin.isLocked = false;
      admin.failedLoginAttempts = 0;
    }

    // Verify the password
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      admin.failedLoginAttempts += 1; // Increment failure counter

      // Lock account after 5 consecutive failures for 30 minutes
      if (admin.failedLoginAttempts >= 5) {
        admin.isLocked    = true;
        admin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await admin.save(); // Persist the updated failure count
      throw new ApiError(401, 'Invalid email or password');
    }

    // Successful login — reset failure counter and update login metadata
    admin.failedLoginAttempts = 0;
    admin.lastLoginAt  = new Date();
    admin.lastLoginIp  = ipAddress;
    await admin.save();

    // permissions array is embedded in the JWT for fast permission checks
    const permissions = admin.permissions || [];
    const token = this._generateAdminToken(admin, permissions);

    // Record the session in AdminSession collection for revocation on logout
    await AdminSession.create({
      adminUserId: admin._id.toString(),
      token,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + config.adminJwtExpirationMs),
    });

    return {
      id:                admin._id,
      email:             admin.email,
      firstName:         admin.firstName,
      lastName:          admin.lastName,
      role:              admin.roleName,  // Role name string for frontend display
      token,                               // The signed JWT to store client-side
      permissions,                         // Array of permission codes
      mustChangePassword: admin.mustChangePassword,
      isMfaEnabled:       admin.isMfaEnabled,
    };
  }

  // ── Admin Logout ────────────────────────────────────────────────────────

  /**
   * adminLogout()
   * Removes the admin session from the database, effectively revoking the JWT.
   *
   * @param {string} token - The JWT string from the Authorization header
   */
  async adminLogout(token) {
    await AdminSession.deleteOne({ token }); // Remove the session record
  }

  // ── Admin Session Validation ────────────────────────────────────────────

  /**
   * validateAdminSession()
   * Verifies a JWT and confirms the admin account is still active.
   * Used by the admin frontend on every page load to confirm the session is valid.
   *
   * @param {string} token - The JWT string from the Authorization header
   * @returns {object} Admin details if session is valid
   */
  async validateAdminSession(token) {
    try {
      // jwt.verify() throws if the token is expired or has an invalid signature
      const decoded = jwt.verify(token, config.jwtSecret);

      // Also confirm the admin account still exists and is active in the DB
      const admin = await AdminUser.findById(decoded.sub);
      if (!admin || !admin.isActive) throw new ApiError(401, 'Session invalid');

      return {
        id:          admin._id,
        email:       admin.email,
        firstName:   admin.firstName,
        lastName:    admin.lastName,
        roleName:    admin.roleName,
        isActive:    admin.isActive,
        isLocked:    admin.isLocked,
        lastLoginAt: admin.lastLoginAt,
        createdAt:   admin.createdAt,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err; // Re-throw our own errors
      throw new ApiError(401, 'Session expired'); // jwt.verify() threw — token invalid/expired
    }
  }

  // ── Private: JWT Generators ─────────────────────────────────────────────

  /**
   * Generates a JWT for a customer user.
   * Payload contains: sub (userId), email, role.
   */
  _generateUserToken(user) {
    return jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: Math.floor(config.jwtExpirationMs / 1000) } // expiresIn expects seconds
    );
  }

  /**
   * Generates a JWT for an admin user.
   * Payload contains: sub, email, role:'ADMIN', roleId, permissions[].
   */
  _generateAdminToken(admin, permissions) {
    return jwt.sign(
      {
        sub:         admin._id.toString(),
        email:       admin.email,
        role:        'ADMIN',
        roleId:      admin.roleId,
        permissions, // Embed permissions in token for fast middleware checks without DB query
      },
      config.jwtSecret,
      { expiresIn: Math.floor(config.adminJwtExpirationMs / 1000) }
    );
  }

  /**
   * Strips sensitive fields before returning a user to the API client.
   * passwordHash is NEVER included in API responses.
   */
  _toUserDTO(user) {
    return {
      id:              user._id,
      email:           user.email,
      firstName:       user.firstName,
      lastName:        user.lastName,
      phone:           user.phone,
      isEmailVerified: user.isEmailVerified,
      avatarUrl:       user.avatarUrl,
      role:            user.role,
      lastLoginAt:     user.lastLoginAt,
      createdAt:       user.createdAt,
      updatedAt:       user.updatedAt,
    };
  }
}

module.exports = new AuthService(); // Export singleton instance
