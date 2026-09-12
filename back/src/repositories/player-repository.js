import prisma from '../config/prisma.js';

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
  yellowCardFinePaidCount: true,
  redCardFinePaidCount: true,
  blueCardFinePaidCount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};
export function findTeamInTournament(teamId, tournamentId) { return prisma.tournamentTeam.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId } }, select: { teamId: true } }); }
export function findForTeam(teamId) { return prisma.playerTeam.findMany({ where: { teamId }, select: { player: { select } }, orderBy: { player: { name: 'asc' } } }); }
export function findById(id) { return prisma.player.findUnique({ where: { id }, select }); }
export function update(id, data) { return prisma.player.update({ where: { id }, data, select }); }
export function findByDocument(documentNumber) { return prisma.player.findUnique({ where: { documentNumber }, select }); }
export function findPlayerTeamAssignment(playerId) { return prisma.playerTeam.findFirst({ where: { playerId }, select: { teamId: true } }); }
export function countCardEventsByType(playerId, tournamentId, type) {
  return prisma.matchEvent.count({ where: { playerId, match: { tournamentId }, type } });
}
export function setCardTypeFinePaidCount(id, type, count) {
  return prisma.player.update({ where: { id }, data: { [CARD_FINE_FIELD[type]]: count }, select });
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
