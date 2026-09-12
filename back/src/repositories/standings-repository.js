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

export function findPlayerCardTotals(tournamentId) {
  return prisma.matchEvent.groupBy({
    by: ['playerId', 'type'],
    where: { match: { tournamentId }, type: { in: ['YELLOW_CARD', 'RED_CARD', 'BLUE_CARD'] }, playerId: { not: null } },
    _count: { _all: true },
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
