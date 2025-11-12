import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
// Trim whitespace/newlines from environment variables (common issue with echo commands)
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// Debug logging (mask sensitive values)
if (cloudName && apiKey && apiSecret) {
  console.log(`✅ Cloudinary configured - Cloud: "${cloudName}", API Key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
} else {
  console.warn('⚠️  Cloudinary credentials missing:', {
    hasCloudName: !!cloudName,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret
  });
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder (e.g., 'books', 'covers')
 * @param {string} publicId - Public ID for the file (optional, will be auto-generated if not provided)
 * @param {string} resourceType - 'raw' for PDFs/docs, 'image' for images (default: 'auto')
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadToCloudinary = async (filePath, folder, publicId = null, resourceType = 'auto') => {
  try {
    const options = {
      folder: folder,
      resource_type: resourceType === 'raw' ? 'raw' : 'image',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      type: 'upload' // Make files publicly accessible
    };

    if (publicId) {
      options.public_id = publicId;
    }

    // For raw files (PDFs, etc.), use 'raw' resource type
    if (resourceType === 'raw') {
      options.resource_type = 'raw';
    }

    const result = await cloudinary.uploader.upload(filePath, options);
    
    // Clean up local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return result;
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', {
      message: error.message,
      http_code: error.http_code,
      cloud_name: cloudName,
      api_key_preview: apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'missing'
    });
    throw error;
  }
};

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Cloudinary folder
 * @param {string} filename - Original filename
 * @param {string} resourceType - 'raw' for PDFs/docs, 'image' for images
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadBufferToCloudinary = async (buffer, folder, filename, resourceType = 'auto') => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: resourceType === 'raw' ? 'raw' : 'image',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          public_id: filename.replace(/\.[^/.]+$/, '') // Remove extension for public_id
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Error uploading buffer to Cloudinary:', error);
    throw error;
  }
};

/**
 * Generate a signed URL for a Cloudinary resource
 * @param {string} publicId - Cloudinary public ID (e.g., 'books/filename')
 * @param {number} expiresIn - Expiration time in seconds (default: 300 = 5 minutes)
 * @param {string} resourceType - 'raw' for PDFs/docs, 'image' for images
 * @returns {string} Signed URL
 */
export const getSignedUrl = (publicId, expiresIn = 300, resourceType = 'auto') => {
  try {
    // Files are uploaded as 'upload' type (public), so use public URL
    // For public files, we don't need signed URLs - just use the public URL
    return cloudinary.url(publicId, {
      resource_type: resourceType === 'raw' ? 'raw' : 'image',
      secure: true,
      type: 'upload' // Use 'upload' type to match how files are uploaded
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Get a public URL for a Cloudinary resource (no signing required)
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'raw' for PDFs/docs, 'image' for images
 * @returns {string} Public URL
 */
export const getPublicUrl = (publicId, resourceType = 'auto') => {
  try {
    return cloudinary.url(publicId, {
      resource_type: resourceType === 'raw' ? 'raw' : 'image'
    });
  } catch (error) {
    console.error('Error generating public URL:', error);
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'raw' for PDFs/docs, 'image' for images
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'raw' ? 'raw' : 'image'
    });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Download a file from Cloudinary as a buffer
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'raw' for PDFs/docs, 'image' for images
 * @returns {Promise<Buffer>} File buffer
 */
export const downloadFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    // Files are uploaded as 'upload' type (public), so use public URL
    const url = cloudinary.url(publicId, {
      resource_type: resourceType === 'raw' ? 'raw' : 'image',
      secure: true,
      type: 'upload' // Use 'upload' type to match how files are uploaded
    });
    
    console.log(`✅ Generated public URL for public_id: ${publicId}`);
    console.log(`📋 Download URL: ${url}`);
    
    // Download using https
    const https = await import('https');
    const http = await import('http');
    const urlModule = await import('url');
    
    const fileUrl = new urlModule.URL(url);
    const protocol = fileUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading from Cloudinary:', error);
    throw error;
  }
};

export default cloudinary;

