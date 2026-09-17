import { Router } from 'express';

import {
  getByPotController,
  getCardFinesController,
  getCardsController,
  getController,
  getGoalkeepersController,
  getScorersController,
  setCardFinePaidController,
} from '../controllers/standings-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireActiveTournament, requireTournamentAccess } from '../middlewares/tournament-access.js';
import { parseTournamentId } from '../validators/tournament.js';

const router = Router();

router.get('/:id/standings', authenticate, parseTournamentId, requireTournamentAccess, requireActiveTournament, getController);
router.get('/:id/standings/by-pot', authenticate, parseTournamentId, requireTournamentAccess, requireActiveTournament, getByPotController);
router.get('/:id/scorers', authenticate, parseTournamentId, requireTournamentAccess, requireActiveTournament, getScorersController);
router.get('/:id/goalkeepers', authenticate, parseTournamentId, requireTournamentAccess, requireActiveTournament, getGoalkeepersController);
router.get('/:id/cards', authenticate, parseTournamentId, requireTournamentAccess, requireActiveTournament, getCardsController);
router.get('/:id/card-fines', authenticate, parseTournamentId, requireTournamentAccess, requireActiveTournament, getCardFinesController);
router.patch('/:id/card-fines/:playerId', authenticate, parseTournamentId, requireTournamentAccess, requireActiveTournament, setCardFinePaidController);

export default router;
