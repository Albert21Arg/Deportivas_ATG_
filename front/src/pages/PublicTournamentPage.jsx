import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import { formatEventTime, getMatchClock } from '../utils/match-clock.js';
import { buildRoundShareImage } from '../utils/round-share-image.js';
import {
  EXPIRED_CLASS,
  isLogoHidden,
  isPlayerExpired,
  isTeamExpired,
  PLAYER_EXPIRED_CLASS,
} from '../utils/team-expiry.js';

import AnnouncementModal from '../components/AnnouncementModal.jsx';
import CompetitionOverview from '../components/CompetitionOverview.jsx';
import FutbolIcon from '../components/FutbolIcon.jsx';
import ShareImageModal from '../components/ShareImageModal.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import GoalkeepersTable from '../components/GoalkeepersTable.jsx';
import PlayerCardModal from '../components/PlayerCardModal.jsx';
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

// "Fecha N" automática: cada día con partidos de liga/grupos es una fecha,
// numerada en orden cronológico desde el primer día jugado del torneo (se
// cuentan juntos los próximos y los ya jugados para que el número sea el
// mismo en las dos listas). Los partidos de eliminatoria no se numeran.
function buildRoundNumbers(matches, knockoutMatchIds) {
  const dates = [
    ...new Set(
      matches
        .filter((match) => !knockoutMatchIds.has(match.id))
        .map((match) => dateValue(match.date))
    ),
  ].sort();

  return new Map(dates.map((date, index) => [date, index + 1]));
}

// Una fecha como acordeón: cerrado al entrar, se despliega al hacerle clic.
function MatchDateAccordion({
  date,
  roundNumber,
  count,
  isOpen,
  onToggle,
  className,
  dotClassName,
  onShare,
  children,
}) {
  return (
    <section className="min-w-0">
      <h3 className="flex items-center gap-1 border-b border-slate-200 dark:border-white/[0.05]">
        <button
          className={`flex min-w-0 flex-1 items-center gap-2 text-left font-bold uppercase tracking-[0.14em] transition hover:opacity-80 ${className}`}
          onClick={onToggle}
          type="button"
          aria-expanded={isOpen}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`} />
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
            {roundNumber ? (
              <>
                <span>Fecha {roundNumber}</span>
                <span className="font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">
                  · {formatDate(date)}
                </span>
              </>
            ) : (
              formatDate(date)
            )}
          </span>
          <span className="shrink-0 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[9px] tracking-normal text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
            {count}
          </span>
          <span
            className={`shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ↓
          </span>
        </button>

        {onShare && (
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400/50 hover:bg-emerald-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 dark:text-emerald-200"
            onClick={onShare}
            type="button"
            aria-label={`Compartir ${roundNumber ? `fecha ${roundNumber}` : formatDate(date)}`}
            title="Compartir en redes"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
            <span>Compartir</span>
          </button>
        )}
      </h3>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Compartir una fecha (imagen con los partidos programados)
|--------------------------------------------------------------------------
| La imagen se genera al abrir la vista previa y el menú de compartir se
| abre con un toque directo en "Compartir": los navegadores de celular
| (sobre todo iPhone) solo permiten abrir ese menú en respuesta inmediata a
| un toque, no después de esperar a que se genere la imagen.
*/

function ShareRoundModal({ round, tournament, onClose }) {
  const title = round.roundNumber ? `Fecha ${round.roundNumber}` : formatDate(round.date);
  const pageUrl = `${window.location.origin}/tournaments/${tournament.id}`;
  // El enlace lleva la fecha: así la vista previa de WhatsApp/Facebook
  // muestra la imagen de esos partidos y la página abre directo esa fecha.
  const shareUrl = `${pageUrl}?fecha=${dateValue(round.date)}`;

  return (
    <ShareImageModal
      title={`Compartir ${title}`}
      subtitle={formatDate(round.date)}
      fileName={`${round.roundNumber ? `fecha-${round.roundNumber}` : dateValue(round.date)}.png`}
      shareText={`⚽ ${tournament.name} — ${title}\n${formatDate(round.date)}\n${shareUrl}`}
      onClose={onClose}
      buildImage={() =>
        buildRoundShareImage({
          tournamentName: tournament.name,
          title,
          subtitle: formatDate(round.date),
          matches: [...round.matches].sort((left, right) => String(left.time).localeCompare(String(right.time))),
          formatTime,
          hideLogo: (team) => !team?.logo || isLogoHidden(team),
          footer: pageUrl.replace(/^https?:\/\//, ''),
        })
      }
    />
  );
}

function mediaUrl(path) {
  if (!path) return null;

  return path.startsWith('http')
    ? path
    : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;
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
      className={`${size} shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(15,23,42,0.16)] transition-transform duration-200 group-hover:scale-105 ${className} ${expiredClass}`}
      src={team.logo}
      alt={expired ? '' : `Escudo de ${team.name}`}
    />
  );
}

/*
|--------------------------------------------------------------------------
| Silueta de jugador (sin foto)
|--------------------------------------------------------------------------
*/

function PlayerSilhouette({ className = 'h-[60%] w-[60%] text-white/70' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4.2" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
    </svg>
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
| Cronómetro de partido en vivo
|--------------------------------------------------------------------------
*/

function LiveMatchClock({ match, className = '' }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (match.status !== 'STARTED') return undefined;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [match.status, match.periodStartedAt, match.currentPeriod, match.halfDurationMinutes]);

  const clock = getMatchClock(match);
  if (!clock) return null;

  return (
    <span className={className}>
      {clock.label}
      {!clock.isHalftime && !clock.isFullTime && (
        <span className="ml-1 opacity-70">{clock.period === 1 ? '1T' : '2T'}</span>
      )}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| Próximos partidos
|--------------------------------------------------------------------------
*/

// Iniciales del equipo para la silueta de escudo (equipos sin escudo).
function teamInitials(name) {
  return String(name ?? '?')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || '?';
}

// Escudo grande, sin recuadro, igual que en la imagen para compartir: si el
// equipo no tiene escudo (o lo tiene oculto), silueta de escudo con iniciales.
function ShowcaseLogo({ team, sizeClass }) {
  const [failed, setFailed] = useState(false);

  if (team?.logo && !isLogoHidden(team) && !failed) {
    return (
      <img
        className={`${sizeClass} object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-105`}
        src={team.logo}
        alt={`Escudo de ${team.name}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg
      className={`${sizeClass} drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-105`}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Sin escudo: ${team?.name ?? 'equipo'}`}
    >
      <defs>
        <linearGradient id="shield-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(52,211,153,0.28)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0.55)" />
        </linearGradient>
      </defs>
      <path
        d="M13 14 Q50 -2 87 14 L87 52 Q87 78 50 96 Q13 78 13 52 Z"
        fill="url(#shield-fill)"
        stroke="rgba(167,243,208,0.55)"
        strokeWidth="3"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ecfdf5"
        fontSize="30"
        fontWeight="900"
      >
        {teamInitials(team?.name)}
      </text>
    </svg>
  );
}

// Un partido dentro de la fecha: hora arriba, escudos grandes con "VS" (o
// el marcador si está en vivo) y el nombre de cada equipo debajo. Al tocarlo
// abre el detalle del partido.
function ShowcaseMatch({ match, compact, onClick }) {
  const isLive = match.status === 'STARTED';
  const logoSize = compact ? 'h-14 w-14 sm:h-20 sm:w-20 lg:h-24 lg:w-24' : 'h-20 w-20 sm:h-28 sm:w-28';
  const nameClass = compact ? 'text-[11px] sm:text-sm' : 'text-sm sm:text-base';

  return (
    <button
      className="group w-full min-w-0 rounded-xl px-1 py-2 text-center transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
      type="button"
      onClick={onClick}
    >
      {isLive ? (
        <span className="flex items-center justify-center gap-1.5 text-[11px] font-black text-red-400 sm:text-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          EN VIVO
          <LiveMatchClock match={match} className="text-red-300" />
        </span>
      ) : (
        <span className={`block font-extrabold text-emerald-300 ${compact ? 'text-xs sm:text-base' : 'text-sm sm:text-lg'}`}>
          {formatTime(match.time)}
        </span>
      )}

      <span className="mx-auto mt-2 grid max-w-[22rem] grid-cols-[1fr_auto_1fr] items-start gap-1">
        <span className="flex min-w-0 flex-col items-center">
          <ShowcaseLogo team={match.homeTeam} sizeClass={logoSize} />
          <span className={`mt-1.5 line-clamp-2 break-words font-bold leading-tight text-white ${nameClass}`}>
            {match.homeTeam.name}
          </span>
        </span>

        <span
          className={`self-center font-black ${compact ? 'mt-[-1.25rem] text-xs sm:text-base' : 'mt-[-1.5rem] text-sm sm:text-xl'} ${
            isLive ? 'text-emerald-300' : 'text-slate-400/80'
          }`}
        >
          {isLive ? `${match.homeScore ?? 0}-${match.awayScore ?? 0}` : 'VS'}
        </span>

        <span className="flex min-w-0 flex-col items-center">
          <ShowcaseLogo team={match.awayTeam} sizeClass={logoSize} />
          <span className={`mt-1.5 line-clamp-2 break-words font-bold leading-tight text-white ${nameClass}`}>
            {match.awayTeam.name}
          </span>
        </span>
      </span>
    </button>
  );
}

// Partidos de una fecha con el mismo aspecto que la imagen para compartir:
// fondo oscuro, 1 columna hasta 4 partidos y 2 columnas si hay más.
function RoundShowcase({ matches, onSelect }) {
  const twoColumns = matches.length > 4;

  return (
    <div className="relative mt-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#0b1220] to-[#042f2e] px-2 py-3 sm:px-4 sm:py-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className={`relative grid gap-y-3 ${twoColumns ? 'grid-cols-2 gap-x-2 sm:gap-x-6' : 'grid-cols-1'}`}>
        {matches.map((match, index) => (
          <div key={match.id} className="min-w-0">
            {index >= (twoColumns ? 2 : 1) && (
              <div className="mx-auto mb-3 h-px w-3/5 bg-white/[0.08]" />
            )}
            <ShowcaseMatch
              match={match}
              compact={twoColumns}
              onClick={() => onSelect(match)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PARTIDO EN VIVO PRINCIPAL
|--------------------------------------------------------------------------
*/

function LiveMatchCard({ match, onClick, tournamentId, tournamentName }) {
  const [isShareImageOpen, setIsShareImageOpen] = useState(false);
  const shareUrl = `${window.location.origin}/tournaments/${tournamentId}?partido=${match.id}`;

  function shareOnWhatsapp(event) {
    event.stopPropagation();

    const shareText =
      `⚽ EN VIVO: ${match.homeTeam.name} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam.name}\n` +
      `${tournamentName}\n` +
      shareUrl;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function buildLiveShareImage() {
    const { data: image } = await api.get(
      `/public/tournaments/${tournamentId}/matches/${match.id}/live-image`,
      { responseType: 'blob' },
    );
    return image;
  }

  function shareLiveImage(event) {
    event.stopPropagation();
    setIsShareImageOpen(true);
  }

  return (
    <>
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
        col-span-2
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
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.035] sm:h-36 sm:w-36">
              <TeamLogo
                team={match.homeTeam}
                size="h-24 w-24 sm:h-32 sm:w-32"
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
            <LiveMatchClock
              match={match}
              className="text-[9px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400 sm:text-xs"
            />

            {!getMatchClock(match) && (
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400 sm:text-xs">
                EN VIVO
              </span>
            )}

            <span className="mt-1 text-sm font-black text-slate-600 sm:text-lg">
              -
            </span>

            <span className="mt-2 hidden text-[9px] font-medium text-slate-500 sm:block sm:text-xs">
              Ver detalles
            </span>
          </div>

          <div className="flex w-[105px] min-w-0 flex-col items-center text-center sm:w-[180px]">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.035] sm:h-36 sm:w-36">
              <TeamLogo
                team={match.awayTeam}
                size="h-24 w-24 sm:h-32 sm:w-32"
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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {match.streamUrl && (
            <a
              href={match.streamUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="
                flex flex-1 items-center justify-center gap-2
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

          <button
            type="button"
            onClick={shareOnWhatsapp}
            className="
              flex flex-1 items-center justify-center gap-2
              rounded-xl border border-emerald-400/30
              bg-emerald-500/10
              py-2.5
              text-[11px] font-black uppercase tracking-wider
              text-emerald-700 dark:text-emerald-300
              transition
              hover:bg-emerald-500/20
              sm:py-3 sm:text-xs
            "
          >
            ✆ Compartir por WhatsApp
          </button>

          <button
            type="button"
            onClick={shareLiveImage}
            className="
              flex flex-1 items-center justify-center gap-2
              rounded-xl border border-cyan-400/30
              bg-cyan-500/10
              py-2.5
              text-[11px] font-black uppercase tracking-wider
              text-cyan-700 dark:text-cyan-300
              transition
              hover:bg-cyan-500/20
              sm:py-3 sm:text-xs
            "
          >
            Compartir imagen
          </button>
        </div>
      </div>
    </div>

    {isShareImageOpen && (
      <ShareImageModal
        title={`Partido en vivo · ${match.homeTeam.name} vs ${match.awayTeam.name}`}
        subtitle={`${tournamentName} · ${match.homeScore ?? 0}-${match.awayScore ?? 0}`}
        fileName={`partido-en-vivo-${match.id}.jpg`}
        shareText={`⚽ EN VIVO: ${match.homeTeam.name} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam.name}\n${tournamentName}\n${shareUrl}`}
        onClose={() => setIsShareImageOpen(false)}
        buildImage={buildLiveShareImage}
      />
    )}
    </>
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
        <div className="flex w-[120px] min-w-0 flex-col items-center text-center sm:w-[190px]">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.05] dark:bg-white/[0.025] sm:h-20 sm:w-20">
            <TeamLogo
              team={match.homeTeam}
              size="h-24 w-24 sm:h-32 sm:w-32"
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

        <div className="flex w-[120px] min-w-0 flex-col items-center text-center sm:w-[190px]">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.05] dark:bg-white/[0.025] sm:h-20 sm:w-20">
            <TeamLogo
              team={match.awayTeam}
              size="h-24 w-24 sm:h-32 sm:w-32"
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

  const isLive = match.status === 'STARTED';

  return (
    <div
      className={`
        fixed inset-0
        flex items-end justify-center
        bg-slate-950/80
        ${isLive ? 'z-[2147483647]' : 'z-[60] md:items-center md:justify-center md:p-8 md:backdrop-blur-sm'} p-0
      `}
      role="presentation"
      onMouseDown={isLive ? undefined : onClose}
    >
      <section
        className={`flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border-0 bg-white shadow-none dark:bg-slate-900 ${isLive ? '' : 'md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl md:dark:border-slate-700'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="
            flex shrink-0 items-start justify-between gap-3
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
            flex shrink-0 items-start justify-center
            px-1 py-5
            sm:px-6 sm:py-7
          "
        >
          <div className="w-[120px] min-w-0 text-center sm:w-[165px]">
            <TeamLogo
              team={match.homeTeam}
              size="h-40 w-40 sm:h-48 sm:w-48"
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
              size="h-40 w-40 sm:h-48 sm:w-48"
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
          <div className="shrink-0 px-3 pb-4 sm:px-6 sm:pb-6">
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
          <div className="flex min-h-0 flex-1 flex-col border-t border-slate-200 px-3 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              {match.status === 'STARTED' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 sm:gap-2 sm:text-xs">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                  EN VIVO
                  <LiveMatchClock match={match} className="normal-case" />
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
                min-h-[120px]
                flex-1
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
                          {formatEventTime(event)}
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
                          {formatEventTime(event)}
                        </span>

                        <EventIcon type={event.type} />
                      </>
                    ) : (
                      <>
                        <EventIcon type={event.type} />

                        <span>
                          {formatEventTime(event)}
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
  sectionRef,
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
    <>
      <article
        ref={sectionRef}
        className={`
          group relative min-w-0 w-full overflow-hidden
          rounded-2xl border
          bg-white
          shadow-[0_12px_40px_rgba(15,23,42,0.06)]
          transition-all duration-300
          dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-[#080b11]
          dark:shadow-[0_12px_40px_rgba(0,0,0,0.18)]
          ${colors.border}
          ${className}
        `}
      >
        <div
          className={`
            pointer-events-none absolute inset-x-0 top-0 h-28
            ${colors.glow}
          `}
        />

        <button
          type="button"
          onClick={onToggle}
          className="
            relative z-10 flex min-h-[150px] w-full
            flex-col justify-between
            p-4 text-left
            transition-all duration-300
            hover:bg-slate-50/70
            active:scale-[0.99]
            dark:hover:bg-white/[0.025]
            sm:min-h-[175px] sm:p-5
          "
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={`Abrir ${config.title}`}
        >
          <div className="flex w-full items-start justify-between gap-3">
            <div
              className={`
                flex h-11 w-11 shrink-0 items-center justify-center
                rounded-xl border text-lg shadow-inner
                transition-all duration-300
                sm:h-12 sm:w-12 sm:text-xl
                ${colors.icon}
              `}
            >
              {config.icon}
            </div>

            <span
              className={`
                inline-flex h-8 w-8 shrink-0 items-center justify-center
                rounded-full border
                bg-slate-50 text-slate-500
                dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-slate-400
                ${colors.border}
              `}
              aria-hidden="true"
            >
              ↗
            </span>
          </div>

          <div className="mt-5 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />

              <span
                className={`
                  text-[8px] font-black uppercase tracking-[0.18em]
                  sm:text-[10px]
                  ${colors.text}
                `}
              >
                {config.eyebrow}
              </span>
            </div>

            <h2 className="mt-1.5 text-base font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
              {config.title}
            </h2>

            <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs">
              Toca para ver la información
            </p>
          </div>
        </button>
      </article>

      {open && (
        <div
          className="
            fixed inset-0 z-[55]
            flex
            bg-slate-950/80
            md:items-center md:justify-center md:p-8 md:backdrop-blur-sm
          "
          role="presentation"
          onMouseDown={onToggle}
        >
          <section
            className="
              flex h-[100dvh] w-full flex-col
              overflow-hidden
              bg-white
              dark:bg-slate-900
              md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl md:dark:border-slate-700
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${contentId}-title`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header
              className="
                flex shrink-0 items-center justify-between gap-3
                border-b border-slate-200
                px-4 py-3
                dark:border-slate-800
                sm:px-6 sm:py-4
              "
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                  <span
                    className={`
                      text-[9px] font-black uppercase tracking-[0.18em]
                      sm:text-xs
                      ${colors.text}
                    `}
                  >
                    {config.eyebrow}
                  </span>
                </div>

                <h2
                  id={`${contentId}-title`}
                  className="mt-1 text-base font-black tracking-tight text-slate-900 dark:text-white sm:text-xl"
                >
                  {config.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={onToggle}
                className="
                  flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-full border border-slate-200
                  bg-slate-50 text-lg text-slate-500
                  transition hover:bg-slate-100 hover:text-slate-900
                  dark:border-white/[0.07] dark:bg-white/[0.025]
                  dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white
                "
                aria-label={`Cerrar ${config.title}`}
              >
                ×
              </button>
            </header>

            <div
              id={contentId}
              className="
                min-h-0 flex-1 overflow-y-auto
                bg-slate-50 dark:bg-black/[0.08]
              "
            >
              {children}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

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

  // Fecha desplegada en "Próximos partidos" / "Historial" (clave
  // "upcoming:AAAA-MM-DD" o "history:AAAA-MM-DD"), una sola a la vez.
  // undefined = el visitante no ha tocado ninguna: queda abierta la próxima
  // fecha (la primera de "Próximos partidos"); null = las cerró todas.
  const [openDateKey, setOpenDateKey] = useState(undefined);

  // Fecha que se está compartiendo como imagen ({ date, roundNumber, matches }).
  const [shareRound, setShareRound] = useState(null);

  // Enlace compartido de una fecha (/tournaments/:id?fecha=AAAA-MM-DD): al
  // cargar, abre la sección donde está esa fecha y la despliega, una vez.
  const [searchParams] = useSearchParams();
  const sharedDate = searchParams.get('fecha');
  const sharedDateHandledRef = useRef(false);
  const sharedMatchId = searchParams.get('partido');
  const sharedMatchHandledRef = useRef(false);

  function firstUpcomingDateKey() {
    const dates = (data?.upcomingMatches ?? []).map((match) => dateValue(match.date)).sort();
    return dates.length ? `upcoming:${dates[0]}` : null;
  }

  function isDateOpen(key) {
    const openKey = openDateKey === undefined ? firstUpcomingDateKey() : openDateKey;
    return openKey === key;
  }

  // Solo una fecha abierta a la vez: abrir otra cierra la anterior.
  function toggleDate(key) {
    setOpenDateKey(isDateOpen(key) ? null : key);
  }

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [featuredPlayerRow, setFeaturedPlayerRow] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const historyLoadedRef = useRef(false);
  const sectionRefs = useRef({});
  const visitLoggedIdRef = useRef(null);

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

    // El historial se pide una vez al entrar para que la numeración
    // "Fecha N" de los próximos partidos cuente también los ya jugados.
    api
      .get(`/public/tournaments/${id}/history`)
      .then(({ data: response }) => {
        if (!historyLoadedRef.current) setHistory(response.data.matches);
      })
      .catch(() => {});

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
    if (!sharedDate || sharedDateHandledRef.current || !data) return;

    const inUpcoming = data.upcomingMatches.some((match) => dateValue(match.date) === sharedDate);
    const inHistory = history.some((match) => dateValue(match.date) === sharedDate);
    if (!inUpcoming && !inHistory) return;

    sharedDateHandledRef.current = true;
    const section = inUpcoming ? 'upcoming' : 'history';
    setOpenSection(section);
    setOpenDateKey(`${section}:${sharedDate}`);
    requestAnimationFrame(() => {
      sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [sharedDate, data, history]);

  useEffect(() => {
    if (!sharedMatchId || sharedMatchHandledRef.current || !data) return;

    const matches = [
      ...(data.upcomingMatches ?? []),
      ...(data.ties ?? []).flatMap((tie) => tie.matches ?? []),
    ];
    const match = matches.find((item) => String(item.id) === sharedMatchId);
    if (!match) return;

    sharedMatchHandledRef.current = true;
    setSelectedMatch(match);
  }, [sharedMatchId, data]);

  // Contador de visitas (solo para el superadmin): se registra UNA vez por
  // carga de la página, no en cada refresco del polling/SSE de arriba (que
  // llama loadTournament cada 10s y en cada evento en vivo).
  useEffect(() => {
    if (visitLoggedIdRef.current === id) return;
    visitLoggedIdRef.current = id;
    api.post(`/public/tournaments/${id}/visit`).catch(() => {});
  }, [id]);

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
      !historyLoadedRef.current
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

  const roundNumbers = buildRoundNumbers(
    [...data.upcomingMatches, ...history],
    new Set(
      (data.ties ?? []).flatMap((tie) =>
        (tie.matches ?? []).map((match) => match.id)
      )
    )
  );

  const liveMatch =
    data.upcomingMatches?.find(
      (match) => match.status === 'STARTED'
    ) ??
    (data.ties ?? [])
      .flatMap((tie) => tie.matches ?? [])
      .find((match) => match.status === 'STARTED');

  // Igual que en el resto de la página pública: si el jugador (o su
  // equipo) tiene el pago vencido, su foto y nombre se distorsionan.
  const topScorer = data.scorers?.[0] ?? null;
  const topScorerExpired = isPlayerExpired(topScorer?.player);
  const topScorerNameHidden =
    topScorer?.player?.showName === false ||
    topScorerExpired;

  const topLikedPlayerExpired = isPlayerExpired(
    data.topLikedPlayer?.player
  );
  const topLikedPlayerNameHidden =
    data.topLikedPlayer?.player?.showName === false ||
    topLikedPlayerExpired;

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

      {/* Marcador en vivo */}

      {liveMatch && (
        <section className="mx-auto mb-3 w-full max-w-7xl min-w-0 sm:mb-4">
          <LiveMatchCard
            match={liveMatch}
            onClick={() => setSelectedMatch(liveMatch)}
            tournamentId={id}
            tournamentName={data.tournament.name}
          />
        </section>
      )}

      {data.scorers?.[0] && (
        <section className="mx-auto mb-3 w-full max-w-7xl min-w-0 sm:mb-4">
          <button
            type="button"
            onClick={() => setFeaturedPlayerRow(data.scorers[0])}
            className="
              group relative flex w-full min-w-0 items-center gap-3
              overflow-hidden rounded-3xl border-2 border-amber-400/40
              bg-gradient-to-br from-amber-400/[0.16] via-amber-500/[0.06] to-transparent
              p-4 text-left
              shadow-[0_12px_45px_rgba(251,191,36,0.16)]
              transition
              hover:border-amber-400/60 hover:shadow-[0_18px_55px_rgba(251,191,36,0.24)]
              sm:gap-5 sm:p-6
            "
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-400/25 blur-3xl transition group-hover:bg-amber-400/35" />

            <div
              className="
                relative flex h-16 w-16 shrink-0 items-center justify-center
                overflow-hidden rounded-2xl
                bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700
                shadow-lg ring-2 ring-amber-300/50
                sm:h-24 sm:w-24
              "
            >
              {data.scorers[0].player.photo ? (
                <img
                  className={`h-full w-full object-cover ${topScorerExpired ? PLAYER_EXPIRED_CLASS : ''}`}
                  src={mediaUrl(data.scorers[0].player.photo)}
                  alt={topScorerExpired ? '' : `Foto de ${data.scorers[0].player.name}`}
                />
              ) : (
                <PlayerSilhouette
                  className={`h-[60%] w-[60%] text-white/70 ${topScorerExpired ? PLAYER_EXPIRED_CLASS : ''}`}
                />
              )}
            </div>

            <div className="relative min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300 sm:text-[11px]">
                <span aria-hidden="true">👑</span>
                Goleador del torneo
              </p>

              <p
                className={`mt-1 truncate text-lg font-black text-slate-900 dark:text-white sm:text-2xl ${topScorerNameHidden ? PLAYER_EXPIRED_CLASS : ''}`}
              >
                {data.scorers[0].player.name}
              </p>

              {data.scorers[0].team && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  {data.scorers[0].team.name}
                </p>
              )}
            </div>

            <div className="relative flex shrink-0 flex-col items-center">
              <span className="text-3xl font-black leading-none text-amber-600 dark:text-amber-300 sm:text-5xl">
                {data.scorers[0].goals}
              </span>

              <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                Goles
              </span>
            </div>
          </button>
        </section>
      )}

      {(data.topLikedTeam || data.topLikedPlayer) && (
        <section className="mx-auto mb-3 w-full max-w-7xl min-w-0 sm:mb-4">
          <div
            className="
              flex min-w-0 flex-col divide-y divide-slate-200 overflow-hidden
              rounded-2xl border border-slate-200 bg-white
              dark:divide-white/[0.08] dark:border-white/[0.08] dark:bg-[#0a1018]/90
              sm:flex-row sm:divide-x sm:divide-y-0
            "
          >
            {data.topLikedTeam?.team && (
              <button
                type="button"
                onClick={() => {
                  const row = data.standings.find(
                    (item) => item.team.id === data.topLikedTeam.team.id
                  );

                  if (row) {
                    setSelectedTeam({
                      row,
                      recentForm:
                        data.recentFormByTeam?.[row.team.id] ?? [],
                    });
                  }
                }}
                className="
                  flex min-w-0 flex-1 items-center gap-3
                  p-3 text-left
                  transition
                  hover:bg-amber-400/[0.06]
                  sm:p-4
                "
              >
                <TeamLogo
                  team={data.topLikedTeam.team}
                  size="h-16 w-16 sm:h-18 sm:w-18"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300 sm:text-[9px]">
                    🏆 Equipo Favorito
                  </p>

                  <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">
                    {data.topLikedTeam.team.name}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 text-rose-500 dark:text-rose-300">
                  <span aria-hidden="true">❤️</span>
                  <span className="text-base font-black tabular-nums sm:text-lg">
                    {data.topLikedTeam.total}
                  </span>
                </div>
              </button>
            )}

            {data.topLikedPlayer?.player && (
              <button
                type="button"
                onClick={() =>
                  setFeaturedPlayerRow({
                    player: data.topLikedPlayer.player,
                    team: data.topLikedPlayer.team,
                    goals: data.topLikedPlayer.player.goals,
                    yellowCards: data.topLikedPlayer.player.yellowCards,
                    redCards: data.topLikedPlayer.player.redCards,
                    blueCards: data.topLikedPlayer.player.blueCards,
                    matchesPlayed:
                      data.topLikedPlayer.player.matchesPlayed,
                    goalsConceded:
                      data.topLikedPlayer.player.goalsConceded,
                    position: data.topLikedPlayer.player.position,
                    isGoalkeeper: Boolean(
                      data.topLikedPlayer.player.isGoalkeeper
                    ),
                  })
                }
                className="
                  flex min-w-0 flex-1 items-center gap-3
                  p-3 text-left
                  transition
                  hover:bg-rose-400/[0.06]
                  sm:p-4
                "
              >
                <div
                  className="
                    relative h-14 w-11 shrink-0 overflow-hidden rounded-lg
                    bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700
                    shadow-md ring-1 ring-black/10
                    sm:h-16 sm:w-12
                  "
                >
                  {data.topLikedPlayer.player.photo ? (
                    <img
                      className={`h-full w-full object-cover ${topLikedPlayerExpired ? PLAYER_EXPIRED_CLASS : ''}`}
                      src={mediaUrl(data.topLikedPlayer.player.photo)}
                      alt={topLikedPlayerExpired ? '' : `Foto de ${data.topLikedPlayer.player.name}`}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <PlayerSilhouette
                        className={`h-[65%] w-[65%] text-white/70 ${topLikedPlayerExpired ? PLAYER_EXPIRED_CLASS : ''}`}
                      />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300 sm:text-[9px]">
                    🔥 Jugador Favorito
                  </p>

                  <p
                    className={`mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white sm:text-base ${topLikedPlayerNameHidden ? PLAYER_EXPIRED_CLASS : ''}`}
                  >
                    {data.topLikedPlayer.player.name}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 text-rose-500 dark:text-rose-300">
                  <span aria-hidden="true">❤️</span>
                  <span className="text-base font-black tabular-nums sm:text-lg">
                    {data.topLikedPlayer.total}
                  </span>
                </div>
              </button>
            )}
          </div>
        </section>
      )}

      <section
        className="
          mx-auto
          grid
          w-full
          max-w-7xl
          min-w-0
          grid-cols-2
          gap-3
          sm:gap-4
          lg:gap-5
        "
      >
        {competitionMode === 'ROUND_ROBIN' ? (
          <SectionCard
            section="standings"
            sectionRef={(element) => { sectionRefs.current["standings"] = element; }}
            open={openSection === 'standings'}
            onToggle={toggleStandings}
            contentId="standings-content"
          >
            <div id="standings-content" className="w-full min-w-0">
              <div className="scroll-invisible hidden w-full overflow-y-auto sm:block">
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
                                  size="h-14 w-14"
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

              <div className="scroll-invisible w-full overflow-y-auto sm:hidden">
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
                                  size="h-12 w-12"
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
            sectionRef={(element) => { sectionRefs.current["groups"] = element; }}
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
                <div className="scroll-invisible w-full min-w-0 overflow-y-auto pr-1">
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
            sectionRef={(element) => { sectionRefs.current["bracket"] = element; }}
            open={openSection === 'standings'}
            onToggle={toggleStandings}
            contentId="bracket-content"
          >
            <div
              id="bracket-content"
              className="w-full min-w-0 p-3 sm:p-5 lg:p-6"
            >
              <div className="scroll-invisible w-full min-w-0 overflow-y-auto pr-1">
                <CompetitionOverview
                  mode={competitionMode}
                  groups={data.groups}
                  ties={data.ties}
                  championLabel={
                    data.tournament.championLabel
                  }
                  onSelectMatch={setSelectedMatch}
                  onSelectTeam={(team) => {
                    const row = data.standings.find(
                      (item) => item.team.id === team.id
                    );

                    if (row) {
                      setSelectedTeam({
                        row,
                        recentForm:
                          data.recentFormByTeam?.[row.team.id] ?? [],
                      });
                    }
                  }}
                />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Próximos partidos */}

        <SectionCard
          section="upcoming"
          sectionRef={(element) => { sectionRefs.current["upcoming"] = element; }}
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

            <div className="scroll-invisible overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-white/[0.04] dark:bg-black/[0.12] sm:px-4">
              {data.upcomingMatches.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No hay próximos partidos.
                </p>
              ) : (
                <div className="space-y-1 py-2">
                  {groupMatchesByDate(
                    data.upcomingMatches
                  ).map(([date, matches]) => (
                    <MatchDateAccordion
                      key={date}
                      date={date}
                      roundNumber={roundNumbers.get(date)}
                      count={matches.length}
                      isOpen={isDateOpen(`upcoming:${date}`)}
                      onToggle={() => toggleDate(`upcoming:${date}`)}
                      onShare={() =>
                        setShareRound({
                          date,
                          roundNumber: roundNumbers.get(date),
                          matches,
                        })
                      }
                      className="py-1.5 text-[10px] text-emerald-600 dark:text-emerald-300 sm:py-2 sm:text-xs"
                      dotClassName="bg-emerald-400"
                    >
                      <RoundShowcase
                        matches={matches}
                        onSelect={setSelectedMatch}
                      />
                    </MatchDateAccordion>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Goleadores */}

        <SectionCard
          section="scorers"
          sectionRef={(element) => { sectionRefs.current["scorers"] = element; }}
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
          sectionRef={(element) => { sectionRefs.current["goalkeepers"] = element; }}
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
          sectionRef={(element) => { sectionRefs.current["cards"] = element; }}
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
          sectionRef={(element) => { sectionRefs.current["history"] = element; }}
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

            <div className="scroll-invisible w-full min-w-0 overflow-y-auto overflow-x-hidden pr-1">
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-white/[0.07]">
                  Aún no hay partidos jugados.
                </p>
              ) : (
                <div className="space-y-2">
                  {groupMatchesByDate(history, 'desc').map(
                    ([date, matches]) => (
                      <MatchDateAccordion
                        key={date}
                        date={date}
                        roundNumber={roundNumbers.get(date)}
                        count={matches.length}
                        isOpen={isDateOpen(`history:${date}`)}
                        onToggle={() => toggleDate(`history:${date}`)}
                        className="py-2 text-xs text-blue-600 dark:text-blue-300 sm:text-sm"
                        dotClassName="bg-blue-400"
                      >
                        <div className="grid min-w-0 gap-3 pt-2 sm:grid-cols-2 sm:pt-3 lg:grid-cols-3">
                          {matches.map((match) => (
                            <HistoryMatchCard
                              key={match.id}
                              match={match}
                              onClick={() => setSelectedMatch(match)}
                            />
                          ))}
                        </div>
                      </MatchDateAccordion>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </section>

      {shareRound && (
        <ShareRoundModal
          round={shareRound}
          tournament={{ id, name: data.tournament.name }}
          onClose={() => setShareRound(null)}
        />
      )}

      <MatchDetailModal
        match={selectedMatch}
        recentFormByTeam={data.recentFormByTeam}
        onClose={() => setSelectedMatch(null)}
      />

      <TeamDetailModal
        selection={selectedTeam}
        blueCardEnabled={data.tournament.blueCardEnabled}
        onClose={() => setSelectedTeam(null)}
      />

      <PlayerCardModal
        row={featuredPlayerRow}
        respectPaymentStatus
        blueCardEnabled={data.tournament.blueCardEnabled}
        isGoalkeeper={Boolean(
          featuredPlayerRow?.isGoalkeeper ??
            featuredPlayerRow?.player?.isGoalkeeper
        )}
        onClose={() => setFeaturedPlayerRow(null)}
      />
    </main>
  );
}
