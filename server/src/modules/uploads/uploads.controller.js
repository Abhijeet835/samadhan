import multer from 'multer';

import { isCloudinaryConfigured, uploadImageBuffer } from '../../config/cloudinary.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { ApiError, sendSuccess } from '../../utils/apiResponse.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new ApiError('Only JPEG, PNG and WebP images are allowed.', 400, 'INVALID_IMAGE_TYPE'));
    }
    return cb(null, true);
  },
});

/**
 * POST /api/uploads/image — multipart field "image". Returns the Cloudinary
 * secure URL. Photos are optional in the report wizard; without CLOUDINARY_*
 * credentials the endpoint answers a clear 503 so the client can skip photos.
 */
async function uploadImage(req, res, next) {
  if (!isCloudinaryConfigured) {
    return next(new ApiError('Photo upload is not configured on this server (CLOUDINARY_* env vars missing).', 503, 'CLOUDINARY_NOT_CONFIGURED'));
  }
  if (!req.file) {
    return next(new ApiError('No image file provided. Use the "image" multipart field.', 400, 'IMAGE_REQUIRED'));
  }
  try {
    const url = await uploadImageBuffer(req.file.buffer);
    return sendSuccess(res, { url }, 201);
  } catch (error) {
    console.error('[uploads] Cloudinary upload failed:', error.message);
    return next(new ApiError('Photo upload failed. Please try again.', 502, 'UPLOAD_FAILED'));
  }
}

const router = upload.single('image');

export { authenticate, router as imageUploadParser, uploadImage };
