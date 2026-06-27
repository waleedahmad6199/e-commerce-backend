/**
 * FILE: src/services/CmsService.js
 * ----------------------------------
 * PURPOSE:
 *   Business logic for all CMS (Content Management System) operations.
 *   Manages five content types: pages, banners, announcement bars,
 *   popups, and homepage sections.
 *
 * SCHEDULING:
 *   getActiveBanners(), getActiveAnnouncements(), getActivePopups() all filter
 *   using the same scheduling logic:
 *     isActive=true
 *     AND (startsAt is null OR startsAt <= now)
 *     AND (expiresAt is null OR expiresAt >= now)
 *   This enables admins to pre-schedule promotions without manual intervention.
 *
 * SYSTEM PAGE PROTECTION:
 *   deletePage() throws ApiError(400) if page.isSystem=true, preventing
 *   deletion of core pages (About, Privacy Policy, Terms, etc.) via the API.
 *
 * DEPENDENCIES:
 *   - models/HomepageSection.js
 *   - models/CmsPage.js
 *   - models/Banner.js
 *   - models/AnnouncementBar.js
 *   - models/Popup.js
 *   - utils/ApiError.js
 *
 * USED BY:
 *   - src/controllers/CmsController.js
 */
const HomepageSection = require('../models/HomepageSection'); // Homepage section configs
const CmsPage         = require('../models/CmsPage');         // Content pages
const Banner          = require('../models/Banner');           // Promotional banners
const AnnouncementBar = require('../models/AnnouncementBar'); // Top announcement bars
const Popup           = require('../models/Popup');           // Overlay popups
const ApiError        = require('../utils/ApiError');         // Custom error class

class CmsService {
  async getHomepage() {
    const [sections, banners, announcements, popups] = await Promise.all([
      HomepageSection.find({ isActive: true }).sort({ sortOrder: 1 }),
      this.getActiveBanners(),
      this.getActiveAnnouncements(),
      this.getActivePopups(),
    ]);
    return { sections, banners, announcements, popups };
  }

  async getPageBySlug(slug) {
    const page = await CmsPage.findOne({ slug, status: 'published' });
    if (!page) throw new ApiError(404, 'Page not found');
    return page;
  }

  async getAllPages(page = 0, size = 20) {
    const skip = page * size;
    const [pages, total] = await Promise.all([
      CmsPage.find().sort({ createdAt: -1 }).skip(skip).limit(size),
      CmsPage.countDocuments(),
    ]);
    return {
      content: pages,
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      first: page === 0,
      last: (page + 1) * size >= total,
    };
  }

  async createPage(data) {
    return CmsPage.create(data);
  }

  async updatePage(id, data) {
    const page = await CmsPage.findById(id);
    if (!page) throw new ApiError(404, 'Page not found');
    if (data.title !== undefined) page.title = data.title;
    if (data.slug !== undefined) page.slug = data.slug;
    if (data.content !== undefined) page.content = data.content;
    if (data.metaTitle !== undefined) page.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) page.metaDescription = data.metaDescription;
    if (data.layout !== undefined) page.layout = data.layout;
    if (data.status !== undefined) page.status = data.status;
    await page.save();
    return page;
  }

  async deletePage(id) {
    const page = await CmsPage.findById(id);
    if (!page) throw new ApiError(404, 'Page not found');
    if (page.isSystem) throw new ApiError(400, 'Cannot delete system page');
    await CmsPage.deleteOne({ _id: id });
  }

  async getBanners(position) {
    const filter = position ? { position } : {};
    return Banner.find(filter).sort({ sortOrder: 1 });
  }

  async getActiveBanners() {
    const now = new Date();
    return Banner.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    })
      .sort({ sortOrder: 1 });
  }

  async createBanner(data) {
    return Banner.create(data);
  }

  async updateBanner(id, data) {
    const banner = await Banner.findById(id);
    if (!banner) throw new ApiError(404, 'Banner not found');
    if (data.title !== undefined) banner.title = data.title;
    if (data.subtitle !== undefined) banner.subtitle = data.subtitle;
    if (data.imageUrl !== undefined) banner.imageUrl = data.imageUrl;
    if (data.mobileImageUrl !== undefined) banner.mobileImageUrl = data.mobileImageUrl;
    if (data.linkUrl !== undefined) banner.linkUrl = data.linkUrl;
    if (data.linkText !== undefined) banner.linkText = data.linkText;
    if (data.position !== undefined) banner.position = data.position;
    if (data.sortOrder !== undefined) banner.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) banner.isActive = data.isActive;
    if (data.startsAt !== undefined) banner.startsAt = data.startsAt;
    if (data.expiresAt !== undefined) banner.expiresAt = data.expiresAt;
    await banner.save();
    return banner;
  }

  async deleteBanner(id) {
    const banner = await Banner.findById(id);
    if (!banner) throw new ApiError(404, 'Banner not found');
    await Banner.deleteOne({ _id: id });
  }

  async getAnnouncements() {
    return AnnouncementBar.find().sort({ createdAt: -1 });
  }

  async getActiveAnnouncements() {
    const now = new Date();
    return AnnouncementBar.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    });
  }

  async createAnnouncement(data) {
    return AnnouncementBar.create(data);
  }

  async updateAnnouncement(id, data) {
    const announcement = await AnnouncementBar.findById(id);
    if (!announcement) throw new ApiError(404, 'Announcement not found');
    if (data.text !== undefined) announcement.text = data.text;
    if (data.linkUrl !== undefined) announcement.linkUrl = data.linkUrl;
    if (data.linkText !== undefined) announcement.linkText = data.linkText;
    if (data.backgroundColor !== undefined) announcement.backgroundColor = data.backgroundColor;
    if (data.textColor !== undefined) announcement.textColor = data.textColor;
    if (data.isActive !== undefined) announcement.isActive = data.isActive;
    if (data.startsAt !== undefined) announcement.startsAt = data.startsAt;
    if (data.expiresAt !== undefined) announcement.expiresAt = data.expiresAt;
    await announcement.save();
    return announcement;
  }

  async deleteAnnouncement(id) {
    const announcement = await AnnouncementBar.findById(id);
    if (!announcement) throw new ApiError(404, 'Announcement not found');
    await AnnouncementBar.deleteOne({ _id: id });
  }

  async getPopups() {
    return Popup.find().sort({ createdAt: -1 });
  }

  async getActivePopups() {
    const now = new Date();
    return Popup.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    });
  }

  async createPopup(data) {
    return Popup.create(data);
  }

  async updatePopup(id, data) {
    const popup = await Popup.findById(id);
    if (!popup) throw new ApiError(404, 'Popup not found');
    if (data.title !== undefined) popup.title = data.title;
    if (data.content !== undefined) popup.content = data.content;
    if (data.imageUrl !== undefined) popup.imageUrl = data.imageUrl;
    if (data.buttonText !== undefined) popup.buttonText = data.buttonText;
    if (data.buttonUrl !== undefined) popup.buttonUrl = data.buttonUrl;
    if (data.triggerType !== undefined) popup.triggerType = data.triggerType;
    if (data.delaySeconds !== undefined) popup.delaySeconds = data.delaySeconds;
    if (data.frequency !== undefined) popup.frequency = data.frequency;
    if (data.isActive !== undefined) popup.isActive = data.isActive;
    if (data.startsAt !== undefined) popup.startsAt = data.startsAt;
    if (data.expiresAt !== undefined) popup.expiresAt = data.expiresAt;
    await popup.save();
    return popup;
  }

  async deletePopup(id) {
    const popup = await Popup.findById(id);
    if (!popup) throw new ApiError(404, 'Popup not found');
    await Popup.deleteOne({ _id: id });
  }

  async getHomepageSections() {
    return HomepageSection.find().sort({ sortOrder: 1 });
  }

  async createHomepageSection(data) {
    return HomepageSection.create(data);
  }

  async updateHomepageSection(id, data) {
    const section = await HomepageSection.findById(id);
    if (!section) throw new ApiError(404, 'Homepage section not found');
    if (data.sectionKey !== undefined) section.sectionKey = data.sectionKey;
    if (data.title !== undefined) section.title = data.title;
    if (data.subtitle !== undefined) section.subtitle = data.subtitle;
    if (data.type !== undefined) section.type = data.type;
    if (data.config !== undefined) section.config = data.config;
    if (data.sortOrder !== undefined) section.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) section.isActive = data.isActive;
    await section.save();
    return section;
  }

  async deleteHomepageSection(id) {
    const section = await HomepageSection.findById(id);
    if (!section) throw new ApiError(404, 'Homepage section not found');
    await HomepageSection.deleteOne({ _id: id });
  }
}

module.exports = new CmsService();
