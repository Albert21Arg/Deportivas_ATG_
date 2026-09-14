import * as repository from '../repositories/group-repository.js';
import { HttpError } from '../utils/http-error.js';
import { publish } from './realtime-service.js';

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function listGroups(tournamentId) {
  if (!await repository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  return repository.findByTournament(tournamentId);
}

export async function createGroup(tournamentId, name) {
  if (!await repository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  const existing = await repository.findByTournament(tournamentId);
  const group = await repository.create(tournamentId, name, existing.length);
  publish(tournamentId, { type: 'group.created' });
  return group;
}

// Borra todos los bombos/grupos del torneo sin volver a sortear (a
// diferencia de drawGroups, que borra y crea de nuevo en el mismo paso).
export async function resetGroups(tournamentId) {
  if (await repository.hasPendingGroupMatches(tournamentId)) {
    throw new HttpError(409, 'Finaliza (o cancela) los partidos de los grupos actuales antes de eliminarlos');
  }
  await repository.clearGroups(tournamentId);
  publish(tournamentId, { type: 'group.reset' });
}

export async function deleteGroup(tournamentId, groupId) {
  if (await repository.hasPendingMatchesForGroup(groupId)) {
    throw new HttpError(409, 'Finaliza (o cancela) los partidos de este grupo antes de eliminarlo');
  }
  const deleted = await repository.deleteGroup(groupId, tournamentId);
  if (!deleted) throw new HttpError(404, 'Grupo no encontrado');
  publish(tournamentId, { type: 'group.deleted' });
}

async function assertGroupInTournament(tournamentId, groupId) {
  const groups = await repository.findByTournament(tournamentId);
  if (!groups.some((group) => group.id === groupId)) throw new HttpError(404, 'Grupo no encontrado');
}

export async function assignTeamToGroup(tournamentId, groupId, teamId, pot) {
  await assertGroupInTournament(tournamentId, groupId);
  const assignment = await repository.assignTeam(groupId, teamId, pot ?? 1);
  publish(tournamentId, { type: 'group.team_assigned' });
  return assignment;
}

export async function removeTeamFromGroup(tournamentId, groupId, teamId) {
  await assertGroupInTournament(tournamentId, groupId);
  const removed = await repository.removeTeam(groupId, teamId);
  if (!removed) throw new HttpError(404, 'El equipo no está en este grupo');
  publish(tournamentId, { type: 'group.team_removed' });
}

export async function drawGroups(tournamentId, { groupCount, pots }) {
  if (!await repository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  if (!Number.isInteger(groupCount) || groupCount < 2) throw new HttpError(422, 'Debes definir al menos 2 grupos');

  const potNumbers = Object.keys(pots ?? {});
  for (const potNumber of potNumbers) {
    if (pots[potNumber].length !== groupCount) {
      throw new HttpError(422, `El bombo ${potNumber} debe tener exactamente ${groupCount} equipos para repartir uno por grupo`);
    }
  }

  // Sortear reemplaza los bombos/grupos existentes: si ya hay partidos
  // pendientes generados a partir de ellos, hay que resolverlos (o
  // cancelarlos) antes de rehacer el sorteo.
  if (await repository.hasPendingGroupMatches(tournamentId)) {
    throw new HttpError(409, 'Finaliza (o cancela) los partidos de los grupos actuales antes de repetir el sorteo');
  }

  await repository.clearGroups(tournamentId);
  const groupNames = Array.from({ length: groupCount }, (_, index) => `Grupo ${String.fromCharCode(65 + index)}`);
  const assignments = Array.from({ length: groupCount }, () => []);

  for (const potNumber of potNumbers) {
    const shuffled = shuffle(pots[potNumber]);
    shuffled.forEach((teamId, index) => {
      assignments[index].push({ teamId, pot: Number(potNumber) });
    });
  }

  const draw = await repository.createDraw(tournamentId, groupNames, assignments);
  publish(tournamentId, { type: 'group.draw' });
  return draw;
}
