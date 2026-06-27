/**
 * FILE: src/models/PaymentGatewayConfig.js
 * ------------------------------------------
 * PURPOSE:
 *   Mongoose schema for the `paymentgatewayconfigs` collection.
 *   Stores configuration for each payment gateway (PayFast, Stripe, etc.).
 *   Credentials are stored encrypted (apiKeyEncrypted, apiSecretEncrypted).
 *
 * SECURITY NOTE:
 *   Encrypted fields should use field-level encryption in production.
 *   Never expose raw credential values in API responses.
 *
 * USED BY:
 *   - src/services/SettingsService.js (getPaymentGatewayConfigs, updatePaymentGatewayConfig)
 */
const mongoose = require('mongoose');

const paymentGatewayConfigSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isSandbox: {
    type: Boolean,
    default: true,
  },
  apiKeyEncrypted: String,
  apiSecretEncrypted: String,
  webhookSecretEncrypted: String,
  additionalConfig: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('PaymentGatewayConfig', paymentGatewayConfigSchema);
