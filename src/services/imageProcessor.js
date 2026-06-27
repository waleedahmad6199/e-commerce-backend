/**
 * FILE: src/services/imageProcessor.js
 * ----------------------------------------
 * PURPOSE:
 *   Processes uploaded product images using the sharp library.
 *   Validates minimum resolution, then resizes and converts to WebP
 *   for both the main display image and thumbnail variant.
 *
 * PROCESSING PIPELINE:
 *   1. validate(buffer)  — reads image metadata, rejects if below minimum size
 *   2. process(buffer)   — runs validate(), then creates two variants:
 *        main:      max 1600px wide, 85% WebP quality (large display)
 *        thumbnail: max 400px wide,  80% WebP quality (card thumbnails)
 *   3. Returns { source: { width, height, format, size }, variants: { main, thumbnail } }
 *      Each variant = { buffer, width, height, format: 'webp', size }
 *
 * MINIMUM RESOLUTION:
 *   800×800px minimum. Images smaller than this are rejected with a
 *   descriptive error message showing the actual vs required dimensions.
 *
 * WHY WEBP:
 *   WebP produces 25-35% smaller files than JPEG at equivalent quality.
 *   All modern browsers support it. sharp's .rotate() call also auto-corrects
 *   EXIF orientation (phone photos are often stored rotated).
 *
 * DEPENDENCIES:
 *   - sharp : high-performance Node.js image processing library
 *
 * USED BY:
 *   - src/controllers/UploadController.js (uploadProductImage)
 */
const sharp = require('sharp'); // High-performance image processing
const ApiError = require('../utils/ApiError');

const VARIANTS = {
  main: {
    width: 1600,
    fit: 'inside',
    withoutEnlargement: true,
    webp: { quality: 85, effort: 6, smartSubsample: true },
  },
  thumbnail: {
    width: 400,
    fit: 'inside',
    withoutEnlargement: true,
    webp: { quality: 80, effort: 6, smartSubsample: true },
  },
};

const MIN_WIDTH = 400;
const MIN_HEIGHT = 400;

class ImageProcessor {
  async validate(buffer, options = {}) {
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      throw ApiError.badRequest('Image file is corrupted or unreadable');
    }

    if (!metadata || !metadata.width || !metadata.height) {
      throw ApiError.badRequest('Image file is corrupted or unreadable');
    }

    const minW = options.minWidth !== undefined ? options.minWidth : MIN_WIDTH;
    const minH = options.minHeight !== undefined ? options.minHeight : MIN_HEIGHT;

    if (metadata.width < minW || metadata.height < minH) {
      throw ApiError.badRequest(
        `Image resolution too low. Minimum recommended size is ${minW}x${minH} pixels. Got ${metadata.width}x${metadata.height}.`
      );
    }

    return metadata;
  }

  async process(buffer, variantNames = ['main', 'thumbnail'], options = {}) {
    const metadata = await this.validate(buffer, options);

    const results = {};
    for (const name of variantNames) {
      const config = VARIANTS[name];
      if (!config) continue;
      results[name] = await this._processVariant(buffer, config);
    }

    return {
      source: { width: metadata.width, height: metadata.height, format: metadata.format, size: buffer.length },
      variants: results,
    };
  }

  async _processVariant(buffer, config) {
    const pipeline = sharp(buffer)
      .rotate()
      .resize({ width: config.width, fit: config.fit, withoutEnlargement: config.withoutEnlargement });

    const resultBuffer = await pipeline.webp(config.webp).toBuffer();
    const resultMetadata = await sharp(resultBuffer).metadata();

    return {
      buffer: resultBuffer,
      width: resultMetadata.width,
      height: resultMetadata.height,
      format: 'webp',
      size: resultBuffer.length,
    };
  }
}

module.exports = { ImageProcessor, VARIANTS, MIN_WIDTH, MIN_HEIGHT };
