import { Router } from 'express';

import { detailController, historyController, listController } from '../controllers/public-controller.js';
import { activeController } from '../controllers/announcement-controller.js';
import { activeController as activeFloatingBubblesController } from '../controllers/floating-bubble-controller.js';
import { activeController as activeSiteSettingsController } from '../controllers/site-setting-controller.js';
import { streamController } from '../controllers/realtime-controller.js';

const router = Router();

router.get('/tournaments', listController);
router.get('/tournaments/:id', detailController);
router.get('/tournaments/:id/history', historyController);
router.get('/tournaments/:id/events', streamController);
router.get('/announcements/active', activeController);
router.get('/floating-bubbles', activeFloatingBubblesController);
router.get('/site-settings', activeSiteSettingsController);

export default router;
