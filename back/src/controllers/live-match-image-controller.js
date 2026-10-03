import { getLiveMatchImage } from '../services/round-image-service.js';
import { HttpError } from '../utils/http-error.js';

export async function liveMatchImageController(request, response, next) {
  try {
    const tournamentId = Number(request.params.id);
    const matchId = Number(request.params.matchId);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0 || !Number.isInteger(matchId) || matchId <= 0) {
      throw new HttpError(400, 'Identificadores no válidos');
    }

    const frontendUrl = (process.env.FRONTEND_URL ?? `${request.protocol}://${request.get('host')}`).replace(/\/$/, '');
    const pageUrl = `${frontendUrl}/tournaments/${tournamentId}?partido=${matchId}`;
    const image = await getLiveMatchImage(tournamentId, matchId, pageUrl);
    response.set('Content-Type', 'image/png');
    response.set('Cache-Control', 'public, max-age=15');
    return response.send(image);
  } catch (error) {
    return next(error);
  }
}
