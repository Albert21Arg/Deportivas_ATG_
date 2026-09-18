import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { getApiErrorDetails } from '../utils/api-error.js';
import PublicNavbar from '../components/PublicNavbar.jsx';

// El DT aterriza en su propia página de inscripción, no en el dashboard
// completo de admin/superadmin.
function homeForRole(role) {
  return role === 'DT' ? '/dt/jugadores' : '/dashboard';
}

export default function LoginPage() {
  const { isAuthenticated, user, login } = useAuth();
  const { notify } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={homeForRole(user?.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(form.email, form.password);
      notify({
        type: 'success',
        title: 'Inicio de sesión exitoso',
        message: 'Tu sesión fue validada correctamente. Bienvenido a la plataforma.',
      });
      const destination = location.state?.from?.pathname ?? homeForRole(loggedInUser.role);
      navigate(destination, { replace: true });
    } catch (requestError) {
      const details = getApiErrorDetails(requestError);
      setError(`${details.title}: ${details.message}`);
      notify({
        type: 'error',
        title: details.title,
        message: details.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 pb-12 pt-28 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicNavbar showLogin={false} />
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Deportiva</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Accede a la gestión de tus torneos.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Contraseña
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength="8"
              value={form.password}
              onChange={updateField}
              required
            />
          </label>

          <Link
            className="block text-right text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            to="/forgot-password"
          >
            ¿Olvidaste tu contraseña?
          </Link>

          {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">{error}</p>}

          <button
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Validando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}
