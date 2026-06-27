/**
 * FILE: src/services/GoogleAuthService.js
 * -----------------------------------------
 * PURPOSE:
 *   Handles Google OAuth Sign-In by verifying a Google ID token and
 *   finding or creating a matching User account. Returns a JWT on success.
 *
 * FLOW:
 *   1. Frontend obtains a Google ID token via the Google Sign-In SDK.
 *   2. Frontend sends the token to POST /api/users/auth/google.
 *   3. GoogleAuthService.loginWithGoogle(idToken) verifies the token
 *      by calling Google's public tokeninfo endpoint (no private key needed).
 *   4. If the email already exists in the User collection → log in.
 *      If not → create a new user account (isEmailVerified=true, no password needed).
 *   5. Returns { token, user } exactly like the normal login flow.
 *
 * CONFIGURATION:
 *   GOOGLE_CLIENT_ID env var — your Google OAuth 2.0 client ID.
 *   If not set (or set to the placeholder), token audience validation is skipped.
 *   Set this in production to prevent token confusion attacks.
 *
 * DEPENDENCIES:
 *   - models/User.js
 *   - bcryptjs     (generates a random password for Google-only accounts)
 *   - jsonwebtoken (signs the JWT after successful auth)
 *   - ../config    (jwtSecret, jwtExpirationMs)
 *   - utils/ApiError.js
 *
 * USED BY:
 *   - src/controllers/AuthController.js (googleLogin handler)
 */
const User     = require('../models/User');   // Customer accounts
const bcrypt   = require('bcryptjs');          // Random password hashing for Google accounts
const jwt      = require('jsonwebtoken');      // JWT signing
const config   = require('../config');         // App config
const ApiError = require('../utils/ApiError'); // Custom error class

class GoogleAuthService {
  /**
   * Verify a Google ID token by calling Google's tokeninfo endpoint.
   * Returns the decoded payload.
   */
  async verifyIdToken(idToken) {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new ApiError(401, 'Invalid Google token');
    }

    const payload = await response.json();

    // Validate the audience matches our client ID
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && clientId !== 'your-google-client-id.apps.googleusercontent.com') {
      if (payload.aud !== clientId) {
        throw new ApiError(401, 'Google token audience mismatch');
      }
    }

    if (!payload.email) {
      throw new ApiError(401, 'Google token missing email');
    }

    return payload;
  }

  /**
   * Find or create a user from a Google ID token payload, return JWT.
   */
  async loginWithGoogle(idToken) {
    const payload = await this.verifyIdToken(idToken);

    const { email, given_name, family_name, picture, sub: googleId } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create a new user — no password required for Google accounts
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        email: email.toLowerCase(),
        passwordHash,
        firstName: given_name || '',
        lastName: family_name || '',
        avatarUrl: picture || null,
        isEmailVerified: true,
        role: 'CUSTOMER',
        googleId,
      });
    } else {
      // Update avatar if the user previously registered with email
      if (!user.avatarUrl && picture) {
        user.avatarUrl = picture;
      }
      if (!user.googleId) {
        user.googleId = googleId;
      }
      user.lastLoginAt = new Date();
      await user.save();
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: Math.floor(config.jwtExpirationMs / 1000) }
    );

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    };
  }
}

module.exports = new GoogleAuthService();
