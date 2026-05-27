import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';
import logger from '../utils/logger.js';
import path from 'path';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary.
 * @param {string} filePath - Local file path to upload.
 * @param {string} folder - Cloudinary folder name (e.g. 'restaurants', 'menu-items').
 * @returns {Promise<string>} - Secure URL of the uploaded image or local fallback.
 */
export const uploadToCloudinary = async (filePath, folder = 'vingo') => {
  try {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      logger.warn('⚠️ Cloudinary keys not configured. Falling back to local file upload.');
      const filename = path.basename(filePath);
      return `/uploads/${filename}`;
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  } catch (error) {
    logger.error(`Cloudinary upload failed: ${error.message}. Falling back to local static URL.`);
    const filename = path.basename(filePath);
    return `/uploads/${filename}`;
  }
};

/**
 * Delete an image from Cloudinary by its public ID.
 * @param {string} publicId - The Cloudinary public ID.
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
  }
};

export default cloudinary;
