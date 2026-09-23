import { PLAYER_LIKES } from '../config/player-likes.js';
import * as playerLikeRepository from '../repositories/player-like-repository.js';
import * as playerRepository from '../repositories/player-repository.js';
import * as teamRepository from '../repositories/team-repository.js';
import { publish } from './realtime-service.js';
import { HttpError } from '../utils/http-error.js';

// Cada like suma 0.1 al OVR, pero la tarjeta solo lo muestra en pasos
// enteros (cada 10 likes = +1 visible), con un tope de +14 (140 likes).
function ovrBonusFromCount(count) {
  return Math.min(Math.floor(count / 10), PLAYER_LIKES.maxOvrBonus);
}

// El torneo del equipo actual de ese jugador (para avisar por el canal en
// vivo correcto), o null si no está asignado a ningún equipo/torneo.
async function findTournamentIdForPlayer(playerId) {
  const teamAssignment = await playerRepository.findPlayerTeamAssignment(playerId);
  if (!teamAssignment) return null;
  const tournamentAssignment = await teamRepository.findAnyAssignment(teamAssignment.teamId);
  return tournamentAssignment?.tournamentId ?? null;
}

export async function likePlayer(playerId, ipAddress) {
  const player = await playerRepository.findById(playerId);
  if (!player) throw new HttpError(404, 'Jugador no encontrado');

  const since = new Date(Date.now() - PLAYER_LIKES.cooldownHours * 60 * 60 * 1000);
  const existing = await playerLikeRepository.findRecentByIp(playerId, ipAddress, since);
  if (existing) {
    throw new HttpError(429, `Ya le diste like a este jugador. Podés volver a darlo en ${PLAYER_LIKES.cooldownHours} horas.`);
  }

  await playerLikeRepository.create(playerId, ipAddress);
  const total = await playerLikeRepository.countTotal(playerId);

  // Avisamos por el canal en vivo del torneo de ese jugador para que la
  // página pública refresque su OVR/contador sin esperar al polling.
  const tournamentId = await findTournamentIdForPlayer(playerId);
  if (tournamentId) publish(tournamentId, { type: 'player.liked' });

  return { total, ovrBonus: ovrBonusFromCount(total) };
}

// Deshacer el propio like por error: solo el más reciente de esa IP, y
// solo si todavía está dentro de la ventana de cooldown (la misma en la
// que el frontend muestra el corazón como "ya diste like").
export async function unlikePlayer(playerId, ipAddress) {
  const player = await playerRepository.findById(playerId);
  if (!player) throw new HttpError(404, 'Jugador no encontrado');

  const since = new Date(Date.now() - PLAYER_LIKES.cooldownHours * 60 * 60 * 1000);
  const removed = await playerLikeRepository.deleteMostRecentByIp(playerId, ipAddress, since);
  if (!removed) throw new HttpError(404, 'No tenés un like reciente para quitar en este jugador');

  const total = await playerLikeRepository.countTotal(playerId);

  const tournamentId = await findTournamentIdForPlayer(playerId);
  if (tournamentId) publish(tournamentId, { type: 'player.unliked' });

  return { total, ovrBonus: ovrBonusFromCount(total) };
}

// Para pintar varias tarjetas a la vez (goleadores, valla menos vencida,
// plantel de un equipo) sin una consulta por jugador.
export async function getLikeBonusesForPlayers(playerIds) {
  const bonusById = new Map(playerIds.map((id) => [id, { total: 0, ovrBonus: 0 }]));
  if (!playerIds.length) return bonusById;

  const totals = await playerLikeRepository.countTotalsForPlayers(playerIds);
  for (const row of totals) {
    bonusById.set(row.playerId, { total: row._count._all, ovrBonus: ovrBonusFromCount(row._count._all) });
  }

  return bonusById;
}

// Para el destacado "jugador con más likes" (uno solo): si hay empate se
// desempata por el id más bajo, y si nadie tiene likes no hay nada que
// destacar.
export async function getTopLikedPlayerId(playerIds) {
  const bonusById = await getLikeBonusesForPlayers(playerIds);
  let top = null;
  for (const [playerId, { total }] of bonusById) {
    if (total <= 0) continue;
    if (!top || total > top.total || (total === top.total && playerId < top.playerId)) {
      top = { playerId, total };
    }
  }
  return top;
}
