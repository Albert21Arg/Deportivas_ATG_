import prisma from '../config/prisma.js';

const teamSelect = {
  id: true,
  name: true,
  logo: true,
  status: true,
  paidUntil: true,
  logoExpiresAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      tournaments: true,
      homeMatches: true,
      awayMatches: true,
    },
  },
};

export function findAll() {
  return prisma.team.findMany({
    select: teamSelect,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
}

export function findById(id) {
  return prisma.team.findUnique({ where: { id }, select: teamSelect });
}

export function findRawById(id) {
  return prisma.team.findUnique({ where: { id } });
}

export function create(data) {
  return prisma.team.create({ data, select: teamSelect });
}

export function update(id, data) {
  return prisma.team.update({ where: { id }, data, select: teamSelect });
}

export function findTournamentTeams(tournamentId) {
  return prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: { team: { select: teamSelect }, createdAt: true },
    orderBy: { team: { name: 'asc' } },
  });
}

export function findTournament(tournamentId) {
  return prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
}

export function findAssignment(tournamentId, teamId) {
  return prisma.tournamentTeam.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId } } });
}

export function findAnyAssignment(teamId) {
  return prisma.tournamentTeam.findFirst({ where: { teamId } });
}

export function createAssignment(tournamentId, teamId) {
  return prisma.tournamentTeam.create({
    data: { tournamentId, teamId },
    select: { team: { select: teamSelect }, createdAt: true },
  });
}

export function deleteAssignment(tournamentId, teamId) {
  return prisma.tournamentTeam.delete({ where: { tournamentId_teamId: { tournamentId, teamId } } });
}
