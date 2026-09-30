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

export function getLiveMatchForUser(user) {
  return matchRepository.findLiveForUser(user);
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

// Un mismo equipo juega una sola vez por fecha, pero varios partidos de la
// misma fecha se reparten en el tiempo, no al mismo tiempo: cada uno arranca
// 1 hora después del anterior, empezando en la hora indicada. Si eso empuja
// la hora más allá de medianoche, el partido pasa al día siguiente en vez de
// quedar con una hora inválida.
function addHoursToSchedule(date, time, hoursToAdd) {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + hoursToAdd * 60;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minutesOfDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const resultTime = `${String(Math.floor(minutesOfDay / 60)).padStart(2, '0')}:${String(minutesOfDay % 60).padStart(2, '0')}`;
  const resultDate = new Date(date.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  return { date: resultDate, time: resultTime };
}

// Sin importar quién jugó de local o visitante, A-vs-B y B-vs-A son el
// mismo enfrentamiento a efectos de no duplicarlo.
function pairKey(teamIdA, teamIdB) {
  return [teamIdA, teamIdB].sort((a, b) => a - b).join('-');
}

export async function generateFixtures(tournamentId, options = {}) {
  const { groupId = null, startDate, time = '15:00', intervalDays = 7 } = options;
  if (!await matchRepository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  const teamIds = groupId
    ? await matchRepository.findGroupTeamIds(groupId, tournamentId)
    : await matchRepository.findTournamentTeamIds(tournamentId);
  if (teamIds.length < 2) throw new HttpError(422, 'Se necesitan al menos 2 equipos para generar el fixture');

  // No se recrea un enfrentamiento que ya existe en este alcance (torneo o
  // grupo), sin importar el estado de ese partido ni quién fue local o
  // visitante: el fixture solo agrega los que faltan.
  const existingPairs = await matchRepository.findFixturePairs(tournamentId, groupId);
  const existingPairKeys = new Set(existingPairs.map(({ homeTeamId, awayTeamId }) => pairKey(homeTeamId, awayTeamId)));

  const rounds = buildRoundRobinRounds(teamIds);
  const base = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
  const matchesData = [];
  let skipped = 0;

  rounds.forEach((pairs, roundIndex) => {
    const roundDate = new Date(base.getTime() + roundIndex * intervalDays * 24 * 60 * 60 * 1000);
    let matchIndex = 0;

    pairs.forEach(([homeTeamId, awayTeamId]) => {
      if (existingPairKeys.has(pairKey(homeTeamId, awayTeamId))) {
        skipped += 1;
        return;
      }

      const { date, time: matchTime } = addHoursToSchedule(roundDate, time, matchIndex);
      matchIndex += 1;
      matchesData.push({ tournamentId, homeTeamId, awayTeamId, date, time: matchTime, groupId, stage: groupId ? 'GROUP' : null });
    });
  });

  if (!matchesData.length) {
    return { created: 0, skipped };
  }

  const { count } = await matchRepository.createMany(matchesData);
  publish(tournamentId, { type: 'fixtures.generated' });
  return { created: count, skipped };
}

// Solo se puede borrar el fixture completo (para volver a generarlo con
// otras fechas/equipos) si ningún partido de ese alcance arrancó todavía.
export async function deleteFixtures(tournamentId, groupId = null) {
  if (!await matchRepository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  const existingStatuses = await matchRepository.findFixtureMatchStatuses(tournamentId, groupId);
  if (!existingStatuses.length) throw new HttpError(404, 'No hay partidos generados para este alcance');
  if (existingStatuses.some((match) => ['STARTED', 'FINISHED'].includes(match.status))) {
    throw new HttpError(409, 'No puedes eliminar el fixture: ya hay partidos iniciados o finalizados');
  }
  const { count } = await matchRepository.deleteFixtureMatches(tournamentId, groupId);
  publish(tournamentId, { type: 'fixtures.deleted' });
  return { deleted: count };
}

export async function createMatch(tournamentId, data) {
  if (!await matchRepository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  await validateTeamsBelongToTournament(tournamentId, data.homeTeamId, data.awayTeamId);
  const match = await matchRepository.create({ ...data, tournamentId });
  publish(tournamentId, { type: 'match.created' });
  return match;
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

  const updated = await matchRepository.update(id, updateData);
  publish(updated.tournamentId, { type: 'match.rescheduled' });
  return updated;
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

// Inicia el partido y arranca el cronómetro del primer tiempo con la
// duración que definió el admin en ese momento (no hay un valor por
// defecto: cada torneo/categoría puede jugar tiempos de distinta duración).
export async function startMatch(id, halfDurationMinutes) {
  const match = await getMatch(id);
  if (match.status !== 'SCHEDULED') throw new HttpError(409, 'Solo puedes iniciar un partido programado');

  const updated = await matchRepository.update(id, {
    status: 'STARTED',
    homeScore: 0,
    awayScore: 0,
    halfDurationMinutes,
    currentPeriod: 1,
    periodStartedAt: new Date(),
    extraMinutes: 0,
  });
  publish(updated.tournamentId, updated);
  return updated;
}

// Cierra el primer tiempo y arranca el segundo: reinicia el cronómetro de
// ese tiempo (el tiempo extra del primer tiempo no se acarrea) desde cero.
export async function startNextPeriod(id) {
  const match = await getMatch(id);
  if (match.status !== 'STARTED') throw new HttpError(409, 'Solo puedes cambiar de tiempo en un partido iniciado');
  if ((match.currentPeriod ?? 1) !== 1) throw new HttpError(409, 'El partido ya está en el segundo tiempo');

  const updated = await matchRepository.update(id, {
    currentPeriod: 2,
    periodStartedAt: new Date(),
    extraMinutes: 0,
  });
  publish(updated.tournamentId, updated);
  return updated;
}

// Descanso entre tiempos. Mantener igual que HALFTIME_MINUTES en
// front/src/utils/match-clock.js (el cronómetro de las páginas hace el mismo
// cálculo para mostrar "Descanso" y el segundo tiempo sin recargar).
export const HALFTIME_MINUTES = 10;

// Cuando el primer tiempo llega a su límite (duración + tiempo extra
// agregado) y pasa el descanso, arranca el segundo tiempo solo. Como inicio
// del segundo tiempo se guarda el instante exacto en que terminó el
// descanso (no "ahora"), así el cronómetro es exacto aunque esta revisión
// corra unos segundos tarde. Se ejecuta periódicamente desde server.js.
export async function advanceDueHalftimes(now = Date.now()) {
  const matches = await matchRepository.findLiveFirstHalves();

  for (const match of matches) {
    const firstHalfEnd =
      new Date(match.periodStartedAt).getTime() +
      (match.halfDurationMinutes + (match.extraMinutes ?? 0)) * 60 * 1000;
    const secondHalfStart = firstHalfEnd + HALFTIME_MINUTES * 60 * 1000;
    if (now < secondHalfStart) continue;

    const changed = await matchRepository.startSecondHalfIfStillFirst(match.id, new Date(secondHalfStart));
    if (changed) {
      const updated = await matchRepository.findById(match.id);
      if (updated) publish(updated.tournamentId, updated);
    }
  }
}

// Minutos que se espera después de cumplirse el segundo tiempo (duración +
// tiempo extra agregado) antes de finalizar el partido solo. Si en ese
// lapso el admin agrega tiempo extra, el límite se corre y el margen vuelve
// a contar desde el nuevo límite. Mantener igual que FULL_TIME_GRACE_MINUTES
// en front/src/utils/match-clock.js.
export const FULL_TIME_GRACE_MINUTES = 5;

// Partidos que no se pudieron cerrar solos (p.ej. eliminatoria empatada
// que necesita penales): se avisa una sola vez en la consola por partido.
const autoFinishSkipped = new Set();

// Finaliza los partidos cuyo segundo tiempo ya se cumplió hace
// FULL_TIME_GRACE_MINUTES. Usa el mismo cierre que el botón "Finalizar"
// (avance de llaves incluido). Un empate de eliminatoria que pide penales no
// se cierra solo: queda en vivo para que el admin registre la definición.
// Se ejecuta periódicamente desde server.js.
export async function finishDueMatches(now = Date.now()) {
  const matches = await matchRepository.findLiveSecondHalves();

  for (const match of matches) {
    const finishAt =
      new Date(match.periodStartedAt).getTime() +
      (match.halfDurationMinutes + (match.extraMinutes ?? 0) + FULL_TIME_GRACE_MINUTES) * 60 * 1000;
    if (now < finishAt) continue;

    try {
      await changeStatus(match.id, 'FINISHED');
      autoFinishSkipped.delete(match.id);
    } catch (error) {
      if (!autoFinishSkipped.has(match.id)) {
        autoFinishSkipped.add(match.id);
        console.warn(`[fin automático] Partido #${match.id} no se finalizó solo: ${error.message}`);
      }
    }
  }
}

// Tiempo en curso de un partido en vivo según su cronómetro. Si el primer
// tiempo ya cumplió el descanso pero la revisión periódica todavía no lo
// pasó al segundo, igual cuenta como segundo tiempo (mismo cálculo que
// advanceDueHalftimes y que el cronómetro de las páginas).
function currentPeriodOf(match, now = Date.now()) {
  if ((match.currentPeriod ?? 1) !== 1) return match.currentPeriod;
  if (!match.periodStartedAt || !match.halfDurationMinutes) return 1;
  const secondHalfStart =
    new Date(match.periodStartedAt).getTime() +
    (match.halfDurationMinutes + (match.extraMinutes ?? 0) + HALFTIME_MINUTES) * 60 * 1000;
  return now >= secondHalfStart ? 2 : 1;
}

// Suma minutos de tiempo extra/descuento al tiempo que está en curso.
export async function addExtraTime(id, minutes) {
  const match = await getMatch(id);
  if (match.status !== 'STARTED') throw new HttpError(409, 'Solo puedes agregar tiempo extra en un partido iniciado');

  const updated = await matchRepository.update(id, {
    extraMinutes: (match.extraMinutes ?? 0) + minutes,
  });
  publish(updated.tournamentId, updated);
  return updated;
}

export async function updateLiveScore(id, { homeScore, awayScore }) {
  const match = await getMatch(id);
  if (match.status !== 'STARTED') throw new HttpError(409, 'Solo puedes actualizar el marcador de un partido iniciado');
  const updated = await matchRepository.update(match.id, { homeScore, awayScore });
  publish(updated.tournamentId, updated);
  return updated;
}

const EVENT_EDITABLE_STATUSES = new Set(['STARTED', 'FINISHED']);

export async function addEvent(id, data) {
  const match = await getMatch(id);
  if (!EVENT_EDITABLE_STATUSES.has(match.status)) throw new HttpError(409, 'Solo puedes registrar eventos en un partido iniciado o finalizado');
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
  // En un partido ya finalizado el marcador quedó fijo (registrado vía
  // /result), así que aquí solo se guarda el evento para las estadísticas
  // de goleadores/tarjetas, sin volver a sumar/restar el marcador.
  const adjustScore = match.status === 'STARTED';
  const period = data.period ?? (match.status === 'STARTED' ? currentPeriodOf(match) : null);
  const updated = await matchRepository.createEvent(match.id, { ...data, period }, adjustScore);
  publish(updated.tournamentId, updated);
  return updated;
}
export async function deleteEvent(id, eventId) {
  const match = await getMatch(id);
  if (!EVENT_EDITABLE_STATUSES.has(match.status)) throw new HttpError(409, 'Solo puedes corregir eventos en un partido iniciado o finalizado');
  const adjustScore = match.status === 'STARTED';
  const updated = await matchRepository.removeEvent(Number(eventId), match.id, adjustScore);
  if (!updated) throw new HttpError(404, 'Evento no encontrado');
  publish(updated.tournamentId, updated);
  return updated;
}
