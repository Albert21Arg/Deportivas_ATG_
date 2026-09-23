import { TEAM_LIKES } from '../config/team-likes.js';
import * as teamLikeRepository from '../repositories/team-like-repository.js';
import * as teamRepository from '../repositories/team-repository.js';
import { publish } from './realtime-service.js';
import { HttpError } from '../utils/http-error.js';

export async function likeTeam(teamId, ipAddress) {
  const team = await teamRepository.findRawById(teamId);
  if (!team) throw new HttpError(404, 'Equipo no encontrado');

  const since = new Date(Date.now() - TEAM_LIKES.cooldownHours * 60 * 60 * 1000);
  const existing = await teamLikeRepository.findRecentByIp(teamId, ipAddress, since);
  if (existing) {
    throw new HttpError(429, `Ya le diste like a este equipo. Podés volver a darlo en ${TEAM_LIKES.cooldownHours} horas.`);
  }

  await teamLikeRepository.create(teamId, ipAddress);
  const total = await teamLikeRepository.countTotal(teamId);

  // El like puede cambiar quién es "el equipo líder" del torneo (afecta el
  // OVR de todos sus jugadores), así que avisamos por el canal en vivo de
  // ese torneo para que la página pública se refresque sola.
  const assignment = await teamRepository.findAnyAssignment(teamId);
  if (assignment) publish(assignment.tournamentId, { type: 'team.liked' });

  return { total };
}

// Deshacer el propio like por error: solo el más reciente de esa IP, y
// solo si todavía está dentro de la ventana de cooldown (la misma en la
// que el frontend muestra el corazón como "ya diste like").
export async function unlikeTeam(teamId, ipAddress) {
  const team = await teamRepository.findRawById(teamId);
  if (!team) throw new HttpError(404, 'Equipo no encontrado');

  const since = new Date(Date.now() - TEAM_LIKES.cooldownHours * 60 * 60 * 1000);
  const removed = await teamLikeRepository.deleteMostRecentByIp(teamId, ipAddress, since);
  if (!removed) throw new HttpError(404, 'No tenés un like reciente para quitar en este equipo');

  const total = await teamLikeRepository.countTotal(teamId);

  const assignment = await teamRepository.findAnyAssignment(teamId);
  if (assignment) publish(assignment.tournamentId, { type: 'team.unliked' });

  return { total };
}

export async function getTeamLikeTotals(teamIds) {
  const totalById = new Map(teamIds.map((id) => [id, 0]));
  if (!teamIds.length) return totalById;

  const totals = await teamLikeRepository.countTotalsForTeams(teamIds);
  for (const row of totals) {
    totalById.set(row.teamId, row._count._all);
  }

  return totalById;
}

// Dentro de un torneo (teamIds = equipos de ESE torneo), el/los equipos con
// más likes (empatando si corresponde) le suman TEAM_LIKES.bonusOvr a cada
// uno de sus jugadores. Si nadie tiene likes (máximo 0), no hay líder.
export async function getLeaderTeamIds(teamIds) {
  const totalById = await getTeamLikeTotals(teamIds);
  const max = Math.max(0, ...totalById.values());
  if (max === 0) return new Set();
  return new Set([...totalById.entries()].filter(([, total]) => total === max).map(([teamId]) => teamId));
}

// Para el destacado "equipo con más likes" (un solo equipo, no un set): si
// hay empate se desempata por el id más bajo, y si nadie tiene likes no hay
// nada que destacar.
export async function getTopLikedTeamId(teamIds) {
  const totalById = await getTeamLikeTotals(teamIds);
  let top = null;
  for (const [teamId, total] of totalById) {
    if (total <= 0) continue;
    if (!top || total > top.total || (total === top.total && teamId < top.teamId)) {
      top = { teamId, total };
    }
  }
  return top;
}
