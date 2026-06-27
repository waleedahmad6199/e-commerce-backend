/**
 * FILE: src/services/ExchangeRateService.js
 * ------------------------------------------
 * PURPOSE:
 *   Fetches and caches live currency exchange rates, provides multi-currency
 *   configuration for the storefront, and maps country codes to currencies.
 *
 * HOW IT WORKS:
 *   1. fetchRates() calls the Frankfurter API (free, no API key needed) to get
 *      rates relative to USD. Results are cached in memory for 1 hour (CACHE_TTL).
 *   2. The rates are also persisted to WebsiteSetting ('currency_rates') so they
 *      survive server restarts and act as a fallback if the API is unreachable.
 *   3. getCurrencyConfig() reads the admin's chosen default currency from settings
 *      and combines it with live rates into a bundle for the frontend.
 *   4. getRegionCurrency() maps a country code (from browser geolocation) to its
 *      standard currency for auto-detection.
 *
 * REQUEST DEDUPLICATION:
 *   _fetchPromise ensures that if multiple requests trigger fetchRates() simultaneously,
 *   only one HTTP call is made and all callers get the same result.
 *
 * DEPENDENCIES:
 *   - axios                    : HTTP client for Frankfurter API
 *   - models/WebsiteSetting.js : Persists rates and reads currency preferences
 *
 * USED BY:
 *   - src/controllers/CurrencyController.js
 */
const axios           = require('axios');             // HTTP client
const WebsiteSetting = require('../models/WebsiteSetting');

const SUPPORTED_CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', locale: 'ur-PK' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA' },
};

const REGION_CURRENCY_MAP = {
  US: 'USD', CA: 'CAD', GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
  IN: 'INR', PK: 'PKR', JP: 'JPY', CN: 'CNY', AU: 'AUD', BR: 'BRL',
  KR: 'KRW', MX: 'MXN', SG: 'SGD', AE: 'AED', SA: 'SAR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR', GR: 'EUR', FI: 'EUR',
};

const CACHE_TTL = 60 * 60 * 1000;
const FRANKFURTER_API = 'https://api.frankfurter.app';

class ExchangeRateService {
  constructor() {
    this._ratesCache = null;
    this._lastFetch = 0;
    this._fetchPromise = null;
  }

  get supportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  get regionMap() {
    return REGION_CURRENCY_MAP;
  }

  async fetchRates() {
    const now = Date.now();
    if (this._ratesCache && this._lastFetch && (now - this._lastFetch) < CACHE_TTL) {
      return this._ratesCache;
    }

    if (this._fetchPromise) return this._fetchPromise;

    this._fetchPromise = this._doFetchRates().finally(() => {
      this._fetchPromise = null;
    });
    return this._fetchPromise;
  }

  async _doFetchRates() {
    try {
      const res = await axios.get(`${FRANKFURTER_API}/latest?from=USD`, { timeout: 10000 });
      const base = res.data.base;
      const rates = res.data.rates;
      rates[base] = 1;

      const STATIC_RATES = { PKR: 280, AED: 3.67, SAR: 3.75 };
      for (const [code, rate] of Object.entries(STATIC_RATES)) {
        if (rates[code] == null) rates[code] = rate;
      }

      this._ratesCache = rates;
      this._lastFetch = Date.now();

      await WebsiteSetting.findOneAndUpdate(
        { settingKey: 'currency_rates' },
        { $set: { settingValue: JSON.stringify(rates), type: 'json', group: 'currency' } },
        { upsert: true }
      ).catch(() => {});

      return rates;
    } catch (err) {
      if (this._ratesCache) return this._ratesCache;

      const stored = await WebsiteSetting.findOne({ settingKey: 'currency_rates' }).lean();
      if (stored && stored.settingValue) {
        try {
          const rates = JSON.parse(stored.settingValue);
          this._ratesCache = rates;
          this._lastFetch = Date.now();
          return rates;
        } catch {}
      }

      return { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.0, PKR: 280, JPY: 150, CAD: 1.36, AUD: 1.52, CNY: 7.24, BRL: 5.0, KRW: 1320, MXN: 17.1, SGD: 1.34, AED: 3.67, SAR: 3.75 };
    }
  }

  async getCurrencyConfig() {
    const [currencySetting, autoDetectSetting] = await Promise.all([
      WebsiteSetting.findOne({ settingKey: 'default_currency' }).lean(),
      WebsiteSetting.findOne({ settingKey: 'auto_detect_currency' }).lean(),
    ]);

    const currencyCode = currencySetting?.settingValue || 'USD';
    const autoDetect = autoDetectSetting?.settingValue === 'true' || false;
    const rates = await this.fetchRates();
    const currencyInfo = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;

    return {
      code: currencyCode,
      symbol: currencyInfo.symbol,
      name: currencyInfo.name,
      locale: currencyInfo.locale,
      rate: rates[currencyCode] || 1,
      autoDetect,
      rates,
      availableCurrencies: Object.values(SUPPORTED_CURRENCIES),
    };
  }

  async updateCurrencyConfig(code, autoDetect) {
    const currencyInfo = SUPPORTED_CURRENCIES[code];
    if (!currencyInfo) throw new Error(`Unsupported currency: ${code}`);

    await Promise.all([
      WebsiteSetting.findOneAndUpdate(
        { settingKey: 'default_currency' },
        { $set: { settingValue: code, type: 'string', group: 'currency', label: 'Default Currency' } },
        { upsert: true }
      ),
      WebsiteSetting.findOneAndUpdate(
        { settingKey: 'auto_detect_currency' },
        { $set: { settingValue: String(autoDetect), type: 'boolean', group: 'currency', label: 'Auto Detect Currency' } },
        { upsert: true }
      ),
    ]);
  }
}

module.exports = new ExchangeRateService();
