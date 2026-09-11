import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { createController, deleteController, listController, updateController } from '../controllers/announcement-controller.js';
import { validateAnnouncement, validateAnnouncementUpdate } from '../validators/announcement.js';

const uploadDirectory = path.resolve('uploads/announcements');
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_request, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)),
});

const router = Router();
router.use(authenticate, authorize('SUPERADMIN'));
router.get('/', listController);
router.post('/', upload.single('image'), validateAnnouncement, createController);
router.patch('/:id', upload.single('image'), validateAnnouncementUpdate, updateController);
router.delete('/:id', deleteController);
export default router;
