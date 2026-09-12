import { useEffect, useState } from 'react';
import {
  Megaphone,
  Settings2,
  Sparkles,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

const MODE_LABELS = {
  ROUND_ROBIN: 'Todos contra todos',
  GROUP_STAGE: 'Fase de grupos',
  KNOCKOUT_SINGLE: 'Eliminación directa',
  KNOCKOUT_TWO_LEG: 'Eliminatoria ida y vuelta',
};

const SUPERADMIN_TOOLS = [
  {
    label: 'Administradores',
    description: 'Crea cuentas y asigna responsables a los torneos.',
    to: '/dashboard/admins',
    icon: UserCog,
    color: 'text-cyan-400',
    background: 'bg-cyan-400/10',
  },
  {
    label: 'Torneos',
    description: 'Configura competiciones, estados y datos generales.',
    to: '/dashboard/tournaments',
    icon: Trophy,
    color: 'text-emerald-400',
    background: 'bg-emerald-400/10',
  },
  {
    label: 'Equipos',
    description: 'Administra equipos y sus datos de competición.',
    to: '/dashboard/teams',
    icon: Users,
    color: 'text-amber-400',
    background: 'bg-amber-400/10',
  },
  {
    label: 'Anuncios',
    description: 'Publica avisos visibles para los usuarios.',
    to: '/dashboard/announcements',
    icon: Megaphone,
    color: 'text-rose-400',
    background: 'bg-rose-400/10',
  },
  {
    label: 'Burbujas flotantes',
    description: 'Gestiona los mensajes destacados de la portada.',
    to: '/dashboard/floating-bubbles',
    icon: Sparkles,
    color: 'text-violet-400',
    background: 'bg-violet-400/10',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();

  const [tournaments, setTournaments] = useState([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadTournaments() {
      try {
        const { data } = await api.get('/tournaments');
        setTournaments(data.data.tournaments);
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoadingTournaments(false);
      }
    }

    loadTournaments();
  }, [notify]);

  const filteredTournaments = tournaments.filter((tournament) =>
    tournament.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#060a0f] dark:text-white">

      {/* BACKGROUND DECORATIVO */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-40 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <DashboardNavbar />

      {/* CONTENIDO */}
      <section className="relative mx-auto max-w-7xl px-3 pb-10 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-25 xl:px-25">

        {/* HERO / BIENVENIDA */}
        <div className="relative mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-black/[0.03] via-black/[0.01] to-transparent p-5 shadow-2xl shadow-black/5 dark:border-white/[0.07] dark:from-white/[0.06] dark:via-white/[0.025] dark:shadow-black/20 sm:mb-12 sm:rounded-3xl sm:p-10">

          {/* Glow */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400 sm:mb-5 sm:px-3 sm:text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Panel de control
            </div>

            <h1 className="max-w-3xl text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Hola, {' '}
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {user.name}
              </span>{' '}
              👋
            </h1>

            {/* Línea decorativa */}
            <div className="mt-5 h-px w-20 bg-gradient-to-r from-emerald-400 to-transparent sm:mt-7 sm:w-24" />
          </div>
        </div>

        {user.role === 'SUPERADMIN' && (
          <section className="mb-7 sm:mb-12" aria-labelledby="superadmin-tools-title">
            <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
              <div>
                <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 sm:text-xs">
                  <Settings2 size={14} aria-hidden="true" />
                  Administración global
                </p>

                <h2 id="superadmin-tools-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  Herramientas de superadministrador
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {SUPERADMIN_TOOLS.map(({ label, description, to, icon: Icon, color, background }) => (
                <Link
                  key={to}
                  to={to}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:border-cyan-400/50 dark:border-white/[0.07] dark:bg-white/[0.035] dark:shadow-black/10 dark:hover:bg-white/[0.06] sm:rounded-2xl sm:p-5"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${background} ${color}`}>
                    <Icon size={19} strokeWidth={2} aria-hidden="true" />
                  </span>

                  <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                    {label}
                  </h3>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {description}
                  </p>

                  <span className="mt-4 inline-flex text-xs font-semibold text-cyan-500 transition-transform group-hover:translate-x-1 dark:text-cyan-400">
                    Gestionar →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* TUS TORNEOS */}
        <div className="mb-7 sm:mb-12">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 sm:text-xs">
                Tu competición
              </p>

              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Tus torneos
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Entra directo al torneo que quieres administrar.
              </p>
            </div>

            {tournaments.length > 0 && (
              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar torneo por nombre..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-600"
                />
              </div>
            )}
          </div>

          {isLoadingTournaments ? (
            <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-white/[0.07] dark:bg-white/[0.035] sm:rounded-2xl">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-400 dark:border-slate-700" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-white/[0.02] sm:rounded-2xl">
              <p className="text-sm font-semibold text-slate-500">
                {user.role === 'SUPERADMIN'
                  ? 'Todavía no has creado ningún torneo.'
                  : 'Todavía no tienes torneos asignados.'}
              </p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-white/[0.02] sm:rounded-2xl">
              <p className="text-sm font-semibold text-slate-500">
                {`Ningún torneo coincide con "${searchQuery}".`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {filteredTournaments.map((tournament) => {
                const isActive = tournament.status === 'ACTIVE';

                return (
                  <Link
                    key={tournament.id}
                    to={`/dashboard/tournaments/${tournament.id}`}
                    className="group relative min-w-0 overflow-hidden rounded-xl border border-emerald-300 bg-white p-4 shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/60 hover:bg-slate-50 dark:border-emerald-400/25 dark:bg-white/[0.035] dark:shadow-black/10 dark:hover:border-emerald-400/50 dark:hover:bg-white/[0.06] sm:rounded-2xl sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                          {tournament.name}
                        </h3>

                        <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
                          {MODE_LABELS[tournament.mode] ?? tournament.mode}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-400/10 text-emerald-400'
                            : 'bg-slate-400/10 text-slate-500'
                        }`}
                      >
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      Entrar al torneo
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </section>
    </main>
  );
}
