/**
 * FILE: src/controllers/CmsController.js
 * ----------------------------------------
 * PURPOSE:
 *   HTTP handlers for the CMS (Content Management System) endpoints.
 *   Manages pages, banners, announcement bars, popups, and homepage sections.
 *   Public read methods are called without auth; admin write methods are
 *   protected by requireAdmin in cmsRoutes.js.
 *
 * ROUTE FILE: src/routes/cmsRoutes.js (mounted at /api/cms)
 *
 * USED BY:
 *   - src/routes/cmsRoutes.js
 */
const cmsService  = require('../services/CmsService'); // CMS business logic
const ApiResponse = require('../utils/ApiResponse');   // Response envelope

const getHomepage = async (req, res, next) => {
  try {
    const data = await cmsService.getHomepage();
    res.status(200).json(ApiResponse.success(data, 'Homepage data retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getPageBySlug = async (req, res, next) => {
  try {
    const page = await cmsService.getPageBySlug(req.params.slug);
    res.status(200).json(ApiResponse.success(page, 'Page retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getAllPages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 20;
    const result = await cmsService.getAllPages(page, size);
    res.status(200).json(ApiResponse.success(result, 'Pages retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createPage = async (req, res, next) => {
  try {
    const page = await cmsService.createPage(req.body);
    res.status(201).json(ApiResponse.success(page, 'Page created successfully'));
  } catch (error) {
    next(error);
  }
};

const updatePage = async (req, res, next) => {
  try {
    const page = await cmsService.updatePage(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(page, 'Page updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deletePage = async (req, res, next) => {
  try {
    await cmsService.deletePage(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Page deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getBanners = async (req, res, next) => {
  try {
    const banners = await cmsService.getBanners();
    res.status(200).json(ApiResponse.success(banners, 'Banners retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getActiveBanners = async (req, res, next) => {
  try {
    const banners = await cmsService.getActiveBanners();
    res.status(200).json(ApiResponse.success(banners, 'Active banners retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getBannersByPosition = async (req, res, next) => {
  try {
    const banners = await cmsService.getBanners(req.params.position);
    res.status(200).json(ApiResponse.success(banners, 'Banners retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createBanner = async (req, res, next) => {
  try {
    const banner = await cmsService.createBanner(req.body);
    res.status(201).json(ApiResponse.success(banner, 'Banner created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateBanner = async (req, res, next) => {
  try {
    const banner = await cmsService.updateBanner(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(banner, 'Banner updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    await cmsService.deleteBanner(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Banner deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await cmsService.getAnnouncements();
    res.status(200).json(ApiResponse.success(announcements, 'Announcements retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getActiveAnnouncements = async (req, res, next) => {
  try {
    const announcements = await cmsService.getActiveAnnouncements();
    res.status(200).json(ApiResponse.success(announcements, 'Active announcements retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await cmsService.createAnnouncement(req.body);
    res.status(201).json(ApiResponse.success(announcement, 'Announcement created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await cmsService.updateAnnouncement(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(announcement, 'Announcement updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    await cmsService.deleteAnnouncement(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Announcement deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getPopups = async (req, res, next) => {
  try {
    const popups = await cmsService.getPopups();
    res.status(200).json(ApiResponse.success(popups, 'Popups retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const getActivePopups = async (req, res, next) => {
  try {
    const popups = await cmsService.getActivePopups();
    res.status(200).json(ApiResponse.success(popups, 'Active popups retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createPopup = async (req, res, next) => {
  try {
    const popup = await cmsService.createPopup(req.body);
    res.status(201).json(ApiResponse.success(popup, 'Popup created successfully'));
  } catch (error) {
    next(error);
  }
};

const updatePopup = async (req, res, next) => {
  try {
    const popup = await cmsService.updatePopup(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(popup, 'Popup updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deletePopup = async (req, res, next) => {
  try {
    await cmsService.deletePopup(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Popup deleted successfully'));
  } catch (error) {
    next(error);
  }
};

const getHomepageSections = async (req, res, next) => {
  try {
    const sections = await cmsService.getHomepageSections();
    res.status(200).json(ApiResponse.success(sections, 'Homepage sections retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const createHomepageSection = async (req, res, next) => {
  try {
    const section = await cmsService.createHomepageSection(req.body);
    res.status(201).json(ApiResponse.success(section, 'Homepage section created successfully'));
  } catch (error) {
    next(error);
  }
};

const updateHomepageSection = async (req, res, next) => {
  try {
    const section = await cmsService.updateHomepageSection(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(section, 'Homepage section updated successfully'));
  } catch (error) {
    next(error);
  }
};

const deleteHomepageSection = async (req, res, next) => {
  try {
    await cmsService.deleteHomepageSection(req.params.id);
    res.status(200).json(ApiResponse.success(null, 'Homepage section deleted successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHomepage,
  getPageBySlug,
  getAllPages,
  createPage,
  updatePage,
  deletePage,
  getBanners,
  getActiveBanners,
  getBannersByPosition,
  createBanner,
  updateBanner,
  deleteBanner,
  getAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getPopups,
  getActivePopups,
  createPopup,
  updatePopup,
  deletePopup,
  getHomepageSections,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
};
