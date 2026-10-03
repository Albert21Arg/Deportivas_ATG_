import { useEffect, useRef, useState } from 'react';

import api from '../services/api.js';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.fetchPriority = 'high';
    image.decoding = 'async';
    image.onload = () => image.decode().then(resolve, resolve);
    image.onerror = resolve;
    image.src = url;
    if (image.complete) image.decode().then(resolve, resolve);
  });
}

const MINIMUM_ANNOUNCEMENT_SECONDS = 10;

/*
|--------------------------------------------------------------------------
| Anillo de cuenta regresiva del botón cerrar
|--------------------------------------------------------------------------
| Imita el "podrás saltar el anuncio en Xs" de la publicidad comercial: el
| cierre queda bloqueado unos segundos y se ve un anillo consumiéndose.
*/

function CloseCountdownRing({ secondsLeft, totalSeconds }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return (
    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} strokeWidth="3" fill="none" stroke="rgba(255,255,255,0.2)" />
      <circle
        cx="20"
        cy="20"
        r={radius}
        strokeWidth="3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        className="text-amber-400 transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
  );
}

export default function AnnouncementModal({ tournamentId } = {}) {
  const [announcements, setAnnouncements] = useState([]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closeLockRemaining, setCloseLockRemaining] = useState(0);
  const wasVisible = useRef(false);

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const { data } = await api.get('/public/announcements/active', {
          params: tournamentId ? { tournamentId } : undefined,
        });
        setAnnouncements(data.data.announcements ?? []);
      } catch {
        // Los anuncios no deben bloquear la navegación pública.
      }
    }

    setAnnouncements([]);
    setAnnouncementIndex(0);
    setVisible(false);
    wasVisible.current = false;
    loadAnnouncement();
  }, [tournamentId]);

  useEffect(() => {
    const announcement = announcements[announcementIndex];
    if (!announcement) return undefined;

    if (visible) {
      const timer = window.setTimeout(
        () => setVisible(false),
        Math.max(announcement.durationSeconds, MINIMUM_ANNOUNCEMENT_SECONDS) * 1000,
      );
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    let delayTimer;
    const delay = new Promise((resolve) => {
      delayTimer = window.setTimeout(resolve, Math.max(announcement.delaySeconds, 1) * 1000);
    });
    const imageReady = preloadImage(mediaUrl(announcement.imageUrl));

    Promise.all([delay, imageReady]).then(() => {
      if (!cancelled) setVisible(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
    };
  }, [announcements, announcementIndex, visible]);

  useEffect(() => {
    if (wasVisible.current && !visible) {
      setAnnouncementIndex((current) => current + 1);
    }

    wasVisible.current = visible;
  }, [visible]);

  /*
  |--------------------------------------------------------------------------
  | Bloqueo de cierre estilo "anuncio saltable"
  |--------------------------------------------------------------------------
  */

  const activeAnnouncement = announcements[announcementIndex];
  const closeLockSeconds = activeAnnouncement ? MINIMUM_ANNOUNCEMENT_SECONDS : 0;

  useEffect(() => {
    if (!visible || closeLockSeconds === 0) {
      setCloseLockRemaining(0);
      return undefined;
    }

    setCloseLockRemaining(closeLockSeconds);

    const interval = window.setInterval(() => {
      setCloseLockRemaining((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, announcementIndex]);

  const announcement = announcements[announcementIndex];

  if (!announcement || !visible) return null;

  const isCloseLocked = closeLockRemaining > 0;

  function closeAnnouncement() {
    if (isCloseLocked) return;
    setVisible(false);
  }

  const image = (
    <img
      className="max-h-[70vh] w-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
      src={mediaUrl(announcement.imageUrl)}
      fetchPriority="high"
      decoding="async"
      loading="eager"
      alt={announcement.title}
    />
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/90 px-4 py-6 backdrop-blur-md sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={announcement.title}
    >
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[110px]" />

      <div className="relative w-full max-w-3xl animate-[modalIn_.35s_ease-out]">
        <div className="group relative overflow-hidden rounded-[1.5rem] border border-amber-400/25 bg-slate-900 shadow-[0_25px_90px_-20px_rgba(0,0,0,0.85)] ring-1 ring-amber-400/10">
          {/* Marco animado tipo "anuncio" */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-[1.5rem] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.15)]" />
          <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

          {/* Distintivo de publicidad (esquina) */}
          <div className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-md bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-950 shadow-lg shadow-amber-500/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-950/70" />
            Publicidad
          </div>

          {/* Botón cerrar / cuenta regresiva */}
          <button
            className={`absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/75 text-xl text-white shadow-xl backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${
              isCloseLocked
                ? 'cursor-not-allowed opacity-90'
                : 'hover:scale-105 hover:bg-slate-800 hover:text-amber-300'
            }`}
            type="button"
            aria-label={
              isCloseLocked
                ? `Podrás cerrar este anuncio en ${closeLockRemaining} segundos`
                : 'Cerrar anuncio'
            }
            aria-live="polite"
            disabled={isCloseLocked}
            onClick={closeAnnouncement}
          >
            {isCloseLocked ? (
              <span className="relative flex h-full w-full items-center justify-center">
                <CloseCountdownRing
                  secondsLeft={closeLockRemaining}
                  totalSeconds={closeLockSeconds}
                />
                <span className="text-[11px] font-bold tabular-nums text-amber-300">
                  {closeLockRemaining}
                </span>
              </span>
            ) : (
              <span aria-hidden="true">×</span>
            )}
          </button>

          {/* Imagen */}
          <div className="relative overflow-hidden bg-slate-950">
            {announcement.linkUrl ? (
              <a
                href={announcement.linkUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ver ${announcement.title}`}
                onClick={() => setVisible(false)}
                className="block cursor-pointer"
              >
                {image}
              </a>
            ) : (
              image
            )}

            {/* Degradado inferior */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          </div>

          {/* Información */}
          <div className="relative px-5 pb-6 pt-3 sm:px-7 sm:pb-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {announcement.title}
                </h2>

                <p className="mt-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                  Contenido patrocinado
                  {isCloseLocked && (
                    <>
                      {' '}
                      · se podrá cerrar en{' '}
                      <span className="font-bold text-amber-400">
                        {closeLockRemaining}s
                      </span>
                    </>
                  )}
                </p>
              </div>

              {announcement.linkUrl && (
                <a
                  href={announcement.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setVisible(false)}
                  className="group/cta relative flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 hover:shadow-amber-500/50 sm:w-auto"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/40 opacity-0 blur-sm transition-all duration-700 group-hover/cta:left-[130%] group-hover/cta:opacity-100"
                  />
                  <span className="relative">Ver más</span>
                  <span aria-hidden="true" className="relative">
                    →
                  </span>
                </a>
              )}
            </div>

            {/* Indicador visual de anuncio */}
            {announcements.length > 1 && (
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {announcements.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === announcementIndex
                        ? 'w-7 bg-amber-400'
                        : 'w-1.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Barra de progreso: tiempo restante del anuncio en pantalla */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
              style={{
                animation: `adProgress ${Math.max(
                  announcement.durationSeconds,
                  MINIMUM_ANNOUNCEMENT_SECONDS
                )}s linear forwards`,
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes adProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
