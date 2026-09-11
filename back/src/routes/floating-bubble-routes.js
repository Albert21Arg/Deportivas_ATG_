import { Router } from 'express';

import { listController, updateController } from '../controllers/floating-bubble-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateFloatingBubbleUpdate } from '../validators/floating-bubble.js';

const router = Router();
router.use(authenticate, authorize('SUPERADMIN'));
router.get('/', listController);
router.patch('/:id', validateFloatingBubbleUpdate, updateController);

export default router;
