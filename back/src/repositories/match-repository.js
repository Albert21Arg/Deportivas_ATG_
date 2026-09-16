import prisma from '../config/prisma.js';

const matchSelect = {
  id: true,
  tournamentId: true,
  homeTeamId: true,
  awayTeamId: true,
  date: true,
  time: true,
  status: true,
  homeScore: true,
  awayScore: true,
  homePenaltyScore: true,
  awayPenaltyScore: true,
  stage: true,
  groupId: true,
  tieId: true,
  leg: true,
  createdAt: true,
  updatedAt: true,
  homeTeam: { select: { id: true, name: true, logo: true, status: true } },
  awayTeam: { select: { id: true, name: true, logo: true, status: true } },
  events: { select: { id: true, teamId: true, playerId: true, type: true, minute: true, createdAt: true, team: { select: { id: true, name: true } }, player: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
};

export function findById(id) {
  return prisma.match.findUnique({ where: { id }, select: matchSelect });
}

export function findByTournament(tournamentId) {
  return prisma.match.findMany({
    where: { tournamentId },
    select: matchSelect,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
}

export function findTournament(tournamentId) {
  return prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true } });
}

export function findTournamentSettings(tournamentId) {
  return prisma.tournament.findUnique({ where: { id: tournamentId }, select: { blueCardEnabled: true } });
}

export function findTournamentTeam(tournamentId, teamId) {
  return prisma.tournamentTeam.findUnique({ where: { tournamentId_teamId: { tournamentId, teamId } }, select: { teamId: true } });
}

export function create(data) {
  return prisma.match.create({ data, select: matchSelect });
}

export async function createMany(data) {
  return prisma.match.createMany({ data });
}

export async function findTournamentTeamIds(tournamentId) {
  const rows = await prisma.tournamentTeam.findMany({ where: { tournamentId }, select: { teamId: true } });
  return rows.map((row) => row.teamId);
}

export async function findGroupTeamIds(groupId, tournamentId) {
  const rows = await prisma.groupTeam.findMany({ where: { groupId, group: { tournamentId } }, select: { teamId: true } });
  return rows.map((row) => row.teamId);
}

function fixtureScopeWhere(tournamentId, groupId) {
  return { tournamentId, groupId: groupId ?? null, ...(groupId ? {} : { tieId: null }) };
}

export function hasFixtureMatches(tournamentId, groupId) {
  return prisma.match.count({ where: fixtureScopeWhere(tournamentId, groupId) }).then((count) => count > 0);
}

export function findFixtureMatchStatuses(tournamentId, groupId) {
  return prisma.match.findMany({ where: fixtureScopeWhere(tournamentId, groupId), select: { status: true } });
}

export function deleteFixtureMatches(tournamentId, groupId) {
  return prisma.match.deleteMany({ where: fixtureScopeWhere(tournamentId, groupId) });
}

export function update(id, data) {
  return prisma.match.update({ where: { id }, data, select: matchSelect });
}

// Guarda el resultado (con o sin marcador de penales) y, si se reciben
// penales, reemplaza los eventos PENALTY existentes del partido por los nuevos.
export async function updateWithPenalties(id, data, penalties) {
  return prisma.$transaction(async (tx) => {
    await tx.match.update({ where: { id }, data });
    if (penalties !== null && penalties !== undefined) {
      await tx.matchEvent.deleteMany({ where: { matchId: id, type: 'PENALTY' } });
      if (penalties.length) {
        await tx.matchEvent.createMany({
          data: penalties.map((entry) => ({ matchId: id, teamId: entry.teamId, playerId: entry.playerId, type: 'PENALTY' })),
        });
      }
    }
    return tx.match.findUnique({ where: { id }, select: matchSelect });
  });
}

export function findPlayerForTeam(playerId, teamId) { return prisma.playerTeam.findUnique({ where: { playerId_teamId: { playerId, teamId } }, select: { playerId: true } }); }
const SCORING_TYPES = new Set(['GOAL', 'OWN_GOAL']);
export async function createEvent(matchId, data, adjustScore = true) { return prisma.$transaction(async (tx) => { await tx.matchEvent.create({ data: { matchId, ...data } }); if (data.type === 'YELLOW_CARD' && data.playerId) { const yellowCards = await tx.matchEvent.count({ where: { matchId, playerId: data.playerId, type: 'YELLOW_CARD' } }); if (yellowCards === 2) await tx.matchEvent.create({ data: { matchId, teamId: data.teamId, playerId: data.playerId, type: 'RED_CARD', minute: data.minute } }); } if (adjustScore && SCORING_TYPES.has(data.type)) { const match = await tx.match.findUnique({ where: { id: matchId } }); const scoreField = match.homeTeamId === data.teamId ? 'homeScore' : 'awayScore'; await tx.match.update({ where: { id: matchId }, data: { [scoreField]: { increment: 1 } } }); } return tx.match.findUnique({ where: { id: matchId }, select: matchSelect }); }); }
export function hasRedCard(matchId, playerId) { return prisma.matchEvent.findFirst({ where: { matchId, playerId, type: 'RED_CARD' }, select: { id: true } }); }
export async function removeEvent(eventId, matchId, adjustScore = true) { return prisma.$transaction(async (tx) => { const event = await tx.matchEvent.findFirst({ where: { id: eventId, matchId } }); if (!event) return null; if (adjustScore && SCORING_TYPES.has(event.type)) { const match = await tx.match.findUnique({ where: { id: matchId } }); const scoreField = match.homeTeamId === event.teamId ? 'homeScore' : 'awayScore'; await tx.match.update({ where: { id: matchId }, data: { [scoreField]: { decrement: 1 } } }); } await tx.matchEvent.delete({ where: { id: eventId } }); return tx.match.findUnique({ where: { id: matchId }, select: matchSelect }); }); }
