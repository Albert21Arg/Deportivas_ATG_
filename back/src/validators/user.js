import { HttpError } from '../utils/http-error.js';

function validateName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    throw new HttpError(422, 'El nombre es obligatorio y debe tener entre 1 y 120 caracteres');
  }
  return name.trim();
}

function validateEmail(email) {
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new HttpError(422, 'El email no es válido');
  }
  return email.trim().toLowerCase();
}

export function validateCreateAdmin(request, _response, next) {
  try {
    const { name, email, password } = request.body ?? {};

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new HttpError(422, 'La contraseña debe tener entre 8 y 128 caracteres');
    }

    request.validatedBody = {
      name: validateName(name),
      email: validateEmail(email),
      password,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateUpdateAdmin(request, _response, next) {
  try {
    const body = request.body ?? {};
    const validatedBody = {};

    if (body.name !== undefined) validatedBody.name = validateName(body.name);
    if (body.email !== undefined) validatedBody.email = validateEmail(body.email);
    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) {
        throw new HttpError(422, 'La contraseña debe tener entre 8 y 128 caracteres');
      }
      validatedBody.password = body.password;
    }
    if (body.status !== undefined && !['ACTIVE', 'INACTIVE'].includes(body.status)) {
      throw new HttpError(422, 'El estado debe ser ACTIVE o INACTIVE');
    }
    if (body.status !== undefined) validatedBody.status = body.status;

    if (!Object.keys(validatedBody).length) {
      throw new HttpError(422, 'Debes enviar al menos un campo para actualizar');
    }

    request.validatedBody = validatedBody;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function parseUserId(request, _response, next) {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return next(new HttpError(400, 'Identificador de usuario no válido'));
  }

  request.userId = id;
  return next();
}
