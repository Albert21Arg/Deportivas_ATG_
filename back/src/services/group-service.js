import * as repository from '../repositories/group-repository.js';
import { HttpError } from '../utils/http-error.js';

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
  return repository.create(tournamentId, name, existing.length);
}

export async function deleteGroup(tournamentId, groupId) {
  const deleted = await repository.deleteGroup(groupId, tournamentId);
  if (!deleted) throw new HttpError(404, 'Grupo no encontrado');
}

async function assertGroupInTournament(tournamentId, groupId) {
  const groups = await repository.findByTournament(tournamentId);
  if (!groups.some((group) => group.id === groupId)) throw new HttpError(404, 'Grupo no encontrado');
}

export async function assignTeamToGroup(tournamentId, groupId, teamId, pot) {
  await assertGroupInTournament(tournamentId, groupId);
  return repository.assignTeam(groupId, teamId, pot ?? 1);
}

export async function removeTeamFromGroup(tournamentId, groupId, teamId) {
  await assertGroupInTournament(tournamentId, groupId);
  const removed = await repository.removeTeam(groupId, teamId);
  if (!removed) throw new HttpError(404, 'El equipo no está en este grupo');
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

  await repository.clearGroups(tournamentId);
  const groupNames = Array.from({ length: groupCount }, (_, index) => `Grupo ${String.fromCharCode(65 + index)}`);
  const assignments = Array.from({ length: groupCount }, () => []);

  for (const potNumber of potNumbers) {
    const shuffled = shuffle(pots[potNumber]);
    shuffled.forEach((teamId, index) => {
      assignments[index].push({ teamId, pot: Number(potNumber) });
    });
  }

  return repository.createDraw(tournamentId, groupNames, assignments);
}
