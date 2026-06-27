/**
 * FILE: src/middleware/auth.js
 * ----------------------------
 * PURPOSE:
 *   Express middleware functions that protect routes by verifying JSON Web Tokens
 *   (JWT). Four guards are exported with increasing levels of restriction:
 *     1. authenticateUser   — any valid JWT (customer or admin)
 *     2. optionalAuth       — attaches user if token present, never blocks
 *     3. requireAdmin       — only tokens whose role === 'ADMIN' pass
 *     4. requirePermission  — only tokens that carry a specific permission code pass
 *
 * HOW JWT AUTH WORKS IN THIS APP:
 *   1. User logs in → AuthService.login() signs a JWT containing { sub, email, role }.
 *   2. Frontend stores the token in localStorage.
 *   3. Every protected request sends:  Authorization: Bearer <token>
 *   4. This middleware verifies the signature, decodes the payload, and
 *      attaches the user object to req.user for downstream handlers.
 *
 * SECURITY NOTES:
 *   - Tokens are verified with the same JWT_SECRET used to sign them.
 *   - The 'sub' claim (subject) always holds the user's MongoDB ObjectId string.
 *   - requireAdmin / requirePermission re-verify the token inline to avoid a
 *     double-response bug that occurs when chaining two middleware functions that
 *     both call res.status().json() independently.
 *
 * DEPENDENCIES:
 *   - jsonwebtoken : verifies and decodes the JWT
 *   - ../config    : provides jwtSecret
 *
 * USED BY:
 *   - src/routes/userRoutes.js
 *   - src/routes/orderRoutes.js
 *   - src/routes/adminRoutes.js
 *   - src/routes/catalogRoutes.js
 *   - src/routes/cmsRoutes.js
 *   - src/routes/settingsRoutes.js
 *   - src/routes/uploadRoutes.js
 *   - src/routes/recommendationRoutes.js
 *   - src/routes/inquiryRoutes.js
 *   - src/routes/receiptRoutes.js
 *   - src/routes/paymentRoutes.js
 */

const jwt    = require('jsonwebtoken'); // Library for creating / verifying JWTs
const config = require('../config');    // App config — provides jwtSecret

// ─────────────────────────────────────────────────────────────────────────────
// authenticateUser
// Blocks the request with 401 if no valid token is present.
// Populates req.user with decoded token claims on success.
// ─────────────────────────────────────────────────────────────────────────────
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization; // Read the Authorization header

  // If the header is missing or doesn't follow the 'Bearer <token>' format, reject
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success:   false,
      error:     { code: 'AUTHENTICATION_REQUIRED' },
      message:   'Authentication required. No token provided.',
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.split(' ')[1]; // Extract the raw JWT after 'Bearer '

  try {
    // jwt.verify() both validates the signature AND checks the expiry claim (exp).
    // Throws if the token is tampered with, expired, or signed with a different secret.
    const decoded = jwt.verify(token, config.jwtSecret);

    // Attach the decoded claims to req.user so controllers can read them
    req.user = {
      id:          decoded.sub,                // 'sub' = MongoDB ObjectId of the user
      email:       decoded.email,              // User's email address
      role:        decoded.role,               // 'CUSTOMER' or 'ADMIN'
      roleId:      decoded.roleId,             // Admin role ID (null for customers)
      permissions: decoded.permissions || [],  // Array of permission codes (admin only)
    };
    next(); // Token is valid — proceed to the route handler
  } catch (err) {
    // Token verification failed (expired, invalid signature, malformed)
    return res.status(401).json({
      success:   false,
      error:     { code: 'INVALID_TOKEN' },
      message:   'Invalid or expired token.',
      timestamp: new Date().toISOString(),
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// optionalAuth
// Never blocks the request. If a valid token is present, populates req.user.
// If no token or invalid token, sets req.user = null and continues.
// Used for routes that work for both guests and logged-in users
// (e.g. personalized recommendations, search analytics).
// ─────────────────────────────────────────────────────────────────────────────
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization; // Read the Authorization header

  // No header present — continue as guest (req.user will be null)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null; // Explicitly mark as unauthenticated guest
    return next();   // Continue to the next middleware/handler
  }

  const token = authHeader.split(' ')[1]; // Extract the raw JWT

  try {
    const decoded = jwt.verify(token, config.jwtSecret); // Verify the token
    req.user = {
      id:          decoded.sub,               // MongoDB ObjectId string
      email:       decoded.email,             // User's email
      role:        decoded.role,              // 'CUSTOMER' or 'ADMIN'
      permissions: decoded.permissions || [], // Permission codes
    };
  } catch (err) {
    req.user = null; // Bad token — treat request as anonymous guest
  }

  next(); // Always proceed regardless of token validity
};

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// Combines token verification + admin role check in a single middleware.
// Written inline (not calling authenticateUser) to avoid double-response bugs
// when two middleware functions both try to send a 4xx response.
// ─────────────────────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization; // Read the Authorization header

  // Step 1 — reject if no Bearer token is provided
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success:   false,
      error:     { code: 'AUTHENTICATION_REQUIRED' },
      message:   'Authentication required. No token provided.',
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.split(' ')[1]; // Extract JWT string

  // Step 2 — verify the token's signature and expiry
  try {
    const decoded = jwt.verify(token, config.jwtSecret); // Throws on bad/expired tokens
    req.user = {
      id:          decoded.sub,               // MongoDB ObjectId
      email:       decoded.email,             // User email
      role:        decoded.role,              // 'CUSTOMER' or 'ADMIN'
      roleId:      decoded.roleId,            // Admin role document ID
      permissions: decoded.permissions || [], // Admin permission codes
    };
  } catch (err) {
    return res.status(401).json({
      success:   false,
      error:     { code: 'INVALID_TOKEN' },
      message:   'Invalid or expired token.',
      timestamp: new Date().toISOString(),
    });
  }

  // Step 3 — verify the token belongs to an admin user
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success:   false,
      error:     { code: 'FORBIDDEN' },
      message:   'Admin access required.',
      timestamp: new Date().toISOString(),
    });
  }

  next(); // All checks passed — proceed to the admin route handler
};

// ─────────────────────────────────────────────────────────────────────────────
// requirePermission(permissionCode)
// Factory function that returns a middleware checking for a specific permission.
// The permission code (e.g. 'products.delete') must be present in the
// token's permissions array (populated from the admin role at login time).
// ─────────────────────────────────────────────────────────────────────────────
const requirePermission = (permissionCode) => {
  // Return the actual middleware function (closure captures permissionCode)
  return (req, res, next) => {
    const authHeader = req.headers.authorization; // Read Authorization header

    // Step 1 — reject if no Bearer token is provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success:   false,
        error:     { code: 'AUTHENTICATION_REQUIRED' },
        message:   'Authentication required. No token provided.',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.split(' ')[1]; // Extract JWT string

    // Step 2 — verify the token
    try {
      const decoded = jwt.verify(token, config.jwtSecret); // Throws on failure
      req.user = {
        id:          decoded.sub,
        email:       decoded.email,
        role:        decoded.role,
        roleId:      decoded.roleId,
        permissions: decoded.permissions || [],
      };
    } catch (err) {
      return res.status(401).json({
        success:   false,
        error:     { code: 'INVALID_TOKEN' },
        message:   'Invalid or expired token.',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3 — check the specific permission code is in the token's permissions array
    if (!req.user || !req.user.permissions || !req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success:   false,
        error:     { code: 'FORBIDDEN' },
        message:   `Missing required permission: ${permissionCode}`,
        timestamp: new Date().toISOString(),
      });
    }

    next(); // Permission check passed — proceed
  };
};

module.exports = {
  authenticateUser,  // Use on any route that requires a logged-in user
  optionalAuth,      // Use on routes that work for guests and logged-in users
  requireAdmin,      // Use on routes that require admin role
  requirePermission, // Use on routes that require a specific granular permission
};
