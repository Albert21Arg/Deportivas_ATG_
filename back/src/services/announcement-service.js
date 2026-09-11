import * as repository from '../repositories/announcement-repository.js';
import { HttpError } from '../utils/http-error.js';

function parseId(id) {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) throw new HttpError(400, 'Identificador de anuncio no válido');
  return value;
}

export function listAnnouncements() {
  return repository.findAll();
}

export function getActiveAnnouncement() {
  return repository.findActive();
}

export async function createAnnouncement(data) {
  return repository.create(data);
}

export async function updateAnnouncement(id, data) {
  const announcement = await repository.findById(parseId(id));
  if (!announcement) throw new HttpError(404, 'Anuncio no encontrado');
  return repository.update(announcement.id, data);
}

export async function deleteAnnouncement(id) {
  const announcement = await repository.findById(parseId(id));
  if (!announcement) throw new HttpError(404, 'Anuncio no encontrado');
  await repository.remove(announcement.id);
}
