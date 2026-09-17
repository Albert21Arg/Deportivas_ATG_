import * as tournamentRepository from '../repositories/tournament-repository.js';
import { HttpError } from '../utils/http-error.js';

// Total a cobrar = precio por equipo × equipos inscritos. Si el superadmin no
// definió un precio, no hay nada que mostrar (no se asume $0 a cobrar).
function withPaymentInfo(tournament) {
  const teamsCount = tournament._count?.teams ?? 0;
  const totalToPay = tournament.pricePerTeam != null ? tournament.pricePerTeam * teamsCount : null;
  return { ...tournament, teamsCount, totalToPay };
}

export async function listTournaments(user) {
  await tournamentRepository.expireOverdue();
  const tournaments = await tournamentRepository.findAllForUser(user);
  return tournaments.map(withPaymentInfo);
}

export async function getTournament(id) {
  await tournamentRepository.expireOverdue();
  const tournament = await tournamentRepository.findById(id);

  if (!tournament) {
    throw new HttpError(404, 'Torneo no encontrado');
  }

  return withPaymentInfo(tournament);
}

export async function createTournament(data) {
  const position = await tournamentRepository.getNextPosition();
  return withPaymentInfo(await tournamentRepository.create({ ...data, position }));
}

export async function updateTournament(id, data) {
  const tournament = await getTournament(id);
  if (data.mode !== undefined && data.mode !== tournament.mode) {
    // El formato se puede cambiar libremente mientras no haya partidos, y
    // luego solo cuando todos los que ya existen quedaron resueltos
    // (finalizados o cancelados, sin nada pendiente). El cambio de modo no
    // borra partidos ni estadísticas: el historial de la fase anterior
    // queda intacto, solo cambia bajo qué formato se juega de aquí en
    // adelante.
    const hasMatches = await tournamentRepository.hasMatches(id);
    if (hasMatches && await tournamentRepository.hasPendingMatches(id)) {
      throw new HttpError(409, 'Finaliza (o cancela) todos los partidos antes de cambiar el formato del torneo');
    }
  }
  return withPaymentInfo(await tournamentRepository.update(id, data));
}

export async function setChampion(id, { championTeamId, runnerUpTeamId, thirdPlaceTeamId }) {
  await getTournament(id);
  const teamIds = [championTeamId, runnerUpTeamId, thirdPlaceTeamId].filter(Boolean);
  if (!await tournamentRepository.teamsBelongToTournament(id, teamIds)) {
    throw new HttpError(422, 'Los equipos seleccionados deben pertenecer a este torneo');
  }
  return withPaymentInfo(await tournamentRepository.update(id, {
    championTeamId: championTeamId ?? null,
    runnerUpTeamId: runnerUpTeamId ?? null,
    thirdPlaceTeamId: thirdPlaceTeamId ?? null,
    finishedAt: new Date(),
  }));
}

export async function updateTournamentStatus(id, status) {
  await getTournament(id);
  return withPaymentInfo(await tournamentRepository.update(id, { status }));
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
