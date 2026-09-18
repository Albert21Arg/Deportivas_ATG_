import { Router } from 'express';

import {
  createController,
  deleteController,
  getController,
  listController,
  meController,
  updateController,
} from '../controllers/team-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { parseTeamId, validateCreateTeam, validateUpdateTeam } from '../validators/team.js';

const router = Router();

router.use(authenticate);
router.get('/me', authorize('DT'), meController);
router.get('/', authorize('SUPERADMIN', 'ADMIN'), listController);
router.get('/:id', authorize('SUPERADMIN', 'ADMIN'), parseTeamId, getController);
router.post('/', authorize('SUPERADMIN', 'ADMIN'), validateCreateTeam, createController);
router.put('/:id', authorize('SUPERADMIN'), parseTeamId, validateUpdateTeam, updateController);
router.delete('/:id', authorize('SUPERADMIN'), parseTeamId, deleteController);

export default router;
