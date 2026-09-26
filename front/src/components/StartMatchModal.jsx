import { useState } from 'react';

/*
|--------------------------------------------------------------------------
| Modal: iniciar partido
|--------------------------------------------------------------------------
| Pide cuántos minutos dura cada tiempo antes de arrancar el cronómetro.
| No hay un valor por defecto fijo: cada torneo/categoría puede jugar
| tiempos de distinta duración (fútbol 11, fútbol 5, categorías menores...).
*/

export default function StartMatchModal({ match, isLoading = false, onCancel, onConfirm }) {
  const [minutes, setMinutes] = useState('25');

  if (!match) return null;

  const parsedMinutes = Number(minutes);
  const isValid = Number.isInteger(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= 60;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={() => !isLoading && onCancel()}
    >
      <section
        className="w-full max-w-sm rounded-2xl border border-emerald-300 bg-white p-6 shadow-2xl shadow-black/10 dark:border-emerald-500/20 dark:bg-slate-900 dark:shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-match-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-xl font-black text-emerald-600 dark:text-emerald-300">
          ⏱️
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white" id="start-match-title">
          Iniciar partido
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {match.homeTeam?.name} vs {match.awayTeam?.name}. Define cuánto dura cada tiempo para arrancar el cronómetro; podrás agregar tiempo extra más adelante si hace falta.
        </p>

        <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Duración de cada tiempo (minutos)

          <input
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            type="number"
            min="1"
            max="60"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            autoFocus
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
            type="button"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancelar
          </button>

          <button
            className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isLoading || !isValid}
            onClick={() => onConfirm(parsedMinutes)}
          >
            {isLoading ? 'Iniciando...' : 'Iniciar partido'}
          </button>
        </div>
      </section>
    </div>
  );
}
