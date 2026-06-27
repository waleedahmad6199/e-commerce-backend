/**
 * FILE: src/controllers/CurrencyController.js
 * ---------------------------------------------
 * PURPOSE:
 *   HTTP handlers for multi-currency configuration endpoints.
 *   These endpoints are registered BEFORE rate limiting in app.js so they
 *   are never blocked — the frontend calls them on every page load.
 *
 * ENDPOINTS:
 *   GET /api/settings/currency        — full currency config bundle
 *   GET /api/settings/currency/region — resolve currency for a country code
 *   (PUT /api/settings/currency is also available but admin-gated in settingsRoutes)
 *
 * USED BY:
 *   - src/app.js (registered inline before rate limiting)
 */
const ApiResponse          = require('../utils/ApiResponse');              // Response envelope
const ExchangeRateService  = require('../services/ExchangeRateService'); // Currency + rate logic

const getCurrencyConfig = async (req, res, next) => {
  try {
    const config = await ExchangeRateService.getCurrencyConfig();
    res.json(ApiResponse.success(config, 'Currency config retrieved'));
  } catch (error) {
    next(error);
  }
};

const getRegionCurrency = async (req, res, next) => {
  try {
    const { countryCode } = req.query;
    const code = ExchangeRateService.regionMap[countryCode] || 'USD';
    const rates = await ExchangeRateService.fetchRates();
    const currencyInfo = ExchangeRateService.supportedCurrencies[code] || ExchangeRateService.supportedCurrencies.USD;
    res.json(ApiResponse.success({
      code,
      symbol: currencyInfo.symbol,
      name: currencyInfo.name,
      locale: currencyInfo.locale,
      rate: rates[code] || 1,
    }, 'Region currency resolved'));
  } catch (error) {
    next(error);
  }
};

const updateCurrencyConfig = async (req, res, next) => {
  try {
    const { code, autoDetect } = req.body;
    await ExchangeRateService.updateCurrencyConfig(code, autoDetect);
    const config = await ExchangeRateService.getCurrencyConfig();
    res.json(ApiResponse.success(config, 'Currency config updated'));
  } catch (error) {
    next(error);
  }
};

module.exports = { getCurrencyConfig, getRegionCurrency, updateCurrencyConfig };
