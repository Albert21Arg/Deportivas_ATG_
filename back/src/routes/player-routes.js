import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { createController, listController, setGoalkeeperController, updateController } from '../controllers/player-controller.js';
import { requireTournamentAccess } from '../middlewares/tournament-access.js';
import { validateCreatePlayer, validateSetGoalkeeper, validateUpdatePlayer } from '../validators/player.js';

const directory = path.resolve('uploads/players'); fs.mkdirSync(directory, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: directory, filename: (_req, file, done) => done(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`) }), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, done) => done(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });
const router = Router({ mergeParams: true });
router.use(requireTournamentAccess);
router.get('/', listController);
router.post('/', upload.single('photo'), validateCreatePlayer, createController);
router.patch('/:playerId', upload.single('photo'), validateUpdatePlayer, updateController);
router.patch('/:playerId/goalkeeper', validateSetGoalkeeper, setGoalkeeperController);
export default router;
