import fs from 'node:fs/promises';
import path from 'node:path';
import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';

// El dibujo es el mismo que usa la página pública para el botón "Compartir"
// (así la vista previa del enlace y la imagen descargada son iguales).
import { drawLiveMatchShareImage, drawRoundShareImage } from '../../../front/src/utils/round-share-image.js';
import * as publicRepository from '../repositories/public-repository.js';
import { withExpiryFlags } from '../utils/team-expiry.js';
import { HttpError } from '../utils/http-error.js';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

// Primera fuente instalada de la lista (Windows: Segoe UI; Mac: Arial).
const FONT_FAMILY = ['Segoe UI', 'Arial', 'Helvetica', 'DejaVu Sans'].find((family) => GlobalFonts.has(family)) ?? 'sans-serif';

export function isValidDay(value) {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Mismo formato que la página pública: "Domingo 4 octubre 2026".
export function formatDay(day) {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(year, month - 1, dayOfMonth, 12)))
    .replace(',', '')
    .replace(/ de /, ' ')
    .replace(/ de /, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

// Mismo formato que la página pública: "12:00 p. m.".
function formatTime(value) {
  const [hours, minutes] = String(value).split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
    .format(date)
    .toLowerCase();
}

// Datos de una fecha: torneo, número de fecha y partidos de ese día.
export async function getRoundInfo(tournamentId, day) {
  if (!isValidDay(day)) throw new HttpError(422, 'La fecha debe tener formato YYYY-MM-DD');

  const tournament = await publicRepository.findActiveTournament(tournamentId);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');

  const [matches, roundDates] = await Promise.all([
    publicRepository.findMatchesOnDate(tournamentId, day),
    publicRepository.findRoundDates(tournamentId),
  ]);
  if (!matches.length) throw new HttpError(404, 'No hay partidos en esa fecha');

  const days = [...new Set(roundDates.map(({ date }) => new Date(date).toISOString().slice(0, 10)))].sort();
  const roundIndex = days.indexOf(day);

  return {
    tournament,
    roundNumber: roundIndex === -1 ? null : roundIndex + 1,
    matches: matches.map((match) => ({
      ...match,
      homeTeam: withExpiryFlags(match.homeTeam),
      awayTeam: withExpiryFlags(match.awayTeam),
    })),
  };
}

// Escudo guardado en este servidor (/uploads/...) o en otro sitio (URL).
// Si no se puede cargar (no existe, tarda demasiado, formato raro), la
// imagen usa la silueta con iniciales.
async function loadLogo(source) {
  try {
    if (source.startsWith('/uploads/')) {
      const file = path.resolve('uploads', source.slice('/uploads/'.length));
      if (!file.startsWith(path.resolve('uploads'))) return null;
      return await loadImage(await fs.readFile(file));
    }

    const response = await fetch(source, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    return await loadImage(Buffer.from(await response.arrayBuffer()));
  } catch {
    return null;
  }
}

/**
 * Imagen JPEG de una fecha. format: "landscape" (1200x630, vista previa de
 * enlaces) o "portrait" (vertical, igual a la del botón Compartir).
 */
export async function getRoundImage(tournamentId, day, format = 'landscape', pageUrl = '') {
  const key = `${tournamentId}:${day}:${format}:${pageUrl}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.buffer;

  const { tournament, roundNumber, matches } = await getRoundInfo(tournamentId, day);

  const canvas = await drawRoundShareImage({
    createCanvas,
    loadImage: loadLogo,
    format,
    tournamentName: tournament.name,
    title: roundNumber ? `Fecha ${roundNumber}` : formatDay(day),
    subtitle: formatDay(day),
    matches,
    formatTime,
    hideLogo: (team) => Boolean(team?.logoExpired),
    footer: pageUrl.replace(/^https?:\/\//, ''),
    fontFamily: FONT_FAMILY,
  });

  // JPEG: pesa bastante menos que PNG (WhatsApp ignora imágenes de vista
  // previa muy pesadas).
  const buffer = await canvas.encode('jpeg', 88);

  cache.set(key, { buffer, expiresAt: Date.now() + CACHE_TTL_MS });
  for (const [cacheKey, entry] of cache) {
    if (entry.expiresAt <= Date.now()) cache.delete(cacheKey);
  }

  return buffer;
}

export async function getLiveMatchImage(tournamentId, matchId, pageUrl = '') {
  const [tournament, match] = await Promise.all([
    publicRepository.findActiveTournament(tournamentId),
    publicRepository.findLiveMatchById(tournamentId, matchId),
  ]);
  if (!tournament || !match) throw new HttpError(404, 'Partido en vivo no encontrado');

  const score = `${match.homeScore ?? 0}-${match.awayScore ?? 0}`;
  const key = `live:${tournamentId}:${matchId}:${score}:${match.time}:${pageUrl}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.buffer;

  const imageMatch = {
    ...match,
    homeTeam: withExpiryFlags(match.homeTeam),
    awayTeam: withExpiryFlags(match.awayTeam),
  };
  const canvas = await drawLiveMatchShareImage({
    createCanvas,
    loadImage,
    tournamentName: tournament.name,
    match: imageMatch,
    centerLabel: score,
    footer: pageUrl.replace(/^https?:\/\//, ''),
    fontFamily: FONT_FAMILY,
  });

  const buffer = await canvas.encode('png');
  cache.set(key, { buffer, expiresAt: Date.now() + 15 * 1000 });
  return buffer;
}
