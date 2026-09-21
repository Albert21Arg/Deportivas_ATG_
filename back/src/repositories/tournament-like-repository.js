import prisma from '../config/prisma.js';

export function findRecentByIp(tournamentId, ipAddress, since) {
  return prisma.tournamentLike.findFirst({
    where: { tournamentId, ipAddress, createdAt: { gte: since } },
    select: { id: true },
  });
}

export function create(tournamentId, ipAddress) {
  return prisma.tournamentLike.create({ data: { tournamentId, ipAddress } });
}

// Deshacer un like propio por error: borra SOLO el like más reciente de
// esa IP en ese torneo, y solo si sigue dentro de la ventana de 24h (no se
// puede "deshacer" un like viejo, eso rompería el histórico). El resto de
// los likes de esa IP y de cualquier otra siguen intactos.
export async function deleteMostRecentByIp(tournamentId, ipAddress, since) {
  const like = await prisma.tournamentLike.findFirst({
    where: { tournamentId, ipAddress, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (!like) return false;

  await prisma.tournamentLike.delete({ where: { id: like.id } });
  return true;
}

export function countTotal(tournamentId) {
  return prisma.tournamentLike.count({ where: { tournamentId } });
}

// Agregados en bloque para el Home (2 queries para todos los torneos, no
// una por torneo) para no caer en N+1 con la lista pública completa.
export function countTotalsForTournaments(tournamentIds) {
  return prisma.tournamentLike.groupBy({
    by: ['tournamentId'],
    where: { tournamentId: { in: tournamentIds } },
    _count: { _all: true },
  });
}

export function countRecentForTournaments(tournamentIds, since) {
  return prisma.tournamentLike.groupBy({
    by: ['tournamentId'],
    where: { tournamentId: { in: tournamentIds }, createdAt: { gte: since } },
    _count: { _all: true },
  });
}
