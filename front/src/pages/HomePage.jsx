import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import {
  EXPIRED_CLASS,
  isLogoHidden,
  isTeamExpired,
} from '../utils/team-expiry.js';

import AnnouncementModal from '../components/AnnouncementModal.jsx';
import CompetitionOverview from '../components/CompetitionOverview.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import StandingsTable from '../components/StandingsTable.jsx';

const formStyles = {
  G: 'bg-emerald-500 text-slate-950 dark:text-slate-950',
  E: 'bg-amber-400 text-slate-950 dark:text-slate-950',
  P: 'bg-red-500 text-white dark:text-white',
};

/*
|--------------------------------------------------------------------------
| Helpers para partidos en vivo
|--------------------------------------------------------------------------
*/

function normalizeStatus(status) {
  if (!status) return '';

  return String(status)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function isLiveMatch(match) {
  if (!match) return false;

  const status = normalizeStatus(
    match.status ??
      match.state ??
      match.matchStatus ??
      match.gameStatus
  );

  const liveStatuses = [
    'LIVE',
    'IN_PROGRESS',
    'INPROGRESS',
    'PLAYING',
    'PLAYED_LIVE',
    'RUNNING',
    'STARTED',
    'EN_VIVO',
    'VIVO',
  ];

  if (liveStatuses.includes(status)) {
    return true;
  }

  if (
    match.isLive === true ||
    match.live === true ||
    match.inProgress === true
  ) {
    return true;
  }

  return false;
}

function getMatchesFromTournament(tournament) {
  // `upcomingMatches` es el campo real que devuelve /public/tournaments/:id
  // (incluye SCHEDULED, STARTED y POSTPONED, de todas las fases: liga,
  // grupos y llaves). Los demás nombres son variantes defensivas por si el
  // shape cambia, pero hoy ninguno existe en la respuesta real.
  const possibleSources = [
    tournament?.upcomingMatches,
    tournament?.liveMatches,
    tournament?.matches,
    tournament?.games,
    tournament?.fixtures,
    tournament?.tournament?.upcomingMatches,
    tournament?.tournament?.liveMatches,
    tournament?.tournament?.matches,
    tournament?.tournament?.games,
    tournament?.tournament?.fixtures,
  ];

  for (const source of possibleSources) {
    if (Array.isArray(source) && source.length > 0) {
      return source;
    }
  }

  return [];
}

function getLiveMatch(tournament) {
  const directLiveMatch =
    tournament?.liveMatch ??
    tournament?.tournament?.liveMatch;

  if (directLiveMatch) {
    return directLiveMatch;
  }

  const directLiveMatches =
    tournament?.liveMatches ??
    tournament?.tournament?.liveMatches;

  if (Array.isArray(directLiveMatches)) {
    const live = directLiveMatches.find(isLiveMatch);

    if (live) {
      return live;
    }
  }

  const matches = getMatchesFromTournament(tournament);

  return matches.find(isLiveMatch) ?? null;
}

/*
|--------------------------------------------------------------------------
| Obtener equipo local / visitante
|--------------------------------------------------------------------------
*/

function getHomeTeam(match) {
  return (
    match?.homeTeam ??
    match?.home ??
    match?.localTeam ??
    match?.teamHome ??
    match?.local ??
    null
  );
}

function getAwayTeam(match) {
  return (
    match?.awayTeam ??
    match?.away ??
    match?.visitorTeam ??
    match?.teamAway ??
    match?.visitor ??
    match?.visitingTeam ??
    null
  );
}

/*
|--------------------------------------------------------------------------
| Obtener marcador
|--------------------------------------------------------------------------
*/

function getScore(match, side) {
  const isHome = side === 'home';

  const directValue = isHome
    ? match?.homeScore ?? match?.scoreHome
    : match?.awayScore ?? match?.scoreAway;

  if (
    directValue !== undefined &&
    directValue !== null
  ) {
    return directValue;
  }

  const score = match?.score;

  if (score) {
    if (typeof score === 'object') {
      return isHome
        ? score.home ??
            score.homeScore ??
            score.local ??
            0
        : score.away ??
            score.awayScore ??
            score.visitor ??
            0;
    }
  }

  const result = match?.result;

  if (result && typeof result === 'object') {
    return isHome
      ? result.home ?? result.local ?? 0
      : result.away ?? result.visitor ?? 0;
  }

  return 0;
}

/*
|--------------------------------------------------------------------------
| Nombre del equipo
|--------------------------------------------------------------------------
*/

function getTeamName(team, fallback = 'Equipo') {
  if (!team) return fallback;

  if (typeof team === 'string') {
    return team;
  }

  return (
    team.name ??
    team.shortName ??
    team.displayName ??
    fallback
  );
}

/*
|--------------------------------------------------------------------------
| Logo del equipo
|--------------------------------------------------------------------------
*/

function getTeamLogo(team) {
  if (!team || typeof team === 'string') {
    return null;
  }

  return (
    team.logo ??
    team.logoUrl ??
    team.crest ??
    team.crestUrl ??
    team.image ??
    team.imageUrl ??
    null
  );
}

/*
|--------------------------------------------------------------------------
| Logo del equipo
|--------------------------------------------------------------------------
*/

function TeamLogo({
  team,
  size = 'h-9 w-9',
  className = '',
}) {
  const expired = isTeamExpired(team);
  const expiredClass = expired ? EXPIRED_CLASS : '';

  if (!team?.logo || isLogoHidden(team)) {
    return (
      <div
        className={`flex ${size} shrink-0 items-center justify-center text-xs text-slate-400 ${className} ${expiredClass}`}
        aria-label={
          expired
            ? undefined
            : `Sin escudo para ${team?.name ?? 'equipo'}`
        }
      >
        ⚽
      </div>
    );
  }

  return (
    <img
      className={`${size} shrink-0 object-contain ${className} ${expiredClass}`}
      src={team.logo}
      alt={
        expired
          ? ''
          : `Escudo de ${team.name}`
      }
    />
  );
}

/*
|--------------------------------------------------------------------------
| Marcador en vivo
|--------------------------------------------------------------------------
*/

function LiveMatchCard({
  match,
  accent = 'emerald',
}) {
  const isCyan = accent === 'cyan';

  if (!match) {
    return (
      <div
        className={`
          rounded-xl border px-3 py-2.5
          sm:rounded-2xl sm:px-4 sm:py-3
          ${
            isCyan
              ? 'border-cyan-400/10 bg-cyan-400/[0.04]'
              : 'border-slate-200 bg-slate-50 dark:border-white/[0.05] dark:bg-white/[0.02]'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <span
            className={`
              h-1.5 w-1.5 rounded-full
              ${
                isCyan
                  ? 'bg-cyan-500/60'
                  : 'bg-slate-600'
              }
            `}
          />

          <p
            className={`
              text-[8px] font-black uppercase tracking-[0.16em]
              sm:text-[9px]
              ${
                isCyan
                  ? 'text-slate-900 dark:text-cyan-500/70'
                  : 'text-slate-600'
              }
            `}
          >
            Partido
          </p>
        </div>

        <p className="mt-2 text-xs font-bold text-slate-500">
          Sin partido en vivo
        </p>
      </div>
    );
  }

  const homeTeam = getHomeTeam(match);
  const awayTeam = getAwayTeam(match);

  const homeName = getTeamName(
    homeTeam,
    'Local'
  );

  const awayName = getTeamName(
    awayTeam,
    'Visitante'
  );

  const homeLogo = getTeamLogo(homeTeam);
  const awayLogo = getTeamLogo(awayTeam);

  const homeScore = getScore(match, 'home');
  const awayScore = getScore(match, 'away');

  const minute =
    match.minute ??
    match.elapsed ??
    match.currentMinute ??
    match.matchMinute ??
    null;

  return (
    <div
      className={`
        rounded-xl border px-3 py-2.5
        sm:rounded-2xl sm:px-4 sm:py-3
        ${
          isCyan
            ? 'border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.08] via-slate-900/[0.02] to-slate-900/[0.01] dark:via-white/[0.02] dark:to-white/[0.01]'
            : 'border-red-400/10 bg-gradient-to-br from-red-500/[0.07] via-slate-900/[0.02] to-slate-900/[0.01] dark:via-white/[0.02] dark:to-white/[0.01]'
        }
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`
                absolute inline-flex h-full w-full animate-ping rounded-full opacity-60
                ${
                  isCyan
                    ? 'bg-cyan-400'
                    : 'bg-red-400'
                }
              `}
            />

            <span
              className={`
                relative inline-flex h-2 w-2 rounded-full
                ${
                  isCyan
                    ? 'bg-cyan-400'
                    : 'bg-red-400'
                }
              `}
            />
          </span>

          <p
            className={`
              text-[8px] font-black uppercase tracking-[0.16em]
              sm:text-[9px]
              ${
                isCyan
                  ? 'text-slate-900 dark:text-cyan-300'
                  : 'text-red-300'
              }
            `}
          >
            En vivo
          </p>
        </div>

        {minute !== null && (
          <span
            className={`
              text-[9px] font-bold
              ${
                isCyan
                  ? 'text-slate-900 dark:text-cyan-300'
                  : 'text-red-300'
              }
            `}
          >
            {minute}'
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {homeLogo ? (
              <img
                className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
                src={homeLogo}
                alt=""
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] dark:bg-white/[0.05] sm:h-7 sm:w-7">
                ⚽
              </div>
            )}

            <span className="truncate text-[9px] font-bold text-slate-900 dark:text-white sm:text-[10px]">
              {homeName}
            </span>
          </div>
        </div>

        <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-white/[0.08] dark:bg-black/30">
          <span className="text-sm font-black tracking-wider text-slate-900 dark:text-white">
            {homeScore}
          </span>

          <span className="mx-1 text-xs text-slate-600">
            :
          </span>

          <span className="text-sm font-black tracking-wider text-slate-900 dark:text-white">
            {awayScore}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-end gap-1.5">
            <span className="truncate text-right text-[9px] font-bold text-slate-900 dark:text-white sm:text-[10px]">
              {awayName}
            </span>

            {awayLogo ? (
              <img
                className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
                src={awayLogo}
                alt=""
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] dark:bg-white/[0.05] sm:h-7 sm:w-7">
                ⚽
              </div>
            )}
          </div>
        </div>
      </div>

      {match.streamUrl && (
        <a
          href={match.streamUrl}
          target="_blank"
          rel="noreferrer"
          className={`
            mt-2.5 flex items-center justify-center gap-1.5
            rounded-lg py-1.5
            text-[9px] font-black uppercase tracking-wider
            transition
            sm:text-[10px]
            ${
              isCyan
                ? 'bg-cyan-400/15 text-slate-900 hover:bg-cyan-400/25 dark:text-cyan-300'
                : 'bg-red-400/15 text-red-700 hover:bg-red-400/25 dark:text-red-300'
            }
          `}
        >
          ▶ Ver en vivo
        </a>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Modal del equipo
|--------------------------------------------------------------------------
*/

function TeamModal({ selection, onClose }) {
  if (!selection) return null;

  const { row, recentForm } = selection;
  const isLeader = row.position === 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 px-3 py-4 sm:px-5 sm:py-8 sm:bg-slate-950/85 sm:backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="relative max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-black/10 dark:border-white/[0.08] dark:bg-[#090e17] dark:shadow-black/60 sm:max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-500/[0.12] to-transparent" />

        <div className="relative flex justify-end px-3 pt-3 sm:px-4 sm:pt-4">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        </div>

        <div className="relative px-4 pb-7 text-center sm:px-6 sm:pb-8">
          <div className="relative mx-auto mt-2 w-fit">
            <div className="absolute inset-0 rounded-full bg-emerald-400/10 blur-2xl" />

            <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-2xl dark:border-white/[0.08] dark:from-slate-800 dark:to-slate-950 sm:h-32 sm:w-32">
              <TeamLogo
                team={row.team}
                size="h-20 w-20 sm:h-24 sm:w-24"
              />
            </div>

            {isLeader && (
              <span
                className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400 text-lg shadow-lg shadow-amber-500/30"
                aria-label="Primer lugar"
              >
                👑
              </span>
            )}
          </div>

          <div className="mt-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Posición #{row.position}
            </span>

            <h2
              className={`mt-3 text-2xl font-black tracking-tight sm:text-3xl ${
                isLeader
                  ? 'text-amber-600 dark:text-amber-100'
                  : 'text-slate-900 dark:text-white'
              }`}
              id="team-modal-title"
            >
              {row.team.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {row.points} puntos en la competición
            </p>
          </div>

          <div className="mt-7 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.025]">
            <div className="border-r border-slate-200 px-3 py-4 dark:border-white/[0.06]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                PJ
              </p>

              <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {row.played}
              </p>
            </div>

            <div className="border-r border-slate-200 px-3 py-4 dark:border-white/[0.06]">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                DG
              </p>

              <p
                className={`mt-1 text-xl font-black ${
                  row.goalDifference > 0
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : row.goalDifference < 0
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-slate-900 dark:text-white'
                }`}
              >
                {row.goalDifference > 0
                  ? `+${row.goalDifference}`
                  : row.goalDifference}
              </p>
            </div>

            <div className="px-3 py-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                PTS
              </p>

              <p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-300">
                {row.points}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
              Últimos resultados
            </p>

            {recentForm.length ? (
              <div className="mt-3 flex justify-center gap-2">
                {recentForm.map((result, index) => (
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black shadow-lg ${formStyles[result]}`}
                    key={`${result}-${index}`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                Sin partidos finalizados.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Tarjeta premium del torneo
|--------------------------------------------------------------------------
*/

function TournamentCard({
  tournament,
  onSelectTeam,
  isExpanded,
  onToggle,
  colorVariant = 'emerald',
}) {
  const standings = tournament.standings ?? [];

  const mode =
    tournament.tournament.mode ??
    'ROUND_ROBIN';

  const contentId = `tournament-content-${tournament.tournament.id}`;

  const buttonId = `tournament-button-${tournament.tournament.id}`;

  const leader = standings.find(
    (row) => row.position === 1
  );

  const liveMatch = getLiveMatch(tournament);

  const totalTeams =
    tournament.tournament.teamCount ??
    tournament.teamCount ??
    standings.length ??
    0;

  const modeLabels = {
    ROUND_ROBIN: 'Liga',
    GROUP_STAGE: 'Fase de grupos',
    KNOCKOUT: 'Eliminación',
    PLAYOFF: 'Playoffs',
  };

  const modeLabel =
    modeLabels[mode] ?? 'Competición';

  const isCyan = colorVariant === 'cyan';

  const colors = isCyan
    ? {
        border:
          'border-cyan-400/25 sm:border-cyan-400/15',
        borderHover:
          'hover:border-cyan-400/50',
        bg: 'bg-white dark:bg-[#07141a]',
        cardRing: 'border-white dark:border-[#07141a]',
        shadow:
          'shadow-[0_20px_70px_rgba(6,182,212,0.10)]',
        expanded:
          'border-cyan-400/45 shadow-[0_25px_90px_rgba(6,182,212,0.16)]',
        glow:
          'bg-cyan-400/[0.10] group-hover:bg-cyan-400/[0.17]',
        glowBottom:
          'bg-blue-400/[0.06]',
        line:
          'via-cyan-400/80',
        badge:
          'border-cyan-400/25 bg-cyan-400/[0.10] text-slate-900 dark:text-cyan-300',
        pulse:
          'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
        logoGlow:
          'bg-cyan-400/15',
        logoBorder:
          'border-cyan-400/20',
        topStatus:
          'bg-cyan-400',
        topStatusDot:
          'bg-white dark:bg-slate-950',
        section:
          'text-slate-900 dark:text-cyan-400',
        button:
          'border-cyan-400/30 bg-cyan-400/[0.10] text-slate-900 hover:border-cyan-400/50 hover:bg-cyan-400/[0.18] dark:text-cyan-300',
        closedButton:
          'from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400',
      }
    : {
        border:
          'border-emerald-400/25 sm:border-slate-200 sm:dark:border-white/[0.07]',
        borderHover:
          'hover:border-emerald-400/30',
        bg: 'bg-white dark:bg-[#0a0f18]',
        cardRing: 'border-white dark:border-[#0a0f18]',
        shadow:
          'shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.25)]',
        expanded:
          'border-emerald-400/40 shadow-[0_25px_90px_rgba(16,185,129,0.13)]',
        glow:
          'bg-emerald-400/[0.08] group-hover:bg-emerald-400/[0.13]',
        glowBottom:
          'bg-cyan-400/[0.04]',
        line:
          'via-emerald-400/70',
        badge:
          'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-600 dark:text-emerald-300',
        pulse:
          'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        logoGlow:
          'bg-emerald-400/10',
        logoBorder:
          'border-slate-200 dark:border-white/[0.09]',
        topStatus:
          'bg-emerald-400',
        topStatusDot:
          'bg-white dark:bg-slate-950',
        section:
          'text-emerald-600 dark:text-emerald-400',
        button:
          'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-600 hover:border-emerald-400/40 hover:bg-emerald-400/15 dark:text-emerald-300',
        closedButton:
          'from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400',
      };

  return (
    <article
      className={`
        group relative w-full min-w-0 overflow-hidden
        rounded-[1.75rem]
        border
        ${colors.border}
        ${colors.bg}
        ${colors.shadow}
        transition-all duration-500
        sm:rounded-[2rem]
        sm:${colors.border}
        ${
          isExpanded
            ? colors.expanded
            : `${colors.borderHover} hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(0,0,0,0.4)]`
        }
      `}
    >
      {/* ============================================================
          GLOWS DE LA TARJETA
      ============================================================ */}

      <div
        className={`
          pointer-events-none absolute -right-24 -top-28
          h-72 w-72 rounded-full blur-3xl
          transition duration-700
          ${colors.glow}
        `}
      />

      <div
        className={`
          pointer-events-none absolute -bottom-32 -left-20
          h-64 w-64 rounded-full blur-3xl
          ${colors.glowBottom}
        `}
      />

      {/* Línea superior */}

      <div
        className={`
          absolute inset-x-0 top-0 h-[2px]
          bg-gradient-to-r from-transparent
          ${colors.line}
          to-transparent
          transition-opacity duration-500
          ${
            isExpanded
              ? 'opacity-100'
              : 'opacity-80 group-hover:opacity-100'
          }
        `}
      />

      {/* ============================================================
          CABECERA
      ============================================================ */}

      <button
        id={buttonId}
        className="relative w-full overflow-hidden text-left"
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className="p-4 sm:p-6 lg:p-7">
          <div className="flex items-start gap-4 sm:gap-6">
            {/* Logo */}

            <div className="relative shrink-0">
              <div
                className={`
                  absolute -inset-2 rounded-[1.25rem]
                  blur-xl
                  transition duration-500
                  ${colors.logoGlow}
                  ${
                    isExpanded
                      ? 'opacity-100'
                      : 'opacity-60 group-hover:opacity-100'
                  }
                `}
              />

              <div
                className={`
                  relative flex h-16 w-16
                  items-center justify-center
                  rounded-[1.25rem]
                  border
                  ${colors.logoBorder}
                  bg-gradient-to-br
                  from-slate-100 via-slate-200 to-slate-300
                  dark:from-slate-800 dark:via-slate-900 dark:to-slate-950
                  p-2 shadow-2xl
                  sm:h-20 sm:w-20
                  sm:rounded-[1.5rem]
                  sm:p-2.5
                `}
              >
                {tournament.tournament.logo ? (
                  <img
                    className="h-full w-full rounded-xl object-cover"
                    src={tournament.tournament.logo}
                    alt=""
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl">
                    🏆
                  </span>
                )}
              </div>

              <span
                className={`
                  absolute -bottom-1 -right-1
                  flex h-5 w-5 items-center
                  justify-center rounded-full
                  border-2
                  ${colors.cardRing}
                  sm:h-6 sm:w-6
                  ${colors.topStatus}
                `}
              >
                <span
                  className={`
                    h-1.5 w-1.5 rounded-full
                    sm:h-2 sm:w-2
                    ${colors.topStatusDot}
                  `}
                />
              </span>
            </div>

            {/* Información */}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`
                    inline-flex items-center gap-1.5
                    rounded-full border
                    px-2.5 py-1
                    text-[9px] font-bold uppercase
                    tracking-[0.16em]
                    sm:px-3 sm:text-[10px]
                    ${colors.badge}
                  `}
                >
                  <span
                    className={`
                      h-1.5 w-1.5 animate-pulse rounded-full
                      ${colors.pulse}
                    `}
                  />

                  En vivo
                </span>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] sm:px-3 sm:text-[10px]">
                  {modeLabel}
                </span>
              </div>

              <h2 className="mt-3 truncate text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-[1.7rem]">
                {tournament.tournament.name}
              </h2>

              <p className="mt-1.5 line-clamp-2 max-w-3xl text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                {tournament.tournament.description ||
                  'Consulta la clasificación, partidos y resultados de esta competición.'}
              </p>
            </div>

            {/* Toggle */}

            <span
              className={`
                flex h-9 w-9 shrink-0 items-center
                justify-center rounded-xl
                border border-slate-200
                bg-slate-50 text-xs text-slate-500
                transition-all duration-300
                dark:border-white/[0.07]
                dark:bg-white/[0.025]
                sm:h-10 sm:w-10
                ${
                  isExpanded
                    ? `rotate-180 ${colors.badge}`
                    : 'group-hover:border-slate-300 group-hover:text-slate-900 dark:group-hover:border-white/[0.12] dark:group-hover:text-white'
                }
              `}
              aria-hidden="true"
            >
              ▼
            </span>
          </div>

          {/* ============================================================
              ESTADÍSTICAS
          ============================================================ */}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-white/[0.025] sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:text-[9px]">
                Equipos
              </p>

              <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white sm:text-base">
                {totalTeams}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-white/[0.025] sm:rounded-2xl sm:px-4 sm:py-3">
              {tournament.tournament.championTeam && (
                <TeamLogo
                  team={tournament.tournament.championTeam}
                  size="h-6 w-6 sm:h-7 sm:w-7"
                  className="shrink-0"
                />
              )}

              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:text-[9px]">
                  Último campeón
                </p>

                <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                  {tournament.tournament.championTeam?.name ?? '—'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-white/[0.025] sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:text-[9px]">
                Líder
              </p>

              <p className="mt-0.5 truncate text-sm font-black text-amber-600 dark:text-amber-300 sm:text-base">
                {leader?.team?.name ?? '—'}
              </p>
            </div>

            <LiveMatchCard
              match={liveMatch}
              accent={isCyan ? 'cyan' : 'emerald'}
            />
          </div>
        </div>
      </button>

      {/* ================================================================
          CONTENIDO
      ================================================================ */}

      <div
        className={`
          grid transition-[grid-template-rows]
          duration-500 ease-out
          ${
            isExpanded
              ? 'grid-rows-[1fr]'
              : 'grid-rows-[0fr]'
          }
        `}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={contentId}
            role="region"
            aria-labelledby={buttonId}
            className="w-full min-w-0 border-t border-slate-200 dark:border-white/[0.06]"
          >
            {/* Header clasificación */}

            <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-black/10 sm:px-6 sm:py-4">
              <div>
                <p
                  className={`text-[9px] font-bold uppercase tracking-[0.18em] sm:text-[10px] ${colors.section}`}
                >
                  Clasificación
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Rendimiento actual de los equipos
                </p>
              </div>

              <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.025] sm:inline-flex">
                {standings.length} equipos
              </span>
            </div>

            {/* ROUND ROBIN */}

            {mode === 'ROUND_ROBIN' ? (
              <div className="w-full min-w-0 overflow-hidden p-2.5 sm:p-5">
                <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.05]">
                  <table className="w-full table-fixed text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                      <tr className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600 sm:text-[10px] sm:tracking-[0.16em]">
                        <th className="w-12 px-1.5 py-3 text-center sm:w-14 sm:px-2 sm:py-3.5">
                          Pos
                        </th>

                        <th className="px-1.5 py-3 text-left sm:px-3 sm:py-3.5">
                          Equipo
                        </th>

                        <th className="hidden px-2 py-3.5 text-center sm:table-cell">
                          PJ
                        </th>

                        <th className="hidden px-2 py-3.5 text-center sm:table-cell">
                          DG
                        </th>

                        <th className="hidden px-2 py-3.5 text-center text-amber-400 sm:table-cell">
                          🟨
                        </th>

                        <th className="hidden px-2 py-3.5 text-center text-red-400 sm:table-cell">
                          🟥
                        </th>

                        <th className="hidden px-2 py-3.5 text-center text-blue-400 sm:table-cell">
                          🟦
                        </th>

                        <th
                          className={`
                            w-14 px-1.5 py-3 text-center
                            sm:w-auto sm:px-3 sm:py-3.5
                            ${
                              isCyan
                                ? 'text-slate-900 dark:text-cyan-400'
                                : 'text-emerald-400'
                            }
                          `}
                        >
                          PTS
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {standings.map((row) => {
                        const isLeader =
                          row.position === 1;

                        const expired =
                          isTeamExpired(row.team);

                        return (
                          <tr
                            key={row.team.id}
                            className={`
                              group/row transition-all duration-200
                              ${
                                isLeader
                                  ? 'border-l-2 border-amber-400 bg-gradient-to-r from-amber-400/[0.09] via-amber-400/[0.025] to-transparent'
                                  : 'hover:bg-slate-50 dark:hover:bg-white/[0.025]'
                              }
                            `}
                          >
                            <td className="w-12 px-1.5 py-3 text-center sm:w-auto sm:px-2 sm:py-3.5">
                              {row.position <= 3 ? (
                                <span
                                  className={`
                                    mx-auto flex h-7 w-7 items-center
                                    justify-center rounded-lg
                                    text-[10px] font-black
                                    ${
                                      row.position === 1
                                        ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 dark:text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.22)]'
                                        : row.position === 2
                                          ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 dark:text-slate-900'
                                          : 'bg-gradient-to-br from-orange-300 to-orange-500 text-slate-950 dark:text-slate-950'
                                    }
                                  `}
                                >
                                  {row.position}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-600 sm:text-sm">
                                  {row.position}
                                </span>
                              )}
                            </td>

                            <td className="min-w-0 px-1.5 py-3 sm:px-3 sm:py-3.5">
                              <button
                                className="flex min-w-0 w-full items-center gap-2.5 text-left sm:gap-3"
                                type="button"
                                onClick={() =>
                                  onSelectTeam(
                                    row,
                                    tournament
                                      .recentFormByTeam?.[
                                      row.team.id
                                    ] ?? []
                                  )
                                }
                              >
                                <div className="relative shrink-0">
                                  <div
                                    className={`
                                      absolute -inset-1 rounded-full blur-md
                                      ${
                                        isLeader
                                          ? 'bg-amber-400/10'
                                          : 'bg-emerald-400/0 group-hover/row:bg-emerald-400/10'
                                      }
                                    `}
                                  />

                                  <TeamLogo
                                    team={row.team}
                                    size="h-9 w-9 sm:h-11 sm:w-11"
                                    className="relative"
                                  />

                                  {isLeader && (
                                    <span
                                      className="absolute -right-1.5 -top-2 z-10 text-xs leading-none drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] sm:-right-2 sm:-top-3 sm:text-sm"
                                      title="Primer lugar"
                                      aria-label="Primer lugar"
                                    >
                                      👑
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`
                                    min-w-0 flex-1 truncate
                                    text-xs font-bold
                                    transition-colors sm:text-sm
                                    ${
                                      isLeader
                                        ? 'text-amber-600 group-hover/row:text-amber-500 dark:text-amber-100 dark:group-hover/row:text-amber-300'
                                        : 'text-slate-700 group-hover/row:text-slate-900 dark:text-slate-300 dark:group-hover/row:text-white'
                                    }
                                  `}
                                >
                                  {row.team.name}
                                </span>
                              </button>
                            </td>

                            <td className="hidden px-2 py-3.5 text-center text-slate-500 sm:table-cell">
                              {row.played}
                            </td>

                            <td
                              className={`
                                hidden px-2 py-3.5
                                text-center text-sm
                                sm:table-cell
                                ${
                                  row.goalDifference > 0
                                    ? 'font-bold text-emerald-400'
                                    : row.goalDifference < 0
                                      ? 'font-bold text-red-400'
                                      : 'text-slate-500'
                                }
                                ${
                                  expired
                                    ? EXPIRED_CLASS
                                    : ''
                                }
                              `}
                            >
                              {row.goalDifference > 0
                                ? `+${row.goalDifference}`
                                : row.goalDifference}
                            </td>

                            <td
                              className={`hidden px-2 py-3.5 text-center text-amber-300 sm:table-cell ${
                                expired
                                  ? EXPIRED_CLASS
                                  : ''
                              }`}
                            >
                              {row.yellowCards}
                            </td>

                            <td
                              className={`hidden px-2 py-3.5 text-center text-red-300 sm:table-cell ${
                                expired
                                  ? EXPIRED_CLASS
                                  : ''
                              }`}
                            >
                              {row.redCards}
                            </td>

                            <td
                              className={`hidden px-2 py-3.5 text-center text-blue-300 sm:table-cell ${
                                expired
                                  ? EXPIRED_CLASS
                                  : ''
                              }`}
                            >
                              {row.blueCards}
                            </td>

                            <td
                              className={`
                                w-14 px-1.5 py-3 text-center
                                text-sm sm:w-auto
                                sm:px-3 sm:py-3.5 sm:text-base
                                ${
                                  isLeader
                                    ? 'font-black text-amber-300'
                                    : isCyan
                                      ? 'font-black text-slate-900 dark:text-cyan-300'
                                      : 'font-black text-emerald-300'
                                }
                              `}
                            >
                              {row.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {standings.length === 0 && (
                    <p className="p-6 text-center text-xs text-slate-500 sm:p-8 sm:text-sm">
                      Aún no hay equipos en este torneo.
                    </p>
                  )}
                </div>
              </div>
            ) : mode === 'GROUP_STAGE' ? (
              <div className="w-full min-w-0 overflow-hidden p-2.5 sm:p-5">
                {!tournament.pots ||
                tournament.pots.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02] sm:p-8 sm:text-sm">
                    Los grupos aún no han sido generados.
                  </p>
                ) : (
                  <div className="w-full space-y-5">
                    {tournament.pots.map(
                      ({
                        pot,
                        standings: potStandings,
                      }) => (
                        <div
                          key={pot}
                          className="w-full min-w-0"
                        >
                          <div className="mb-2.5 flex items-center gap-3">
                            <span className="h-px flex-1 bg-slate-200 dark:bg-white/[0.05]" />

                            <h3
                              className={`text-[10px] font-black uppercase tracking-[0.18em] ${colors.section}`}
                            >
                              Bombo {pot}
                            </h3>

                            <span className="h-px flex-1 bg-slate-200 dark:bg-white/[0.05]" />
                          </div>

                          <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.05]">
                            <StandingsTable
                              standings={potStandings}
                              respectPaymentStatus
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden p-2.5 sm:p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.05] dark:bg-white/[0.015]">
                  <CompetitionOverview
                    mode={mode}
                    groups={tournament.groups}
                    ties={tournament.ties}
                    championLabel={
                      tournament.tournament
                        .championLabel
                    }
                  />
                </div>
              </div>
            )}

            {/* Footer */}

            <div className="border-t border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.05] dark:bg-black/10 sm:px-5 sm:py-4">
              <Link
                className={`
                  group/link flex min-h-11 w-full
                  items-center justify-center gap-2
                  rounded-xl border px-4 py-2.5
                  text-center text-xs font-black
                  transition-all duration-300
                  sm:py-3 sm:text-sm
                  ${colors.button}
                `}
                to={`/tournaments/${tournament.tournament.id}`}
              >
                Abrir competición completa

                <span className="transition-transform duration-300 group-hover/link:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer cerrado */}

      {!isExpanded && (
        <div className="relative border-t border-slate-200 px-3 py-3 dark:border-white/[0.05] sm:px-5 sm:py-4">
          <Link
            className={`
              group/link flex min-h-11 w-full
              items-center justify-center gap-2
              rounded-xl
              bg-gradient-to-r
              ${colors.closedButton}
              px-4 py-2.5
              text-center text-xs font-black
              text-slate-950 dark:text-slate-950
              shadow-lg
              transition-all duration-300
              sm:py-3 sm:text-sm
            `}
            to={`/tournaments/${tournament.tournament.id}`}
          >
            Ver torneo y próximos partidos

            <span className="transition-transform duration-300 group-hover/link:translate-x-1">
              →
            </span>
          </Link>
        </div>
      )}
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Página principal
|--------------------------------------------------------------------------
*/

export default function HomePage() {
  const { notify } = useNotifications();

  const [tournaments, setTournaments] = useState([]);
  const [selectedTeam, setSelectedTeam] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [expandedTournamentId, setExpandedTournamentId] =
    useState(null);

  function toggleTournament(tournamentId) {
    setExpandedTournamentId((currentId) =>
      currentId === tournamentId
        ? null
        : tournamentId
    );
  }

  useEffect(() => {
    async function loadTournaments() {
      try {
        const { data } = await api.get(
          '/public/tournaments'
        );

        const tournamentList =
          data.data.tournaments;

        const details = await Promise.all(
          tournamentList.map(
            async (tournament) => {
              const response = await api.get(
                `/public/tournaments/${tournament.id}`
              );

              return response.data.data;
            }
          )
        );

        setTournaments(details);
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadTournaments();
  }, [notify]);

  /*
  |--------------------------------------------------------------------------
  | Actualización automática
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(
          '/public/tournaments'
        );

        const tournamentList =
          data.data.tournaments;

        const details = await Promise.all(
          tournamentList.map(
            async (tournament) => {
              const response = await api.get(
                `/public/tournaments/${tournament.id}`
              );

              return response.data.data;
            }
          )
        );

        setTournaments(details);
      } catch {
        // No mostramos error en cada actualización automática.
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const normalizedSearch =
    searchQuery.trim().toLowerCase();

  const filteredTournaments =
    tournaments.filter((tournament) =>
      tournament.tournament.name
        .toLowerCase()
        .includes(normalizedSearch)
    );

  return (
    <main className="lm-ready min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b12] dark:text-slate-100">
      <PublicNavbar />

      <AnnouncementModal />

      {/* ================================================================
          HERO
      ================================================================ */}

      <section className="relative w-full overflow-hidden border-b border-slate-200 bg-slate-50 px-4 pb-12 pt-24 dark:border-white/[0.06] dark:bg-[#070b12] sm:px-6 sm:pb-20 sm:pt-32 lg:px-12 xl:px-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-emerald-500/[0.07] blur-3xl sm:h-96 sm:w-96" />

        <div className="pointer-events-none absolute -right-32 -top-20 h-80 w-80 rounded-full bg-cyan-400/[0.045] blur-3xl sm:h-[30rem] sm:w-[30rem]" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300 sm:text-[10px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />

            Resultados en un solo lugar
          </div>

          <h1 className="mt-5 max-w-4xl text-[2.15rem] font-black leading-[1.03] tracking-[-0.04em] text-slate-900 dark:text-white sm:mt-6 sm:text-5xl lg:text-6xl xl:text-7xl">
            Torneos que se viven

            <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(52,211,153,0.15)]">
              partido a partido.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:mt-6 sm:text-lg sm:leading-8">
            Consulta tablas de posiciones, próximos
            encuentros y resultados de tus
            competiciones en tiempo real.
          </p>

          <div className="mt-7 flex items-center gap-3 sm:mt-9">
            <span className="h-px w-16 bg-gradient-to-r from-emerald-400 to-transparent sm:w-24" />

            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700 sm:text-[10px]">
              Competición oficial
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================
          TORNEOS
      ================================================================ */}

      <section className="relative w-full px-3.5 py-8 sm:px-6 sm:py-14 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_7px_#34d399]" />

                En vivo
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
                Torneos activos
              </h2>

              <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                Sigue la competición y consulta
                cada jornada.
              </p>
            </div>

            <div className="flex w-full items-center gap-2.5 sm:w-auto sm:gap-3">
              {tournaments.length > 0 && (
                <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                    placeholder="Buscar torneo..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white dark:placeholder:text-slate-700 dark:focus:bg-white/[0.04]"
                  />
                </div>
              )}

              <span className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] sm:px-4">
                <span aria-hidden="true">
                  🏆
                </span>

                {tournaments.length}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-12 text-center dark:border-white/[0.06] dark:bg-white/[0.02] sm:rounded-[2rem] sm:p-20">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/[0.03] to-transparent" />

              <div className="relative mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-400 dark:border-slate-800" />

              <p className="relative mt-5 text-xs text-slate-600 sm:text-sm">
                Cargando torneos...
              </p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-white/[0.08] dark:bg-white/[0.015] sm:rounded-[2rem] sm:p-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl dark:border-white/[0.06] dark:bg-white/[0.025]">
                🏟️
              </div>

              <p className="mt-5 text-xs font-medium text-slate-500 sm:text-sm">
                No hay torneos activos
                disponibles.
              </p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-white/[0.08] dark:bg-white/[0.015] sm:rounded-[2rem] sm:p-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl dark:border-white/[0.06] dark:bg-white/[0.025]">
                🔍
              </div>

              <p className="mt-5 text-xs font-medium text-slate-500 sm:text-sm">
                {`Ningún torneo coincide con "${searchQuery}".`}
              </p>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-5 sm:gap-5 lg:gap-6">
              {filteredTournaments.map(
                (tournament, index) => {
                  const tournamentId =
                    tournament.tournament.id;

                  return (
                    <TournamentCard
                      key={tournamentId}
                      tournament={tournament}
                      colorVariant={
                        index % 2 === 0
                          ? 'emerald'
                          : 'cyan'
                      }
                      isExpanded={
                        expandedTournamentId ===
                        tournamentId
                      }
                      onToggle={() =>
                        toggleTournament(
                          tournamentId
                        )
                      }
                      onSelectTeam={(
                        row,
                        recentForm
                      ) =>
                        setSelectedTeam({
                          row,
                          recentForm,
                        })
                      }
                    />
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      <TeamModal
        selection={selectedTeam}
        onClose={() =>
          setSelectedTeam(null)
        }
      />
    </main>
  );
}
