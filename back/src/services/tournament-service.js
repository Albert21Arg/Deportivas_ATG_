import * as tournamentRepository from '../repositories/tournament-repository.js';
import { HttpError } from '../utils/http-error.js';

export async function listTournaments(user) {
  return tournamentRepository.findAllForUser(user);
}

export async function getTournament(id) {
  const tournament = await tournamentRepository.findById(id);

  if (!tournament) {
    throw new HttpError(404, 'Torneo no encontrado');
  }

  return tournament;
}

export function createTournament(data) {
  return tournamentRepository.create(data);
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
