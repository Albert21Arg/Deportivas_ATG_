import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

const emptyForm = {
  title: '',
  linkUrl: '',
  delaySeconds: 0,
  durationSeconds: 8,
  status: 'ACTIVE',
  tournamentId: '',
  expiresAt: '',
  image: null,
};

function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

const mediaUrl = (path) =>
  path?.startsWith('http')
    ? path
    : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function getEndDate(item) {
  if (!item.createdAt || item.durationSeconds == null) {
    return null;
  }

  const createdAt = new Date(item.createdAt);

  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return new Date(
    createdAt.getTime() + Number(item.durationSeconds) * 1000
  );
}

function getStatusStyles(status) {
  if (status === 'ACTIVE') {
    return {
      label: 'Activo',
      className:
        'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-400',
    };
  }

  return {
    label: 'Inactivo',
    className:
      'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
    dot: 'bg-red-400',
  };
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();

  const [announcements, setAnnouncements] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Controla si el formulario está desplegado
  const [showForm, setShowForm] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data.data.announcements);
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }, [notify]);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return;

    loadAnnouncements();

    api
      .get('/tournaments')
      .then(({ data }) => setTournaments(data.data.tournaments))
      .catch(() => {});
  }, [loadAnnouncements, user]);

  if (user?.role !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />;

  function updateField(event) {
    const { name, value, files } = event.target;

    setForm((current) => ({
      ...current,
      [name]: files ? files[0] : value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm((current) => !current);
  }

  function startEditing(item) {
    setEditingId(item.id);

    setForm({
      title: item.title,
      linkUrl: item.linkUrl || '',
      delaySeconds: item.delaySeconds,
      durationSeconds: item.durationSeconds,
      status: item.status,
      tournamentId: item.tournamentId ? String(item.tournamentId) : '',
      expiresAt: toDateInputValue(item.expiresAt),
      image: null,
    });

    // Abrir automáticamente el formulario al editar
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    const payload = new FormData();

    [
      'title',
      'linkUrl',
      'delaySeconds',
      'durationSeconds',
      'status',
      'tournamentId',
      'expiresAt',
    ].forEach((key) => {
      payload.append(key, form[key]);
    });

    if (form.image) {
      payload.append('image', form.image);
    }

    try {
      if (editingId) {
        await api.patch(
          `/announcements/${editingId}`,
          payload,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
      } else {
        if (!form.image) {
          throw new Error('Debes seleccionar una imagen');
        }

        await api.post('/announcements', payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      const wasEditing = Boolean(editingId);

      resetForm();

      notify({
        type: 'success',
        title: wasEditing
          ? 'Anuncio actualizado'
          : 'Anuncio creado',
        message:
          'La configuración quedó guardada correctamente.',
      });

      loadAnnouncements();
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  async function toggleStatus(item) {
    try {
      await api.patch(`/announcements/${item.id}`, {
        status:
          item.status === 'ACTIVE'
            ? 'INACTIVE'
            : 'ACTIVE',
      });

      loadAnnouncements();
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  async function deleteAnnouncement(item) {
    setIsDeleting(true);
    try {
      await api.delete(`/announcements/${item.id}`);
      setAnnouncementToDelete(null);
      loadAnnouncements();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="lm-ready min-h-screen bg-slate-50 px-3 pb-10 pt-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:pt-24">
      <DashboardNavbar />

      <section className="mx-auto max-w-6xl">
        {/* Navegación */}
        <Link
          className="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 transition hover:text-emerald-700 hover:dark:text-emerald-300"
          to="/dashboard"
        >
          ← Volver al dashboard
        </Link>

        {/* Encabezado */}
        <header className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              Administración
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Anuncios
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Crea y administra los anuncios que aparecerán
              en tu plataforma.
            </p>
          </div>

          <div className="w-fit rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {announcements.length}{' '}
            {announcements.length === 1
              ? 'anuncio'
              : 'anuncios'}
          </div>
        </header>

        {/* =====================================================
            CREAR ANUNCIO - ACORDEÓN
        ====================================================== */}
        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-black/10">
          {/* Botón desplegable */}
          <button
            className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition sm:px-6 ${
              showForm
                ? 'bg-white dark:bg-slate-900'
                : 'hover:bg-slate-100 hover:dark:bg-slate-800/60'
            }`}
            type="button"
            onClick={openCreateForm}
            aria-expanded={showForm}
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* Icono */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                  editingId
                    ? 'bg-amber-400/10 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {editingId ? '✎' : '+'}
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold sm:text-lg">
                  {editingId
                    ? 'Editar anuncio'
                    : 'Crear anuncio'}
                </h2>

                <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                  {editingId
                    ? 'Modifica la configuración del anuncio.'
                    : 'Haz clic para crear un nuevo anuncio.'}
                </p>
              </div>
            </div>

            {/* Flecha */}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
                showForm ? 'rotate-180' : ''
              }`}
            >
              ↓
            </span>
          </button>

          {/* Formulario desplegable */}
          {showForm && (
            <div className="border-t border-slate-200 dark:border-slate-800">
              <form
                onSubmit={saveAnnouncement}
                className="p-4 sm:p-6"
              >
                {/* Cabecera */}
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Configuración
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Define cómo y cuándo se mostrará el
                      anuncio.
                    </p>
                  </div>

                  {editingId && (
                    <button
                      className="w-fit rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-400 hover:dark:border-slate-500 hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                      type="button"
                      onClick={resetForm}
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {/* Título */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Título
                    </span>

                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="title"
                      value={form.title}
                      onChange={updateField}
                      placeholder="Ej. Inscripciones abiertas"
                      required
                    />
                  </label>

                  {/* Imagen */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Imagen
                    </span>

                    <input
                      className="mt-2 block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:border-0 file:bg-emerald-500 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-slate-950 file:dark:text-slate-950 hover:border-emerald-500/50"
                      name="image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={updateField}
                      required={!editingId}
                    />

                    {form.image && (
                      <p className="mt-2 truncate text-xs text-emerald-600 dark:text-emerald-400">
                        ✓ {form.image.name}
                      </p>
                    )}

                    {editingId && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Deja vacío para conservar la imagen
                        actual.
                      </p>
                    )}
                  </label>

                  {/* Enlace */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Enlace opcional
                    </span>

                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="linkUrl"
                      type="url"
                      value={form.linkUrl}
                      onChange={updateField}
                      placeholder="https://..."
                    />
                  </label>

                  {/* Estado */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Estado
                    </span>

                    <select
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="status"
                      value={form.status}
                      onChange={updateField}
                    >
                      <option value="ACTIVE">
                        Activo
                      </option>

                      <option value="INACTIVE">
                        Inactivo
                      </option>
                    </select>
                  </label>

                  {/* Dónde se muestra */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      ¿Dónde se muestra?
                    </span>

                    <select
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="tournamentId"
                      value={form.tournamentId}
                      onChange={updateField}
                    >
                      <option value="">
                        Inicio (home)
                      </option>

                      {tournaments.map((tournament) => (
                        <option
                          key={tournament.id}
                          value={tournament.id}
                        >
                          {tournament.name}
                        </option>
                      ))}
                    </select>

                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Se muestra solo en un lugar: el inicio o
                      la página del torneo que elijas, nunca
                      en ambos.
                    </p>
                  </label>

                  {/* Fecha de caducidad */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Fecha de caducidad (opcional)
                    </span>

                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="expiresAt"
                      type="date"
                      value={form.expiresAt}
                      onChange={updateField}
                    />

                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Al llegar esta fecha el anuncio se desactiva
                      automáticamente. Déjalo vacío para que no caduque.
                    </p>
                  </label>

                  {/* Delay */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Aparecer después
                    </span>

                    <div className="relative mt-2">
                      <input
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 pr-20 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                        name="delaySeconds"
                        type="number"
                        min="0"
                        max="86400"
                        value={form.delaySeconds}
                        onChange={updateField}
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                        segundos
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Tiempo que espera antes de mostrarlo.
                    </p>
                  </label>

                  {/* Duración */}
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Duración del anuncio
                    </span>

                    <div className="relative mt-2">
                      <input
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 pr-20 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                        name="durationSeconds"
                        type="number"
                        min="1"
                        max="86400"
                        value={form.durationSeconds}
                        onChange={updateField}
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                        segundos
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Tiempo durante el que estará visible.
                    </p>
                  </label>
                </div>

                {/* Botones */}
                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-slate-800 pt-5 sm:flex-row sm:justify-end">
                  <button
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-400 hover:dark:border-slate-500 hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                    type="button"
                    onClick={resetForm}
                  >
                    Cancelar
                  </button>

                  <button
                    className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 dark:text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 active:scale-[0.98]"
                    type="submit"
                  >
                    {editingId
                      ? 'Guardar cambios'
                      : 'Crear anuncio'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* =====================================================
            ANUNCIOS EXISTENTES
        ====================================================== */}
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                Anuncios creados
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Consulta y administra tus anuncios activos e
                inactivos.
              </p>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xl">
                📢
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No hay anuncios todavía
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Crea tu primer anuncio usando el botón
                superior.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.map((item) => {
                const status =
                  getStatusStyles(item.status);

                const endDate = getEndDate(item);

                return (
                  <article
                    className="group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:dark:border-slate-700 hover:shadow-lg hover:shadow-black/20"
                    key={item.id}
                  >
                    {/* Imagen */}
                    <div className="relative h-28 overflow-hidden bg-white dark:bg-slate-950">
                      <img
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        src={mediaUrl(item.imageUrl)}
                        alt={item.title}
                      />

                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/80 to-transparent" />

                      <span
                        className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold backdrop-blur-sm ${status.className}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                        />

                        {status.label}
                      </span>
                    </div>

                    {/* Contenido */}
                    <div className="p-3.5">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>

                        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wider text-slate-900 dark:text-cyan-400">
                          {item.tournament
                            ? item.tournament.name
                            : 'Inicio (home)'}
                        </p>

                        {item.linkUrl && (
                          <p className="mt-1 truncate text-[11px] text-emerald-600 dark:text-emerald-400">
                            {item.linkUrl}
                          </p>
                        )}
                      </div>

                      {/* Fechas */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-2.5 py-2">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                            Creado
                          </p>

                          <p className="mt-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-2.5 py-2">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                            Activo hasta
                          </p>

                          <p
                            className={`mt-1 text-[11px] font-medium ${
                              item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.expiresAt
                              ? formatDate(item.expiresAt)
                              : 'Sin fecha'}
                          </p>
                        </div>
                      </div>

                      {/* Información */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          Espera: {item.delaySeconds}s
                        </span>

                        <span>
                          Duración: {item.durationSeconds}s
                        </span>
                      </div>

                      {endDate && (
                        <p className="mt-1 text-[10px] text-slate-600">
                          Hasta {formatDateTime(endDate)}
                        </p>
                      )}

                      {/* Acciones */}
                      <div className="mt-3 flex gap-1.5">
                        <button
                          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition hover:border-emerald-400 hover:bg-emerald-400/5 hover:text-emerald-700 hover:dark:text-emerald-300"
                          onClick={() =>
                            startEditing(item)
                          }
                          type="button"
                        >
                          Editar
                        </button>

                        <button
                          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition hover:border-amber-500 hover:bg-amber-500/5 hover:text-amber-700 hover:dark:text-amber-300"
                          onClick={() =>
                            toggleStatus(item)
                          }
                          type="button"
                        >
                          {item.status === 'ACTIVE'
                            ? 'Desactivar'
                            : 'Activar'}
                        </button>

                        <button
                          className="rounded-md border border-red-900/60 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300 transition hover:border-red-500 hover:bg-red-500/5"
                          onClick={() => setAnnouncementToDelete(item)}
                          type="button"
                          aria-label={`Eliminar ${item.title}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {announcementToDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-white dark:bg-slate-950/80 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => !isDeleting && setAnnouncementToDelete(null)}
        >
          <section
            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-white dark:bg-slate-900 p-6 shadow-2xl shadow-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-announcement-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-xl font-black text-red-700 dark:text-red-300">
              !
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white" id="delete-announcement-title">
              ¿Eliminar anuncio?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Vas a eliminar <span className="font-semibold text-slate-700 dark:text-slate-200">{announcementToDelete.title}</span>.
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-400 hover:dark:border-slate-500 hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white disabled:opacity-50"
                type="button"
                disabled={isDeleting}
                onClick={() => setAnnouncementToDelete(null)}
              >
                Cancelar
              </button>

              <button
                className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
                type="button"
                disabled={isDeleting}
                onClick={() => deleteAnnouncement(announcementToDelete)}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar anuncio'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
