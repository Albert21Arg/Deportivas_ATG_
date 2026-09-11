import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';

export default function DashboardPage() {
  const { user } = useAuth();

  const cards = [
    {
      to: '/dashboard/tournaments',
      icon: '🏆',
      label: 'Competición',
      title: 'Torneos',
      description:
        'Crea, organiza y lleva el control de tus torneos deportivos.',
      action: 'Gestionar torneos',
      color: 'emerald',
      visible: true,
    },
    {
      to: '/dashboard/announcements',
      icon: '📣',
      label: 'Comunicación',
      title: 'Anuncios',
      description:
        'Mantén informada a tu comunidad con anuncios y novedades.',
      action: 'Gestionar anuncios',
      color: 'amber',
      visible: user.role === 'SUPERADMIN',
    },
    {
      to: '/dashboard/admins',
      icon: '👥',
      label: 'Administración',
      title: 'Administradores',
      description:
        'Gestiona usuarios, accesos y permisos de la plataforma.',
      action: 'Gestionar administradores',
      color: 'blue',
      visible: user.role === 'SUPERADMIN',
    },
    {
      to: '/dashboard/floating-bubbles',
      icon: '💬',
      label: 'Comunicación',
      title: 'Botones flotantes',
      description: 'Edita los accesos rápidos que se muestran en toda la plataforma.',
      action: 'Configurar botones',
      color: 'violet',
      visible: user.role === 'SUPERADMIN',
    },
  ];

  const visibleCards = cards.filter((card) => card.visible);

  const colorStyles = {
    emerald: {
      icon: 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20',
      glow: 'group-hover:shadow-emerald-500/10',
      border: 'group-hover:border-emerald-400/40',
      text: 'text-emerald-400',
      gradient: 'from-emerald-500/10',
    },
    amber: {
      icon: 'bg-amber-400/10 text-amber-400 ring-amber-400/20',
      glow: 'group-hover:shadow-amber-500/10',
      border: 'group-hover:border-amber-400/40',
      text: 'text-amber-400',
      gradient: 'from-amber-500/10',
    },
    blue: {
      icon: 'bg-blue-400/10 text-blue-400 ring-blue-400/20',
      glow: 'group-hover:shadow-blue-500/10',
      border: 'group-hover:border-blue-400/40',
      text: 'text-blue-400',
      gradient: 'from-blue-500/10',
    },
    violet: {
      icon: 'bg-violet-400/10 text-violet-400 ring-violet-400/20',
      glow: 'group-hover:shadow-violet-500/10',
      border: 'group-hover:border-violet-400/40',
      text: 'text-violet-400',
      gradient: 'from-violet-500/10',
    },
  };

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
      <section className="relative mx-auto max-w-7xl px-3 pb-10 pt-24 sm:px-6 sm:pb-16 sm:pt-28">

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

        {/* GESTIÓN */}
        <div className="mb-4 flex items-end justify-between sm:mb-6">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 sm:text-xs">
              Herramientas
            </p>

            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Gestiona tu plataforma
            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Accede rápidamente a las principales funciones.
            </p>
          </div>
        </div>

        {/* TARJETAS */}
        <div
          className={`
            grid gap-3 sm:gap-5
            ${
              visibleCards.length === 1
                ? 'grid-cols-1'
                : visibleCards.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }
          `}
        >

          {visibleCards.map((card) => {
            const styles = colorStyles[card.color];

            return (
              <Link
                key={card.title}
                to={card.to}
                className={`
                  group relative
                  min-w-0
                  overflow-hidden
                  rounded-xl
                  border border-slate-200
                  bg-white
                  p-4
                  shadow-xl shadow-black/5
                  transition-all duration-300
                  hover:-translate-y-1
                  hover:bg-slate-50
                  hover:shadow-2xl
                  dark:border-white/[0.07]
                  dark:bg-white/[0.035]
                  dark:shadow-black/10
                  dark:hover:bg-white/[0.06]
                  sm:rounded-2xl
                  sm:p-6
                  sm:hover:-translate-y-2
                  ${styles.glow}
                  ${styles.border}
                  ${
                    visibleCards.length === 1
                      ? 'w-full'
                      : ''
                  }
                `}
              >
                  {/* Gradiente interno */}
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${styles.gradient} via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  {/* Brillo superior */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition group-hover:opacity-100" />

                  <div className="relative">

                    {/* ICONO + FLECHA */}
                    <div className="mb-5 flex items-center justify-between sm:mb-7">

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] text-xl ring-1 transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl ${styles.icon}`}
                      >
                        {card.icon}
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-black/[0.02] text-sm text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:border-slate-300 group-hover:text-slate-900 dark:border-white/[0.07] dark:bg-white/[0.025] dark:group-hover:border-white/10 dark:group-hover:text-white sm:h-9 sm:w-9">
                        →
                      </div>
                    </div>

                    {/* CATEGORÍA */}
                    <p
                      className={`mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] sm:mb-2 sm:text-[10px] ${styles.text}`}
                    >
                      {card.label}
                    </p>

                    {/* TÍTULO */}
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                      {card.title}
                    </h3>

                    {/* DESCRIPCIÓN */}
                    <p className="mt-2 text-xs leading-5 text-slate-400 sm:mt-3 sm:min-h-[48px] sm:text-sm sm:leading-6">
                      {card.description}
                    </p>

                    {/* ACCIÓN */}
                    <div
                      className={`mt-5 flex items-center gap-2 text-xs font-semibold sm:mt-6 sm:text-sm ${styles.text}`}
                    >
                      {card.action}

                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
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
