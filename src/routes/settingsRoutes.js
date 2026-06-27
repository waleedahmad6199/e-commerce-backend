/**
 * FILE: src/routes/settingsRoutes.js
 * -------------------------------------
 * PURPOSE:
 *   Defines HTTP routes for site-wide settings, feature flags, SMTP config,
 *   and payment gateway configuration. Mounted at /api/settings in app.js.
 *
 * ACCESS:
 *   - GET /  (all settings) is PUBLIC — the frontend reads general settings
 *     like site name, currency, and theme on every page load.
 *   - All other routes (feature flags, SMTP, payment gateways, key lookups)
 *     are ADMIN-ONLY because they may contain sensitive configuration.
 *
 * CRITICAL ORDERING:
 *   Express matches routes in registration order. The wildcard routes
 *   (/:group and /:key) would intercept named paths like /features, /smtp,
 *   /payment-gateways if registered first. Therefore ALL specific named routes
 *   MUST be registered BEFORE the wildcard routes at the bottom.
 *
 * DEPENDENCIES:
 *   - controllers/SettingsController.js
 *   - middleware/auth.js
 */

const express             = require('express');
const router              = express.Router();
const settingsController  = require('../controllers/SettingsController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// ── Public ──────────────────────────────────────────────────────────────────

// GET /api/settings  — returns a flat { key: value } map of all public website settings
router.get('/', settingsController.getAllSettings);

// ── Admin-Only Named Routes (MUST be before wildcard /:group and /:key) ─────

const currencyController = require('../controllers/CurrencyController');

// PUT /api/settings/currency         — update currency configuration
router.put('/currency', authenticateUser, requireAdmin, currencyController.updateCurrencyConfig);

// GET /api/settings/features         — list all feature flags
router.get('/features', authenticateUser, requireAdmin, settingsController.getFeatureFlags);

// PUT /api/settings/features/:id     — toggle a feature flag on/off
router.put('/features/:id', authenticateUser, requireAdmin, settingsController.updateFeatureFlag);

// GET /api/settings/smtp             — list SMTP email server configurations
router.get('/smtp', authenticateUser, requireAdmin, settingsController.getSmtpConfigs);

// PUT /api/settings/smtp/:id         — update an SMTP configuration
router.put('/smtp/:id', authenticateUser, requireAdmin, settingsController.updateSmtpConfig);

// GET /api/settings/payment-gateways — list payment gateway configurations
router.get('/payment-gateways', authenticateUser, requireAdmin, settingsController.getPaymentGatewayConfigs);

// PUT /api/settings/payment-gateways/:id — update a payment gateway config
router.put('/payment-gateways/:id', authenticateUser, requireAdmin, settingsController.updatePaymentGatewayConfig);

// GET /api/settings/key/:key         — get a single setting by its dot-notation key
router.get('/key/:key', settingsController.getSettingByKey);

// ── Admin Wildcard Routes (MUST be last) ─────────────────────────────────────

// GET /api/settings/:group           — get all settings in a group (e.g. 'general', 'seo')
router.get('/:group', authenticateUser, requireAdmin, settingsController.getSettingsByGroup);

// PUT /api/settings/:key             — upsert a setting by its key
router.put('/:key', authenticateUser, requireAdmin, settingsController.updateSetting);

module.exports = router;
