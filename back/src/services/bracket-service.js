import * as repository from '../repositories/bracket-repository.js';
import { HttpError } from '../utils/http-error.js';
import { publish } from './realtime-service.js';
import * as tournamentService from './tournament-service.js';

const STAGE_NAMES = { 1: 'FINAL', 2: 'SEMI', 4: 'QUARTER', 8: 'ROUND_OF_16', 16: 'ROUND_OF_32' };
const STAGE_ORDER = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL'];

function stageForTieCount(tieCount) {
  return STAGE_NAMES[tieCount] ?? `ROUND_OF_${tieCount * 2}`;
}

function buildStages(teamCount) {
  const stages = [];
  let ties = teamCount / 2;
  while (ties >= 1) {
    stages.push({ stage: stageForTieCount(ties), tieCount: ties });
    ties /= 2;
  }
  return stages;
}

function nextStage(stage) {
  const index = STAGE_ORDER.indexOf(stage);
  if (index === -1 || index === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[index + 1];
}

async function createTieMatches(tournamentId, tie, mode, startDate, time) {
  if (!tie.homeTeamId || !tie.awayTeamId) return;
  const date = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const base = { tournamentId, stage: tie.stage, tieId: tie.id, date, time, status: 'SCHEDULED' };
  if (mode === 'KNOCKOUT_TWO_LEG') {
    // Convención estándar de ida y vuelta: el equipo "local" de la llave
    // (el que arrastra el marcador global) juega la Vuelta -el partido
    // decisivo- en su casa, y la Ida de visitante.
    await repository.createMatch({ ...base, homeTeamId: tie.awayTeamId, awayTeamId: tie.homeTeamId, leg: 1 });
    await repository.createMatch({ ...base, homeTeamId: tie.homeTeamId, awayTeamId: tie.awayTeamId, leg: 2 });
  } else {
    await repository.createMatch({ ...base, homeTeamId: tie.homeTeamId, awayTeamId: tie.awayTeamId, leg: null });
  }
}

export async function listBracket(tournamentId) {
  if (!await repository.findTournament(tournamentId)) throw new HttpError(404, 'Torneo no encontrado');
  return repository.findByTournament(tournamentId);
}

export async function resetBracket(tournamentId) {
  await repository.clearBracket(tournamentId);
  publish(tournamentId, { type: 'bracket.reset' });
}

export async function createBracket(tournamentId, { teamIds, startDate, time = '15:00' }) {
  const tournament = await repository.findTournament(tournamentId);
  if (!tournament) throw new HttpError(404, 'Torneo no encontrado');
  if (!['KNOCKOUT_SINGLE', 'KNOCKOUT_TWO_LEG'].includes(tournament.mode)) {
    throw new HttpError(422, 'El torneo debe estar en modo de eliminación directa o ida y vuelta para crear llaves');
  }

  const count = teamIds.length;
  const isPowerOfTwo = count >= 2 && (count & (count - 1)) === 0;
  if (!isPowerOfTwo) throw new HttpError(422, 'El número de equipos debe ser una potencia de 2 (2, 4, 8, 16...)');
  if (!await repository.teamsBelongToTournament(tournamentId, teamIds)) {
    throw new HttpError(422, 'Todos los equipos deben pertenecer a este torneo');
  }
  if (await repository.hasTies(tournamentId)) {
    throw new HttpError(409, 'Ya existe una llave para este torneo; elimínala antes de crear una nueva');
  }

  const stages = buildStages(count);
  const [firstRound, ...restRounds] = stages;

  for (let slot = 0; slot < firstRound.tieCount; slot += 1) {
    const tie = await repository.createTie(tournamentId, firstRound.stage, slot, teamIds[slot * 2], teamIds[slot * 2 + 1]);
    await createTieMatches(tournamentId, tie, tournament.mode, startDate, time);
  }

  for (const { stage, tieCount } of restRounds) {
    for (let slot = 0; slot < tieCount; slot += 1) {
      await repository.createTie(tournamentId, stage, slot);
    }
  }

  if (tournament.hasThirdPlace && stages.some((round) => round.stage === 'SEMI')) {
    await repository.createTie(tournamentId, 'THIRD_PLACE', 0);
  }

  publish(tournamentId, { type: 'bracket.created' });
  return repository.findByTournament(tournamentId);
}

function computeTwoLegResult(tie, matches) {
  const homeTeamId = tie.homeTeamId;
  const awayTeamId = tie.awayTeamId;
  let aggA = 0;
  let aggB = 0;
  let awayGoalsA = 0;
  let awayGoalsB = 0;
  for (const match of matches) {
    const aIsHome = match.homeTeamId === homeTeamId;
    const aGoals = aIsHome ? match.homeScore : match.awayScore;
    const bGoals = aIsHome ? match.awayScore : match.homeScore;
    aggA += aGoals;
    aggB += bGoals;
    if (!aIsHome) awayGoalsA += aGoals;
    if (aIsHome) awayGoalsB += bGoals;
  }
  return { aggA, aggB, awayGoalsA, awayGoalsB, homeTeamId, awayTeamId };
}

// Si el resultado (o el global a doble partido) queda empatado, la llave se
// define por la tanda de penales registrada en el partido que decide la
// serie (homePenaltyScore/awayPenaltyScore). Sin esos datos la llave queda
// sin ganador, igual que antes.
export function resolveWinner(tie, matches, awayGoalsRule) {
  if (matches.some((match) => match.homeScore === null || match.awayScore === null)) return null;
  if (matches.length === 1) {
    const [match] = matches;
    if (match.homeScore !== match.awayScore) return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
    return resolveByPenalties(matches);
  }
  const result = computeTwoLegResult(tie, matches);
  if (result.aggA !== result.aggB) return result.aggA > result.aggB ? result.homeTeamId : result.awayTeamId;
  if (awayGoalsRule && result.awayGoalsA !== result.awayGoalsB) {
    return result.awayGoalsA > result.awayGoalsB ? result.homeTeamId : result.awayTeamId;
  }
  return resolveByPenalties(matches);
}

function resolveByPenalties(matches) {
  const decidingMatch = matches.find((match) => match.homePenaltyScore != null && match.awayPenaltyScore != null);
  if (!decidingMatch || decidingMatch.homePenaltyScore === decidingMatch.awayPenaltyScore) return null;
  return decidingMatch.homePenaltyScore > decidingMatch.awayPenaltyScore ? decidingMatch.homeTeamId : decidingMatch.awayTeamId;
}

async function propagateWinner(tie, winnerTeamId, loserTeamId, tournament) {
  if (tie.stage === 'THIRD_PLACE') return;

  if (tie.stage === 'FINAL') {
    const thirdPlaceTie = tournament.hasThirdPlace ? await repository.findTieByStageSlot(tie.tournamentId, 'THIRD_PLACE', 0) : null;
    await tournamentService.setChampion(tie.tournamentId, {
      championTeamId: winnerTeamId,
      runnerUpTeamId: loserTeamId,
      thirdPlaceTeamId: thirdPlaceTie?.winnerTeamId ?? null,
    });
    return;
  }

  const next = nextStage(tie.stage);
  if (next) {
    const nextTie = await repository.findTieByStageSlot(tie.tournamentId, next, Math.floor(tie.slot / 2));
    if (nextTie) {
      const field = tie.slot % 2 === 0 ? 'homeTeamId' : 'awayTeamId';
      const patched = await repository.updateTie(nextTie.id, { [field]: winnerTeamId });
      if (patched.homeTeamId && patched.awayTeamId) await createTieMatches(tie.tournamentId, patched, tournament.mode, null, '15:00');
    }
  }

  if (tie.stage === 'SEMI' && tournament.hasThirdPlace) {
    const thirdPlaceTie = await repository.findTieByStageSlot(tie.tournamentId, 'THIRD_PLACE', 0);
    if (thirdPlaceTie) {
      const field = tie.slot % 2 === 0 ? 'homeTeamId' : 'awayTeamId';
      const patched = await repository.updateTie(thirdPlaceTie.id, { [field]: loserTeamId });
      if (patched.homeTeamId && patched.awayTeamId) await createTieMatches(tie.tournamentId, patched, tournament.mode, null, '15:00');
    }
  }
}

async function setTieWinner(tie, winnerTeamId, tournament) {
  await repository.updateTie(tie.id, { winnerTeamId });
  const loserTeamId = [tie.homeTeamId, tie.awayTeamId].find((teamId) => teamId !== winnerTeamId) ?? null;
  await propagateWinner(tie, winnerTeamId, loserTeamId, tournament);
}

export async function advanceFromMatch(match) {
  if (!match.tieId) return;
  const tie = await repository.findTieById(match.tieId);
  if (!tie || tie.winnerTeamId) return;
  if (!tie.matches.length || !tie.matches.every((row) => row.status === 'FINISHED')) return;

  const tournament = await repository.findTournament(tie.tournamentId);
  const winnerTeamId = resolveWinner(tie, tie.matches, tournament.awayGoalsRule);
  if (!winnerTeamId) return;
  await setTieWinner(tie, winnerTeamId, tournament);
}

export async function setWinnerManually(tournamentId, tieId, winnerTeamId) {
  const tie = await repository.findTieById(tieId);
  if (!tie || tie.tournamentId !== tournamentId) throw new HttpError(404, 'Llave no encontrada');
  if (tie.winnerTeamId) throw new HttpError(409, 'Esta llave ya tiene un ganador definido');
  if (![tie.homeTeamId, tie.awayTeamId].includes(winnerTeamId)) throw new HttpError(422, 'El ganador debe ser uno de los equipos de la llave');
  const tournament = await repository.findTournament(tournamentId);
  await setTieWinner(tie, winnerTeamId, tournament);
  publish(tournamentId, { type: 'bracket.winner_set' });
  return repository.findTieById(tieId);
}
