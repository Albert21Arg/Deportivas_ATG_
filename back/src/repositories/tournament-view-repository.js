import { Prisma } from '@prisma/client';
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
// con SQL crudo usando strftime. Con SQLite local Prisma guarda DateTime como
// entero (milisegundos desde epoch) y con Cloudflare D1 como texto ISO, así
// que se normaliza según el tipo antes de formatear.
const CREATED_AT = Prisma.sql`CASE WHEN typeof("createdAt") = 'integer'
  THEN datetime("createdAt" / 1000, 'unixepoch') ELSE "createdAt" END`;
export function countByDay(tournamentId) {
  return prisma.$queryRaw`
    SELECT strftime('%Y-%m-%d', ${CREATED_AT}) as day, COUNT(*) as count
    FROM "TournamentView"
    WHERE "tournamentId" = ${tournamentId}
    GROUP BY day
    ORDER BY day DESC
  `;
}

export function countByMonth(tournamentId) {
  return prisma.$queryRaw`
    SELECT strftime('%Y-%m', ${CREATED_AT}) as month, COUNT(*) as count
    FROM "TournamentView"
    WHERE "tournamentId" = ${tournamentId}
    GROUP BY month
    ORDER BY month DESC
  `;
}
