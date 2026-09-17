import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { forgotPasswordController, loginController, meController, resetPasswordController } from '../controllers/auth-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validateForgotPassword, validateLogin, validateResetPassword } from '../validators/auth.js';

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

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta más tarde.',
  },
});

router.post('/login', loginLimiter, validateLogin, loginController);
router.get('/me', authenticate, meController);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPasswordController);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPasswordController);

export default router;
