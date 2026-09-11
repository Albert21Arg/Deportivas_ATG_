import { Router } from 'express';

import { getByPotController, getController, getScorersController } from '../controllers/standings-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireTournamentAccess } from '../middlewares/tournament-access.js';
import { parseTournamentId } from '../validators/tournament.js';

const router = Router();

router.get('/:id/standings', authenticate, parseTournamentId, requireTournamentAccess, getController);
router.get('/:id/standings/by-pot', authenticate, parseTournamentId, requireTournamentAccess, getByPotController);
router.get('/:id/scorers', authenticate, parseTournamentId, requireTournamentAccess, getScorersController);

export default router;
