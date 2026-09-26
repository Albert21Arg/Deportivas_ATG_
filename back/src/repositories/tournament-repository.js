import prisma from '../config/prisma.js';

const tournamentSelect = {
  id: true,
  name: true,
  description: true,
  logo: true,
  status: true,
  deactivatedAt: true,
  expiresAt: true,
  playerRegistrationDeadline: true,
  pricePerTeam: true,
  position: true,
  mode: true,
  hasThirdPlace: true,
  blueCardEnabled: true,
  awayGoalsRule: true,
  championTeamId: true,
  runnerUpTeamId: true,
  thirdPlaceTeamId: true,
  championLabel: true,
  finishedAt: true,
  createdAt: true,
  updatedAt: true,
  championTeam: { select: { id: true, name: true, logo: true } },
  runnerUpTeam: { select: { id: true, name: true, logo: true } },
  thirdPlaceTeam: { select: { id: true, name: true, logo: true } },
  _count: {
    select: {
      admins: true,
      teams: true,
      matches: true,
    },
  },
};

export function findAllForUser(user) {
  const where = user.role === 'SUPERADMIN'
    ? {}
    : { admins: { some: { userId: user.id } } };

  return prisma.tournament.findMany({
    where,
    select: tournamentSelect,
    orderBy: [{ status: 'asc' }, { position: 'asc' }, { name: 'asc' }],
  });
}

export function findById(id) {
  return prisma.tournament.findUnique({
    where: { id },
    select: tournamentSelect,
  });
}

export function create(data) {
  return prisma.tournament.create({ data, select: tournamentSelect });
}

export function update(id, data) {
  return prisma.tournament.update({ where: { id }, data, select: tournamentSelect });
}

export async function hasMatches(id) {
  const count = await prisma.match.count({ where: { tournamentId: id } });
  return count > 0;
}

export async function hasPendingMatches(id) {
  const count = await prisma.match.count({
    where: {
      tournamentId: id,
      status: { notIn: ['FINISHED', 'CANCELLED'] },
    },
  });

  return count > 0;
}

export async function teamsBelongToTournament(tournamentId, teamIds) {
  if (!teamIds.length) return true;
  const count = await prisma.tournamentTeam.count({ where: { tournamentId, teamId: { in: teamIds } } });
  return count === teamIds.length;
}

// Inhabilita (status → INACTIVE) cualquier torneo activo cuya fecha de
// caducidad ya pasó. Se corre al inicio de las consultas de listado/detalle
// (admin y público) para que la caducidad se aplique "automáticamente" sin
// necesitar un cron aparte.
export async function expireOverdue() {
  await prisma.tournament.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'INACTIVE', deactivatedAt: new Date() },
  });
}

// Nuevo torneo va al final del orden (posición más alta + 1).
export async function getNextPosition() {
  const result = await prisma.tournament.aggregate({ _max: { position: true } });
  return (result._max.position ?? -1) + 1;
}

// Orden actual (mismo criterio que la portada pública) usado para saber
// quién es el "vecino" al mover un torneo hacia arriba o abajo.
export function findOrderedIds() {
  return prisma.tournament.findMany({
    select: { id: true, position: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
}

export async function swapPositions(idA, positionA, idB, positionB) {
  await prisma.$transaction([
    prisma.tournament.update({ where: { id: idA }, data: { position: positionB } }),
    prisma.tournament.update({ where: { id: idB }, data: { position: positionA } }),
  ]);
}

// Borrado definitivo de un torneo y todo lo que le pertenece exclusivamente
// (partidos, eventos, grupos, llaves, frases de tabla, anuncios propios,
// visitas, likes, inscripciones de equipos y administradores). NO borra
// equipos ni jugadores: esos son entidades propias que pueden pertenecer a
// otros torneos, solo se les quita la inscripción a este.
//
// Varias de estas relaciones son "Restrict" en el schema (UserTournament,
// TournamentTeam, Match) así que hay que vaciarlas a mano antes de borrar el
// torneo; el resto son "Cascade" pero se borran igual de forma explícita
// para no depender de que SQLite tenga el enforcement de FK activo.
export async function deleteWithRelations(id) {
  await prisma.$transaction([
    prisma.matchEvent.deleteMany({ where: { match: { tournamentId: id } } }),
    prisma.match.deleteMany({ where: { tournamentId: id } }),
    prisma.groupTeam.deleteMany({ where: { group: { tournamentId: id } } }),
    prisma.group.deleteMany({ where: { tournamentId: id } }),
    prisma.knockoutTie.deleteMany({ where: { tournamentId: id } }),
    prisma.tableCaption.deleteMany({ where: { tournamentId: id } }),
    prisma.announcement.deleteMany({ where: { tournamentId: id } }),
    prisma.tournamentView.deleteMany({ where: { tournamentId: id } }),
    prisma.tournamentLike.deleteMany({ where: { tournamentId: id } }),
    prisma.tournamentTeam.deleteMany({ where: { tournamentId: id } }),
    prisma.userTournament.deleteMany({ where: { tournamentId: id } }),
    prisma.tournament.delete({ where: { id } }),
  ]);
}
