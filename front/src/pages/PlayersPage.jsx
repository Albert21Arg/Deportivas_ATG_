import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import ConfirmActionModal from '../components/ConfirmActionModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

const emptyForm = {
  name: '',
  birthDate: '',
  documentNumber: '',
  jerseyNumber: '',
  paidUntil: '',
  status: 'ACTIVE',
  photo: null,
  fixedOvr: '',
};

const mediaUrl = (path) =>
  path?.startsWith('http')
    ? path
    : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;

function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

/*
|--------------------------------------------------------------------------
| Página de jugadores
|--------------------------------------------------------------------------
*/

export default function PlayersPage() {
  const { tournamentId, teamId } = useParams();
  const { notify } = useNotifications();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [players, setPlayers] = useState([]);
  const [team, setTeam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [playerToDisable, setPlayerToDisable] = useState(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingGoalkeeper, setIsTogglingGoalkeeper] = useState(null);
  const [isTogglingShowName, setIsTogglingShowName] = useState(null);

  const [playerSearch, setPlayerSearch] = useState('');
  const [expandedActionIds, setExpandedActionIds] = useState(() => new Set());
  const [showMobileFab, setShowMobileFab] = useState(false);

  // Solo una fila con las acciones desplegadas a la vez: abrir otra cierra
  // la anterior.
  function toggleActions(playerId) {
    setExpandedActionIds((current) =>
      current.has(playerId) ? new Set() : new Set([playerId]),
    );
  }

  // El botón flotante para crear jugador solo aparece cuando el usuario ya
  // bajó lo suficiente como para perder de vista el CTA del encabezado.
  useEffect(() => {
    function handleScroll() {
      setShowMobileFab(window.scrollY > 420);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Cargar jugadores
  |--------------------------------------------------------------------------
  */

  const loadPlayers = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/tournaments/${tournamentId}/teams/${teamId}/players`
      );

      setPlayers(data.data.players);
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }, [notify, teamId, tournamentId]);

  /*
  |--------------------------------------------------------------------------
  | Cargar equipo
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadPlayers();

    api
      .get(`/teams/${teamId}`)
      .then(({ data }) => setTeam(data.data.team))
      .catch(() => {});
  }, [loadPlayers, teamId]);

  /*
  |--------------------------------------------------------------------------
  | Formulario
  |--------------------------------------------------------------------------
  */

  function updateField(event) {
    const { name, value, files } = event.target;

    setForm((current) => ({
      ...current,
      [name]: files ? files[0] : value,
    }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEditing(player) {
    setEditingId(player.id);

    setForm({
      name: player.name,
      birthDate: toDateInputValue(player.birthDate),
      documentNumber: player.documentNumber ?? '',
      jerseyNumber: player.jerseyNumber ?? '',
      paidUntil: toDateInputValue(player.paidUntil),
      status: player.status,
      photo: null,
      fixedOvr: player.fixedOvr ?? '',
    });

    setShowForm(true);
  }

  /*
  |--------------------------------------------------------------------------
  | Guardar jugador
  |--------------------------------------------------------------------------
  */

  async function savePlayer(event) {
    event.preventDefault();

    setIsSaving(true);

    const payload = new FormData();

    ['name', 'birthDate', 'documentNumber', 'jerseyNumber', 'paidUntil', 'status', 'fixedOvr'].forEach(
      (key) => payload.append(key, form[key])
    );

    if (form.photo) {
      payload.append('photo', form.photo);
    }

    try {
      if (editingId) {
        await api.patch(
          `/tournaments/${tournamentId}/teams/${teamId}/players/${editingId}`,
          payload
        );
      } else {
        await api.post(
          `/tournaments/${tournamentId}/teams/${teamId}/players`,
          payload
        );
      }

      notify({
        type: 'success',
        title: editingId ? 'Jugador actualizado' : 'Jugador creado',
        message: 'La información del jugador fue guardada.',
      });

      closeForm();
      loadPlayers();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Cambiar estado
  |--------------------------------------------------------------------------
  */

  async function toggleStatus(player) {
    setIsChangingStatus(true);
    try {
      await api.patch(
        `/tournaments/${tournamentId}/teams/${teamId}/players/${player.id}`,
        {
          status: player.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
        }
      );

      loadPlayers();
      setPlayerToDisable(null);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsChangingStatus(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Eliminar (solo si nunca ha jugado un partido)
  |--------------------------------------------------------------------------
  */

  async function deletePlayer(player) {
    setIsDeleting(true);

    try {
      await api.delete(
        `/tournaments/${tournamentId}/teams/${teamId}/players/${player.id}`
      );

      notify({
        type: 'success',
        title: 'Jugador eliminado',
        message: `${player.name} fue eliminado de la plantilla.`,
      });

      setPlayerToDelete(null);
      loadPlayers();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsDeleting(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Marcar/quitar arquero (uno solo por equipo)
  |--------------------------------------------------------------------------
  */

  async function toggleGoalkeeper(player) {
    setIsTogglingGoalkeeper(player.id);

    try {
      await api.patch(
        `/tournaments/${tournamentId}/teams/${teamId}/players/${player.id}/goalkeeper`,
        { isGoalkeeper: !player.isGoalkeeper }
      );

      notify({
        type: 'success',
        title: player.isGoalkeeper ? 'Arquero quitado' : 'Arquero asignado',
        message: player.isGoalkeeper
          ? `${player.name} ya no es el arquero del equipo.`
          : `${player.name} ahora es el arquero del equipo.`,
      });

      loadPlayers();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsTogglingGoalkeeper(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Mostrar/ocultar nombre (borroso en todos los sitios públicos)
  |--------------------------------------------------------------------------
  */

  async function toggleShowName(player) {
    setIsTogglingShowName(player.id);

    try {
      await api.patch(
        `/tournaments/${tournamentId}/teams/${teamId}/players/${player.id}/show-name`,
        { showName: !(player.showName ?? true) }
      );

      notify({
        type: 'success',
        title: player.showName === false ? 'Nombre visible' : 'Nombre oculto',
        message: player.showName === false
          ? `El nombre de ${player.name} vuelve a verse en claro.`
          : `El nombre de ${player.name} se verá borroso en todo el sitio.`,
      });

      loadPlayers();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsTogglingShowName(null);
    }
  }

  const activePlayers = players.filter(
    (player) => player.status === 'ACTIVE'
  ).length;

  const disabledPlayers = players.length - activePlayers;

  const normalizedPlayerSearch = playerSearch.trim().toLowerCase();

  const filteredPlayers = players.filter((player) =>
    !normalizedPlayerSearch ||
    player.name.toLowerCase().includes(normalizedPlayerSearch)
  );

  return (
    <main className="lm-ready min-h-screen bg-slate-50 px-4 pb-24 pt-24 text-slate-900 dark:bg-[#070b12] dark:text-slate-100 sm:px-6 sm:pb-16">
      <DashboardNavbar />

      <section className="mx-auto max-w-6xl">

        {/* ---------------------------------------------------------------- */}
        {/* Volver */}
        {/* ---------------------------------------------------------------- */}

        <Link
          className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-600 hover:dark:text-emerald-400"
          to={`/dashboard/teams?tournamentId=${tournamentId}`}
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>

          Volver a equipos
        </Link>

        {/* ---------------------------------------------------------------- */}
        {/* Header */}
        {/* ---------------------------------------------------------------- */}

        <header className="relative mt-5 overflow-hidden rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-xl shadow-black/5 dark:shadow-2xl dark:shadow-black/20">

          {/* Luz */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/[0.07] blur-3xl" />

          <div className="relative p-5 sm:p-6">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              {/* Información */}
              <div className="flex min-w-0 items-center gap-4">

                {/* Logo / inicial */}
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-500/10 text-xl font-black text-emerald-700 dark:text-emerald-300 sm:flex">
                  {team?.name?.charAt(0)?.toUpperCase() || 'E'}
                </div>

                <div className="min-w-0">

                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    Gestión de plantilla
                  </div>

                  <h1 className="mt-3 truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    Jugadores
                  </h1>

                  {team && (
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {team.name}
                    </p>
                  )}

                  <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                    Registra y administra los integrantes de este equipo.
                  </p>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="flex items-center gap-2">

                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-500/10 px-4 py-3 text-center">
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                    {activePlayers}
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Activos
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-slate-800/50 px-4 py-3 text-center">
                  <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                    {players.length}
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Total
                  </p>
                </div>

                {disabledPlayers > 0 && (
                  <div className="rounded-2xl border border-amber-400/10 bg-amber-500/10 px-4 py-3 text-center">
                    <p className="text-lg font-black text-amber-700 dark:text-amber-300">
                      {disabledPlayers}
                    </p>

                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      Inhab.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Acción */}
            <div className="mt-5 border-t border-slate-200 dark:border-white/[0.06] pt-5">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 dark:text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 sm:w-auto"
                type="button"
                onClick={openCreateForm}
              >
                <span className="text-lg leading-none">+</span>
                Nuevo jugador
              </button>
            </div>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Formulario (ventana flotante) */}
        {/* ---------------------------------------------------------------- */}

        {showForm && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/80 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeForm();
            }}
          >
            <section
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl shadow-black/20 dark:shadow-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="player-form-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <span className="text-xl leading-none">
                      {editingId ? '✎' : '+'}
                    </span>
                  </div>

                  <div>
                    <h2 id="player-form-title" className="text-sm font-bold text-slate-900 dark:text-white">
                      {editingId ? 'Editar jugador' : 'Nuevo jugador'}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {editingId
                        ? 'Actualiza la información del jugador'
                        : 'Añade un nuevo integrante a la plantilla'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.06] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 hover:dark:bg-slate-800 hover:dark:text-white"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={savePlayer}
                className="border-t border-slate-200 dark:border-white/[0.06]"
              >

                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">

                  {/* Nombre */}
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nombre
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">*</span>

                    <input
                      required
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      placeholder="Nombre completo"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition placeholder:text-slate-600 hover:border-slate-300 hover:dark:border-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                    />
                  </label>

                  {/* Fecha */}
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Fecha de nacimiento

                    <input
                      name="birthDate"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={form.birthDate}
                      onChange={updateField}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition hover:border-slate-300 hover:dark:border-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                    />
                  </label>

                  {/* Documento */}
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    N.º de documento

                    <input
                      name="documentNumber"
                      value={form.documentNumber}
                      onChange={updateField}
                      placeholder="Opcional"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition placeholder:text-slate-600 hover:border-slate-300 hover:dark:border-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                    />
                  </label>

                  {/* Dorsal */}
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Dorsal

                    <input
                      name="jerseyNumber"
                      value={form.jerseyNumber}
                      onChange={updateField}
                      placeholder="Ej. 10"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition placeholder:text-slate-600 hover:border-slate-300 hover:dark:border-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                    />
                  </label>

                  {/* Foto */}
                  {isSuperAdmin && (
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Foto

                      <div className="relative mt-2 flex h-11 cursor-pointer items-center overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 transition hover:border-slate-300 hover:dark:border-slate-600">
                        <input
                          name="photo"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={updateField}
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        />

                        <div className="flex items-center gap-2.5 px-3.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
                            ↑
                          </span>

                          <span className="max-w-[250px] truncate text-sm font-normal text-slate-500">
                            {form.photo
                              ? form.photo.name
                              : 'Seleccionar imagen'}
                          </span>
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Pago (foto visible en público hasta esta fecha) */}
                  {isSuperAdmin && (
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Foto pagada hasta

                      <input
                        name="paidUntil"
                        type="date"
                        value={form.paidUntil}
                        onChange={updateField}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition hover:border-slate-300 hover:dark:border-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                      />
                    </label>
                  )}

                  {/* OVR fijo (opcional: pisa el cálculo automático de la tarjeta) */}
                  {isSuperAdmin && (
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      OVR fijo (opcional)

                      <input
                        name="fixedOvr"
                        type="number"
                        min={60}
                        max={99}
                        value={form.fixedOvr}
                        onChange={updateField}
                        placeholder="Automático"
                        className="mt-2 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition placeholder:text-slate-600 hover:border-slate-300 hover:dark:border-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                      />
                    </label>
                  )}

                  {/* Estado */}
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Estado

                    <select
                      name="status"
                      value={form.status}
                      onChange={updateField}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-sm font-normal text-slate-900 dark:text-white outline-none transition hover:border-slate-300 hover:dark:border-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="DISABLED">Inhabilitado</option>
                    </select>
                  </label>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-950/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                  <button
                    className="rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:border-slate-300 hover:dark:border-slate-600 hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                    type="button"
                    onClick={closeForm}
                  >
                    Cancelar
                  </button>

                  <button
                    className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-black text-slate-950 dark:text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? 'Guardando...'
                      : editingId
                        ? 'Actualizar jugador'
                        : 'Guardar jugador'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Plantilla */}
        {/* ---------------------------------------------------------------- */}

        <section className="mt-8">

          {/* Encabezado */}
          <div className="mb-5 flex items-end justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Equipo
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Plantilla
              </h2>

              <p className="mt-1.5 text-xs text-slate-500">
                Jugadores registrados en este equipo
              </p>
            </div>

            <span className="rounded-full border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-500">
              {filteredPlayers.length}{' '}
              {filteredPlayers.length === 1 ? 'jugador' : 'jugadores'}
            </span>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Buscador */}
          {/* ---------------------------------------------------------------- */}

          {players.length > 0 && (
            <div className="sticky top-[64px] z-30 -mx-4 mb-4 bg-slate-50/95 px-4 py-2.5 backdrop-blur dark:bg-[#070b12]/95 sm:static sm:mx-0 sm:mb-5 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none sm:dark:bg-transparent">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  🔎
                </span>

                <input
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  type="search"
                  value={playerSearch}
                  onChange={(event) => setPlayerSearch(event.target.value)}
                  placeholder="Buscar jugador por nombre..."
                  aria-label="Buscar jugador por nombre"
                />
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Sin resultados de búsqueda */}
          {/* ---------------------------------------------------------------- */}

          {players.length > 0 && filteredPlayers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-5 py-9 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Ningún jugador coincide con tu búsqueda.
              </p>

              <button
                className="mt-2 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                type="button"
                onClick={() => setPlayerSearch('')}
              >
                Quitar búsqueda
              </button>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Empty */}
          {/* ---------------------------------------------------------------- */}

          {players.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-6 py-14 text-center">

              <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/[0.04] blur-3xl" />

              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-950 text-xl text-slate-600">
                +
              </div>

              <h3 className="relative mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                No hay jugadores todavía
              </h3>

              <p className="relative mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-600">
                Agrega el primer jugador para comenzar a formar la plantilla.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="relative mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2.5 text-xs font-black text-emerald-700 dark:text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10"
              >
                + Crear jugador
              </button>
            </div>
          ) : (

            /* ---------------------------------------------------------------- */
            /* Cards */
            /* ---------------------------------------------------------------- */

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {filteredPlayers.map((player) => {
                const isActive = player.status === 'ACTIVE';

                return (
                  <article
                    key={player.id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-xl shadow-black/5 dark:shadow-2xl dark:shadow-black/20 transition duration-300 hover:border-emerald-400/15 hover:shadow-emerald-950/20"
                  >
                    {/* Card superior */}
                    <div className="relative overflow-hidden p-5">

                      {/* Luz */}
                      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-emerald-400/[0.05] blur-3xl transition group-hover:bg-emerald-400/[0.08]" />

                      <div className="relative flex gap-4">

                        {/* Foto */}
                        <div className="shrink-0">
                          {player.photo ? (
                            <img
                              className="h-16 w-16 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 object-cover"
                              src={mediaUrl(player.photo)}
                              alt={player.name}
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-500/10 text-xl font-black text-emerald-700 dark:text-emerald-300">
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Información */}
                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-2">

                            <div className="min-w-0">
                              <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
                                {player.name}
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                {player.age != null ? `${player.age} años` : 'Edad no registrada'}
                              </p>
                            </div>

                            {/* Dorsal */}
                            {player.jerseyNumber && (
                              <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-950 px-2 text-xs font-black text-emerald-700 dark:text-emerald-300">
                                #{player.jerseyNumber}
                              </span>
                            )}
                          </div>

                          {/* Estado */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? 'border-emerald-400/10 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : 'border-amber-400/10 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive
                                    ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                                    : 'bg-amber-400'
                                }`}
                              />

                              {isActive
                                ? 'Activo'
                                : 'Inhabilitado'}
                            </span>

                            {player.paidUntil && new Date(player.paidUntil).getTime() < Date.now() && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300"
                                title={`Foto vencida desde ${toDateInputValue(player.paidUntil)}`}
                              >
                                Foto vencida
                              </span>
                            )}

                            {player.isGoalkeeper && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-cyan-300"
                                title="Arquero del equipo"
                              >
                                🧤 Arquero
                              </span>
                            )}

                            {player.showName === false && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300"
                                title="Su nombre se ve borroso en todo el sitio"
                              >
                                Nombre oculto
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Documento */}
                      {player.documentNumber && (
                        <div className="relative mt-4 rounded-2xl border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-950/60 px-3.5 py-3">

                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                              Documento
                            </p>

                            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {player.documentNumber}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-950/30 p-4">

                      <button
                        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.04] hover:text-emerald-700 hover:dark:text-emerald-300"
                        type="button"
                        onClick={() => startEditing(player)}
                      >
                        Editar
                      </button>

                      <button
                        className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                          isActive
                            ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:border-amber-400/30 hover:bg-amber-400/[0.04] hover:text-amber-700 hover:dark:text-amber-300'
                            : 'border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-700 dark:text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-400/[0.08]'
                        }`}
                        type="button"
                        onClick={() =>
                          player.status === 'ACTIVE'
                            ? setPlayerToDisable(player)
                            : toggleStatus(player)
                        }
                      >
                        {isActive
                          ? 'Inhabilitar'
                          : 'Habilitar'}
                      </button>

                      <button
                        className="col-span-2 flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent py-2 text-[11px] font-semibold text-slate-500 transition hover:text-slate-900 hover:dark:text-white"
                        type="button"
                        onClick={() => toggleActions(player.id)}
                        aria-expanded={expandedActionIds.has(player.id)}
                      >
                        {expandedActionIds.has(player.id)
                          ? 'Ocultar opciones'
                          : 'Más opciones'}

                        <span
                          className={`transition-transform duration-200 ${
                            expandedActionIds.has(player.id) ? 'rotate-180' : ''
                          }`}
                        >
                          ▾
                        </span>
                      </button>

                      {expandedActionIds.has(player.id) && (
                        <>
                          <button
                            className={`col-span-2 rounded-xl border py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              player.isGoalkeeper
                                ? 'border-cyan-400/30 bg-cyan-400/[0.08] text-slate-900 dark:text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-400/[0.14]'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:border-cyan-400/30 hover:bg-cyan-400/[0.04] hover:text-slate-900 hover:dark:text-cyan-300'
                            }`}
                            type="button"
                            disabled={isTogglingGoalkeeper === player.id}
                            onClick={() => toggleGoalkeeper(player)}
                          >
                            {isTogglingGoalkeeper === player.id
                              ? 'Guardando…'
                              : player.isGoalkeeper
                                ? '🧤 Quitar arquero'
                                : '🧤 Marcar como arquero'}
                          </button>

                          {isSuperAdmin && (
                            <button
                              className={`col-span-2 rounded-xl border py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                player.showName === false
                                  ? 'border-fuchsia-400/30 bg-fuchsia-400/[0.08] text-fuchsia-700 dark:text-fuchsia-300 hover:border-fuchsia-400/50 hover:bg-fuchsia-400/[0.14]'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 hover:border-fuchsia-400/30 hover:bg-fuchsia-400/[0.04] hover:text-fuchsia-700 hover:dark:text-fuchsia-300'
                              }`}
                              type="button"
                              disabled={isTogglingShowName === player.id}
                              onClick={() => toggleShowName(player)}
                            >
                              {isTogglingShowName === player.id
                                ? 'Guardando…'
                                : player.showName === false
                                  ? 'Mostrar nombre'
                                  : 'Ocultar nombre'}
                            </button>
                          )}

                          <button
                            className="col-span-2 rounded-xl border border-red-400/20 bg-red-400/[0.04] py-2.5 text-xs font-bold text-red-700 transition hover:border-red-400/40 hover:bg-red-400/[0.1] dark:text-red-300"
                            type="button"
                            onClick={() => setPlayerToDelete(player)}
                          >
                            Eliminar jugador
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <ConfirmActionModal
        isOpen={Boolean(playerToDisable)}
        title="¿Inhabilitar jugador?"
        message={playerToDisable ? `El jugador "${playerToDisable.name}" dejará de estar disponible para la plantilla activa.` : ''}
        confirmLabel="Sí, inhabilitar"
        isLoading={isChangingStatus}
        onCancel={() => setPlayerToDisable(null)}
        onConfirm={() => toggleStatus(playerToDisable)}
      />

      <ConfirmActionModal
        isOpen={Boolean(playerToDelete)}
        title="¿Eliminar jugador?"
        message={playerToDelete ? `El jugador "${playerToDelete.name}" se eliminará por completo de la plantilla. Solo es posible si nunca ha jugado un partido.` : ''}
        confirmLabel="Sí, eliminar"
        isLoading={isDeleting}
        onCancel={() => setPlayerToDelete(null)}
        onConfirm={() => deletePlayer(playerToDelete)}
      />

      {/* ---------------------------------------------------------------- */}
      {/* FAB móvil (acceso rápido para crear jugador sin volver arriba) */}
      {/* ---------------------------------------------------------------- */}

      {showMobileFab && (
        <button
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-95 sm:hidden"
          onClick={() => {
            openCreateForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          type="button"
          aria-label="Nuevo jugador"
          title="Nuevo jugador"
        >
          +
        </button>
      )}
    </main>
  );
}
