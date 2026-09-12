import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import { EXPIRED_CLASS, isLogoHidden, isPlayerExpired, isTeamExpired } from '../utils/team-expiry.js';
import AnnouncementModal from '../components/AnnouncementModal.jsx';
import CompetitionOverview from '../components/CompetitionOverview.jsx';
import FutbolIcon from '../components/FutbolIcon.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
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

function groupMatchesByDate(matches) {
  const groups = new Map();

  matches.forEach((match) => {
    const key = dateValue(match.date);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(match);
  });

  return [...groups.entries()]
    .map(([date, dateMatches]) => [
      date,
      [...dateMatches].sort((left, right) =>
        String(left.time).localeCompare(String(right.time))
      ),
    ])
    .sort(([left], [right]) => left.localeCompare(right));
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
        aria-label={expired ? undefined : `Sin escudo para ${team?.name ?? 'equipo'}`}
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
        flex w-full items-center justify-between gap-2
        border-b border-slate-800
        py-3 text-left
        last:border-0
        sm:gap-4 sm:py-4
      "
      type="button"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-slate-500 sm:text-sm sm:text-slate-400">
          {formatTime(match.time)} · Colombia
        </p>

        <div className="mt-2 flex min-w-0 items-center sm:mt-2.5">
          <TeamLogo
            team={match.homeTeam}
            size="h-7 w-7 sm:h-9 sm:w-9"
          />

          <span className="ml-1.5 min-w-0 max-w-[30%] truncate text-xs font-semibold text-slate-300 sm:ml-2 sm:max-w-none sm:text-base sm:text-slate-200">
            {match.homeTeam.name}
          </span>

          <span
            className={`
              mx-1 shrink-0 text-[10px] font-black
              sm:mx-2 sm:text-sm
              ${
                match.status === 'STARTED'
                  ? 'text-emerald-400'
                  : 'text-slate-600'
              }
            `}
          >
            {match.status === 'STARTED'
              ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
              : 'vs'}
          </span>

          <span className="min-w-0 max-w-[30%] truncate text-xs font-semibold text-slate-300 sm:max-w-none sm:text-base sm:text-slate-200">
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
              ? 'border border-emerald-400/20 bg-emerald-400/10 font-bold text-emerald-300'
              : 'bg-slate-800 text-slate-400'
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
| Historial
|--------------------------------------------------------------------------
*/

function HistoryMatchCard({ match }) {
  return (
    <article
      className="
        rounded-xl border border-slate-800
        bg-slate-950/40 p-3
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
          <TeamLogo
            team={match.homeTeam}
            size="h-14 w-14 sm:h-20 sm:w-20"
          />

          <p className="mt-2 w-full truncate text-[11px] font-bold text-slate-200 sm:text-sm">
            {match.homeTeam.name}
          </p>

          <span className="mt-1.5 text-2xl font-black text-slate-100 sm:mt-2 sm:text-3xl">
            {match.homeScore}
          </span>
        </div>

        <div className="flex w-10 shrink-0 flex-col items-center sm:w-16">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 sm:text-xs">
            FINAL
          </span>

          <span className="mt-1 text-sm font-bold text-slate-600">
            -
          </span>
        </div>

        <div className="flex w-[90px] min-w-0 flex-col items-center text-center sm:w-[150px]">
          <TeamLogo
            team={match.awayTeam}
            size="h-14 w-14 sm:h-20 sm:w-20"
          />

          <p className="mt-2 w-full truncate text-[11px] font-bold text-slate-200 sm:text-sm">
            {match.awayTeam.name}
          </p>

          <span className="mt-1.5 text-2xl font-black text-slate-100 sm:mt-2 sm:text-3xl">
            {match.awayScore}
          </span>
        </div>
      </div>
    </article>
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
          border border-slate-700
          bg-slate-900
          shadow-2xl
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
            border-b border-slate-800
            px-3 py-3
            sm:px-6 sm:py-5
          "
        >
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-emerald-400 sm:text-xs">
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
              text-lg text-slate-400
              hover:bg-slate-800 hover:text-white
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

            <p className="mt-2 break-words text-xs font-bold leading-tight text-slate-100 sm:mt-3 sm:text-base">
              {match.homeTeam.name}
            </p>

            <p
              className={`
                mt-2 text-3xl font-black leading-none
                sm:mt-3 sm:text-5xl
                ${
                  match.status === 'STARTED'
                    ? 'text-emerald-400'
                    : 'text-slate-100'
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

            <p className="mt-2 break-words text-xs font-bold leading-tight text-slate-100 sm:mt-3 sm:text-base">
              {match.awayTeam.name}
            </p>

            <p
              className={`
                mt-2 text-3xl font-black leading-none
                sm:mt-3 sm:text-5xl
                ${
                  match.status === 'STARTED'
                    ? 'text-emerald-400'
                    : 'text-slate-100'
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

        {match.status === 'STARTED' && (
          <div className="border-t border-slate-800 px-3 py-3 sm:px-6 sm:py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 sm:gap-2 sm:text-xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                EN VIVO
              </span>

              <span className="text-base font-black text-white sm:text-lg">
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
              {(match.events ?? []).map((event) => {
                const isHomeTeam =
                  String(event.team?.id) === String(match.homeTeam?.id);

                const isAwayTeam =
                  String(event.team?.id) === String(match.awayTeam?.id);

                return (
                  <div
                    className={`
                      flex w-full items-center gap-2
                      text-xs text-slate-300
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

                        <span className={`max-w-[140px] truncate font-semibold sm:max-w-[220px] ${(event.player ? isPlayerExpired(event.player) : isTeamExpired(event.team)) ? EXPIRED_CLASS : ''}`}>
                          {event.player?.name ?? event.team.name}
                          {event.type === 'OWN_GOAL' && ' (autogol)'}
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

                        <span className={`max-w-[140px] truncate font-semibold sm:max-w-[220px] ${(event.player ? isPlayerExpired(event.player) : isTeamExpired(event.team)) ? EXPIRED_CLASS : ''}`}>
                          {event.player?.name ?? event.team.name}
                          {event.type === 'OWN_GOAL' && ' (autogol)'}
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

                        <span className={`truncate font-semibold ${(event.player ? isPlayerExpired(event.player) : isTeamExpired(event.team)) ? EXPIRED_CLASS : ''}`}>
                          {event.player?.name ?? event.team.name}
                          {event.type === 'OWN_GOAL' && ' (autogol)'}
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
            border-t border-slate-800
            px-3 py-3
            text-center text-[9px]
            leading-relaxed text-slate-500
            sm:px-6 sm:py-4 sm:text-xs
          "
        >
          Últimos 3 partidos:{' '}
          <span className="text-emerald-300">G</span> ganado ·{' '}
          <span className="text-amber-300">E</span> empatado ·{' '}
          <span className="text-red-300">P</span> perdido
        </div>
      </section>
    </div>
  );
}

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
  // Acordeón: una sola sección abierta a la vez, todas cerradas al inicio.
  // Valores: 'standings' (tabla/llaves), 'upcoming' (próximos + goleadores),
  // 'history' (historial), o null si no hay ninguna abierta.
  const [openSection, setOpenSection] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Una vez que se abre el historial, se mantiene actualizado en cada
  // refresco (junto con el resto), aunque el usuario cierre el acordeón.
  const historyLoadedRef = useRef(false);

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

    return () => {
      stream.close();
    };
  }, [id, loadTournament]);

  useEffect(() => {
    if (!selectedMatch || !data) return;

    const updatedMatch = [
      ...data.upcomingMatches,
      ...(data.ties ?? []).flatMap((tie) => tie.matches ?? []),
    ].find((match) => match.id === selectedMatch.id);

    if (updatedMatch) {
      setSelectedMatch(updatedMatch);
    }
  }, [data, selectedMatch]);

  async function toggleHistory() {
    if (openSection !== 'history' && history.length === 0) {
      await loadHistory();
    }

    setOpenSection((current) => (current === 'history' ? null : 'history'));
  }

  function toggleStandings() {
    setOpenSection((current) => (current === 'standings' ? null : 'standings'));
  }

  function toggleUpcoming() {
    setOpenSection((current) => (current === 'upcoming' ? null : 'upcoming'));
  }

  function toggleScorers() {
    setOpenSection((current) => (current === 'scorers' ? null : 'scorers'));
  }

  function toggleCards() {
    setOpenSection((current) => (current === 'cards' ? null : 'cards'));
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
          text-center text-sm text-slate-500 dark:text-slate-400
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
          text-center text-sm text-slate-500 dark:text-slate-400
        "
      >
        No se encontró el torneo.
      </main>
    );
  }

  const competitionMode = data.tournament.mode ?? 'ROUND_ROBIN';

  const isKnockout = [
    'KNOCKOUT_SINGLE',
    'KNOCKOUT_TWO_LEG',
  ].includes(competitionMode);

  return (
    <main
      className="
        min-h-screen
        bg-slate-50
        dark:bg-slate-950
        px-2.5 pb-4 pt-20
        text-slate-900
        dark:text-slate-100
        sm:px-6 sm:pb-8 sm:pt-24
      "
    >
      <AnnouncementModal />
      <PublicNavbar />

      <header className="mx-auto max-w-7xl">
        <Link
          className="
            inline-flex
            text-[11px] text-emerald-400
            hover:text-emerald-300
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
          mx-auto max-w-7xl
          py-5
          sm:py-12
        "
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400 sm:text-sm sm:tracking-[0.2em]">
          Torneo activo
        </p>

        <h1
          className="
            mt-1.5
            break-words
            text-2xl
            font-black
            tracking-tight
            sm:mt-3 sm:text-5xl
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
            text-slate-400
            sm:mt-4 sm:text-base
          "
        >
          {data.tournament.description ||
            'Resultados, calendario y tabla de posiciones.'}
        </p>
      </section>

      {/*
      |--------------------------------------------------------------------------
      | CONTENIDO PRINCIPAL
      |--------------------------------------------------------------------------
      |
      | IMPORTANTE:
      | Antes estaba:
      |
      | lg:grid-cols-[1.25fr_0.75fr]
      |
      | Eso hacía que tabla/llaves compartieran espacio con próximos partidos.
      |
      | Ahora usamos una sola columna para que cada sección ocupe 100%.
      |
      */}

      <section
        className="
          mx-auto
          grid
          max-w-7xl
          grid-cols-1
          gap-3
          lg:gap-6
        "
      >
        {competitionMode === 'ROUND_ROBIN' ? (
          /*
          |--------------------------------------------------------------------------
          | TABLA DE POSICIONES
          |--------------------------------------------------------------------------
          */

          <div
            className="
              min-w-0
              w-full
              rounded-xl
              border border-white/[0.05]
              bg-slate-900/90
              sm:rounded-2xl
            "
          >
            <button
              type="button"
              onClick={toggleStandings}
              className="
                w-full
                border-b border-white/[0.05]
                px-3 py-3.5
                text-left
                sm:px-6 sm:py-5
              "
              aria-expanded={openSection === 'standings'}
              aria-controls="standings-content"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="
                      mb-1.5
                      inline-flex items-center gap-1.5
                      rounded-full
                      border border-emerald-400/15
                      bg-emerald-400/[0.07]
                      px-2 py-1
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.16em]
                      text-emerald-300
                      sm:mb-2 sm:gap-2 sm:px-2.5 sm:py-1
                      sm:text-[10px]
                    "
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Clasificación
                  </div>

                  <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                    Tabla de posiciones
                  </h2>

                  <p className="mt-1 text-[10px] text-slate-500 sm:text-sm">
                    {data.standings.length} equipos · Actualizada automáticamente
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div
                    className="
                      hidden
                      items-center gap-2
                      rounded-xl
                      border border-white/[0.06]
                      bg-black/20
                      px-3 py-2
                      sm:flex
                    "
                  >
                    <span>🏆</span>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                        Equipos
                      </p>

                      <p className="text-sm font-black text-slate-200">
                        {data.standings.length}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`
                      flex h-8 w-8
                      items-center justify-center
                      rounded-full
                      border border-white/[0.06]
                      bg-slate-950/50
                      text-slate-400
                      transition-transform duration-200
                      ${
                        openSection === 'standings'
                          ? 'rotate-180'
                          : 'rotate-0'
                      }
                    `}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </div>
              </div>
            </button>

            {openSection === 'standings' && (
              <div id="standings-content" className="w-full">
                {/* DESKTOP */}

                <div className="scroll-invisible hidden max-h-[31rem] w-full overflow-y-auto sm:block">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-20 border-b border-white/[0.05] bg-slate-950">
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

                    <tbody className="divide-y divide-white/[0.04]">
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
                              ${
                                isLeader
                                  ? 'border-l-2 border-amber-400 bg-amber-400/[0.06]'
                                  : isSecond
                                    ? 'border-l-2 border-slate-400/40 bg-white/[0.015]'
                                    : 'hover:bg-white/[0.025]'
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
                                    recentForm: data.recentFormByTeam?.[row.team.id] ?? [],
                                  })
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setSelectedTeam({
                                      row,
                                      recentForm: data.recentFormByTeam?.[row.team.id] ?? [],
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
                                    <>
                                      <span
                                        className="
                                          absolute
                                          -right-2
                                          -top-3
                                          z-[99999999]
                                          text-base
                                          leading-none
                                          drop-shadow-[0_0_7px_rgba(251,191,36,0.8)]
                                        "
                                        aria-label="Primer lugar"
                                      >
                                        👑
                                      </span>

                                      <div
                                        className="
                                          pointer-events-none
                                          absolute
                                          bottom-full
                                          left-8
                                          z-[99999999]
                                          mb-3
                                          w-max
                                          max-w-[210px]
                                          -translate-x-1/2
                                          translate-y-1
                                          rounded-xl
                                          border
                                          border-amber-400/20
                                          bg-slate-800
                                          px-3 py-2
                                          text-xs
                                          font-semibold
                                          text-amber-100
                                          opacity-0
                                          shadow-xl
                                          transition-all
                                          duration-200
                                          group-hover:translate-y-0
                                          group-hover:opacity-100
                                        "
                                      >
                                        Hace frío aquí arriba ❄️

                                        <span
                                          className="
                                            absolute
                                            -bottom-1
                                            left-1/2
                                            h-2 w-2
                                            -translate-x-1/2
                                            rotate-45
                                            border-r border-b
                                            border-amber-400/20
                                            bg-slate-800
                                          "
                                        />
                                      </div>
                                    </>
                                  )}

                                  {isSecond && (
                                    <>
                                      <span
                                        className="
                                          absolute
                                          -right-2
                                          -top-3
                                          z-[99999999]
                                          text-sm
                                          leading-none
                                        "
                                        aria-label="Segundo lugar"
                                      >
                                        🥈
                                      </span>

                                      <div
                                        className="
                                          pointer-events-none
                                          absolute
                                          bottom-full
                                          left-1/2
                                          z-[99999999]
                                          mb-3
                                          w-max
                                          max-w-[210px]
                                          -translate-x-1/2
                                          translate-y-1
                                          rounded-xl
                                          border
                                          border-slate-400/20
                                          bg-slate-800
                                          px-3 py-2
                                          text-xs
                                          font-semibold
                                          text-slate-100
                                          opacity-0
                                          shadow-xl
                                          transition-all
                                          duration-200
                                          group-hover:translate-y-0
                                          group-hover:opacity-100
                                        "
                                      >
                                        Tarán Tarán 😂

                                        <span
                                          className="
                                            absolute
                                            -bottom-1
                                            left-1/2
                                            h-2 w-2
                                            -translate-x-1/2
                                            rotate-45
                                            border-r border-b
                                            border-slate-400/20
                                            bg-slate-800
                                          "
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>

                                <span
                                  className={`
                                    min-w-0 truncate font-semibold
                                    ${
                                      isLeader
                                        ? 'text-amber-100'
                                        : isSecond
                                          ? 'text-slate-200'
                                          : 'text-slate-300'
                                    }
                                  `}
                                >
                                  {row.team.name}
                                </span>
                              </div>
                            </td>

                            <td className={`px-2 py-3.5 text-center text-slate-500 ${expired ? EXPIRED_CLASS : ''}`}>
                              {row.played}
                            </td>

                            <td className={`px-2 py-3.5 text-center text-amber-300 ${expired ? EXPIRED_CLASS : ''}`}>
                              {row.yellowCards}
                            </td>

                            <td className={`px-2 py-3.5 text-center text-red-300 ${expired ? EXPIRED_CLASS : ''}`}>
                              {row.redCards}
                            </td>

                            <td className={`px-2 py-3.5 text-center text-blue-300 ${expired ? EXPIRED_CLASS : ''}`}>
                              {row.blueCards}
                            </td>

                            <td className={`px-2 py-3.5 text-center text-slate-500 ${expired ? EXPIRED_CLASS : ''}`}>
                              {row.goalsFor}
                            </td>

                            {/* Los goles en contra siempre se ven, incluso con el pago vencido. */}
                            <td className="px-2 py-3.5 text-center text-slate-500">
                              {row.goalsAgainst}
                            </td>

                            <td
                              className={`
                                px-2 py-3.5 text-center font-semibold
                                ${
                                  row.goalDifference > 0
                                    ? isLeader
                                      ? 'text-amber-300'
                                      : 'text-emerald-400'
                                    : row.goalDifference < 0
                                      ? 'text-rose-400'
                                      : 'text-slate-500'
                                }
                                ${expired ? EXPIRED_CLASS : ''}
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
                                    ? 'text-amber-300'
                                    : isSecond
                                      ? 'text-slate-100'
                                      : 'text-emerald-300'
                                }
                                ${expired ? EXPIRED_CLASS : ''}
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

                {/* MOBILE */}

                <div className="scroll-invisible max-h-[25rem] w-full overflow-y-auto sm:hidden">
                  <table className="w-full table-fixed text-xs">
                    <thead className="sticky top-0 z-20 border-b border-white/[0.05] bg-slate-900">
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

                    <tbody className="divide-y divide-white/[0.035]">
                      {data.standings.map((row) => {
                        const isLeader = row.position === 1;
                        const isSecond = row.position === 2;
                        const isThird = row.position === 3;
                        const expired = isTeamExpired(row.team);

                        return (
                          <tr
                            key={row.team.id}
                            tabIndex={isLeader || isSecond ? 0 : -1}
                            className={`
                              group
                              outline-none
                              transition-colors
                              ${
                                isLeader
                                  ? 'border-l-2 border-amber-400 bg-amber-400/[0.045]'
                                  : isSecond
                                    ? 'border-l-2 border-slate-400/40 bg-white/[0.015]'
                                    : ''
                              }
                              focus:bg-white/[0.04]
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
                                    recentForm: data.recentFormByTeam?.[row.team.id] ?? [],
                                  })
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setSelectedTeam({
                                      row,
                                      recentForm: data.recentFormByTeam?.[row.team.id] ?? [],
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
                                    <>
                                      <span
                                        className="
                                          absolute
                                          -right-2
                                          -top-3
                                          z-[99999999]
                                          text-xs
                                          leading-none
                                        "
                                        aria-label="Primer lugar"
                                      >
                                        👑
                                      </span>

                                      <div
                                        className="
                                          pointer-events-none
                                          absolute
                                          bottom-full
                                          left-7
                                          z-[99999999]
                                          mb-2
                                          w-max
                                          max-w-[180px]
                                          -translate-x-1/4
                                          translate-y-1
                                          rounded-lg
                                          border
                                          border-amber-400/20
                                          bg-slate-800
                                          px-2.5 py-1.5
                                          text-[10px]
                                          font-semibold
                                          text-amber-100
                                          opacity-0
                                          shadow-lg
                                          transition-all
                                          duration-150
                                          group-active:translate-y-0
                                          group-active:opacity-100
                                          group-focus:translate-y-0
                                          group-focus:opacity-100
                                        "
                                      >
                                        Hace frío aquí arriba ❄️

                                        <span
                                          className="
                                            absolute
                                            -bottom-1
                                            left-1/2
                                            h-1.5 w-1.5
                                            -translate-x-1/2
                                            rotate-45
                                            border-r border-b
                                            border-amber-400/20
                                            bg-slate-800
                                          "
                                        />
                                      </div>
                                    </>
                                  )}

                                  {isSecond && (
                                    <>
                                      <span
                                        className="
                                          absolute
                                          -right-2
                                          -top-3
                                          z-[99999999]
                                          text-xs
                                          leading-none
                                        "
                                        aria-label="Segundo lugar"
                                      >
                                        🥈
                                      </span>

                                      <div
                                        className="
                                          pointer-events-none
                                          absolute
                                          bottom-full
                                          left-1/2
                                          z-[99999999]
                                          mb-2
                                          w-max
                                          max-w-[180px]
                                          -translate-x-1/2
                                          translate-y-1
                                          rounded-lg
                                          border
                                          border-slate-400/20
                                          bg-slate-800
                                          px-2.5 py-1.5
                                          text-[10px]
                                          font-semibold
                                          text-slate-100
                                          opacity-0
                                          shadow-lg
                                          transition-all
                                          duration-150
                                          group-active:translate-y-0
                                          group-active:opacity-100
                                          group-focus:translate-y-0
                                          group-focus:opacity-100
                                        "
                                      >
                                        Tarán Tarán 😂

                                        <span
                                          className="
                                            absolute
                                            -bottom-1
                                            left-1/2
                                            h-1.5 w-1.5
                                            -translate-x-1/2
                                            rotate-45
                                            border-r border-b
                                            border-slate-400/20
                                            bg-slate-800
                                          "
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>

                                <span
                                  className={`
                                    min-w-0 truncate
                                    text-[11px]
                                    font-semibold
                                    ${
                                      isLeader
                                        ? 'text-amber-100'
                                        : isSecond
                                          ? 'text-slate-200'
                                          : 'text-slate-300'
                                    }
                                  `}
                                >
                                  {row.team.name}
                                </span>
                              </div>
                            </td>

                            <td
                              className={`px-0.5 py-3 text-center text-[10px] font-medium text-slate-500 ${expired ? EXPIRED_CLASS : ''}`}
                            >
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
                                      ? 'text-amber-300'
                                      : 'text-emerald-400'
                                    : row.goalDifference < 0
                                      ? 'text-rose-400'
                                      : 'text-slate-500'
                                }
                                ${expired ? EXPIRED_CLASS : ''}
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
                                    ? 'text-amber-300'
                                    : isSecond
                                      ? 'text-slate-100'
                                      : 'text-emerald-300'
                                }
                                ${expired ? EXPIRED_CLASS : ''}
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
                    border-t border-white/[0.05]
                    bg-slate-950/20
                    px-3 py-2.5
                    text-[9px]
                    text-slate-600
                    sm:px-5 sm:py-3 sm:text-[10px]
                  "
                >
                  <span>
                    <strong className="text-slate-500">PJ</strong> Partidos
                  </span>

                  <span>
                    <strong className="text-slate-500">GF/GC</strong> Goles
                  </span>

                  <span>
                    <strong className="text-slate-500">DG</strong> Diferencia
                  </span>

                  <span>
                    <strong className="text-emerald-500">PTS</strong> Puntos
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : competitionMode === 'GROUP_STAGE' ? (
          /*
          |--------------------------------------------------------------------------
          | FASE DE GRUPOS
          |--------------------------------------------------------------------------
          */

          <div
            className="
              min-w-0
              w-full
              rounded-xl
              border border-white/[0.05]
              bg-slate-900/90
              sm:rounded-2xl
            "
          >
            <button
              type="button"
              onClick={toggleStandings}
              className="
                w-full
                border-b border-white/[0.05]
                px-3 py-3.5
                text-left
                sm:px-6 sm:py-5
              "
              aria-expanded={openSection === 'standings'}
              aria-controls="pots-content"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="
                      mb-1.5
                      inline-flex items-center gap-1.5
                      rounded-full
                      border border-emerald-400/15
                      bg-emerald-400/[0.07]
                      px-2 py-1
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.16em]
                      text-emerald-300
                      sm:mb-2 sm:gap-2 sm:px-2.5 sm:py-1
                      sm:text-[10px]
                    "
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Fase de grupos
                  </div>

                  <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                    Tabla de posiciones por bombo
                  </h2>
                </div>

                <span
                  className={`
                    flex h-8 w-8 shrink-0
                    items-center justify-center
                    rounded-full
                    border border-white/[0.06]
                    bg-slate-950/50
                    text-slate-400
                    transition-transform duration-200
                    ${
                      openSection === 'standings'
                        ? 'rotate-180'
                        : 'rotate-0'
                    }
                  `}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </div>
            </button>

            {openSection === 'standings' && (
              <div id="pots-content" className="p-3 sm:p-6">
                <p className="mb-4 text-xs leading-5 text-slate-500">
                  Compara a los equipos que comparten bombo usando lo que ya jugaron en su propio grupo, aunque no se enfrenten directamente entre ellos.
                </p>

                {!data.pots || data.pots.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-xs text-slate-500">
                    Los grupos aún no han sido generados.
                  </p>
                ) : (
                  <div className="grid w-full grid-cols-1 gap-6">
                    {data.pots.map(({ pot, standings }) => (
                      <div
                        key={pot}
                        className="min-w-0 w-full"
                      >
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                          Bombo {pot}
                        </h3>

                        <div className="w-full min-w-0">
                          <StandingsTable
                            standings={standings}
                            respectPaymentStatus
                            onSelectTeam={(row) =>
                              setSelectedTeam({
                                row,
                                recentForm: data.recentFormByTeam?.[row.team.id] ?? [],
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /*
          |--------------------------------------------------------------------------
          | LLAVES
          |--------------------------------------------------------------------------
          */

          <div
            className="
              min-w-0
              w-full
              rounded-xl
              border border-white/[0.05]
              bg-slate-900/90
              sm:rounded-2xl
            "
          >
            <button
              type="button"
              onClick={toggleStandings}
              className="
                w-full
                border-b border-white/[0.05]
                px-3 py-3.5
                text-left
                sm:px-6 sm:py-5
              "
              aria-expanded={openSection === 'standings'}
              aria-controls="bracket-content"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="
                      mb-1.5
                      inline-flex items-center gap-1.5
                      rounded-full
                      border border-emerald-400/15
                      bg-emerald-400/[0.07]
                      px-2 py-1
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.16em]
                      text-emerald-300
                      sm:mb-2 sm:gap-2 sm:px-2.5 sm:py-1
                      sm:text-[10px]
                    "
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Eliminación
                  </div>

                  <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                    Llaves del torneo
                  </h2>
                </div>

                <span
                  className={`
                    flex h-8 w-8 shrink-0
                    items-center justify-center
                    rounded-full
                    border border-white/[0.06]
                    bg-slate-950/50
                    text-slate-400
                    transition-transform duration-200
                    ${
                      openSection === 'standings'
                        ? 'rotate-180'
                        : 'rotate-0'
                    }
                  `}
                  aria-hidden="true"
                >
                  ▼
                </span>
              </div>
            </button>

            {openSection === 'standings' && (
              <div id="bracket-content" className="w-full p-3 sm:p-6">
                <CompetitionOverview
                  mode={competitionMode}
                  groups={data.groups}
                  ties={data.ties}
                  championLabel={data.tournament.championLabel}
                  onSelectMatch={setSelectedMatch}
                />
              </div>
            )}
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | PRÓXIMOS PARTIDOS
        |--------------------------------------------------------------------------
        */}

        <div
          className="
            min-w-0
            w-full
            rounded-xl
            border border-white/[0.05]
            bg-slate-900/90
            sm:rounded-2xl
          "
        >
          <button
            type="button"
            onClick={toggleUpcoming}
            className="
              w-full
              border-b border-white/[0.05]
              px-3 py-3.5
              text-left
              sm:px-6 sm:py-5
            "
            aria-expanded={openSection === 'upcoming'}
            aria-controls="upcoming-content"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="
                    mb-1.5
                    inline-flex items-center gap-1.5
                    rounded-full
                    border border-emerald-400/15
                    bg-emerald-400/[0.07]
                    px-2 py-1
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.16em]
                    text-emerald-300
                    sm:mb-2 sm:gap-2 sm:px-2.5 sm:py-1
                    sm:text-[10px]
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Calendario
                </div>

                <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                  Próximos partidos
                </h2>
              </div>

              <span
                className={`
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-full
                  border border-white/[0.06]
                  bg-slate-950/50
                  text-slate-400
                  transition-transform duration-200
                  ${
                    openSection === 'upcoming'
                      ? 'rotate-180'
                      : 'rotate-0'
                  }
                `}
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
          </button>

          {openSection === 'upcoming' && (
            <div id="upcoming-content" className="w-full p-3 sm:p-5">
              <p className="mb-2 text-[10px] text-slate-500 sm:mb-3 sm:text-xs">
                Haz clic en un partido para ver sus detalles.
              </p>

              <div className="scroll-invisible max-h-[25rem] overflow-y-auto pr-1">
                {data.upcomingMatches.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No hay próximos partidos.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {groupMatchesByDate(data.upcomingMatches).map(
                      ([date, matches]) => (
                        <section key={date}>
                          <h3 className="mb-1.5 border-b border-slate-800 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 sm:mb-2 sm:pb-2 sm:text-xs">
                            {formatDate(date)}
                          </h3>

                          <div>
                            {matches.map((match) => (
                              <MatchRow
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
          )}
        </div>

        {/*
        |--------------------------------------------------------------------------
        | GOLEADORES
        |--------------------------------------------------------------------------
        */}

        <div
          className="
            min-w-0
            w-full
            rounded-xl
            border border-white/[0.05]
            bg-slate-900/90
            sm:rounded-2xl
          "
        >
          <button
            type="button"
            onClick={toggleScorers}
            className="
              w-full
              border-b border-white/[0.05]
              px-3 py-3.5
              text-left
              sm:px-6 sm:py-5
            "
            aria-expanded={openSection === 'scorers'}
            aria-controls="scorers-content"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="
                    mb-1.5
                    inline-flex items-center gap-1.5
                    rounded-full
                    border border-emerald-400/15
                    bg-emerald-400/[0.07]
                    px-2 py-1
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.16em]
                    text-emerald-300
                    sm:mb-2 sm:gap-2 sm:px-2.5 sm:py-1
                    sm:text-[10px]
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Goleadores
                </div>

                <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                  Goleadores
                </h2>
              </div>

              <span
                className={`
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-full
                  border border-white/[0.06]
                  bg-slate-950/50
                  text-slate-400
                  transition-transform duration-200
                  ${
                    openSection === 'scorers'
                      ? 'rotate-180'
                      : 'rotate-0'
                  }
                `}
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
          </button>

          {openSection === 'scorers' && (
            <div id="scorers-content" className="w-full p-3 sm:p-5">
              <p className="mb-2 text-[10px] text-slate-500 sm:mb-3 sm:text-xs">
                Jugadores con más goles del torneo.
              </p>

              <div className="scroll-invisible max-h-[25rem] overflow-y-auto pr-1">
                <ScorersTable
                  scorers={data.scorers}
                  respectPaymentStatus
                  blueCardEnabled={data.tournament.blueCardEnabled}
                />
              </div>
            </div>
          )}
        </div>

        {/*
        |--------------------------------------------------------------------------
        | TARJETAS
        |--------------------------------------------------------------------------
        |
        | Un ranking por cada tipo de tarjeta: amarillas y rojas siempre,
        | azules solo si el torneo las tiene habilitadas.
        |
        */}

        <div
          className="
            min-w-0
            w-full
            rounded-xl
            border border-white/[0.05]
            bg-slate-900/90
            sm:rounded-2xl
          "
        >
          <button
            type="button"
            onClick={toggleCards}
            className="
              w-full
              border-b border-white/[0.05]
              px-3 py-3.5
              text-left
              sm:px-6 sm:py-5
            "
            aria-expanded={openSection === 'cards'}
            aria-controls="cards-content"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="
                    mb-1.5
                    inline-flex items-center gap-1.5
                    rounded-full
                    border border-emerald-400/15
                    bg-emerald-400/[0.07]
                    px-2 py-1
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.16em]
                    text-emerald-300
                    sm:mb-2 sm:gap-2 sm:px-2.5 sm:py-1
                    sm:text-[10px]
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Disciplina
                </div>

                <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                  Tarjetas
                </h2>
              </div>

              <span
                className={`
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-full
                  border border-white/[0.06]
                  bg-slate-950/50
                  text-slate-400
                  transition-transform duration-200
                  ${
                    openSection === 'cards'
                      ? 'rotate-180'
                      : 'rotate-0'
                  }
                `}
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
          </button>

          {openSection === 'cards' && (
            <div
              id="cards-content"
              className={`grid min-w-0 w-full grid-cols-1 gap-3 p-3 sm:p-5 ${
                data.tournament.blueCardEnabled ? 'lg:grid-cols-3 lg:gap-4' : 'sm:grid-cols-2 sm:gap-4'
              }`}
            >
              <div className="min-w-0">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  🟨 Amarillas
                </h3>

                <div className="scroll-invisible max-h-[25rem] overflow-y-auto pr-1">
                  <ScorersTable
                    scorers={data.cards.yellowCards}
                    emptyMessage="Todavía no hay amarillas registradas."
                    respectPaymentStatus
                    blueCardEnabled={data.tournament.blueCardEnabled}
                    valueKey="yellowCards"
                    valueLabel="Amarillas"
                    leaderTitle="Más amarillas"
                    leaderIcon="🥊"
                  />
                </div>
              </div>

              {data.tournament.blueCardEnabled && (
                <div className="min-w-0">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                    🟦 Azules
                  </h3>

                  <div className="scroll-invisible max-h-[25rem] overflow-y-auto pr-1">
                    <ScorersTable
                      scorers={data.cards.blueCards}
                      emptyMessage="Todavía no hay azules registradas."
                      respectPaymentStatus
                      blueCardEnabled={data.tournament.blueCardEnabled}
                      valueKey="blueCards"
                      valueLabel="Azules"
                      leaderTitle="Más azules"
                      leaderIcon="🪓"
                    />
                  </div>
                </div>
              )}

              <div className="min-w-0">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">
                  🟥 Rojas
                </h3>

                <div className="scroll-invisible max-h-[25rem] overflow-y-auto pr-1">
                  <ScorersTable
                    scorers={data.cards.redCards}
                    emptyMessage="Todavía no hay rojas registradas."
                    respectPaymentStatus
                    blueCardEnabled={data.tournament.blueCardEnabled}
                    valueKey="redCards"
                    valueLabel="Rojas"
                    leaderTitle="Más rojas"
                    leaderIcon="🪓🥊"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="
            min-w-0
            w-full
            rounded-xl
            border border-white/[0.05]
            bg-slate-900/90
            sm:rounded-2xl
          "
        >
          <button
            type="button"
            onClick={toggleHistory}
            className="
              w-full
              border-b border-white/[0.05]
              px-3 py-3.5
              text-left
              sm:px-6 sm:py-5
            "
            aria-expanded={openSection === 'history'}
            aria-controls="history-content"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="
                    mb-1.5
                    inline-flex items-center gap-1.5
                    rounded-full
                    border border-emerald-400/15
                    bg-emerald-400/[0.07]
                    px-2 py-1
                    text-[8px]
                    font-bold
                    uppercase
                    tracking-[0.16em]
                    text-emerald-300
                    sm:mb-2 sm:gap-2 sm:px-2.5 sm:py-1
                    sm:text-[10px]
                  "
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Resultados
                </div>

                <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                  Historial de partidos
                </h2>
              </div>

              <span
                className={`
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-full
                  border border-white/[0.06]
                  bg-slate-950/50
                  text-slate-400
                  transition-transform duration-200
                  ${
                    openSection === 'history'
                      ? 'rotate-180'
                      : 'rotate-0'
                  }
                `}
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
          </button>

          {openSection === 'history' && (
            <div id="history-content" className="p-3 sm:p-5">
              {history.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Aún no hay partidos jugados.
                </p>
              ) : (
                <div className="space-y-5">
                  {groupMatchesByDate(history).map(([date, matches]) => (
                    <section key={date}>
                      <h3 className="mb-2 border-b border-slate-800 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300 sm:mb-3 sm:text-sm">
                        {formatDate(date)}
                      </h3>

                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                        {matches.map((match) => (
                          <HistoryMatchCard
                            key={match.id}
                            match={match}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <MatchDetailModal
        match={selectedMatch}
        recentFormByTeam={data.recentFormByTeam}
        onClose={() => setSelectedMatch(null)}
      />

      <TeamDetailModal
        selection={selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </main>
  );
}
