import prisma from '../config/prisma.js';

const groupSelect = {
  id: true,
  tournamentId: true,
  name: true,
  position: true,
  createdAt: true,
  teams: {
    select: { teamId: true, pot: true, team: { select: { id: true, name: true, logo: true } } },
    orderBy: { pot: 'asc' },
  },
};

export function findTournament(tournamentId) {
  return prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
}

export function findByTournament(tournamentId) {
  return prisma.group.findMany({ where: { tournamentId }, select: groupSelect, orderBy: { position: 'asc' } });
}

export function create(tournamentId, name, position) {
  return prisma.group.create({ data: { tournamentId, name, position }, select: groupSelect });
}

export async function deleteGroup(id, tournamentId) {
  const result = await prisma.group.deleteMany({ where: { id, tournamentId } });
  return result.count > 0;
}

export function assignTeam(groupId, teamId, pot) {
  return prisma.groupTeam.upsert({
    where: { groupId_teamId: { groupId, teamId } },
    update: { pot },
    create: { groupId, teamId, pot },
  });
}

export async function removeTeam(groupId, teamId) {
  const result = await prisma.groupTeam.deleteMany({ where: { groupId, teamId } });
  return result.count > 0;
}

export function clearGroups(tournamentId) {
  return prisma.group.deleteMany({ where: { tournamentId } });
}

export function createDraw(tournamentId, groupNames, assignments) {
  return prisma.$transaction(async (tx) => {
    const groups = [];
    for (let i = 0; i < groupNames.length; i += 1) {
      groups.push(await tx.group.create({ data: { tournamentId, name: groupNames[i], position: i } }));
    }
    for (let i = 0; i < groups.length; i += 1) {
      for (const { teamId, pot } of assignments[i]) {
        await tx.groupTeam.create({ data: { groupId: groups[i].id, teamId, pot } });
      }
    }
    return tx.group.findMany({ where: { tournamentId }, select: groupSelect, orderBy: { position: 'asc' } });
  });
}
