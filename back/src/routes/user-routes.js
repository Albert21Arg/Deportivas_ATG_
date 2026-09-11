import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { createController, listController, updateController } from '../controllers/user-controller.js';
import { parseUserId, validateCreateAdmin, validateUpdateAdmin } from '../validators/user.js';

const router = Router();

router.use(authenticate, authorize('SUPERADMIN'));
router.get('/', listController);
router.post('/', validateCreateAdmin, createController);
router.put('/:id', parseUserId, validateUpdateAdmin, updateController);

export default router;
