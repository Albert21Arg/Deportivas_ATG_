import { Router } from 'express';

import { createController, listController, resetController, winnerController } from '../controllers/bracket-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { requireActiveTournament, requireTournamentAccess } from '../middlewares/tournament-access.js';
import { parseTieId, validateCreateBracket, validateTieWinner } from '../validators/bracket.js';
import { parseAssignmentParams } from '../validators/assignment.js';

const router = Router({ mergeParams: true });
router.use(authenticate, parseAssignmentParams, requireTournamentAccess, requireActiveTournament);

router.get('/', listController);
router.post('/', authorize('SUPERADMIN', 'ADMIN'), validateCreateBracket, createController);
router.delete('/', authorize('SUPERADMIN', 'ADMIN'), resetController);
router.patch('/:tieId/winner', authorize('SUPERADMIN', 'ADMIN'), parseTieId, validateTieWinner, winnerController);

export default router;
