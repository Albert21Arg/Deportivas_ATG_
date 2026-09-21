import { LIKES } from '../config/likes.js';
import * as likeRepository from '../repositories/tournament-like-repository.js';
import * as tournamentRepository from '../repositories/tournament-repository.js';
import { HttpError } from '../utils/http-error.js';

export async function likeTournament(tournamentId, ipAddress) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');

  const since = new Date(Date.now() - LIKES.cooldownHours * 60 * 60 * 1000);
  const existing = await likeRepository.findRecentByIp(tournamentId, ipAddress, since);
  if (existing) {
    throw new HttpError(429, `Ya diste like a este torneo. Podés volver a darlo en ${LIKES.cooldownHours} horas.`);
  }

  await likeRepository.create(tournamentId, ipAddress);
  const total = await likeRepository.countTotal(tournamentId);
  return { total };
}

// Deshacer el propio like por error: solo el más reciente de esa IP, y
// solo si todavía está dentro de la ventana de 24h (la misma en la que el
// frontend muestra el corazón como "ya diste like").
export async function unlikeTournament(tournamentId, ipAddress) {
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');

  const since = new Date(Date.now() - LIKES.cooldownHours * 60 * 60 * 1000);
  const removed = await likeRepository.deleteMostRecentByIp(tournamentId, ipAddress, since);
  if (!removed) throw new HttpError(404, 'No tenés un like reciente para quitar en este torneo');

  const total = await likeRepository.countTotal(tournamentId);
  return { total };
}

// Total + puntaje de ranking para varios torneos a la vez (Home), en dos
// queries agregadas en vez de una por torneo.
export async function getLikeScoresForTournaments(tournamentIds) {
  const scoresById = new Map(tournamentIds.map((id) => [id, { total: 0, recent: 0, score: 0 }]));
  if (!tournamentIds.length) return scoresById;

  const since = new Date(Date.now() - LIKES.recentWindowDays * 24 * 60 * 60 * 1000);
  const [totals, recents] = await Promise.all([
    likeRepository.countTotalsForTournaments(tournamentIds),
    likeRepository.countRecentForTournaments(tournamentIds, since),
  ]);

  for (const row of totals) {
    scoresById.get(row.tournamentId).total = row._count._all;
  }
  for (const row of recents) {
    scoresById.get(row.tournamentId).recent = row._count._all;
  }
  for (const entry of scoresById.values()) {
    entry.score = entry.total + entry.recent * LIKES.recentWeight;
  }

  return scoresById;
}

export async function getLikeScoreForTournament(tournamentId) {
  const scoresById = await getLikeScoresForTournaments([tournamentId]);
  return scoresById.get(tournamentId);
}
