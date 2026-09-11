import * as teamRepository from '../repositories/team-repository.js';
import { HttpError } from '../utils/http-error.js';

export function listTeams() {
  return teamRepository.findAll();
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
  return teamRepository.update(id, data);
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

  return teamRepository.createAssignment(tournamentId, teamId);
}

export async function removeTeam(tournamentId, teamId) {
  const assignment = await teamRepository.findAssignment(tournamentId, teamId);
  if (!assignment) throw new HttpError(404, 'El equipo no pertenece a este torneo');
  await teamRepository.deleteAssignment(tournamentId, teamId);
}
