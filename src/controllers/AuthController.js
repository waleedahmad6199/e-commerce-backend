/**
 * FILE: src/controllers/AuthController.js
 * -----------------------------------------
 * PURPOSE:
 *   HTTP handlers for all authentication endpoints — both customer and admin.
 *   Thin layer: validates input via middleware chains in the route file,
 *   delegates all business logic to AuthService, returns structured responses.
 *
 * ENDPOINTS HANDLED:
 *   Customer: register, login, forgotPassword, resetPassword, getMe
 *   Admin:    adminLogin, adminLogout, validateAdminSession
 *
 * EMAIL VERIFICATION FLOW (register):
 *   When a user registers, AuthService sends a 6-digit OTP via EmailService.
 *   The frontend must then POST /api/users/verify-email with the code.
 *   The JWT is issued only after the email is verified.
 *
 * ROUTE FILES:
 *   - src/routes/userRoutes.js  (customer auth at /api/users/*)
 *   - src/routes/adminRoutes.js (admin auth at /api/admin/auth/*)
 *
 * USED BY:
 *   - src/routes/userRoutes.js
 *   - src/routes/adminRoutes.js
 */
const authService        = require('../services/AuthService');        // Core auth logic
const googleAuthService  = require('../services/GoogleAuthService');  // Google OAuth (optional)
const ApiResponse        = require('../utils/ApiResponse');           // Response envelope

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(200).json(ApiResponse.success(result, 'Registration verification code sent'));
  } catch (error) {
    next(error);
  }
};

const verifyRegistration = async (req, res, next) => {
  try {
    const result = await authService.verifyRegistration(req.body);
    res.status(201).json(ApiResponse.success(result, 'Registration verified successfully'));
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(ApiResponse.success(result, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    // Always return the same message to prevent email enumeration
    res.status(200).json(ApiResponse.success(null, 'If an account with that email exists, a password reset link has been sent.'));
  } catch (error) {
    // Swallow errors and return the same message to prevent enumeration
    res.status(200).json(ApiResponse.success(null, 'If an account with that email exists, a password reset link has been sent.'));
  }
};

const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.email, req.body.token, req.body.newPassword);
    res.status(200).json(ApiResponse.success(null, 'Password has been reset successfully'));
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json(ApiResponse.success(user, 'User retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    const result = await authService.adminLogin(req.body, req.ip, req.headers['user-agent']);
    res.status(200).json(ApiResponse.success(result, 'Admin login successful'));
  } catch (error) {
    next(error);
  }
};

const adminLogout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) await authService.adminLogout(token);
    res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

const validateAdminSession = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json(ApiResponse.error('No token provided', 'AUTHENTICATION_REQUIRED'));
    }
    const result = await authService.validateAdminSession(token);
    res.status(200).json(ApiResponse.success(result, 'Session is valid'));
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json(ApiResponse.error('idToken is required'));
    }
    const result = await googleAuthService.loginWithGoogle(idToken);
    res.status(200).json(ApiResponse.success(result, 'Google login successful'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyRegistration,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
  adminLogin,
  adminLogout,
  validateAdminSession,
};
