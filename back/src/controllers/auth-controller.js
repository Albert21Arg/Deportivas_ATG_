import { forgotPassword, login, resetPassword, sanitizeUser } from '../services/auth-service.js';

export async function loginController(request, response, next) {
  try {
    const result = await login(request.body);
    return response.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function forgotPasswordController(request, response, next) {
  try {
    await forgotPassword(request.body.email);
    return response.status(200).json({
      success: true,
      message: 'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function resetPasswordController(request, response, next) {
  try {
    await resetPassword(request.body);
    return response.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    return next(error);
  }
}

export function meController(request, response) {
  return response.status(200).json({
    success: true,
    data: { user: sanitizeUser(request.user) },
  });
}
