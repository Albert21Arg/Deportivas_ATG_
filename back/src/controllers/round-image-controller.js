import { getRoundImage } from '../services/round-image-service.js';
import { HttpError } from '../utils/http-error.js';

// GET /api/public/tournaments/:id/rounds/:day/image?format=landscape|portrait
// Imagen de los partidos de una fecha. La usa la vista previa de enlaces
// (WhatsApp/Facebook) cuando se comparte /tournaments/:id?fecha=AAAA-MM-DD.
export async function roundImageController(request, response, next) {
  try {
    const tournamentId = Number(request.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      throw new HttpError(400, 'Identificador de torneo no válido');
    }

    const format = request.query.format === 'portrait' ? 'portrait' : 'landscape';
    const pageUrl = `${request.protocol}://${request.get('host')}/tournaments/${tournamentId}`;
    const image = await getRoundImage(tournamentId, request.params.day, format, pageUrl);

    response.set('Content-Type', 'image/png');
    response.set('Cache-Control', 'public, max-age=300');
    return response.send(image);
  } catch (error) {
    return next(error);
  }
}
