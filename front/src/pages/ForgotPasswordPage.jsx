import { useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import PublicNavbar from '../components/PublicNavbar.jsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email });
      // Siempre se muestra el mismo mensaje de éxito, exista o no la cuenta,
      // para no revelar qué correos están registrados.
      setIsSent(true);
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
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Recuperar contraseña</h1>

        {isSent ? (
          <>
            <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
              Si el correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).
            </p>

            <Link
              className="mt-6 inline-block text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              to="/login"
            >
              ← Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Escribe tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
                <input
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
              </button>

              <Link
                className="block text-center text-sm font-semibold text-slate-500 hover:text-emerald-600 hover:dark:text-emerald-400"
                to="/login"
              >
                ← Volver a iniciar sesión
              </Link>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
