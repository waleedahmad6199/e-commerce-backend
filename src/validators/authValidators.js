/**
 * FILE: src/validators/authValidators.js
 * -----------------------------------------
 * PURPOSE:
 *   Supplementary validation rule sets for auth endpoints that require
 *   stricter password rules than the general validate.js middleware.
 *
 *   The key difference from middleware/validate.js is:
 *   - registerRules enforces uppercase letter + digit in password (8+ chars)
 *   - resetPasswordRules uses a 6-digit OTP token instead of a UUID token
 *   - normalizeEmail() lowercases and trims emails before validation
 *
 * EXPORTS:
 *   validate          — error-collector middleware (same pattern as handleValidation)
 *   registerRules     — rules for POST /api/users/register
 *   loginRules        — rules for POST /api/users/login
 *   forgotPasswordRules — rules for POST /api/users/forgot-password
 *   resetPasswordRules  — rules for POST /api/users/reset-password
 *   adminLoginRules   — rules for POST /api/admin/auth/login
 *
 * USED BY:
 *   - src/routes/userRoutes.js (forgotPassword, resetPassword)
 */
const { body, validationResult } = require('express-validator'); // Validation helpers

// Middleware to return validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        details: errors.array().map(e => ({ field: e.path, message: e.msg })),
      },
      message: 'Validation failed',
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

const registerRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('firstName').optional().trim().isLength({ max: 100 }).withMessage('First name too long'),
  body('lastName').optional().trim().isLength({ max: 100 }).withMessage('Last name too long'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('token').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit reset code is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const adminLoginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  adminLoginRules,
};
