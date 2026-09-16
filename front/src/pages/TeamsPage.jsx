import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import DashboardNavbar from '../components/DashboardNavbar.jsx';
import ConfirmActionModal from '../components/ConfirmActionModal.jsx';

const emptyForm = { name: '', logo: '', paidUntil: '', logoExpiresAt: '' };

function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

export default function TeamsPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [assignedTeams, setAssignedTeams] = useState([]);

  const [selectedTournamentId, setSelectedTournamentId] = useState(
    searchParams.get('tournamentId') ?? ''
  );

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [teamToRemove, setTeamToRemove] = useState(null);
  const [isRemovingTeam, setIsRemovingTeam] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsResponse, tournamentsResponse] = await Promise.all([
          api.get('/teams'),
          api.get('/tournaments'),
        ]);

        const loadedTeams = teamsResponse.data.data.teams;
        const loadedTournaments =
          tournamentsResponse.data.data.tournaments;

        setTeams(loadedTeams);
        setTournaments(loadedTournaments);

        setSelectedTournamentId(
          (current) =>
            current || String(loadedTournaments[0]?.id ?? '')
        );
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [notify]);

  useEffect(() => {
    if (!selectedTournamentId) {
      setAssignedTeams([]);
      return;
    }

    async function loadAssignedTeams() {
      try {
        const { data } = await api.get(
          `/tournaments/${selectedTournamentId}/teams`
        );

        setAssignedTeams(data.data.teams);
      } catch (error) {
        notify(getApiErrorDetails(error));
      }
    }

    loadAssignedTeams();
  }, [notify, selectedTournamentId]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function startEditing(team) {
    setEditingId(team.id);

    setForm({
      name: team.name,
      logo: team.logo ?? '',
      paidUntil: toDateInputValue(team.paidUntil),
      logoExpiresAt: toDateInputValue(team.logoExpiresAt),
    });

    setIsCreateOpen(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setIsCreateOpen(false);
  }

  async function saveTeam(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = editingId
        ? await api.put(`/teams/${editingId}`, form)
        : await api.post('/teams', form);

      let savedTeam = response.data.data.team;
      let newAssignment = null;

      // Un equipo recién creado queda asociado de una vez al torneo
      // seleccionado, para que no quede disponible para otros torneos.
      if (!editingId && selectedTournamentId) {
        const { data } = await api.post(
          `/tournaments/${selectedTournamentId}/teams`,
          { teamId: savedTeam.id }
        );

        newAssignment = data.data.assignment;
        savedTeam = newAssignment.team;
      }

      setTeams((current) =>
        editingId
          ? current.map((team) =>
              team.id === editingId ? savedTeam : team
            )
          : [savedTeam, ...current]
      );

      setAssignedTeams((current) =>
        newAssignment
          ? [...current, newAssignment]
          : current.map((assignment) =>
              assignment.team.id === savedTeam.id
                ? {
                    ...assignment,
                    team: savedTeam,
                  }
                : assignment
            )
      );

      notify({
        type: 'success',
        title: editingId ? 'Equipo actualizado' : 'Equipo creado',
        message: newAssignment
          ? `El equipo "${savedTeam.name}" se creó y se asoció a este torneo.`
          : `El equipo "${savedTeam.name}" se guardó correctamente.`,
      });

      cancelEditing();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function assignTeam(event) {
    event.preventDefault();

    if (!selectedTournamentId || !selectedTeamId) return;

    try {
      const { data } = await api.post(
        `/tournaments/${selectedTournamentId}/teams`,
        {
          teamId: Number(selectedTeamId),
        }
      );

      setAssignedTeams((current) => [
        ...current,
        data.data.assignment,
      ]);

      setTeams((current) =>
        current.map((team) =>
          team.id === data.data.assignment.team.id
            ? data.data.assignment.team
            : team
        )
      );

      setSelectedTeamId('');
      setTeamSearch('');

      notify({
        type: 'success',
        title: 'Equipo asociado',
        message: 'El equipo se agregó correctamente al torneo.',
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  async function removeTeam(teamId) {
    setIsRemovingTeam(true);
    try {
      await api.delete(
        `/tournaments/${selectedTournamentId}/teams/${teamId}`
      );

      setAssignedTeams((current) =>
        current.filter(({ team }) => team.id !== teamId)
      );

      setTeams((current) =>
        current.map((team) =>
          team.id === teamId
            ? { ...team, _count: { ...team._count, tournaments: 0 } }
            : team
        )
      );

      notify({
        type: 'success',
        title: 'Equipo retirado',
        message: 'El equipo ya no pertenece a este torneo.',
      });
      setTeamToRemove(null);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsRemovingTeam(false);
    }
  }

  const isSuperAdmin = user.role === 'SUPERADMIN';
  const canCreateTeams = ['SUPERADMIN', 'ADMIN'].includes(user.role);

  const isTournamentLocked = Boolean(
    searchParams.get('tournamentId')
  );

  const selectedTournament = tournaments.find(
    (tournament) =>
      String(tournament.id) === selectedTournamentId
  );

  // Un equipo solo puede pertenecer a un torneo a la vez: si ya está
  // asociado a alguno (este u otro), deja de estar disponible.
  const availableTeams = teams.filter(
    (team) =>
      team.status === 'ACTIVE' &&
      (team._count?.tournaments ?? 0) === 0
  );

  const filteredAvailableTeams = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();

    if (!query) {
      return availableTeams;
    }

    return availableTeams.filter((team) =>
      team.name.toLowerCase().includes(query)
    );
  }, [availableTeams, teamSearch]);

  return (
    <main className="lm-ready min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">

      {/* =========================================================
          BACKGROUND
      ========================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-emerald-500/[0.035] blur-3xl sm:-left-40 sm:-top-40 sm:h-[450px] sm:w-[450px] sm:bg-emerald-500/[0.06]" />

        <div className="absolute -right-32 top-[30%] h-72 w-72 rounded-full bg-cyan-500/[0.02] blur-3xl sm:-right-40 sm:h-[450px] sm:w-[450px] sm:bg-cyan-500/[0.035]" />

        <div
          className="absolute inset-0 opacity-[0.012] sm:opacity-[0.022]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      <DashboardNavbar />

      {/* =========================================================
          CONTENT
      ========================================================= */}
      <section className="relative mx-auto w-full max-w-7xl px-3 pb-10 pt-24 sm:px-5 sm:pb-14 sm:pt-28 lg:px-8 lg:pb-20">

        {/* =======================================================
            HEADER
        ======================================================= */}
        <header className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-gradient-to-br from-white/[0.045] via-white/[0.02] to-transparent shadow-xl shadow-black/10 sm:mt-5 sm:rounded-3xl sm:shadow-2xl sm:shadow-black/20">

          <div className="pointer-events-none absolute -right-24 -top-28 hidden h-64 w-64 rounded-full bg-emerald-400/[0.08] blur-3xl sm:block" />

          <div className="relative p-4 sm:p-6 lg:p-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">

              {/* TITLE */}
              <div className="min-w-0">

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:mt-4 sm:text-3xl lg:text-4xl">
                  Equipos
                </h1>

                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                  Administra los participantes y construye la
                  competencia de tu torneo.
                </p>

              </div>
            </div>
          </div>
        </header>

        {/* =======================================================
            TOURNAMENT CONTEXT
        ======================================================= */}
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-emerald-400/[0.08] bg-emerald-400/[0.02] p-3 sm:mt-5 sm:rounded-2xl sm:p-4 md:flex-row md:items-center md:justify-between">

          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/10 bg-emerald-400/[0.05] text-xs sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm">
              🏆
            </div>

            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 sm:text-[9px] sm:tracking-[0.18em]">
                Torneo actual
              </p>

              <p className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                {selectedTournament
                  ? selectedTournament.name
                  : 'Selecciona un torneo'}
              </p>
            </div>

          </div>

          {!isTournamentLocked && (
            <select
              className="min-h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none transition focus:border-emerald-400/50 md:w-auto md:min-w-[220px]"
              value={selectedTournamentId}
              onChange={(event) =>
                setSelectedTournamentId(event.target.value)
              }
            >
              <option value="">Selecciona un torneo</option>

              {tournaments.map((tournament) => (
                <option
                  key={tournament.id}
                  value={tournament.id}
                >
                  {tournament.name}
                </option>
              ))}
            </select>
          )}

        </div>

        {/* =======================================================
            ACTION ACCORDIONS
        ======================================================= */}
        {canCreateTeams && (
          <section className={`mt-3 grid gap-3 sm:mt-5 lg:gap-4 ${isSuperAdmin ? 'md:grid-cols-2' : ''}`}>

            {/* ===================================================
                CREATE / EDIT TEAM
            =================================================== */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 shadow-lg shadow-black/5 sm:rounded-2xl sm:shadow-xl sm:shadow-black/10">

              <button
                className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-100 hover:dark:bg-white/[0.025] sm:min-h-[68px] sm:gap-4 sm:px-5 sm:py-4"
                onClick={() =>
                  setIsCreateOpen((current) => !current)
                }
                type="button"
                aria-expanded={isCreateOpen}
              >

                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/10 bg-emerald-400/[0.05] text-xs sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm">
                    {editingId ? '✎' : '+'}
                  </div>

                  <div className="min-w-0">

                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 sm:text-[9px] sm:tracking-[0.18em]">
                      {editingId ? 'Edición' : 'Administración'}
                    </p>

                    <h2 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                      {editingId
                        ? 'Editar equipo'
                        : 'Crear equipo'}
                    </h2>

                  </div>
                </div>

                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 transition-transform duration-200 ${
                    isCreateOpen ? 'rotate-180' : ''
                  }`}
                >
                  ↓
                </span>

              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ${
                  isCreateOpen
                    ? 'grid-rows-[1fr]'
                    : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">

                  <form
                    className="border-t border-slate-200 dark:border-white/[0.05] p-4 sm:p-5"
                    onSubmit={saveTeam}
                  >

                    <div className="grid gap-3 sm:grid-cols-2">

                      <label className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${isSuperAdmin ? '' : 'sm:col-span-2'}`}>
                        Nombre

                        <input
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                          name="name"
                          maxLength="120"
                          value={form.name}
                          onChange={updateField}
                          placeholder="Ej. Atlético Nacional"
                          required
                          autoFocus={Boolean(editingId)}
                        />
                      </label>

                      {isSuperAdmin && (
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Logo

                          <input
                            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                            name="logo"
                            maxLength="500"
                            value={form.logo}
                            onChange={updateField}
                            placeholder="URL o ruta del logo"
                          />
                        </label>
                      )}

                      {isSuperAdmin && (
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Pago vigente hasta

                          <input
                            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                            name="paidUntil"
                            type="date"
                            value={form.paidUntil}
                            onChange={updateField}
                          />
                        </label>
                      )}

                      {isSuperAdmin && (
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Escudo vigente hasta

                          <input
                            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                            name="logoExpiresAt"
                            type="date"
                            value={form.logoExpiresAt}
                            onChange={updateField}
                          />
                        </label>
                      )}

                    </div>

                    {!isSuperAdmin && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Solo un superadministrador puede asignar el escudo del equipo y las fechas de pago.
                      </p>
                    )}

                    {isSuperAdmin && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Si el equipo no ha pagado, su nombre, escudo y estadísticas se verán borrosos en las vistas públicas (los goles en contra siempre se ven). Deja los campos vacíos para no aplicar vencimiento.
                      </p>
                    )}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">

                      <button
                        className="min-h-11 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 dark:text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
                        disabled={isSaving}
                        type="submit"
                      >
                        {isSaving
                          ? 'Guardando...'
                          : editingId
                            ? 'Guardar cambios'
                            : 'Crear equipo'}
                      </button>

                      {editingId && (
                        <button
                          className="min-h-11 rounded-xl border border-slate-200 dark:border-white/[0.07] px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:dark:bg-white/[0.04] hover:text-slate-900 hover:dark:text-white sm:min-h-10"
                          onClick={cancelEditing}
                          type="button"
                        >
                          Cancelar
                        </button>
                      )}

                    </div>

                  </form>
                </div>
              </div>
            </div>

            {/* ===================================================
                ASSIGN TEAM
            =================================================== */}
            {isSuperAdmin && (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 shadow-lg shadow-black/5 sm:rounded-2xl sm:shadow-xl sm:shadow-black/10">

              <button
                className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-100 hover:dark:bg-white/[0.025] sm:min-h-[68px] sm:gap-4 sm:px-5 sm:py-4"
                onClick={() =>
                  setIsAssignOpen((current) => !current)
                }
                type="button"
                aria-expanded={isAssignOpen}
              >

                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.05] text-xs sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm">
                    ↗
                  </div>

                  <div className="min-w-0">

                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-900 dark:text-cyan-400 sm:text-[9px] sm:tracking-[0.18em]">
                      Participación
                    </p>

                    <h2 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                      Asociar equipo
                    </h2>

                  </div>
                </div>

                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 transition-transform duration-200 ${
                    isAssignOpen ? 'rotate-180' : ''
                  }`}
                >
                  ↓
                </span>

              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ${
                  isAssignOpen
                    ? 'grid-rows-[1fr]'
                    : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">

                  <div className="border-t border-slate-200 dark:border-white/[0.05] p-4 sm:p-5">

                    {!selectedTournamentId ? (
                      <p className="text-xs leading-5 text-slate-500">
                        Selecciona un torneo para poder asociar
                        equipos.
                      </p>
                    ) : availableTeams.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/[0.07] px-4 py-5 text-center">

                        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.03] text-sm">
                          ✓
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">
                          No hay equipos disponibles
                        </p>

                        <p className="mt-1 text-[10px] leading-4 text-slate-600">
                          Todos los equipos activos ya están
                          asociados a este torneo.
                        </p>

                      </div>
                    ) : (
                      <form
                        className="relative"
                        onSubmit={assignTeam}
                      >

                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Buscar equipo

                          <div className="relative mt-1.5">

                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
                              ⌕
                            </span>

                            <input
                              className="min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                              value={teamSearch}
                              onChange={(event) => {
                                setTeamSearch(event.target.value);
                                setSelectedTeamId('');
                              }}
                              placeholder="Escribe el nombre del equipo..."
                            />

                          </div>
                        </label>

                        {/* Search results */}
                        {teamSearch.trim() && (
                          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#080d14] p-1.5">

                            {filteredAvailableTeams.length === 0 ? (
                              <div className="px-3 py-4 text-center text-xs text-slate-600">
                                No encontramos equipos con ese nombre.
                              </div>
                            ) : (
                              filteredAvailableTeams.map((team) => {
                                const isSelected =
                                  selectedTeamId === String(team.id);

                                return (
                                  <button
                                    className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                      isSelected
                                        ? 'bg-emerald-400/[0.08] ring-1 ring-emerald-400/20'
                                        : 'hover:bg-slate-100 hover:dark:bg-white/[0.04]'
                                    }`}
                                    key={team.id}
                                    onClick={() =>
                                      setSelectedTeamId(
                                        String(team.id)
                                      )
                                    }
                                    type="button"
                                  >

                                    {team.logo ? (
                                      <img
                                        className="h-9 w-9 shrink-0 object-contain"
                                        src={team.logo}
                                        alt=""
                                      />
                                    ) : (
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center text-xs">
                                        ⚽
                                      </div>
                                    )}

                                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                                      {team.name}
                                    </span>

                                    {isSelected && (
                                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        ✓
                                      </span>
                                    )}

                                  </button>
                                );
                              })
                            )}

                          </div>
                        )}

                        {/* Selected team */}
                        {selectedTeamId && (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-2.5">

                            <div className="flex min-w-0 items-center gap-2.5">

                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/[0.08] text-xs">
                                ✓
                              </div>

                              <div className="min-w-0">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  Equipo seleccionado
                                </p>

                                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                                  {
                                    availableTeams.find(
                                      (team) =>
                                        String(team.id) ===
                                        selectedTeamId
                                    )?.name
                                  }
                                </p>
                              </div>

                            </div>

                            <button
                              className="shrink-0 text-[10px] font-semibold text-slate-600 hover:text-slate-700 hover:dark:text-slate-300"
                              onClick={() => {
                                setSelectedTeamId('');
                                setTeamSearch('');
                              }}
                              type="button"
                            >
                              Cambiar
                            </button>

                          </div>
                        )}

                        <button
                          className="mt-3 min-h-11 w-full rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 dark:text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
                          disabled={!selectedTeamId}
                          type="submit"
                        >
                          Asociar al torneo
                        </button>

                      </form>
                    )}

                  </div>
                </div>
              </div>
            </div>
            )}

          </section>
        )}

        {/* =======================================================
            PARTICIPANTS
        ======================================================= */}
        <section className="mt-7 sm:mt-9 lg:mt-10">

          {/* SECTION HEADER */}
          <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">

            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 sm:text-[9px] sm:tracking-[0.18em]">
                Competencia
              </p>

              <h2 className="mt-0.5 text-lg font-black text-slate-900 dark:text-white sm:mt-1 sm:text-xl">
                Participantes
              </h2>

              <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                Equipos inscritos en este torneo.
              </p>
            </div>

            <div className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-2 text-[11px] font-black text-slate-700 dark:text-slate-300 sm:h-8 sm:min-w-8 sm:px-2.5 sm:text-xs">
              {assignedTeams.length}
            </div>

          </div>

          {/* Loading */}
          {isLoading && (
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">

              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div
                  className="h-[76px] animate-pulse rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.02] sm:h-[82px] sm:rounded-2xl"
                  key={item}
                />
              ))}

            </div>
          )}

          {/* Empty */}
          {!isLoading && assignedTeams.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.012] px-4 py-9 text-center sm:rounded-2xl sm:px-6 sm:py-12">

              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/[0.04] text-lg sm:h-12 sm:w-12 sm:rounded-2xl sm:text-xl">
                ⚽
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white sm:mt-4">
                Aún no hay participantes
              </h3>

              <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-5 text-slate-600 sm:text-xs">
                Asocia equipos al torneo para comenzar a construir
                la competencia.
              </p>

              {isSuperAdmin && (
                <button
                  className="mt-4 min-h-10 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-400/[0.10] sm:mt-5"
                  onClick={() => setIsAssignOpen(true)}
                  type="button"
                >
                  + Asociar primer equipo
                </button>
              )}

            </div>
          )}

          {/* Participants */}
          {!isLoading && assignedTeams.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">

              {assignedTeams.map(({ team }, index) => (
                <article
                  className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 p-3 shadow-md shadow-black/5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/20 hover:bg-white hover:dark:bg-[#0c131d] sm:rounded-2xl sm:p-4 sm:shadow-lg sm:shadow-black/10"
                  key={team.id}
                >

                  {/* Green accent */}
                  <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-gradient-to-b from-emerald-400 to-cyan-400 opacity-35 transition group-hover:opacity-100" />

                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">

                    {/* Position */}
                    <span className="w-4 shrink-0 text-center text-[9px] font-black text-slate-700 sm:w-5 sm:text-[10px]">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Logo */}
                    {team.logo ? (
                      <img
                        className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
                        src={team.logo}
                        alt={`Logo de ${team.name}`}
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center text-lg sm:h-20 sm:w-20 sm:text-xl">
                        ⚽
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">

                      <h3 className="truncate text-base font-black leading-tight text-slate-900 dark:text-white sm:text-lg">
                        {team.name}
                      </h3>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">

                        <span className="inline-flex min-w-0 items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 sm:text-[9px]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.8)]" />
                          Participante
                        </span>

                        {team.paidUntil && new Date(team.paidUntil).getTime() < Date.now() && (
                          <span
                            className="inline-flex min-w-0 items-center gap-1 rounded-full border border-red-400/20 bg-red-400/[0.08] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 sm:text-[9px]"
                            title={`Pago vencido desde ${toDateInputValue(team.paidUntil)}`}
                          >
                            Pago vencido
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div className="mt-3 flex items-center gap-1.5 border-t border-slate-200 dark:border-white/[0.04] pt-3">

                    <Link
                      className="flex min-h-8 flex-1 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.04] px-2 py-1.5 text-[9px] font-semibold text-slate-900 dark:text-cyan-300 transition hover:bg-cyan-400/10 sm:flex-none sm:text-[10px]"
                      to={`/dashboard/tournaments/${selectedTournamentId}/teams/${team.id}/players`}
                    >
                      Agregar Jugadores
                    </Link>

                    {isSuperAdmin && (
                      <button
                        className="min-h-8 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.03] px-2 py-1.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400/80 transition hover:border-emerald-400/25 hover:bg-emerald-400/[0.07] hover:text-emerald-700 hover:dark:text-emerald-300 sm:text-[10px]"
                        onClick={() => startEditing(team)}
                        type="button"
                        title="Editar equipo"
                      >
                        Editar
                      </button>
                    )}

                    {canCreateTeams && (
                      <button
                        className="min-h-8 rounded-lg px-2 py-1.5 text-[9px] font-semibold text-slate-600 transition hover:bg-red-400/[0.05] hover:text-red-600 hover:dark:text-red-400 sm:text-[10px]"
                        onClick={() => setTeamToRemove(team)}
                        type="button"
                        title="Retirar equipo"
                      >
                        Retirar
                      </button>
                    )}

                  </div>

                </article>
              ))}

            </div>
          )}

        </section>

      </section>

      <ConfirmActionModal
        isOpen={Boolean(teamToRemove)}
        title="¿Retirar equipo del torneo?"
        message={teamToRemove ? `El equipo "${teamToRemove.name}" dejará de pertenecer a este torneo.` : ''}
        confirmLabel="Sí, retirar"
        isLoading={isRemovingTeam}
        onCancel={() => setTeamToRemove(null)}
        onConfirm={() => removeTeam(teamToRemove.id)}
      />
    </main>
  );
}
