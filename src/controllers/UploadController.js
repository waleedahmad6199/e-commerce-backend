/**
 * FILE: src/controllers/UploadController.js
 * -------------------------------------------
 * PURPOSE:
 *   HTTP handlers for all file upload endpoints.
 *   Supports four upload modes depending on the request type:
 *     1. uploadFiles()        — multiple files to disk (general batch upload)
 *     2. uploadSingle()       — single file to disk (general single upload)
 *     3. uploadImage()        — single image, to Cloudinary or disk fallback
 *     4. uploadVideo()        — single video, to Cloudinary or disk fallback
 *     5. uploadFromUrl()      — fetch a remote URL and upload to Cloudinary
 *     6. uploadProductImage() — memory buffer → ImageProcessor → Cloudinary or disk
 *
 * CLOUDINARY FALLBACK:
 *   Every upload handler checks config.cloudinary.enabled first.
 *   If Cloudinary is configured → upload to Cloudinary CDN, return secure_url.
 *   If not configured → save to local /uploads/ directory, return localhost URL.
 *   This means the same code works in development (no Cloudinary) and production.
 *
 * PRODUCT IMAGE PROCESSING:
 *   uploadProductImage() runs the uploaded buffer through ImageProcessor which:
 *   1. Validates minimum resolution (800×800px)
 *   2. Creates a 1600px main variant and 400px thumbnail variant
 *   3. Converts both to WebP for optimal size
 *   Then uploads both variants (or saves locally if Cloudinary not configured).
 *   Returns { image: { original: { url, width, height }, thumbnail: { url } } }
 *
 * TEMP FILE CLEANUP:
 *   After Cloudinary uploads, the temporary local file is deleted via fs.unlink().
 *   Errors are silently swallowed with .catch(() => {}) to avoid failing the response.
 *
 * ROUTE FILE: src/routes/uploadRoutes.js
 *   - POST /api/upload/multiple      → uploadFiles (disk, admin only)
 *   - POST /api/upload/single        → uploadSingle (disk, admin only)
 *   - POST /api/upload/user          → uploadSingle (disk, any auth user)
 *   - POST /api/upload/image         → uploadImage (Cloudinary or disk, auth user)
 *   - POST /api/upload/video         → uploadVideo (Cloudinary or disk, auth user)
 *   - POST /api/upload/url           → uploadFromUrl (Cloudinary only, auth user)
 *   - POST /api/admin/products/upload-image → uploadProductImage (admin only)
 *
 * DEPENDENCIES:
 *   - cloudinary v2
 *   - sharp (via ImageProcessor)
 *   - services/imageProcessor.js
 *   - services/cloudinaryService.js
 *   - utils/ApiResponse.js, ApiError.js, helpers.js
 *   - config/index.js
 */
const path                    = require('path');             // Node.js path utilities
const fs                      = require('fs').promises;      // Async filesystem operations
const cloudinary              = require('cloudinary').v2;    // Cloudinary SDK for URL uploads
const sharp                   = require('sharp');            // Image processing
const ApiResponse             = require('../utils/ApiResponse');  // Response envelope
const ApiError                = require('../utils/ApiError');     // Custom error class
const config                  = require('../config');             // App configuration
const { ImageProcessor }      = require('../services/imageProcessor');    // Image resize + WebP
const { CloudinaryUploadService } = require('../services/cloudinaryService'); // Buffer upload
const { generateUUID }        = require('../utils/helpers');      // UUID for local filenames

if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

const baseUrl = () => config.uploadBaseUrl || `http://localhost:${config.port}`;

const uploadToCloudinary = (filePath, options = {}) => {
  return cloudinary.uploader.upload(filePath, {
    folder: 'ecommerce',
    resource_type: 'auto',
    ...options,
  });
};

/**
 * Upload one or more files.
 * Returns an array of public URLs for each uploaded file.
 */
const uploadFiles = (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(ApiResponse.error('No files were uploaded', 'NO_FILES'));
    }

    const urls = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `${baseUrl()}/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(201).json(ApiResponse.success(urls, `${urls.length} file(s) uploaded successfully`));
  } catch (error) {
    next(error);
  }
};

const uploadSingle = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('No file was uploaded', 'NO_FILE'));
    }

    const result = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `${baseUrl()}/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };

    res.status(201).json(ApiResponse.success(result, 'File uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('No image file was uploaded', 'NO_FILE'));
    }

    if (config.cloudinary.enabled) {
      const result = await uploadToCloudinary(req.file.path, { resource_type: 'image' });
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(201).json(ApiResponse.success({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      }, 'Image uploaded to Cloudinary'));
    }

    const result = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `${baseUrl()}/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };

    res.status(201).json(ApiResponse.success(result, 'Image uploaded locally (Cloudinary not configured)'));
  } catch (error) {
    next(error);
  }
};

const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('No video file was uploaded', 'NO_FILE'));
    }

    if (config.cloudinary.enabled) {
      const result = await uploadToCloudinary(req.file.path, {
        resource_type: 'video',
        eager: [{ width: 640, height: 360, crop: 'pad' }],
        eager_async: true,
      });
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(201).json(ApiResponse.success({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        duration: result.duration,
      }, 'Video uploaded to Cloudinary'));
    }

    const result = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `${baseUrl()}/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };

    res.status(201).json(ApiResponse.success(result, 'Video uploaded locally (Cloudinary not configured)'));
  } catch (error) {
    next(error);
  }
};

const uploadFromUrl = async (req, res, next) => {
  try {
    const { url: remoteUrl } = req.body;

    if (!remoteUrl) {
      return res.status(400).json(ApiResponse.error('URL is required', 'MISSING_URL'));
    }

    if (config.cloudinary.enabled) {
      const result = await cloudinary.uploader.upload(remoteUrl, {
        folder: 'ecommerce',
        resource_type: 'auto',
      });
      return res.status(201).json(ApiResponse.success({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      }, 'URL uploaded to Cloudinary'));
    }

    res.status(400).json(ApiResponse.error(
      'Cloudinary is not configured. Cannot upload from URL without Cloudinary credentials.',
      'CLOUDINARY_NOT_CONFIGURED'
    ));
  } catch (error) {
    next(error);
  }
};

const productImageUploadService = new CloudinaryUploadService();

const localImageDir = path.join(__dirname, '../../uploads/products');
const saveLocally = async (processed, productId) => {
  await fs.mkdir(localImageDir, { recursive: true });
  const id = productId || generateUUID();
  const filename = `${id}_${Date.now()}`;

  const mainPath = path.join(localImageDir, `${filename}_main.webp`);
  const thumbPath = path.join(localImageDir, `${filename}_thumb.webp`);
  await fs.writeFile(mainPath, processed.variants.main.buffer);
  if (processed.variants.thumbnail) {
    await fs.writeFile(thumbPath, processed.variants.thumbnail.buffer);
  }

  const baseUrl = config.uploadBaseUrl || `http://localhost:${config.port}`;
  return {
    original: {
      url: `${baseUrl}/uploads/products/${filename}_main.webp`,
      publicId: `local_${filename}_main`,
      width: processed.variants.main.width,
      height: processed.variants.main.height,
      format: 'webp',
    },
    thumbnail: {
      url: `${baseUrl}/uploads/products/${filename}_thumb.webp`,
      publicId: `local_${filename}_thumb`,
      width: processed.variants.thumbnail?.width || 400,
      height: processed.variants.thumbnail?.height || 400,
      format: 'webp',
    },
  };
};

const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.error('No image file was uploaded', 'NO_FILE'));
    }

    const processor = new ImageProcessor();
    const isBanner = req.body.type === 'banner';
    const options = isBanner ? { minWidth: 100, minHeight: 100 } : {};
    const processed = await processor.process(req.file.buffer, ['main', 'thumbnail'], options);

    let original, thumbnail;
    if (productImageUploadService.isEnabled) {
      try {
        const result = await productImageUploadService.uploadProductImages(
          processed,
          req.body.productId || null
        );
        original = result.original;
        thumbnail = result.thumbnail;
      } catch (cloudError) {
        console.warn('Cloudinary upload failed, falling back to local storage:', cloudError.message);
        const local = await saveLocally(processed, req.body.productId);
        original = local.original;
        thumbnail = local.thumbnail;
      }
    } else {
      const local = await saveLocally(processed, req.body.productId);
      original = local.original;
      thumbnail = local.thumbnail;
    }

    res.status(201).json(ApiResponse.success({
      image: { original, thumbnail },
      source: processed.source,
    }, 'Image uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadFiles, uploadSingle, uploadImage, uploadVideo, uploadFromUrl, uploadProductImage };
