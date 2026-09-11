import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import DashboardNavbar from '../components/DashboardNavbar.jsx';

const columns = [
  ['played', 'PJ'],
  ['yellowCards', '🟨'],
  ['redCards', '🟥'],
  ['blueCards', '🟦'],
  ['wins', 'PG'],
  ['draws', 'PE'],
  ['losses', 'PP'],
  ['goalsFor', 'GF'],
  ['goalsAgainst', 'GC'],
  ['goalDifference', 'DG'],
  ['points', 'PTS'],
];

const mobileColumns = [
  ['points', 'PTS'],
  ['played', 'PJ'],
  ['yellowCards', '🟨'],
  ['redCards', '🟥'],
  ['blueCards', '🟦'],
  ['wins', 'PG'],
  ['draws', 'PE'],
  ['losses', 'PP'],
  ['goalsFor', 'GF'],
  ['goalsAgainst', 'GC'],
  ['goalDifference', 'DG'],
];

export default function StandingsPage() {
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    searchParams.get('tournamentId') ?? ''
  );
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fila cuyo tooltip está abierto en móvil.
  const [expandedRow, setExpandedRow] = useState(null);

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

  function handleRowClick(row) {
    // Solo reaccionan al toque las dos primeras posiciones.
    if (row.position !== 1 && row.position !== 2) {
      return;
    }

    setExpandedRow((current) =>
      current === row.team.id ? null : row.team.id
    );
  }

  return (
    <main
      className="
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
            hover:text-emerald-400
            sm:text-sm
          "
          to="/dashboard"
        >
          <span className="text-base transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>

          Volver al dashboard
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
            border-white/[0.06]
            bg-gradient-to-br
            from-slate-900
            via-slate-900
            to-emerald-950/30
            p-4
            shadow-xl
            shadow-black/15
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
                text-emerald-300
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
                text-white
              "
            >
              Tabla de posiciones

              <span className="mx-1.5 font-normal text-slate-600 sm:mx-2">
                |
              </span>

              <span className="text-slate-300">
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
                text-slate-400
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
                  border-slate-800
                  bg-slate-900
                  px-3.5
                  py-2.5
                  text-sm
                  font-medium
                  text-slate-200
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
        <div
          className="
            mt-5
            overflow-hidden
            rounded-xl
            border
            border-slate-800
            bg-slate-900
            shadow-lg
            shadow-black/10
            sm:mt-6
            sm:rounded-2xl
          "
        >
          {isLoading ? (
            <div
              className="
                flex
                min-h-[220px]
                flex-col
                items-center
                justify-center
                p-8
                text-center
                sm:min-h-[280px]
                sm:p-12
              "
            >
              <div
                className="
                  h-7
                  w-7
                  animate-spin
                  rounded-full
                  border-2
                  border-slate-700
                  border-t-emerald-400
                  sm:h-8
                  sm:w-8
                "
              />

              <p className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">
                Calculando tabla...
              </p>
            </div>
          ) : standings.length === 0 ? (
            <div
              className="
                flex
                min-h-[220px]
                flex-col
                items-center
                justify-center
                p-8
                text-center
                sm:min-h-[280px]
                sm:p-12
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-800
                  text-lg
                  sm:h-12
                  sm:w-12
                "
              >
                🏟️
              </div>

              <p
                className="
                  mt-3
                  text-xs
                  font-medium
                  text-slate-400
                  sm:mt-4
                  sm:text-sm
                "
              >
                No hay equipos asociados a este torneo.
              </p>
            </div>
          ) : (
            <div className="scroll-invisible max-h-[31rem] overflow-auto">

              {/* =================================================
                  TABLA MÓVIL
                  EQUIPO + PTS FIJOS
                  RESTO CON SCROLL
              ================================================= */}
              <div className="relative sm:hidden">
                <table
                  className="
                    w-full
                    min-w-[900px]
                    text-left
                    text-xs
                  "
                >
                  <thead className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950">
                    <tr
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.14em]
                        text-slate-500
                      "
                    >
                      {/* EQUIPO FIJO */}
                      <th
                        className="
                          sticky
                          left-0
                          z-30
                          w-[170px]
                          min-w-[170px]
                          bg-slate-950
                          px-2
                          py-3
                          text-left
                        "
                      >
                        Equipo
                      </th>

                      {/* PTS FIJO */}
                      <th
                        className="
                          sticky
                          left-[170px]
                          z-30
                          w-[56px]
                          min-w-[56px]
                          border-l
                          border-slate-800
                          bg-slate-950
                          px-2
                          py-3
                          text-center
                          text-emerald-400
                        "
                      >
                        PTS
                      </th>

                      {/* RESTO */}
                      {mobileColumns
                        .filter(([key]) => key !== 'points')
                        .map(([, label]) => (
                          <th
                            className="
                              min-w-[56px]
                              px-2
                              py-3
                              text-center
                            "
                            key={label}
                          >
                            {label}
                          </th>
                        ))}

                      {/* POSICIÓN */}
                      <th
                        className="
                          min-w-[56px]
                          px-2
                          py-3
                          text-center
                        "
                      >
                        Pos
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/70">
                    {standings.map((row, index) => {
                      const isLeader = row.position === 1;
                      const isSecond = row.position === 2;
                      const isTopTwo = isLeader || isSecond;
                      const isTopThree = row.position <= 3;
                      const isExpanded = expandedRow === row.team.id;

                      return (
                        <tr
                          key={row.team.id}
                          onClick={() => handleRowClick(row)}
                          className={`
                            group
                            relative
                            ${index === 0 ? 'sticky top-[42px] z-10 bg-slate-900' : ''}
                            transition-colors
                            duration-150
                            ${
                              isTopTwo
                                ? 'cursor-pointer'
                                : ''
                            }
                            ${
                              isLeader
                                ? `
                                  border-l-2
                                  border-amber-400
                                  bg-gradient-to-r
                                  from-amber-400/[0.12]
                                  via-amber-400/[0.045]
                                  to-transparent
                                  hover:from-amber-400/[0.17]
                                `
                                : isSecond
                                  ? `
                                    border-l-2
                                    border-slate-300/40
                                    bg-gradient-to-r
                                    from-slate-300/[0.07]
                                    via-slate-300/[0.025]
                                    to-transparent
                                    hover:from-slate-300/[0.11]
                                  `
                                  : 'hover:bg-slate-800/40'
                            }
                          `}
                        >
                          {/* =================================================
                              EQUIPO FIJO
                          ================================================= */}
                          <td
                            className={`
                              sticky
                              left-0
                              z-40
                              w-[170px]
                              min-w-[170px]
                              px-2
                              py-3
                              ${
                                isLeader
                                  ? 'bg-[#17150f]'
                                  : isSecond
                                    ? 'bg-[#12151a]'
                                    : 'bg-slate-900'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="relative shrink-0">
                                {row.team.logo ? (
                                  <img
                                    className={`
                                      h-8
                                      w-8
                                      rounded-lg
                                      object-cover
                                      ${
                                        isLeader
                                          ? `
                                            ring-2
                                            ring-amber-400/50
                                            shadow-[0_0_18px_rgba(251,191,36,0.2)]
                                          `
                                          : isSecond
                                            ? 'ring-2 ring-slate-300/30'
                                            : 'ring-1 ring-white/5'
                                      }
                                    `}
                                    src={row.team.logo}
                                    alt={`Logo de ${row.team.name}`}
                                  />
                                ) : (
                                  <div
                                    className={`
                                      flex
                                      h-8
                                      w-8
                                      items-center
                                      justify-center
                                      rounded-lg
                                      bg-slate-800
                                      text-[10px]
                                      font-semibold
                                      ${
                                        isLeader
                                          ? 'ring-2 ring-amber-400/40'
                                          : isSecond
                                            ? 'ring-2 ring-slate-300/30'
                                            : ''
                                      }
                                    `}
                                    aria-hidden="true"
                                  >
                                    {row.team.name
                                      ?.slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}

                                {/* =================================================
                                    CORONA
                                ================================================= */}
                                {isLeader && (
                                  <>
                                    <span
                                      className="
                                        absolute
                                        -right-2
                                        -top-3
                                        z-50
                                        text-base
                                        leading-none
                                        drop-shadow-[0_0_6px_rgba(251,191,36,0.75)]
                                      "
                                      title="Primer lugar"
                                      aria-label="Primer lugar"
                                    >
                                      👑
                                    </span>

                                    {/* =================================================
                                        TEXTO FLOTANTE MÓVIL
                                    ================================================= */}
                                    <div
                                      className={`
                                        pointer-events-none
                                        absolute
                                        bottom-full
                                        left-0
                                        z-[9999999]
                                        mb-3
                                        w-max
                                        max-w-[190px]
                                        translate-x-0
                                        rounded-lg
                                        border
                                        border-amber-400/20
                                        bg-slate-800/95
                                        px-2.5
                                        py-1.5
                                        text-[10px]
                                        font-semibold
                                        text-amber-100
                                        shadow-xl
                                        shadow-black/40
                                        backdrop-blur-md
                                        transition-all
                                        duration-200
                                        sm:hidden
                                        ${
                                          isExpanded
                                            ? 'translate-y-0 opacity-100'
                                            : 'translate-y-1 opacity-0'
                                        }
                                      `}
                                    >
                                      Hace frío aquí arriba ❄️

                                      <span
                                        className="
                                          absolute
                                          -bottom-1
                                          left-5
                                          h-2
                                          w-2
                                          rotate-45
                                          border-r
                                          border-b
                                          border-amber-400/20
                                          bg-slate-800
                                        "
                                      />
                                    </div>
                                  </>
                                )}

                                {/* =================================================
                                    SEGUNDO PUESTO — TEXTO FLOTANTE MÓVIL
                                ================================================= */}
                                {isSecond && (
                                  <div
                                    className={`
                                      pointer-events-none
                                      absolute
                                      bottom-full
                                      left-0
                                      z-[9999999]
                                      mb-3
                                      w-max
                                      max-w-[180px]
                                      translate-x-0
                                      rounded-lg
                                      border
                                      border-slate-300/15
                                      bg-slate-800/95
                                      px-2.5
                                      py-1.5
                                      text-[10px]
                                      font-semibold
                                      text-slate-200
                                      shadow-xl
                                      shadow-black/40
                                      backdrop-blur-md
                                      transition-all
                                      duration-200
                                      sm:hidden
                                      ${
                                        isExpanded
                                          ? 'translate-y-0 opacity-100'
                                          : 'translate-y-1 opacity-0'
                                      }
                                    `}
                                  >
                                    Segundo lugar

                                    <span
                                      className="
                                        absolute
                                        -bottom-1
                                        left-5
                                        h-2
                                        w-2
                                        rotate-45
                                        border-r
                                        border-b
                                        border-slate-300/15
                                        bg-slate-800
                                      "
                                    />
                                  </div>
                                )}
                              </div>

                              {/* NOMBRE DEL EQUIPO */}
                              <span
                                className={`
                                  min-w-0
                                  truncate
                                  text-xs
                                  font-semibold
                                  ${
                                    isLeader
                                      ? 'text-amber-100'
                                      : isSecond
                                        ? 'text-slate-200'
                                        : 'text-slate-300 group-hover:text-white'
                                  }
                                `}
                                title={row.team.name}
                              >
                                {row.team.name}
                              </span>
                            </div>
                          </td>

                          {/* =================================================
                              PTS FIJO
                          ================================================= */}
                          <td
                            className={`
                              sticky
                              left-[170px]
                              z-30
                              w-[56px]
                              min-w-[56px]
                              border-l
                              border-slate-800
                              px-2
                              py-3
                              text-center
                              ${
                                isLeader
                                  ? 'bg-[#17150f]'
                                  : isSecond
                                    ? 'bg-[#12151a]'
                                    : 'bg-slate-900'
                              }
                              ${
                                isLeader
                                  ? 'font-black text-amber-300'
                                  : 'font-bold text-emerald-300'
                              }
                            `}
                          >
                            {row.points}
                          </td>

                          {/* =================================================
                              RESTO DE ESTADÍSTICAS
                          ================================================= */}
                          {mobileColumns
                            .filter(([key]) => key !== 'points')
                            .map(([key]) => {
                              const isGoalDifference =
                                key === 'goalDifference';

                              let valueClass =
                                'text-slate-400';

                              if (
                                isGoalDifference &&
                                row[key] > 0
                              ) {
                                valueClass = isLeader
                                  ? 'font-semibold text-amber-300'
                                  : 'font-semibold text-emerald-400';
                              } else if (
                                isGoalDifference &&
                                row[key] < 0
                              ) {
                                valueClass =
                                  'font-semibold text-rose-400';
                              }

                              return (
                                <td
                                  className={`
                                    min-w-[56px]
                                    whitespace-nowrap
                                    px-2
                                    py-3
                                    text-center
                                    ${valueClass}
                                  `}
                                  key={key}
                                >
                                  {isGoalDifference &&
                                  row[key] > 0
                                    ? `+${row[key]}`
                                    : row[key]}
                                </td>
                              );
                            })}

                          {/* =================================================
                              POSICIÓN
                          ================================================= */}
                          <td className="min-w-[56px] px-2 py-3 text-center">
                            {isTopThree ? (
                              <span
                                className={`
                                  mx-auto
                                  flex
                                  h-7
                                  w-7
                                  items-center
                                  justify-center
                                  rounded-lg
                                  text-[11px]
                                  font-bold
                                  ${
                                    row.position === 1
                                      ? `
                                        bg-amber-400
                                        text-slate-950
                                        shadow-[0_0_16px_rgba(251,191,36,0.35)]
                                      `
                                      : row.position === 2
                                        ? 'bg-slate-300 text-slate-900'
                                        : 'bg-orange-400 text-slate-950'
                                  }
                                `}
                              >
                                {row.position}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {row.position}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  TABLA DESKTOP
              ================================================= */}
              <table
                className="
                  hidden
                  w-full
                  min-w-[820px]
                  text-left
                  text-sm
                  sm:table
                "
              >
                <thead className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950">
                  <tr
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.16em]
                      text-slate-500
                    "
                  >
                    <th
                      className="
                        w-20
                        px-4
                        py-4
                        text-center
                      "
                    >
                      Pos
                    </th>

                    <th
                      className="
                        w-auto
                        min-w-0
                        px-4
                        py-4
                        text-left
                      "
                    >
                      Equipo
                    </th>

                    {columns.map(([, label]) => (
                      <th
                        className="
                          min-w-[56px]
                          px-3
                          py-4
                          text-center
                        "
                        key={label}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70">
                  {standings.map((row, index) => {
                    const isLeader = row.position === 1;
                    const isSecond = row.position === 2;
                    const isTopTwo = isLeader || isSecond;
                    const isTopThree = row.position <= 3;

                    return (
                      <tr
                        key={row.team.id}
                        onClick={() => handleRowClick(row)}
                        className={`
                          group
                          relative
                          ${index === 0 ? 'sticky top-[54px] z-10 bg-slate-900' : ''}
                          transition-colors
                          duration-150
                          ${
                            isTopTwo
                              ? 'cursor-pointer'
                              : ''
                          }
                          ${
                            isLeader
                              ? `
                                border-l-2
                                border-amber-400
                                bg-gradient-to-r
                                from-amber-400/[0.12]
                                via-amber-400/[0.045]
                                to-transparent
                                hover:from-amber-400/[0.17]
                              `
                              : isSecond
                                ? `
                                  border-l-2
                                  border-slate-300/40
                                  bg-gradient-to-r
                                  from-slate-300/[0.07]
                                  via-slate-300/[0.025]
                                  to-transparent
                                  hover:from-slate-300/[0.11]
                                `
                                : 'hover:bg-slate-800/40'
                          }
                        `}
                      >
                        {/* POSICIÓN */}
                        <td
                          className={`
                            px-4
                            py-3.5
                            text-center
                            ${
                              isLeader
                                ? 'bg-[#17150f]'
                                : isSecond
                                  ? 'bg-[#12151a]'
                                  : 'bg-slate-900'
                            }
                            sm:bg-transparent
                          `}
                        >
                          {isTopThree ? (
                            <span
                              className={`
                                mx-auto
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                text-xs
                                font-bold
                                ${
                                  row.position === 1
                                    ? `
                                      bg-amber-400
                                      text-slate-950
                                      shadow-[0_0_16px_rgba(251,191,36,0.35)]
                                    `
                                    : row.position === 2
                                      ? 'bg-slate-300 text-slate-900'
                                      : 'bg-orange-400 text-slate-950'
                                }
                              `}
                            >
                              {row.position}
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-slate-500">
                              {row.position}
                            </span>
                          )}
                        </td>

                        {/* EQUIPO */}
                        <td
                          className={`
                            px-4
                            py-3.5
                            ${
                              isLeader
                                ? 'bg-[#17150f]'
                                : isSecond
                                  ? 'bg-[#12151a]'
                                  : 'bg-slate-900'
                            }
                            sm:bg-transparent
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {row.team.logo ? (
                                <img
                                  className={`
                                    h-9
                                    w-9
                                    rounded-lg
                                    object-cover
                                    ${
                                      isLeader
                                        ? `
                                          ring-2
                                          ring-amber-400/50
                                          shadow-[0_0_18px_rgba(251,191,36,0.2)]
                                        `
                                        : isSecond
                                          ? 'ring-2 ring-slate-300/30'
                                          : 'ring-1 ring-white/5'
                                    }
                                  `}
                                  src={row.team.logo}
                                  alt={`Logo de ${row.team.name}`}
                                />
                              ) : (
                                <div
                                  className={`
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-slate-800
                                    text-xs
                                    font-semibold
                                    ${
                                      isLeader
                                        ? 'ring-2 ring-amber-400/40'
                                        : isSecond
                                          ? 'ring-2 ring-slate-300/30'
                                          : ''
                                    }
                                  `}
                                  aria-hidden="true"
                                >
                                  {row.team.name
                                    ?.slice(0, 2)
                                    .toUpperCase()}
                                </div>
                              )}

                              {isLeader && (
                                <>
                                  <span
                                    className="
                                      absolute
                                      -right-2
                                      -top-3
                                      z-30
                                      text-base
                                      leading-none
                                      drop-shadow-[0_0_6px_rgba(251,191,36,0.75)]
                                    "
                                    title="Primer lugar"
                                    aria-label="Primer lugar"
                                  >
                                    👑
                                  </span>

                                  {/* TOOLTIP DESKTOP */}
                                  <div
                                    className="
                                      pointer-events-none
                                      absolute
                                      bottom-full
                                      left-1/2
                                      z-[9999999]
                                      mb-3
                                      hidden
                                      w-max
                                      max-w-[220px]
                                      -translate-x-1/2
                                      translate-y-1
                                      rounded-xl
                                      border
                                      border-amber-400/20
                                      bg-slate-800
                                      px-3
                                      py-2
                                      text-xs
                                      font-semibold
                                      text-amber-100
                                      opacity-0
                                      shadow-xl
                                      shadow-black/30
                                      transition-all
                                      duration-200
                                      group-hover:translate-y-0
                                      group-hover:opacity-100
                                      sm:block
                                    "
                                  >
                                    Hace frío aquí arriba ❄️

                                    <span
                                      className="
                                        absolute
                                        -bottom-1
                                        left-1/2
                                        h-2
                                        w-2
                                        -translate-x-1/2
                                        rotate-45
                                        border-r
                                        border-b
                                        border-amber-400/20
                                        bg-slate-800
                                      "
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            <span
                              className={`
                                max-w-[300px]
                                truncate
                                text-sm
                                font-semibold
                                ${
                                  isLeader
                                    ? 'text-amber-100'
                                    : isSecond
                                      ? 'text-slate-200'
                                      : 'text-slate-300 group-hover:text-white'
                                }
                              `}
                              title={row.team.name}
                            >
                              {row.team.name}
                            </span>
                          </div>
                        </td>

                        {/* ESTADÍSTICAS */}
                        {columns.map(([key]) => {
                          const isPoints = key === 'points';
                          const isGoalDifference =
                            key === 'goalDifference';

                          let valueClass = 'text-slate-400';

                          if (isPoints) {
                            valueClass = isLeader
                              ? 'font-black text-amber-300'
                              : 'font-bold text-emerald-300';
                          } else if (
                            isGoalDifference &&
                            row[key] > 0
                          ) {
                            valueClass = isLeader
                              ? 'font-semibold text-amber-300'
                              : 'font-semibold text-emerald-400';
                          } else if (
                            isGoalDifference &&
                            row[key] < 0
                          ) {
                            valueClass =
                              'font-semibold text-rose-400';
                          }

                          return (
                            <td
                              className={`
                                min-w-[56px]
                                whitespace-nowrap
                                px-3
                                py-3.5
                                text-center
                                ${valueClass}
                              `}
                              key={key}
                            >
                              {isGoalDifference && row[key] > 0
                                ? `+${row[key]}`
                                : row[key]}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =====================================================
            AYUDA MÓVIL
        ===================================================== */}
        {!isLoading && standings.length > 0 && (
          <p className="mt-2 px-1 text-[9px] text-slate-700 sm:hidden">
            Desliza hacia la derecha para ver las estadísticas.
            Toca el 1.º o 2.º puesto para ver el mensaje.
          </p>
        )}

        {/* =====================================================
            LEYENDA
        ===================================================== */}
        {!isLoading && standings.length > 0 && (
          <div
            className="
              mt-3
              flex
              flex-wrap
              gap-x-4
              gap-y-1.5
              px-1
              text-[10px]
              text-slate-600
              sm:mt-4
              sm:gap-x-5
              sm:gap-y-2
              sm:text-[11px]
            "
          >
            <span>
              <strong className="text-slate-500">PJ</strong>{' '}
              Partidos
            </span>

            <span>
              <strong className="text-slate-500">PG</strong>{' '}
              Ganados
            </span>

            <span>
              <strong className="text-slate-500">PE</strong>{' '}
              Empatados
            </span>

            <span>
              <strong className="text-slate-500">PP</strong>{' '}
              Perdidos
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
              <strong className="text-emerald-400">PTS</strong>{' '}
              Puntos
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
