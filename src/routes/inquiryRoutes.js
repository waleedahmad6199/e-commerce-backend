/**
 * FILE: src/routes/inquiryRoutes.js
 * ------------------------------------
 * PURPOSE:
 *   Defines HTTP routes for product/service inquiry management.
 *   Mounted at /api/inquiries in app.js.
 *
 * ACCESS PATTERN:
 *   - POST /  is PUBLIC — any visitor can submit an inquiry without logging in.
 *   - GET / and PATCH /:id/status are ADMIN-ONLY — managed via admin panel.
 *
 * MIDDLEWARE NOTE:
 *   router.use(requireAdmin) applies requireAdmin to ALL routes defined after
 *   that line in this file. POST / is defined before it, so it remains public.
 *   GET / and PATCH /:id/status are defined after it, so they require admin auth.
 *
 * ROUTES:
 *   POST   /api/inquiries            — submit a product inquiry (public)
 *   GET    /api/inquiries            — list all inquiries, paginated (admin)
 *   PATCH  /api/inquiries/:id/status — update inquiry status (admin)
 *
 * DEPENDENCIES:
 *   - controllers/InquiryController.js
 *   - middleware/auth.js (requireAdmin)
 */

const express            = require('express');
const router             = express.Router();
const inquiryController  = require('../controllers/InquiryController'); // Inquiry handlers
const { requireAdmin }   = require('../middleware/auth');                // Admin JWT guard

// POST /api/inquiries — public inquiry submission (no auth required)
router.post('/', inquiryController.createInquiry);

// Everything below this line requires admin authentication
router.use(requireAdmin);

// GET /api/inquiries — paginated list of all submitted inquiries
router.get('/', inquiryController.getAllInquiries);

// PATCH /api/inquiries/:id/status — update the status of an inquiry
router.patch('/:id/status', inquiryController.updateInquiryStatus);

module.exports = router;
