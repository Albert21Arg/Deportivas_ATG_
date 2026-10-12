import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CirclePlay,
  Megaphone,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react';

import PublicNavbar from '../components/PublicNavbar.jsx';

const productScreens = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Una vista general para tener la actividad de tus torneos a mano.',
    file: 'dashboard.png',
    icon: BarChart3,
  },
  {
    id: 'tournaments',
    title: 'Administración de torneos',
    description: 'Crea competiciones y configura sus reglas desde un mismo panel.',
    file: 'tournaments.png',
    icon: Trophy,
  },
  {
    id: 'teams',
    title: 'Gestión de equipos',
    description: 'Organiza equipos, inscripciones y planteles participantes.',
    file: 'teams.png',
    icon: Users,
  },
  {
    id: 'calendar',
    title: 'Calendario y partidos',
    description: 'Programa encuentros y consulta las próximas jornadas.',
    file: 'calendar.png',
    icon: CalendarDays,
  },
  {
    id: 'standings',
    title: 'Tabla de posiciones',
    description: 'Comparte posiciones y rendimiento de cada equipo.',
    file: 'standings.png',
    icon: BarChart3,
  },
  {
    id: 'results',
    title: 'Resultados e historial',
    description: 'Sigue los resultados y revisa el recorrido del torneo.',
    file: 'results.png',
    icon: CirclePlay,
  },
  {
    id: 'match-stats',
    title: 'Estadísticas del partido',
    description: 'Consulta goleadores, tarjetas y seguimiento de partidos.',
    file: 'match-stats.png',
    icon: BarChart3,
  },
];

const benefits = [
  {
    icon: Trophy,
    title: 'Todo el torneo organizado',
    description:
      'Administra competiciones, equipos y jornadas con herramientas pensadas para el trabajo diario del organizador.',
  },
  {
    icon: CalendarDays,
    title: 'Partidos y resultados claros',
    description:
      'Programa encuentros, actualiza marcadores y mantén la información de cada fecha en un solo lugar.',
  },
  {
    icon: BarChart3,
    title: 'Seguimiento deportivo',
    description:
      'Publica posiciones, goleadores, tarjetas e información de partidos para que todos sigan la competencia.',
  },
];

const formats = [
  'Todos contra todos',
  'Fase de grupos',
  'Eliminación directa',
  'Eliminatoria ida y vuelta',
];

function ScreenshotPlaceholder({ screen, featured = false, onScreenshotClick }) {
  const Icon = screen.icon;
  const [hasImage, setHasImage] = useState(true);

  return (
    <div
      className={`relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-dashed border-emerald-400/35 bg-slate-100/90 dark:bg-[#08111b] ${
        featured ? 'min-h-[24rem] sm:min-h-[30rem]' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-3 dark:border-white/[0.07]">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 truncate rounded-md bg-white px-2.5 py-1 text-[10px] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
          Deportiva.ATG / {screen.title}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6 text-center">
        {hasImage && (
          <button
            type="button"
            onClick={() => onScreenshotClick(screen)}
            aria-label={`Ampliar captura: ${screen.title}`}
            className="absolute inset-0 h-full w-full cursor-zoom-in"
          >
            <img
              src={`/images/landing/${screen.file}`}
              alt={`Interfaz de Deportiva.ATG: ${screen.title}`}
              className="h-full w-full bg-white object-contain dark:bg-[#080d14]"
              onError={() => setHasImage(false)}
            />
          </button>
        )}
        {!hasImage && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(16,185,129,0.12),transparent_65%)]" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-500 dark:text-emerald-300">
              <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="relative mt-4 text-sm font-black text-slate-800 dark:text-white">
              Vista previa no disponible
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, light = false }) {
  return (
    <div className={`max-w-2xl ${light ? 'text-white' : ''}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500 dark:text-emerald-300">
        {eyebrow}
      </p>
      <h2 className={`mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
        {title}
      </h2>
      <p className={`mt-4 text-sm leading-7 ${light ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
        {description}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const [activeScreen, setActiveScreen] = useState(productScreens[0]);
  const [expandedScreen, setExpandedScreen] = useState(null);

  useEffect(() => {
    if (!expandedScreen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setExpandedScreen(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedScreen]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveScreen((currentScreen) => {
        const currentIndex = productScreens.findIndex((screen) => screen.id === currentScreen.id);
        return productScreens[(currentIndex + 1) % productScreens.length];
      });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll('[data-landing-reveal]');

    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('landing-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="lm-ready min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#070b12] dark:text-slate-100">
      <PublicNavbar />

      <nav
        aria-label="Navegación de la presentación"
        className="relative z-40 mx-auto mt-16 flex max-w-7xl gap-2 overflow-x-auto border-b border-slate-200 px-3 py-3 text-xs dark:border-white/[0.06] sm:justify-center sm:px-6"
      >
        {[
          ['#producto', 'Producto'],
          ['#organizadores', 'Organizadores'],
          ['#aficionados', 'Aficionados'],
          ['#formatos', 'Formatos'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded-full px-3 py-2 font-semibold text-slate-600 transition hover:bg-emerald-400/10 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-300"
          >
            {label}
          </a>
        ))}
      </nav>

      <section className="relative isolate px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_30%,rgba(16,185,129,0.12),transparent_42%),radial-gradient(ellipse_at_15%_65%,rgba(6,182,212,0.08),transparent_38%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-landing-reveal className="landing-reveal">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Gestión deportiva en un solo lugar
            </p>
            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              Organiza tu torneo.
              <span className="mt-2 block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Haz que todos lo vivan.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Deportiva.ATG reúne la administración de la competencia y su seguimiento público: equipos, partidos, resultados y posiciones, conectados en una experiencia simple para organizadores y aficionados.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/15 transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Empezar a organizar <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                href="#producto"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-5 py-3.5 text-sm font-bold text-slate-800 transition hover:border-emerald-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
              >
                Conocer la plataforma <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
              ¿Ya tienes una competición pública?{' '}
              <Link to="/" className="font-bold text-emerald-600 underline decoration-emerald-500/40 underline-offset-4 dark:text-emerald-300">
                Explora los torneos
              </Link>
            </p>
          </div>

          <div data-landing-reveal className="landing-reveal [transition-delay:120ms]">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white/80 p-2 shadow-2xl shadow-slate-300/40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-black/30 sm:p-3">
              <ScreenshotPlaceholder
                screen={productScreens[0]}
                featured
                onScreenshotClick={setExpandedScreen}
              />
            </div>
            <div className="mx-auto mt-4 flex max-w-lg items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg dark:border-white/[0.08] dark:bg-[#0b111a]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-500 dark:text-emerald-300">
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                Una sola plataforma, con una experiencia pública para que la comunidad siga el torneo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="producto" className="scroll-mt-28 border-y border-slate-200 bg-white/70 px-4 py-16 dark:border-white/[0.06] dark:bg-white/[0.015] sm:px-6 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div data-landing-reveal className="landing-reveal flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <SectionHeading
              eyebrow="Conoce el producto"
              title="Así se ve Deportiva.ATG por dentro."
              description="Explora las herramientas para organizar torneos, equipos, partidos y resultados desde una sola plataforma."
            />
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Funciones del producto">
            {productScreens.map((screen) => {
              const selected = screen.id === activeScreen.id;
              const Icon = screen.icon;
              return (
                <button
                  key={screen.id}
                  type="button"
                  role="tab"
                  id={`tab-${screen.id}`}
                  aria-selected={selected}
                  aria-controls="product-screenshot"
                  onClick={() => setActiveScreen(screen)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                    selected
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400/30 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-400'
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {screen.title}
                </button>
              );
            })}
          </div>

          <div
            id="product-screenshot"
            role="tabpanel"
            aria-labelledby={`tab-${activeScreen.id}`}
            className="mt-5 grid gap-6 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-3 dark:border-white/[0.07] dark:bg-[#080d14] sm:p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center"
          >
            <ScreenshotPlaceholder
              key={activeScreen.id}
              screen={activeScreen}
              featured
              onScreenshotClick={setExpandedScreen}
            />
            <div className="px-2 py-4 sm:px-5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-300">
                Funcionalidad
              </span>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {activeScreen.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {activeScreen.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="organizadores" className="scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div data-landing-reveal className="landing-reveal">
            <SectionHeading
              eyebrow="Para quienes organizan"
              title="Menos tareas dispersas. Más foco en el torneo."
              description="Mantén la operación deportiva y la información de la competencia conectadas, desde la creación hasta el seguimiento de los resultados."
            />
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                data-landing-reveal
                className="landing-reveal rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/30 dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-none"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-300">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="aficionados" className="scroll-mt-28 border-y border-slate-200 bg-slate-100/80 px-4 py-16 dark:border-white/[0.06] dark:bg-white/[0.02] sm:px-6 sm:py-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div data-landing-reveal className="landing-reveal">
            <SectionHeading
              eyebrow="Para jugadores y aficionados"
              title="La competencia también se vive desde afuera."
              description="La página pública acerca el torneo a su comunidad: permite encontrar competiciones y consultar partidos, marcadores, posiciones e información de equipos."
            />
            <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-600 transition hover:gap-3 dark:text-emerald-300">
              Explorar torneos públicos <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div data-landing-reveal className="landing-reveal grid gap-3 sm:grid-cols-2">
            {[
              ['Sigue la jornada', 'Consulta partidos y marcadores de la competición.'],
              ['Mira las posiciones', 'Revisa cómo avanza cada equipo en el torneo.'],
              ['Conoce a los equipos', 'Encuentra su información y su recorrido.'],
              ['Vuelve por los resultados', 'La actividad pública mantiene a la comunidad conectada.'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.07] dark:bg-[#0b111a]">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-600 dark:text-cyan-300">
                  <Check size={18} aria-hidden="true" />
                </span>
                <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div data-landing-reveal className="landing-reveal">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-600 dark:text-amber-300">
              <Megaphone size={23} aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Un espacio para darle visibilidad a tus anuncios.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Deportiva.ATG incluye administración de anuncios que pueden mostrarse a los visitantes de las competencias. Una forma de dar presencia a negocios y colaboradores del torneo.
            </p>
          </div>
          <div data-landing-reveal className="landing-reveal rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/[0.04] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">Difusión dentro del torneo</p>
              <Megaphone size={17} className="text-amber-500" aria-hidden="true" />
            </div>
            <div className="mt-5 flex min-h-28 items-center justify-center gap-3 rounded-xl border border-amber-400/20 bg-white/70 p-5 text-center dark:border-white/10 dark:bg-black/10">
              <Megaphone size={22} className="shrink-0 text-amber-500" aria-hidden="true" />
              <p className="max-w-sm text-sm font-bold text-slate-700 dark:text-slate-200">
                Anuncios para dar visibilidad a los negocios y colaboradores del torneo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="formatos" className="scroll-mt-28 border-y border-slate-200 bg-slate-100/80 px-4 py-16 dark:border-white/[0.06] dark:bg-white/[0.02] sm:px-6 sm:py-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div data-landing-reveal className="landing-reveal">
            <SectionHeading
              eyebrow="Formatos de competición"
              title="Elige el formato que encaja con tu campeonato."
              description="La configuración de torneos contempla distintos modos de competencia para adaptar el desarrollo a cada liga."
            />
          </div>
          <div data-landing-reveal className="landing-reveal grid gap-3 sm:grid-cols-2">
            {formats.map((format, index) => (
              <div key={format} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/[0.07] dark:bg-[#0b111a]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-sm font-black text-emerald-600 dark:text-emerald-300">
                  0{index + 1}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{format}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-12">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 to-cyan-600 px-6 py-12 text-center shadow-2xl shadow-emerald-900/15 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-40 -left-16 h-80 w-80 rounded-full border border-white/10" />
          <div data-landing-reveal className="landing-reveal relative mx-auto max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-950/70">Tu próximo torneo empieza aquí</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Dale a tu competencia el lugar que merece.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-emerald-950/80">
              Entra a Deportiva.ATG y descubre cómo organizar y compartir la información de tus torneos.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800">
                Iniciar sesión <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link to="/" className="inline-flex items-center justify-center rounded-xl border border-slate-950/20 bg-white/15 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-white/25">
                Ver torneos públicos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-8 dark:border-white/[0.06] sm:px-6 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Deportiva<span className="text-emerald-500">.ATG</span>
            </Link>
            <p className="mt-1 text-xs text-slate-500">Plataforma para gestionar y seguir torneos deportivos.</p>
          </div>
          <nav aria-label="Enlaces del pie de página" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            <a href="#producto" className="transition hover:text-emerald-500">Producto</a>
            <a href="#organizadores" className="transition hover:text-emerald-500">Organizadores</a>
            <a href="#formatos" className="transition hover:text-emerald-500">Formatos</a>
            <Link to="/" className="transition hover:text-emerald-500">Torneos públicos</Link>
            <Link to="/login" className="transition hover:text-emerald-500">Acceso</Link>
          </nav>
        </div>
      </footer>

      <style>{`
        .landing-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 650ms ease, transform 650ms ease;
        }
        .landing-reveal.landing-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
      {expandedScreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setExpandedScreen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Captura ampliada: ${expandedScreen.title}`}
            className="relative flex max-h-[94vh] max-w-[96vw] flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpandedScreen(null)}
              aria-label="Cerrar captura"
              className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-slate-900 shadow-lg transition hover:bg-slate-200 sm:-right-4 sm:-top-4"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <img
              src={`/images/landing/${expandedScreen.file}`}
              alt={`Interfaz de Deportiva.ATG: ${expandedScreen.title}`}
              className="max-h-[85vh] max-w-[94vw] rounded-xl bg-white object-contain shadow-2xl"
            />
            <p className="mt-3 text-sm font-bold text-white">{expandedScreen.title}</p>
          </div>
        </div>
      )}
    </main>
  );
}
