import * as repository from '../repositories/player-repository.js';
import { HttpError } from '../utils/http-error.js';
import { publish } from './realtime-service.js';

function id(value) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(400, 'Identificador no válido'); return parsed; }
function withAge(player) { if (!player.birthDate) return { ...player, age: null }; const now = new Date(); const birth = new Date(player.birthDate); let age = now.getFullYear() - birth.getFullYear(); const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()); return { ...player, age: age - Number(beforeBirthday) }; }
async function assertTeam(tournamentId, teamId) { if (!await repository.findTeamInTournament(id(teamId), id(tournamentId))) throw new HttpError(404, 'El equipo no pertenece a este torneo'); }
export async function listPlayers(tournamentId, teamId) { await assertTeam(tournamentId, teamId); return (await repository.findForTeam(id(teamId))).map(({ player, isGoalkeeper }) => withAge({ ...player, isGoalkeeper })); }
export async function createPlayer(tournamentId, teamId, data) { await assertTeam(tournamentId, teamId); const result = await repository.createAndAssign(data, id(teamId)); if (result.conflict) throw new HttpError(409, `El jugador ya pertenece al equipo ${result.conflict}`); publish(id(tournamentId), { type: 'player.created' }); return withAge(result.player); }
export async function updatePlayer(tournamentId, teamId, playerId, data) { await assertTeam(tournamentId, teamId); const player = await repository.findById(id(playerId)); if (!player) throw new HttpError(404, 'Jugador no encontrado'); const updated = await repository.update(player.id, data); publish(id(tournamentId), { type: 'player.updated' }); return withAge(updated); }

// Un jugador es "el arquero" de un equipo específico (vive en la relación
// PlayerTeam, no en Player): un mismo jugador podría estar en más de un
// equipo, y cada equipo tiene como máximo un arquero a la vez.
export async function setGoalkeeper(tournamentId, teamId, playerId, isGoalkeeper) {
  await assertTeam(tournamentId, teamId);
  const assignment = await repository.findPlayerTeam(id(playerId), id(teamId));
  if (!assignment) throw new HttpError(404, 'El jugador no pertenece a este equipo');
  const { player, isGoalkeeper: updatedFlag } = await repository.setGoalkeeper(id(playerId), id(teamId), Boolean(isGoalkeeper));
  publish(id(tournamentId), { type: 'player.goalkeeper_updated' });
  return withAge({ ...player, isGoalkeeper: updatedFlag });
}

// Visibilidad del nombre: interruptor manual del superadmin, independiente
// del pago (playerExpired). Si showName=false, el nombre se ve borroso en
// todos los sitios públicos aunque el jugador esté al día con su pago.
export async function setShowName(tournamentId, teamId, playerId, showName) {
  await assertTeam(tournamentId, teamId);
  const player = await repository.findById(id(playerId));
  if (!player) throw new HttpError(404, 'Jugador no encontrado');
  const updated = await repository.setShowName(id(playerId), Boolean(showName));
  publish(id(tournamentId), { type: 'player.show_name_updated' });
  return withAge(updated);
}

// Multa por tarjetas: aparte del pago individual de la foto, y separada por
// tipo (amarilla/roja/azul) — pagar las amarillas no cubre las rojas. Cada
// tipo se compara contra su propio total, no es un simple interruptor: si
// el jugador ya pagó sus amarillas y recibe una amarilla nueva, esa vuelve
// a aparecer como pendiente sin afectar rojas ni azules. paid=false revierte
// la marca de ESE tipo (vuelve a deber todas las de ese tipo).
export async function setCardFinePaid(tournamentId, playerId, cardType, paid) {
  if (!repository.CARD_FINE_FIELD[cardType]) throw new HttpError(422, 'Tipo de tarjeta no válido');

  const player = await repository.findById(id(playerId));
  if (!player) throw new HttpError(404, 'Jugador no encontrado');

  const assignment = await repository.findPlayerTeamAssignment(id(playerId));
  if (!assignment) throw new HttpError(404, 'El jugador no pertenece a ningún equipo');
  await assertTeam(tournamentId, assignment.teamId);

  const totalCards = await repository.countCardEventsByType(id(playerId), id(tournamentId), cardType);
  const paidCount = paid ? totalCards : 0;
  const updated = await repository.setCardTypeFinePaidCount(id(playerId), cardType, paidCount);
  publish(id(tournamentId), { type: 'player.card_fine_updated' });

  return {
    ...withAge(updated),
    cardType,
    totalCards,
    pendingCards: Math.max(0, totalCards - paidCount),
  };
}
