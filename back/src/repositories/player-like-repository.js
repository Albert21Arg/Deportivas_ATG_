import prisma from '../config/prisma.js';

export function findRecentByIp(playerId, ipAddress, since) {
  return prisma.playerLike.findFirst({
    where: { playerId, ipAddress, createdAt: { gte: since } },
    select: { id: true },
  });
}

export function create(playerId, ipAddress) {
  return prisma.playerLike.create({ data: { playerId, ipAddress } });
}

// Deshacer un like propio por error: borra SOLO el like más reciente de
// esa IP en ese jugador, y solo si sigue dentro de la ventana de cooldown
// (no se puede "deshacer" un like viejo, eso rompería el histórico).
export async function deleteMostRecentByIp(playerId, ipAddress, since) {
  const like = await prisma.playerLike.findFirst({
    where: { playerId, ipAddress, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (!like) return false;

  await prisma.playerLike.delete({ where: { id: like.id } });
  return true;
}

export function countTotal(playerId) {
  return prisma.playerLike.count({ where: { playerId } });
}

// Agregado en bloque para no caer en N+1 al pintar una lista completa de
// jugadores (goleadores, valla menos vencida, plantel de un equipo, etc.).
export function countTotalsForPlayers(playerIds) {
  return prisma.playerLike.groupBy({
    by: ['playerId'],
    where: { playerId: { in: playerIds } },
    _count: { _all: true },
  });
}
