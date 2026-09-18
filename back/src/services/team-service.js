import * as teamRepository from '../repositories/team-repository.js';
import * as tournamentRepository from '../repositories/tournament-repository.js';
import { HttpError } from '../utils/http-error.js';
import { publish } from './realtime-service.js';

export function listTeams() {
  return teamRepository.findAll();
}

// Contexto del DT logueado: su equipo y el torneo donde está inscrito hoy
// (un equipo solo puede estar en un torneo a la vez, ver assignTeam). El
// front usa el tournamentId para las llamadas de jugadores/inscripción.
export async function getMyTeamContext(teamId) {
  if (!teamId) throw new HttpError(404, 'No tienes un equipo asignado');

  const team = await teamRepository.findById(teamId);
  if (!team) throw new HttpError(404, 'Equipo no encontrado');

  const assignment = await teamRepository.findAnyAssignment(teamId);
  const tournament = assignment ? await tournamentRepository.findById(assignment.tournamentId) : null;

  return { team, tournament };
}

export async function getTeam(id) {
  const team = await teamRepository.findById(id);
  if (!team) throw new HttpError(404, 'Equipo no encontrado');
  return team;
}

export async function createTeam(data, role) {
  const payload = role === 'SUPERADMIN' ? data : { ...data, logo: null, paidUntil: null, logoExpiresAt: null };
  return teamRepository.create(payload);
}

export async function updateTeam(id, data) {
  await getTeam(id);
  const { applyPaidUntilToPlayers, ...teamData } = data;
  const updated = await teamRepository.update(id, teamData);
  if (applyPaidUntilToPlayers) {
    await teamRepository.updatePlayersPaidUntil(id, updated.paidUntil);
  }
  const assignment = await teamRepository.findAnyAssignment(id);
  if (assignment) publish(assignment.tournamentId, { type: 'team.updated' });
  return updated;
}

export async function listTournamentTeams(tournamentId) {
  const tournament = await teamRepository.findTournament(tournamentId);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');
  return teamRepository.findTournamentTeams(tournamentId);
}

export async function assignTeam(tournamentId, teamId) {
  const [tournament, team] = await Promise.all([
    teamRepository.findTournament(tournamentId),
    teamRepository.findRawById(teamId),
  ]);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');
  if (!team || team.status !== 'ACTIVE') throw new HttpError(404, 'Equipo activo no encontrado');

  const existingAssignment = await teamRepository.findAnyAssignment(teamId);
  if (existingAssignment) {
    throw new HttpError(
      409,
      existingAssignment.tournamentId === tournamentId
        ? 'El equipo ya pertenece a este torneo'
        : 'El equipo ya pertenece a otro torneo'
    );
  }

  const created = await teamRepository.createAssignment(tournamentId, teamId);
  publish(tournamentId, { type: 'team.assigned' });
  return created;
}

export async function removeTeam(tournamentId, teamId) {
  const assignment = await teamRepository.findAssignment(tournamentId, teamId);
  if (!assignment) throw new HttpError(404, 'El equipo no pertenece a este torneo');
  await teamRepository.deleteAssignment(tournamentId, teamId);
  publish(tournamentId, { type: 'team.removed' });
}
