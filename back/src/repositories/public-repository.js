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
      streamUrl: true,
      homeScore: true,
      awayScore: true,
      homePenaltyScore: true,
      awayPenaltyScore: true,
      halfDurationMinutes: true,
      currentPeriod: true,
      periodStartedAt: true,
      extraMinutes: true,
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
          period: true,
          createdAt: true,
          team: { select: teamSelect },
          player: { select: { id: true, name: true, paidUntil: true, showName: true } },
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
  streamUrl: true,
  homeScore: true,
  awayScore: true,
  halfDurationMinutes: true,
  currentPeriod: true,
  periodStartedAt: true,
  extraMinutes: true,
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
  events: { select: { id: true, teamId: true, type: true, minute: true, period: true, createdAt: true, team: { select: teamSelect }, player: { select: { id: true, name: true, paidUntil: true, showName: true } } }, orderBy: { createdAt: 'asc' } },
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
    select: {
      id: true,
      name: true,
      description: true,
      logo: true,
      mode: true,
      blueCardEnabled: true,
      championLabel: true,
      championTeam: { select: { name: true, logo: true } },
    },
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
              isGoalkeeper: true,
              player: {
                select: { id: true, name: true, jerseyNumber: true, photo: true, paidUntil: true, showName: true, fixedOvr: true },
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

// Los aplazados no cuentan como "programados": no tienen fecha confirmada,
// así que no deben aparecer en esta lista pública hasta que el admin les
// asigne una fecha nueva (momento en el que vuelven a SCHEDULED).
export function findUpcomingMatches(tournamentId) {
  return prisma.match.findMany({
    where: { tournamentId, status: { in: ['SCHEDULED', 'STARTED'] } },
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

// Partidos de un día concreto (para la imagen de "Fecha N"). Se toma el día
// completo en UTC, que es como se guarda la fecha de cada partido.
export function findMatchesOnDate(tournamentId, day) {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return prisma.match.findMany({
    where: {
      tournamentId,
      date: { gte: start, lt: end },
      status: { in: ['SCHEDULED', 'STARTED', 'FINISHED'] },
    },
    select: { id: true, time: true, status: true, homeTeam: { select: teamSelect }, awayTeam: { select: teamSelect } },
    orderBy: [{ time: 'asc' }],
  });
}

// Días con partidos de liga/grupos (sin eliminatorias), para numerar
// "Fecha N" igual que la página pública: cada día es una fecha, en orden.
export function findRoundDates(tournamentId) {
  return prisma.match.findMany({
    where: { tournamentId, tieId: null, status: { in: ['SCHEDULED', 'STARTED', 'FINISHED'] } },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });
}
