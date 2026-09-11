import { useEffect, useRef, useState } from 'react';

import api from '../services/api.js';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;
}

export default function AnnouncementModal() {
  const [announcements, setAnnouncements] = useState([]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const { data } = await api.get('/public/announcements/active');
        setAnnouncements(data.data.announcements ?? []);
      } catch {
        // Los anuncios no deben bloquear la navegación pública.
      }
    }

    loadAnnouncement();
  }, []);

  useEffect(() => {
    const announcement = announcements[announcementIndex];
    if (!announcement) return undefined;

    const seconds = visible
      ? announcement.durationSeconds
      : Math.max(announcement.delaySeconds, 1);

    const timer = window.setTimeout(() => {
      if (visible) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    }, seconds * 1000);

    return () => window.clearTimeout(timer);
  }, [announcements, announcementIndex, visible]);

  useEffect(() => {
    if (wasVisible.current && !visible) {
      setAnnouncementIndex((current) => current + 1);
    }

    wasVisible.current = visible;
  }, [visible]);

  const announcement = announcements[announcementIndex];

  if (!announcement || !visible) return null;

  const image = (
    <img
      className="max-h-[70vh] w-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
      src={mediaUrl(announcement.imageUrl)}
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
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />

      <div className="relative w-full max-w-3xl animate-[modalIn_.35s_ease-out]">
        {/* Etiqueta superior */}
        <div className="mb-3 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 shadow-lg shadow-cyan-500/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            Anuncio
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.8)]">
          {/* Borde/brillo superior */}
          <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

          {/* Botón cerrar */}
          <button
            className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/75 text-xl text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-slate-800 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            type="button"
            aria-label="Cerrar anuncio"
            onClick={() => setVisible(false)}
          >
            <span aria-hidden="true">×</span>
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
          <div className="relative px-5 pb-5 pt-2 sm:px-7 sm:pb-7">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {announcement.title}
                </h2>

                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-1 w-1 rounded-full bg-cyan-400" />
                  <span>Puedes cerrar este anuncio con X</span>
                </div>
              </div>

              {announcement.linkUrl && (
                <a
                  href={announcement.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setVisible(false)}
                  className="hidden shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:bg-cyan-300 sm:flex"
                >
                  Ver más
                  <span aria-hidden="true">→</span>
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
                        ? 'w-7 bg-cyan-400'
                        : 'w-1.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}
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
      `}</style>
    </div>
  );
}
