import bcrypt from 'bcrypt';

import { AUTH } from '../config/auth.js';
import * as teamRepository from '../repositories/team-repository.js';
import * as userRepository from '../repositories/user-repository.js';
import { HttpError } from '../utils/http-error.js';

function id(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(400, 'Identificador no válido');
  return parsed;
}

async function assertTeamInTournament(tournamentId, teamId) {
  const assignment = await teamRepository.findAssignment(id(tournamentId), id(teamId));
  if (!assignment) throw new HttpError(404, 'El equipo no pertenece a este torneo');
}

export async function getTeamDt(tournamentId, teamId) {
  await userRepository.deleteStaleDtAccounts();
  await assertTeamInTournament(tournamentId, teamId);
  return userRepository.findDtByTeam(id(teamId));
}

// Alta o reset de credenciales del DT de un equipo (email+contraseña).
// Como teamId es único en User, si ya existe un DT para este equipo se
// actualizan sus credenciales en vez de crear una cuenta nueva.
export async function upsertTeamDt(tournamentId, teamId, { email, password }) {
  await userRepository.deleteStaleDtAccounts();
  await assertTeamInTournament(tournamentId, teamId);

  const team = await teamRepository.findRawById(id(teamId));
  if (!team) throw new HttpError(404, 'Equipo no encontrado');

  const passwordHash = await bcrypt.hash(password, AUTH.bcryptRounds);

  try {
    return await userRepository.upsertDtForTeam(id(teamId), {
      name: `DT ${team.name}`,
      email,
      password: passwordHash,
      role: AUTH.roles.DT,
      status: AUTH.statuses.ACTIVE,
    });
  } catch (error) {
    if (error.code === 'P2002') throw new HttpError(409, 'Ya existe un usuario con ese email');
    throw error;
  }
}
