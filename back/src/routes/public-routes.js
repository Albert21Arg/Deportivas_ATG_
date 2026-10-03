import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { detailController, historyController, historyMatchController, homeDetailController, homeListController, likeController, listController, unlikeController, visitController } from '../controllers/public-controller.js';
import { bonusesController, likeController as likePlayerController, unlikeController as unlikePlayerController } from '../controllers/player-like-controller.js';
import { likeController as likeTeamController, totalsController as teamTotalsController, unlikeController as unlikeTeamController } from '../controllers/team-like-controller.js';
import { activeController } from '../controllers/announcement-controller.js';
import { activeController as activeFloatingBubblesController } from '../controllers/floating-bubble-controller.js';
import { activeController as activeSiteSettingsController } from '../controllers/site-setting-controller.js';
import { streamController } from '../controllers/realtime-controller.js';
import { roundImageController } from '../controllers/round-image-controller.js';
import { liveMatchImageController } from '../controllers/live-match-image-controller.js';
import { shareImageController } from '../controllers/share-image-controller.js';

const router = Router();

// Además del límite de 1 like activo por IP/torneo|equipo|jugador (que vive
// en cada *-like-service.js), esto solo frena ráfagas automatizadas: un
// humano dando like y quitándolo las veces que quiera (aunque sea rápido)
// no debería toparse con esto, así que el límite es generoso.
const likeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos. Espera un momento antes de volver a intentarlo.',
  },
});
const shareImageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.get('/share-image', shareImageLimiter, shareImageController);
router.get('/home/tournaments', homeListController);
router.get('/home/tournaments/:id', homeDetailController);
router.get('/tournaments', listController);
router.get('/tournaments/:id', detailController);
router.post('/tournaments/:id/visit', visitController);
router.post('/tournaments/:id/like', likeLimiter, likeController);
router.delete('/tournaments/:id/like', likeLimiter, unlikeController);
router.get('/tournaments/:id/history', historyController);
router.get('/tournaments/:id/history/:matchId', historyMatchController);
router.get('/tournaments/:id/matches/:matchId/live-image', liveMatchImageController);
router.get('/tournaments/:id/rounds/:day/image', roundImageController);
router.get('/tournaments/:id/events', streamController);
router.get('/players/likes', bonusesController);
router.post('/players/:id/like', likeLimiter, likePlayerController);
router.delete('/players/:id/like', likeLimiter, unlikePlayerController);
router.get('/teams/likes', teamTotalsController);
router.post('/teams/:id/like', likeLimiter, likeTeamController);
router.delete('/teams/:id/like', likeLimiter, unlikeTeamController);
router.get('/announcements/active', activeController);
router.get('/floating-bubbles', activeFloatingBubblesController);
router.get('/site-settings', activeSiteSettingsController);

export default router;
