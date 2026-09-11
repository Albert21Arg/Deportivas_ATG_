import * as standingsRepository from '../repositories/standings-repository.js';
import { HttpError } from '../utils/http-error.js';
import { withExpiryFlags } from '../utils/team-expiry.js';

function rankStandings(rows) {
  return [...rows]
    .sort((left, right) => (
      right.points - left.points
      || left.goalsAgainst - right.goalsAgainst
      || right.goalDifference - left.goalDifference
      || right.goalsFor - left.goalsFor
      || left.team.name.localeCompare(right.team.name)
    ))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

function buildCardTotals(cards) {
  const totals = new Map();
  for (const card of cards) { const current = totals.get(card.teamId) ?? { yellowCards: 0, redCards: 0, blueCards: 0 }; if (card.type === 'YELLOW_CARD') current.yellowCards = card._count._all; if (card.type === 'RED_CARD') current.redCards = card._count._all; if (card.type === 'BLUE_CARD') current.blueCards = card._count._all; totals.set(card.teamId, current); }
  return totals;
}

export function calculateStandings(teams, matches) {
  const table = new Map(teams.map((team) => [team.id, {
    position: 0,
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }]));

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;

    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.homeScore < match.awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows = [...table.values()].map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }));
  return rankStandings(rows);
}

export async function getStandings(tournamentId, groupId = null) {
  const tournament = groupId
    ? await standingsRepository.findGroupWithTeams(groupId, tournamentId)
    : await standingsRepository.findTournamentWithTeams(tournamentId);
  if (!tournament) throw new HttpError(404, groupId ? 'Grupo no encontrado' : 'Torneo no encontrado');

  const teams = tournament.teams.map(({ team }) => withExpiryFlags(team));
  const [matches, cards] = await Promise.all([
    standingsRepository.findFinishedMatches(tournamentId, groupId),
    standingsRepository.findCardTotals(tournamentId, groupId ? teams.map((team) => team.id) : null),
  ]);
  const totals = buildCardTotals(cards);
  return calculateStandings(teams, matches).map((row) => ({ ...row, ...(totals.get(row.team.id) ?? { yellowCards: 0, redCards: 0, blueCards: 0 }) }));
}

// Compara equipos del mismo bombo entre sí (nunca se enfrentan directamente,
// porque el sorteo reparte un equipo de cada bombo por grupo), usando las
// estadísticas que cada uno ya sacó en su propio grupo.
export async function getStandingsByPot(tournamentId) {
  const groups = await standingsRepository.findGroupsWithPots(tournamentId);
  if (!groups.length) return [];

  const [allMatches, cards] = await Promise.all([
    standingsRepository.findFinishedMatches(tournamentId),
    standingsRepository.findCardTotals(tournamentId),
  ]);
  const totals = buildCardTotals(cards);

  const potBuckets = new Map();

  for (const group of groups) {
    const teams = group.teams.map(({ team }) => withExpiryFlags(team));
    const matchesInGroup = allMatches.filter((match) => match.groupId === group.id);
    const groupStandings = calculateStandings(teams, matchesInGroup);

    for (const row of groupStandings) {
      const pot = group.teams.find((entry) => entry.teamId === row.team.id)?.pot ?? 1;
      const rowWithExtras = {
        ...row,
        ...(totals.get(row.team.id) ?? { yellowCards: 0, redCards: 0, blueCards: 0 }),
        groupName: group.name,
      };
      if (!potBuckets.has(pot)) potBuckets.set(pot, []);
      potBuckets.get(pot).push(rowWithExtras);
    }
  }

  return [...potBuckets.entries()]
    .sort(([potA], [potB]) => potA - potB)
    .map(([pot, rows]) => ({ pot, standings: rankStandings(rows) }));
}

// Tabla de goleadores: goles (no autogoles) por jugador en el torneo.
export async function getTopScorers(tournamentId) {
  const totals = await standingsRepository.findGoalTotals(tournamentId);
  if (!totals.length) return [];

  const players = await standingsRepository.findPlayersWithTeams(totals.map((row) => row.playerId));
  const playersById = new Map(players.map((player) => [player.id, player]));

  const rows = totals.map((row) => {
    const player = playersById.get(row.playerId);
    return {
      player: { id: row.playerId, name: player?.name ?? 'Jugador', photo: player?.photo ?? null },
      team: withExpiryFlags(player?.teams[0]?.team) ?? null,
      goals: row._count._all,
    };
  });

  return rows
    .sort((left, right) => right.goals - left.goals || left.player.name.localeCompare(right.player.name))
    .map((row, index) => ({ ...row, position: index + 1 }));
}
