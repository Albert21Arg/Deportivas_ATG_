import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

export default function TournamentWorkspacePage() {
  const { id } = useParams();
  const { notify } = useNotifications();

  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTournament() {
      try {
        const { data } = await api.get(`/tournaments/${id}`);
        setTournament(data.data.tournament);
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadTournament();
  }, [id, notify]);

  if (isLoading) {
    return (
      <main className="lm-ready min-h-screen bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">
        <DashboardNavbar />

        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 sm:px-6">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] sm:h-14 sm:w-14 sm:rounded-2xl">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-emerald-400 sm:h-5 sm:w-5" />
            </div>

            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400 sm:mt-5">
              Cargando torneo...
            </p>

            <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
              Preparando tu espacio de gestión
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="lm-ready min-h-screen bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">
        <DashboardNavbar />

        <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.025] p-6 text-center sm:rounded-3xl sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/[0.05] text-xl sm:h-16 sm:w-16 sm:rounded-2xl sm:text-2xl">
              !
            </div>

            <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white sm:mt-5 sm:text-xl">
              No encontramos este torneo
            </h1>

            <p className="mt-2 text-xs leading-6 text-slate-500 sm:text-sm">
              El torneo puede haber sido eliminado o no tienes acceso
              a este espacio.
            </p>

            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 sm:mt-6"
              to="/dashboard/tournaments"
            >
              ← Volver a torneos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const tournamentId = String(tournament.id);
  const isActive = tournament.status === 'ACTIVE';

  const sections = [
    {
      to: `/dashboard/teams?tournamentId=${tournamentId}`,
      title: 'Equipos',
      description:
        'Crea, organiza y administra todos los equipos que participan en la competencia.',
      icon: '⚽',
      number: '01',
      color: 'emerald',
    },
    {
      to: `/dashboard/matches?tournamentId=${tournamentId}`,
      title: 'Partidos',
      description:
        'Programa encuentros, consulta el calendario y gestiona cada jornada.',
      icon: '🏟️',
      number: '02',
      color: 'cyan',
    },
    ...(tournament.mode === 'ROUND_ROBIN'
      ? [
          {
            to: `/dashboard/standings?tournamentId=${tournamentId}`,
            title: 'Tabla de posiciones',
            description:
              'Consulta la clasificación y sigue el rendimiento de los equipos.',
            icon: '📊',
            number: '03',
            color: 'violet',
          },
        ]
      : tournament.mode === 'GROUP_STAGE'
        ? [
            {
              to: `/dashboard/groups?tournamentId=${tournamentId}`,
              title: 'Bombos y grupos',
              description:
                'Organiza los bombos, asigna los equipos y revisa cada grupo.',
              icon: '🎱',
              number: '03',
              color: 'cyan',
            },
          ]
        : [
            {
              to: `/dashboard/bracket?tournamentId=${tournamentId}`,
              title: 'Llaves de eliminación',
              description:
                'Arma cada llave con sus equipos y sigue el avance de los cruces.',
              icon: '🏆',
              number: '03',
              color: 'violet',
            },
          ]),
    {
      to: `/dashboard/goleadores?tournamentId=${tournamentId}`,
      title: 'Goleadores',
      description:
        'Consulta el ranking de goles anotados por cada jugador del torneo.',
      icon: '⚽',
      number: '04',
      color: 'emerald',
    },
    {
      to: `/dashboard/tarjetas?tournamentId=${tournamentId}`,
      title: 'Multas por tarjetas',
      description:
        'Revisa por equipo quién tiene tarjetas pendientes y marca los pagos.',
      icon: '🟨',
      number: '05',
      color: 'amber',
    },
  ];

  const colorStyles = {
    emerald: {
      icon: 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-600 dark:text-emerald-400 group-hover:border-emerald-400/30 group-hover:bg-emerald-400/[0.10]',
      glow: 'bg-emerald-400/[0.08]',
      border: 'hover:border-emerald-400/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      cta: 'border-emerald-400/20 bg-emerald-400/[0.07] group-hover:border-emerald-400/30 group-hover:bg-emerald-400/[0.13]',
    },

    cyan: {
      icon: 'border-cyan-400/15 bg-cyan-400/[0.06] text-slate-900 dark:text-cyan-400 group-hover:border-cyan-400/30 group-hover:bg-cyan-400/[0.10]',
      glow: 'bg-cyan-400/[0.07]',
      border: 'hover:border-cyan-400/30',
      text: 'text-slate-900 dark:text-cyan-400',
      cta: 'border-cyan-400/20 bg-cyan-400/[0.07] group-hover:border-cyan-400/30 group-hover:bg-cyan-400/[0.13]',
    },

    violet: {
      icon: 'border-violet-400/15 bg-violet-400/[0.06] text-violet-600 dark:text-violet-400 group-hover:border-violet-400/30 group-hover:bg-violet-400/[0.10]',
      glow: 'bg-violet-400/[0.07]',
      border: 'hover:border-violet-400/30',
      text: 'text-violet-600 dark:text-violet-400',
      cta: 'border-violet-400/20 bg-violet-400/[0.07] group-hover:border-violet-400/30 group-hover:bg-violet-400/[0.13]',
    },

    amber: {
      icon: 'border-amber-400/15 bg-amber-400/[0.06] text-amber-600 dark:text-amber-400 group-hover:border-amber-400/30 group-hover:bg-amber-400/[0.10]',
      glow: 'bg-amber-400/[0.07]',
      border: 'hover:border-amber-400/30',
      text: 'text-amber-600 dark:text-amber-400',
      cta: 'border-amber-400/20 bg-amber-400/[0.07] group-hover:border-amber-400/30 group-hover:bg-amber-400/[0.13]',
    },
  };

  return (
    <main className="lm-ready min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">

      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-emerald-500/[0.055] blur-3xl" />

        <div className="absolute right-[-160px] top-[15%] h-[420px] w-[420px] rounded-full bg-cyan-500/[0.03] blur-3xl" />

        <div className="absolute bottom-[-180px] left-[35%] h-[420px] w-[420px] rounded-full bg-violet-500/[0.025] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <DashboardNavbar />

      {/* =========================================================
          CONTENT
      ========================================================= */}

      <section className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">

        {/* =======================================================
            TOURNAMENT HERO
        ======================================================= */}

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-transparent shadow-xl shadow-black/20 sm:mt-6 sm:rounded-3xl sm:shadow-2xl">

          {/* Desktop glows */}

          <div className="pointer-events-none absolute -right-32 -top-32 hidden h-[420px] w-[420px] rounded-full bg-emerald-400/[0.07] blur-3xl sm:block" />

          <div className="pointer-events-none absolute bottom-[-120px] left-[45%] hidden h-64 w-64 rounded-full bg-cyan-400/[0.035] blur-3xl sm:block" />

          <div className="relative p-4 sm:p-7 md:p-9 lg:p-10">

            {/* META */}

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 sm:gap-2 sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.7)]" />

                Espacio del torneo
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] sm:gap-2 sm:px-3 sm:text-[10px] sm:tracking-[0.15em] ${
                  isActive
                    ? 'border-emerald-400/15 bg-emerald-400/[0.035] text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.025] text-slate-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.7)]'
                      : 'bg-slate-600'
                  }`}
                />

                {isActive ? 'Activo' : 'Inactivo'}
              </span>

            </div>

            {/* TITLE */}

            <div className="mt-5 max-w-4xl sm:mt-7">

              <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl lg:text-6xl">
                {tournament.name}
              </h1>

              <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-500 dark:text-slate-400 sm:mt-5 sm:text-base sm:leading-7">
                {tournament.description ||
                  'Gestiona equipos, calendario y clasificación desde este espacio.'}
              </p>

            </div>

            {/* DIVIDER */}

            <div className="my-5 h-px bg-gradient-to-r from-white/[0.07] via-white/[0.03] to-transparent sm:my-8" />

            {/* QUICK INFO */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5" />

          </div>
        </div>

        {/* =======================================================
            SECTION HEADER
        ======================================================= */}

        <div className="mb-5 mt-8 sm:mb-6 sm:mt-12" />

        {/* =======================================================
            MODULE CARDS
        ======================================================= */}

        <div className="grid gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">

          {sections.map((section) => {
            const styles = colorStyles[section.color];

            return (
              <Link
                key={section.title}
                to={section.to}
                className={`group relative min-h-[245px] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/95 p-4 shadow-lg shadow-black/15 transition-all duration-300 ease-out
                  hover:-translate-y-2
                  hover:border-slate-300 hover:dark:border-white/[0.12]
                  hover:bg-slate-50 hover:dark:bg-[#0c141e]
                  hover:shadow-2xl
                  hover:shadow-black/40
                  sm:min-h-[310px]
                  sm:rounded-3xl
                  sm:p-6
                  lg:min-h-[330px]
                  lg:p-7
                  ${styles.border}`}
              >

                {/* =================================================
                    HOVER GLOW
                ================================================= */}

                <div
                  className={`pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full ${styles.glow} blur-3xl opacity-0 transition-all duration-500 group-hover:scale-125 group-hover:opacity-100`}
                />

                {/* =================================================
                    HOVER GRADIENT
                ================================================= */}

                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.025] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                {/* =================================================
                    NUMBER
                ================================================= */}

                <span className="absolute right-4 top-4 text-4xl font-black tracking-tighter text-slate-900 dark:text-white/[0.025] transition-all duration-300 group-hover:text-slate-900 group-hover:dark:text-white/[0.05] sm:right-6 sm:top-6 sm:text-5xl">
                  {section.number}
                </span>

                <div className="relative flex h-full flex-col">

                  {/* =================================================
                      ICON
                  ================================================= */}

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition-all duration-300 ease-out
                      group-hover:scale-110
                      group-hover:rotate-2
                      sm:h-14
                      sm:w-14
                      sm:rounded-2xl
                      sm:text-xl
                      lg:h-16
                      lg:w-16
                      lg:text-2xl
                      ${styles.icon}`}
                  >
                    {section.icon}
                  </div>

                  {/* =================================================
                      CONTENT
                  ================================================= */}

                  <div className="mt-5 sm:mt-7 lg:mt-8">

                    <h3 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white transition-transform duration-300 group-hover:translate-x-1 sm:mt-2 sm:text-xl lg:text-2xl">
                      {section.title}
                    </h3>

                    <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500 transition-colors duration-300 group-hover:text-slate-500 group-hover:dark:text-slate-400 sm:mt-3 sm:text-sm sm:leading-6">
                      {section.description}
                    </p>

                  </div>

                  {/* =================================================
                      CTA
                  ================================================= */}

                  <div className="mt-auto pt-5 sm:pt-7 lg:pt-8">

                    <div
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-300 sm:px-5 sm:py-3 sm:text-sm ${styles.text} ${styles.cta}`}
                    >
                      Abrir
                      <span className="hidden sm:inline">
                        módulo
                      </span>

                      <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                        →
                      </span>
                    </div>

                    <div className="mt-3 h-px w-full bg-gradient-to-r from-white/[0.06] to-transparent transition-all duration-300 group-hover:from-white/[0.12] sm:mt-4" />

                  </div>

                </div>

              </Link>
            );
          })}

        </div>

      </section>
    </main>
  );
}
