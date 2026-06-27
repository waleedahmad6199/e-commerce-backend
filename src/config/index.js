/**
 * FILE: src/config/index.js
 * --------------------------
 * PURPOSE:
 *   Central configuration module for the entire backend application.
 *   Reads all settings from environment variables (loaded from .env by dotenv),
 *   applies sane defaults for development, and performs fail-fast validation
 *   for required production secrets.
 *
 * RESPONSIBILITIES:
 *   1. Load the .env file into process.env via dotenv.
 *   2. Validate that critical secrets exist in production (fail fast).
 *   3. Export a single frozen config object consumed by all other modules.
 *
 * DEPENDENCIES:
 *   - dotenv : reads .env file from the project root into process.env
 *
 * USED BY:
 *   - src/app.js            (CORS origin, rate limit, static files)
 *   - src/server.js         (port, nodeEnv, mongodbUri)
 *   - src/config/database.js (mongodbUri)
 *   - src/middleware/auth.js (jwtSecret)
 *   - src/services/AuthService.js (jwtSecret, jwtExpirationMs)
 *   - src/controllers/UploadController.js (cloudinary credentials, uploadBaseUrl)
 */

require('dotenv').config(); // Read .env file and inject all KEY=VALUE pairs into process.env

const nodeEnv = process.env.NODE_ENV || 'development'; // Detect environment

// ── Production Fail-Fast Validation ──────────────────────────────────────
// If we are running in production and a critical secret is missing,
// throw immediately so the process crashes loudly rather than running
// insecurely with a default placeholder value.

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  // Throw a fatal error — do not allow the server to start without a real JWT secret
  throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing in production!');
}

if (nodeEnv === 'production' && process.env.CLOUDINARY_ENABLED === 'true') {
  // If the admin has opted into Cloudinary image hosting but forgot to supply credentials
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('FATAL ERROR: Cloudinary credentials are missing but CLOUDINARY_ENABLED is true in production!');
  }
}

// ── Export Config Object ──────────────────────────────────────────────────
module.exports = {
  // The TCP port Express will listen on — Render/Railway injects PORT automatically
  port: parseInt(process.env.PORT, 10) || 8080,

  // MongoDB Atlas connection string — always set in production via env var
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_db',

  // Secret key used to sign and verify JWT tokens — must be a long random string
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',

  // How long a user JWT token stays valid in milliseconds (default 24 hours)
  jwtExpirationMs: parseInt(process.env.JWT_EXPIRATION_MS, 10) || 86400000,

  // How long an admin JWT token stays valid in milliseconds (default 24 hours)
  adminJwtExpirationMs: parseInt(process.env.ADMIN_JWT_EXPIRATION_MS, 10) || 86400000,

  // The frontend origin allowed by CORS — must match the Next.js deployment URL
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Current runtime environment — used to toggle dev-only features and logging
  nodeEnv,

  // Base URL prepended to local file upload paths (e.g. https://api.yourshop.com)
  // If null, falls back to http://localhost:<port> at runtime
  uploadBaseUrl: process.env.UPLOAD_BASE_URL || null,

  // Cloudinary cloud image / video CDN configuration
  cloudinary: {
    cloudName:  process.env.CLOUDINARY_CLOUD_NAME  || null, // Cloudinary account cloud name
    apiKey:     process.env.CLOUDINARY_API_KEY     || null, // Cloudinary API key
    apiSecret:  process.env.CLOUDINARY_API_SECRET  || null, // Cloudinary API secret
    // enabled is true only when ALL three Cloudinary values are present
    enabled: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY    &&
      process.env.CLOUDINARY_API_SECRET
    ),
  },
};
