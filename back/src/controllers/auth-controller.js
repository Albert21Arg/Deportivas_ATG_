import { login, sanitizeUser } from '../services/auth-service.js';

export async function loginController(request, response, next) {
  try {
    const result = await login(request.body);
    return response.status(200).json({ success: true, data: result });
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
