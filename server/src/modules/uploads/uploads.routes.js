import express from 'express';

import { authenticate, imageUploadParser, uploadImage } from './uploads.controller.js';

const router = express.Router();

router.post('/image', authenticate, imageUploadParser, uploadImage);

export default router;