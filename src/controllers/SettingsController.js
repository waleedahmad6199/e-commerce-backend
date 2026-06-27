/**
 * FILE: src/controllers/SettingsController.js
 * ---------------------------------------------
 * PURPOSE:
 *   HTTP handlers for website settings, feature flags, SMTP config, and
 *   payment gateway configuration. Thin layer — delegates all logic to SettingsService.
 *
 * ROUTE FILE: src/routes/settingsRoutes.js (mounted at /api/settings)
 *
 * USED BY:
 *   - src/routes/settingsRoutes.js
 */
const settingsService = require('../services/SettingsService'); // Settings business logic
const ApiResponse     = require('../utils/ApiResponse');         // Response envelope

const getAllSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.status(200).json(ApiResponse.success(settings, 'Settings retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getSettingsByGroup = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettingsByGroup(req.params.group);
    res.status(200).json(ApiResponse.success(settings, 'Settings retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getSettingByKey = async (req, res, next) => {
  try {
    const setting = await settingsService.getSettingByKey(req.params.key);
    res.status(200).json(ApiResponse.success(setting, 'Setting retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const setting = await settingsService.updateSetting(req.params.key, req.body.value);
    res.status(200).json(ApiResponse.success(setting, 'Setting updated successfully'));
  } catch (error) {
    next(error);
  }
};

const getFeatureFlags = async (req, res, next) => {
  try {
    const flags = await settingsService.getFeatureFlags();
    res.status(200).json(ApiResponse.success(flags, 'Feature flags retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const updateFeatureFlag = async (req, res, next) => {
  try {
    const flag = await settingsService.updateFeatureFlag(req.params.id, req.body.enabled);
    res.status(200).json(ApiResponse.success(flag, 'Feature flag updated successfully'));
  } catch (error) {
    next(error);
  }
};

const getSmtpConfigs = async (req, res, next) => {
  try {
    const configs = await settingsService.getSmtpConfigs();
    res.status(200).json(ApiResponse.success(configs, 'SMTP configs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createSmtpConfig = async (req, res, next) => {
  try {
    const config = await settingsService.createSmtpConfig(req.body);
    res.status(201).json(ApiResponse.success(config, 'SMTP config created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateSmtpConfig = async (req, res, next) => {
  try {
    const config = await settingsService.updateSmtpConfig(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(config, 'SMTP config updated successfully'));
  } catch (error) {
    next(error);
  }
};

const getPaymentGatewayConfigs = async (req, res, next) => {
  try {
    const configs = await settingsService.getPaymentGatewayConfigs();
    res.status(200).json(ApiResponse.success(configs, 'Payment gateway configs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createPaymentGatewayConfig = async (req, res, next) => {
  try {
    const config = await settingsService.createPaymentGatewayConfig(req.body);
    res.status(201).json(ApiResponse.success(config, 'Payment gateway config created successfully'));
  } catch (error) {
    next(error);
  }
};

const updatePaymentGatewayConfig = async (req, res, next) => {
  try {
    const config = await settingsService.updatePaymentGatewayConfig(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(config, 'Payment gateway config updated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSettings,
  getSettingsByGroup,
  getSettingByKey,
  updateSetting,
  getFeatureFlags,
  updateFeatureFlag,
  getSmtpConfigs,
  createSmtpConfig,
  updateSmtpConfig,
  getPaymentGatewayConfigs,
  createPaymentGatewayConfig,
  updatePaymentGatewayConfig,
};
