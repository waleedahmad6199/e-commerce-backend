/**
 * FILE: src/config/database.js
 * -----------------------------
 * PURPOSE:
 *   Establishes and maintains the MongoDB connection using Mongoose.
 *   Implements an automatic retry loop so the app recovers if MongoDB is
 *   temporarily unavailable at startup (e.g. Atlas cold-start or container
 *   start-up ordering).
 *
 * RESPONSIBILITIES:
 *   1. Connect to MongoDB using the URI from the config module.
 *   2. Retry the connection up to 5 times with a 5-second delay between attempts.
 *   3. Crash the process if all retries are exhausted (let the process manager restart).
 *   4. Configure Mongoose's global toJSON transform to:
 *        - Include virtual fields in JSON output.
 *        - Strip the __v (version key) field from all responses.
 *   5. Log disconnection events so ops teams can detect network drops.
 *
 * DEPENDENCIES:
 *   - mongoose      : MongoDB ODM library
 *   - ./index       : Config module (provides mongodbUri)
 *
 * USED BY:
 *   - src/app.js    : Called once at application startup via connectDB()
 */

const mongoose = require('mongoose'); // MongoDB ODM (Object Document Mapper)
const config   = require('./index');  // App config (provides mongodbUri)

// ── Global Mongoose Transform ─────────────────────────────────────────────
// This setting applies to ALL models. When .toJSON() is called (automatically
// by Express res.json()), Mongoose will:
//   - virtuals: true  → include computed virtual properties (e.g. fullName)
//   - versionKey: false → remove __v field from every document
mongoose.set('toJSON', { virtuals: true, versionKey: false });

/**
 * connectDB()
 * -----------
 * Attempts to connect to MongoDB. If connection fails it waits 5 seconds
 * and retries. After 5 failed attempts it calls process.exit(1) so the
 * container/process-manager restarts the app.
 *
 * @param {number} retries - Number of connection attempts remaining (default 5)
 * @returns {Promise<mongoose.Connection>} Resolves when connected
 */
const connectDB = async (retries = 5) => {
  while (retries) {                          // Keep trying as long as retries remain
    try {
      const conn = await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 5000,      // Give up selecting a server after 5 seconds
      });
      console.log(`MongoDB connected: ${conn.connection.host}`); // Log the host we connected to
      return conn;                           // Return the connection object on success
    } catch (error) {
      console.error('MongoDB connection error:', error.message); // Log the failure reason
      retries -= 1;                          // Decrement the retry counter
      console.log(`Retries left: ${retries}`); // Tell the operator how many tries remain
      if (retries === 0) {
        // No retries left — crash so the process manager restarts us
        console.error('MongoDB connection failed after retries. Exiting...');
        process.exit(1);                     // Exit code 1 signals failure to the OS
      }
      // Wait 5 seconds before the next connection attempt
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

// ── Disconnection Event Listener ──────────────────────────────────────────
// Mongoose emits 'disconnected' when the connection is lost after it was
// established (e.g. network blip or Atlas maintenance).
// We log it so the issue appears in application logs / monitoring dashboards.
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected!'); // Alert ops — connection was lost
});

module.exports = connectDB; // Export the async connect function for use in app.js
