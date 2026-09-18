import { HttpError } from '../utils/http-error.js';

export function validateUpsertDt(request, _response, next) {
  try {
    const { email, password } = request.body ?? {};

    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      throw new HttpError(422, 'El email no es válido');
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new HttpError(422, 'La contraseña debe tener entre 8 y 128 caracteres');
    }

    request.validatedBody = {
      email: email.trim().toLowerCase(),
      password,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}
