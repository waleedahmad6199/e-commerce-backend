/**
 * FILE: src/middleware/validate.js
 * ---------------------------------
 * PURPOSE:
 *   Centralised request-body validation middleware using the express-validator
 *   library. Each exported constant is an array of validation rules followed by
 *   the handleValidation() error-collector. Attach these arrays directly in
 *   route definitions as middleware chains.
 *
 * HOW IT WORKS:
 *   1. Each validation rule (e.g. body('email').isEmail()) runs on the incoming
 *      request and stores any errors in an internal result bag.
 *   2. handleValidation() checks the result bag. If errors exist it sends a
 *      structured 400 response immediately and the route handler is never called.
 *   3. If no errors, handleValidation() calls next() and the route handler runs.
 *
 * USAGE EXAMPLE:
 *   router.post('/register', validateRegister, authController.register);
 *   // validateRegister is an array: [rule1, rule2, ..., handleValidation]
 *   // Express iterates it automatically as a middleware chain.
 *
 * DEPENDENCIES:
 *   - express-validator : provides body(), validationResult(), isEmail(), etc.
 *
 * USED BY:
 *   - src/routes/userRoutes.js
 *   - src/routes/adminRoutes.js
 *   - src/routes/orderRoutes.js
 *   - src/routes/catalogRoutes.js
 */

const { body, validationResult } = require('express-validator'); // Validation helpers

// ─────────────────────────────────────────────────────────────────────────────
// handleValidation
// The final step in every validation chain. Reads any accumulated errors and
// either returns a 400 response or calls next() to proceed.
// ─────────────────────────────────────────────────────────────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req); // Collect all validation errors for this request
  if (!errors.isEmpty()) {
    // At least one validation rule failed — return 400 with details
    return res.status(400).json({
      success: false,
      error: {
        code:    'VALIDATION_ERROR',
        details: errors.array().map((e) => e.msg).join(', '), // Join all messages into one string
      },
      message:   'Validation failed',
      timestamp: new Date().toISOString(),
    });
  }
  next(); // All rules passed — let the route handler run
};

// ─────────────────────────────────────────────────────────────────────────────
// validateRegister
// Rules for POST /api/users/register
// ─────────────────────────────────────────────────────────────────────────────
const validateRegister = [
  body('email').isEmail().withMessage('Valid email is required'),             // Must be a valid email format
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), // Min password length
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),    // Optional but non-blank
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),      // Optional but non-blank
  handleValidation, // Collect errors and respond / continue
];

// ─────────────────────────────────────────────────────────────────────────────
// validateLogin
// Rules for POST /api/users/login and POST /api/admin/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),     // Email format
  body('password').notEmpty().withMessage('Password is required'),    // Password must not be blank
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateAddress
// Rules for POST/PUT /api/users/:userId/addresses
// ─────────────────────────────────────────────────────────────────────────────
const validateAddress = [
  body('fullName').notEmpty().withMessage('Full name is required'),                            // Required: recipient name
  body('street').notEmpty().withMessage('Street address is required'),                         // Required: street line
  body('city').notEmpty().withMessage('City is required'),                                     // Required: city
  body('state').optional().trim().notEmpty().withMessage('State cannot be empty'),             // Optional but non-blank
  body('zipCode').optional().trim().notEmpty().withMessage('Zip code cannot be empty'),        // Optional but non-blank
  body('country').optional().trim().notEmpty().withMessage('Country cannot be empty'),         // Optional but non-blank
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),         // Boolean flag
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateProductCreate
// Rules for POST /catalog/products
// ─────────────────────────────────────────────────────────────────────────────
const validateProductCreate = [
  body('title').notEmpty().withMessage('Product title is required'),                           // Required: product name
  body('description').optional().trim(),                                                        // Optional description (trim whitespace)
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a number >= 0'),       // Must be non-negative number
  body('categoryId').optional().trim().notEmpty().withMessage('Category ID cannot be empty'),  // Optional but non-blank
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateReview
// Rules for POST /catalog/products/:productId/reviews
// Note: userId is derived from the JWT token (not from the request body)
// ─────────────────────────────────────────────────────────────────────────────
const validateReview = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'), // 1–5 star scale
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),                    // Optional review headline
  body('comment').optional().trim(),                                                                   // Optional review body
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateAddToCart
// Rules for POST /api/cart/items
// Note: userId is derived from the JWT token (not from the request body)
// ─────────────────────────────────────────────────────────────────────────────
const validateAddToCart = [
  body('productId').notEmpty().withMessage('Product ID is required'),          // Required: which product
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be an integer >= 1'), // At least 1 unit
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateCheckout
// Rules for POST /api/orders/checkout
// ─────────────────────────────────────────────────────────────────────────────
const validateCheckout = [
  body('shippingAddress').isObject().withMessage('Shipping address must be an object'),               // Must be an object
  body('shippingAddress.recipientName').notEmpty().withMessage('Recipient name is required'),          // Name on delivery
  body('shippingAddress.street').notEmpty().withMessage('Shipping street is required'),                // Street line
  body('shippingAddress.city').notEmpty().withMessage('Shipping city is required'),                    // City
  body('userEmail').optional().isEmail().withMessage('Valid email is required'),                       // Optional contact email
  body('paymentMethod').optional().isObject().withMessage('Payment method must be an object'),         // Optional payment details
  body('notes').optional().trim(),                                                                      // Optional order notes
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateCouponCreate
// Rules for POST /api/admin/coupons
// ─────────────────────────────────────────────────────────────────────────────
const validateCouponCreate = [
  body('code').notEmpty().withMessage('Coupon code is required'),                                    // Unique coupon code
  body('discountType').notEmpty().withMessage('Discount type is required'),                          // 'PERCENTAGE' or 'FIXED'
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be a number >= 0'),    // E.g. 10 (%) or 5.00 ($)
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateAdminCreate
// Rules for POST /api/admin/users
// ─────────────────────────────────────────────────────────────────────────────
const validateAdminCreate = [
  body('email').isEmail().withMessage('Valid email is required'),                         // Must be valid email
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'), // Minimum password length
  body('roleId').notEmpty().withMessage('Role ID is required'),                           // Must specify an admin role
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateCategory
// Rules for POST /catalog/categories
// ─────────────────────────────────────────────────────────────────────────────
const validateCategory = [
  body('name').notEmpty().withMessage('Category name is required'),                             // Required: display name
  body('slug').optional().trim().notEmpty().withMessage('Slug cannot be empty'),                // Optional but non-blank URL slug
  body('parentId').optional().trim().notEmpty().withMessage('Parent ID cannot be empty'),       // Optional subcategory parent
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validatePaymentMethod
// Rules for POST /api/users/:userId/payment-methods
// ─────────────────────────────────────────────────────────────────────────────
const validatePaymentMethod = [
  body('type').notEmpty().withMessage('Payment method type is required'),                      // E.g. 'CREDIT_CARD', 'PAYPAL'
  body('provider').optional().trim().notEmpty().withMessage('Provider cannot be empty'),       // E.g. 'Visa', 'Mastercard'
  body('lastFourDigits').optional().trim().notEmpty().withMessage('Last four digits cannot be empty'), // Last 4 of card number
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateChangePassword
// Rules for PUT /api/users/:id/password
// ─────────────────────────────────────────────────────────────────────────────
const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),              // Must provide current password for verification
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'), // Minimum new password length
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateAttributeCreate
// Rules for POST /catalog/attributes
// ─────────────────────────────────────────────────────────────────────────────
const validateAttributeCreate = [
  body('name').notEmpty().withMessage('Attribute name is required'),                          // Required: attribute display name
  body('dataType').optional().trim().notEmpty().withMessage('Data type cannot be empty'),     // E.g. 'STRING', 'NUMBER', 'BOOLEAN'
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateVariantCreate
// Rules for POST /catalog/products/:productId/variants
// ─────────────────────────────────────────────────────────────────────────────
const validateVariantCreate = [
  body('sku').optional().trim(),                                                               // Optional SKU code
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),               // Optional but non-blank variant label
  body('price').optional().isFloat().withMessage('Price must be a valid number'),              // Optional variant price override
  body('stock').optional().isInt().withMessage('Stock must be a valid integer'),               // Optional stock quantity
  handleValidation,
];

// ─────────────────────────────────────────────────────────────────────────────
// validateMediaCreate
// Rules for POST /catalog/products/:productId/media
// ─────────────────────────────────────────────────────────────────────────────
const validateMediaCreate = [
  body('url').notEmpty().withMessage('Media URL is required'),                                // Required: image/video URL
  body('mediaType').optional().trim().notEmpty().withMessage('Media type cannot be empty'),   // E.g. 'IMAGE', 'VIDEO'
  handleValidation,
];

module.exports = {
  handleValidation,       // Low-level error collector — used at end of each chain
  validateRegister,       // User registration validation
  validateLogin,          // Login validation (user + admin)
  validateAddress,        // Address add/update validation
  validateProductCreate,  // Product creation validation
  validateReview,         // Product review validation
  validateAddToCart,      // Add-to-cart validation
  validateCheckout,       // Checkout validation
  validateCouponCreate,   // Coupon creation validation
  validateAdminCreate,    // Admin user creation validation
  validateCategory,       // Category creation validation
  validatePaymentMethod,  // Payment method validation
  validateChangePassword, // Password change validation
  validateAttributeCreate,// Attribute creation validation
  validateVariantCreate,  // Variant creation validation
  validateMediaCreate,    // Media creation validation
};
