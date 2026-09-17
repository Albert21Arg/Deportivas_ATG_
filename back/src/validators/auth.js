import { HttpError } from '../utils/http-error.js';

export function validateLogin(request, _response, next) {
  const { email, password } = request.body ?? {};

  if (typeof email !== 'string' || !email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
    return next(new HttpError(422, 'El email no es válido'));
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return next(new HttpError(422, 'La contraseña debe tener entre 8 y 128 caracteres'));
  }

  request.body.email = email.trim().toLowerCase();
  return next();
}

export function validateForgotPassword(request, _response, next) {
  const { email } = request.body ?? {};

  if (typeof email !== 'string' || !email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
    return next(new HttpError(422, 'El email no es válido'));
  }

  request.body.email = email.trim().toLowerCase();
  return next();
}

export function validateResetPassword(request, _response, next) {
  const { token, password } = request.body ?? {};

  if (typeof token !== 'string' || !token.trim()) {
    return next(new HttpError(422, 'El token de recuperación es obligatorio'));
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return next(new HttpError(422, 'La contraseña debe tener entre 8 y 128 caracteres'));
  }

  request.body.token = token.trim();
  return next();
}
