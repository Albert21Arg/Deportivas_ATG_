import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { requireTournamentAccess } from '../middlewares/tournament-access.js';
import { authorize } from '../middlewares/authorize.js';
import { createController, deleteFixturesController, generateFixturesController, listController } from '../controllers/match-controller.js';
import { parseFixturesScopeQuery, parseTournamentId, validateCreateMatch, validateGenerateFixtures } from '../validators/match.js';

const router = Router();
router.use(authenticate);
router.get('/:id/matches', parseTournamentId, requireTournamentAccess, listController);
router.post('/:id/matches', authorize('SUPERADMIN', 'ADMIN'), parseTournamentId, requireTournamentAccess, validateCreateMatch, createController);
router.post('/:id/matches/generate-fixtures', authorize('SUPERADMIN', 'ADMIN'), parseTournamentId, requireTournamentAccess, validateGenerateFixtures, generateFixturesController);
router.delete('/:id/matches/fixtures', authorize('SUPERADMIN', 'ADMIN'), parseTournamentId, requireTournamentAccess, parseFixturesScopeQuery, deleteFixturesController);

export default router;
