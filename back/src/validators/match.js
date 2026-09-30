import { HttpError } from '../utils/http-error.js';

const VALID_STATUSES = new Set(['SCHEDULED', 'STARTED', 'FINISHED', 'POSTPONED', 'CANCELLED']);

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(422, 'La fecha debe tener formato YYYY-MM-DD');
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(422, 'La fecha no es válida');
  }
  return date;
}

function parseTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new HttpError(422, 'La hora debe tener formato HH:mm');
  }
  return value;
}

function parseStreamUrl(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 500 || !/^https?:\/\//i.test(value)) {
    throw new HttpError(422, 'El enlace de transmisión debe ser una URL http o https');
  }
  return value.trim();
}

function parseTeamId(value, field) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(422, `${field} debe ser un entero positivo`);
  return id;
}

function parseScore(value, field) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0) throw new HttpError(422, `${field} debe ser un entero no negativo`);
  return score;
}

function parsePenalties(value) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new HttpError(422, 'penalties debe ser una lista de { teamId, playerId }');
  return value.map((entry) => ({
    teamId: parseTeamId(entry?.teamId, 'teamId'),
    playerId: parseTeamId(entry?.playerId, 'playerId'),
  }));
}

export function validateCreateMatch(request, _response, next) {
  try {
    const body = request.body ?? {};
    const homeTeamId = parseTeamId(body.homeTeamId, 'homeTeamId');
    const awayTeamId = parseTeamId(body.awayTeamId, 'awayTeamId');
    if (homeTeamId === awayTeamId) throw new HttpError(422, 'Un equipo no puede jugar contra sí mismo');
    request.validatedBody = {
      homeTeamId,
      awayTeamId,
      date: parseDate(body.date),
      time: parseTime(body.time),
      streamUrl: parseStreamUrl(body.streamUrl),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateUpdateMatch(request, _response, next) {
  try {
    const body = request.body ?? {};
    const data = {};
    if (body.homeTeamId !== undefined) data.homeTeamId = parseTeamId(body.homeTeamId, 'homeTeamId');
    if (body.awayTeamId !== undefined) data.awayTeamId = parseTeamId(body.awayTeamId, 'awayTeamId');
    if (data.homeTeamId !== undefined && data.awayTeamId !== undefined && data.homeTeamId === data.awayTeamId) {
      throw new HttpError(422, 'Un equipo no puede jugar contra sí mismo');
    }
    if (body.streamUrl !== undefined) data.streamUrl = parseStreamUrl(body.streamUrl);
    if (body.date !== undefined) data.date = parseDate(body.date);
    if (body.time !== undefined) data.time = parseTime(body.time);
    if (body.status !== undefined && !VALID_STATUSES.has(body.status)) throw new HttpError(422, 'Estado de partido no válido');
    if (body.status !== undefined) data.status = body.status;
    if (!Object.keys(data).length) throw new HttpError(422, 'Debes enviar al menos un campo para actualizar');
    request.validatedBody = data;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateResult(request, _response, next) {
  try {
    request.validatedBody = {
      homeScore: parseScore(request.body?.homeScore, 'homeScore'),
      awayScore: parseScore(request.body?.awayScore, 'awayScore'),
      penalties: parsePenalties(request.body?.penalties),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateFinish(request, _response, next) {
  try {
    request.validatedBody = { penalties: parsePenalties(request.body?.penalties) };
    return next();
  } catch (error) {
    return next(error);
  }
}

function parseMinutes(value, field, { max = 60 } = {}) {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > max) {
    throw new HttpError(422, `${field} debe ser un entero entre 1 y ${max}`);
  }
  return minutes;
}

export function validateStart(request, _response, next) {
  try {
    request.validatedBody = {
      halfDurationMinutes: parseMinutes(request.body?.halfDurationMinutes, 'halfDurationMinutes', { max: 60 }),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateExtraTime(request, _response, next) {
  try {
    request.validatedBody = {
      minutes: parseMinutes(request.body?.minutes, 'minutes', { max: 15 }),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function parseMatchId(request, _response, next) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(new HttpError(400, 'Identificador de partido no válido'));
  request.matchId = id;
  return next();
}

export function parseTournamentId(request, _response, next) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(new HttpError(400, 'Identificador de torneo no válido'));
  request.tournamentId = id;
  return next();
}

export function validateGenerateFixtures(request, _response, next) {
  try {
    const body = request.body ?? {};
    const data = {};
    if (body.groupId !== undefined && body.groupId !== null && body.groupId !== '') data.groupId = parseTeamId(body.groupId, 'groupId');
    if (body.startDate !== undefined && body.startDate !== '') data.startDate = body.startDate;
    if (body.time !== undefined && body.time !== '') data.time = parseTime(body.time);
    if (body.intervalDays !== undefined && body.intervalDays !== '') data.intervalDays = parseScore(body.intervalDays, 'intervalDays');
    request.validatedBody = data;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function parseFixturesScopeQuery(request, _response, next) {
  try {
    const raw = request.query.groupId;
    request.fixturesGroupId = raw !== undefined && raw !== null && raw !== '' ? parseTeamId(raw, 'groupId') : null;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateMatchEvent(request, _response, next) { try { const body = request.body ?? {}; const type = body.type; if (!['GOAL', 'OWN_GOAL', 'YELLOW_CARD', 'RED_CARD', 'BLUE_CARD'].includes(type)) throw new HttpError(422, 'Tipo de evento no válido'); const teamId = parseTeamId(body.teamId, 'teamId'); const playerId = body.playerId === undefined || body.playerId === '' ? null : parseTeamId(body.playerId, 'playerId'); if (!playerId) throw new HttpError(422, type === 'GOAL' ? 'Debes seleccionar un jugador o marcar autogol' : 'Debes seleccionar un jugador'); const minute = body.minute === undefined || body.minute === '' ? null : parseScore(body.minute, 'minute'); if (minute !== null && minute > 130) throw new HttpError(422, 'El minuto debe estar entre 0 y 130'); const period = body.period === undefined || body.period === null || body.period === '' ? null : Number(body.period); if (period !== null && period !== 1 && period !== 2) throw new HttpError(422, 'El tiempo debe ser 1 o 2'); request.validatedBody = { type, teamId, playerId, minute, period }; return next(); } catch (error) { return next(error); } }
