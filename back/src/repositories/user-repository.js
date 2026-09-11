import prisma from '../config/prisma.js';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tournaments: true } },
};

export function findAllAdmins() {
  return prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: safeUserSelect,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
}

export function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export function create(data) {
  return prisma.user.create({ data, select: safeUserSelect });
}

export function update(id, data) {
  return prisma.user.update({ where: { id }, data, select: safeUserSelect });
}

export function findTournamentAdmins(tournamentId) {
  return prisma.userTournament.findMany({
    where: { tournamentId, user: { role: 'ADMIN' } },
    select: { user: { select: safeUserSelect }, createdAt: true },
    orderBy: { user: { name: 'asc' } },
  });
}

export function createAssignment(tournamentId, userId) {
  return prisma.userTournament.create({
    data: { tournamentId, userId },
    select: { user: { select: safeUserSelect }, createdAt: true },
  });
}

export function deleteAssignment(tournamentId, userId) {
  return prisma.userTournament.delete({
    where: { userId_tournamentId: { userId, tournamentId } },
  });
}

export function findAssignment(tournamentId, userId) {
  return prisma.userTournament.findUnique({
    where: { userId_tournamentId: { userId, tournamentId } },
  });
}
