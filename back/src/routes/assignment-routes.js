import { Router } from 'express';

import { assignController, listController, removeController } from '../controllers/assignment-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { requireTournamentAccess } from '../middlewares/tournament-access.js';
import { parseAssignmentParams, parseUserIdParam, validateAssignment } from '../validators/assignment.js';

const router = Router({ mergeParams: true });

router.use(authenticate, parseAssignmentParams);
router.get('/', requireTournamentAccess, listController);
router.post('/', authorize('SUPERADMIN'), validateAssignment, assignController);
router.delete('/:userId', authorize('SUPERADMIN'), parseUserIdParam, removeController);

export default router;
