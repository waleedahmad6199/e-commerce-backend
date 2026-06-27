/**
 * FILE: src/routes/uploadRoutes.js
 * ------------------------------------
 * PURPOSE:
 *   Defines all HTTP routes for file uploads and exports two routers:
 *   - uploadRouter           : general-purpose upload endpoints (/api/upload/*)
 *   - adminProductUploadRouter: specialised product image upload with processing
 *
 * ROUTER 1 — uploadRouter (mounted at /api/upload):
 *   POST /api/upload/multiple — upload up to 10 files to disk (admin only)
 *   POST /api/upload/single   — upload 1 file to disk (admin only)
 *   POST /api/upload/user     — upload 1 file to disk (any authenticated user)
 *   POST /api/upload/image    — upload 1 image to Cloudinary or disk (auth user)
 *   POST /api/upload/video    — upload 1 video to Cloudinary or disk (auth user)
 *   POST /api/upload/url      — upload from remote URL to Cloudinary (auth user)
 *
 * ROUTER 2 — adminProductUploadRouter (mounted at /api/admin/products):
 *   POST /api/admin/products/upload-image — upload product image with processing:
 *     - Accepts file via memory storage (no disk write)
 *     - Runs through ImageProcessor (validate + resize to main + thumbnail + WebP)
 *     - Uploads both variants to Cloudinary (or saves locally if not configured)
 *     - Returns { image: { original, thumbnail } } with URLs
 *
 * VIDEO UPLOAD CONFIG:
 *   Video uses a separate multer instance with:
 *   - Allowed types: MP4, MPEG, MOV, AVI, WebM
 *   - Max size: 100MB
 *   - Stored to disk (same /uploads directory)
 *
 * DEPENDENCIES:
 *   - middleware/upload.js        (disk storage multer for images)
 *   - middleware/uploadMiddleware.js (memory storage multer for product images)
 *   - controllers/UploadController.js
 *   - middleware/auth.js
 */

const express      = require('express');          // HTTP router
const path         = require('path');              // Path utilities
const fs           = require('fs');                // Sync filesystem check
const multer       = require('multer');            // Multipart form-data parser
const upload       = require('../middleware/upload'); // Disk storage multer (images)

const {
  uploadFiles, uploadSingle, uploadImage,
  uploadVideo, uploadFromUrl, uploadProductImage,
} = require('../controllers/UploadController');    // Upload handler functions

const { authenticateUser, requireAdmin } = require('../middleware/auth'); // JWT guards

const { uploadProductImage: productImageUpload } = require('../middleware/uploadMiddleware'); // Memory multer

const ApiError = require('../utils/ApiError');     // Custom error class

const uploadRouter = express.Router(); // General upload router

// Multer config for video uploads (disk storage)
const videoDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const videoFilter = (req, file, cb) => {
  const allowed = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Video type not allowed: ${file.mimetype}. Allowed: MP4, MPEG, MOV, AVI, WEBM`), false);
  }
};

const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

// Existing upload routes
uploadRouter.post('/multiple', authenticateUser, requireAdmin, upload.array('files', 10), uploadFiles);
uploadRouter.post('/single', authenticateUser, requireAdmin, upload.single('file'), uploadSingle);
uploadRouter.post('/user', authenticateUser, upload.single('file'), uploadSingle);

// Cloudinary routes
uploadRouter.post('/image', authenticateUser, upload.single('image'), uploadImage);
uploadRouter.post('/video', authenticateUser, videoUpload.single('video'), uploadVideo);
uploadRouter.post('/url', authenticateUser, express.json(), uploadFromUrl);

// ── Admin Product Upload Router ──────────────────────────────────────────

const adminProductUploadRouter = express.Router();

adminProductUploadRouter.post(
  '/upload-image',
  authenticateUser,
  requireAdmin,
  productImageUpload.single('image'),
  uploadProductImage
);

module.exports = { uploadRouter, adminProductUploadRouter };
