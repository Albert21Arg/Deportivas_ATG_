import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import { getMatchClock } from '../utils/match-clock.js';
import {
  EXPIRED_CLASS,
  isLogoHidden,
  isTeamExpired,
} from '../utils/team-expiry.js';

import AnnouncementModal from '../components/AnnouncementModal.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import TeamLikeButton from '../components/TeamLikeButton.jsx';

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

  const [, forceTick] = useState(0);

  useEffect(() => {
    if (match?.status !== 'STARTED') return undefined;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [match?.status, match?.periodStartedAt, match?.currentPeriod, match?.halfDurationMinutes]);

  if (!match) return null;

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

  const clock = getMatchClock(match);

  return (
    <div
      className={`
        rounded-xl border px-3 py-2.5
        sm:rounded-2xl sm:px-4 sm:py-3
        ${isCyan
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
                ${isCyan
                  ? 'bg-cyan-400'
                  : 'bg-red-400'
                }
              `}
            />

            <span
              className={`
                relative inline-flex h-2 w-2 rounded-full
                ${isCyan
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
              ${isCyan
                ? 'text-slate-900 dark:text-cyan-300'
                : 'text-red-300'
              }
            `}
          >
            En vivo
          </p>
        </div>

        {clock && (
          <span
            className={`
              text-[9px] font-bold
              ${isCyan
                ? 'text-slate-900 dark:text-cyan-300'
                : 'text-red-300'
              }
            `}
          >
            {clock.label}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1 sm:mt-2.5 sm:gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {homeLogo ? (
              <img
                className="h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7"
                src={homeLogo}
                alt=""
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] dark:bg-white/[0.05] sm:h-7 sm:w-7">
                ⚽
              </div>
            )}

            <span className="truncate text-[8.5px] font-bold text-slate-900 dark:text-white sm:text-[10px]">
              {homeName}
            </span>
          </div>
        </div>

        <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-white/[0.08] dark:bg-black/30">
          <span className="text-[13px] font-black tracking-wider text-slate-900 dark:text-white sm:text-sm">
            {homeScore}
          </span>

          <span className="mx-1 text-xs text-slate-600">
            :
          </span>

          <span className="text-[13px] font-black tracking-wider text-slate-900 dark:text-white sm:text-sm">
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
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] dark:bg-white/[0.05] sm:h-7 sm:w-7">
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
            ${isCyan
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/95 px-0 pb-0 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:items-center sm:px-5 sm:py-8 sm:bg-slate-950/85 sm:backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] border border-slate-200 bg-white shadow-2xl shadow-black/20 dark:border-white/[0.08] dark:bg-[#090e17] dark:shadow-black/70 sm:max-h-[92vh] sm:rounded-[2rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-500/[0.12] to-transparent" />

        <div className="sticky top-0 z-20 flex justify-end px-3 pb-1 pt-3 sm:static sm:px-4 sm:pt-4">
          <button
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl font-bold text-slate-500 shadow-lg transition active:scale-95 hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#111827]/95 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        </div>

        <div className="relative px-3 pb-6 text-center sm:px-6 sm:pb-8">
          <div className="relative mx-auto mt-1 w-fit sm:mt-2">
            <div className="absolute inset-0 rounded-full bg-emerald-400/10 blur-2xl" />

            <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-2xl dark:border-white/[0.08] dark:from-slate-800 dark:to-slate-950 sm:h-32 sm:w-32">
              <TeamLogo
                team={row.team}
                size="h-16 w-16 sm:h-24 sm:w-24"
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

          <div className="mt-4 sm:mt-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Posición #{row.position}
            </span>

            <h2
              className={`mt-3 text-2xl font-black tracking-tight sm:text-3xl ${isLeader
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

            <div className="mt-3 flex justify-center">
              <TeamLikeButton teamId={row.team.id} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.025] sm:mt-7">
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
                className={`mt-1 text-xl font-black ${row.goalDifference > 0
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

          <div className="mt-5 sm:mt-6">
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
| Botón de like del torneo
|
| El backend valida el límite real de 1 like por IP/torneo cada 24h; acá
| solo recordamos localmente (localStorage) que este navegador ya dio like
| a este torneo, para no mostrar el corazón activo otra vez hasta que
| pasen las 24h, aunque el usuario recargue la página. Mientras esté
| "liked", el mismo botón permite deshacerlo (por si fue un click por
| error) — el backend solo deja quitar el más reciente, dentro de esa
| misma ventana de 24h.
|--------------------------------------------------------------------------
*/

const LIKE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function hasLikedRecently(tournamentId) {
  try {
    const storedAt = localStorage.getItem(`tournamentLike:${tournamentId}`);
    return Boolean(storedAt) && Date.now() - Number(storedAt) < LIKE_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function rememberLike(tournamentId) {
  try {
    localStorage.setItem(`tournamentLike:${tournamentId}`, String(Date.now()));
  } catch {
    // localStorage puede fallar en modo privado; no es crítico, el backend
    // igual aplica el límite real por IP.
  }
}

function forgetLike(tournamentId) {
  try {
    localStorage.removeItem(`tournamentLike:${tournamentId}`);
  } catch {
    // Ídem: si falla, no es crítico.
  }
}

function TournamentLikeButton({ tournamentId, initialTotal }) {
  const { notify } = useNotifications();
  const [total, setTotal] = useState(initialTotal);
  const [isLiked, setIsLiked] = useState(() => hasLikedRecently(tournamentId));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTotal(initialTotal);
  }, [initialTotal]);

  async function handleToggleLike(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isSaving) return;

    setIsSaving(true);

    try {
      if (isLiked) {
        const { data } = await api.delete(`/public/tournaments/${tournamentId}/like`);
        setTotal(data.data.total);
        setIsLiked(false);
        forgetLike(tournamentId);
      } else {
        const { data } = await api.post(`/public/tournaments/${tournamentId}/like`);
        setTotal(data.data.total);
        setIsLiked(true);
        rememberLike(tournamentId);
      }
    } catch (error) {
      const details = getApiErrorDetails(error);
      if (details.message?.startsWith('Ya diste like')) {
        setIsLiked(true);
        rememberLike(tournamentId);
      } else if (details.message?.includes('No tenés un like reciente')) {
        // Ya no había nada que deshacer (ej. pasaron las 24h): sincronizamos
        // el estado local con lo que dice el backend.
        setIsLiked(false);
        forgetLike(tournamentId);
      }
      notify(details);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggleLike}
      disabled={isSaving}
      className={`
        absolute right-3 top-3 z-30
        inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-1
        rounded-full text-sm font-bold transition-transform duration-200
        hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400
        ${
          isLiked
            ? 'text-rose-600 dark:text-rose-300'
            : 'text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300'
        }
        ${isSaving ? 'cursor-wait opacity-70' : 'cursor-pointer active:scale-95'}
      `}
      title={isLiked ? 'Quitar like (por si fue un error)' : 'Dar like a este torneo'}
    >
      <span className="text-base leading-none" aria-hidden="true">
        {isLiked ? '❤️' : '🤍'}
      </span>
      <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums">{total}</span>
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| Tarjeta premium del torneo
|--------------------------------------------------------------------------
*/

function TournamentCard({
  tournament,
  colorVariant = 'emerald',
}) {
  const mode =
    tournament.tournament.mode ??
    'ROUND_ROBIN';

  const liveMatch = getLiveMatch(tournament);

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
        'border-cyan-400/25',
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
        'border-emerald-400/25',
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
        rounded-2xl
        border
        ${colors.border}
        ${colors.bg}
        ${colors.shadow}
        transition-all duration-500
        ${colors.borderHover} hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(0,0,0,0.4)]
      `}
    >
      {/* Toda la tarjeta lleva al torneo: enlace que la cubre completa (así
          también funciona "abrir en otra pestaña" y el teclado). El like y
          el enlace de la transmisión en vivo quedan por encima. */}
      <Link
        className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        to={`/tournaments/${tournament.tournament.id}`}
        aria-label={`Ver torneo ${tournament.tournament.name}`}
      />
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
          opacity-80 group-hover:opacity-100
        `}
      />

      <TournamentLikeButton
        tournamentId={tournament.tournament.id}
        initialTotal={tournament.tournament.likesTotal ?? 0}
      />

      {/* ============================================================
          CABECERA
      ============================================================ */}

      <div className="relative w-full overflow-hidden text-left">
        <div className="p-3.5">
          <div className="flex items-start gap-3">
            {/* Logo */}

            <div className="relative shrink-0">
              <div
                className={`
                  absolute -inset-2 rounded-[1.25rem]
                  blur-xl
                  transition duration-500
                  ${colors.logoGlow}
                  opacity-60 group-hover:opacity-100
                `}
              />

              {tournament.tournament.logo ? (
                <img
                  className="relative h-14 w-14 rounded-xl object-cover shadow-2xl"
                  src={tournament.tournament.logo}
                  alt=""
                />
              ) : (
                <div
                  className={`
                    relative flex h-14 w-14
                    items-center justify-center
                    rounded-[1.25rem]
                    border
                    ${colors.logoBorder}
                    bg-gradient-to-br
                    from-slate-100 via-slate-200 to-slate-300
                    dark:from-slate-800 dark:via-slate-900 dark:to-slate-950
                    shadow-2xl
                  `}
                >
                  <span className="text-xl">
                    🏆
                  </span>
                </div>
              )}

              <span
                className={`
                  absolute -bottom-1 -right-1
                  flex h-5 w-5 items-center
                  justify-center rounded-full
                  border-2
                  ${colors.cardRing}
                  ${colors.topStatus}
                `}
              >
                <span
                  className={`
                    h-1.5 w-1.5 rounded-full
                    ${colors.topStatusDot}
                  `}
                />
              </span>
            </div>

            {/* Información */}

            <div className="min-w-0 flex-1 pr-20">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`
                    inline-flex items-center gap-1.5
                    rounded-full border
                    px-2.5 py-1
                    text-[9px] font-bold uppercase
                    tracking-[0.16em]
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

                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025]">
                  {modeLabel}
                </span>
              </div>

              <h2 className="mt-2 line-clamp-2 text-[1.05rem] font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                {tournament.tournament.name}
              </h2>

              <p className="mt-1 line-clamp-2 max-w-3xl text-[11px] leading-4 text-slate-500">
                {tournament.tournament.description ||
                  'Consulta la clasificación, partidos y resultados de esta competición.'}
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="px-3.5 pb-3.5">
        {/* ============================================================
    ESTADÍSTICAS
============================================================ */}

          <div className="mt-4 grid grid-cols-1 gap-3">

            {/* ÚLTIMO CAMPEÓN */}
            <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3.5 dark:border-white/[0.05] dark:bg-white/[0.025]">
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  Último campeón
                </p>

                <p className="mt-1 break-words whitespace-normal text-sm font-black leading-5 text-slate-900 dark:text-white">
                  {tournament.tournament.championTeam?.name ?? '—'}
                </p>
              </div>

              {tournament.tournament.championTeam && (
                <TeamLogo
                  team={tournament.tournament.championTeam}
                  size="h-14 w-14"
                  className="shrink-0"
                />
              )}
            </div>

            {/* PARTIDO EN VIVO - ANCHO COMPLETO */}
            {liveMatch && (
              <div className="relative z-[2] w-full">
                <LiveMatchCard
                  match={liveMatch}
                  accent={isCyan ? 'cyan' : 'emerald'}
                />
              </div>
            )}

          </div>
        </div>

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
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [selectedTeam, setSelectedTeam] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listRequestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadAllTournaments = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = listRequestRef.current + 1;
      listRequestRef.current = requestId;
      if (!silent) setIsLoading(true);

      try {
        const { data } = await api.get('/public/home/tournaments', {
          params: { page, search: debouncedSearch },
        });
        if (listRequestRef.current !== requestId) return;
        setTournaments(data.data.tournaments);
        setTotalTournaments(data.data.total);
        setPageCount(data.data.pageCount);
        setPage(data.data.page);
      } catch (error) {
        if (!silent && listRequestRef.current === requestId) notify(getApiErrorDetails(error));
      } finally {
        if (listRequestRef.current === requestId) setIsLoading(false);
      }
    },
    [debouncedSearch, notify, page]
  );

  // Refresco puntual de UN torneo (lo usa el stream en vivo de cada
  // torneo): no vuelve a pedir la lista completa, solo ese detalle.
  const loadTournamentDetail = useCallback(
    async (tournamentId) => {
      try {
        const { data } = await api.get(`/public/home/tournaments/${tournamentId}`);

        setTournaments((current) =>
          current.map((entry) =>
            entry.tournament.id === tournamentId
              ? data.data
              : entry
          )
        );
      } catch {
        // Silencioso: si falla, el próximo evento en vivo o el sondeo de
        // respaldo lo vuelven a intentar.
      }
    },
    []
  );

  useEffect(() => {
    loadAllTournaments();
  }, [loadAllTournaments]);

  /*
  |--------------------------------------------------------------------------
  | Actualización en vivo
  | Un stream por torneo actualiza las tarjetas casi al instante. El sondeo
  | lento solo sirve de respaldo y para detectar torneos nuevos.
  |--------------------------------------------------------------------------
  */

  const tournamentIdsKey = useMemo(
    () =>
      tournaments
        .map((entry) => entry.tournament.id)
        .sort((left, right) => left - right)
        .join(','),
    [tournaments]
  );

  useEffect(() => {
    if (!tournamentIdsKey) return undefined;

    const tournamentIds = tournamentIdsKey
      .split(',')
      .map(Number);

    const streams = tournamentIds.map((tournamentId) => {
      const stream = new EventSource(
        `${api.defaults.baseURL}/public/tournaments/${tournamentId}/events`
      );

      stream.addEventListener('match.updated', () =>
        loadTournamentDetail(tournamentId)
      );

      return stream;
    });

    return () => {
      streams.forEach((stream) => stream.close());
    };
  }, [tournamentIdsKey, loadTournamentDetail]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAllTournaments({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAllTournaments]);

  const normalizedSearch = searchQuery.trim();

  return (
    <main className="lm-ready relative isolate min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#070b12] dark:text-slate-100">
      <PublicNavbar />

      <AnnouncementModal />

      <div className="relative z-[1] border-b border-slate-200 bg-gradient-to-r from-emerald-500/[0.08] via-transparent to-cyan-500/[0.06] px-3 pb-3 pt-[4.75rem] dark:border-white/[0.06] sm:px-6 sm:pb-4 sm:pt-[5.25rem] lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl border border-emerald-400/15 bg-white/70 p-3 dark:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              ¿Organizas torneos? Conoce Deportiva.ATG
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Descubre las herramientas para gestionar y compartir tu competencia.
            </p>
          </div>
          <Link
            to="/presentacion"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-400"
          >
            Conocer la plataforma <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* ================================================================
          HERO
      ================================================================ */}

      <section className="relative z-[1] hidden w-full overflow-hidden border-b border-slate-200 px-4 pb-12 pt-24 dark:border-white/[0.06] sm:block sm:px-6 sm:pb-20 sm:pt-32 lg:px-12 xl:px-20">
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

        <div className="relative mx-auto hidden w-full max-w-7xl sm:block">
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

      <section className="relative z-[1] w-full px-3 pb-7 pt-[5.5rem] sm:px-6 sm:py-14 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-4 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-auto">
              {/* Encabezado: visible únicamente en escritorio */}
              <div className="block">
                <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400 sm:text-xs">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_7px_#34d399]" />

                  En vivo
                </p>

                <h2 className="mt-1.5 text-xl font-black tracking-[-0.025em] text-slate-900 dark:text-white sm:mt-2 sm:text-3xl lg:text-4xl">
                  Torneos activos
                </h2>

                <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:mt-1 sm:text-sm">
                  Sigue la competición y consulta
                  cada jornada.
                </p>
              </div>

              {/* Buscador: visible únicamente en móviles */}
              {totalTournaments > 0 && (
                <div className="relative mt-2 flex h-11 w-full sm:hidden">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={searchQuery}
                    maxLength={120}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar torneo..."
                    className="h-12 w-full touch-manipulation rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white dark:placeholder:text-slate-700"
                  />
                </div>
              )}
            </div>

            <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              {totalTournaments > 0 && (
                <div className="relative hidden h-11 w-72 shrink-0 items-center justify-center sm:flex sm:flex-none">
                  <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-600 sm:left-3.5 sm:translate-x-0">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={searchQuery}
                    maxLength={120}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                    placeholder="Buscar torneo..."
                    className="hidden h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm sm:block text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/10 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white dark:placeholder:text-slate-700 dark:focus:bg-white/[0.04]"
                  />
                </div>
              )}

              <span className="hidden h-11 shrink-0 self-end items-center gap-1.5 rounded-xl border sm:flex border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] sm:self-auto sm:px-4">
                <span aria-hidden="true">
                  🏆
                </span>

                {totalTournaments}
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
          ) : totalTournaments === 0 && !normalizedSearch ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-white/[0.08] dark:bg-white/[0.015] sm:rounded-[2rem] sm:p-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl dark:border-white/[0.06] dark:bg-white/[0.025]">
                🏟️
              </div>

              <p className="mt-5 text-xs font-medium text-slate-500 sm:text-sm">
                No hay torneos activos
                disponibles.
              </p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-white/[0.08] dark:bg-white/[0.015] sm:rounded-[2rem] sm:p-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl dark:border-white/[0.06] dark:bg-white/[0.025]">
                🔍
              </div>

              <p className="mt-5 text-xs font-medium text-slate-500 sm:text-sm">
                {`Ningún torneo coincide con "${searchQuery}".`}
              </p>
            </div>
          ) : (
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3.5 lg:grid-cols-2 lg:gap-6">
              {tournaments.map(
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
                    />
                  );
                }
              )}
            </div>
          )}

          {pageCount > 1 && (
            <nav
              className="mt-6 flex items-center justify-center gap-3"
              aria-label="Paginación de torneos"
            >
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || isLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.1] dark:text-slate-200 dark:hover:bg-white/[0.06]"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
                Página {page} de {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page >= pageCount || isLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.1] dark:text-slate-200 dark:hover:bg-white/[0.06]"
              >
                Siguiente
              </button>
            </nav>
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
