/**
 * FILE: src/config/cloudinary.js
 * ---------------------------------
 * PURPOSE:
 *   Configures and exports the Cloudinary v2 SDK instance.
 *   Called once at module load time — credentials are applied only when
 *   config.cloudinary.enabled is true (all three env vars are set).
 *
 * WHY A SEPARATE CONFIG FILE:
 *   Multiple modules need the Cloudinary client (UploadController, cloudinaryService).
 *   Centralising the configuration here means credentials are applied in one place
 *   and the configured instance is shared via require() caching.
 *
 * FALLBACK:
 *   If cloudinary.enabled is false (credentials not set), the cloudinary instance
 *   is still exported but not configured. Callers check config.cloudinary.enabled
 *   before calling any upload methods, so this is safe.
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   CLOUDINARY_CLOUD_NAME — your Cloudinary account cloud name
 *   CLOUDINARY_API_KEY    — your Cloudinary API key
 *   CLOUDINARY_API_SECRET — your Cloudinary API secret
 *
 * USED BY:
 *   - src/services/cloudinaryService.js
 *   - src/controllers/UploadController.js (also imports cloudinary directly)
 */
const cloudinary = require('cloudinary').v2; // Cloudinary v2 Node.js SDK
const config     = require('./index');        // App config (cloudinary credentials)

if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

module.exports = cloudinary;
