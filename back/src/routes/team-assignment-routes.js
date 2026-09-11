import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { requireTournamentAccess } from '../middlewares/tournament-access.js';
import { assignController, listController, removeController } from '../controllers/team-assignment-controller.js';
import { parseAssignmentParams } from '../validators/assignment.js';
import { validateTeamAssignment } from '../validators/team-assignment.js';
import { parseTeamId } from '../validators/team.js';

const router = Router({ mergeParams: true });
router.use(authenticate, parseAssignmentParams);
router.get('/', requireTournamentAccess, listController);
router.post('/', requireTournamentAccess, validateTeamAssignment, assignController);
router.delete('/:teamId', requireTournamentAccess, parseTeamId, removeController);

export default router;
