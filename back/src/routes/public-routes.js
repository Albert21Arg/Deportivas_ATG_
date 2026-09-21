import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { detailController, historyController, likeController, listController, unlikeController, visitController } from '../controllers/public-controller.js';
import { activeController } from '../controllers/announcement-controller.js';
import { activeController as activeFloatingBubblesController } from '../controllers/floating-bubble-controller.js';
import { activeController as activeSiteSettingsController } from '../controllers/site-setting-controller.js';
import { streamController } from '../controllers/realtime-controller.js';

const router = Router();

// Además del límite de 1 like por IP/torneo cada 24h (que vive en
// tournament-like-service.js), esto frena ráfagas automatizadas: incluso
// probando IDs de torneo distintos, la misma IP no puede golpear el
// endpoint más de unas pocas veces por minuto.
const likeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos. Espera un momento antes de volver a intentarlo.',
  },
});

router.get('/tournaments', listController);
router.get('/tournaments/:id', detailController);
router.post('/tournaments/:id/visit', visitController);
router.post('/tournaments/:id/like', likeLimiter, likeController);
router.delete('/tournaments/:id/like', likeLimiter, unlikeController);
router.get('/tournaments/:id/history', historyController);
router.get('/tournaments/:id/events', streamController);
router.get('/announcements/active', activeController);
router.get('/floating-bubbles', activeFloatingBubblesController);
router.get('/site-settings', activeSiteSettingsController);

export default router;
