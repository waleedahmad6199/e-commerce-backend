/**
 * FILE: src/services/EmailService.js
 * -------------------------------------
 * PURPOSE:
 *   Transactional email sending service using Nodemailer.
 *   Reads SMTP configuration from the database (SmtpConfig collection) at
 *   send-time so admins can update credentials without a server restart.
 *
 * EMAIL TYPES:
 *   - sendContactEmail()      : Contact form submission → admin inbox
 *   - sendVerificationEmail() : 6-digit OTP for email verification
 *   - sendPasswordResetEmail(): 6-digit OTP for password reset
 *
 * HOW SMTP CONFIG WORKS:
 *   1. Admin creates an SmtpConfig document via the admin settings panel.
 *   2. getActiveConfig() finds the document where isActive=true AND isDefault=true.
 *   3. A Nodemailer transporter is created from those credentials.
 *   4. If no SMTP config exists, the call throws ApiError(500) with a clear message.
 *
 * DEPENDENCIES:
 *   - nodemailer       : SMTP email sending library
 *   - models/SmtpConfig.js
 *   - models/WebsiteSetting.js (reads 'contact_email' for admin destination)
 *   - utils/ApiError.js
 *
 * USED BY:
 *   - src/controllers/ContactController.js (contact form)
 *   - src/services/AuthService.js          (password reset — future)
 */
const nodemailer     = require('nodemailer');        // SMTP email transport
const SmtpConfig = require('../models/SmtpConfig');
const WebsiteSetting = require('../models/WebsiteSetting');
const ApiError = require('../utils/ApiError');

class EmailService {
  async getActiveConfig() {
    const config = await SmtpConfig.findOne({ isActive: true, isDefault: true }).lean() 
      || await SmtpConfig.findOne({ isActive: true }).lean();
    
    if (!config) {
      throw new ApiError(500, 'SMTP configuration is not set up.');
    }
    return config;
  }

  async getTransporter(config) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.useSsl,
      auth: {
        user: config.username,
        pass: config.passwordEncrypted,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async getAdminEmail() {
    const setting = await WebsiteSetting.findOne({ settingKey: 'contact_email' }).lean();
    return setting && setting.settingValue ? setting.settingValue : null;
  }

  async sendContactEmail({ name, email, subject, message }) {
    const adminEmail = await this.getAdminEmail();
    if (!adminEmail) {
      throw new ApiError(500, 'Admin contact email is not configured in settings.');
    }

    const config = await this.getActiveConfig();
    const transporter = await this.getTransporter(config);

    const senderEmail = config.senderEmail || config.username;

    const mailOptions = {
      from: `"${name} (Contact Form)" <${senderEmail}>`,
      to: adminEmail,
      replyTo: email,
      subject: `New Contact Form Submission: ${subject}`,
      text: `You have received a new message from the contact form.\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
    };

    return transporter.sendMail(mailOptions);
  }

  async sendVerificationEmail(email, code) {
    const config = await this.getActiveConfig();
    const transporter = await this.getTransporter(config);
    const senderEmail = config.senderEmail || config.username;

    const mailOptions = {
      from: `"Store Authentication" <${senderEmail}>`,
      to: email,
      subject: `Your Verification Code: ${code}`,
      text: `Hello,\n\nYour 6-digit verification code is: ${code}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Verify your email address</h2>
              <p>Your 6-digit verification code is:</p>
              <h1 style="font-size: 32px; letter-spacing: 4px; color: #4F46E5; background: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px;">${code}</h1>
              <p>This code is valid for 10 minutes.</p>
              <p style="color: #6B7280; font-size: 14px;">If you did not request this code, you can safely ignore this email.</p>
            </div>`
    };

    return transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email, code) {
    const config = await this.getActiveConfig();
    const transporter = await this.getTransporter(config);
    const senderEmail = config.senderEmail || config.username;

    const mailOptions = {
      from: `"Store Security" <${senderEmail}>`,
      to: email,
      subject: 'Password Reset Code',
      text: `Hello,\n\nYou requested to reset your password. Your 6-digit password reset code is:\n\n${code}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reset Your Password</h2>
              <p>You recently requested to reset your password. Use the following 6-digit code to securely change your password:</p>
              <h1 style="font-size: 32px; letter-spacing: 4px; color: #4F46E5; background: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px;">${code}</h1>
              <p>This code is valid for 10 minutes.</p>
              <p style="color: #6B7280; font-size: 14px;">If you did not request a password reset, you can safely ignore this email.</p>
            </div>`
    };

    return transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();
