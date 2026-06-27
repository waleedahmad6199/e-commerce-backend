/**
 * FILE: src/controllers/ContactController.js
 * --------------------------------------------
 * PURPOSE:
 *   HTTP handler for the public contact form submission.
 *   Validates that all required fields are present, then delegates to
 *   EmailService to send the message to the admin's configured contact email.
 *
 * ROUTE FILE: src/routes/contactRoutes.js (mounted at /api/contact)
 *
 * USED BY:
 *   - src/routes/contactRoutes.js
 */
const emailService = require('../services/EmailService'); // Handles actual email sending
const ApiResponse  = require('../utils/ApiResponse');     // Response envelope
const ApiError     = require('../utils/ApiError');        // Custom error class

const submitContactForm = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      throw new ApiError(400, 'All fields (name, email, subject, message) are required.');
    }

    await emailService.sendContactEmail({ name, email, subject, message });

    res.status(200).json(ApiResponse.success(null, 'Your message has been sent successfully.'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContactForm
};
