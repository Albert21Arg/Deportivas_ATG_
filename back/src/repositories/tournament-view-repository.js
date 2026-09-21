import prisma from '../config/prisma.js';

export function create(tournamentId, ipAddress) {
  return prisma.tournamentView.create({ data: { tournamentId, ipAddress } });
}

export function findRecentByIp(tournamentId, ipAddress, since) {
  return prisma.tournamentView.findFirst({
    where: { tournamentId, ipAddress, createdAt: { gte: since } },
    select: { id: true },
  });
}

export function countTotal(tournamentId) {
  return prisma.tournamentView.count({ where: { tournamentId } });
}

// SQLite no soporta agrupar por fecha truncada con el `groupBy` normal de
// Prisma (solo agrupa por el valor exacto de la columna), así que se hace
// con SQL crudo usando strftime. Prisma guarda DateTime como entero
// (milisegundos desde epoch), no como texto ISO, por eso hay que dividir
// entre 1000 y pasarle el modificador 'unixepoch' (que espera segundos).
export function countByDay(tournamentId) {
  return prisma.$queryRaw`
    SELECT strftime('%Y-%m-%d', "createdAt" / 1000, 'unixepoch') as day, COUNT(*) as count
    FROM "TournamentView"
    WHERE "tournamentId" = ${tournamentId}
    GROUP BY day
    ORDER BY day DESC
  `;
}

export function countByMonth(tournamentId) {
  return prisma.$queryRaw`
    SELECT strftime('%Y-%m', "createdAt" / 1000, 'unixepoch') as month, COUNT(*) as count
    FROM "TournamentView"
    WHERE "tournamentId" = ${tournamentId}
    GROUP BY month
    ORDER BY month DESC
  `;
}
