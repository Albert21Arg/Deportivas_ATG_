import { Router } from 'express';

import { activeController, updateController } from '../controllers/site-setting-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateSiteSettingUpdate } from '../validators/site-setting.js';

const router = Router();
router.use(authenticate, authorize('SUPERADMIN'));
router.get('/', activeController);
router.patch('/', validateSiteSettingUpdate, updateController);

export default router;
