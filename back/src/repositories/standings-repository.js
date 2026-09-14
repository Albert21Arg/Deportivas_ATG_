import prisma from '../config/prisma.js';

export function findTournamentWithTeams(tournamentId) {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      teams: {
        select: {
          team: { select: { id: true, name: true, logo: true, paidUntil: true, logoExpiresAt: true } },
        },
      },
    },
  });
}

export function findGroupWithTeams(groupId, tournamentId) {
  return prisma.group.findFirst({
    where: { id: groupId, tournamentId },
    select: {
      id: true,
      teams: {
        select: {
          team: { select: { id: true, name: true, logo: true, paidUntil: true, logoExpiresAt: true } },
        },
      },
    },
  });
}

export function findGroupsWithPots(tournamentId) {
  return prisma.group.findMany({
    where: { tournamentId },
    select: {
      id: true,
      name: true,
      teams: {
        select: {
          teamId: true,
          pot: true,
          team: { select: { id: true, name: true, logo: true, paidUntil: true, logoExpiresAt: true } },
        },
      },
    },
    orderBy: { position: 'asc' },
  });
}

export function findFinishedMatches(tournamentId, groupId = null) {
  return prisma.match.findMany({
    where: { tournamentId, status: 'FINISHED', ...(groupId ? { groupId } : {}) },
    select: {
      groupId: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
    },
  });
}

export function findCardTotals(tournamentId, teamIds = null) {
  return prisma.matchEvent.groupBy({
    by: ['teamId', 'type'],
    where: { match: { tournamentId }, ...(teamIds ? { teamId: { in: teamIds } } : {}) },
    _count: { _all: true },
  });
}

export function findGoalTotals(tournamentId) {
  return prisma.matchEvent.groupBy({
    by: ['playerId'],
    where: { match: { tournamentId }, type: 'GOAL', playerId: { not: null } },
    _count: { _all: true },
  });
}

// No hay registro de alineación/convocatoria por partido: la única forma de
// saber en qué partidos participó un jugador es contar los partidos
// distintos donde tiene al menos un evento (gol, autogol, tarjeta, penal).
// groupBy por [playerId, matchId] da un renglón por cada combinación única,
// así que contar cuántos renglones caen en cada playerId ya es el conteo de
// partidos distintos, sin necesidad de _count.
export function findPlayerMatchAppearances(tournamentId) {
  return prisma.matchEvent.groupBy({
    by: ['playerId', 'matchId'],
    where: { match: { tournamentId }, playerId: { not: null } },
  });
}

export function findPlayerCardTotals(tournamentId) {
  return prisma.matchEvent.groupBy({
    by: ['playerId', 'type'],
    where: { match: { tournamentId }, type: { in: ['YELLOW_CARD', 'RED_CARD', 'BLUE_CARD'] }, playerId: { not: null } },
    _count: { _all: true },
  });
}

// Eventos crudos (sin agrupar) para las multas: a diferencia de
// findPlayerCardTotals, aquí se necesita el matchId para poder reducir, por
// partido, cuál tarjeta quedó como sanción definitiva.
export function findPlayerCardEvents(tournamentId) {
  return prisma.matchEvent.findMany({
    where: { match: { tournamentId }, type: { in: ['YELLOW_CARD', 'RED_CARD', 'BLUE_CARD'] }, playerId: { not: null } },
    select: { playerId: true, matchId: true, type: true },
  });
}

// Arqueros designados (uno por equipo) del torneo, para la valla menos
// vencida: se cruza con los goles en contra/partidos ya calculados en la
// tabla de posiciones (no hay alineación por partido, así que el arquero
// asume los partidos y goles en contra de todo su equipo).
export function findGoalkeeperAssignments(tournamentId) {
  return prisma.playerTeam.findMany({
    where: { isGoalkeeper: true, team: { tournaments: { some: { tournamentId } } } },
    select: {
      teamId: true,
      player: { select: { id: true, name: true, photo: true, jerseyNumber: true, paidUntil: true } },
    },
  });
}

export function findPlayersWithTeams(playerIds) {
  return prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      name: true,
      photo: true,
      jerseyNumber: true,
      paidUntil: true,
      yellowCardFinePaidCount: true,
      redCardFinePaidCount: true,
      blueCardFinePaidCount: true,
      teams: { select: { team: { select: { id: true, name: true, logo: true, paidUntil: true, logoExpiresAt: true } } } },
    },
  });
}
