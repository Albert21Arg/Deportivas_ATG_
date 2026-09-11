import prisma from '../config/prisma.js';

const tournamentSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  mode: true,
  hasThirdPlace: true,
  blueCardEnabled: true,
  awayGoalsRule: true,
  championTeamId: true,
  runnerUpTeamId: true,
  thirdPlaceTeamId: true,
  finishedAt: true,
  createdAt: true,
  updatedAt: true,
  championTeam: { select: { id: true, name: true, logo: true } },
  runnerUpTeam: { select: { id: true, name: true, logo: true } },
  thirdPlaceTeam: { select: { id: true, name: true, logo: true } },
  _count: {
    select: {
      admins: true,
      teams: true,
      matches: true,
    },
  },
};

export function findAllForUser(user) {
  const where = user.role === 'SUPERADMIN'
    ? {}
    : { admins: { some: { userId: user.id } } };

  return prisma.tournament.findMany({
    where,
    select: tournamentSelect,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
}

export function findById(id) {
  return prisma.tournament.findUnique({
    where: { id },
    select: tournamentSelect,
  });
}

export function create(data) {
  return prisma.tournament.create({ data, select: tournamentSelect });
}

export function update(id, data) {
  return prisma.tournament.update({ where: { id }, data, select: tournamentSelect });
}

export async function hasMatches(id) {
  const count = await prisma.match.count({ where: { tournamentId: id } });
  return count > 0;
}

export async function hasPendingMatches(id) {
  const count = await prisma.match.count({
    where: {
      tournamentId: id,
      status: { notIn: ['FINISHED', 'CANCELLED'] },
    },
  });

  return count > 0;
}

export async function teamsBelongToTournament(tournamentId, teamIds) {
  if (!teamIds.length) return true;
  const count = await prisma.tournamentTeam.count({ where: { tournamentId, teamId: { in: teamIds } } });
  return count === teamIds.length;
}
