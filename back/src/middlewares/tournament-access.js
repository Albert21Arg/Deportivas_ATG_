import prisma from '../config/prisma.js';
import { HttpError } from '../utils/http-error.js';

// El superadmin siempre puede gestionar cualquier torneo. Un admin normal
// pierde el acceso operativo (equipos, jugadores, partidos, etc.) en cuanto
// el torneo queda INACTIVE por vencimiento de la fecha límite, hasta que el
// superadmin lo reactive (tras recibir el pago). Se muestra el total a pagar
// para que el admin sepa cuánto debe abonar.
export async function requireActiveTournament(request, _response, next) {
  try {
    if (request.user.role === 'SUPERADMIN') return next();

    const tournamentId = Number(request.tournamentId ?? request.params.tournamentId ?? request.params.id);

    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      throw new HttpError(400, 'Identificador de torneo no válido');
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        status: true,
        expiresAt: true,
        pricePerTeam: true,
        _count: { select: { teams: true } },
      },
    });

    if (tournament && tournament.status === 'INACTIVE') {
      const teamsCount = tournament._count.teams;
      const totalToPay = tournament.pricePerTeam != null ? tournament.pricePerTeam * teamsCount : null;
      const error = new HttpError(
        402,
        'Este torneo está inactivo por vencimiento de pago. Contacta al superadmin para reactivarlo.',
        'TOURNAMENT_PAYMENT_REQUIRED'
      );
      error.data = { pricePerTeam: tournament.pricePerTeam, teamsCount, totalToPay, expiresAt: tournament.expiresAt };
      throw error;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

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

// El DT no tiene UserTournament (eso es solo para ADMIN/SUPERADMIN): su
// permiso es simplemente "este equipo es el suyo". Se usa en lugar de
// requireTournamentAccess SOLO en las rutas de jugadores/DT de un equipo,
// nunca en grupos/bracket/partidos/etc., para que un DT no herede acceso a
// nada más del torneo por accidente.
export function requireTeamManagementAccess(request, response, next) {
  if (request.user.role !== 'DT') {
    return requireTournamentAccess(request, response, next);
  }

  const teamId = Number(request.params.teamId);

  if (!Number.isInteger(teamId) || teamId <= 0 || request.user.teamId !== teamId) {
    return next(new HttpError(403, 'No tienes permisos para administrar este equipo'));
  }

  return next();
}

// Solo restringe al DT: si la fecha límite de inscripción del torneo ya
// pasó, no puede crear, editar ni eliminar jugadores de su equipo (queda en
// solo lectura). Admin/superadmin no se ven afectados por esta fecha.
export async function requireRegistrationOpen(request, _response, next) {
  try {
    if (request.user.role !== 'DT') return next();

    const tournamentId = Number(request.tournamentId ?? request.params.id);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { playerRegistrationDeadline: true },
    });

    if (tournament?.playerRegistrationDeadline && tournament.playerRegistrationDeadline < new Date()) {
      throw new HttpError(403, 'La fecha límite de inscripción de jugadores ya pasó');
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
