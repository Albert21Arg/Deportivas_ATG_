import * as tournamentRepository from '../repositories/tournament-repository.js';
import { HttpError } from '../utils/http-error.js';

export async function listTournaments(user) {
  await tournamentRepository.expireOverdue();
  return tournamentRepository.findAllForUser(user);
}

export async function getTournament(id) {
  await tournamentRepository.expireOverdue();
  const tournament = await tournamentRepository.findById(id);

  if (!tournament) {
    throw new HttpError(404, 'Torneo no encontrado');
  }

  return tournament;
}

export async function createTournament(data) {
  const position = await tournamentRepository.getNextPosition();
  return tournamentRepository.create({ ...data, position });
}

export async function updateTournament(id, data) {
  const tournament = await getTournament(id);
  if (data.mode !== undefined && data.mode !== tournament.mode) {
    const hasMatches = await tournamentRepository.hasMatches(id);
    const canStartNextPhase =
      tournament.mode === 'ROUND_ROBIN' &&
      ['GROUP_STAGE', 'KNOCKOUT_SINGLE', 'KNOCKOUT_TWO_LEG'].includes(data.mode) &&
      (!hasMatches || !(await tournamentRepository.hasPendingMatches(id)));

    if (hasMatches && !canStartNextPhase) {
      throw new HttpError(
        409,
        tournament.mode === 'ROUND_ROBIN'
          ? 'Finaliza todos los partidos de todos contra todos antes de iniciar la siguiente fase'
          : 'No puedes cambiar el modo de un torneo que ya tiene partidos registrados'
      );
    }
  }
  return tournamentRepository.update(id, data);
}

export async function setChampion(id, { championTeamId, runnerUpTeamId, thirdPlaceTeamId }) {
  await getTournament(id);
  const teamIds = [championTeamId, runnerUpTeamId, thirdPlaceTeamId].filter(Boolean);
  if (!await tournamentRepository.teamsBelongToTournament(id, teamIds)) {
    throw new HttpError(422, 'Los equipos seleccionados deben pertenecer a este torneo');
  }
  return tournamentRepository.update(id, {
    championTeamId: championTeamId ?? null,
    runnerUpTeamId: runnerUpTeamId ?? null,
    thirdPlaceTeamId: thirdPlaceTeamId ?? null,
    finishedAt: new Date(),
  });
}

export async function updateTournamentStatus(id, status) {
  await getTournament(id);
  return tournamentRepository.update(id, { status });
}

// Sube o baja un torneo un puesto en el orden de la portada, intercambiando
// su posición con la del vecino inmediato. Si ya está en el extremo no hace
// nada (no es un error, simplemente no hay a dónde moverse).
export async function moveTournament(id, direction) {
  await getTournament(id);
  const ordered = await tournamentRepository.findOrderedIds();
  const index = ordered.findIndex((tournament) => tournament.id === id);
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;

  if (neighborIndex < 0 || neighborIndex >= ordered.length) {
    return;
  }

  const current = ordered[index];
  const neighbor = ordered[neighborIndex];
  await tournamentRepository.swapPositions(current.id, current.position, neighbor.id, neighbor.position);
}
