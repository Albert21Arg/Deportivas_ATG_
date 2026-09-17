import { useEffect, useState } from 'react';

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

/*
|--------------------------------------------------------------------------
| Modal para generar el fixture
|--------------------------------------------------------------------------
| Antes de generar todos contra todos, pide fecha y hora del primer partido
| y cada cuántos días se juega una fecha nueva. Con eso arma el calendario:
| cada fecha empieza intervalDays después de la anterior, y dentro de una
| misma fecha cada partido arranca 1 hora después del anterior (lo resuelve
| el backend, esto solo recolecta los 3 datos de entrada).
*/

export default function GenerateFixtureModal({ isOpen, isLoading, onCancel, onConfirm }) {
  const [startDate, setStartDate] = useState(todayInputValue());
  const [time, setTime] = useState('15:00');
  const [intervalDays, setIntervalDays] = useState('7');

  useEffect(() => {
    if (isOpen) {
      setStartDate(todayInputValue());
      setTime('15:00');
      setIntervalDays('7');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({ startDate, time, intervalDays: Number(intervalDays) });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={() => !isLoading && onCancel()}
    >
      <section
        className="w-full max-w-md rounded-2xl border border-cyan-300 bg-white p-6 shadow-2xl shadow-black/10 dark:border-cyan-500/20 dark:bg-slate-900 dark:shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-fixture-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-xl font-black text-cyan-700 dark:text-cyan-300">
          📅
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white" id="generate-fixture-title">
          Generar fixture
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Se programarán automáticamente todos los partidos de todos contra todos. Indica cuándo
          arranca y cada cuánto se juega una fecha nueva.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Fecha del primer partido

            <input
              required
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Hora del primer partido

            <input
              required
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Cada cuántos días se juega una fecha nueva

            <input
              required
              className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              type="number"
              min="1"
              step="1"
              value={intervalDays}
              onChange={(event) => setIntervalDays(event.target.value)}
            />

            <span className="mt-1.5 block text-xs font-normal text-slate-500">
              Ej. 7 = una fecha por semana. Dentro de una misma fecha, cada partido se programa 1
              hora después del anterior.
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
              type="button"
              disabled={isLoading}
              onClick={onCancel}
            >
              Cancelar
            </button>

            <button
              className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Generando...' : 'Generar fixture'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
