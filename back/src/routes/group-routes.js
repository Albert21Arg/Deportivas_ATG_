import { Router } from 'express';

import { assignTeamController, createController, deleteController, drawController, listController, removeTeamController } from '../controllers/group-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { requireTournamentAccess } from '../middlewares/tournament-access.js';
import { parseAssignmentParams } from '../validators/assignment.js';
import { parseGroupId, validateAssignTeam, validateCreateGroup, validateDraw } from '../validators/group.js';
import { parseTeamId } from '../validators/team.js';

const router = Router({ mergeParams: true });
router.use(authenticate, parseAssignmentParams, requireTournamentAccess);

router.get('/', listController);
router.post('/', authorize('SUPERADMIN', 'ADMIN'), validateCreateGroup, createController);
router.post('/draw', authorize('SUPERADMIN', 'ADMIN'), validateDraw, drawController);
router.delete('/:groupId', authorize('SUPERADMIN', 'ADMIN'), parseGroupId, deleteController);
router.post('/:groupId/teams', authorize('SUPERADMIN', 'ADMIN'), parseGroupId, validateAssignTeam, assignTeamController);
router.delete('/:groupId/teams/:teamId', authorize('SUPERADMIN', 'ADMIN'), parseGroupId, parseTeamId, removeTeamController);

export default router;
