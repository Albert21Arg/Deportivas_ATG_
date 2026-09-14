import { HttpError } from '../utils/http-error.js';

export function validateAssignment(request, _response, next) {
  const userId = Number(request.body?.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return next(new HttpError(422, 'userId debe ser un entero positivo'));
  }

  request.validatedBody = { userId };
  return next();
}

// Se registra con router.use(), antes de que Express resuelva la ruta
// específica que se vaya a usar: aquí :userId todavía no existe en
// request.params (solo :id, heredado del router padre), sin importar qué
// ruta termine haciendo match. Por eso este parser NO puede leer userId;
// eso se hace aparte, en parseUserIdParam, sobre la ruta que sí lo declara.
export function parseAssignmentParams(request, _response, next) {
  const tournamentId = Number(request.params.tournamentId ?? request.params.id);

  if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
    return next(new HttpError(400, 'Identificador de torneo no válido'));
  }

  request.tournamentId = tournamentId;
  return next();
}

// A diferencia de parseAssignmentParams, este se monta directamente en la
// ruta '/:userId' (después de esa ruta ya matcheó), así que aquí sí está
// disponible request.params.userId.
export function parseUserIdParam(request, _response, next) {
  const userId = Number(request.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return next(new HttpError(400, 'Identificador de usuario no válido'));
  }

  request.userId = userId;
  return next();
}
