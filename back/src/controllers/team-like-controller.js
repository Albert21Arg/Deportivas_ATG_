import { getTeamLikeTotals, likeTeam, unlikeTeam } from '../services/team-like-service.js';
import { HttpError } from '../utils/http-error.js';

function parseId(request) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identificador de equipo no válido');
  return id;
}

export async function likeController(request, response, next) {
  try {
    const result = await likeTeam(parseId(request), request.ip);
    return response.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function unlikeController(request, response, next) {
  try {
    const result = await unlikeTeam(parseId(request), request.ip);
    return response.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function totalsController(request, response, next) {
  try {
    const ids = String(request.query.ids ?? '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const totalById = await getTeamLikeTotals(ids);
    return response.json({ success: true, data: { totals: Object.fromEntries(totalById) } });
  } catch (error) {
    return next(error);
  }
}
