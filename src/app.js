/**
 * FILE: src/app.js
 * ------------------
 * PURPOSE:
 *   Creates and configures the Express application instance.
 *   This file is responsible for the complete middleware pipeline and
 *   all route registrations. It does NOT start the HTTP server —
 *   that is done in src/server.js by calling app.listen().
 *
 * MIDDLEWARE PIPELINE ORDER (matters — Express executes in registration order):
 *   1. helmet()           — sets security HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
 *   2. mongoSanitize()    — strips $ and . from req.body/query to prevent NoSQL injection
 *   3. compression()      — gzip/brotli compress all responses > 1KB
 *   4. cors()             — allows requests only from configured frontend origin(s)
 *   5. morgan()           — logs HTTP requests (dev: colorized, prod: Apache combined)
 *   6. express.json()     — parses JSON request bodies (limit 10MB)
 *   7. express.urlencoded()— parses URL-encoded form bodies (limit 10MB)
 *   8. Public currency endpoints — registered BEFORE rate limiting so they're never blocked
 *   9. generalLimiter     — 1000 requests per IP per 15 minutes (all routes)
 *  10. authLimiter        — 20 requests per IP per 15 minutes (login/register only)
 *  11. Static /uploads    — serves local uploaded files
 *  12. Route handlers     — all API route modules
 *  13. Health check       — GET /api/health
 *  14. notFoundHandler    — 404 for unmatched routes
 *  15. errorHandler       — catches all thrown errors, formats consistent response
 *
 * CORS POLICY:
 *   - Always allows http://localhost:3000 (local development).
 *   - Also allows CORS_ORIGIN from .env (production frontend URL).
 *   - In development (NODE_ENV=development), all origins are allowed for convenience.
 *   - In production only the explicitly configured origins are allowed.
 *   - credentials:true enables cookies/auth headers in cross-origin requests.
 *
 * ROUTE MOUNT POINTS:
 *   /catalog             → catalogRoutes    (products, categories, attributes, reviews)
 *   /api/cart            → orderRoutes      (shopping cart)
 *   /api/orders          → orderRoutes      (order management)
 *   /api/payments        → paymentRoutes    (PayFast gateway)
 *   /api/shipments       → orderRoutes      (shipments)
 *   /api/returns         → orderRoutes      (returns + refunds)
 *   /search              → searchRoutes     (product search + suggestions)
 *   /recommendations     → recommendationRoutes (trending, similar, personalised)
 *   /api/admin           → adminRoutes      (admin panel backend)
 *   /api/cms             → cmsRoutes        (content management)
 *   /api/settings        → settingsRoutes   (site settings, feature flags)
 *   /api/users           → userRoutes       (auth + customer profile)
 *   /api                 → receiptRoutes    (/api/orders/:id/receipt)
 *   /api/upload          → uploadRoutes     (file uploads)
 *   /api/admin/products  → adminProductUploadRouter (product image upload)
 *   /api/inquiries       → inquiryRoutes    (product inquiries)
 *   /api/contact         → contactRoutes    (contact form)
 *   /api/settings/currency → currencyController (live exchange rates — public)
 *   /api/health          → inline handler   (server health check)
 *
 * DEPENDENCIES:
 *   - express, helmet, cors, morgan, express-rate-limit,
 *     express-mongo-sanitize, compression  (npm packages)
 *   - All route modules, config, middleware, utils (local)
 *
 * USED BY:
 *   - src/server.js (imports this module and calls app.listen())
 */

const express        = require('express');              // HTTP framework
const helmet         = require('helmet');               // Secure HTTP headers
const cors           = require('cors');                 // Cross-Origin Resource Sharing
const morgan         = require('morgan');               // HTTP request logger
const rateLimit      = require('express-rate-limit');   // Rate limiting middleware
const mongoSanitize  = require('express-mongo-sanitize'); // NoSQL injection prevention
const compression    = require('compression');          // Response compression (gzip)
const path           = require('path');                 // Node.js built-in path utilities

const config         = require('./config');             // Centralised app configuration
const connectDB      = require('./config/database');    // MongoDB connection
const ApiResponse    = require('./utils/ApiResponse');  // Consistent response envelope
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler'); // Error handling

// ── Route Modules ─────────────────────────────────────────────────────────
const catalogRoutes         = require('./routes/catalogRoutes');         // /catalog
const orderRoutes           = require('./routes/orderRoutes');           // /api/cart, /api/orders, etc.
const searchRoutes          = require('./routes/searchRoutes');          // /search
const recommendationRoutes  = require('./routes/recommendationRoutes'); // /recommendations
const adminRoutes           = require('./routes/adminRoutes');           // /api/admin
const cmsRoutes             = require('./routes/cmsRoutes');             // /api/cms
const settingsRoutes        = require('./routes/settingsRoutes');        // /api/settings
const receiptRoutes         = require('./routes/receiptRoutes');         // /api/orders/:id/receipt
const userRoutes            = require('./routes/userRoutes');            // /api/users
const paymentRoutes         = require('./routes/paymentRoutes');         // /api/payments
const contactRoutes         = require('./routes/contactRoutes');         // /api/contact
const inquiryRoutes         = require('./routes/inquiryRoutes');         // /api/inquiries
const couponRoutes          = require('./routes/couponRoutes');          // /api/coupons

// Currency controller handles two public endpoints registered before rate limiting
const currencyController    = require('./controllers/CurrencyController');

// Upload routes: general upload + admin product image upload (separate routers)
const { uploadRouter: uploadRoutes, adminProductUploadRouter } = require('./routes/uploadRoutes');

// ── Create Express Application ────────────────────────────────────────────
const app = express(); // Create the Express app instance

// ── Connect to MongoDB ────────────────────────────────────────────────────
// connectDB() is called here so the DB is ready before any request arrives.
// It will retry up to 5 times with 5-second delays before giving up.
connectDB();

// ── Security Middleware ───────────────────────────────────────────────────

// helmet() sets 14 security-related HTTP response headers including:
// Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, HSTS, etc.
app.use(helmet());

// mongoSanitize() removes any keys starting with '$' or containing '.' from
// req.body, req.params, and req.query. This prevents MongoDB operator injection
// attacks where an attacker sends { "email": { "$gt": "" } } to bypass auth.
app.use(mongoSanitize());

// ── Response Compression ─────────────────────────────────────────────────
// compress() gzip-compresses all responses larger than 1KB.
// Reduces bandwidth by ~70% for JSON API responses.
app.use(compression());

// ── CORS Configuration ───────────────────────────────────────────────────
// Build the list of allowed origins from config
const allowedOrigins = ['http://localhost:3000']; // Always allow local dev
if (config.corsOrigin && config.corsOrigin !== 'http://localhost:3000') {
  allowedOrigins.push(config.corsOrigin); // Add production frontend URL
}

app.use(cors({
  // Dynamic origin check — called for every request
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow non-browser clients (curl, mobile apps)
    if (allowedOrigins.indexOf(origin) !== -1 || config.nodeEnv === 'development') {
      callback(null, true); // Origin is in the whitelist or we're in development
    } else {
      callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
  },
  credentials: true, // Allow Authorization headers and cookies in cross-origin requests
}));

// ── HTTP Request Logging ──────────────────────────────────────────────────
// 'combined' produces Apache Common Log format (good for log aggregation in production)
// 'dev' produces colorized short-form output (good for local development)
const loggingFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
app.use(morgan(loggingFormat));

// ── Body Parsers ──────────────────────────────────────────────────────────
// Parse JSON bodies — limit 10MB to allow product creation with base64 images
app.use(express.json({ limit: '10mb' }));
// Parse URL-encoded bodies (HTML forms) — same 10MB limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Public Routes Before Rate Limiting ───────────────────────────────────
// Currency endpoints are called on every page load by the frontend.
// Registering them BEFORE generalLimiter means they are never rate-limited.
app.get('/api/settings/currency', currencyController.getCurrencyConfig);         // Full currency config
app.get('/api/settings/currency/region', currencyController.getRegionCurrency); // Auto-detect by country

// ── Rate Limiting ─────────────────────────────────────────────────────────
// General limiter: 1000 requests per IP per 15 minutes
// Applies to all routes registered AFTER this line
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max:      1000,            // Maximum requests per windowMs per IP
  standardHeaders: true,     // Return RateLimit-* headers in responses
  legacyHeaders:   false,    // Do NOT return X-RateLimit-* headers (deprecated)
  message: ApiResponse.error('Too many requests, please try again later.', 'RATE_LIMIT_EXCEEDED'),
});
app.use(generalLimiter); // Apply to all routes below

// Stricter limiter for auth endpoints: 20 requests per IP per 15 minutes
// Prevents brute-force password attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,              // Only 20 login/register attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders:   false,
  message: ApiResponse.error('Too many login attempts, please try again later.', 'RATE_LIMIT_EXCEEDED'),
});
app.use('/api/users/login',        authLimiter); // Customer login
app.use('/api/users/register',     authLimiter); // Customer registration
app.use('/api/admin/auth/login',   authLimiter); // Admin login

// ── Static File Serving ───────────────────────────────────────────────────
// Serves locally-uploaded files from /backend/uploads/ at the /uploads URL path.
// In production with Cloudinary enabled, most files won't be here — but the
// fallback for local storage still works through this static middleware.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────

// Product catalog: products, categories, attributes, media, variants, reviews
app.use('/catalog', catalogRoutes);

// Orders + cart: mounted without prefix (routes include /api/cart, /api/orders, etc.)
app.use(orderRoutes);

// Product search: full-text search, suggestions, popular terms
app.use('/search', searchRoutes);

// Recommendations: trending, similar, frequently-together, personalised
app.use('/recommendations', recommendationRoutes);

// Admin panel: admin users, coupons, dashboard, audit logs
app.use('/api/admin', adminRoutes);

// CMS: pages, banners, announcements, popups, homepage sections
app.use('/api/cms', cmsRoutes);

// Site settings: key-value settings, feature flags, SMTP, payment gateways
app.use('/api/settings', settingsRoutes);

// Customer auth + profile: register, login, addresses, payment methods, wishlist
app.use('/api/users', userRoutes);

// Receipts: GET /api/orders/:orderId/receipt
app.use('/api', receiptRoutes);

// PayFast payments: ITN webhook, sandbox simulation, status check
app.use('/api/payments', paymentRoutes);

// File uploads: images, videos, URL uploads, product images
app.use('/api/upload', uploadRoutes);

// Admin product image upload (separate router with image processing)
app.use('/api/admin/products', adminProductUploadRouter);

// Product inquiries: public submission + admin management
app.use('/api/inquiries', inquiryRoutes);

// Contact form: public message submission
app.use('/api/contact', contactRoutes);

// Coupons: manage discount codes
app.use('/api/coupons', couponRoutes);

// ── Health Check ──────────────────────────────────────────────────────────
// Simple endpoint for load balancers, uptime monitors, and deployment checks.
// Returns 200 immediately if the server is running (does NOT check DB health).
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   'Server is running',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(), // Seconds since the process started
    env:       config.nodeEnv,  // 'development' or 'production'
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────
// Must be registered AFTER all route modules and BEFORE errorHandler.
// Catches any request that didn't match a registered route.
app.use(notFoundHandler);

// ── Global Error Handler ──────────────────────────────────────────────────
// Must be the LAST app.use() call. Express identifies error-handling middleware
// by its 4-parameter signature (err, req, res, next).
// Catches all errors thrown in routes and services via next(err) or throw.
app.use(errorHandler);

module.exports = app; // Export for use in server.js and integration tests
