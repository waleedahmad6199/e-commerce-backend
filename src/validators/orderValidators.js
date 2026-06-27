/**
 * FILE: src/validators/orderValidators.js
 * -----------------------------------------
 * PURPOSE:
 *   Validation rule sets for order and cart endpoints.
 *   Complements middleware/validate.js with stricter rules for
 *   cart item quantity bounds and full checkout address validation.
 *
 * DIFFERENCE FROM middleware/validate.js:
 *   - addItemRules: enforces max quantity of 100 (prevents cart abuse)
 *   - checkoutRules: validates nested shippingAddress object fields individually
 *   - createReturnRules: validates items array structure (min 1 item required)
 *
 * EXPORTS:
 *   validate          — error-collector middleware
 *   addItemRules      — rules for POST /api/cart/items
 *   checkoutRules     — rules for POST /api/orders/checkout
 *   createReturnRules — rules for POST /api/returns/order/:orderId
 *
 * USED BY:
 *   - src/routes/orderRoutes.js (imported but currently using middleware/validate.js)
 */
const { body, param, validationResult } = require('express-validator'); // Validation helpers

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

const addItemRules = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('priceAtTime')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
];

const checkoutRules = [
  body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
  body('shippingAddress.fullName').notEmpty().withMessage('Full name is required'),
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
  body('userEmail').isEmail().withMessage('Valid email is required'),
];

const createReturnRules = [
  body('reason').notEmpty().withMessage('Return reason is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item must be specified'),
  body('items.*.orderItemId').notEmpty().withMessage('Order item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
];

module.exports = {
  validate,
  addItemRules,
  checkoutRules,
  createReturnRules,
};
