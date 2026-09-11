import * as bracketRepository from '../repositories/bracket-repository.js';
import * as matchRepository from '../repositories/match-repository.js';
import { HttpError } from '../utils/http-error.js';
import { advanceFromMatch, resolveWinner } from './bracket-service.js';
import { publish } from './realtime-service.js';

async function getMatch(id) {
  const match = await matchRepository.findById(id);
  if (!match) throw new HttpError(404, 'Partido no encontrado');
  return match;
}

// Para llaves de eliminación: si el resultado (o el global a doble partido)
// va a quedar empatado, exige una tanda de penales con un ganador claro.
// Si el partido ya tenía penales guardados y no llegan unos nuevos, los
// conserva tal cual (para no obligar a repetir la tanda al corregir el marcador).
async function resolvePenaltyOutcome(match, homeScore, awayScore, penalties) {
  const empty = { homePenaltyScore: null, awayPenaltyScore: null, penaltyEntries: null };
  if (!match.tieId) return empty;

  const tie = await bracketRepository.findTieById(match.tieId);
  if (!tie) return empty;

  const hypotheticalMatches = tie.matches.map((row) =>
    row.id === match.id
      ? { ...row, homeScore, awayScore, homePenaltyScore: null, awayPenaltyScore: null }
      : row
  );

  // A doble partido, si todavía falta jugar el otro partido de la llave
  // (p.ej. la ida), la serie no se puede definir todavía: no hay que pedir
  // penales por eso. resolveWinner devuelve null tanto si está empatado
  // como si falta un partido por jugar, así que hay que distinguir aquí.
  const allMatchesPlayed = hypotheticalMatches.every(
    (row) => row.homeScore !== null && row.awayScore !== null
  );
  if (!allMatchesPlayed) return empty;

  const tournament = await bracketRepository.findTournament(match.tournamentId);
  if (resolveWinner(tie, hypotheticalMatches, tournament?.awayGoalsRule)) return empty;

  if (penalties && penalties.length > 0) {
    for (const entry of penalties) {
      if (![match.homeTeamId, match.awayTeamId].includes(entry.teamId)) {
        throw new HttpError(422, 'Los penales deben ser de los equipos de este partido');
      }
      if (!await matchRepository.findPlayerForTeam(entry.playerId, entry.teamId)) {
        throw new HttpError(422, 'El jugador del penal no pertenece a ese equipo');
      }
    }

    const homePenaltyScore = penalties.filter((entry) => entry.teamId === match.homeTeamId).length;
    const awayPenaltyScore = penalties.filter((entry) => entry.teamId === match.awayTeamId).length;
    if (homePenaltyScore === awayPenaltyScore) {
      throw new HttpError(422, 'La definición por penales no puede quedar empatada.');
    }

    return { homePenaltyScore, awayPenaltyScore, penaltyEntries: penalties };
  }

  if (match.homePenaltyScore != null && match.awayPenaltyScore != null) {
    return { homePenaltyScore: match.homePenaltyScore, awayPenaltyScore: match.awayPenaltyScore, penaltyEntries: null };
  }

  throw new HttpError(422, 'El resultado queda empatado: registra la definición por penales antes de guardar.', 'PENALTIES_REQUIRED');
}

async function validateTeamsBelongToTournament(tournamentId, homeTeamId, awayTeamId) {
  const [homeAssignment, awayAssignment] = await Promise.all([
    matchRepository.findTournamentTeam(tournamentId, homeTeamId),
    matchRepository.findTournamentTeam(tournamentId, awayTeamId),
  ]);
  if (!homeAssignment || !awayAssignment) throw new HttpError(422, 'Ambos equipos deben pertenecer al torneo');
}

export async function listMatches(tournamentId) {
  if (!await matchRepository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  const matches = await matchRepository.findByTournament(tournamentId);
  const statusPriority = { SCHEDULED: 0, STARTED: 0, POSTPONED: 1, CANCELLED: 2, FINISHED: 3 };

  return matches.sort((left, right) => {
    const priorityDifference = (statusPriority[left.status] ?? 2) - (statusPriority[right.status] ?? 2);
    if (priorityDifference !== 0) return priorityDifference;

    const dateDifference = left.date.getTime() - right.date.getTime();
    return dateDifference || left.time.localeCompare(right.time);
  });
}

function buildRoundRobinRounds(teamIds) {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const rounds = [];
  const fixed = teams[0];
  const rotating = teams.slice(1);
  for (let round = 0; round < teams.length - 1; round += 1) {
    const lineup = [fixed, ...rotating];
    const pairs = [];
    for (let i = 0; i < teams.length / 2; i += 1) {
      const a = lineup[i];
      const b = lineup[teams.length - 1 - i];
      if (a !== null && b !== null) pairs.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    rotating.push(rotating.shift());
  }
  return rounds;
}

export async function generateFixtures(tournamentId, options = {}) {
  const { groupId = null, startDate, time = '15:00', intervalDays = 7 } = options;
  if (!await matchRepository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  const teamIds = groupId
    ? await matchRepository.findGroupTeamIds(groupId, tournamentId)
    : await matchRepository.findTournamentTeamIds(tournamentId);
  if (teamIds.length < 2) throw new HttpError(422, 'Se necesitan al menos 2 equipos para generar el fixture');
  if (await matchRepository.hasFixtureMatches(tournamentId, groupId)) {
    throw new HttpError(409, 'Ya existen partidos generados para este alcance, elimínalos antes de volver a generar');
  }
  const rounds = buildRoundRobinRounds(teamIds);
  const base = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  const matchesData = [];
  rounds.forEach((pairs, roundIndex) => {
    const date = new Date(base.getTime() + roundIndex * intervalDays * 24 * 60 * 60 * 1000);
    pairs.forEach(([homeTeamId, awayTeamId]) => {
      matchesData.push({ tournamentId, homeTeamId, awayTeamId, date, time, groupId, stage: groupId ? 'GROUP' : null });
    });
  });
  const { count } = await matchRepository.createMany(matchesData);
  return { created: count };
}

export async function createMatch(tournamentId, data) {
  if (!await matchRepository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  await validateTeamsBelongToTournament(tournamentId, data.homeTeamId, data.awayTeamId);
  return matchRepository.create({ ...data, tournamentId });
}

export async function updateMatch(id, data) {
  const match = await getMatch(id);
  if (match.status === 'FINISHED' && (data.homeTeamId || data.awayTeamId || data.date || data.time)) {
    throw new HttpError(409, 'No puedes reprogramar un partido finalizado');
  }
  const homeTeamId = data.homeTeamId ?? match.homeTeamId;
  const awayTeamId = data.awayTeamId ?? match.awayTeamId;
  if (homeTeamId === awayTeamId) throw new HttpError(422, 'Un equipo no puede jugar contra sí mismo');
  await validateTeamsBelongToTournament(match.tournamentId, homeTeamId, awayTeamId);
  const updateData = { ...data };

  if (match.status === 'POSTPONED' && (data.date !== undefined || data.time !== undefined)) {
    updateData.status = 'SCHEDULED';
  }

  return matchRepository.update(id, updateData);
}

export async function registerResult(id, { homeScore, awayScore, penalties }, user) {
  const match = await getMatch(id);
  if (match.status === 'CANCELLED') throw new HttpError(409, 'No puedes registrar resultado en un partido cancelado');
  if (match.status === 'FINISHED' && user.role !== 'SUPERADMIN') {
    throw new HttpError(403, 'Solo SUPERADMIN puede corregir el marcador de un partido finalizado');
  }

  const { homePenaltyScore, awayPenaltyScore, penaltyEntries } = await resolvePenaltyOutcome(match, homeScore, awayScore, penalties);

  const updated = await matchRepository.updateWithPenalties(
    id,
    { homeScore, awayScore, status: 'FINISHED', homePenaltyScore, awayPenaltyScore },
    penaltyEntries
  );
  publish(updated.tournamentId, updated);
  if (updated.tieId) await advanceFromMatch(updated);
  return updated;
}

export async function changeStatus(id, status, penalties) {
  const match = await getMatch(id);
  if (match.status === 'FINISHED' && status !== 'FINISHED') throw new HttpError(409, 'Un partido finalizado no puede cambiar de estado');
  if (status === 'STARTED' && match.status !== 'SCHEDULED') throw new HttpError(409, 'Solo puedes iniciar un partido programado');
  if (status === 'FINISHED' && match.status !== 'STARTED') throw new HttpError(409, 'Solo puedes finalizar un partido iniciado');

  const penaltyOutcome = status === 'FINISHED'
    ? await resolvePenaltyOutcome(match, match.homeScore ?? 0, match.awayScore ?? 0, penalties)
    : { homePenaltyScore: null, awayPenaltyScore: null, penaltyEntries: null };

  const updated = await matchRepository.updateWithPenalties(
    id,
    {
      status,
      ...(status === 'STARTED' ? { homeScore: 0, awayScore: 0 } : {}),
      ...(status === 'FINISHED' ? { homePenaltyScore: penaltyOutcome.homePenaltyScore, awayPenaltyScore: penaltyOutcome.awayPenaltyScore } : {}),
    },
    penaltyOutcome.penaltyEntries
  );
  publish(updated.tournamentId, updated);
  if (status === 'FINISHED' && updated.tieId) await advanceFromMatch(updated);
  return updated;
}

export async function updateLiveScore(id, { homeScore, awayScore }) {
  const match = await getMatch(id);
  if (match.status !== 'STARTED') throw new HttpError(409, 'Solo puedes actualizar el marcador de un partido iniciado');
  const updated = await matchRepository.update(match.id, { homeScore, awayScore });
  publish(updated.tournamentId, updated);
  return updated;
}

export async function addEvent(id, data) {
  const match = await getMatch(id);
  if (match.status !== 'STARTED') throw new HttpError(409, 'Solo puedes registrar eventos en un partido iniciado');
  if (![match.homeTeamId, match.awayTeamId].includes(data.teamId)) throw new HttpError(422, 'El equipo no participa en este partido');
  if (data.type === 'BLUE_CARD') {
    const settings = await matchRepository.findTournamentSettings(match.tournamentId);
    if (!settings?.blueCardEnabled) throw new HttpError(422, 'La tarjeta azul no está habilitada para este torneo');
  }
  if (data.playerId) {
    const rosterTeamId = data.type === 'OWN_GOAL'
      ? [match.homeTeamId, match.awayTeamId].find((teamId) => teamId !== data.teamId)
      : data.teamId;
    if (!await matchRepository.findPlayerForTeam(data.playerId, rosterTeamId)) {
      throw new HttpError(422, data.type === 'OWN_GOAL' ? 'El jugador del autogol debe pertenecer al equipo contrario' : 'El jugador no pertenece a este equipo');
    }
  }
  if (data.playerId && !['GOAL', 'OWN_GOAL'].includes(data.type) && await matchRepository.hasRedCard(match.id, data.playerId)) {
    throw new HttpError(409, 'Este jugador ya fue expulsado y no puede recibir más tarjetas');
  }
  const updated = await matchRepository.createEvent(match.id, data);
  publish(updated.tournamentId, updated);
  return updated;
}
export async function deleteEvent(id, eventId) { const match = await getMatch(id); if (match.status !== 'STARTED') throw new HttpError(409, 'Solo puedes corregir eventos en un partido iniciado'); const updated = await matchRepository.removeEvent(Number(eventId), match.id); if (!updated) throw new HttpError(404, 'Evento no encontrado'); publish(updated.tournamentId, updated); return updated; }
