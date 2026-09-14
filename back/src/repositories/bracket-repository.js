import prisma from '../config/prisma.js';

const tieSelect = {
  id: true,
  tournamentId: true,
  stage: true,
  slot: true,
  homeTeamId: true,
  awayTeamId: true,
  winnerTeamId: true,
  homeTeam: { select: { id: true, name: true, logo: true } },
  awayTeam: { select: { id: true, name: true, logo: true } },
  winnerTeam: { select: { id: true, name: true, logo: true } },
  matches: {
    select: { id: true, leg: true, status: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, homePenaltyScore: true, awayPenaltyScore: true, date: true, time: true },
    orderBy: { leg: 'asc' },
  },
};

export function findTournament(tournamentId) {
  return prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, mode: true, hasThirdPlace: true, awayGoalsRule: true } });
}

export function findByTournament(tournamentId) {
  return prisma.knockoutTie.findMany({ where: { tournamentId }, select: tieSelect, orderBy: [{ id: 'asc' }] });
}

export async function hasTies(tournamentId) {
  const count = await prisma.knockoutTie.count({ where: { tournamentId } });
  return count > 0;
}

export async function hasPendingTieMatches(tournamentId) {
  const count = await prisma.match.count({
    where: { tournamentId, tieId: { not: null }, status: { notIn: ['FINISHED', 'CANCELLED'] } },
  });
  return count > 0;
}

export function clearBracket(tournamentId) {
  return prisma.knockoutTie.deleteMany({ where: { tournamentId } });
}

export function createTie(tournamentId, stage, slot, homeTeamId = null, awayTeamId = null) {
  return prisma.knockoutTie.create({ data: { tournamentId, stage, slot, homeTeamId, awayTeamId }, select: tieSelect });
}

export function findTieById(id) {
  return prisma.knockoutTie.findUnique({ where: { id }, select: tieSelect });
}

export function findTieByStageSlot(tournamentId, stage, slot) {
  return prisma.knockoutTie.findUnique({ where: { tournamentId_stage_slot: { tournamentId, stage, slot } }, select: tieSelect });
}

export function updateTie(id, data) {
  return prisma.knockoutTie.update({ where: { id }, data, select: tieSelect });
}

export function createMatch(data) {
  return prisma.match.create({ data });
}

export async function teamsBelongToTournament(tournamentId, teamIds) {
  const count = await prisma.tournamentTeam.count({ where: { tournamentId, teamId: { in: teamIds } } });
  return count === teamIds.length;
}
