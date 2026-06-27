/**
 * FILE: src/models/SmtpConfig.js
 * ---------------------------------
 * PURPOSE:
 *   Mongoose schema for the `smtpconfigs` collection.
 *   Stores SMTP email server configuration so admins can set up transactional
 *   email delivery from the admin panel without touching code or env vars.
 *
 * HOW IT IS USED:
 *   EmailService.getActiveConfig() finds the document where isActive=true
 *   AND isDefault=true to create a Nodemailer transporter on every email send.
 *   If no active config exists, EmailService throws ApiError(500).
 *
 * SETUP INSTRUCTIONS:
 *   1. Log in to the admin panel.
 *   2. Go to Settings → System → SMTP Configuration.
 *   3. Add your SMTP server credentials (Gmail, SendGrid, Mailgun, etc.).
 *   4. Set isDefault=true and isActive=true.
 *
 * SECURITY NOTE:
 *   passwordEncrypted stores the SMTP password. In production this should be
 *   encrypted at rest. Currently stored as plain text — rotate credentials
 *   and apply field-level encryption for production hardening.
 *
 * USED BY:
 *   - src/services/EmailService.js  (getActiveConfig, getTransporter)
 *   - src/services/SettingsService.js (getSmtpConfigs, updateSmtpConfig)
 */
const mongoose = require('mongoose');

const smtpConfigSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true,
  },
  port: {
    type: Number,
    default: 587,
  },
  username: String,
  passwordEncrypted: String,
  senderName: String,
  senderEmail: {
    type: String,
    required: true,
  },
  useTls: {
    type: Boolean,
    default: true,
  },
  useSsl: {
    type: Boolean,
    default: false,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SmtpConfig', smtpConfigSchema);
