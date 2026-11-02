import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { workerShareImageController } from '../controllers/worker-share-image-controller.js';

const router = Router();
const shareImageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.get('/share-image', shareImageLimiter, workerShareImageController);

export default router;
