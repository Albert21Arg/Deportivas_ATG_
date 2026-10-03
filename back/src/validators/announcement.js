import { HttpError } from '../utils/http-error.js';

function seconds(value, field, { min, max }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new HttpError(422, `${field} debe ser un entero entre ${min} y ${max}`);
  }
  return parsed;
}

function parseTournamentId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(422, 'Torneo no válido');
  }
  return parsed;
}

function parseExpiresAt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(422, 'expiresAt no es una fecha válida');
  }
  return parsed;
}

export function validateAnnouncement(request, _response, next) {
  try {
    const body = request.body ?? {};
    if (!request.file) throw new HttpError(422, 'Debes subir una imagen para el anuncio');
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 160) throw new HttpError(422, 'El título es obligatorio y debe tener máximo 160 caracteres');
    if (body.linkUrl && !/^https?:\/\//i.test(body.linkUrl)) throw new HttpError(422, 'El enlace debe comenzar por http:// o https://');
    request.validatedBody = {
      title: body.title.trim(),
      imageUrl: `/uploads/announcements/${request.file.filename}`,
      linkUrl: body.linkUrl?.trim() || null,
      delaySeconds: seconds(body.delaySeconds ?? 0, 'delaySeconds', { min: 0, max: 86400 }),
      durationSeconds: seconds(body.durationSeconds ?? 10, 'durationSeconds', { min: 1, max: 86400 }),
      status: body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      tournamentId: parseTournamentId(body.tournamentId),
      expiresAt: parseExpiresAt(body.expiresAt),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateAnnouncementUpdate(request, _response, next) {
  try {
    const body = request.body ?? {};
    const data = {};
    if (body.status !== undefined && !['ACTIVE', 'INACTIVE'].includes(body.status)) throw new HttpError(422, 'Estado no válido');
    if (body.status !== undefined) data.status = body.status;
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl?.trim() || null;
    if (body.delaySeconds !== undefined) data.delaySeconds = seconds(body.delaySeconds, 'delaySeconds', { min: 0, max: 86400 });
    if (body.durationSeconds !== undefined) data.durationSeconds = seconds(body.durationSeconds, 'durationSeconds', { min: 1, max: 86400 });
    if (body.tournamentId !== undefined) data.tournamentId = parseTournamentId(body.tournamentId);
    if (body.expiresAt !== undefined) data.expiresAt = parseExpiresAt(body.expiresAt);
    if (request.file) data.imageUrl = `/uploads/announcements/${request.file.filename}`;
    if (!Object.keys(data).length) throw new HttpError(422, 'No hay cambios para guardar');
    request.validatedBody = data;
    return next();
  } catch (error) {
    return next(error);
  }
}
