import prisma from '../config/prisma.js';
import { HttpError } from '../utils/http-error.js';

export async function requireTournamentAccess(request, _response, next) {
  try {
    const tournamentId = Number(request.tournamentId ?? request.params.tournamentId ?? request.params.id);

    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      throw new HttpError(400, 'Identificador de torneo no válido');
    }

    if (request.user.role === 'SUPERADMIN') {
      return next();
    }

    const assignment = await prisma.userTournament.findUnique({
      where: {
        userId_tournamentId: {
          userId: request.user.id,
          tournamentId,
        },
      },
      select: { userId: true },
    });

    if (!assignment) {
      throw new HttpError(403, 'No tienes permisos para administrar este torneo');
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
