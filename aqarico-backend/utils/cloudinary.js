import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('☁️ Cloudinary configured with cloud_name:', process.env.CLOUDINARY_CLOUD_NAME);

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer memory storage
 * @param {string} folder - Cloudinary folder to upload to
 * @returns {Promise<Object>} Cloudinary upload result with secure_url
 */
export const uploadToCloudinary = (fileBuffer, folder = 'aqarico') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete an image from Cloudinary by its public_id
 * @param {string} publicId - The public_id of the image
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

export default cloudinary;
