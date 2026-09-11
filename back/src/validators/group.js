import { HttpError } from '../utils/http-error.js';

function positiveInt(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(422, `${field} debe ser un entero positivo`);
  return parsed;
}

export function validateCreateGroup(request, _response, next) {
  try {
    const name = String(request.body?.name ?? '').trim();
    if (!name || name.length > 60) throw new HttpError(422, 'El nombre del grupo es obligatorio y debe tener máximo 60 caracteres');
    request.validatedBody = { name };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateAssignTeam(request, _response, next) {
  try {
    const body = request.body ?? {};
    request.validatedBody = {
      teamId: positiveInt(body.teamId, 'teamId'),
      pot: body.pot === undefined || body.pot === '' ? 1 : positiveInt(body.pot, 'pot'),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateDraw(request, _response, next) {
  try {
    const body = request.body ?? {};
    const groupCount = positiveInt(body.groupCount, 'groupCount');
    const pots = {};
    for (const [key, value] of Object.entries(body.pots ?? {})) {
      if (!Array.isArray(value) || !value.length) throw new HttpError(422, `El bombo ${key} debe ser una lista de equipos`);
      pots[key] = value.map((teamId) => positiveInt(teamId, 'teamId'));
    }
    if (!Object.keys(pots).length) throw new HttpError(422, 'Debes definir al menos un bombo con equipos');
    request.validatedBody = { groupCount, pots };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function parseGroupId(request, _response, next) {
  const id = Number(request.params.groupId);
  if (!Number.isInteger(id) || id <= 0) return next(new HttpError(400, 'Identificador de grupo no válido'));
  request.groupId = id;
  return next();
}
