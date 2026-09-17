import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import DashboardNavbar from '../components/DashboardNavbar.jsx';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  status: 'ACTIVE',
};

export default function AdminsPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();

  const [admins, setAdmins] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [assignedAdmins, setAssignedAdmins] = useState([]);

  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');

  // Buscadores
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminListSearch, setAdminListSearch] = useState('');

  const [showTournamentResults, setShowTournamentResults] =
    useState(false);

  const [showAdminResults, setShowAdminResults] =
    useState(false);

  // Sección abierta
  // Valores posibles:
  // null
  // 'new-admin'
  // 'users'
  // 'assignments'
  const [openSection, setOpenSection] = useState(null);

  // Formulario
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Menú de acciones de usuario
  const [openUserMenu, setOpenUserMenu] = useState(null);

  // Modal cambiar contraseña
  const [passwordAdmin, setPasswordAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  // Modal retirar administrador
  const [adminToRemove, setAdminToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  useEffect(() => {
    async function loadData() {
      try {
        const [usersResponse, tournamentsResponse] =
          await Promise.all([
            api.get('/users'),
            api.get('/tournaments'),
          ]);

        const loadedAdmins =
          usersResponse.data.data.users;

        const loadedTournaments =
          tournamentsResponse.data.data.tournaments;

        setAdmins(loadedAdmins);
        setTournaments(loadedTournaments);

        // No abrimos ninguna sección automáticamente.
        // El usuario decide qué quiere ver.
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
      setAssignedAdmins([]);
      return;
    }

    async function loadAssignments() {
      try {
        const { data } = await api.get(
          `/tournaments/${selectedTournamentId}/admins`
        );

        setAssignedAdmins(data.data.admins);
      } catch (error) {
        notify(getApiErrorDetails(error));
      }
    }

    loadAssignments();
  }, [notify, selectedTournamentId]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  /*
   * ==========================================
   * SECCIONES
   * ==========================================
   */

  function toggleSection(section) {
    setOpenSection((current) =>
      current === section ? null : section
    );

    // Cerramos menús flotantes al cambiar de sección.
    setOpenUserMenu(null);
    setShowTournamentResults(false);
    setShowAdminResults(false);
  }

  /*
   * ==========================================
   * ADMINISTRADORES
   * ==========================================
   */

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setOpenSection('new-admin');
  }

  function startEditing(admin) {
    setEditingId(admin.id);

    setForm({
      name: admin.name,
      email: admin.email,
      password: '',
      status: admin.status,
    });

    setOpenSection('new-admin');
    setOpenUserMenu(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setOpenSection(null);
  }

  async function saveAdmin(event) {
    event.preventDefault();

    setIsSaving(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        status: form.status,
      };

      if (form.password) {
        payload.password = form.password;
      }

      const response = editingId
        ? await api.put(
            `/users/${editingId}`,
            payload
          )
        : await api.post('/users', {
            ...payload,
            password: form.password,
          });

      const savedAdmin =
        response.data.data.user;

      setAdmins((current) =>
        editingId
          ? current.map((admin) =>
              admin.id === editingId
                ? savedAdmin
                : admin
            )
          : [savedAdmin, ...current]
      );

      notify({
        type: 'success',
        title: editingId
          ? 'Administrador actualizado'
          : 'Administrador creado',
        message: `${savedAdmin.name} quedó disponible para asignación a torneos.`,
      });

      cancelEditing();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(admin) {
    try {
      const { data } = await api.put(
        `/users/${admin.id}`,
        {
          name: admin.name,
          email: admin.email,
          status:
            admin.status === 'ACTIVE'
              ? 'INACTIVE'
              : 'ACTIVE',
        }
      );

      setAdmins((current) =>
        current.map((item) =>
          item.id === admin.id
            ? data.data.user
            : item
        )
      );

      setOpenUserMenu(null);

      notify({
        type: 'success',
        title: 'Estado actualizado',
        message: `${admin.name} ahora está ${
          data.data.user.status === 'ACTIVE'
            ? 'activo'
            : 'inactivo'
        }.`,
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  /*
   * ==========================================
   * CAMBIAR CONTRASEÑA
   * ==========================================
   */

  function openPasswordModal(admin) {
    setPasswordAdmin(admin);
    setNewPassword('');
    setOpenUserMenu(null);
  }

  function closePasswordModal() {
    if (isChangingPassword) {
      return;
    }

    setPasswordAdmin(null);
    setNewPassword('');
  }

  async function changePassword(event) {
    event.preventDefault();

    if (!passwordAdmin || !newPassword) {
      return;
    }

    setIsChangingPassword(true);

    try {
      const { data } = await api.put(
        `/users/${passwordAdmin.id}`,
        {
          name: passwordAdmin.name,
          email: passwordAdmin.email,
          password: newPassword,
          status: passwordAdmin.status,
        }
      );

      setAdmins((current) =>
        current.map((admin) =>
          admin.id === passwordAdmin.id
            ? data.data.user
            : admin
        )
      );

      notify({
        type: 'success',
        title: 'Contraseña actualizada',
        message: `La contraseña de ${passwordAdmin.name} fue cambiada correctamente.`,
      });

      setPasswordAdmin(null);
      setNewPassword('');
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsChangingPassword(false);
    }
  }

  /*
   * ==========================================
   * TORNEOS
   * ==========================================
   */

  const filteredTournaments =
    tournaments.filter((tournament) =>
      tournament.name
        ?.toLowerCase()
        .includes(
          tournamentSearch.toLowerCase()
        )
    );

  const selectedTournament =
    tournaments.find(
      (tournament) =>
        String(tournament.id) ===
        String(selectedTournamentId)
    );

  function selectTournament(tournament) {
    setSelectedTournamentId(
      String(tournament.id)
    );

    setTournamentSearch(tournament.name);
    setShowTournamentResults(false);

    // Limpiamos administrador al cambiar de torneo.
    setSelectedAdminId('');
    setAdminSearch('');
    setShowAdminResults(false);
  }

  function clearTournament() {
    setSelectedTournamentId('');
    setTournamentSearch('');
    setSelectedAdminId('');
    setAdminSearch('');
    setShowTournamentResults(false);
    setShowAdminResults(false);
  }

  /*
   * ==========================================
   * ADMINISTRADORES DISPONIBLES
   * ==========================================
   */

  const availableAdmins = admins.filter(
    (admin) =>
      admin.status === 'ACTIVE' &&
      !assignedAdmins.some(
        ({ user: assigned }) =>
          assigned.id === admin.id
      )
  );

  const filteredAdmins =
    availableAdmins.filter((admin) => {
      const search =
        adminSearch.toLowerCase();

      return (
        admin.name
          ?.toLowerCase()
          .includes(search) ||
        admin.email
          ?.toLowerCase()
          .includes(search)
      );
    });

  const filteredAdminList = admins.filter((admin) => {
    const search = adminListSearch.trim().toLowerCase();
    if (!search) return true;

    return (
      admin.name?.toLowerCase().includes(search) ||
      admin.email?.toLowerCase().includes(search)
    );
  });

  const selectedAdmin = admins.find(
    (admin) =>
      String(admin.id) ===
      String(selectedAdminId)
  );

  function selectAdmin(admin) {
    setSelectedAdminId(
      String(admin.id)
    );

    setAdminSearch(admin.name);
    setShowAdminResults(false);
  }

  function clearAdmin() {
    setSelectedAdminId('');
    setAdminSearch('');
    setShowAdminResults(false);
  }

  /*
   * ==========================================
   * ASIGNACIONES
   * ==========================================
   */

  async function assignAdmin(event) {
    event.preventDefault();

    if (
      !selectedTournamentId ||
      !selectedAdminId
    ) {
      return;
    }

    try {
      const { data } = await api.post(
        `/tournaments/${selectedTournamentId}/admins`,
        {
          userId: Number(selectedAdminId),
        }
      );

      setAssignedAdmins((current) => [
        ...current,
        data.data.assignment,
      ]);

      setSelectedAdminId('');
      setAdminSearch('');
      setShowAdminResults(false);

      notify({
        type: 'success',
        title: 'Administrador asignado',
        message:
          'La asignación se guardó correctamente.',
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  function requestRemoveAdmin(admin) {
    setAdminToRemove(admin);
  }

  function cancelRemoveAdmin() {
    if (isRemoving) {
      return;
    }

    setAdminToRemove(null);
  }

  async function confirmRemoveAdmin() {
    if (
      !adminToRemove ||
      !selectedTournamentId
    ) {
      return;
    }

    try {
      setIsRemoving(true);

      await api.delete(
        `/tournaments/${selectedTournamentId}/admins/${adminToRemove.id}`
      );

      setAssignedAdmins((current) =>
        current.filter(
          ({ user: assignedUser }) =>
            assignedUser.id !==
            adminToRemove.id
        )
      );

      notify({
        type: 'success',
        title: 'Asignación retirada',
        message: `${adminToRemove.name} ya no gestiona este torneo.`,
      });

      setAdminToRemove(null);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <main className="lm-ready min-h-screen bg-slate-50 px-4 pb-12 pt-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <DashboardNavbar />

      <section className="mx-auto max-w-7xl">

        {/* ==========================================
            ENCABEZADO
        ========================================== */}

        <div className="mb-8">
          <Link
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 transition hover:text-emerald-700 hover:dark:text-emerald-300"
            to="/dashboard"
          >
            ← Volver al dashboard
          </Link>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
              Fase 5
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Administradores
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
              Gestiona administradores, usuarios y
              asignaciones de torneos desde un solo lugar.
            </p>
          </div>
        </div>

        {!isSuperAdmin && (
          <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-5 text-amber-700 dark:text-amber-200">
            <p className="font-semibold">
              Acceso restringido
            </p>

            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
              Solo un SUPERADMIN puede gestionar
              administradores.
            </p>
          </div>
        )}

        {isSuperAdmin && (
          <div className="space-y-6">

            {/* ==========================================
                BOTONES DE SECCIONES
            ========================================== */}

            <div className="grid gap-4 md:grid-cols-3">

              {/* NUEVO ADMINISTRADOR */}

              <button
                type="button"
                onClick={() => {
                  if (
                    openSection ===
                    'new-admin'
                  ) {
                    cancelEditing();
                  } else {
                    openCreateForm();
                  }
                }}
                className={`group flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                  openSection ===
                  'new-admin'
                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 hover:bg-white hover:dark:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl text-emerald-600 dark:text-emerald-400">
                    +
                  </div>

                  <div>
                    <p className="font-semibold">
                      Nuevo administrador
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Crear administrador
                    </p>
                  </div>
                </div>

                <span className="text-xl text-slate-500 transition group-hover:text-slate-700 group-hover:dark:text-slate-300">
                  {openSection ===
                  'new-admin'
                    ? '⌃'
                    : '⌄'}
                </span>
              </button>

              {/* LISTA DE USUARIOS */}

              <button
                type="button"
                onClick={() =>
                  toggleSection('users')
                }
                className={`group flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                  openSection === 'users'
                    ? 'border-sky-500/50 bg-sky-500/10 shadow-lg shadow-sky-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-500/50 hover:bg-white hover:dark:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-xl text-sky-600 dark:text-sky-400">
                    👥
                  </div>

                  <div>
                    <p className="font-semibold">
                      Lista de usuarios
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {admins.length}{' '}
                      administrador
                      {admins.length !== 1
                        ? 'es'
                        : ''}
                    </p>
                  </div>
                </div>

                <span className="text-xl text-slate-500 transition group-hover:text-slate-700 group-hover:dark:text-slate-300">
                  {openSection === 'users'
                    ? '⌃'
                    : '⌄'}
                </span>
              </button>

              {/* ASIGNACIONES */}

              <button
                type="button"
                onClick={() =>
                  toggleSection(
                    'assignments'
                  )
                }
                className={`group flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                  openSection ===
                  'assignments'
                    ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-500/50 hover:bg-white hover:dark:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xl text-violet-600 dark:text-violet-400">
                    🎯
                  </div>

                  <div>
                    <p className="font-semibold">
                      Asignaciones
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Administrar torneos
                    </p>
                  </div>
                </div>

                <span className="text-xl text-slate-500 transition group-hover:text-slate-700 group-hover:dark:text-slate-300">
                  {openSection ===
                  'assignments'
                    ? '⌃'
                    : '⌄'}
                </span>
              </button>
            </div>

            {/* ==========================================
                NUEVO ADMINISTRADOR
            ========================================== */}

            {openSection ===
              'new-admin' && (
              <form
                className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
                onSubmit={saveAdmin}
              >
                <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-5">
                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        {editingId
                          ? 'Edición'
                          : 'Nuevo usuario'}
                      </p>

                      <h2 className="mt-1 text-xl font-bold">
                        {editingId
                          ? 'Editar administrador'
                          : 'Nuevo administrador'}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={
                        cancelEditing
                      }
                      className="rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">

                  {/* Nombre */}

                  <label className="text-sm font-medium">
                    Nombre

                    <input
                      className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="name"
                      value={form.name}
                      onChange={
                        updateField
                      }
                      placeholder="Nombre completo"
                      required
                    />
                  </label>

                  {/* Email */}

                  <label className="text-sm font-medium">
                    Email

                    <input
                      className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={
                        updateField
                      }
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </label>

                  {/* Password */}

                  <label className="text-sm font-medium">
                    {editingId
                      ? 'Nueva contraseña (opcional)'
                      : 'Contraseña'}

                    <input
                      className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="password"
                      type="password"
                      minLength="8"
                      value={
                        form.password
                      }
                      onChange={
                        updateField
                      }
                      placeholder="Mínimo 8 caracteres"
                      required={
                        !editingId
                      }
                    />
                  </label>

                  {/* Estado */}

                  <label className="text-sm font-medium">
                    Estado

                    <select
                      className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                      name="status"
                      value={
                        form.status
                      }
                      onChange={
                        updateField
                      }
                    >
                      <option value="ACTIVE">
                        Activo
                      </option>

                      <option value="INACTIVE">
                        Inactivo
                      </option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 px-6 py-4 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      cancelEditing
                    }
                    className="rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 hover:dark:bg-slate-800"
                  >
                    Cancelar
                  </button>

                  <button
                    className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      isSaving
                    }
                    type="submit"
                  >
                    {isSaving
                      ? 'Guardando...'
                      : editingId
                        ? 'Guardar cambios'
                        : 'Crear administrador'}
                  </button>
                </div>
              </form>
            )}

            {/* ==========================================
                LISTA DE USUARIOS
            ========================================== */}

            {openSection ===
              'users' && (
              <section className="overflow-visible rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">

                <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-5 sm:px-6">
                  <h2 className="text-xl font-bold">
                    Lista de usuarios
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Administra los datos y permisos
                    de cada administrador.
                  </p>

                  {admins.length > 0 && (
                    <div className="relative mt-4">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        🔎
                      </span>

                      <input
                        type="text"
                        value={adminListSearch}
                        onChange={(event) => setAdminListSearch(event.target.value)}
                        placeholder="Buscar por nombre o email..."
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-11 pr-4 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10"
                      />
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                    Cargando usuarios...
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">

                    {admins.length === 0 && (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No hay administradores registrados.
                      </div>
                    )}

                    {admins.length > 0 && filteredAdminList.length === 0 && (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Ningún administrador coincide con tu búsqueda.
                      </div>
                    )}

                    {filteredAdminList.map((admin) => (
                      <div
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                        key={admin.id}
                      >

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-emerald-600 dark:text-emerald-400">
                            {admin.name
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-semibold">
                                {admin.name}
                              </p>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  admin.status ===
                                  'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                }`}
                              >
                                {admin.status ===
                                'ACTIVE'
                                  ? 'Activo'
                                  : 'Inactivo'}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                              {admin.email}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {admin._count
                                ?.tournaments ??
                                0}{' '}
                              torneo
                              {(admin._count
                                ?.tournaments ??
                                0) !== 1
                                ? 's'
                                : ''}
                            </p>
                          </div>
                        </div>

                        {/* ACCIONES */}

                        <div className="relative self-end sm:self-auto">

                          <button
                            type="button"
                            onClick={() =>
                              setOpenUserMenu(
                                (current) =>
                                  current ===
                                  admin.id
                                    ? null
                                    : admin.id
                              )
                            }
                            className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                          >
                            Acciones
                            <span>
                              ⋮
                            </span>
                          </button>

                          {openUserMenu ===
                            admin.id && (
                            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-1.5 shadow-2xl">

                              <button
                                type="button"
                                onClick={() =>
                                  startEditing(
                                    admin
                                  )
                                }
                                className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 hover:dark:bg-slate-800"
                              >
                                ✏️ Editar usuario
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openPasswordModal(
                                    admin
                                  )
                                }
                                className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 hover:dark:bg-slate-800"
                              >
                                🔑 Cambiar contraseña
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleStatus(
                                    admin
                                  )
                                }
                                className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 hover:dark:bg-slate-800"
                              >
                                {admin.status ===
                                'ACTIVE'
                                  ? '⏸️ Desactivar'
                                  : '▶️ Activar'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ==========================================
                ASIGNACIONES
            ========================================== */}

            {openSection ===
              'assignments' && (
              <section className="overflow-visible rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">

                <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-5">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      🎯
                    </div>

                    <div>
                      <h2 className="text-xl font-bold">
                        Asignaciones
                      </h2>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Busca un torneo y asigna
                        fácilmente sus administradores.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">

                  {/* ====================================
                      TORNEO
                  ==================================== */}

                  <div className="relative">

                    <label className="block text-sm font-semibold">
                      1. Selecciona un torneo

                      <div className="relative mt-2">

                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                          🔎
                        </span>

                        <input
                          type="text"
                          value={
                            tournamentSearch
                          }
                          onChange={(
                            event
                          ) => {
                            const value =
                              event.target
                                .value;

                            setTournamentSearch(
                              value
                            );

                            setShowTournamentResults(
                              true
                            );

                            if (
                              value !==
                              selectedTournament?.name
                            ) {
                              setSelectedTournamentId(
                                ''
                              );

                              setSelectedAdminId(
                                ''
                              );

                              setAdminSearch(
                                ''
                              );
                            }
                          }}
                          onFocus={() =>
                            setShowTournamentResults(
                              true
                            )
                          }
                          placeholder="Buscar torneo por nombre..."
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-11 pr-10 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"
                        />

                        {tournamentSearch && (
                          <button
                            type="button"
                            onClick={
                              clearTournament
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>

                    {/* RESULTADOS */}

                    {showTournamentResults &&
                      !selectedTournament && (
                        <div className="absolute left-0 right-0 z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 shadow-2xl">

                          {filteredTournaments.length ===
                          0 ? (
                            <div className="p-5 text-center">
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                No se encontraron torneos.
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Intenta con otro nombre.
                              </p>
                            </div>
                          ) : (
                            filteredTournaments.map(
                              (
                                tournament
                              ) => (
                                <button
                                  key={
                                    tournament.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    selectTournament(
                                      tournament
                                    )
                                  }
                                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-slate-100 hover:dark:bg-slate-800"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                    🏆
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                      {
                                        tournament.name
                                      }
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      Torneo #
                                      {
                                        tournament.id
                                      }
                                    </p>
                                  </div>
                                </button>
                              )
                            )
                          )}
                        </div>
                      )}

                    {/* TORNEO SELECCIONADO */}

                    {selectedTournament && (
                      <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            🏆
                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                              Torneo seleccionado
                            </p>

                            <p className="truncate font-semibold">
                              {
                                selectedTournament.name
                              }
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={
                            clearTournament
                          }
                          className="shrink-0 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ====================================
                      ADMINISTRADOR
                  ==================================== */}

                  <div className="relative mt-7">

                    <label className="block text-sm font-semibold">
                      2. Busca un administrador

                      <div className="relative mt-2">

                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                          🔎
                        </span>

                        <input
                          type="text"
                          value={
                            adminSearch
                          }
                          onChange={(
                            event
                          ) => {
                            const value =
                              event.target
                                .value;

                            setAdminSearch(
                              value
                            );

                            setShowAdminResults(
                              true
                            );

                            setSelectedAdminId(
                              ''
                            );
                          }}
                          onFocus={() =>
                            setShowAdminResults(
                              true
                            )
                          }
                          disabled={
                            !selectedTournamentId
                          }
                          placeholder={
                            selectedTournamentId
                              ? 'Buscar por nombre o correo...'
                              : 'Primero selecciona un torneo'
                          }
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-3 pl-11 pr-10 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                        />

                        {adminSearch && (
                          <button
                            type="button"
                            onClick={
                              clearAdmin
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>

                    {/* RESULTADOS ADMIN */}

                    {showAdminResults &&
                      selectedTournamentId &&
                      !selectedAdmin && (
                        <div className="absolute left-0 right-0 z-40 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 shadow-2xl">

                          {filteredAdmins.length ===
                          0 ? (
                            <div className="p-5 text-center">
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                No se encontraron administradores.
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Solo aparecen administradores
                                activos y disponibles.
                              </p>
                            </div>
                          ) : (
                            filteredAdmins.map(
                              (admin) => (
                                <button
                                  key={
                                    admin.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    selectAdmin(
                                      admin
                                    )
                                  }
                                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-slate-100 hover:dark:bg-slate-800"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                                    {admin.name
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase()}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                      {
                                        admin.name
                                      }
                                    </p>

                                    <p className="truncate text-xs text-slate-500">
                                      {
                                        admin.email
                                      }
                                    </p>
                                  </div>
                                </button>
                              )
                            )
                          )}
                        </div>
                      )}

                    {/* ADMIN SELECCIONADO */}

                    {selectedAdmin && (
                      <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                            {selectedAdmin.name
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </div>

                          <div className="min-w-0">

                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              Administrador seleccionado
                            </p>

                            <p className="truncate font-semibold">
                              {
                                selectedAdmin.name
                              }
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {
                                selectedAdmin.email
                              }
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={
                            clearAdmin
                          }
                          className="shrink-0 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:dark:bg-slate-800 hover:text-slate-900 hover:dark:text-white"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ====================================
                      BOTÓN ASIGNAR
                  ==================================== */}

                  <form
                    onSubmit={assignAdmin}
                  >
                    <button
                      type="submit"
                      disabled={
                        !selectedTournamentId ||
                        !selectedAdminId
                      }
                      className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + Asignar administrador
                    </button>
                  </form>

                  {/* ====================================
                      ASIGNADOS
                  ==================================== */}

                  <div className="mt-8">

                    <div className="mb-3 flex items-center justify-between">

                      <div>
                        <p className="text-sm font-semibold">
                          Administradores asignados
                        </p>

                        {selectedTournament && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              selectedTournament.name
                            }
                          </p>
                        )}
                      </div>

                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {
                          assignedAdmins.length
                        }
                      </span>
                    </div>

                    {assignedAdmins.length ===
                    0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 p-6 text-center">

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {selectedTournamentId
                            ? 'No hay administradores asignados a este torneo.'
                            : 'Selecciona un torneo para ver sus administradores.'}
                        </p>

                        {selectedTournamentId && (
                          <p className="mt-1 text-xs text-slate-500">
                            Selecciona un administrador arriba para comenzar.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">

                        {assignedAdmins.map(
                          ({
                            user: assigned,
                          }) => (
                            <div
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-4"
                              key={
                                assigned.id
                              }
                            >

                              <div className="flex min-w-0 items-center gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  {assigned.name
                                    ?.charAt(
                                      0
                                    )
                                    ?.toUpperCase()}
                                </div>

                                <div className="min-w-0">

                                  <p className="truncate text-sm font-semibold">
                                    {
                                      assigned.name
                                    }
                                  </p>

                                  <p className="truncate text-xs text-slate-500">
                                    {
                                      assigned.email
                                    }
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  requestRemoveAdmin(
                                    assigned
                                  )
                                }
                                className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-500/10 hover:text-red-700 hover:dark:text-red-300"
                              >
                                Retirar
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      {/* ==========================================
          MODAL CAMBIAR CONTRASEÑA
      ========================================== */}

      {passwordAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={closePasswordModal}
        >
          <form
            onSubmit={changePassword}
            onClick={(event) =>
              event.stopPropagation()
            }
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
          >

            <div className="border-b border-slate-200 dark:border-slate-800 p-6">

              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Seguridad
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Cambiar contraseña
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Cambiarás la contraseña de{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {
                    passwordAdmin.name
                  }
                </span>
                .
              </p>
            </div>

            <div className="p-6">

              <label className="text-sm font-semibold">
                Nueva contraseña

                <input
                  type="password"
                  minLength="8"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value
                    )
                  }
                  placeholder="Mínimo 8 caracteres"
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={
                  isChangingPassword
                }
                onClick={
                  closePasswordModal
                }
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 hover:dark:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  isChangingPassword ||
                  newPassword.length < 8
                }
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isChangingPassword
                  ? 'Actualizando...'
                  : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL CONFIRMAR RETIRO
      ========================================== */}

      {adminToRemove && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-white dark:bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={
            cancelRemoveAdmin
          }
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="border-b border-slate-200 dark:border-slate-800 p-6">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xl font-bold text-red-600 dark:text-red-400">
                  !
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Retirar administrador
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    ¿Estás seguro de que deseas
                    retirar a{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {
                        adminToRemove.name
                      }
                    </span>{' '}
                    de este torneo?
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">

              <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">

                <p className="text-sm leading-6 text-amber-700 dark:text-amber-300">
                  El administrador dejará de tener
                  acceso a la gestión de este torneo.
                </p>

                <p className="mt-1 text-xs text-amber-400/70">
                  El usuario no será eliminado del
                  sistema.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={isRemoving}
                onClick={
                  cancelRemoveAdmin
                }
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 hover:dark:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isRemoving}
                onClick={
                  confirmRemoveAdmin
                }
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-slate-900 dark:text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemoving
                  ? 'Retirando...'
                  : 'Sí, retirar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
