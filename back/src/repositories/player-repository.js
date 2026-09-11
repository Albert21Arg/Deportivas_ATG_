import prisma from '../config/prisma.js';

const select = { id: true, name: true, birthDate: true, documentNumber: true, jerseyNumber: true, photo: true, status: true, createdAt: true, updatedAt: true };
export function findTeamInTournament(teamId, tournamentId) { return prisma.tournamentTeam.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId } }, select: { teamId: true } }); }
export function findForTeam(teamId) { return prisma.playerTeam.findMany({ where: { teamId }, select: { player: { select } }, orderBy: { player: { name: 'asc' } } }); }
export function findById(id) { return prisma.player.findUnique({ where: { id }, select }); }
export function update(id, data) { return prisma.player.update({ where: { id }, data, select }); }
export function findByDocument(documentNumber) { return prisma.player.findUnique({ where: { documentNumber }, select }); }
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
