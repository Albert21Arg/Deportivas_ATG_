import { VIEWS } from '../config/views.js';
import * as tournamentRepository from '../repositories/tournament-repository.js';
import * as viewRepository from '../repositories/tournament-view-repository.js';
import { HttpError } from '../utils/http-error.js';

// Una misma IP no cuenta como visita nueva si ya registró una para este
// torneo dentro de los últimos VIEWS.cooldownMinutes — así un refresh o el
// polling de la página no infla el contador, solo un "ingreso" espaciado
// en el tiempo cuenta.
export async function recordVisit(tournamentId, ipAddress) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) return; // Vista pública con un id inválido: no hay nada que contar.

  const since = new Date(Date.now() - VIEWS.cooldownMinutes * 60 * 1000);
  const recent = await viewRepository.findRecentByIp(tournamentId, ipAddress, since);
  if (recent) return;

  await viewRepository.create(tournamentId, ipAddress);
}

export async function getStats(tournamentId) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');

  const [total, byDay, byMonth] = await Promise.all([
    viewRepository.countTotal(tournamentId),
    viewRepository.countByDay(tournamentId),
    viewRepository.countByMonth(tournamentId),
  ]);

  return {
    total,
    byDay: byDay.map((row) => ({ day: row.day, count: Number(row.count) })),
    byMonth: byMonth.map((row) => ({ month: row.month, count: Number(row.count) })),
  };
}
