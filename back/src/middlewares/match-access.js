import prisma from '../config/prisma.js';

import { requireActiveTournament, requireTournamentAccess } from './tournament-access.js';
import { HttpError } from '../utils/http-error.js';

export async function requireMatchAccess(request, response, next) {
  try {
    const matchId = Number(request.params.id);
    if (!Number.isInteger(matchId) || matchId <= 0) throw new HttpError(400, 'Identificador de partido no válido');

    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { tournamentId: true } });
    if (!match) throw new HttpError(404, 'Partido no encontrado');

    request.tournamentId = match.tournamentId;
    return requireTournamentAccess(request, response, (error) => {
      if (error) return next(error);
      return requireActiveTournament(request, response, next);
    });
  } catch (error) {
    return next(error);
  }
}
