import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import { EXPIRED_CLASS, isLogoHidden, isTeamExpired } from '../utils/team-expiry.js';

import AnnouncementModal from '../components/AnnouncementModal.jsx';
import CompetitionOverview from '../components/CompetitionOverview.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import StandingsTable from '../components/StandingsTable.jsx';

const formStyles = {
  G: 'bg-emerald-500 text-slate-950',
  E: 'bg-amber-400 text-slate-950',
  P: 'bg-red-500 text-white',
};

/*
|--------------------------------------------------------------------------
| Logo del equipo
|--------------------------------------------------------------------------
*/

function TeamLogo({
  team,
  size = 'h-8 w-8',
  className = '',
}) {
  const expired = isTeamExpired(team);
  const expiredClass = expired ? EXPIRED_CLASS : '';

  if (!team.logo || isLogoHidden(team)) {
    return (
      <div
        className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-400 ${className} ${expiredClass}`}
        aria-label={expired ? undefined : `Sin escudo para ${team.name}`}
      >
        ⚽
      </div>
    );
  }

  return (
    <img
      className={`${size} shrink-0 rounded-full border border-slate-700 bg-slate-950 object-cover ${className} ${expiredClass}`}
      src={team.logo}
      alt={expired ? '' : `Escudo de ${team.name}`}
    />
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
        className="max-h-[94vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl shadow-black/30 sm:max-h-[92vh] sm:rounded-3xl sm:shadow-2xl sm:shadow-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end px-3 pt-3 sm:px-4 sm:pt-4">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-6 text-center sm:px-6 sm:pb-7">
          <div className="relative mx-auto w-fit">
            <TeamLogo
              team={row.team}
              size="h-20 w-20 sm:h-24 sm:w-24"
              className={
                isLeader
                  ? 'border-amber-400/40 ring-2 ring-amber-400/30 shadow-[0_0_18px_rgba(251,191,36,0.18)] sm:shadow-[0_0_30px_rgba(251,191,36,0.2)]'
                  : ''
              }
            />

            {isLeader && (
              <span
                className="absolute -right-2 -top-3 text-xl drop-shadow-[0_0_6px_rgba(251,191,36,0.7)] sm:-right-3 sm:-top-4 sm:text-2xl sm:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                aria-label="Primer lugar"
              >
                👑
              </span>
            )}
          </div>

          <h2
            className={`mt-3 text-xl font-black sm:mt-4 sm:text-2xl ${
              isLeader ? 'text-amber-100' : 'text-white'
            }`}
            id="team-modal-title"
          >
            {row.team.name}
          </h2>

          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Posición #{row.position} · {row.points} puntos
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
            <div className="rounded-xl border border-emerald-400/10 bg-emerald-500/10 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-xl font-black text-emerald-300 sm:text-2xl">
                {row.goalsFor}
              </p>

              <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
                Goles marcados
              </p>
            </div>

            <div className="rounded-xl border border-red-400/10 bg-red-500/10 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-xl font-black text-red-300 sm:text-2xl">
                {row.goalsAgainst}
              </p>

              <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
                Goles recibidos
              </p>
            </div>
          </div>

          <div className="mt-5 sm:mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Últimos 3 resultados
            </p>

            {recentForm.length ? (
              <div className="mt-3 flex justify-center gap-2">
                {recentForm.map((result, index) => (
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${formStyles[result]}`}
                    key={`${result}-${index}`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500 sm:text-sm">
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
| Tarjeta del torneo
|--------------------------------------------------------------------------
*/

function TournamentCard({
  tournament,
  onSelectTeam,
  isExpanded,
  onToggle,
}) {
  const standings = tournament.standings ?? [];
  const mode = tournament.tournament.mode ?? 'ROUND_ROBIN';
  const contentId = `tournament-content-${tournament.tournament.id}`;
  const buttonId = `tournament-button-${tournament.tournament.id}`;

  return (
    <article
      className="
        group
        flex
        w-full
        min-w-0
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.06]
        bg-gradient-to-b
        from-slate-900
        to-slate-950
        shadow-xl
        shadow-black/15
        transition
        duration-300
        hover:border-emerald-400/15
        hover:shadow-emerald-950/20
        sm:rounded-3xl
        sm:shadow-2xl
        sm:shadow-black/20
      "
    >
      {/* Cabecera del acordeón */}

      <button
        id={buttonId}
        className="relative min-h-[104px] w-full overflow-hidden border-b border-white/[0.06] p-4 text-left transition hover:bg-white/[0.02] sm:min-h-[126px] sm:p-5"
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full bg-emerald-400/[0.05] blur-2xl sm:-right-16 sm:-top-20 sm:h-48 sm:w-48 sm:blur-3xl" />

        <div className="relative flex w-full items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_#34d399] sm:shadow-[0_0_8px_#34d399]" />
              Torneo activo
            </div>

            <h2 className="mt-3 text-lg font-black tracking-tight text-white sm:text-2xl">
              {tournament.tournament.name}
            </h2>

            <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
              {tournament.tournament.description ||
                'Consulta la clasificación y el calendario.'}
            </p>
          </div>

          <span
            className={`
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-white/[0.06]
              bg-slate-950/50
              text-slate-400
              transition-transform
              duration-300
              ${
                isExpanded
                  ? 'rotate-180 bg-emerald-400/10 text-emerald-400'
                  : 'rotate-0'
              }
            `}
            aria-hidden="true"
          >
            ▼
          </span>
        </div>
      </button>

      {/* Contenido */}

      {isExpanded && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={buttonId}
          className="w-full min-w-0"
        >
          {mode === 'ROUND_ROBIN' ? (
            /*
            |--------------------------------------------------------------------------
            | TABLA ROUND ROBIN
            |--------------------------------------------------------------------------
            |
            | MÓVIL:
            |   Pos | Escudo + Nombre | PTS
            |
            | ESCRITORIO:
            |   Pos | Equipo | PJ | DG | 🟨 | 🟥 | 🟦 | PTS
            |
            |--------------------------------------------------------------------------
            */

            <div className="w-full min-w-0 overflow-hidden p-2.5 sm:p-4">
              <div className="w-full min-w-0 overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900">
                    <tr className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.16em]">
                      {/* POSICIÓN */}
                      <th className="w-12 px-1.5 py-2.5 text-center sm:w-12 sm:px-2 sm:py-3">
                        Pos
                      </th>

                      {/* EQUIPO */}
                      <th className="px-1.5 py-2.5 text-left sm:px-2 sm:py-3">
                        Equipo
                      </th>

                      {/* PJ - SOLO ESCRITORIO */}
                      <th className="hidden px-2 py-3 text-center sm:table-cell">
                        PJ
                      </th>

                      {/* DG - SOLO ESCRITORIO */}
                      <th className="hidden px-2 py-3 text-center sm:table-cell">
                        DG
                      </th>

                      {/* AMARILLAS - SOLO ESCRITORIO */}
                      <th className="hidden px-2 py-3 text-center text-amber-400 sm:table-cell">
                        🟨
                      </th>

                      {/* ROJAS - SOLO ESCRITORIO */}
                      <th className="hidden px-2 py-3 text-center text-red-400 sm:table-cell">
                        🟥
                      </th>

                      {/* AZULES - SOLO ESCRITORIO */}
                      <th className="hidden px-2 py-3 text-center text-blue-400 sm:table-cell">
                        🟦
                      </th>

                      {/* PUNTOS */}
                      <th className="w-14 px-1.5 py-2.5 text-center text-emerald-400 sm:w-auto sm:px-2 sm:py-3">
                        PTS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {standings.map((row, index) => {
                      const isLeader = row.position === 1;
                      const expired = isTeamExpired(row.team);

                      return (
                        <tr
                          key={row.team.id}
                          className={`
                            group
                            transition-colors
                            duration-200
                            ${
                              isLeader
                                ? `
                                  border-l-2
                                  border-amber-400
                                  bg-gradient-to-r
                                  from-amber-400/[0.10]
                                  via-amber-400/[0.035]
                                  to-transparent
                                  hover:from-amber-400/[0.15]
                                  sm:from-amber-400/[0.12]
                                  sm:via-amber-400/[0.045]
                                  sm:hover:from-amber-400/[0.17]
                                `
                                : 'hover:bg-slate-800/40'
                            }
                          `}
                        >
                          {/* POSICIÓN */}

                          <td className="w-12 px-1.5 py-2.5 text-center sm:w-auto sm:px-2 sm:py-3">
                            {row.position <= 3 ? (
                              <span
                                className={`
                                  mx-auto
                                  flex
                                  h-6
                                  w-6
                                  items-center
                                  justify-center
                                  rounded-md
                                  text-[10px]
                                  font-black
                                  sm:h-7
                                  sm:w-7
                                  sm:rounded-lg
                                  sm:text-[11px]
                                  ${
                                    row.position === 1
                                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                                      : row.position === 2
                                        ? 'bg-slate-300 text-slate-900'
                                        : 'bg-orange-400 text-slate-950'
                                  }
                                `}
                              >
                                {row.position}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                                {row.position}
                              </span>
                            )}
                          </td>

                          {/* EQUIPO */}

                          <td className="min-w-0 px-1.5 py-2.5 sm:px-2 sm:py-3">
                            <button
                              className="flex min-w-0 w-full items-center gap-2 text-left"
                              type="button"
                              onClick={() =>
                                onSelectTeam(
                                  row,
                                  tournament.recentFormByTeam?.[
                                    row.team.id
                                  ] ?? []
                                )
                              }
                            >
                              {/* ESCUDO */}

                              <div className="relative shrink-0">
                                <TeamLogo
                                  team={row.team}
                                  size="h-7 w-7 sm:h-9 sm:w-9"
                                  className={
                                    isLeader
                                      ? 'border-amber-400/40 ring-2 ring-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.12)]'
                                      : 'border-slate-700'
                                  }
                                />

                                {isLeader && (
                                  <span
                                    className="absolute -right-1.5 -top-2 z-10 text-xs leading-none drop-shadow-[0_0_5px_rgba(251,191,36,0.7)] sm:-right-2 sm:-top-3 sm:text-sm"
                                    title="Primer lugar"
                                    aria-label="Primer lugar"
                                  >
                                    👑
                                  </span>
                                )}
                              </div>

                              {/* NOMBRE */}

                              <span
                                className={`
                                  min-w-0
                                  flex-1
                                  truncate
                                  text-xs
                                  font-semibold
                                  transition-colors
                                  sm:text-sm
                                  ${
                                    isLeader
                                      ? 'text-amber-100 group-hover:text-amber-300'
                                      : 'text-slate-300 group-hover:text-white'
                                  }
                                `}
                              >
                                {row.team.name}
                              </span>
                            </button>
                          </td>

                          {/* PJ - SOLO ESCRITORIO */}

                          <td className={`hidden px-2 py-3 text-center text-slate-400 sm:table-cell ${expired ? EXPIRED_CLASS : ''}`}>
                            {row.played}
                          </td>

                          {/* DG - SOLO ESCRITORIO */}

                          <td
                            className={`
                              hidden
                              px-2
                              py-3
                              text-center
                              text-sm
                              sm:table-cell
                              ${
                                row.goalDifference > 0
                                  ? 'font-semibold text-emerald-400'
                                  : row.goalDifference < 0
                                    ? 'font-semibold text-red-400'
                                    : 'text-slate-400'
                              }
                              ${expired ? EXPIRED_CLASS : ''}
                            `}
                          >
                            {row.goalDifference > 0
                              ? `+${row.goalDifference}`
                              : row.goalDifference}
                          </td>

                          {/* AMARILLAS - SOLO ESCRITORIO */}

                          <td className={`hidden px-2 py-3 text-center text-amber-300 sm:table-cell ${expired ? EXPIRED_CLASS : ''}`}>
                            {row.yellowCards}
                          </td>

                          {/* ROJAS - SOLO ESCRITORIO */}

                          <td className={`hidden px-2 py-3 text-center text-red-300 sm:table-cell ${expired ? EXPIRED_CLASS : ''}`}>
                            {row.redCards}
                          </td>

                          {/* AZULES - SOLO ESCRITORIO */}

                          <td className={`hidden px-2 py-3 text-center text-blue-300 sm:table-cell ${expired ? EXPIRED_CLASS : ''}`}>
                            {row.blueCards}
                          </td>

                          {/* PUNTOS */}

                          <td
                            className={`
                              w-14
                              px-1.5
                              py-2.5
                              text-center
                              text-sm
                              sm:w-auto
                              sm:px-2
                              sm:py-3
                              sm:text-base
                              ${
                                isLeader
                                  ? 'font-black text-amber-300'
                                  : 'font-black text-emerald-300'
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

                {standings.length === 0 && (
                  <p className="p-4 text-center text-xs text-slate-500 sm:p-5 sm:text-sm">
                    Aún no hay equipos en este torneo.
                  </p>
                )}
              </div>
            </div>
          ) : mode === 'GROUP_STAGE' ? (
            <div className="w-full min-w-0 overflow-hidden p-2.5 sm:p-4">
              {!tournament.pots ||
              tournament.pots.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500 sm:p-5 sm:text-sm">
                  Los grupos aún no han sido generados.
                </p>
              ) : (
                <div className="w-full space-y-4">
                  {tournament.pots.map(
                    ({ pot, standings: potStandings }) => (
                      <div
                        key={pot}
                        className="w-full min-w-0"
                      >
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                          Bombo {pot}
                        </h3>

                        <div className="w-full min-w-0 overflow-hidden">
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
            <div className="w-full min-w-0 overflow-hidden p-2.5 sm:p-4">
              <div className="w-full min-w-0 overflow-hidden">
                <CompetitionOverview
                  mode={mode}
                  groups={tournament.groups}
                  ties={tournament.ties}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}

      <div className="w-full border-t border-white/[0.06] p-2.5 sm:p-4">
        <Link
          className="group/link flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-center text-xs font-black text-slate-950 transition hover:bg-emerald-400 sm:px-4 sm:py-3 sm:text-sm"
          to={`/tournaments/${tournament.tournament.id}`}
        >
          Ver torneo y próximos partidos

          <span className="transition-transform group-hover/link:translate-x-1">
            →
          </span>
        </Link>
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
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Acordeón exclusivo
  |--------------------------------------------------------------------------
  |
  | Solo se guarda un ID.
  | Si se abre otro torneo, el anterior se cierra.
  |
  */

  const [expandedTournamentId, setExpandedTournamentId] =
    useState(null);

  function toggleTournament(tournamentId) {
    setExpandedTournamentId((currentId) =>
      currentId === tournamentId ? null : tournamentId
    );
  }

  useEffect(() => {
    async function loadTournaments() {
      try {
        const { data } = await api.get('/public/tournaments');

        const tournamentList = data.data.tournaments;

        const details = await Promise.all(
          tournamentList.map(async (tournament) => {
            const response = await api.get(
              `/public/tournaments/${tournament.id}`
            );

            return response.data.data;
          })
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b12] dark:text-slate-100">
      {/* Navegación */}

      <PublicNavbar />

      {/* Modal de anuncios */}

      <AnnouncementModal />

      {/* Hero */}

      <section className="relative w-full overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.11),_transparent_38%)] px-4 pb-10 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="pointer-events-none absolute -left-24 top-20 h-48 w-48 rounded-full bg-emerald-400/[0.04] blur-2xl sm:-left-32 sm:h-72 sm:w-72 sm:bg-emerald-400/[0.05] sm:blur-3xl" />

        <div className="pointer-events-none absolute -right-24 top-0 h-52 w-52 rounded-full bg-cyan-400/[0.025] blur-2xl sm:-right-32 sm:h-80 sm:w-80 sm:bg-cyan-400/[0.04] sm:blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.17em] text-emerald-300 sm:px-3 sm:text-xs sm:tracking-[0.2em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_#34d399]" />

            Resultados en un solo lugar
          </div>

          <h1 className="mt-4 max-w-3xl text-[2rem] font-black leading-[1.08] tracking-tight text-white sm:mt-6 sm:text-5xl sm:leading-tight md:text-6xl">
            Torneos que se viven
            <span className="text-emerald-400">
              {' '}
              partido a partido.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-5 text-slate-400 sm:mt-6 sm:text-lg sm:leading-8">
            Consulta tablas de posiciones, próximos encuentros y
            resultados de los torneos activos.
          </p>
        </div>
      </section>

      {/* Torneos */}

      <section className="w-full px-3.5 py-8 sm:px-6 sm:py-14">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-5 flex items-end justify-between gap-3 sm:mb-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:text-sm sm:tracking-[0.18em]">
                En vivo
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:mt-2 sm:text-3xl">
                Torneos activos
              </h2>
            </div>

            <span className="shrink-0 rounded-full border border-white/[0.06] bg-slate-900 px-2.5 py-1.5 text-[9px] font-bold text-slate-500 sm:px-4 sm:py-2 sm:text-xs">
              {tournaments.length}{' '}
              {tournaments.length === 1
                ? 'disponible'
                : 'disponibles'}
            </span>
          </div>

          {isLoading ? (
            <div className="w-full rounded-2xl border border-white/[0.06] bg-slate-900/60 p-10 text-center shadow-lg shadow-black/10 sm:rounded-3xl sm:p-16 sm:shadow-xl">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />

              <p className="mt-4 text-xs text-slate-500 sm:text-sm">
                Cargando torneos...
              </p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center sm:rounded-3xl sm:p-14">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg sm:h-14 sm:w-14 sm:rounded-2xl sm:text-xl">
                🏟️
              </div>

              <p className="mt-4 text-xs font-medium text-slate-400 sm:text-sm">
                No hay torneos activos disponibles.
              </p>
            </div>
          ) : (
            /*
            |--------------------------------------------------------------------------
            | ACORDEÓN
            |--------------------------------------------------------------------------
            |
            | Una sola columna.
            | 100% del ancho.
            | Una sola sección abierta a la vez.
            |
            */

            <div className="flex w-full flex-col gap-4 lg:gap-6">
              {tournaments.map((tournament) => {
                const tournamentId =
                  tournament.tournament.id;

                return (
                  <TournamentCard
                    key={tournamentId}
                    tournament={tournament}
                    isExpanded={
                      expandedTournamentId === tournamentId
                    }
                    onToggle={() =>
                      toggleTournament(tournamentId)
                    }
                    onSelectTeam={(row, recentForm) =>
                      setSelectedTeam({
                        row,
                        recentForm,
                      })
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Modal del equipo */}

      <TeamModal
        selection={selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </main>
  );
}
