import * as standingsRepository from '../repositories/standings-repository.js';
import { countBillableCardsByPlayer } from '../utils/card-sanctions.js';
import { HttpError } from '../utils/http-error.js';
import { withExpiryFlags, withPlayerExpiryFlags } from '../utils/team-expiry.js';

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

// Mapas crudos playerId -> goles/tarjetas/partidos, sin filtrar por
// torneo-jugador con al menos un evento. Los usan tanto buildPlayerStatRows
// (goleadores/tarjetas, que sí filtra) como cualquier otro lugar que
// necesite estas mismas cifras para TODOS los jugadores del roster (p.ej.
// la tarjeta de jugador desde la lista de un equipo, no solo desde el
// ranking de goleadores).
export async function getPlayerStatMaps(tournamentId) {
  const [goalTotals, cardTotals, matchAppearances] = await Promise.all([
    standingsRepository.findGoalTotals(tournamentId),
    standingsRepository.findPlayerCardTotals(tournamentId),
    standingsRepository.findPlayerMatchAppearances(tournamentId),
  ]);

  const goalsByPlayer = new Map(goalTotals.map((row) => [row.playerId, row._count._all]));

  const cardsByPlayer = new Map();
  for (const row of cardTotals) {
    const entry = cardsByPlayer.get(row.playerId) ?? { yellowCards: 0, redCards: 0, blueCards: 0 };
    if (row.type === 'YELLOW_CARD') entry.yellowCards = row._count._all;
    if (row.type === 'RED_CARD') entry.redCards = row._count._all;
    if (row.type === 'BLUE_CARD') entry.blueCards = row._count._all;
    cardsByPlayer.set(row.playerId, entry);
  }

  const matchesPlayedByPlayer = new Map();
  for (const { playerId } of matchAppearances) {
    matchesPlayedByPlayer.set(playerId, (matchesPlayedByPlayer.get(playerId) ?? 0) + 1);
  }

  return { goalsByPlayer, cardsByPlayer, matchesPlayedByPlayer };
}

// Trae goles y tarjetas por jugador del torneo, ya hidratados con los datos
// del jugador y su equipo (goleadores y tarjetas comparten esta base, cada
// uno arma su propio ranking a partir de ella).
async function buildPlayerStatRows(tournamentId) {
  const { goalsByPlayer, cardsByPlayer, matchesPlayedByPlayer } = await getPlayerStatMaps(tournamentId);

  const playerIds = [...new Set([...goalsByPlayer.keys(), ...cardsByPlayer.keys()])];
  if (!playerIds.length) return [];

  const players = await standingsRepository.findPlayersWithTeams(playerIds);
  const playersById = new Map(players.map((player) => [player.id, player]));

  return playerIds.map((playerId) => {
    const player = playersById.get(playerId);
    const team = withExpiryFlags(player?.teams[0]?.team) ?? null;
    const cards = cardsByPlayer.get(playerId) ?? { yellowCards: 0, redCards: 0, blueCards: 0 };
    return {
      player: withPlayerExpiryFlags(
        {
          id: playerId,
          name: player?.name ?? 'Jugador',
          photo: player?.photo ?? null,
          jerseyNumber: player?.jerseyNumber ?? null,
          paidUntil: player?.paidUntil,
        }
      ),
      team,
      goals: goalsByPlayer.get(playerId) ?? 0,
      matchesPlayed: matchesPlayedByPlayer.get(playerId) ?? 0,
      ...cards,
    };
  });
}

function rankBy(rows, key) {
  return rows
    .filter((row) => row[key] > 0)
    .sort((left, right) => right[key] - left[key] || left.player.name.localeCompare(right.player.name))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

// Tabla de goleadores: goles (no autogoles), amarillas y rojas por jugador
// en el torneo (para la lista y la tarjeta de jugador).
export async function getTopScorers(tournamentId) {
  const rows = await buildPlayerStatRows(tournamentId);
  return rankBy(rows, 'goals');
}

// Tabla de tarjetas: un ranking por cada tipo (amarillas, rojas y azules si
// el torneo las tiene habilitadas), cada jugador solo aparece en el ranking
// de la tarjeta que efectivamente recibió al menos una vez.
export async function getTopCards(tournamentId) {
  const rows = await buildPlayerStatRows(tournamentId);
  return {
    yellowCards: rankBy(rows, 'yellowCards'),
    redCards: rankBy(rows, 'redCards'),
    blueCards: rankBy(rows, 'blueCards'),
  };
}

// Valla menos vencida: ranking de arqueros designados por menos goles
// recibidos por partido. No hay alineación por partido en este esquema, así
// que el arquero asume los partidos jugados y goles en contra de su equipo
// completo (viene ya calculado en la tabla de posiciones). Solo entran
// equipos con al menos un partido jugado.
export async function getGoalkeepers(tournamentId) {
  const [assignments, standings] = await Promise.all([
    standingsRepository.findGoalkeeperAssignments(tournamentId),
    getStandings(tournamentId),
  ]);
  if (!assignments.length) return [];

  const standingsByTeam = new Map(standings.map((row) => [row.team.id, row]));

  const rows = assignments
    .map(({ teamId, player }) => {
      const standingRow = standingsByTeam.get(teamId);
      if (!standingRow || standingRow.played <= 0) return null;
      return {
        player: withPlayerExpiryFlags(player),
        team: standingRow.team,
        matchesPlayed: standingRow.played,
        goalsConceded: standingRow.goalsAgainst,
      };
    })
    .filter(Boolean);

  return rows
    .sort((left, right) => {
      const leftRatio = left.goalsConceded / left.matchesPlayed;
      const rightRatio = right.goalsConceded / right.matchesPlayed;
      return (
        leftRatio - rightRatio ||
        left.goalsConceded - right.goalsConceded ||
        right.matchesPlayed - left.matchesPlayed ||
        left.player.name.localeCompare(right.player.name)
      );
    })
    .map((row, index) => ({ ...row, position: index + 1 }));
}

// Vista admin: multas por tarjeta agrupadas por equipo. Solo incluye
// jugadores con al menos una tarjeta; cardFinePaidCount se compara contra
// el total real (no un simple sí/no), así que si un jugador ya marcado
// como pagado recibe una tarjeta nueva, vuelve a aparecer con pendiente.
// A diferencia de getTopScorers/getTopCards, esto es solo para el panel
// admin: no aplica distorsión por pago (nombre/equipo siempre en claro).
//
// Regla de sanción definitiva: si en un mismo partido una tarjeta queda
// reemplazada por otra más grave (dos amarillas -> roja, amarilla y azul ->
// azul, azul y roja -> roja), solo se cobra la más grave; las reemplazadas
// no cuentan aparte (ver countBillableCardsByPlayer). getTopScorers/getTopCards
// sí muestran el conteo real de tarjetas mostradas, porque son estadística,
// no cobro.
export async function getCardFines(tournamentId) {
  const cardEvents = await standingsRepository.findPlayerCardEvents(tournamentId);
  if (!cardEvents.length) return [];

  const cardsByPlayer = countBillableCardsByPlayer(cardEvents);
  const playerIds = [...cardsByPlayer.keys()];
  const players = await standingsRepository.findPlayersWithTeams(playerIds);
  const playersById = new Map(players.map((player) => [player.id, player]));

  const cardTypes = [
    { type: 'YELLOW_CARD', paidField: 'yellowCardFinePaidCount' },
    { type: 'RED_CARD', paidField: 'redCardFinePaidCount' },
    { type: 'BLUE_CARD', paidField: 'blueCardFinePaidCount' },
  ];

  const teamsById = new Map();
  for (const playerId of playerIds) {
    const player = playersById.get(playerId);
    const team = player?.teams[0]?.team;
    if (!player || !team) continue;

    const cards = cardsByPlayer.get(playerId);

    // Cada tipo de tarjeta se paga por separado: pagar amarillas no cubre
    // rojas ni azules, cada una tiene su propio conteo pagado/pendiente.
    const fines = cardTypes
      .filter(({ type }) => cards[type] > 0)
      .map(({ type, paidField }) => {
        const count = cards[type];
        const paidCount = Math.min(player[paidField] ?? 0, count);
        return { type, count, paidCount, pendingCount: count - paidCount, finePaid: paidCount >= count };
      });

    const row = {
      player: { id: player.id, name: player.name, jerseyNumber: player.jerseyNumber },
      fines,
      hasPending: fines.some((fine) => !fine.finePaid),
    };

    if (!teamsById.has(team.id)) teamsById.set(team.id, { team: { id: team.id, name: team.name }, players: [] });
    teamsById.get(team.id).players.push(row);
  }

  return [...teamsById.values()]
    .map((entry) => ({
      ...entry,
      players: entry.players.sort((left, right) => left.player.name.localeCompare(right.player.name)),
    }))
    .sort((left, right) => left.team.name.localeCompare(right.team.name));
}
