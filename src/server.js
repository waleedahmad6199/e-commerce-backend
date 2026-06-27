/**
 * FILE: src/server.js
 * -------------------
 * PURPOSE:
 *   This is the application entry point. It imports the configured Express
 *   application from app.js, binds it to a TCP port, and wires up operating-
 *   system level process signal handlers so the server shuts down gracefully
 *   instead of being killed mid-request.
 *
 * RESPONSIBILITIES:
 *   1. Start the HTTP server and listen on the configured port.
 *   2. Log startup info to the console (port, environment, MongoDB URI).
 *   3. Catch unhandled promise rejections so they don't silently swallow errors.
 *   4. Catch uncaught synchronous exceptions before they crash the process.
 *   5. Handle SIGTERM (sent by process managers like PM2 or container orchestrators
 *      like Kubernetes) to close existing connections before exiting.
 *
 * DEPENDENCIES:
 *   - ./app        : The Express application (routes, middleware, DB connection).
 *   - ./config     : Environment-aware config object (port, nodeEnv, mongodbUri).
 *
 * USED BY:
 *   - npm run start   (node src/server.js)
 *   - npm run dev     (node --watch src/server.js)
 *   - Render / PM2 / Docker CMD
 */

const app    = require('./app');    // Import the fully-configured Express app
const config = require('./config'); // Import centralised config (reads .env)

const PORT = config.port || 8080; // Prefer PORT from env, fallback to 8080

// app.listen() binds the Express app to the TCP port.
// The callback fires once the port is successfully bound.
const server = app.listen(PORT, () => {
  console.log(`\n🚀 E-commerce API server running`);
  console.log(`   Environment : ${config.nodeEnv}`);   // 'development' or 'production'
  console.log(`   Port        : ${PORT}`);               // The port we are listening on
  console.log(`   MongoDB     : ${config.mongodbUri}`);  // The MongoDB connection string
  console.log(`   Health      : http://localhost:${PORT}/api/health\n`); // Health-check URL
});

// ── Unhandled Promise Rejection ────────────────────────────────────────────
// Fires when a Promise is rejected and no .catch() handler is attached.
// Without this, Node will print a deprecation warning (or crash in newer versions).
// We log the error, then close the server cleanly before exiting.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message); // Log the rejection reason
  server.close(() => process.exit(1));                // Close server, then exit with failure code
});

// ── Uncaught Exception ─────────────────────────────────────────────────────
// Fires when a synchronous throw is not caught anywhere in the call stack.
// The process is in an undefined state at this point, so we MUST exit.
// A process manager (PM2 / Kubernetes) will restart the process automatically.
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message); // Log the exception
  process.exit(1);                                   // Exit immediately — do NOT try to recover
});

// ── Graceful Shutdown on SIGTERM ───────────────────────────────────────────
// SIGTERM is sent by:
//   - Kubernetes / Docker when scaling down or restarting a pod/container.
//   - PM2 when restarting a process.
//   - Render.com when deploying a new version.
// We stop accepting new requests (server.close) but let in-flight requests
// finish before exiting.
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...'); // Acknowledge signal
  server.close(() => {    // Wait for open connections to finish
    console.log('Server closed.'); // Confirm clean shutdown
    process.exit(0);               // Exit with success code
  });
});

module.exports = server; // Export for use in integration tests
