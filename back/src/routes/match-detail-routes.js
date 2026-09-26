import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { requireMatchAccess } from '../middlewares/match-access.js';
import { authorize } from '../middlewares/authorize.js';
import { deleteEventController, eventController, extraTimeController, liveController, liveScoreController, nextPeriodController, resultController, startController, statusController, updateController } from '../controllers/match-controller.js';
import { parseMatchId, validateExtraTime, validateFinish, validateMatchEvent, validateResult, validateStart, validateUpdateMatch } from '../validators/match.js';

const router = Router();
router.get('/live', authenticate, authorize('SUPERADMIN', 'ADMIN'), liveController);
router.put('/:id', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), validateUpdateMatch, updateController);
router.post('/:id/result', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), validateResult, resultController);
router.patch('/:id/start', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), validateStart, startController);
router.patch('/:id/next-period', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), nextPeriodController);
router.patch('/:id/extra-time', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), validateExtraTime, extraTimeController);
router.patch('/:id/finish', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), validateFinish, (request, _response, next) => { request.status = 'FINISHED'; next(); }, statusController);
router.patch('/:id/live-score', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), validateResult, liveScoreController);
router.post('/:id/events', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), validateMatchEvent, eventController);
router.delete('/:id/events/:eventId', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), deleteEventController);
router.patch('/:id/postpone', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), (request, _response, next) => { request.status = 'POSTPONED'; next(); }, statusController);
router.patch('/:id/cancel', authenticate, parseMatchId, requireMatchAccess, authorize('SUPERADMIN', 'ADMIN'), (request, _response, next) => { request.status = 'CANCELLED'; next(); }, statusController);

export default router;
