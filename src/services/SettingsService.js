/**
 * FILE: src/services/SettingsService.js
 * ----------------------------------------
 * PURPOSE:
 *   Business logic for all site settings, feature flags, SMTP config,
 *   and payment gateway configuration management.
 *
 * KEY DESIGN — getAllSettings():
 *   Returns a flat { settingKey: settingValue } map rather than the raw documents.
 *   The frontend can call GET /api/settings once on page load and immediately
 *   read any setting by key without iterating an array.
 *   Example: settings['site.name'], settings['free_shipping_threshold']
 *
 * KEY DESIGN — updateSetting():
 *   Uses findOneAndUpdate with upsert:true — creates the document if the key
 *   doesn't exist, or updates the value if it does. This means there's no
 *   separate "create setting" endpoint needed.
 *
 * DEPENDENCIES:
 *   - models/WebsiteSetting.js
 *   - models/FeatureFlag.js
 *   - models/SmtpConfig.js
 *   - models/PaymentGatewayConfig.js
 *   - utils/ApiError.js
 *
 * USED BY:
 *   - src/controllers/SettingsController.js
 *   - src/services/OrderService.js (reads free_shipping_threshold)
 *   - src/services/ExchangeRateService.js (reads/writes currency settings)
 */
const WebsiteSetting       = require('../models/WebsiteSetting');        // Key-value site settings
const FeatureFlag          = require('../models/FeatureFlag');            // Feature toggle flags
const SmtpConfig           = require('../models/SmtpConfig');             // Email server config
const PaymentGatewayConfig = require('../models/PaymentGatewayConfig'); // Payment gateway config
const ApiError             = require('../utils/ApiError');                // Custom error class

class SettingsService {
  async getAllSettings() {
    const settings = await WebsiteSetting.find().lean();
    const map = {};
    for (const s of settings) {
      map[s.settingKey] = s.settingValue;
    }
    return map;
  }

  async getSettingsByGroup(group) {
    return WebsiteSetting.find({ group }).lean();
  }

  async getSettingByKey(key) {
    const setting = await WebsiteSetting.findOne({ settingKey: key }).lean();
    if (!setting) throw new ApiError(404, 'Setting not found');
    return setting;
  }

  async updateSetting(key, value) {
    return WebsiteSetting.findOneAndUpdate(
      { settingKey: key },
      { $set: { settingValue: value } },
      { upsert: true, new: true }
    );
  }

  async getFeatureFlags() {
    return FeatureFlag.find().lean();
  }

  async updateFeatureFlag(id, enabled) {
    const flag = await FeatureFlag.findById(id);
    if (!flag) throw new ApiError(404, 'Feature flag not found');
    flag.enabled = enabled;
    await flag.save();
    return flag;
  }

  async getSmtpConfigs() {
    return SmtpConfig.find().lean();
  }

  async createSmtpConfig(data) {
    const config = new SmtpConfig(data);
    await config.save();
    return config;
  }

  async updateSmtpConfig(id, data) {
    const config = await SmtpConfig.findById(id);
    if (!config) throw new ApiError(404, 'SMTP configuration not found');
    if (data.host !== undefined) config.host = data.host;
    if (data.port !== undefined) config.port = data.port;
    if (data.username !== undefined) config.username = data.username;
    if (data.passwordEncrypted !== undefined) config.passwordEncrypted = data.passwordEncrypted;
    if (data.senderName !== undefined) config.senderName = data.senderName;
    if (data.senderEmail !== undefined) config.senderEmail = data.senderEmail;
    if (data.useTls !== undefined) config.useTls = data.useTls;
    if (data.useSsl !== undefined) config.useSsl = data.useSsl;
    if (data.isDefault !== undefined) config.isDefault = data.isDefault;
    if (data.isActive !== undefined) config.isActive = data.isActive;
    await config.save();
    return config;
  }

  async getPaymentGatewayConfigs() {
    return PaymentGatewayConfig.find().lean();
  }

  async createPaymentGatewayConfig(data) {
    const config = new PaymentGatewayConfig(data);
    await config.save();
    return config;
  }

  async updatePaymentGatewayConfig(id, data) {
    const config = await PaymentGatewayConfig.findById(id);
    if (!config) throw new ApiError(404, 'Payment gateway configuration not found');
    if (data.displayName !== undefined) config.displayName = data.displayName;
    if (data.isActive !== undefined) config.isActive = data.isActive;
    if (data.isSandbox !== undefined) config.isSandbox = data.isSandbox;
    if (data.apiKeyEncrypted !== undefined) config.apiKeyEncrypted = data.apiKeyEncrypted;
    if (data.apiSecretEncrypted !== undefined) config.apiSecretEncrypted = data.apiSecretEncrypted;
    if (data.webhookSecretEncrypted !== undefined) config.webhookSecretEncrypted = data.webhookSecretEncrypted;
    if (data.additionalConfig !== undefined) config.additionalConfig = data.additionalConfig;
    await config.save();
    return config;
  }
}

module.exports = new SettingsService();
