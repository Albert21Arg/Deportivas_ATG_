import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import DashboardNavbar from '../components/DashboardNavbar.jsx';

// Mismo look que la tabla pública de "Tabla de posiciones" (torneos todos
// contra todos): sin difuminar por pago vencido, el admin siempre ve los
// datos reales.
function TeamLogo({ team, size = 'h-9 w-9' }) {
  if (!team?.logo) {
    return (
      <div
        className={`flex ${size} shrink-0 items-center justify-center text-xs text-slate-400`}
        aria-label={`Sin escudo para ${team?.name ?? 'equipo'}`}
      >
        ⚽
      </div>
    );
  }

  return (
    <img
      className={`${size} shrink-0 object-contain`}
      src={team.logo}
      alt={`Escudo de ${team.name}`}
    />
  );
}

export default function StandingsPage() {
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    searchParams.get('tournamentId') ?? ''
  );
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTournamentLocked = Boolean(searchParams.get('tournamentId'));

  const selectedTournament = tournaments.find(
    (tournament) => String(tournament.id) === selectedTournamentId
  );

  useEffect(() => {
    async function loadTournaments() {
      try {
        const { data } = await api.get('/tournaments');

        const loadedTournaments = data.data.tournaments;

        setTournaments(loadedTournaments);

        setSelectedTournamentId((current) =>
          current || String(loadedTournaments[0]?.id ?? '')
        );
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadTournaments();
  }, [notify]);

  useEffect(() => {
    if (!selectedTournamentId) {
      setStandings([]);
      return;
    }

    async function loadStandings() {
      setIsLoading(true);

      try {
        const { data } = await api.get(
          `/tournaments/${selectedTournamentId}/standings`
        );

        setStandings(data.data.standings);
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadStandings();
  }, [notify, selectedTournamentId]);

  const tournamentName = selectedTournament?.name || 'Torneo';
  const teamCount = standings.length;

  return (
    <main
      className="
        lm-ready
        min-h-screen
        overflow-x-hidden
        bg-slate-50
        dark:bg-[#070b12]
        px-3
        pb-8
        pt-20
        text-slate-900
        dark:text-slate-100
        sm:px-5
        sm:pb-12
        sm:pt-24
        lg:px-8
        lg:pb-16
        lg:pt-28
      "
    >
      <DashboardNavbar />

      <section className="mx-auto w-full max-w-[1440px]">

        {/* =====================================================
            VOLVER
        ===================================================== */}
        <Link
          className="
            group
            inline-flex
            min-h-10
            items-center
            gap-2
            text-xs
            font-medium
            text-slate-500
            transition
            hover:text-emerald-600 hover:dark:text-emerald-400
            sm:text-sm
          "
          to={selectedTournamentId ? `/dashboard/tournaments/${selectedTournamentId}` : '/dashboard/tournaments'}
        >
          <span className="text-base transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>

          Volver al torneo
        </Link>

        {/* =====================================================
            HEADER
        ===================================================== */}
        <div
          className="
            relative
            mt-4
            overflow-hidden
            rounded-2xl
            border
            border-slate-200 dark:border-white/[0.06]
            bg-gradient-to-br
            from-white via-white to-emerald-50/60
            dark:from-slate-900
            dark:via-slate-900
            dark:to-emerald-950/30
            p-4
            shadow-lg
            shadow-black/5
            dark:shadow-xl
            dark:shadow-black/15
            sm:mt-6
            sm:rounded-3xl
            sm:p-7
            md:p-8
            lg:p-9
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-24
              -top-24
              hidden
              h-64
              w-64
              rounded-full
              bg-emerald-400/[0.07]
              blur-3xl
              sm:block
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-32
              left-1/3
              hidden
              h-64
              w-64
              rounded-full
              bg-cyan-400/[0.035]
              blur-3xl
              lg:block
            "
          />

          <div className="relative">

            <div
              className="
                mb-3
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-emerald-400/20
                bg-emerald-400/[0.07]
                px-2.5
                py-1.5
                text-[9px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-emerald-700 dark:text-emerald-300
                sm:mb-4
                sm:px-3
                sm:text-xs
                sm:tracking-[0.18em]
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />

              Fase 8 · Competición
            </div>

            <h1
              className="
                max-w-6xl
                text-[clamp(1.45rem,6vw,3rem)]
                font-black
                leading-[1.1]
                tracking-tight
                text-slate-900 dark:text-white
              "
            >
              Tabla de posiciones

              <span className="mx-1.5 font-normal text-slate-600 sm:mx-2">
                |
              </span>

              <span className="text-slate-700 dark:text-slate-300">
                {tournamentName}
              </span>

              <span className="mx-1.5 font-normal text-slate-600 sm:mx-2">
                |
              </span>

              <span className="whitespace-nowrap text-slate-500">
                {teamCount} equipos
              </span>
            </h1>

            <p
              className="
                mt-2
                max-w-2xl
                text-xs
                leading-5
                text-slate-500 dark:text-slate-400
                sm:mt-3
                sm:text-base
                sm:leading-6
              "
            >
              Clasificación actual del torneo según los partidos
              finalizados.
            </p>
          </div>
        </div>

        {/* =====================================================
            SELECTOR
        ===================================================== */}
        {!isTournamentLocked && (
          <div className="mt-5 w-full sm:mt-6 sm:max-w-md">
            <label className="block">
              <span
                className="
                  mb-2
                  block
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-slate-500
                  sm:text-xs
                "
              >
                Seleccionar torneo
              </span>

              <select
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-slate-200 dark:border-slate-800
                  bg-white dark:bg-slate-900
                  px-3.5
                  py-2.5
                  text-sm
                  font-medium
                  text-slate-700 dark:text-slate-200
                  outline-none
                  transition
                  focus:border-emerald-400/50
                  focus:ring-2
                  focus:ring-emerald-400/10
                  sm:px-4
                  sm:py-3
                "
                value={selectedTournamentId}
                onChange={(event) =>
                  setSelectedTournamentId(event.target.value)
                }
              >
                <option value="">Selecciona un torneo</option>

                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* =====================================================
            TABLA
        ===================================================== */}
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10 sm:mt-6 sm:rounded-2xl">
          {isLoading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center sm:min-h-[280px] sm:p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-emerald-400 sm:h-8 sm:w-8" />

              <p className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">
                Calculando tabla...
              </p>
            </div>
          ) : standings.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center sm:min-h-[280px] sm:p-12">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg sm:h-12 sm:w-12">
                🏟️
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-sm">
                No hay equipos asociados a este torneo.
              </p>
            </div>
          ) : (
            <>
              {/* =================================================
                  TABLA DESKTOP
              ================================================= */}
              <div className="scroll-invisible hidden max-h-[31rem] w-full overflow-y-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                      <th className="w-20 px-4 py-3.5 text-center">Pos</th>
                      <th className="px-4 py-3.5 text-left">Equipo</th>
                      <th className="px-2 py-3.5 text-center">PJ</th>
                      <th className="px-2 py-3.5 text-center text-amber-400">🟨</th>
                      <th className="px-2 py-3.5 text-center text-red-400">🟥</th>
                      <th className="px-2 py-3.5 text-center text-blue-400">🟦</th>
                      <th className="px-2 py-3.5 text-center">GF</th>
                      <th className="px-2 py-3.5 text-center">GC</th>
                      <th className="px-2 py-3.5 text-center">DG</th>
                      <th className="px-3 py-3.5 text-center text-emerald-500">PTS</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {standings.map((row) => {
                      const isLeader = row.position === 1;
                      const isSecond = row.position === 2;
                      const isThird = row.position === 3;

                      return (
                        <tr
                          key={row.team.id}
                          className={`group transition-colors ${
                            isLeader
                              ? 'border-l-2 border-amber-400 bg-amber-400/[0.06]'
                              : isSecond
                                ? 'border-l-2 border-slate-400/40 bg-slate-900/[0.02] dark:bg-white/[0.015]'
                                : 'hover:bg-slate-50 dark:hover:bg-white/[0.025]'
                          }`}
                        >
                          <td className="px-4 py-3.5 text-center">
                            {isLeader || isSecond || isThird ? (
                              <span
                                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black shadow-lg ${
                                  isLeader
                                    ? 'bg-amber-400 text-slate-950 shadow-amber-400/10'
                                    : isSecond
                                      ? 'bg-slate-300 text-slate-900'
                                      : 'bg-orange-400 text-slate-950'
                                }`}
                              >
                                {row.position}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-slate-600">{row.position}</span>
                            )}
                          </td>

                          <td className="relative px-4 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative shrink-0">
                                <TeamLogo team={row.team} size="h-11 w-11" />

                                {isLeader && (
                                  <span
                                    className="absolute -right-2 -top-3 z-10 text-base leading-none drop-shadow-[0_0_7px_rgba(251,191,36,0.8)]"
                                    aria-label="Primer lugar"
                                  >
                                    👑
                                  </span>
                                )}

                                {isSecond && (
                                  <span className="absolute -right-2 -top-3 z-10 text-sm leading-none" aria-label="Segundo lugar">
                                    🥈
                                  </span>
                                )}
                              </div>

                              <span
                                className={`min-w-0 truncate font-semibold ${
                                  isLeader
                                    ? 'text-amber-600 dark:text-amber-100'
                                    : isSecond
                                      ? 'text-slate-700 dark:text-slate-200'
                                      : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {row.team.name}
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-3.5 text-center text-slate-500 dark:text-slate-500">{row.played}</td>
                          <td className="px-2 py-3.5 text-center text-amber-600 dark:text-amber-300">{row.yellowCards}</td>
                          <td className="px-2 py-3.5 text-center text-red-600 dark:text-red-300">{row.redCards}</td>
                          <td className="px-2 py-3.5 text-center text-blue-600 dark:text-blue-300">{row.blueCards}</td>
                          <td className="px-2 py-3.5 text-center text-slate-500 dark:text-slate-500">{row.goalsFor}</td>
                          <td className="px-2 py-3.5 text-center text-slate-500 dark:text-slate-500">{row.goalsAgainst}</td>

                          <td
                            className={`px-2 py-3.5 text-center font-semibold ${
                              row.goalDifference > 0
                                ? isLeader
                                  ? 'text-amber-600 dark:text-amber-300'
                                  : 'text-emerald-600 dark:text-emerald-400'
                                : row.goalDifference < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500 dark:text-slate-500'
                            }`}
                          >
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>

                          <td
                            className={`px-3 py-3.5 text-center text-sm font-black ${
                              isLeader
                                ? 'text-amber-600 dark:text-amber-300'
                                : isSecond
                                  ? 'text-slate-800 dark:text-slate-100'
                                  : 'text-emerald-600 dark:text-emerald-300'
                            }`}
                          >
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  TABLA MÓVIL
              ================================================= */}
              <div className="scroll-invisible max-h-[25rem] w-full overflow-y-auto sm:hidden">
                <table className="w-full table-fixed text-xs">
                  <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                    <tr className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">
                      <th className="w-[38px] px-0.5 py-2.5 text-center">Pos</th>
                      <th className="px-1 py-2.5 text-left">Equipo</th>
                      <th className="w-[38px] px-0.5 py-2.5 text-center">PJ</th>
                      <th className="w-[44px] px-0.5 py-2.5 text-center">DG</th>
                      <th className="w-[44px] px-0.5 py-2.5 text-center text-emerald-500">PTS</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.035]">
                    {standings.map((row) => {
                      const isLeader = row.position === 1;
                      const isSecond = row.position === 2;
                      const isThird = row.position === 3;

                      return (
                        <tr
                          key={row.team.id}
                          className={`group outline-none transition-colors ${
                            isLeader
                              ? 'border-l-2 border-amber-400 bg-amber-400/[0.045]'
                              : isSecond
                                ? 'border-l-2 border-slate-400/40 bg-slate-900/[0.02] dark:bg-white/[0.015]'
                                : ''
                          }`}
                        >
                          <td className="px-0.5 py-3 text-center">
                            {isLeader || isSecond || isThird ? (
                              <span
                                className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-black ${
                                  isLeader
                                    ? 'bg-amber-400 text-slate-950'
                                    : isSecond
                                      ? 'bg-slate-300 text-slate-900'
                                      : 'bg-orange-400 text-slate-950'
                                }`}
                              >
                                {row.position}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-600">{row.position}</span>
                            )}
                          </td>

                          <td className="relative min-w-0 px-1 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="relative shrink-0">
                                <TeamLogo team={row.team} size="h-9 w-9" />

                                {isLeader && (
                                  <span className="absolute -right-2 -top-3 z-10 text-xs leading-none" aria-label="Primer lugar">
                                    👑
                                  </span>
                                )}

                                {isSecond && (
                                  <span className="absolute -right-2 -top-3 z-10 text-xs leading-none" aria-label="Segundo lugar">
                                    🥈
                                  </span>
                                )}
                              </div>

                              <span
                                className={`min-w-0 truncate text-[11px] font-semibold ${
                                  isLeader
                                    ? 'text-amber-600 dark:text-amber-100'
                                    : isSecond
                                      ? 'text-slate-700 dark:text-slate-200'
                                      : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {row.team.name}
                              </span>
                            </div>
                          </td>

                          <td className="px-0.5 py-3 text-center text-[10px] font-medium text-slate-500 dark:text-slate-500">{row.played}</td>

                          <td
                            className={`px-0.5 py-3 text-center text-[10px] font-semibold ${
                              row.goalDifference > 0
                                ? isLeader
                                  ? 'text-amber-600 dark:text-amber-300'
                                  : 'text-emerald-600 dark:text-emerald-400'
                                : row.goalDifference < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500 dark:text-slate-500'
                            }`}
                          >
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>

                          <td
                            className={`px-0.5 py-3 text-center text-xs font-black ${
                              isLeader
                                ? 'text-amber-600 dark:text-amber-300'
                                : isSecond
                                  ? 'text-slate-800 dark:text-slate-100'
                                  : 'text-emerald-600 dark:text-emerald-300'
                            }`}
                          >
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  LEYENDA
              ================================================= */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 sm:px-5 sm:py-3 sm:text-[10px]">
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
            </>
          )}
        </div>
      </section>
    </main>
  );
}
