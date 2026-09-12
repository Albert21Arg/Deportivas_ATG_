import prisma from '../config/prisma.js';

const teamSelect = { id: true, name: true, logo: true, paidUntil: true, logoExpiresAt: true };
const groupSelect = {
  id: true,
  name: true,
  position: true,
  teams: {
    select: { pot: true, team: { select: teamSelect } },
    orderBy: { pot: 'asc' },
  },
};
const tieSelect = {
  id: true,
  stage: true,
  slot: true,
  homeTeamId: true,
  awayTeamId: true,
  winnerTeamId: true,
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
  winnerTeam: { select: teamSelect },
  matches: {
    select: {
      id: true,
      leg: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homePenaltyScore: true,
      awayPenaltyScore: true,
      date: true,
      time: true,
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      events: {
        select: {
          id: true,
          teamId: true,
          type: true,
          minute: true,
          createdAt: true,
          team: { select: teamSelect },
          player: { select: { id: true, name: true, paidUntil: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { leg: 'asc' },
  },
};
const matchSelect = {
  id: true,
  date: true,
  time: true,
  status: true,
  homeScore: true,
  awayScore: true,
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
  events: { select: { id: true, teamId: true, type: true, minute: true, createdAt: true, team: { select: teamSelect }, player: { select: { id: true, name: true, paidUntil: true } } }, orderBy: { createdAt: 'asc' } },
};

export function findActiveTournaments() {
  return prisma.tournament.findMany({
    where: { status: 'ACTIVE', teams: { some: {} } },
    select: { id: true, name: true, description: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
}

export function findActiveTournament(id) {
  return prisma.tournament.findFirst({
    where: { id, status: 'ACTIVE' },
    select: { id: true, name: true, description: true, logo: true, mode: true, blueCardEnabled: true, championLabel: true },
  });
}

export function findGroups(tournamentId) {
  return prisma.group.findMany({
    where: { tournamentId },
    select: groupSelect,
    orderBy: { position: 'asc' },
  });
}

export function findTournamentPlayers(tournamentId) {
  return prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: {
      team: {
        select: {
          id: true,
          paidUntil: true,
          players: {
            where: { player: { status: 'ACTIVE' } },
            select: {
              player: {
                select: { id: true, name: true, jerseyNumber: true, photo: true, paidUntil: true },
              },
            },
            orderBy: { player: { name: 'asc' } },
          },
        },
      },
    },
  });
}

export function findTies(tournamentId) {
  return prisma.knockoutTie.findMany({
    where: { tournamentId },
    select: tieSelect,
    orderBy: [{ stage: 'asc' }, { slot: 'asc' }],
  });
}

export function findUpcomingMatches(tournamentId) {
  return prisma.match.findMany({
    where: { tournamentId, status: { in: ['SCHEDULED', 'STARTED', 'POSTPONED'] } },
    select: matchSelect,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
}

export function findFinishedMatches(tournamentId) {
  return prisma.match.findMany({
    where: { tournamentId, status: 'FINISHED' },
    select: matchSelect,
    orderBy: [{ date: 'desc' }, { time: 'desc' }],
  });
}
