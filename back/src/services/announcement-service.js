import * as repository from '../repositories/announcement-repository.js';
import { HttpError } from '../utils/http-error.js';

function parseId(id) {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) throw new HttpError(400, 'Identificador de anuncio no válido');
  return value;
}

async function assertTournamentExists(tournamentId) {
  if (tournamentId === undefined || tournamentId === null) return;
  const tournament = await repository.findTournamentById(tournamentId);
  if (!tournament) throw new HttpError(422, 'El torneo seleccionado no existe');
}

export async function listAnnouncements() {
  await repository.expireOverdue();
  return repository.findAll();
}

export async function getActiveAnnouncement(tournamentId) {
  await repository.expireOverdue();
  return repository.findActive(tournamentId);
}

export async function createAnnouncement(data) {
  await assertTournamentExists(data.tournamentId);
  return repository.create(data);
}

export async function updateAnnouncement(id, data) {
  const announcement = await repository.findById(parseId(id));
  if (!announcement) throw new HttpError(404, 'Anuncio no encontrado');
  await assertTournamentExists(data.tournamentId);
  return repository.update(announcement.id, data);
}

export async function deleteAnnouncement(id) {
  const announcement = await repository.findById(parseId(id));
  if (!announcement) throw new HttpError(404, 'Anuncio no encontrado');
  await repository.remove(announcement.id);
}
