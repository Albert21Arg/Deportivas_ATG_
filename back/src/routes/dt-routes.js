import { Router } from 'express';

import { getController, upsertController } from '../controllers/dt-controller.js';
import { authorize } from '../middlewares/authorize.js';
import { requireActiveTournament, requireTournamentAccess } from '../middlewares/tournament-access.js';
import { parseAssignmentParams } from '../validators/assignment.js';
import { validateUpsertDt } from '../validators/dt.js';

const router = Router({ mergeParams: true });
router.use(parseAssignmentParams, authorize('SUPERADMIN', 'ADMIN'), requireTournamentAccess, requireActiveTournament);
router.get('/', getController);
router.put('/', validateUpsertDt, upsertController);
export default router;
