import { HttpError } from '../utils/http-error.js';

function positiveInt(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(422, `${field} debe ser un entero positivo`);
  return parsed;
}

export function validateCreateBracket(request, _response, next) {
  try {
    const body = request.body ?? {};
    if (!Array.isArray(body.teamIds) || body.teamIds.length < 2) {
      throw new HttpError(422, 'Debes enviar la lista ordenada de equipos (teamIds) para armar la llave');
    }
    const teamIds = body.teamIds.map((teamId) => positiveInt(teamId, 'teamId'));
    if (new Set(teamIds).size !== teamIds.length) throw new HttpError(422, 'No puedes repetir el mismo equipo en la llave');
    const data = { teamIds };
    if (body.startDate !== undefined && body.startDate !== '') data.startDate = body.startDate;
    if (body.time !== undefined && body.time !== '') data.time = body.time;
    request.validatedBody = data;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateTieWinner(request, _response, next) {
  try {
    request.validatedBody = { winnerTeamId: positiveInt(request.body?.winnerTeamId, 'winnerTeamId') };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function parseTieId(request, _response, next) {
  const id = Number(request.params.tieId);
  if (!Number.isInteger(id) || id <= 0) return next(new HttpError(400, 'Identificador de llave no válido'));
  request.tieId = id;
  return next();
}
