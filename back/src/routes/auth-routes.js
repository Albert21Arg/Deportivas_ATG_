import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { forgotPasswordController, loginController, meController, resetPasswordController } from '../controllers/auth-controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validateForgotPassword, validateLogin, validateResetPassword } from '../validators/auth.js';

const router = Router();

// El bloqueo por intentos fallidos ya se maneja por CUENTA en auth-service.js
// (login), así que no hace falta un límite por IP aquí: uno bloqueaba a
// cualquiera que compartiera la IP (ej. varios DT/admin en la misma red),
// no solo a quien realmente estaba fallando la contraseña.

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

router.post('/login', validateLogin, loginController);
router.get('/me', authenticate, meController);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPasswordController);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPasswordController);

export default router;
