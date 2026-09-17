import { Router } from 'express';

import assignmentRoutes from './assignment-routes.js';
import bracketRoutes from './bracket-routes.js';
import groupRoutes from './group-routes.js';
import teamAssignmentRoutes from './team-assignment-routes.js';
import playerRoutes from './player-routes.js';
import {
  championController,
  createController,
  getController,
  listController,
  moveController,
  statusController,
  updateController,
  updateModeController,
} from '../controllers/tournament-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { requireActiveTournament, requireTournamentAccess } from '../middlewares/tournament-access.js';
import {
  parseTournamentId,
  validateChampion,
  validateCreateTournament,
  validateMove,
  validateStatus,
  validateUpdateTournament,
  validateUpdateTournamentMode,
} from '../validators/tournament.js';

const router = Router();

router.use(authenticate);
router.get('/', listController);
router.post('/', authorize('SUPERADMIN'), validateCreateTournament, createController);
router.use('/:id/admins', assignmentRoutes);
router.use('/:id/teams', teamAssignmentRoutes);
router.use('/:id/teams/:teamId/players', playerRoutes);
router.use('/:id/groups', groupRoutes);
router.use('/:id/bracket', bracketRoutes);
router.get('/:id', parseTournamentId, requireTournamentAccess, getController);
router.put('/:id', authorize('SUPERADMIN'), parseTournamentId, validateUpdateTournament, updateController);
router.patch('/:id/mode', parseTournamentId, requireTournamentAccess, requireActiveTournament, validateUpdateTournamentMode, updateModeController);
router.patch('/:id/status', authorize('SUPERADMIN'), parseTournamentId, validateStatus, statusController);
router.patch('/:id/move', authorize('SUPERADMIN'), parseTournamentId, validateMove, moveController);
router.patch('/:id/champion', parseTournamentId, requireTournamentAccess, requireActiveTournament, validateChampion, championController);

export default router;
