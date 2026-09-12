import { Router } from 'express';

import {
  getByPotController,
  getCardFinesController,
  getCardsController,
  getController,
  getScorersController,
  setCardFinePaidController,
} from '../controllers/standings-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireTournamentAccess } from '../middlewares/tournament-access.js';
import { parseTournamentId } from '../validators/tournament.js';

const router = Router();

router.get('/:id/standings', authenticate, parseTournamentId, requireTournamentAccess, getController);
router.get('/:id/standings/by-pot', authenticate, parseTournamentId, requireTournamentAccess, getByPotController);
router.get('/:id/scorers', authenticate, parseTournamentId, requireTournamentAccess, getScorersController);
router.get('/:id/cards', authenticate, parseTournamentId, requireTournamentAccess, getCardsController);
router.get('/:id/card-fines', authenticate, parseTournamentId, requireTournamentAccess, getCardFinesController);
router.patch('/:id/card-fines/:playerId', authenticate, parseTournamentId, requireTournamentAccess, setCardFinePaidController);

export default router;
