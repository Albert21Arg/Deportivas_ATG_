import prisma from '../config/prisma.js';

export function findRecentByIp(teamId, ipAddress, since) {
  return prisma.teamLike.findFirst({
    where: { teamId, ipAddress, createdAt: { gte: since } },
    select: { id: true },
  });
}

export function create(teamId, ipAddress) {
  return prisma.teamLike.create({ data: { teamId, ipAddress } });
}

// Deshacer un like propio por error: borra SOLO el like más reciente de
// esa IP en ese equipo, y solo si sigue dentro de la ventana de cooldown
// (no se puede "deshacer" un like viejo, eso rompería el histórico).
export async function deleteMostRecentByIp(teamId, ipAddress, since) {
  const like = await prisma.teamLike.findFirst({
    where: { teamId, ipAddress, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (!like) return false;

  await prisma.teamLike.delete({ where: { id: like.id } });
  return true;
}

export function countTotal(teamId) {
  return prisma.teamLike.count({ where: { teamId } });
}

// Agregado en bloque: para calcular el equipo líder en likes de un torneo
// se comparan todos sus equipos de una sola consulta, no una por equipo.
export function countTotalsForTeams(teamIds) {
  return prisma.teamLike.groupBy({
    by: ['teamId'],
    where: { teamId: { in: teamIds } },
    _count: { _all: true },
  });
}
