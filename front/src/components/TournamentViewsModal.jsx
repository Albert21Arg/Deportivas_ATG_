import { useEffect, useState } from 'react';

import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import { useNotifications } from '../context/NotificationContext.jsx';

function formatDay(value) {
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`)
  );
}

const MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatMonth(value) {
  const [year, month] = value.split('-');
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
}

export default function TournamentViewsModal({ tournament, onClose }) {
  const { notify } = useNotifications();

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);

      try {
        const { data } = await api.get(`/tournaments/${tournament.id}/views`);
        setStats(data.data);
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [tournament.id, notify]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/80 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-black/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/50"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visitas</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tournament.name}</p>
          </div>

          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.06] text-sm text-slate-500 transition hover:bg-slate-100 hover:dark:bg-white/[0.06]"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-500">Cargando...</p>
        ) : !stats ? (
          <p className="mt-6 text-sm text-slate-500">No se pudieron cargar las visitas.</p>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-500/30 dark:bg-emerald-950/30">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                Total de interacciones
              </p>
              <p className="mt-1 text-3xl font-black text-emerald-800 dark:text-emerald-200">{stats.total}</p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Por mes</h3>

              {stats.byMonth.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Todavía no hay visitas.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.byMonth.slice(0, 12).map((row) => (
                    <li key={row.month} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="capitalize text-slate-700 dark:text-slate-300">{formatMonth(row.month)}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Por día (últimos 30)</h3>

              {stats.byDay.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Todavía no hay visitas.</p>
              ) : (
                <ul className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                  {stats.byDay.slice(0, 30).map((row) => (
                    <li key={row.day} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{formatDay(row.day)}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
