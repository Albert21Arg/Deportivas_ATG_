import { useEffect, useState } from 'react';

import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import { useNotifications } from '../context/NotificationContext.jsx';

export default function DtAccountModal({ tournamentId, team, onClose }) {
  const { notify } = useNotifications();

  const [currentDt, setCurrentDt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    async function loadDt() {
      setIsLoading(true);

      try {
        const { data } = await api.get(`/tournaments/${tournamentId}/teams/${team.id}/dt`);
        setCurrentDt(data.data.dt);
        setEmail(data.data.dt?.email ?? '');
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadDt();
  }, [tournamentId, team.id, notify]);

  async function saveDt(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const { data } = await api.put(`/tournaments/${tournamentId}/teams/${team.id}/dt`, {
        email,
        password,
      });
      setCurrentDt(data.data.dt);
      setPassword('');
      notify({ type: 'success', title: 'Cuenta DT guardada', message: `${team.name} ya puede inscribir jugadores.` });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-black/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/50"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Cuenta DT — {team.name}
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {currentDt
            ? 'Ya existe una cuenta DT para este equipo. Podés cambiar su email o resetear la contraseña.'
            : 'Este equipo todavía no tiene DT. Creá su cuenta con email y contraseña.'}
        </p>

        {!isLoading && currentDt && (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
            Correo actualmente inscrito: <span className="font-semibold">{currentDt.email}</span>
          </div>
        )}

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Cargando...</p>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={saveDt}>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Email

              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {currentDt ? 'Nueva contraseña' : 'Contraseña'}

              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </label>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                type="button"
                onClick={onClose}
                disabled={isSaving}
              >
                Cerrar
              </button>

              <button
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : currentDt ? 'Actualizar cuenta' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
