import * as publicRepository from '../repositories/public-repository.js';
import { expireOverdue } from '../repositories/tournament-repository.js';
import { getGoalkeepers, getPlayerStatMaps, getStandings, getStandingsByPot, getTopCards, getTopScorers } from './standings-service.js';
import { HttpError } from '../utils/http-error.js';
import { withExpiryFlags, withPlayerExpiryFlags } from '../utils/team-expiry.js';

function withPublicMatch(match) {
  return {
    ...match,
    homeTeam: withExpiryFlags(match.homeTeam),
    awayTeam: withExpiryFlags(match.awayTeam),
    events: match.events?.map((event) => {
      const team = withExpiryFlags(event.team);
      return { ...event, team, player: withPlayerExpiryFlags(event.player) };
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

export async function listPublicTournaments() {
  await expireOverdue();
  return publicRepository.findActiveTournaments();
}

export async function getPublicTournament(id) {
  await expireOverdue();
  const tournament = await publicRepository.findActiveTournament(id);
  if (!tournament) throw new HttpError(404, 'Torneo público no encontrado');

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

  // Cada jugador del roster lleva las mismas cifras que usa la tarjeta de
  // goleador (goles, tarjetas, partidos, posición), así la tarjeta se puede
  // abrir también desde la lista de jugadores de un equipo.
  const playersByTeam = new Map(
    tournamentPlayers.map(({ team }) => [
      team.id,
      team.players.map(({ player }) => {
        const cards = cardsByPlayer.get(player.id) ?? { yellowCards: 0, redCards: 0, blueCards: 0 };
        return withPlayerExpiryFlags({
          ...player,
          goals: goalsByPlayer.get(player.id) ?? 0,
          matchesPlayed: matchesPlayedByPlayer.get(player.id) ?? 0,
          position: positionByPlayer.get(player.id) ?? null,
          ...cards,
        });
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
  };
}

export async function getPublicHistory(id) {
  const tournament = await publicRepository.findActiveTournament(id);
  if (!tournament) throw new HttpError(404, 'Torneo público no encontrado');
  const matches = await publicRepository.findFinishedMatches(id);
  return matches.map(withPublicMatch);
}
