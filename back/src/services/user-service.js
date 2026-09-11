import bcrypt from 'bcrypt';

import { AUTH } from '../config/auth.js';
import * as userRepository from '../repositories/user-repository.js';
import { HttpError } from '../utils/http-error.js';

export function listAdmins() {
  return userRepository.findAllAdmins();
}

export async function createAdmin({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, AUTH.bcryptRounds);

  try {
    return await userRepository.create({
      name,
      email,
      password: passwordHash,
      role: AUTH.roles.ADMIN,
      status: AUTH.statuses.ACTIVE,
    });
  } catch (error) {
    if (error.code === 'P2002') throw new HttpError(409, 'Ya existe un usuario con ese email');
    throw error;
  }
}

export async function updateAdmin(id, data) {
  const user = await userRepository.findById(id);

  if (!user || user.role !== AUTH.roles.ADMIN) {
    throw new HttpError(404, 'Administrador no encontrado');
  }

  const updateData = { ...data };
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, AUTH.bcryptRounds);
  }

  try {
    return await userRepository.update(id, updateData);
  } catch (error) {
    if (error.code === 'P2002') throw new HttpError(409, 'Ya existe un usuario con ese email');
    throw error;
  }
}

export async function listTournamentAdmins(tournamentId) {
  return userRepository.findTournamentAdmins(tournamentId);
}

export async function assignAdmin(tournamentId, userId) {
  const user = await userRepository.findById(userId);

  if (!user || user.role !== AUTH.roles.ADMIN) {
    throw new HttpError(404, 'Administrador no encontrado');
  }
  if (user.status !== AUTH.statuses.ACTIVE) {
    throw new HttpError(409, 'No puedes asignar un administrador inactivo');
  }

  try {
    return await userRepository.createAssignment(tournamentId, userId);
  } catch (error) {
    if (error.code === 'P2002') throw new HttpError(409, 'El administrador ya está asignado a este torneo');
    throw error;
  }
}

export async function removeAdmin(tournamentId, userId) {
  const assignment = await userRepository.findAssignment(tournamentId, userId);

  if (!assignment) {
    throw new HttpError(404, 'La asignación no existe');
  }

  await userRepository.deleteAssignment(tournamentId, userId);
}
