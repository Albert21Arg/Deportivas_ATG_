import * as repository from '../repositories/floating-bubble-repository.js';
import { HttpError } from '../utils/http-error.js';

function parseId(id) {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, 'Identificador de botón no válido');
  }
  return value;
}

export function listFloatingBubbles() {
  return repository.findAll();
}

export function listActiveFloatingBubbles() {
  return repository.findActive();
}

export async function updateFloatingBubble(id, data) {
  const bubble = await repository.findById(parseId(id));
  if (!bubble) throw new HttpError(404, 'Botón flotante no encontrado');
  return repository.update(bubble.id, data);
}
