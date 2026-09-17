import prisma from '../config/prisma.js';
import { countBillableCardsByPlayer } from '../utils/card-sanctions.js';

// Cada tipo de tarjeta se paga por separado: el pago de amarillas no cubre
// las rojas ni las azules, cada una tiene su propio contador.
export const CARD_FINE_FIELD = {
  YELLOW_CARD: 'yellowCardFinePaidCount',
  RED_CARD: 'redCardFinePaidCount',
  BLUE_CARD: 'blueCardFinePaidCount',
};

const select = {
  id: true,
  name: true,
  birthDate: true,
  documentNumber: true,
  jerseyNumber: true,
  photo: true,
  paidUntil: true,
  showName: true,
  yellowCardFinePaidCount: true,
  redCardFinePaidCount: true,
  blueCardFinePaidCount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};
export function findTeamInTournament(teamId, tournamentId) { return prisma.tournamentTeam.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId } }, select: { teamId: true } }); }
export function findForTeam(teamId) { return prisma.playerTeam.findMany({ where: { teamId }, select: { isGoalkeeper: true, player: { select } }, orderBy: { player: { name: 'asc' } } }); }
export function findPlayerTeam(playerId, teamId) { return prisma.playerTeam.findUnique({ where: { playerId_teamId: { playerId, teamId } }, select: { isGoalkeeper: true } }); }
// Un solo arquero por equipo: si se marca uno nuevo, se desmarca cualquier
// otro que ya tuviera el equipo antes de fijar el actual.
export function setGoalkeeper(playerId, teamId, isGoalkeeper) {
  return prisma.$transaction(async (tx) => {
    if (isGoalkeeper) {
      await tx.playerTeam.updateMany({ where: { teamId, isGoalkeeper: true }, data: { isGoalkeeper: false } });
    }
    return tx.playerTeam.update({ where: { playerId_teamId: { playerId, teamId } }, data: { isGoalkeeper }, select: { isGoalkeeper: true, player: { select } } });
  });
}
export function findById(id) { return prisma.player.findUnique({ where: { id }, select }); }
export function update(id, data) { return prisma.player.update({ where: { id }, data, select }); }
export function findByDocument(documentNumber) { return prisma.player.findUnique({ where: { documentNumber }, select }); }
export function findPlayerTeamAssignment(playerId) { return prisma.playerTeam.findFirst({ where: { playerId }, select: { teamId: true } }); }
// Cuenta tarjetas cobrables, no eventos crudos: si en un mismo partido una
// tarjeta quedó reemplazada por otra más grave (dos amarillas -> roja,
// amarilla y azul -> azul, azul y roja -> roja), solo la definitiva cuenta.
export async function countCardEventsByType(playerId, tournamentId, type) {
  const events = await prisma.matchEvent.findMany({
    where: { playerId, match: { tournamentId }, type: { in: ['YELLOW_CARD', 'RED_CARD', 'BLUE_CARD'] } },
    select: { matchId: true, type: true },
  });
  const totals = countBillableCardsByPlayer(events.map((event) => ({ ...event, playerId })));
  return totals.get(playerId)?.[type] ?? 0;
}
export function setCardTypeFinePaidCount(id, type, count) {
  return prisma.player.update({ where: { id }, data: { [CARD_FINE_FIELD[type]]: count }, select });
}
export function setShowName(id, showName) {
  return prisma.player.update({ where: { id }, data: { showName }, select });
}
export async function createAndAssign(data, teamId) {
  return prisma.$transaction(async (tx) => {
    const existing = data.documentNumber ? await tx.player.findUnique({ where: { documentNumber: data.documentNumber } }) : null;
    const player = existing ?? await tx.player.create({ data });
    const conflict = await tx.playerTeam.findFirst({ where: { playerId: player.id }, select: { team: { select: { name: true } } } });
    if (conflict) return { conflict: conflict.team.name };
    await tx.playerTeam.create({ data: { playerId: player.id, teamId } });
    return { player: await tx.player.findUnique({ where: { id: player.id }, select }) };
  });
}
