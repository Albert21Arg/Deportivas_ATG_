import { HttpError } from '../utils/http-error.js';

const VALID_STATUSES = new Set(['ACTIVE', 'INACTIVE']);
export const VALID_MODES = new Set(['ROUND_ROBIN', 'GROUP_STAGE', 'KNOCKOUT_SINGLE', 'KNOCKOUT_TWO_LEG']);

function validateExpiryDate(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(422, `${field} no es una fecha válida`);
  return date;
}

function readTournamentPayload(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) {
      throw new HttpError(422, 'El nombre del torneo es obligatorio y debe tener entre 1 y 120 caracteres');
    }
    payload.name = body.name.trim();
  }

  if (!partial || body.description !== undefined) {
    if (body.description !== null && body.description !== undefined && (typeof body.description !== 'string' || body.description.trim().length > 2000)) {
      throw new HttpError(422, 'La descripción debe tener como máximo 2000 caracteres');
    }
    payload.description = body.description?.trim() || null;
  }

  if (body.logo !== undefined) {
    if (body.logo !== null && body.logo !== '' && (typeof body.logo !== 'string' || body.logo.length > 500)) {
      throw new HttpError(422, 'El logo debe ser una URL o ruta de máximo 500 caracteres');
    }
    payload.logo = body.logo?.trim() || null;
  }

  if (body.expiresAt !== undefined) {
    payload.expiresAt = validateExpiryDate(body.expiresAt, 'expiresAt');
  }

  if (body.playerRegistrationDeadline !== undefined) {
    payload.playerRegistrationDeadline = validateExpiryDate(body.playerRegistrationDeadline, 'playerRegistrationDeadline');
  }

  if (body.pricePerTeam !== undefined) {
    if (body.pricePerTeam === null || body.pricePerTeam === '') {
      payload.pricePerTeam = null;
    } else {
      const parsed = Number(body.pricePerTeam);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) {
        throw new HttpError(422, 'pricePerTeam debe ser un número mayor o igual a 0');
      }
      payload.pricePerTeam = Math.round(parsed);
    }
  }

  if (body.championLabel !== undefined) {
    if (body.championLabel !== null && body.championLabel !== '' && (typeof body.championLabel !== 'string' || body.championLabel.trim().length > 60)) {
      throw new HttpError(422, 'El texto del campeón debe tener como máximo 60 caracteres');
    }
    payload.championLabel = body.championLabel?.trim() || null;
  }

  if (body.mode !== undefined) {
    if (typeof body.mode !== 'string' || !VALID_MODES.has(body.mode)) {
      throw new HttpError(422, 'El modo de torneo no es válido');
    }
    payload.mode = body.mode;
  }

  if (body.hasThirdPlace !== undefined) {
    if (typeof body.hasThirdPlace !== 'boolean') {
      throw new HttpError(422, 'hasThirdPlace debe ser verdadero o falso');
    }
    payload.hasThirdPlace = body.hasThirdPlace;
  }

  if (body.blueCardEnabled !== undefined) {
    if (typeof body.blueCardEnabled !== 'boolean') {
      throw new HttpError(422, 'blueCardEnabled debe ser verdadero o falso');
    }
    payload.blueCardEnabled = body.blueCardEnabled;
  }

  if (body.awayGoalsRule !== undefined) {
    if (typeof body.awayGoalsRule !== 'boolean') {
      throw new HttpError(422, 'awayGoalsRule debe ser verdadero o falso');
    }
    payload.awayGoalsRule = body.awayGoalsRule;
  }

  return payload;
}

export function validateCreateTournament(request, _response, next) {
  try {
    request.validatedBody = readTournamentPayload(request.body ?? {});
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateUpdateTournament(request, _response, next) {
  try {
    request.validatedBody = readTournamentPayload(request.body ?? {}, { partial: true });
    if (!Object.keys(request.validatedBody).length) {
      throw new HttpError(422, 'Debes enviar al menos un campo para actualizar');
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

// A diferencia de expiresAt/mode/etc. (solo superadmin vía PUT /:id), esta
// la puede tocar cualquier admin asignado al torneo: son ellos quienes
// deciden hasta cuándo sus DT pueden inscribir jugadores.
export function validateUpdatePlayerRegistrationDeadline(request, _response, next) {
  try {
    request.validatedBody = {
      playerRegistrationDeadline: validateExpiryDate(request.body?.playerRegistrationDeadline, 'playerRegistrationDeadline'),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateUpdateTournamentMode(request, _response, next) {
  try {
    const body = request.body ?? {};

    if (typeof body.mode !== 'string' || !VALID_MODES.has(body.mode)) {
      throw new HttpError(422, 'El modo de torneo no es válido');
    }

    const payload = { mode: body.mode };

    if (body.hasThirdPlace !== undefined) {
      if (typeof body.hasThirdPlace !== 'boolean') {
        throw new HttpError(422, 'hasThirdPlace debe ser verdadero o falso');
      }
      payload.hasThirdPlace = body.hasThirdPlace;
    }

    if (body.awayGoalsRule !== undefined) {
      if (typeof body.awayGoalsRule !== 'boolean') {
        throw new HttpError(422, 'awayGoalsRule debe ser verdadero o falso');
      }
      payload.awayGoalsRule = body.awayGoalsRule;
    }

    request.validatedBody = payload;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateMove(request, _response, next) {
  const { direction } = request.body ?? {};

  if (direction !== 'up' && direction !== 'down') {
    return next(new HttpError(422, 'direction debe ser "up" o "down"'));
  }

  request.validatedBody = { direction };
  return next();
}

export function validateStatus(request, _response, next) {
  const { status } = request.body ?? {};

  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    return next(new HttpError(422, 'El estado debe ser ACTIVE o INACTIVE'));
  }

  request.validatedBody = { status };
  return next();
}

function optionalTeamId(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(422, `${field} no es válido`);
  }
  return parsed;
}

export function validateChampion(request, _response, next) {
  try {
    const body = request.body ?? {};
    request.validatedBody = {
      championTeamId: optionalTeamId(body.championTeamId, 'championTeamId'),
      runnerUpTeamId: optionalTeamId(body.runnerUpTeamId, 'runnerUpTeamId'),
      thirdPlaceTeamId: optionalTeamId(body.thirdPlaceTeamId, 'thirdPlaceTeamId'),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function parseTournamentId(request, _response, next) {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return next(new HttpError(400, 'Identificador de torneo no válido'));
  }

  request.tournamentId = id;
  return next();
}
