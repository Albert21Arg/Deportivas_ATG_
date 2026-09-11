import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { loginController, meController } from '../controllers/auth-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validateLogin } from '../validators/auth.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta más tarde.',
  },
});

router.post('/login', loginLimiter, validateLogin, loginController);
router.get('/me', authenticate, meController);

export default router;
