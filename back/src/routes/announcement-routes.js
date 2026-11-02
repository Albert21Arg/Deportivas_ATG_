import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { createController, deleteController, listController, updateController } from '../controllers/announcement-controller.js';
import { validateAnnouncement, validateAnnouncementUpdate } from '../validators/announcement.js';

const router = Router();
router.use(authenticate, authorize('SUPERADMIN'));
router.get('/', listController);
router.post('/', validateAnnouncement, createController);
router.patch('/:id', validateAnnouncementUpdate, updateController);
router.delete('/:id', deleteController);
export default router;
