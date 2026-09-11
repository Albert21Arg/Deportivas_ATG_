import { HttpError } from '../utils/http-error.js';

function validateName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    throw new HttpError(422, 'El nombre del equipo es obligatorio y debe tener entre 1 y 120 caracteres');
  }
  return name.trim();
}

function validateLogo(logo) {
  if (logo === null || logo === undefined || logo === '') return null;
  if (typeof logo !== 'string' || logo.length > 500) {
    throw new HttpError(422, 'El logo debe ser una URL o ruta de máximo 500 caracteres');
  }
  return logo.trim();
}

function validateExpiryDate(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(422, `${field} no es una fecha válida`);
  return date;
}

export function validateCreateTeam(request, _response, next) {
  try {
    request.validatedBody = {
      name: validateName(request.body?.name),
      logo: validateLogo(request.body?.logo),
      paidUntil: validateExpiryDate(request.body?.paidUntil, 'paidUntil'),
      logoExpiresAt: validateExpiryDate(request.body?.logoExpiresAt, 'logoExpiresAt'),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateUpdateTeam(request, _response, next) {
  try {
    const body = request.body ?? {};
    const validatedBody = {};
    if (body.name !== undefined) validatedBody.name = validateName(body.name);
    if (body.logo !== undefined) validatedBody.logo = validateLogo(body.logo);
    if (body.paidUntil !== undefined) validatedBody.paidUntil = validateExpiryDate(body.paidUntil, 'paidUntil');
    if (body.logoExpiresAt !== undefined) validatedBody.logoExpiresAt = validateExpiryDate(body.logoExpiresAt, 'logoExpiresAt');
    if (body.status !== undefined && !['ACTIVE', 'INACTIVE'].includes(body.status)) {
      throw new HttpError(422, 'El estado debe ser ACTIVE o INACTIVE');
    }
    if (body.status !== undefined) validatedBody.status = body.status;
    if (!Object.keys(validatedBody).length) throw new HttpError(422, 'Debes enviar al menos un campo para actualizar');
    request.validatedBody = validatedBody;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function parseTeamId(request, _response, next) {
  const id = Number(request.params.teamId ?? request.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(new HttpError(400, 'Identificador de equipo no válido'));
  request.teamId = id;
  return next();
}
