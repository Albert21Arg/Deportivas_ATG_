import { AUTH } from '../config/auth.js';
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

export function findDtByTeam(teamId) {
  return prisma.user.findUnique({ where: { teamId }, select: safeUserSelect });
}

// Una sola cuenta DT por equipo: si ya existe, actualiza credenciales en vez
// de crear otra (teamId es @unique en el modelo User).
export function upsertDtForTeam(teamId, { name, email, password, role, status }) {
  return prisma.user.upsert({
    where: { teamId },
    update: { name, email, password },
    create: { name, email, password, role, status, teamId },
    select: safeUserSelect,
  });
}

// Se corre "al vuelo" en lugar de con un cron aparte, igual que
// expireOverdue() en tournament-repository.js: cualquier DT cuyo equipo
// esté en un torneo con fecha límite de inscripción vencida hace más de
// dtAccountRetentionDays días pierde la cuenta (login y datos borrados).
export async function deleteStaleDtAccounts() {
  const cutoff = new Date(Date.now() - AUTH.dtAccountRetentionDays * 24 * 60 * 60 * 1000);

  const staleDts = await prisma.user.findMany({
    where: {
      role: 'DT',
      team: {
        tournaments: {
          some: { tournament: { playerRegistrationDeadline: { lt: cutoff } } },
        },
      },
    },
    select: { id: true },
  });

  if (!staleDts.length) return [];

  const staleDtIds = staleDts.map((user) => user.id);
  await prisma.user.deleteMany({ where: { id: { in: staleDtIds } } });
  return staleDtIds;
}
