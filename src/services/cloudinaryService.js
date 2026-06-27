/**
 * FILE: src/services/cloudinaryService.js
 * ------------------------------------------
 * PURPOSE:
 *   Wrapper around the Cloudinary Node SDK for uploading image buffers.
 *   Used by UploadController.uploadProductImage() to upload processed image
 *   variants (main + thumbnail) to Cloudinary via stream upload.
 *
 * WHY STREAM UPLOAD:
 *   cloudinary.uploader.upload_stream() accepts a Node.js Readable stream
 *   rather than a file path. This avoids writing the buffer to disk twice —
 *   it goes directly from memory to Cloudinary.
 *
 * ENABLED CHECK:
 *   The `isEnabled` getter returns config.cloudinary.enabled. All callers
 *   check this before calling upload methods, falling back to local storage
 *   if Cloudinary credentials are not set.
 *
 * DEPENDENCIES:
 *   - src/config/cloudinary.js  (configured Cloudinary v2 instance)
 *   - src/config/index.js       (cloudinary.enabled flag)
 *
 * USED BY:
 *   - src/controllers/UploadController.js (uploadProductImage)
 */
const { Readable } = require('stream');                // Node.js built-in stream
const cloudinary   = require('../config/cloudinary'); // Pre-configured Cloudinary v2 client
const config       = require('../config');             // App config (cloudinary.enabled)

const FOLDER = 'ecommerce/products';
const RESOURCE_TYPE = 'image';

class CloudinaryUploadService {
  get isEnabled() {
    return config.cloudinary.enabled;
  }

  uploadBuffer(buffer, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || FOLDER,
          public_id: options.publicId,
          resource_type: RESOURCE_TYPE,
          use_filename: true,
          unique_filename: true,
          ...options.uploadOptions,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async uploadProductImages(processed, productId) {
    const timestamp = Date.now();
    const basePublicId = productId
      ? `${productId}/${timestamp}`
      : `upload_${timestamp}`;

    const [mainResult, thumbResult] = await Promise.all([
      this.uploadBuffer(processed.variants.main.buffer, {
        publicId: `${basePublicId}_main`,
      }),
      processed.variants.thumbnail
        ? this.uploadBuffer(processed.variants.thumbnail.buffer, {
            publicId: `${basePublicId}_thumb`,
          })
        : Promise.resolve(null),
    ]);

    return {
      original: mainResult,
      thumbnail: thumbResult,
    };
  }
}

module.exports = { CloudinaryUploadService };
