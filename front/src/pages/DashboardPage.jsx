import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Megaphone,
  Search,
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
    glow: 'bg-cyan-400/10',
  },
  {
    label: 'Torneos',
    description: 'Configura competiciones, estados y datos generales.',
    to: '/dashboard/tournaments',
    icon: Trophy,
    color: 'text-emerald-400',
    background: 'bg-emerald-400/10',
    glow: 'bg-emerald-400/10',
  },
  {
    label: 'Equipos',
    description: 'Administra equipos y sus datos de competición.',
    to: '/dashboard/teams',
    icon: Users,
    color: 'text-amber-400',
    background: 'bg-amber-400/10',
    glow: 'bg-amber-400/10',
  },
  {
    label: 'Anuncios',
    description: 'Publica avisos visibles para los usuarios.',
    to: '/dashboard/announcements',
    icon: Megaphone,
    color: 'text-rose-400',
    background: 'bg-rose-400/10',
    glow: 'bg-rose-400/10',
  },
  {
    label: 'Burbujas flotantes',
    description: 'Gestiona los mensajes destacados de la portada.',
    to: '/dashboard/floating-bubbles',
    icon: Sparkles,
    color: 'text-violet-400',
    background: 'bg-violet-400/10',
    glow: 'bg-violet-400/10',
  },
  {
    label: 'Configuración del sitio',
    description: 'Cambia el ícono de la pestaña del navegador (favicon).',
    to: '/dashboard/site-settings',
    icon: Settings2,
    color: 'text-sky-400',
    background: 'bg-sky-400/10',
    glow: 'bg-sky-400/10',
  },
];

function SectionLabel({ children, color = 'emerald' }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] sm:text-[10px] ${colors[color]}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      {children}
    </span>
  );
}

function ToolCard({
  label,
  description,
  to,
  icon: Icon,
  color,
  background,
  glow,
}) {
  return (
    <Link
      to={to}
      className="
        group relative block overflow-hidden
        rounded-2xl
        border border-slate-200
        bg-white
        shadow-[0_8px_30px_rgba(15,23,42,0.04)]
        transition-all duration-300
        active:scale-[0.98]
        hover:-translate-y-1
        hover:border-cyan-400/40
        hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]
        dark:border-white/[0.07]
        dark:bg-white/[0.035]
        dark:shadow-black/10
        dark:hover:bg-white/[0.055]
      "
    >
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${glow}`}
      />

      {/* Mobile: mosaico tipo app (ícono arriba, etiqueta abajo), sin descripción ni pie "Gestionar". */}
      <div className="relative flex flex-col items-start gap-2 p-3 sm:hidden">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${background} ${color}`}
        >
          <Icon size={17} strokeWidth={2} aria-hidden="true" />
        </span>

        <h3 className="break-words text-left text-xs font-black leading-tight tracking-tight text-slate-900 dark:text-white">
          {label}
        </h3>
      </div>

      {/* Desktop/tablet: card completa con descripción. */}
      <div className="relative hidden p-5 sm:block">
        <div className="flex items-start justify-between">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${background} ${color}`}
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
          </span>

          <ArrowRight
            size={16}
            className="
              text-slate-300
              transition-all duration-300
              group-hover:translate-x-1
              group-hover:text-cyan-400
              dark:text-slate-700
            "
          />
        </div>

        <h3 className="mt-5 text-sm font-black tracking-tight text-slate-900 dark:text-white">
          {label}
        </h3>

        <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400">
          Gestionar
          <ArrowRight
            size={13}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
}

function TournamentCard({ tournament }) {
  const isActive = tournament.status === 'ACTIVE';

  return (
    <Link
      to={`/dashboard/tournaments/${tournament.id}`}
      className="
        group relative block min-w-0 overflow-hidden
        rounded-2xl
        border border-slate-200
        bg-white
        p-4
        shadow-[0_8px_30px_rgba(15,23,42,0.04)]
        transition-all duration-300
        hover:-translate-y-1
        hover:border-emerald-400/50
        hover:shadow-[0_18px_45px_rgba(16,185,129,0.08)]
        dark:border-white/[0.07]
        dark:bg-white/[0.035]
        dark:shadow-black/10
        dark:hover:bg-white/[0.055]
        sm:p-5
      "
    >
      <div
        className={`
          pointer-events-none absolute
          -right-16 -top-16
          h-36 w-36
          rounded-full
          blur-3xl
          transition-opacity duration-300
          ${
            isActive
              ? 'bg-emerald-400/10 opacity-60 group-hover:opacity-100'
              : 'bg-slate-400/5 opacity-30'
          }
        `}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`
                flex h-11 w-11 shrink-0 items-center justify-center
                rounded-xl border
                ${
                  isActive
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400'
                    : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.04]'
                }
              `}
            >
              <Trophy size={19} strokeWidth={2} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white sm:text-base">
                {tournament.name}
              </h3>

              <p className="mt-1 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-[11px]">
                {MODE_LABELS[tournament.mode] ?? tournament.mode}
              </p>
            </div>
          </div>

          <span
            className={`
              flex shrink-0 items-center gap-1.5
              rounded-full
              border
              px-2 py-1
              text-[8px]
              font-black
              uppercase
              tracking-wider
              ${
                isActive
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400'
                  : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-slate-500'
              }
            `}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              }`}
            />

            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="my-5 h-px bg-slate-100 dark:bg-white/[0.05]" />

        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-600">
            Competición
          </span>

          <span
            className="
              inline-flex items-center gap-1.5
              text-[10px] font-bold
              text-emerald-500
              dark:text-emerald-400
            "
          >
            Entrar al torneo
            <ArrowRight
              size={13}
              className="
                transition-transform duration-300
                group-hover:translate-x-1
              "
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

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
    tournament.name
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase())
  );

  return (
    <main
      className="
        min-h-screen
        overflow-hidden
        bg-slate-50
        text-slate-900
        dark:bg-[#060a0f]
        dark:text-white
      "
    >
      {/* BACKGROUND */}

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

      <section
        className="
          relative mx-auto max-w-7xl
          px-3 pb-10 pt-24
          sm:px-6 sm:pb-16 sm:pt-28
          lg:px-8
          xl:px-10
        "
      >
        {/* HERO */}

        <div
          className="
            relative mb-8 overflow-hidden
            rounded-3xl
            border border-slate-200
            bg-white
            shadow-[0_15px_60px_rgba(15,23,42,0.05)]
            dark:border-white/[0.07]
            dark:bg-white/[0.035]
            dark:shadow-black/20
            sm:mb-12
          "
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/[0.06] via-transparent to-cyan-400/[0.04]" />

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />

          <div className="relative p-5 sm:p-10 lg:p-12">
            <SectionLabel>Panel de control</SectionLabel>

            <div className="mt-5 flex flex-col gap-5 sm:mt-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1
                  className="
                    max-w-4xl
                    text-3xl
                    font-black
                    tracking-[-0.04em]
                    text-slate-900
                    dark:text-white
                    sm:text-5xl
                    lg:text-6xl
                  "
                >
                  Hola,{' '}
                  <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {user.name}
                  </span>{' '}
                  👋
                </h1>

                <p className="mt-3 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-sm">
                  Administra tus competiciones, equipos y toda la actividad de
                  tus torneos desde un solo lugar.
                </p>
              </div>

              <div
                className="
                  hidden
                  h-16 w-16
                  shrink-0
                  items-center justify-center
                  rounded-2xl
                  border border-emerald-400/20
                  bg-emerald-400/10
                  text-emerald-400
                  shadow-[0_0_35px_rgba(16,185,129,0.08)]
                  sm:flex
                "
              >
                <Trophy size={28} strokeWidth={1.8} />
              </div>
            </div>

            <div className="mt-6 h-px w-full bg-gradient-to-r from-emerald-400/40 via-emerald-400/10 to-transparent sm:mt-8" />
          </div>
        </div>

        {/* HERRAMIENTAS SUPERADMIN */}

        {user.role === 'SUPERADMIN' && (
          <section
            className="mb-8 sm:mb-12"
            aria-labelledby="superadmin-tools-title"
          >
            <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
              <div>
                <SectionLabel color="cyan">
                  Administración global
                </SectionLabel>

                <h2
                  id="superadmin-tools-title"
                  className="
                    mt-3
                    text-xl
                    font-black
                    tracking-tight
                    text-slate-900
                    dark:text-white
                    sm:text-2xl
                  "
                >
                  Herramientas de superadministrador
                </h2>

                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  Accesos rápidos para administrar toda la plataforma.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
              {SUPERADMIN_TOOLS.map((tool) => (
                <ToolCard key={tool.to} {...tool} />
              ))}
            </div>
          </section>
        )}

        {/* TORNEOS */}

        <section className="mb-7 sm:mb-12">
          <div
            className="
              mb-5
              flex flex-col gap-4
              sm:mb-6
              lg:flex-row lg:items-end lg:justify-between
            "
          >
            <div>
              <SectionLabel>Tu competición</SectionLabel>

              <h2
                className="
                  mt-3
                  text-xl
                  font-black
                  tracking-tight
                  text-slate-900
                  dark:text-white
                  sm:text-2xl
                "
              >
                Tus torneos
              </h2>

              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Entra directo al torneo que quieres administrar.
              </p>
            </div>

            {tournaments.length > 0 && (
              <div className="relative w-full lg:max-w-sm">
                <Search
                  size={16}
                  className="
                    pointer-events-none
                    absolute left-3.5 top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar torneo..."
                  className="
                    w-full
                    rounded-xl
                    border border-slate-200
                    bg-white
                    py-3
                    pl-10
                    pr-4
                    text-sm
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-emerald-400/50
                    focus:ring-4
                    focus:ring-emerald-400/10
                    dark:border-white/[0.07]
                    dark:bg-white/[0.035]
                    dark:text-white
                    dark:placeholder:text-slate-600
                  "
                />
              </div>
            )}
          </div>

          {isLoadingTournaments ? (
            <div
              className="
                flex min-h-[220px]
                flex-col items-center justify-center
                rounded-2xl
                border border-slate-200
                bg-white
                dark:border-white/[0.07]
                dark:bg-white/[0.035]
              "
            >
              <div
                className="
                  h-8 w-8
                  animate-spin
                  rounded-full
                  border-2
                  border-slate-200
                  border-t-emerald-400
                  dark:border-slate-700
                "
              />

              <p className="mt-4 text-xs font-medium text-slate-500">
                Cargando torneos...
              </p>
            </div>
          ) : tournaments.length === 0 ? (
            <div
              className="
                rounded-2xl
                border border-dashed
                border-slate-300
                bg-white
                px-5 py-12
                text-center
                dark:border-slate-700
                dark:bg-white/[0.02]
              "
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Trophy size={24} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                {user.role === 'SUPERADMIN'
                  ? 'Todavía no has creado ningún torneo.'
                  : 'Todavía no tienes torneos asignados.'}
              </p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div
              className="
                rounded-2xl
                border border-dashed
                border-slate-300
                bg-white
                px-5 py-12
                text-center
                dark:border-slate-700
                dark:bg-white/[0.02]
              "
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-400/10 text-slate-400">
                <Search size={22} />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                {`Ningún torneo coincide con "${searchQuery}".`}
              </p>

              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-bold text-emerald-500 hover:text-emerald-400"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div
              className="
                grid grid-cols-1 gap-3
                sm:grid-cols-2 sm:gap-4
                lg:grid-cols-3
              "
            >
              {filteredTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
