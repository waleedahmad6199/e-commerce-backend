/**
 * FILE: src/routes/contactRoutes.js
 * -----------------------------------
 * PURPOSE:
 *   Defines the single HTTP route for the public contact form.
 *   Mounted at /api/contact in app.js.
 *
 * ROUTES:
 *   POST /api/contact  — submit a contact form message
 *     Body: { name, email, subject, message }
 *     No authentication required — any visitor can use the contact form.
 *     ContactController validates that all fields are present, then
 *     EmailService sends the message to the admin's configured contact email.
 *
 * DEPENDENCIES:
 *   - controllers/ContactController.js
 */

const express            = require('express');
const router             = express.Router();
const contactController  = require('../controllers/ContactController'); // Form submission handler

// POST /api/contact — publicly accessible contact form submission
router.post('/', contactController.submitContactForm);

module.exports = router;
