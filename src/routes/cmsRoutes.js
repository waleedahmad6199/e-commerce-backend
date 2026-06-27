/**
 * FILE: src/routes/cmsRoutes.js
 * --------------------------------
 * PURPOSE:
 *   Defines HTTP routes for the Content Management System (CMS).
 *   Manages pages, banners, announcements, popups, and homepage sections.
 *   Mounted at /api/cms in app.js.
 *
 * ACCESS PATTERN:
 *   - Public read routes: homepage data, active banners/announcements/popups,
 *     public page by slug, and homepage sections — no auth required.
 *   - Admin management routes: CRUD for all CMS entities — require admin JWT.
 *
 * DEPENDENCIES:
 *   - controllers/CmsController.js
 *   - middleware/auth.js
 */

const express        = require('express');
const router         = express.Router();
const cmsController  = require('../controllers/CmsController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// ── Public Read Routes ──────────────────────────────────────────────────────

// GET /api/cms/homepage             — returns banners + announcements + popups + sections bundle
router.get('/homepage', cmsController.getHomepage);

// GET /api/cms/pages/public/:slug   — returns a single published CMS page by its URL slug
router.get('/pages/public/:slug', cmsController.getPageBySlug);

// GET /api/cms/banners/active       — returns currently active (scheduled + isActive) banners
router.get('/banners/active', cmsController.getActiveBanners);

// GET /api/cms/banners/position/:position — returns active banners for a specific display position
router.get('/banners/position/:position', cmsController.getBannersByPosition);

// GET /api/cms/announcements/active — returns currently active announcement bar messages
router.get('/announcements/active', cmsController.getActiveAnnouncements);

// GET /api/cms/popups/active        — returns currently active popup configurations
router.get('/popups/active', cmsController.getActivePopups);

// GET /api/cms/sections             — returns all active homepage sections (sorted by sortOrder)
router.get('/sections', cmsController.getHomepageSections);

// ── Admin CMS Management ─────────────────────────────────────────────────────

// Pages
router.get('/pages', authenticateUser, requireAdmin, cmsController.getAllPages);
router.post('/pages', authenticateUser, requireAdmin, cmsController.createPage);
router.put('/pages/:id', authenticateUser, requireAdmin, cmsController.updatePage);
router.delete('/pages/:id', authenticateUser, requireAdmin, cmsController.deletePage);

// Banners
router.get('/banners', authenticateUser, requireAdmin, cmsController.getBanners);
router.post('/banners', authenticateUser, requireAdmin, cmsController.createBanner);
router.put('/banners/:id', authenticateUser, requireAdmin, cmsController.updateBanner);
router.delete('/banners/:id', authenticateUser, requireAdmin, cmsController.deleteBanner);

// Announcements
router.get('/announcements', authenticateUser, requireAdmin, cmsController.getAnnouncements);
router.post('/announcements', authenticateUser, requireAdmin, cmsController.createAnnouncement);
router.put('/announcements/:id', authenticateUser, requireAdmin, cmsController.updateAnnouncement);
router.delete('/announcements/:id', authenticateUser, requireAdmin, cmsController.deleteAnnouncement);

// Popups
router.get('/popups', authenticateUser, requireAdmin, cmsController.getPopups);
router.post('/popups', authenticateUser, requireAdmin, cmsController.createPopup);
router.put('/popups/:id', authenticateUser, requireAdmin, cmsController.updatePopup);
router.delete('/popups/:id', authenticateUser, requireAdmin, cmsController.deletePopup);

// Homepage Sections
router.post('/sections', authenticateUser, requireAdmin, cmsController.createHomepageSection);
router.put('/sections/:id', authenticateUser, requireAdmin, cmsController.updateHomepageSection);
router.delete('/sections/:id', authenticateUser, requireAdmin, cmsController.deleteHomepageSection);

module.exports = router;
