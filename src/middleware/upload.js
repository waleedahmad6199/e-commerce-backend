/**
 * FILE: src/middleware/upload.js
 * -------------------------------
 * PURPOSE:
 *   Configures the multer middleware for handling multipart/form-data file
 *   uploads to the local filesystem. This is the default upload middleware used
 *   when Cloudinary is not configured.
 *
 * WHAT IT DOES:
 *   1. Ensures the /uploads directory exists on disk (creates it if missing).
 *   2. Stores uploaded files on disk using a sanitized, timestamped filename.
 *   3. Rejects files that are not JPEG, PNG, WEBP, or GIF (returns 400).
 *   4. Limits individual file size to 5 MB and batch uploads to 10 files.
 *
 * FILE NAMING:
 *   Pattern: <timestamp>-<sanitized-original-name>.<ext>
 *   Example: 1700000000000-my_product_photo.jpg
 *   - Timestamp ensures uniqueness even if two identical filenames are uploaded.
 *   - Sanitization strips special characters that could cause path-traversal issues.
 *
 * DEPENDENCIES:
 *   - multer      : Multipart form-data parser and file storage engine
 *   - path        : Node.js built-in — path joining and extension extraction
 *   - fs          : Node.js built-in — directory existence check / creation
 *   - ../utils/ApiError : Custom error class for consistent error formatting
 *
 * USED BY:
 *   - src/routes/uploadRoutes.js  (upload.array(), upload.single())
 */

const multer   = require('multer');                    // Multipart form-data parser
const path     = require('path');                      // Path utilities (join, extname, basename)
const fs       = require('fs');                        // Sync filesystem ops for directory check
const ApiError = require('../utils/ApiError');         // Consistent error class

// ── Ensure uploads directory exists ──────────────────────────────────────
// Build the absolute path to the /uploads folder relative to this middleware file.
// __dirname is the directory of THIS file (src/middleware), so we go up two levels.
const uploadDir = path.join(__dirname, '../../uploads');

// If the folder doesn't exist yet (fresh install / new server), create it
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // recursive: true creates parent dirs too
}

// ── Disk Storage Configuration ────────────────────────────────────────────
// multer.diskStorage() configures where files are stored and what they are named.
const storage = multer.diskStorage({
  // destination — which directory to save uploaded files to
  destination: (req, file, cb) => {
    cb(null, uploadDir); // cb(error, destinationPath) — null means no error
  },

  // filename — what to name the file on disk
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase(); // Extract extension (.jpg, .png, etc.)
    const base = path.basename(file.originalname, ext)          // Extract name without extension
      .replace(/[^a-zA-Z0-9_-]/g, '_')                          // Replace unsafe chars with underscores
      .slice(0, 60);                                             // Cap at 60 chars to avoid OS path limits
    cb(null, `${Date.now()}-${base}${ext}`);                     // e.g. 1700000000000-my_photo.jpg
  },
});

// ── File Type Filter ──────────────────────────────────────────────────────
// Only allow common web image formats. Reject everything else with a 400 error.
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',  // .jpg, .jpeg
    'image/jpg',   // some browsers report jpg with this mimetype
    'image/png',   // .png
    'image/webp',  // .webp — modern compressed format
    'image/gif',   // .gif — animated images
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);  // Accept the file (second arg = true means accept)
  } else {
    // Reject the file with a descriptive error — multer will pass this to errorHandler
    cb(new ApiError(400, `File type not allowed: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, GIF`), false);
  }
};

// ── Multer Instance ───────────────────────────────────────────────────────
// Create the configured multer instance with storage, filter, and size limits.
const upload = multer({
  storage,    // Use the disk storage config defined above
  fileFilter, // Use the MIME type whitelist filter defined above
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum file size: 5 MB (in bytes)
    files:    10,              // Maximum number of files per request
  },
});

module.exports = upload; // Export multer instance — used via upload.single() or upload.array()
