import prisma from '../config/prisma.js';

const select = {
  id: true,
  title: true,
  imageUrl: true,
  linkUrl: true,
  delaySeconds: true,
  durationSeconds: true,
  status: true,
  expiresAt: true,
  tournamentId: true,
  createdAt: true,
  updatedAt: true,
  tournament: { select: { id: true, name: true } },
};

// Inhabilita (status → INACTIVE) cualquier anuncio activo cuya fecha de
// caducidad ya pasó. Se corre al inicio de las consultas de listado (admin
// y público), igual que expireOverdue() en tournament-repository.js.
export async function expireOverdue() {
  await prisma.announcement.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'INACTIVE' },
  });
}

export function findAll() {
  return prisma.announcement.findMany({ select, orderBy: { createdAt: 'desc' } });
}

export function findActive(tournamentId) {
  // Sin tournamentId (portada general): solo los anuncios marcados
  // "todas las páginas" (tournamentId null). Con tournamentId (página de un
  // torneo): solo los anuncios asociados justo a ese torneo.
  const where = {
    status: 'ACTIVE',
    tournamentId: tournamentId !== undefined ? tournamentId : null,
  };
  return prisma.announcement.findMany({
    where,
    select,
    orderBy: { createdAt: 'asc' },
  });
}

export function findTournamentById(tournamentId) {
  return prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
}

export function create(data) {
  return prisma.announcement.create({ data, select });
}

export function update(id, data) {
  return prisma.announcement.update({ where: { id }, data, select });
}

export function findById(id) {
  return prisma.announcement.findUnique({ where: { id }, select });
}

export function remove(id) {
  return prisma.announcement.delete({ where: { id } });
}
