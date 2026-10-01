import { Router } from 'express';
import { createController, deleteController, listController, setGoalkeeperController, setShowNameController, updateController } from '../controllers/player-controller.js';
import { authorize } from '../middlewares/authorize.js';
import { requireActiveTournament, requireRegistrationOpen, requireTeamManagementAccess } from '../middlewares/tournament-access.js';
import { parseAssignmentParams } from '../validators/assignment.js';
import { validateCreatePlayer, validateSetGoalkeeper, validateSetShowName, validateUpdatePlayer } from '../validators/player.js';

const router = Router({ mergeParams: true });
router.use(parseAssignmentParams, requireTeamManagementAccess, requireActiveTournament);
router.get('/', listController);
router.post('/', requireRegistrationOpen, validateCreatePlayer, createController);
router.patch('/:playerId', requireRegistrationOpen, validateUpdatePlayer, updateController);
router.delete('/:playerId', requireRegistrationOpen, deleteController);
router.patch('/:playerId/goalkeeper', authorize('SUPERADMIN', 'ADMIN'), validateSetGoalkeeper, setGoalkeeperController);
router.patch('/:playerId/show-name', authorize('SUPERADMIN', 'ADMIN'), validateSetShowName, setShowNameController);
export default router;
