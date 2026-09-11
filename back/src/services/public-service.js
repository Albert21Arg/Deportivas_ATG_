import * as publicRepository from '../repositories/public-repository.js';
import { getStandings, getStandingsByPot } from './standings-service.js';
import { HttpError } from '../utils/http-error.js';
import { withExpiryFlags } from '../utils/team-expiry.js';

function withPublicMatch(match) {
  return {
    ...match,
    homeTeam: withExpiryFlags(match.homeTeam),
    awayTeam: withExpiryFlags(match.awayTeam),
    events: match.events?.map((event) => ({ ...event, team: withExpiryFlags(event.team) })),
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

export function listPublicTournaments() {
  return publicRepository.findActiveTournaments();
}

export async function getPublicTournament(id) {
  const tournament = await publicRepository.findActiveTournament(id);
  if (!tournament) throw new HttpError(404, 'Torneo público no encontrado');

  const [standings, pots, upcomingMatches, finishedMatches, groups, ties] = await Promise.all([
    getStandings(id),
    getStandingsByPot(id),
    publicRepository.findUpcomingMatches(id),
    publicRepository.findFinishedMatches(id),
    publicRepository.findGroups(id),
    publicRepository.findTies(id),
  ]);

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
    standings,
    pots,
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
