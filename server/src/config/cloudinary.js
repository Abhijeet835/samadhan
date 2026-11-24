import { v2 as cloudinary } from 'cloudinary';

import { env } from './env.js';

export const isCloudinaryConfigured = Boolean(
  env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret,
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
} else {
  console.warn('[cloudinary] CLOUDINARY_* env vars not set — photo upload returns 503 CLOUDINARY_NOT_CONFIGURED.');
}

/**
 * Upload an image buffer and resolve with its secure URL.
 */
export function uploadImageBuffer(buffer, { folder = 'samadhan/issues', resourceType = 'image' } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export default cloudinary;