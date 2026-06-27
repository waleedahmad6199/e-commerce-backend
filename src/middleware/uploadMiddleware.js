/**
 * FILE: src/middleware/uploadMiddleware.js
 * ------------------------------------------
 * PURPOSE:
 *   Multer configuration for in-memory product image uploads.
 *   Unlike the disk-storage upload.js middleware, this stores files in memory
 *   as a Buffer (req.file.buffer) so ImageProcessor can process them
 *   immediately without reading from disk.
 *
 * DIFFERENCE FROM upload.js:
 *   - upload.js        : disk storage, for general file uploads (/api/upload/*)
 *   - uploadMiddleware : memory storage, for product images that need ImageProcessor
 *
 * VALIDATION:
 *   - Allowed MIME types: JPEG, JPG, PNG, WebP (no GIF — product images only)
 *   - Maximum file size: 10 MB (larger than upload.js's 5MB to allow high-res product shots)
 *   - Single file only (files: 1)
 *
 * USED BY:
 *   - src/routes/uploadRoutes.js (adminProductUploadRouter — POST /api/admin/products/upload-image)
 */
const multer   = require('multer');                  // Multipart form-data parser
const ApiError = require('../utils/ApiError');       // Custom error class

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid file type "${file.mimetype}". Allowed: JPEG, PNG, WebP`), false);
  }
};

const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

module.exports = { uploadProductImage, ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
