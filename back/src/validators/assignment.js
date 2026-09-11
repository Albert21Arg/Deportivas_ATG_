import { HttpError } from '../utils/http-error.js';

export function validateAssignment(request, _response, next) {
  const userId = Number(request.body?.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return next(new HttpError(422, 'userId debe ser un entero positivo'));
  }

  request.validatedBody = { userId };
  return next();
}

export function parseAssignmentParams(request, _response, next) {
  const tournamentId = Number(request.params.tournamentId ?? request.params.id);
  const userId = request.params.userId ? Number(request.params.userId) : null;

  if (!Number.isInteger(tournamentId) || tournamentId <= 0 || (userId !== null && (!Number.isInteger(userId) || userId <= 0))) {
    return next(new HttpError(400, 'Identificador de asignación no válido'));
  }

  request.tournamentId = tournamentId;
  if (userId !== null) request.userId = userId;
  return next();
}
