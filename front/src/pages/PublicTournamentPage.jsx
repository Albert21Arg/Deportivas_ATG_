import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import {
  EXPIRED_CLASS,
  isLogoHidden,
  isTeamExpired,
  PLAYER_EXPIRED_CLASS,
} from '../utils/team-expiry.js';

import AnnouncementModal from '../components/AnnouncementModal.jsx';
import CompetitionOverview from '../components/CompetitionOverview.jsx';
import FutbolIcon from '../components/FutbolIcon.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import GoalkeepersTable from '../components/GoalkeepersTable.jsx';
import ScorersTable from '../components/ScorersTable.jsx';
import StandingsTable from '../components/StandingsTable.jsx';
import TeamDetailModal from '../components/TeamDetailModal.jsx';

function dateValue(value) {
  return String(value).slice(0, 10);
}

function formatTime(value) {
  const [hours, minutes] = String(value).split(':').map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .toLowerCase();
}

function formatDate(value) {
  const [year, month, day] = dateValue(value).split('-').map(Number);

  const formatted = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));

  return formatted
    .replace(',', '')
    .replace(/ de /, ' ')
    .replace(/ de /, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

/*
|--------------------------------------------------------------------------
| Ordenar partidos por fecha y hora
|--------------------------------------------------------------------------
*/

// direction: 'asc' para "Próximos partidos" (lo más próximo primero),
// 'desc' para "Historial de partidos" (lo que acaba de finalizar primero,
// de la fecha más reciente a la más antigua).
function groupMatchesByDate(matches, direction = 'asc') {
  const groups = new Map();

  matches.forEach((match) => {
    const key = dateValue(match.date);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(match);
  });

  const sign = direction === 'desc' ? -1 : 1;

  return [...groups.entries()]
    .map(([date, dateMatches]) => [
      date,
      [...dateMatches].sort((left, right) =>
        sign * String(left.time).localeCompare(String(right.time))
      ),
    ])
    .sort(([left], [right]) => sign * left.localeCompare(right));
}

/*
|--------------------------------------------------------------------------
| Logo
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
      alt={expired ? '' : `Escudo de ${team.name}`}
    />
  );
}

/*
|--------------------------------------------------------------------------
| Forma reciente
|--------------------------------------------------------------------------
*/

const formStyles = {
  G: 'bg-emerald-500 text-slate-950',
  E: 'bg-amber-400 text-slate-950',
  P: 'bg-red-500 text-white',
};

function RecentForm({ results = [] }) {
  if (results.length === 0) {
    return (
      <p className="mt-2 text-[10px] text-slate-500 sm:mt-3 sm:text-xs">
        Sin partidos finalizados.
      </p>
    );
  }

  return (
    <div
      className="mt-2 flex justify-center gap-1 sm:mt-3 sm:gap-2"
      aria-label={`Últimos resultados: ${results.join(', ')}`}
    >
      {results.map((result, index) => (
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black sm:h-7 sm:w-7 sm:text-xs ${formStyles[result]}`}
          key={`${result}-${index}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Próximos partidos
|--------------------------------------------------------------------------
*/

function MatchRow({ match, onClick }) {
  const statusLabel =
    match.status === 'STARTED'
      ? 'En vivo'
      : match.status === 'POSTPONED'
        ? 'Aplazado'
        : 'Programado';

  return (
    <button
      className="
        group flex w-full min-w-0 items-center justify-between gap-2
        border-b border-slate-100
        py-3 text-left
        transition-colors duration-200
        hover:bg-slate-50
        last:border-0
        dark:border-white/[0.05]
        dark:hover:bg-white/[0.025]
        sm:gap-4 sm:py-4
      "
      type="button"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
          {formatTime(match.time)} · Colombia
        </p>

        <div className="mt-2 flex min-w-0 items-center sm:mt-2.5">
          <TeamLogo
            team={match.homeTeam}
            size="h-7 w-7 sm:h-9 sm:w-9"
          />

          <span className="ml-1.5 min-w-0 max-w-[30%] truncate text-xs font-semibold text-slate-700 dark:text-slate-300 sm:ml-2 sm:max-w-none sm:text-base">
            {match.homeTeam.name}
          </span>

          <span
            className={`
              mx-1 shrink-0 text-[10px] font-black
              sm:mx-2 sm:text-sm
              ${
                match.status === 'STARTED'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600'
              }
            `}
          >
            {match.status === 'STARTED'
              ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
              : 'vs'}
          </span>

          <span className="min-w-0 max-w-[30%] truncate text-xs font-semibold text-slate-700 dark:text-slate-300 sm:max-w-none sm:text-base">
            {match.awayTeam.name}
          </span>

          <TeamLogo
            team={match.awayTeam}
            size="h-7 w-7 sm:h-9 sm:w-9"
            className="ml-1.5 sm:ml-2"
          />
        </div>
      </div>

      <span
        className={`
          ml-1 shrink-0 rounded-full px-2 py-1
          text-[9px]
          sm:ml-4 sm:px-3 sm:text-xs
          ${
            match.status === 'STARTED'
              ? 'border border-emerald-400/20 bg-emerald-400/10 font-bold text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }
        `}
      >
        {match.status === 'STARTED'
          ? '● EN VIVO'
          : statusLabel}
      </span>
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| PARTIDO EN VIVO PRINCIPAL
|--------------------------------------------------------------------------
*/

function LiveMatchCard({ match, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="
        cursor-pointer
        group relative w-full overflow-hidden
        rounded-2xl
        border border-emerald-400/30
        bg-gradient-to-br
        from-emerald-500/[0.10]
        via-white
        to-slate-50
        dark:from-emerald-500/[0.12]
        dark:via-slate-900
        dark:to-slate-950
        p-4
        text-left
        shadow-[0_12px_45px_rgba(16,185,129,0.10)]
        transition-all duration-300
        hover:-translate-y-0.5
        hover:border-emerald-400/45
        hover:shadow-[0_16px_55px_rgba(16,185,129,0.16)]
        sm:p-6
      "
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-400/[0.08] blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)]" />

            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400 sm:text-xs">
              Partido en vivo
            </span>
          </div>

          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 sm:px-3 sm:text-xs">
            ● EN VIVO
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-8">
          <div className="flex w-[105px] min-w-0 flex-col items-center text-center sm:w-[180px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.035] sm:h-24 sm:w-24">
              <TeamLogo
                team={match.homeTeam}
                size="h-14 w-14 sm:h-20 sm:w-20"
              />
            </div>

            <p className="mt-2 w-full truncate text-xs font-black text-slate-900 dark:text-white sm:mt-3 sm:text-base">
              {match.homeTeam.name}
            </p>

            <span className="mt-2 text-3xl font-black leading-none text-emerald-600 dark:text-emerald-400 sm:text-5xl">
              {match.homeScore ?? 0}
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400 sm:text-xs">
              EN VIVO
            </span>

            <span className="mt-1 text-sm font-black text-slate-600 sm:text-lg">
              -
            </span>

            <span className="mt-2 hidden text-[9px] font-medium text-slate-500 sm:block sm:text-xs">
              Ver detalles
            </span>
          </div>

          <div className="flex w-[105px] min-w-0 flex-col items-center text-center sm:w-[180px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.035] sm:h-24 sm:w-24">
              <TeamLogo
                team={match.awayTeam}
                size="h-14 w-14 sm:h-20 sm:w-20"
              />
            </div>

            <p className="mt-2 w-full truncate text-xs font-black text-slate-900 dark:text-white sm:mt-3 sm:text-base">
              {match.awayTeam.name}
            </p>

            <span className="mt-2 text-3xl font-black leading-none text-emerald-600 dark:text-emerald-400 sm:text-5xl">
              {match.awayScore ?? 0}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[9px] text-slate-500 sm:mt-6 sm:text-xs">
          <span>{formatDate(match.date)}</span>
          <span>·</span>
          <span>{formatTime(match.time)} · Colombia</span>
        </div>

        {match.streamUrl && (
          <a
            href={match.streamUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="
              mt-4 flex items-center justify-center gap-2
              rounded-xl border border-red-400/30
              bg-red-500/10
              py-2.5
              text-[11px] font-black uppercase tracking-wider
              text-red-600 dark:text-red-300
              transition
              hover:bg-red-500/20
              sm:py-3 sm:text-xs
            "
          >
            ▶ Ver transmisión en vivo
          </a>
        )}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Historial
|--------------------------------------------------------------------------
*/

function HistoryMatchCard({ match, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full rounded-2xl border border-slate-200
        bg-white
        p-3 text-left shadow-lg shadow-black/5
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-xl
        active:scale-[0.98]
        dark:border-white/[0.06]
        dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-black
        dark:shadow-black/10
        dark:hover:border-white/[0.1]
        dark:hover:shadow-black/20
        sm:p-5
      "
    >
      <div className="mb-3 text-center sm:mb-4">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
          {formatDate(match.date)}
        </p>

        <p className="mt-1 text-[9px] text-slate-600 sm:text-xs">
          {formatTime(match.time)} · Colombia
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex w-[90px] min-w-0 flex-col items-center text-center sm:w-[150px]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.05] dark:bg-white/[0.025] sm:h-20 sm:w-20">
            <TeamLogo
              team={match.homeTeam}
              size="h-14 w-14 sm:h-20 sm:w-20"
            />
          </div>

          <p className="mt-2 w-full truncate text-[11px] font-bold text-slate-700 dark:text-slate-200 sm:text-sm">
            {match.homeTeam.name}
          </p>

          <span className="mt-1.5 text-2xl font-black text-slate-900 dark:text-slate-100 sm:mt-2 sm:text-3xl">
            {match.homeScore}
          </span>
        </div>

        <div className="flex w-10 shrink-0 flex-col items-center sm:w-16">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-black tracking-wider text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.025] sm:text-xs">
            FINAL
          </span>

          <span className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-400">
            -
          </span>
        </div>

        <div className="flex w-[90px] min-w-0 flex-col items-center text-center sm:w-[150px]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.05] dark:bg-white/[0.025] sm:h-20 sm:w-20">
            <TeamLogo
              team={match.awayTeam}
              size="h-14 w-14 sm:h-20 sm:w-20"
            />
          </div>

          <p className="mt-2 w-full truncate text-[11px] font-bold text-slate-700 dark:text-slate-200 sm:text-sm">
            {match.awayTeam.name}
          </p>

          <span className="mt-1.5 text-2xl font-black text-slate-900 dark:text-slate-100 sm:mt-2 sm:text-3xl">
            {match.awayScore}
          </span>
        </div>
      </div>
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| Ícono de evento
|--------------------------------------------------------------------------
*/

function EventIcon({ type }) {
  if (type === 'GOAL') {
    return <span className="text-emerald-400">⚽</span>;
  }

  if (type === 'OWN_GOAL') {
    return <FutbolIcon className="h-3.5 w-3.5 text-red-500" />;
  }

  if (type === 'YELLOW_CARD') {
    return <span className="text-amber-400">🟨</span>;
  }

  if (type === 'BLUE_CARD') {
    return <span className="text-blue-400">🟦</span>;
  }

  return <span className="text-red-400">🟥</span>;
}

/*
|--------------------------------------------------------------------------
| Modal detalle
|--------------------------------------------------------------------------
*/

function MatchDetailModal({
  match,
  recentFormByTeam,
  onClose,
}) {
  const eventsContainerRef = useRef(null);

  useEffect(() => {
    if (!match || match.status !== 'STARTED') return;

    const container = eventsContainerRef.current;

    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [match, match?.events?.length]);

  if (!match) return null;

  return (
    <div
      className="
        fixed inset-0 z-[60]
        flex items-end justify-center
        bg-slate-950/80
        px-2 py-2
        sm:items-center sm:px-5 sm:py-8
      "
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="
          max-h-[94vh] w-full max-w-lg
          overflow-y-auto
          rounded-2xl
          border border-slate-200
          bg-white
          shadow-2xl shadow-black/10
          dark:border-slate-700
          dark:bg-slate-900
          dark:shadow-black/40
          sm:max-h-[92vh]
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="
            flex items-start justify-between gap-3
            border-b border-slate-200
            px-3 py-3
            dark:border-slate-800
            sm:px-6 sm:py-5
          "
        >
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 sm:text-xs">
              Detalle del partido
            </p>

            <h2
              className="mt-1.5 text-sm font-bold leading-snug sm:mt-2 sm:text-xl"
              id="match-detail-title"
            >
              {formatDate(match.date)}
              <span className="text-slate-500"> · </span>
              {formatTime(match.time)}
            </h2>
          </div>

          <button
            className="
              flex h-8 w-8 shrink-0
              items-center justify-center
              rounded-full
              text-lg text-slate-500
              hover:bg-slate-100 hover:text-slate-900
              dark:text-slate-400
              dark:hover:bg-slate-800 dark:hover:text-white
              sm:h-9 sm:w-9 sm:text-xl
            "
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        </div>

        <div
          className="
            flex items-start justify-center
            px-1 py-5
            sm:px-6 sm:py-7
          "
        >
          <div className="w-[120px] min-w-0 text-center sm:w-[165px]">
            <TeamLogo
              team={match.homeTeam}
              size="h-24 w-24 sm:h-32 sm:w-32"
              className="mx-auto"
            />

            <p className="mt-2 break-words text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 sm:mt-3 sm:text-base">
              {match.homeTeam.name}
            </p>

            <p
              className={`
                mt-2 text-3xl font-black leading-none
                sm:mt-3 sm:text-5xl
                ${
                  match.status === 'STARTED'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-slate-100'
                }
              `}
            >
              {match.homeScore ?? 0}
            </p>

            <RecentForm
              results={recentFormByTeam[match.homeTeam.id]}
            />
          </div>

          <div className="flex items-center justify-center px-3 pt-10 sm:px-6 sm:pt-14">
            <div className="relative flex h-14 w-14 items-center justify-center sm:h-[72px] sm:w-[72px]">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />
              <div className="absolute inset-0 rounded-full border border-amber-400/30 shadow-[0_0_25px_rgba(245,158,11,0.18)]" />

              <div
                className="
                  relative flex h-11 w-11 items-center justify-center
                  rounded-full
                  border border-amber-300/70
                  bg-gradient-to-br from-slate-700 via-slate-950 to-black
                  shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_5px_18px_rgba(0,0,0,0.65)]
                  sm:h-14 sm:w-14
                "
              >
                <div className="absolute left-2 right-2 top-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                <span
                  className="
                    relative
                    bg-gradient-to-b from-yellow-100 via-amber-400 to-orange-500
                    bg-clip-text
                    text-sm font-black italic tracking-tight
                    text-transparent
                    drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
                    sm:text-xl
                  "
                >
                  VS
                </span>
              </div>
            </div>
          </div>

          <div className="w-[120px] min-w-0 text-center sm:w-[165px]">
            <TeamLogo
              team={match.awayTeam}
              size="h-24 w-24 sm:h-32 sm:w-32"
              className="mx-auto"
            />

            <p className="mt-2 break-words text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 sm:mt-3 sm:text-base">
              {match.awayTeam.name}
            </p>

            <p
              className={`
                mt-2 text-3xl font-black leading-none
                sm:mt-3 sm:text-5xl
                ${
                  match.status === 'STARTED'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-900 dark:text-slate-100'
                }
              `}
            >
              {match.awayScore ?? 0}
            </p>

            <RecentForm
              results={recentFormByTeam[match.awayTeam.id]}
            />
          </div>
        </div>

        {match.status === 'STARTED' && match.streamUrl && (
          <div className="px-3 pb-4 sm:px-6 sm:pb-6">
            <a
              href={match.streamUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 py-2.5 text-[11px] font-black uppercase tracking-wider text-red-600 transition hover:bg-red-500/20 dark:text-red-300 sm:py-3 sm:text-xs"
            >
              ▶ Ver transmisión en vivo
            </a>
          </div>
        )}

        {(match.status === 'STARTED' || match.status === 'FINISHED') && (
          <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
            <div className="mb-3 flex items-center justify-between">
              {match.status === 'STARTED' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 sm:gap-2 sm:text-xs">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                  EN VIVO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 sm:gap-2 sm:text-xs">
                  Final del partido
                </span>
              )}

              <span className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </span>
            </div>

            <div
              ref={eventsContainerRef}
              className="
                scroll-invisible
                max-h-[180px]
                space-y-2
                overflow-y-auto
                pr-1
              "
            >
              {(match.events ?? []).length === 0 && (
                <p className="py-2 text-center text-xs text-slate-500 dark:text-slate-500">
                  Sin eventos registrados.
                </p>
              )}

              {(match.events ?? []).map((event) => {
                const isHomeTeam =
                  String(event.team?.id) === String(match.homeTeam?.id);

                const isAwayTeam =
                  String(event.team?.id) === String(match.awayTeam?.id);

                return (
                  <div
                    className={`
                      flex w-full items-center gap-2
                      text-xs text-slate-700 dark:text-slate-300
                      sm:text-sm
                      ${
                        isHomeTeam
                          ? 'justify-start text-left'
                          : isAwayTeam
                            ? 'justify-end text-right'
                            : 'justify-center'
                      }
                    `}
                    key={event.id}
                  >
                    {isHomeTeam ? (
                      <>
                        <EventIcon type={event.type} />

                        <span>
                          {event.minute != null
                            ? `${event.minute}'`
                            : '—'}
                        </span>

                        <span
                          className={`max-w-[140px] truncate font-semibold sm:max-w-[220px] ${
                            event.player
                              ? event.player.showName === false
                                ? PLAYER_EXPIRED_CLASS
                                : ''
                              : isTeamExpired(event.team)
                                ? EXPIRED_CLASS
                                : ''
                          }`}
                        >
                          {event.player?.name ?? event.team.name}
                          {event.type === 'OWN_GOAL' &&
                            ' (autogol)'}
                        </span>

                        <span className="hidden text-xs text-slate-500 sm:inline">
                          {event.team.name}
                        </span>
                      </>
                    ) : isAwayTeam ? (
                      <>
                        <span className="hidden text-xs text-slate-500 sm:inline">
                          {event.team.name}
                        </span>

                        <span
                          className={`max-w-[140px] truncate font-semibold sm:max-w-[220px] ${
                            event.player
                              ? event.player.showName === false
                                ? PLAYER_EXPIRED_CLASS
                                : ''
                              : isTeamExpired(event.team)
                                ? EXPIRED_CLASS
                                : ''
                          }`}
                        >
                          {event.player?.name ?? event.team.name}
                          {event.type === 'OWN_GOAL' &&
                            ' (autogol)'}
                        </span>

                        <span>
                          {event.minute != null
                            ? `${event.minute}'`
                            : '—'}
                        </span>

                        <EventIcon type={event.type} />
                      </>
                    ) : (
                      <>
                        <EventIcon type={event.type} />

                        <span>
                          {event.minute != null
                            ? `${event.minute}'`
                            : '—'}
                        </span>

                        <span
                          className={`truncate font-semibold ${
                            event.player
                              ? event.player.showName === false
                                ? PLAYER_EXPIRED_CLASS
                                : ''
                              : isTeamExpired(event.team)
                                ? EXPIRED_CLASS
                                : ''
                          }`}
                        >
                          {event.player?.name ?? event.team.name}
                          {event.type === 'OWN_GOAL' &&
                            ' (autogol)'}
                        </span>

                        <span className="hidden text-xs text-slate-500 sm:inline">
                          {event.team.name}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className="
            border-t border-slate-200
            px-3 py-3
            text-center text-[9px]
            leading-relaxed text-slate-500
            dark:border-slate-800
            sm:px-6 sm:py-4 sm:text-xs
          "
        >
          Últimos 3 partidos:{' '}
          <span className="text-emerald-600 dark:text-emerald-300">G</span> ganado ·{' '}
          <span className="text-amber-600 dark:text-amber-300">E</span> empatado ·{' '}
          <span className="text-red-600 dark:text-red-300">P</span> perdido
        </div>
      </section>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HEADER DE SECCIÓN
|--------------------------------------------------------------------------
*/

const sectionConfig = {
  standings: {
    icon: '🏆',
    eyebrow: 'Clasificación',
    accent: 'emerald',
    title: 'Tabla de posiciones',
  },

  groups: {
    icon: '🎯',
    eyebrow: 'Fase de grupos',
    accent: 'emerald',
    title: 'Tabla de posiciones por bombo',
  },

  bracket: {
    icon: '⚔️',
    eyebrow: 'Eliminación',
    accent: 'violet',
    title: 'Llaves del torneo',
  },

  upcoming: {
    icon: '📅',
    eyebrow: 'Calendario',
    accent: 'cyan',
    title: 'Próximos partidos',
  },

  scorers: {
    icon: '⚽',
    eyebrow: 'Goleadores',
    accent: 'amber',
    title: 'Goleadores',
  },

  goalkeepers: {
    icon: '🧤',
    eyebrow: 'Valla menos vencida',
    accent: 'cyan',
    title: 'Valla menos vencida',
  },

  cards: {
    icon: '🟨',
    eyebrow: 'Disciplina',
    accent: 'rose',
    title: 'Tarjetas',
  },

  history: {
    icon: '🕘',
    eyebrow: 'Resultados',
    accent: 'blue',
    title: 'Historial de partidos',
  },
};

function SectionCard({
  section,
  open,
  onToggle,
  children,
  contentId,
  className = '',
}) {
  const config = sectionConfig[section];

  const accentClasses = {
    emerald: {
      border: 'border-emerald-400/20',
      glow: 'bg-emerald-400/[0.06]',
      icon: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300',
      dot: 'bg-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-300',
    },

    cyan: {
      border: 'border-cyan-400/20',
      glow: 'bg-cyan-400/[0.045]',
      icon: 'border-cyan-400/20 bg-cyan-400/10 text-slate-900 dark:text-cyan-300',
      dot: 'bg-cyan-400',
      text: 'text-slate-900 dark:text-cyan-300',
    },

    amber: {
      border: 'border-amber-400/20',
      glow: 'bg-amber-400/[0.045]',
      icon: 'border-amber-400/20 bg-amber-400/10 text-amber-600 dark:text-amber-300',
      dot: 'bg-amber-400',
      text: 'text-amber-600 dark:text-amber-300',
    },

    rose: {
      border: 'border-rose-400/20',
      glow: 'bg-rose-400/[0.045]',
      icon: 'border-rose-400/20 bg-rose-400/10 text-rose-600 dark:text-rose-300',
      dot: 'bg-rose-400',
      text: 'text-rose-600 dark:text-rose-300',
    },

    blue: {
      border: 'border-blue-400/20',
      glow: 'bg-blue-400/[0.045]',
      icon: 'border-blue-400/20 bg-blue-400/10 text-blue-600 dark:text-blue-300',
      dot: 'bg-blue-400',
      text: 'text-blue-600 dark:text-blue-300',
    },

    violet: {
      border: 'border-violet-400/20',
      glow: 'bg-violet-400/[0.045]',
      icon: 'border-violet-400/20 bg-violet-400/10 text-violet-600 dark:text-violet-300',
      dot: 'bg-violet-400',
      text: 'text-violet-600 dark:text-violet-300',
    },
  };

  const colors = accentClasses[config.accent];

  return (
    <div
      className={`
        group relative min-w-0 w-full overflow-hidden
        rounded-2xl
        border
        bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-[#080b11]
        shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.18)]
        transition-all duration-300
        ${open ? colors.border : 'border-slate-200 dark:border-white/[0.055]'}
        ${open ? 'shadow-[0_12px_45px_rgba(15,23,42,0.10)] dark:shadow-[0_12px_45px_rgba(0,0,0,0.28)]' : ''}
        ${className}
      `}
    >
      <div
        className={`
          pointer-events-none absolute inset-x-0 top-0 h-28
          bg-gradient-to-b from-transparent to-transparent
          opacity-0 transition-opacity duration-300
          ${open ? `${colors.glow} opacity-100` : ''}
        `}
      />

      <button
        type="button"
        onClick={onToggle}
        className="
          relative z-10
          flex w-full items-center
          justify-between gap-4
          px-3.5 py-3.5
          text-left
          sm:px-5 sm:py-4
          lg:px-6 lg:py-5
        "
        aria-expanded={open}
        aria-controls={contentId}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div
            className={`
              flex h-11 w-11 shrink-0
              items-center justify-center
              rounded-xl border
              text-lg
              shadow-inner
              transition-all duration-300
              sm:h-12 sm:w-12 sm:text-xl
              ${colors.icon}
              ${open ? 'scale-105 shadow-lg' : ''}
            `}
          >
            {config.icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`
                  h-1.5 w-1.5 shrink-0 rounded-full
                  ${colors.dot}
                  ${open ? 'animate-pulse' : ''}
                `}
              />

              <span
                className={`
                  text-[8px] font-black uppercase
                  tracking-[0.18em]
                  sm:text-[10px]
                  ${colors.text}
                `}
              >
                {config.eyebrow}
              </span>

              {open && (
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] sm:inline-flex">
                  Abierto
                </span>
              )}
            </div>

            <h2 className="mt-1 text-base font-black tracking-tight text-slate-900 dark:text-white sm:mt-1.5 sm:text-xl lg:text-2xl">
              {config.title}
            </h2>
          </div>
        </div>

        <div
          className={`
            flex h-9 w-9 shrink-0
            items-center justify-center
            rounded-full
            border border-slate-200
            bg-slate-50
            text-slate-500
            transition-all duration-300
            dark:border-white/[0.07]
            dark:bg-white/[0.025]
            sm:h-10 sm:w-10
            ${
              open
                ? `rotate-180 ${colors.text} border-slate-300 dark:border-white/[0.12]`
                : ''
            }
          `}
          aria-hidden="true"
        >
          <span className="text-xs">⌄</span>
        </div>
      </button>

      {open && (
        <div
          id={contentId}
          className="
            relative z-10
            min-w-0 max-w-full
            overflow-hidden
            border-t border-slate-200
            bg-slate-50
            dark:border-white/[0.055]
            dark:bg-black/[0.08]
          "
        >
          {children}
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Clases responsive para ScorersTable
|--------------------------------------------------------------------------
*/

const responsiveScorersTableClass = `
  min-w-0
  max-w-full
  overflow-x-hidden

  [&_table]:!w-full
  [&_table]:!min-w-0
  [&_table]:!max-w-full
  [&_table]:table-fixed

  [&_thead]:w-full
  [&_tbody]:w-full

  [&_tr]:w-full
  [&_th]:min-w-0
  [&_td]:min-w-0

  [&_th]:overflow-hidden
  [&_td]:overflow-hidden

  [&_th]:text-ellipsis
  [&_td]:text-ellipsis

  [&_th]:whitespace-nowrap

  [&_td]:break-words

  [&_img]:max-w-full

  [&_*]:max-w-full

  sm:[&_table]:table-auto
  sm:[&_table]:!min-w-0
`;

/*
|--------------------------------------------------------------------------
| Página
|--------------------------------------------------------------------------
*/

export default function PublicTournamentPage() {
  const { id } = useParams();
  const { notify } = useNotifications();

  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);

  const [openSection, setOpenSection] = useState(null);

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const historyLoadedRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | NUEVO
  |--------------------------------------------------------------------------
  | Si Tarjetas está abierta, el modal de jugador queda completamente
  | bloqueado desde esta página.
  |--------------------------------------------------------------------------
  */

  const cardsSectionOpen = openSection === 'cards';

  useEffect(() => {
    if (cardsSectionOpen && selectedTeam) {
      setSelectedTeam(null);
    }
  }, [cardsSectionOpen, selectedTeam]);

  const loadHistory = useCallback(async () => {
    try {
      const { data: response } = await api.get(
        `/public/tournaments/${id}/history`
      );

      setHistory(response.data.matches);
      historyLoadedRef.current = true;
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }, [id, notify]);

  const loadTournament = useCallback(async () => {
    try {
      const { data: response } = await api.get(
        `/public/tournaments/${id}`
      );

      setData(response.data);

      if (historyLoadedRef.current) {
        loadHistory();
      }
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsLoading(false);
    }
  }, [id, notify, loadHistory]);

  useEffect(() => {
    loadTournament();

    const stream = new EventSource(
      `${api.defaults.baseURL}/public/tournaments/${id}/events`
    );

    stream.addEventListener(
      'match.updated',
      loadTournament
    );

    // Sondeo de respaldo cada 10s: el stream en tiempo real cubre la
    // mayoría de los casos, pero esto asegura que la página igual se
    // ponga al día si la conexión se cae en silencio.
    const interval = setInterval(loadTournament, 10000);

    return () => {
      stream.close();
      clearInterval(interval);
    };
  }, [id, loadTournament]);

  useEffect(() => {
    if (!selectedMatch || !data) return;

    const updatedMatch = [
      ...data.upcomingMatches,
      ...(data.ties ?? []).flatMap(
        (tie) => tie.matches ?? []
      ),
    ].find(
      (match) => match.id === selectedMatch.id
    );

    if (updatedMatch) {
      setSelectedMatch(updatedMatch);
    }
  }, [data, selectedMatch]);

  async function toggleHistory() {
    if (
      openSection !== 'history' &&
      history.length === 0
    ) {
      await loadHistory();
    }

    setOpenSection((current) =>
      current === 'history'
        ? null
        : 'history'
    );
  }

  function toggleStandings() {
    setOpenSection((current) =>
      current === 'standings'
        ? null
        : 'standings'
    );
  }

  function toggleUpcoming() {
    setOpenSection((current) =>
      current === 'upcoming'
        ? null
        : 'upcoming'
    );
  }

  function toggleScorers() {
    setOpenSection((current) =>
      current === 'scorers'
        ? null
        : 'scorers'
    );
  }

  function toggleGoalkeepers() {
    setOpenSection((current) =>
      current === 'goalkeepers'
        ? null
        : 'goalkeepers'
    );
  }

  function toggleCards() {
    /*
     * IMPORTANTE:
     * Al entrar a Tarjetas se elimina cualquier jugador seleccionado.
     * De esta forma nunca queda abierto el modal del jugador.
     */
    setSelectedTeam(null);

    setOpenSection((current) =>
      current === 'cards'
        ? null
        : 'cards'
    );
  }

  if (isLoading) {
    return (
      <main
        className="
          flex min-h-screen
          items-center justify-center
          bg-slate-50
          dark:bg-slate-950
          px-4
          text-center text-sm
          text-slate-500
          dark:text-slate-400
        "
      >
        Cargando torneo...
      </main>
    );
  }

  if (!data) {
    return (
      <main
        className="
          flex min-h-screen
          items-center justify-center
          bg-slate-50
          dark:bg-slate-950
          px-4
          text-center text-sm
          text-slate-500
          dark:text-slate-400
        "
      >
        No se encontró el torneo.
      </main>
    );
  }

  const competitionMode =
    data.tournament.mode ?? 'ROUND_ROBIN';

  const liveMatch =
    data.upcomingMatches?.find(
      (match) => match.status === 'STARTED'
    ) ??
    (data.ties ?? [])
      .flatMap((tie) => tie.matches ?? [])
      .find((match) => match.status === 'STARTED');

  return (
    <main
      className="
        lm-ready
        min-h-screen
        w-full
        max-w-full
        overflow-x-hidden
        bg-slate-50
        dark:bg-[#05070b]
        px-2.5 pb-8 pt-20
        text-slate-900
        dark:text-slate-100
        sm:px-6 sm:pb-12 sm:pt-24
      "
    >
      <AnnouncementModal tournamentId={id} />
      <PublicNavbar />

      <header className="mx-auto max-w-7xl min-w-0">
        <Link
          className="
            inline-flex items-center gap-1
            rounded-full
            border border-emerald-400/10
            bg-emerald-400/[0.04]
            px-3 py-1.5
            text-[11px]
            font-semibold
            text-emerald-600 dark:text-emerald-400
            transition-colors
            hover:bg-emerald-400/[0.08]
            hover:text-emerald-700 dark:hover:text-emerald-300
            sm:text-sm
          "
          to="/"
        >
          ← Todos los torneos
        </Link>

        <Link className="hidden" to="/login">
          Iniciar sesión
        </Link>
      </header>

      <section
        className="
          relative mx-auto max-w-7xl min-w-0
          py-6
          sm:py-12
        "
      >
        <div className="pointer-events-none absolute left-0 top-0 -z-0 h-40 w-40 rounded-full bg-emerald-500/[0.06] blur-3xl" />

        <div className="relative min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 sm:text-sm">
              Torneo activo
            </p>
          </div>

          <h1
            className="
              break-words
              text-2xl
              font-black
              tracking-tight
              text-slate-900
              dark:text-white
              sm:text-5xl
            "
          >
            {data.tournament.name}
          </h1>

          <p
            className="
              mt-2
              max-w-2xl
              text-xs
              leading-relaxed
              text-slate-500
              dark:text-slate-400
              sm:mt-4 sm:text-base
            "
          >
            {data.tournament.description ||
              'Resultados, calendario y tabla de posiciones.'}
          </p>
        </div>
      </section>

      <section
        className="
          mx-auto
          grid
          w-full
          max-w-7xl
          min-w-0
          grid-cols-1
          gap-3
          sm:gap-4
          lg:gap-5
        "
      >
        {liveMatch && (
          <LiveMatchCard
            match={liveMatch}
            onClick={() => setSelectedMatch(liveMatch)}
          />
        )}

        {competitionMode === 'ROUND_ROBIN' ? (
          <SectionCard
            section="standings"
            open={openSection === 'standings'}
            onToggle={toggleStandings}
            contentId="standings-content"
          >
            <div id="standings-content" className="w-full min-w-0">
              <div className="scroll-invisible hidden max-h-[31rem] w-full overflow-y-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-white/[0.05] dark:bg-slate-950/95">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                      <th className="w-20 px-4 py-3.5 text-center">
                        Pos
                      </th>

                      <th className="px-4 py-3.5 text-left">
                        Equipo
                      </th>

                      <th className="px-2 py-3.5 text-center">
                        PJ
                      </th>

                      <th className="px-2 py-3.5 text-center text-amber-400">
                        🟨
                      </th>

                      <th className="px-2 py-3.5 text-center text-red-400">
                        🟥
                      </th>

                      <th className="px-2 py-3.5 text-center text-blue-400">
                        🟦
                      </th>

                      <th className="px-2 py-3.5 text-center">
                        GF
                      </th>

                      <th className="px-2 py-3.5 text-center">
                        GC
                      </th>

                      <th className="px-2 py-3.5 text-center">
                        DG
                      </th>

                      <th className="px-3 py-3.5 text-center text-emerald-500">
                        PTS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {data.standings.map((row) => {
                      const isLeader = row.position === 1;
                      const isSecond = row.position === 2;
                      const isThird = row.position === 3;
                      const expired = isTeamExpired(row.team);

                      return (
                        <tr
                          key={row.team.id}
                          className={`
                            group
                            transition-colors
                            ${
                              isLeader
                                ? 'border-l-2 border-amber-400 bg-amber-400/[0.06]'
                                : isSecond
                                  ? 'border-l-2 border-slate-400/40 bg-slate-900/[0.02] dark:bg-white/[0.015]'
                                  : 'hover:bg-slate-50 dark:hover:bg-white/[0.025]'
                            }
                          `}
                        >
                          <td className="px-4 py-3.5 text-center">
                            {isLeader || isSecond || isThird ? (
                              <span
                                className={`
                                  mx-auto flex h-8 w-8
                                  items-center justify-center
                                  rounded-lg
                                  text-[11px] font-black
                                  shadow-lg
                                  ${
                                    isLeader
                                      ? 'bg-amber-400 text-slate-950 shadow-amber-400/10'
                                      : isSecond
                                        ? 'bg-slate-300 text-slate-900'
                                        : 'bg-orange-400 text-slate-950'
                                  }
                                `}
                              >
                                {row.position}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-slate-600">
                                {row.position}
                              </span>
                            )}
                          </td>

                          <td className="relative px-4 py-3.5">
                            <div
                              className="flex min-w-0 cursor-pointer items-center gap-3"
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                setSelectedTeam({
                                  row,
                                  recentForm:
                                    data.recentFormByTeam?.[
                                      row.team.id
                                    ] ?? [],
                                })
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === 'Enter' ||
                                  event.key === ' '
                                ) {
                                  event.preventDefault();

                                  setSelectedTeam({
                                    row,
                                    recentForm:
                                      data.recentFormByTeam?.[
                                        row.team.id
                                      ] ?? [],
                                  });
                                }
                              }}
                            >
                              <div className="relative shrink-0">
                                <TeamLogo
                                  team={row.team}
                                  size="h-11 w-11"
                                />

                                {isLeader && (
                                  <span
                                    className="
                                      absolute -right-2 -top-3
                                      z-10 text-base
                                      leading-none
                                      drop-shadow-[0_0_7px_rgba(251,191,36,0.8)]
                                    "
                                    aria-label="Primer lugar"
                                  >
                                    👑
                                  </span>
                                )}

                                {isSecond && (
                                  <span
                                    className="
                                      absolute -right-2 -top-3
                                      z-10 text-sm
                                      leading-none
                                    "
                                    aria-label="Segundo lugar"
                                  >
                                    🥈
                                  </span>
                                )}
                              </div>

                              <span
                                className={`
                                  min-w-0 truncate font-semibold
                                  ${
                                    isLeader
                                      ? 'text-amber-600 dark:text-amber-100'
                                      : isSecond
                                        ? 'text-slate-700 dark:text-slate-200'
                                        : 'text-slate-700 dark:text-slate-300'
                                  }
                                `}
                              >
                                {row.team.name}
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-3.5 text-center text-slate-500 dark:text-slate-500">
                            {row.played}
                          </td>

                          <td
                            className={`px-2 py-3.5 text-center text-amber-600 dark:text-amber-300 ${
                              expired ? EXPIRED_CLASS : ''
                            }`}
                          >
                            {row.yellowCards}
                          </td>

                          <td
                            className={`px-2 py-3.5 text-center text-red-600 dark:text-red-300 ${
                              expired ? EXPIRED_CLASS : ''
                            }`}
                          >
                            {row.redCards}
                          </td>

                          <td
                            className={`px-2 py-3.5 text-center text-blue-600 dark:text-blue-300 ${
                              expired ? EXPIRED_CLASS : ''
                            }`}
                          >
                            {row.blueCards}
                          </td>

                          <td
                            className={`px-2 py-3.5 text-center text-slate-500 dark:text-slate-500 ${
                              expired ? EXPIRED_CLASS : ''
                            }`}
                          >
                            {row.goalsFor}
                          </td>

                          <td className="px-2 py-3.5 text-center text-slate-500 dark:text-slate-500">
                            {row.goalsAgainst}
                          </td>

                          <td
                            className={`
                              px-2 py-3.5 text-center font-semibold
                              ${
                                row.goalDifference > 0
                                  ? isLeader
                                    ? 'text-amber-600 dark:text-amber-300'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                  : row.goalDifference < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-slate-500'
                              }
                              ${
                                expired ? EXPIRED_CLASS : ''
                              }
                            `}
                          >
                            {row.goalDifference > 0
                              ? `+${row.goalDifference}`
                              : row.goalDifference}
                          </td>

                          <td
                            className={`
                              px-3 py-3.5
                              text-center
                              text-sm
                              font-black
                              ${
                                isLeader
                                  ? 'text-amber-600 dark:text-amber-300'
                                  : isSecond
                                    ? 'text-slate-800 dark:text-slate-100'
                                    : 'text-emerald-600 dark:text-emerald-300'
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
              </div>

              <div className="scroll-invisible max-h-[25rem] w-full overflow-y-auto sm:hidden">
                <table className="w-full table-fixed text-xs">
                  <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-white/[0.05] dark:bg-slate-900/95">
                    <tr className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">
                      <th className="w-[38px] px-0.5 py-2.5 text-center">
                        Pos
                      </th>

                      <th className="px-1 py-2.5 text-left">
                        Equipo
                      </th>

                      <th className="w-[38px] px-0.5 py-2.5 text-center">
                        PJ
                      </th>

                      <th className="w-[44px] px-0.5 py-2.5 text-center">
                        DG
                      </th>

                      <th className="w-[44px] px-0.5 py-2.5 text-center text-emerald-500">
                        PTS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.035]">
                    {data.standings.map((row) => {
                      const isLeader = row.position === 1;
                      const isSecond = row.position === 2;
                      const isThird = row.position === 3;
                      const expired = isTeamExpired(row.team);

                      return (
                        <tr
                          key={row.team.id}
                          className={`
                            group
                            outline-none
                            transition-colors
                            ${
                              isLeader
                                ? 'border-l-2 border-amber-400 bg-amber-400/[0.045]'
                                : isSecond
                                  ? 'border-l-2 border-slate-400/40 bg-slate-900/[0.02] dark:bg-white/[0.015]'
                                  : ''
                            }
                          `}
                        >
                          <td className="px-0.5 py-3 text-center">
                            {isLeader || isSecond || isThird ? (
                              <span
                                className={`
                                  mx-auto flex h-6 w-6
                                  items-center justify-center
                                  rounded-md
                                  text-[9px] font-black
                                  ${
                                    isLeader
                                      ? 'bg-amber-400 text-slate-950'
                                      : isSecond
                                        ? 'bg-slate-300 text-slate-900'
                                        : 'bg-orange-400 text-slate-950'
                                  }
                                `}
                              >
                                {row.position}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-600">
                                {row.position}
                              </span>
                            )}
                          </td>

                          <td className="relative min-w-0 px-1 py-3">
                            <div
                              className="flex min-w-0 cursor-pointer items-center gap-2"
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                setSelectedTeam({
                                  row,
                                  recentForm:
                                    data.recentFormByTeam?.[
                                      row.team.id
                                    ] ?? [],
                                })
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === 'Enter' ||
                                  event.key === ' '
                                ) {
                                  event.preventDefault();

                                  setSelectedTeam({
                                    row,
                                    recentForm:
                                      data.recentFormByTeam?.[
                                        row.team.id
                                      ] ?? [],
                                  });
                                }
                              }}
                            >
                              <div className="relative shrink-0">
                                <TeamLogo
                                  team={row.team}
                                  size="h-9 w-9"
                                />

                                {isLeader && (
                                  <span
                                    className="absolute -right-2 -top-3 z-10 text-xs leading-none"
                                    aria-label="Primer lugar"
                                  >
                                    👑
                                  </span>
                                )}

                                {isSecond && (
                                  <span
                                    className="absolute -right-2 -top-3 z-10 text-xs leading-none"
                                    aria-label="Segundo lugar"
                                  >
                                    🥈
                                  </span>
                                )}
                              </div>

                              <span
                                className={`
                                  min-w-0 truncate
                                  text-[11px]
                                  font-semibold
                                  ${
                                    isLeader
                                      ? 'text-amber-600 dark:text-amber-100'
                                      : isSecond
                                        ? 'text-slate-700 dark:text-slate-200'
                                        : 'text-slate-700 dark:text-slate-300'
                                  }
                                `}
                              >
                                {row.team.name}
                              </span>
                            </div>
                          </td>

                          <td className="px-0.5 py-3 text-center text-[10px] font-medium text-slate-500 dark:text-slate-500">
                            {row.played}
                          </td>

                          <td
                            className={`
                              px-0.5 py-3
                              text-center
                              text-[10px]
                              font-semibold
                              ${
                                row.goalDifference > 0
                                  ? isLeader
                                    ? 'text-amber-600 dark:text-amber-300'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                  : row.goalDifference < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-slate-500'
                              }
                              ${
                                expired ? EXPIRED_CLASS : ''
                              }
                            `}
                          >
                            {row.goalDifference > 0
                              ? `+${row.goalDifference}`
                              : row.goalDifference}
                          </td>

                          <td
                            className={`
                              px-0.5 py-3
                              text-center
                              text-xs
                              font-black
                              ${
                                isLeader
                                  ? 'text-amber-600 dark:text-amber-300'
                                  : isSecond
                                    ? 'text-slate-800 dark:text-slate-100'
                                    : 'text-emerald-600 dark:text-emerald-300'
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
              </div>

              <div
                className="
                  flex flex-wrap
                  gap-x-3 gap-y-1
                  border-t border-slate-200
                  bg-slate-50
                  px-3 py-2.5
                  text-[9px]
                  text-slate-600
                  dark:border-white/[0.05]
                  dark:bg-slate-950/30
                  sm:px-5 sm:py-3 sm:text-[10px]
                "
              >
                <span>
                  <strong className="text-slate-500">PJ</strong>{' '}
                  Partidos
                </span>

                <span>
                  <strong className="text-slate-500">GF/GC</strong>{' '}
                  Goles
                </span>

                <span>
                  <strong className="text-slate-500">DG</strong>{' '}
                  Diferencia
                </span>

                <span>
                  <strong className="text-emerald-500">PTS</strong>{' '}
                  Puntos
                </span>
              </div>
            </div>
          </SectionCard>
        ) : competitionMode === 'GROUP_STAGE' ? (
          <SectionCard
            section="groups"
            open={openSection === 'standings'}
            onToggle={toggleStandings}
            contentId="pots-content"
          >
            <div
              id="pots-content"
              className="min-w-0 p-3 sm:p-5 lg:p-6"
            >
              <p className="mb-4 text-xs leading-5 text-slate-500">
                Compara a los equipos que comparten
                bombo usando lo que ya jugaron en su
                propio grupo, aunque no se enfrenten
                directamente entre ellos.
              </p>

              {!data.pots || data.pots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500 dark:border-white/[0.08]">
                  Los grupos aún no han sido generados.
                </p>
              ) : (
                <div className="scroll-invisible max-h-[31rem] w-full min-w-0 overflow-y-auto pr-1">
                  <div className="grid w-full min-w-0 grid-cols-1 gap-6">
                    {data.pots.map(({ pot, standings }) => (
                      <div
                        key={pot}
                        className="min-w-0 w-full"
                      >
                        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Bombo {pot}
                        </h3>

                        <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.05]">
                          <StandingsTable
                            standings={standings}
                            respectPaymentStatus
                            onSelectTeam={(row) =>
                              setSelectedTeam({
                                row,
                                recentForm:
                                  data.recentFormByTeam?.[
                                    row.team.id
                                  ] ?? [],
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            section="bracket"
            open={openSection === 'standings'}
            onToggle={toggleStandings}
            contentId="bracket-content"
          >
            <div
              id="bracket-content"
              className="w-full min-w-0 p-3 sm:p-5 lg:p-6"
            >
              <div className="scroll-invisible max-h-[38rem] w-full min-w-0 overflow-y-auto pr-1">
                <CompetitionOverview
                  mode={competitionMode}
                  groups={data.groups}
                  ties={data.ties}
                  championLabel={
                    data.tournament.championLabel
                  }
                  onSelectMatch={setSelectedMatch}
                />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Próximos partidos */}

        <SectionCard
          section="upcoming"
          open={openSection === 'upcoming'}
          onToggle={toggleUpcoming}
          contentId="upcoming-content"
        >
          <div
            id="upcoming-content"
            className="w-full min-w-0 p-3 sm:p-5"
          >
            <p className="mb-2 text-[10px] text-slate-500 sm:mb-3 sm:text-xs">
              Toca un partido para ver sus detalles.
            </p>

            <div className="scroll-invisible max-h-[25rem] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-white/[0.04] dark:bg-black/[0.12] sm:px-4">
              {data.upcomingMatches.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No hay próximos partidos.
                </p>
              ) : (
                <div className="space-y-4 py-2">
                  {groupMatchesByDate(
                    data.upcomingMatches
                  ).map(([date, matches]) => (
                    <section key={date} className="min-w-0">
                      <h3 className="mb-1.5 flex items-center gap-2 border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:border-white/[0.05] dark:text-emerald-300 sm:mb-2 sm:pb-2 sm:text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {formatDate(date)}
                      </h3>

                      <div className="min-w-0">
                        {matches.map((match) => (
                          <MatchRow
                            key={match.id}
                            match={match}
                            onClick={() =>
                              setSelectedMatch(match)
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Goleadores */}

        <SectionCard
          section="scorers"
          open={openSection === 'scorers'}
          onToggle={toggleScorers}
          contentId="scorers-content"
        >
          <div
            id="scorers-content"
            className="w-full min-w-0 max-w-full overflow-hidden p-2.5 sm:p-5"
          >
            <p className="mb-3 px-0.5 text-[10px] text-slate-500 sm:text-xs">
              Jugadores con más goles del torneo.
            </p>

            <div
              className={`
                ${responsiveScorersTableClass}
                scroll-invisible
                max-h-[452px]
                overflow-y-auto
                rounded-xl
                border border-slate-200 dark:border-white/[0.04]
                bg-slate-50 dark:bg-black/[0.12]
                p-1
                sm:p-2
              `}
            >
              <ScorersTable
                scorers={data.scorers}
                respectPaymentStatus
                blueCardEnabled={
                  data.tournament.blueCardEnabled
                }
              />
            </div>
          </div>
        </SectionCard>

        {/* Valla menos vencida */}

        <SectionCard
          section="goalkeepers"
          open={openSection === 'goalkeepers'}
          onToggle={toggleGoalkeepers}
          contentId="goalkeepers-content"
        >
          <div
            id="goalkeepers-content"
            className="w-full min-w-0 max-w-full overflow-hidden p-2.5 sm:p-5"
          >
            <p className="mb-3 px-0.5 text-[10px] text-slate-500 sm:text-xs">
              Arquero con menos goles recibidos.
            </p>

            <div
              className={`
                ${responsiveScorersTableClass}
                scroll-invisible
                max-h-[452px]
                overflow-y-auto
                rounded-xl
                border border-slate-200 dark:border-white/[0.04]
                bg-slate-50 dark:bg-black/[0.12]
                p-1
                sm:p-2
              `}
            >
              <GoalkeepersTable
                goalkeepers={data.goalkeepers}
                respectPaymentStatus
              />
            </div>
          </div>
        </SectionCard>

        {/* Tarjetas */}

        <SectionCard
          section="cards"
          open={openSection === 'cards'}
          onToggle={toggleCards}
          contentId="cards-content"
        >
          <div
            id="cards-content"
            className={`
              grid
              min-w-0
              w-full
              max-w-full
              grid-cols-1
              gap-3
              overflow-hidden
              p-2.5
              sm:p-5
              ${
                data.tournament.blueCardEnabled
                  ? 'lg:grid-cols-3 lg:gap-4'
                  : 'sm:grid-cols-2 sm:gap-4'
              }
            `}
          >
            {/* Amarillas */}

            <div
              className="
                min-w-0
                max-w-full
                overflow-hidden
                rounded-xl
                border border-amber-400/10
                bg-gradient-to-br from-amber-400/[0.035] to-transparent
              "
            >
              <div className="flex min-w-0 items-center justify-between gap-2 border-b border-amber-400/10 px-2.5 py-2.5 sm:px-3">
                <h3 className="min-w-0 truncate text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  🟨 Amarillas
                </h3>

                <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-0.5 text-[8px] font-bold text-amber-700 dark:text-amber-300">
                  DISCIPLINA
                </span>
              </div>

              <div
                className={`
                  ${responsiveScorersTableClass}
                  scroll-invisible
                  max-h-[452px]
                  overflow-y-auto
                  p-1
                  sm:p-2
                `}
              >
                <ScorersTable
                  scorers={data.cards.yellowCards}
                  emptyMessage="Todavía no hay amarillas registradas."
                  respectPaymentStatus
                  blueCardEnabled={
                    data.tournament.blueCardEnabled
                  }
                  valueKey="yellowCards"
                  valueLabel="Amarillas"
                  leaderTitle="Más amarillas"
                  leaderIcon="🥊"
                />
              </div>
            </div>

            {/* Azules */}

            {data.tournament.blueCardEnabled && (
              <div
                className="
                  min-w-0
                  max-w-full
                  overflow-hidden
                  rounded-xl
                  border border-blue-400/10
                  bg-gradient-to-br from-blue-400/[0.035] to-transparent
                "
              >
                <div className="flex min-w-0 items-center justify-between gap-2 border-b border-blue-400/10 px-2.5 py-2.5 sm:px-3">
                  <h3 className="min-w-0 truncate text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    🟦 Azules
                  </h3>

                  <span className="shrink-0 rounded-full bg-blue-400/10 px-2 py-0.5 text-[8px] font-bold text-blue-700 dark:text-blue-300">
                    DISCIPLINA
                  </span>
                </div>

                <div
                  className={`
                    ${responsiveScorersTableClass}
                    scroll-invisible
                    max-h-[452px]
                    overflow-y-auto
                    p-1
                    sm:p-2
                  `}
                >
                  <ScorersTable
                    scorers={data.cards.blueCards}
                    emptyMessage="Todavía no hay azules registradas."
                    respectPaymentStatus
                    blueCardEnabled={
                      data.tournament.blueCardEnabled
                    }
                    valueKey="blueCards"
                    valueLabel="Azules"
                    leaderTitle="Más azules"
                    leaderIcon="🪓"
                  />
                </div>
              </div>
            )}

            {/* Rojas */}

            <div
              className="
                min-w-0
                max-w-full
                overflow-hidden
                rounded-xl
                border border-red-400/10
                bg-gradient-to-br from-red-400/[0.035] to-transparent
              "
            >
              <div className="flex min-w-0 items-center justify-between gap-2 border-b border-red-400/10 px-2.5 py-2.5 sm:px-3">
                <h3 className="min-w-0 truncate text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                  🟥 Rojas
                </h3>

                <span className="shrink-0 rounded-full bg-red-400/10 px-2 py-0.5 text-[8px] font-bold text-red-700 dark:text-red-300">
                  DISCIPLINA
                </span>
              </div>

              <div
                className={`
                  ${responsiveScorersTableClass}
                  scroll-invisible
                  max-h-[452px]
                  overflow-y-auto
                  p-1
                  sm:p-2
                `}
              >
                <ScorersTable
                  scorers={data.cards.redCards}
                  emptyMessage="Todavía no hay rojas registradas."
                  respectPaymentStatus
                  blueCardEnabled={
                    data.tournament.blueCardEnabled
                  }
                  valueKey="redCards"
                  valueLabel="Rojas"
                  leaderTitle="Más rojas"
                  leaderIcon="🪓🥊"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Historial */}

        <SectionCard
          section="history"
          open={openSection === 'history'}
          onToggle={toggleHistory}
          contentId="history-content"
        >
          <div
            id="history-content"
            className="min-w-0 p-3 sm:p-5"
          >
            {history.length > 0 && (
              <p className="mb-3 text-[10px] text-slate-500 sm:mb-4 sm:text-xs">
                Toca un partido para ver sus goles y tarjetas.
              </p>
            )}

            <div className="scroll-invisible max-h-[1536px] w-full min-w-0 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-[762px] lg:max-h-[504px]">
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-white/[0.07]">
                  Aún no hay partidos jugados.
                </p>
              ) : (
                <div className="space-y-5">
                  {groupMatchesByDate(history, 'desc').map(
                    ([date, matches]) => (
                      <section key={date} className="min-w-0">
                        <h3 className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:border-white/[0.05] dark:text-blue-300 sm:mb-3 sm:text-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                          {formatDate(date)}
                        </h3>

                        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {matches.map((match) => (
                            <HistoryMatchCard
                              key={match.id}
                              match={match}
                              onClick={() => setSelectedMatch(match)}
                            />
                          ))}
                        </div>
                      </section>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </section>

      <MatchDetailModal
        match={selectedMatch}
        recentFormByTeam={data.recentFormByTeam}
        onClose={() => setSelectedMatch(null)}
      />

      {/*
       * CAMBIO IMPORTANTE:
       *
       * Cuando Tarjetas está abierta, NO renderizamos TeamDetailModal.
       * Por lo tanto, aunque ScorersTable intente seleccionar un jugador,
       * este modal no puede aparecer.
       *
       * Fuera de Tarjetas se mantiene exactamente el comportamiento anterior.
       */}
      {!cardsSectionOpen && (
        <TeamDetailModal
          selection={selectedTeam}
          blueCardEnabled={data.tournament.blueCardEnabled}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </main>
  );
}
