import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { shareImageController } from '../controllers/share-image-controller.js';
import { roundImageController } from '../controllers/round-image-controller.js';
import { liveMatchImageController } from '../controllers/live-match-image-controller.js';

const router = Router();
const shareImageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.get('/share-image', shareImageLimiter, shareImageController);
router.get('/tournaments/:id/matches/:matchId/live-image', liveMatchImageController);
router.get('/tournaments/:id/rounds/:day/image', roundImageController);

export default router;
