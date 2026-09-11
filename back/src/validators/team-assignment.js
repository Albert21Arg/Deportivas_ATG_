import { HttpError } from '../utils/http-error.js';

export function validateTeamAssignment(request, _response, next) {
  const teamId = Number(request.body?.teamId);
  if (!Number.isInteger(teamId) || teamId <= 0) return next(new HttpError(422, 'teamId debe ser un entero positivo'));
  request.validatedBody = { teamId };
  return next();
}
