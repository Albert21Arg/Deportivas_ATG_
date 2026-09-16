import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

export default function SiteSettingsPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [faviconUrl, setFaviconUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/site-settings');
      setFaviconUrl(data.data.settings.faviconUrl ?? '');
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }, [notify]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (user?.role !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />;

  async function saveSettings(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await api.patch('/site-settings', { faviconUrl: faviconUrl.trim() });
      notify({
        type: 'success',
        title: 'Ícono actualizado',
        message: 'El ícono de la pestaña se actualizará al recargar la página.',
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 pb-16 pt-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:pt-24">
      <DashboardNavbar />

      <section className="mx-auto max-w-2xl">
        <Link
          className="inline-flex text-sm font-medium text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
          to="/dashboard"
        >
          ← Volver al dashboard
        </Link>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
            Administración
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Configuración del sitio
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Define la imagen que se usa como ícono en la pestaña del navegador
            (favicon) para toda la plataforma.
          </p>
        </header>

        <form
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10 sm:p-6"
          onSubmit={saveSettings}
        >
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            URL de la imagen
            <input
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              type="url"
              placeholder="https://.../favicon.png"
              value={faviconUrl}
              onChange={(event) => setFaviconUrl(event.target.value)}
            />
          </label>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            Déjalo vacío para volver al ícono por defecto del navegador.
          </p>

          {faviconUrl.trim() && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <img
                className="h-8 w-8 shrink-0 rounded object-contain"
                src={faviconUrl.trim()}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden';
                }}
                onLoad={(event) => {
                  event.currentTarget.style.visibility = 'visible';
                }}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vista previa de la imagen
              </p>
            </div>
          )}

          <button
            className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </section>
    </main>
  );
}
