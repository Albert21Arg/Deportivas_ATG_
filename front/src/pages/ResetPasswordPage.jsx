import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import PublicNavbar from '../components/PublicNavbar.jsx';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { notify } = useNotifications();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      notify({
        type: 'success',
        title: 'Contraseña actualizada',
        message: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      });
      navigate('/login', { replace: true });
    } catch (requestError) {
      const details = getApiErrorDetails(requestError);
      setError(`${details.title}: ${details.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 pb-12 pt-28 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicNavbar showLogin={false} />
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Deportiva</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Nueva contraseña</h1>

        {!token ? (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            Este enlace no es válido. Solicita uno nuevo desde{' '}
            <Link className="font-semibold underline" to="/forgot-password">
              recuperar contraseña
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Escribe tu nueva contraseña para esta cuenta.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nueva contraseña
                <input
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength="8"
                  value={form.password}
                  onChange={updateField}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirmar contraseña
                <input
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength="8"
                  value={form.confirmPassword}
                  onChange={updateField}
                  required
                />
              </label>

              {error && (
                <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </p>
              )}

              <button
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
