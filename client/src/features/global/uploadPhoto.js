import api from '@/lib/api';

/**
 * Upload a photo file to POST /api/uploads/image (multipart field "image").
 * Resolves with { url } or rejects with the server error code.
 */
export async function uploadPhoto(file) {
  const form = new FormData();
  form.append('image', file);
  const response = await api.post('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}