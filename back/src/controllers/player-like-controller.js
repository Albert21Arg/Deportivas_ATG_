import { getLikeBonusesForPlayers, likePlayer, unlikePlayer } from '../services/player-like-service.js';
import { HttpError } from '../utils/http-error.js';

function parseId(request) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identificador de jugador no válido');
  return id;
}

export async function likeController(request, response, next) {
  try {
    const result = await likePlayer(parseId(request), request.ip);
    return response.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function unlikeController(request, response, next) {
  try {
    const result = await unlikePlayer(parseId(request), request.ip);
    return response.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function bonusesController(request, response, next) {
  try {
    const ids = String(request.query.ids ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const bonusById = await getLikeBonusesForPlayers(ids);
    return response.json({ success: true, data: { bonuses: Object.fromEntries(bonusById) } });
  } catch (error) {
    return next(error);
  }
}
