import * as publicRepository from '../repositories/public-repository.js';
import { expireOverdue } from '../repositories/tournament-repository.js';
import { getGoalkeepers, getPlayerStatMaps, getStandings, getStandingsByPot, getTopCards, getTopScorers } from './standings-service.js';
import { getLikeBonusesForPlayers, getTopLikedPlayerId } from './player-like-service.js';
import { getLikeScoresForTournaments } from './tournament-like-service.js';
import { getLeaderTeamIds, getTopLikedTeamId } from './team-like-service.js';
import { TEAM_LIKES } from '../config/team-likes.js';
import { HttpError } from '../utils/http-error.js';
import { withExpiryFlags, withPlayerExpiryFlags } from '../utils/team-expiry.js';

function withPublicMatch(match) {
  return {
    ...match,
    homeTeam: withExpiryFlags(match.homeTeam),
    awayTeam: withExpiryFlags(match.awayTeam),
    events: match.events?.map((event) => {
      const team = withExpiryFlags(event.team);
      return { ...event, team, player: withPlayerExpiryFlags(event.player, team?.teamExpired) };
    }),
  };
}

function withPublicTie(tie) {
  return {
    ...tie,
    homeTeam: withExpiryFlags(tie.homeTeam),
    awayTeam: withExpiryFlags(tie.awayTeam),
    winnerTeam: withExpiryFlags(tie.winnerTeam),
    matches: tie.matches?.map(withPublicMatch),
  };
}

function withPublicGroup(group) {
  return {
    ...group,
    teams: group.teams?.map((entry) => ({ ...entry, team: withExpiryFlags(entry.team) })),
  };
}

// Orden del Home: likes totales + likes recientes con más peso (ver
// LIKES.recentWeight), para que un torneo nuevo con movimiento pueda
// posicionarse por encima de uno viejo con muchos likes acumulados pero ya
// sin actividad. A igual puntaje, se desempata por nombre.
export async function listPublicTournaments() {
  await expireOverdue();
  const tournaments = await publicRepository.findActiveTournaments();
  const scoresById = await getLikeScoresForTournaments(tournaments.map((tournament) => tournament.id));

  return tournaments
    .map((tournament) => ({ ...tournament, likesTotal: scoresById.get(tournament.id)?.total ?? 0 }))
    .sort((a, b) => {
      const scoreA = scoresById.get(a.id)?.score ?? 0;
      const scoreB = scoresById.get(b.id)?.score ?? 0;
      return scoreB - scoreA || a.name.localeCompare(b.name);
    });
}

  function toHomeCard(row, likesTotal) {
    const { _count, matches, ...tournament } = row;
    return {
      tournament: {
        ...tournament,
        teamCount: _count.teams,
        likesTotal,
      },
      upcomingMatches: matches.map((match) => ({
        ...match,
        homeTeam: withExpiryFlags(match.homeTeam),
        awayTeam: withExpiryFlags(match.awayTeam),
      })),
    };
  }

  export async function listHomeTournaments() {
    await expireOverdue();
    const rows = await publicRepository.findHomeTournaments();
    const scoresById = await getLikeScoresForTournaments(rows.map(({ id }) => id));

    return rows
      .map((row) => toHomeCard(row, scoresById.get(row.id)?.total ?? 0))
      .sort((left, right) => {
        const scoreLeft = scoresById.get(left.tournament.id)?.score ?? 0;
        const scoreRight = scoresById.get(right.tournament.id)?.score ?? 0;
        return scoreRight - scoreLeft || left.tournament.name.localeCompare(right.tournament.name);
      });
  }

  export async function getHomeTournament(id) {
    await expireOverdue();
    const [row, scoresById] = await Promise.all([
      publicRepository.findHomeTournaments(id).then((rows) => rows[0] ?? null),
      getLikeScoresForTournaments([id]),
    ]);
    if (!row) throw new HttpError(404, 'Torneo público no encontrado');
    return toHomeCard(row, scoresById.get(id)?.total ?? 0);
  }

export async function getPublicTournament(id) {
  await expireOverdue();
  const tournament = await publicRepository.findActiveTournament(id);
  if (!tournament) throw new HttpError(404, 'Torneo público no encontrado');
  tournament.likesTotal = (await getLikeScoresForTournaments([id])).get(id)?.total ?? 0;

  const [standings, pots, scorers, cards, goalkeepers, upcomingMatches, finishedMatches, groups, ties, tournamentPlayers, playerStatMaps] = await Promise.all([
    getStandings(id),
    getStandingsByPot(id),
    getTopScorers(id),
    getTopCards(id),
    getGoalkeepers(id),
    publicRepository.findUpcomingMatches(id),
    publicRepository.findFinishedMatches(id),
    publicRepository.findGroups(id),
    publicRepository.findTies(id),
    publicRepository.findTournamentPlayers(id),
    getPlayerStatMaps(id),
  ]);

  const { goalsByPlayer, cardsByPlayer, matchesPlayedByPlayer } = playerStatMaps;
  // Igual que en el ranking de goleadores: si el jugador ya está en esa
  // tabla, conserva su posición (para que la tarjeta abierta desde la
  // lista del equipo se vea igual que abierta desde Goleadores).
  const positionByPlayer = new Map(scorers.map((row) => [row.player.id, row.position]));
  const goalkeeperPositionByPlayer = new Map(goalkeepers.map((row) => [row.player.id, row.position]));
  const standingsByTeam = new Map(standings.map((row) => [row.team.id, row]));

  // Todo el roster (no solo goleadores/arqueros) puede recibir likes, así
  // que se piden en bloque para todos los jugadores del torneo.
  const rosterPlayerIds = tournamentPlayers.flatMap(({ team }) => team.players.map(({ player }) => player.id));
  const tournamentTeamIds = standings.map((row) => row.team.id);
  const [likeBonusByPlayer, leaderTeamIds, topLikedTeamId, topLikedPlayerId] = await Promise.all([
    getLikeBonusesForPlayers(rosterPlayerIds),
    getLeaderTeamIds(tournamentTeamIds),
    getTopLikedTeamId(tournamentTeamIds),
    getTopLikedPlayerId(rosterPlayerIds),
  ]);

  // Cada jugador del roster lleva las mismas cifras que usa la tarjeta de
  // goleador (goles, tarjetas, partidos, posición), así la tarjeta se puede
  // abrir también desde la lista de jugadores de un equipo.
  const playersByTeam = new Map(
    tournamentPlayers.map(({ team }) => [
      team.id,
      team.players.map(({ player, isGoalkeeper }) => {
        const cards = cardsByPlayer.get(player.id) ?? { yellowCards: 0, redCards: 0, blueCards: 0 };

        // Igual que en Goleadores/Tarjetas: todo jugador (no solo el
        // arquero) usa los partidos jugados de su equipo, no los suyos
        // propios. goalsConceded sigue siendo solo del arquero.
        const teamStandingRow = standingsByTeam.get(team.id);

        return withPlayerExpiryFlags(
          {
            ...player,
            isGoalkeeper,
            goals: goalsByPlayer.get(player.id) ?? 0,
            matchesPlayed: teamStandingRow ? teamStandingRow.played : (matchesPlayedByPlayer.get(player.id) ?? 0),
            goalsConceded: isGoalkeeper ? teamStandingRow?.goalsAgainst : undefined,
            // Igual que goles/partidos: si es arquero, la posición "dorada"
            // es siempre la de valla menos vencida, no la de goleadores.
            position: isGoalkeeper ? (goalkeeperPositionByPlayer.get(player.id) ?? null) : (positionByPlayer.get(player.id) ?? null),
            likesTotal: likeBonusByPlayer.get(player.id)?.total ?? 0,
            likesOvrBonus: likeBonusByPlayer.get(player.id)?.ovrBonus ?? 0,
            teamLikeBonus: leaderTeamIds.has(team.id) ? TEAM_LIKES.bonusOvr : 0,
            ...cards,
          },
          teamStandingRow?.team?.teamExpired
        );
      }),
    ])
  );

  const recentFormByTeam = {};

  for (const match of finishedMatches) {
    const homeResult = match.homeScore > match.awayScore ? 'G' : match.homeScore === match.awayScore ? 'E' : 'P';
    const awayResult = homeResult === 'G' ? 'P' : homeResult === 'P' ? 'G' : 'E';

    if (!recentFormByTeam[match.homeTeam.id]) recentFormByTeam[match.homeTeam.id] = [];
    if (!recentFormByTeam[match.awayTeam.id]) recentFormByTeam[match.awayTeam.id] = [];

    if (recentFormByTeam[match.homeTeam.id].length < 3) recentFormByTeam[match.homeTeam.id].push(homeResult);
    if (recentFormByTeam[match.awayTeam.id].length < 3) recentFormByTeam[match.awayTeam.id].push(awayResult);
  }

  // Destacados de likes: el equipo y el jugador de ESTE torneo con más
  // likes, para mostrarlos arriba de posiciones/próximos partidos. Se
  // buscan en los datos ya armados (standings/playersByTeam) para no
  // duplicar el shape que ya espera el frontend.
  const topLikedTeam = topLikedTeamId
    ? { team: standingsByTeam.get(topLikedTeamId.teamId)?.team ?? null, total: topLikedTeamId.total }
    : null;

  let topLikedPlayer = null;
  if (topLikedPlayerId) {
    for (const [teamId, players] of playersByTeam) {
      const found = players.find((player) => player.id === topLikedPlayerId.playerId);
      if (found) {
        topLikedPlayer = { player: found, team: standingsByTeam.get(teamId)?.team ?? null, total: topLikedPlayerId.total };
        break;
      }
    }
  }

  return {
    tournament,
    standings: standings.map((row) => ({
      ...row,
      players: playersByTeam.get(row.team.id) ?? [],
    })),
    pots: pots.map((bucket) => ({
      ...bucket,
      standings: bucket.standings.map((row) => ({
        ...row,
        players: playersByTeam.get(row.team.id) ?? [],
      })),
    })),
    scorers,
    cards,
    goalkeepers,
    upcomingMatches: upcomingMatches.map(withPublicMatch),
    recentFormByTeam,
    groups: groups.map(withPublicGroup),
    ties: ties.map(withPublicTie),
    topLikedTeam,
    topLikedPlayer,
  };
}

export async function getPublicHistory(id) {
  const tournament = await publicRepository.findActiveTournament(id);
  if (!tournament) throw new HttpError(404, 'Torneo público no encontrado');
  const matches = await publicRepository.findFinishedMatches(id);
  return matches.map(withPublicMatch);
}
