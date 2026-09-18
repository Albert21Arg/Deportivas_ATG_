import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import DashboardNavbar from '../components/DashboardNavbar.jsx';

const emptyForm = {
  name: '',
  description: '',
  logo: '',
  expiresAt: '',
  playerRegistrationDeadline: '',
  pricePerTeam: '',
  championLabel: '',
  mode: 'ROUND_ROBIN',
  hasThirdPlace: false,
  blueCardEnabled: true,
  awayGoalsRule: false,
};

const emptyModeForm = {
  mode: 'ROUND_ROBIN',
  hasThirdPlace: false,
  awayGoalsRule: false,
};

const MODE_OPTIONS = [
  { value: 'ROUND_ROBIN', label: 'Todos contra todos' },
  { value: 'GROUP_STAGE', label: 'Fase de grupos' },
  { value: 'KNOCKOUT_SINGLE', label: 'Eliminación directa' },
  { value: 'KNOCKOUT_TWO_LEG', label: 'Eliminatoria ida y vuelta' },
];

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();

  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [modeForm, setModeForm] = useState(emptyModeForm);
  const [modeEditingId, setModeEditingId] = useState(null);
  const [isSavingMode, setIsSavingMode] = useState(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

  const [deadlineForm, setDeadlineForm] = useState({ playerRegistrationDeadline: '' });
  const [deadlineEditingId, setDeadlineEditingId] = useState(null);
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);

  const [championForm, setChampionForm] = useState({ teamId: '' });
  const [championEditingId, setChampionEditingId] = useState(null);
  const [championTeams, setChampionTeams] = useState([]);
  const [isLoadingChampionTeams, setIsLoadingChampionTeams] = useState(false);
  const [isSavingChampion, setIsSavingChampion] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedActionIds, setExpandedActionIds] = useState(() => new Set());
  const [showMobileFab, setShowMobileFab] = useState(false);

  // El botón flotante para crear torneo solo tiene sentido cuando el usuario
  // ya bajó lo suficiente como para perder de vista el CTA del encabezado;
  // si no, quedaría flotando encima del buscador/filtros sin aportar nada.
  useEffect(() => {
    function handleScroll() {
      setShowMobileFab(window.scrollY > 420);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function toggleActions(tournamentId) {
    setExpandedActionIds((current) => {
      const next = new Set(current);
      if (next.has(tournamentId)) {
        next.delete(tournamentId);
      } else {
        next.add(tournamentId);
      }
      return next;
    });
  }
  const [isChampionModalOpen, setIsChampionModalOpen] = useState(false);

  useEffect(() => {
    async function loadTournaments() {
      try {
        const { data } = await api.get('/tournaments');
        setTournaments(data.data.tournaments);
      } catch (error) {
        const details = getApiErrorDetails(error);
        notify(details);
      } finally {
        setIsLoading(false);
      }
    }

    loadTournaments();
  }, [notify]);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function startEditing(tournament) {
    setEditingId(tournament.id);
    setForm({
      name: tournament.name,
      description: tournament.description ?? '',
      logo: tournament.logo ?? '',
      expiresAt: toDateInputValue(tournament.expiresAt),
      playerRegistrationDeadline: toDateInputValue(tournament.playerRegistrationDeadline),
      pricePerTeam: tournament.pricePerTeam ?? '',
      championLabel: tournament.championLabel ?? '',
      mode: tournament.mode ?? 'ROUND_ROBIN',
      hasThirdPlace: Boolean(tournament.hasThirdPlace),
      blueCardEnabled: tournament.blueCardEnabled ?? true,
      awayGoalsRule: Boolean(tournament.awayGoalsRule),
    });
    setIsModalOpen(true);
  }

  function cancelEditing() {
    if (isSaving) return;

    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateModeField(event) {
    const { name, type, checked, value } = event.target;
    setModeForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function openModeModal(tournament) {
    setModeEditingId(tournament.id);
    setModeForm({
      mode: tournament.mode ?? 'ROUND_ROBIN',
      hasThirdPlace: Boolean(tournament.hasThirdPlace),
      awayGoalsRule: Boolean(tournament.awayGoalsRule),
    });
    setIsModeModalOpen(true);
  }

  function cancelEditingMode() {
    if (isSavingMode) return;

    setIsModeModalOpen(false);
    setModeEditingId(null);
    setModeForm(emptyModeForm);
  }

  async function saveMode(event) {
    event.preventDefault();
    setIsSavingMode(true);

    try {
      const { data } = await api.patch(
        `/tournaments/${modeEditingId}/mode`,
        modeForm
      );

      const updatedTournament = data.data.tournament;

      setTournaments((current) =>
        current.map((tournament) =>
          tournament.id === modeEditingId ? updatedTournament : tournament
        )
      );

      notify({
        type: 'success',
        title: 'Modo actualizado',
        message: `El torneo "${updatedTournament.name}" ahora está en modo "${
          MODE_OPTIONS.find((option) => option.value === updatedTournament.mode)?.label ?? updatedTournament.mode
        }".`,
      });

      setIsModeModalOpen(false);
      setModeEditingId(null);
      setModeForm(emptyModeForm);
    } catch (error) {
      const details = getApiErrorDetails(error);
      notify(details);
    } finally {
      setIsSavingMode(false);
    }
  }

  function updateDeadlineField(event) {
    setDeadlineForm({ playerRegistrationDeadline: event.target.value });
  }

  function openDeadlineModal(tournament) {
    setDeadlineEditingId(tournament.id);
    setDeadlineForm({ playerRegistrationDeadline: toDateInputValue(tournament.playerRegistrationDeadline) });
    setIsDeadlineModalOpen(true);
  }

  function cancelEditingDeadline() {
    if (isSavingDeadline) return;

    setIsDeadlineModalOpen(false);
    setDeadlineEditingId(null);
    setDeadlineForm({ playerRegistrationDeadline: '' });
  }

  async function saveDeadline(event) {
    event.preventDefault();
    setIsSavingDeadline(true);

    try {
      const { data } = await api.patch(
        `/tournaments/${deadlineEditingId}/player-registration-deadline`,
        deadlineForm
      );

      const updatedTournament = data.data.tournament;

      setTournaments((current) =>
        current.map((tournament) =>
          tournament.id === deadlineEditingId ? updatedTournament : tournament
        )
      );

      notify({
        type: 'success',
        title: 'Fecha límite actualizada',
        message: updatedTournament.playerRegistrationDeadline
          ? `Los DT de "${updatedTournament.name}" pueden inscribir jugadores hasta ${formatDate(updatedTournament.playerRegistrationDeadline)}.`
          : `"${updatedTournament.name}" ya no tiene fecha límite de inscripción.`,
      });

      setIsDeadlineModalOpen(false);
      setDeadlineEditingId(null);
      setDeadlineForm({ playerRegistrationDeadline: '' });
    } catch (error) {
      const details = getApiErrorDetails(error);
      notify(details);
    } finally {
      setIsSavingDeadline(false);
    }
  }

  async function openChampionModal(tournament) {
    setChampionEditingId(tournament.id);
    setChampionForm({
      teamId: tournament.championTeamId ? String(tournament.championTeamId) : '',
    });
    setIsChampionModalOpen(true);
    setIsLoadingChampionTeams(true);

    try {
      const { data } = await api.get(`/tournaments/${tournament.id}/teams`);
      setChampionTeams(data.data.teams.map((item) => item.team));
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsLoadingChampionTeams(false);
    }
  }

  function cancelEditingChampion() {
    if (isSavingChampion) return;

    setIsChampionModalOpen(false);
    setChampionEditingId(null);
    setChampionForm({ teamId: '' });
    setChampionTeams([]);
  }

  async function saveChampion(event) {
    event.preventDefault();
    setIsSavingChampion(true);

    const tournament = tournaments.find(
      (item) => item.id === championEditingId
    );

    try {
      const { data } = await api.patch(
        `/tournaments/${championEditingId}/champion`,
        {
          championTeamId: championForm.teamId || null,
          runnerUpTeamId: tournament?.runnerUpTeamId ?? null,
          thirdPlaceTeamId: tournament?.thirdPlaceTeamId ?? null,
        }
      );

      const updatedTournament = data.data.tournament;

      setTournaments((current) =>
        current.map((item) =>
          item.id === championEditingId ? updatedTournament : item
        )
      );

      notify({
        type: 'success',
        title: 'Campeón actualizado',
        message: updatedTournament.championTeam
          ? `${updatedTournament.championTeam.name} ahora es el campeón de "${updatedTournament.name}".`
          : `Se quitó el campeón de "${updatedTournament.name}".`,
      });

      setIsChampionModalOpen(false);
      setChampionEditingId(null);
      setChampionForm({ teamId: '' });
      setChampionTeams([]);
    } catch (error) {
      const details = getApiErrorDetails(error);
      notify(details);
    } finally {
      setIsSavingChampion(false);
    }
  }

  async function saveTournament(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = editingId
        ? await api.put(`/tournaments/${editingId}`, form)
        : await api.post('/tournaments', form);

      const savedTournament = response.data.data.tournament;

      setTournaments((current) => {
        if (!editingId) {
          return [savedTournament, ...current];
        }

        return current.map((tournament) =>
          tournament.id === editingId ? savedTournament : tournament
        );
      });

      notify({
        type: 'success',
        title: editingId ? 'Torneo actualizado' : 'Torneo creado',
        message: `El torneo "${savedTournament.name}" se guardó correctamente.`,
      });

      setIsModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      const details = getApiErrorDetails(error);
      notify(details);
    } finally {
      setIsSaving(false);
    }
  }

  async function changeStatus(tournament) {
    const nextStatus =
      tournament.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      const { data } = await api.patch(
        `/tournaments/${tournament.id}/status`,
        { status: nextStatus }
      );

      const updatedTournament = data.data.tournament;

      setTournaments((current) =>
        current.map((item) =>
          item.id === updatedTournament.id ? updatedTournament : item
        )
      );

      notify({
        type: 'success',
        title:
          nextStatus === 'ACTIVE'
            ? 'Torneo activado'
            : 'Torneo desactivado',
        message: `"${updatedTournament.name}" ahora está ${
          nextStatus === 'ACTIVE' ? 'activo' : 'inactivo'
        }.`,
      });
    } catch (error) {
      const details = getApiErrorDetails(error);
      notify(details);
    }
  }

  async function moveTournament(tournament, direction) {
    try {
      const { data } = await api.patch(
        `/tournaments/${tournament.id}/move`,
        { direction }
      );

      setTournaments(data.data.tournaments);
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  const isSuperAdmin = user.role === 'SUPERADMIN';

  const activeTournaments = tournaments.filter(
    (tournament) => tournament.status === 'ACTIVE'
  ).length;

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesStatus =
      statusFilter === 'ALL' || tournament.status === statusFilter;

    const matchesSearch =
      !normalizedSearch ||
      tournament.name.toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });

  return (
    <main className="lm-ready min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">

      {/* =========================================================
          BACKGROUND
      ========================================================= */}
      <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-emerald-500/[0.055] blur-3xl" />

        <div className="absolute right-[-160px] top-[20%] h-[420px] w-[420px] rounded-full bg-cyan-500/[0.035] blur-3xl" />

        <div className="absolute bottom-[-180px] left-[30%] h-[420px] w-[420px] rounded-full bg-blue-500/[0.03] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.018]"
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
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">

        {/* BACK */}
        <Link
          className="group inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-600 hover:dark:text-emerald-400"
          to="/dashboard"
        >
          <span className="text-base transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>

          Volver al dashboard
        </Link>

        {/* =======================================================
            HERO
        ======================================================= */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-gradient-to-br from-white/[0.055] via-white/[0.02] to-transparent shadow-xl shadow-black/20 sm:mt-6 sm:rounded-3xl sm:shadow-2xl">

          {/* Decorative glow only from tablet upward */}
          <div className="pointer-events-none absolute -right-24 -top-32 hidden h-[340px] w-[340px] rounded-full bg-emerald-400/[0.08] blur-3xl sm:block" />

          <div className="relative p-4 sm:p-7 md:p-8 lg:p-10">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">

              {/* Hero copy */}
              <div className="min-w-0 max-w-2xl">

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 sm:px-3 sm:py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.7)]" />

                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400 sm:text-[10px] sm:tracking-[0.2em]">
                    Gestión deportiva
                  </span>
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:mt-5 sm:text-4xl md:text-5xl">
                  Tus{' '}
                  <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    torneos
                  </span>
                  , bajo control.
                </h1>

                <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-base sm:leading-7">
                  Organiza tus competencias, supervisa su actividad y
                  accede rápidamente a toda la información de cada torneo
                  desde un solo lugar.
                </p>

                <div className="mt-5 h-px w-16 bg-gradient-to-r from-emerald-400 to-transparent sm:mt-7 sm:w-24" />
              </div>

              {/* Hero stats */}
              <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:w-auto lg:min-w-[310px]">

                <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-black/20 p-3 sm:rounded-2xl sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 sm:text-xs">
                      Total
                    </span>

                    <span className="text-base sm:text-lg">
                      🏆
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:mt-3 sm:text-3xl">
                    {tournaments.length}
                  </p>

                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-600 sm:mt-1 sm:text-[11px]">
                    {tournaments.length === 1 ? 'Torneo' : 'Torneos'}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] p-3 sm:rounded-2xl sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 sm:text-xs">
                      Activos
                    </span>

                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)] sm:h-2 sm:w-2" />
                  </div>

                  <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 sm:mt-3 sm:text-3xl">
                    {activeTournaments}
                  </p>

                  <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-600 sm:mt-1 sm:text-[11px]">
                    En funcionamiento
                  </p>
                </div>

              </div>
            </div>

            {/* CTA */}
            {isSuperAdmin && (
              <div className="relative mt-6 border-t border-slate-200 dark:border-white/[0.06] pt-5 sm:mt-8 sm:pt-6">
                <button
                  className="group flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 dark:text-slate-950 shadow-md shadow-emerald-500/10 transition hover:bg-emerald-400 sm:inline-flex sm:w-auto sm:px-5"
                  onClick={openCreateModal}
                  type="button"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white dark:bg-slate-950/10 text-lg leading-none">
                    +
                  </span>

                  Crear nuevo torneo

                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* =======================================================
            LIST
        ======================================================= */}
        <section className="mt-8 sm:mt-12">

          {/* LIST HEADER */}
          <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400 sm:text-[10px] sm:tracking-[0.2em]">
                Administración
              </p>

              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Tus torneos
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Selecciona un torneo para administrar todos sus detalles.
              </p>
            </div>

            {!isLoading && tournaments.length > 0 && (
              <div className="text-[11px] text-slate-600 sm:text-xs">
                {filteredTournaments.length}{' '}
                {filteredTournaments.length === 1 ? 'resultado' : 'resultados'}
              </div>
            )}

          </div>

          {/* =====================================================
              SEARCH + FILTERS
          ===================================================== */}
          {!isLoading && tournaments.length > 0 && (
            <div className="sticky top-[64px] z-30 -mx-4 mb-4 flex flex-col gap-2.5 bg-slate-50/95 px-4 py-2.5 backdrop-blur dark:bg-[#05090e]/95 sm:static sm:mx-0 sm:mb-6 sm:flex-row sm:items-center sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none sm:dark:bg-transparent">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  🔎
                </span>

                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:rounded-2xl"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar torneo por nombre..."
                  aria-label="Buscar torneo por nombre"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:shrink-0 sm:gap-2">
                {[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'ACTIVE', label: 'Activos' },
                  { value: 'INACTIVE', label: 'Inactivos' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`min-h-10 rounded-xl border px-3 py-2 text-[11px] font-bold transition sm:rounded-2xl sm:px-4 sm:text-xs ${
                      statusFilter === option.value
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 dark:hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================
              LOADING
          ===================================================== */}
          {isLoading && (
            <div className="grid gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  className="h-[320px] animate-pulse rounded-xl border border-slate-200 dark:border-white/[0.05] bg-slate-100 dark:bg-white/[0.025] sm:h-[370px] sm:rounded-2xl"
                  key={item}
                />
              ))}
            </div>
          )}

          {/* =====================================================
              EMPTY
          ===================================================== */}
          {!isLoading && tournaments.length === 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.02] px-5 py-12 text-center sm:rounded-3xl sm:px-6 sm:py-16">

              <div className="absolute left-1/2 top-0 hidden h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-400/[0.05] blur-3xl sm:block" />

              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05] text-2xl sm:h-16 sm:w-16 sm:rounded-2xl sm:text-3xl">
                🏆
              </div>

              <h3 className="relative mt-5 text-lg font-bold text-slate-900 dark:text-white sm:mt-6 sm:text-xl">
                Tu próximo torneo empieza aquí
              </h3>

              <p className="relative mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500 sm:text-sm">
                Crea tu primer torneo y comienza a gestionar equipos,
                partidos y administradores desde una única plataforma.
              </p>

              {isSuperAdmin && (
                <button
                  className="relative mt-6 min-h-11 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 dark:text-slate-950 shadow-md shadow-emerald-500/10 transition hover:bg-emerald-400 sm:mt-7 sm:px-6"
                  onClick={openCreateModal}
                  type="button"
                >
                  Crear mi primer torneo
                </button>
              )}
            </div>
          )}

          {/* =====================================================
              NO MATCHES (hay torneos, pero el filtro no encontró nada)
          ===================================================== */}
          {!isLoading && tournaments.length > 0 && filteredTournaments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.02] px-5 py-10 text-center sm:rounded-3xl sm:py-12">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Ningún torneo coincide con tu búsqueda.
              </p>

              <button
                className="mt-3 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
              >
                Quitar filtros
              </button>
            </div>
          )}

          {/* =====================================================
              TOURNAMENT CARDS
          ===================================================== */}
          {!isLoading && filteredTournaments.length > 0 && (
            <div className="grid gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">

              {filteredTournaments.map((tournament) => {
                const isActive = tournament.status === 'ACTIVE';
                // Subir/Bajar reordena la posición real en la portada, así que
                // se calcula sobre la lista completa, no sobre la filtrada.
                const index = tournaments.findIndex((item) => item.id === tournament.id);

                return (
                  <article
                    className={`group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white dark:bg-[#0b1119]/95 shadow-lg transition-all duration-200 sm:rounded-2xl sm:shadow-xl sm:hover:-translate-y-1 ${
                      isActive
                        ? 'border-emerald-400/[0.11] sm:hover:border-emerald-400/25'
                        : 'border-slate-200 dark:border-white/[0.06] sm:hover:border-slate-300 sm:hover:dark:border-white/[0.12]'
                    }`}
                    key={tournament.id}
                  >

                    {/* TOP ACCENT */}
                    <div
                      className={`h-[2px] w-full ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />

                    {/* CARD GLOW - desktop only */}
                    {isActive && (
                      <div className="pointer-events-none absolute -right-20 -top-20 hidden h-48 w-48 rounded-full bg-emerald-400/[0.055] blur-3xl sm:block" />
                    )}

                    <div className="relative flex flex-1 flex-col p-4 sm:p-6">

                      {/* HEADER */}
                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">

                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg sm:h-12 sm:w-12 sm:rounded-xl sm:text-xl ${
                              isActive
                                ? 'border-emerald-400/15 bg-emerald-400/[0.07]'
                                : 'border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.035] grayscale'
                            }`}
                          >
                            🏆
                          </div>

                          <div className="min-w-0">
                            <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600 sm:mb-1 sm:text-[9px]">
                              Torneo
                            </p>

                            <h3
                              className="line-clamp-2 break-words text-sm font-bold leading-tight text-slate-900 dark:text-white sm:text-base"
                              title={tournament.name}
                            >
                              {tournament.name}
                            </h3>
                          </div>
                        </div>

                        {/* STATUS */}
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold sm:gap-1.5 sm:px-2.5 sm:text-[10px] ${
                            isActive
                              ? 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-700 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.035] text-slate-500'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.8)]'
                                : 'bg-slate-600'
                            }`}
                          />

                          {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      {/* DESCRIPTION */}
                      <p className="mt-4 min-h-[40px] line-clamp-2 text-xs leading-5 text-slate-500 sm:mt-5 sm:min-h-[44px] sm:text-sm sm:leading-6">
                        {tournament.description ||
                          'Este torneo no tiene una descripción disponible.'}
                      </p>

                      {/* STATS */}
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.05] bg-slate-100 dark:bg-black/20 sm:mt-6 sm:rounded-2xl">

                        <div className="grid grid-cols-3">

                          <div className="px-2 py-3 text-center sm:px-3 sm:py-4">
                            <span className="block text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                              {tournament._count.teams}
                            </span>

                            <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wider text-slate-600 sm:mt-1 sm:text-[9px]">
                              Equipos
                            </span>
                          </div>

                          <div className="border-x border-slate-200 dark:border-white/[0.05] px-2 py-3 text-center sm:px-3 sm:py-4">
                            <span className="block text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                              {tournament._count.matches}
                            </span>

                            <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wider text-slate-600 sm:mt-1 sm:text-[9px]">
                              Partidos
                            </span>
                          </div>

                          <div className="px-2 py-3 text-center sm:px-3 sm:py-4">
                            <span className="block text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                              {tournament._count.admins}
                            </span>

                            <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wider text-slate-600 sm:mt-1 sm:text-[9px]">
                              Admins
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* CREATED */}
                      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-600 sm:mt-5 sm:gap-2 sm:text-[11px]">
                        <span className="text-xs sm:text-sm">
                          ◷
                        </span>

                        <span>
                          Creado el {formatDate(tournament.createdAt)}
                        </span>
                      </div>

                      {tournament.expiresAt && (
                        <div
                          className={`mt-1.5 flex items-center gap-1.5 text-[10px] sm:gap-2 sm:text-[11px] ${
                            new Date(tournament.expiresAt).getTime() < Date.now()
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-600'
                          }`}
                        >
                          <span className="text-xs sm:text-sm">⏳</span>

                          <span>
                            {new Date(tournament.expiresAt).getTime() < Date.now()
                              ? `Venció el ${formatDate(tournament.expiresAt)}`
                              : `Vence el ${formatDate(tournament.expiresAt)}`}
                          </span>
                        </div>
                      )}

                      {tournament.pricePerTeam != null && (
                        <div
                          className={`mt-2 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[10px] sm:text-[11px] ${
                            !isActive
                              ? 'border-red-400/20 bg-red-400/[0.06] text-red-700 dark:text-red-300'
                              : 'border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] text-slate-500'
                          }`}
                        >
                          <span className="font-semibold">
                            {!isActive ? 'Total a pagar para reactivar' : 'Total a pagar'}
                          </span>

                          <span className="font-black">
                            {formatMoney(tournament.pricePerTeam * tournament._count.teams)}
                          </span>
                        </div>
                      )}

                      {/* CTA */}
                      <div className="mt-auto pt-4 sm:pt-5">

                        <Link
                          className={`group/cta flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm ${
                            isActive
                              ? 'bg-emerald-500 text-slate-950 dark:text-slate-950 shadow-md shadow-emerald-500/5 hover:bg-emerald-400'
                              : 'border border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.035] text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-white/[0.06] hover:text-slate-900 hover:dark:text-white'
                          }`}
                          to={`/dashboard/tournaments/${tournament.id}`}
                        >
                          {isActive
                            ? 'Ingresar al torneo'
                            : 'Ver torneo'}

                          <span className="transition-transform duration-200 group-hover/cta:translate-x-1">
                            →
                          </span>
                        </Link>

                        {/* ADMIN ACTIONS */}
                        {isSuperAdmin && (
                          <div className="mt-2">
                            <button
                              className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:text-slate-900 hover:dark:text-white sm:rounded-xl sm:text-xs"
                              onClick={() => toggleActions(tournament.id)}
                              type="button"
                              aria-expanded={expandedActionIds.has(tournament.id)}
                            >
                              {expandedActionIds.has(tournament.id)
                                ? 'Ocultar opciones'
                                : 'Más opciones'}

                              <span
                                className={`transition-transform duration-200 ${
                                  expandedActionIds.has(tournament.id) ? 'rotate-180' : ''
                                }`}
                              >
                                ▾
                              </span>
                            </button>

                            {expandedActionIds.has(tournament.id) && (
                              <div className="mt-2 grid grid-cols-2 gap-2">

                                <button
                                  className="min-h-10 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:dark:border-white/[0.12] hover:bg-slate-200 hover:dark:bg-white/[0.05] hover:text-slate-900 hover:dark:text-white sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
                                  onClick={() => startEditing(tournament)}
                                  type="button"
                                >
                                  Editar
                                </button>

                                <button
                                  className={`min-h-10 rounded-lg border px-2 py-2 text-[11px] font-semibold transition sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs ${
                                    isActive
                                      ? 'border-amber-400/10 bg-amber-400/[0.025] text-amber-400/80 hover:border-amber-400/25 hover:bg-amber-400/[0.06]'
                                      : 'border-emerald-400/10 bg-emerald-400/[0.025] text-emerald-600 dark:text-emerald-400/80 hover:border-emerald-400/25 hover:bg-emerald-400/[0.06]'
                                  }`}
                                  onClick={() => changeStatus(tournament)}
                                  type="button"
                                >
                                  {isActive ? 'Desactivar' : 'Activar'}
                                </button>

                                <button
                                  className="min-h-10 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:dark:border-white/[0.12] hover:bg-slate-200 hover:dark:bg-white/[0.05] hover:text-slate-900 hover:dark:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
                                  onClick={() => moveTournament(tournament, 'up')}
                                  disabled={index === 0}
                                  type="button"
                                  title="Subir en la portada"
                                >
                                  ↑ Subir
                                </button>

                                <button
                                  className="min-h-10 rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:dark:border-white/[0.12] hover:bg-slate-200 hover:dark:bg-white/[0.05] hover:text-slate-900 hover:dark:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
                                  onClick={() => moveTournament(tournament, 'down')}
                                  disabled={index === tournaments.length - 1}
                                  type="button"
                                  title="Bajar en la portada"
                                >
                                  ↓ Bajar
                                </button>

                                <button
                                  className="col-span-2 min-h-10 rounded-lg border border-amber-400/15 bg-amber-400/[0.03] px-2 py-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400/90 transition hover:border-amber-400/30 hover:bg-amber-400/[0.08] sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
                                  onClick={() => openChampionModal(tournament)}
                                  type="button"
                                >
                                  🏆{' '}
                                  {tournament.championTeam
                                    ? `Campeón: ${tournament.championTeam.name}`
                                    : 'Declarar campeón'}
                                </button>

                              </div>
                            )}
                          </div>
                        )}

                        {!isSuperAdmin && (
                          <div className="mt-2">
                            <button
                              className="min-h-10 w-full rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:dark:border-white/[0.12] hover:bg-slate-200 hover:dark:bg-white/[0.05] hover:text-slate-900 hover:dark:text-white sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
                              onClick={() => openModeModal(tournament)}
                              type="button"
                            >
                              Cambiar modo
                            </button>
                          </div>
                        )}

                        {/* Fecha límite de inscripción: la puede tocar
                            cualquier admin asignado al torneo, no solo
                            superadmin (por eso va fuera de los bloques
                            isSuperAdmin/!isSuperAdmin de arriba). */}
                        <div className="mt-2">
                          <button
                            className="min-h-10 w-full rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:dark:border-white/[0.12] hover:bg-slate-200 hover:dark:bg-white/[0.05] hover:text-slate-900 hover:dark:text-white sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
                            onClick={() => openDeadlineModal(tournament)}
                            type="button"
                          >
                            {tournament.playerRegistrationDeadline
                              ? `Inscripción hasta ${formatDate(tournament.playerRegistrationDeadline)}`
                              : 'Fecha límite de inscripción'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {/* =========================================================
          MODAL
      ========================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6 sm:backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelEditing();
            }
          }}
        >
          <div
            className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b1119] shadow-2xl shadow-black/70 sm:max-h-[90vh] sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tournament-modal-title"
          >

            {/* MODAL HEADER */}
            <div className="relative overflow-hidden border-b border-slate-200 dark:border-white/[0.06] px-4 py-5 sm:px-6 sm:py-6">

              <div className="absolute -right-12 -top-16 hidden h-40 w-40 rounded-full bg-emerald-400/[0.07] blur-3xl sm:block" />

              <div className="relative flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 sm:mb-3 sm:text-[10px] sm:tracking-[0.18em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                    {editingId
                      ? 'Editar información'
                      : 'Nuevo torneo'}
                  </div>

                  <h2
                    id="tournament-modal-title"
                    className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl"
                  >
                    {editingId ? 'Editar torneo' : 'Crear torneo'}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 sm:mt-1.5 sm:text-sm">
                    {editingId
                      ? 'Actualiza la información de tu torneo.'
                      : 'Configura la información básica para comenzar.'}
                  </p>
                </div>

                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.03] text-sm text-slate-500 transition hover:bg-slate-200 hover:dark:bg-white/[0.07] hover:text-slate-900 hover:dark:text-white"
                  onClick={cancelEditing}
                  type="button"
                  aria-label="Cerrar modal"
                  disabled={isSaving}
                >
                  ✕
                </button>

              </div>
            </div>

            {/* FORM */}
            <form onSubmit={saveTournament}>

              <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nombre del torneo

                  <input
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="name"
                    maxLength="120"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Ej. Copa Antioquia 2026"
                    required
                    autoFocus
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Descripción

                  <textarea
                    className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm leading-6 text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:min-h-32 sm:px-4"
                    name="description"
                    maxLength="2000"
                    value={form.description}
                    onChange={updateField}
                    placeholder="Describe brevemente el torneo, su categoría, temporada..."
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Logo o banner (URL)

                  <input
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="logo"
                    value={form.logo}
                    onChange={updateField}
                    placeholder="https://..."
                  />

                  <span className="mt-1.5 block text-xs font-normal text-slate-500">
                    Se muestra junto al nombre del torneo en la página pública.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Fecha de caducidad

                  <input
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="expiresAt"
                    type="date"
                    value={form.expiresAt}
                    onChange={updateField}
                  />

                  <span className="mt-1.5 block text-xs font-normal text-slate-500">
                    Al llegar esta fecha el torneo se inhabilita automáticamente. Déjalo vacío para que no caduque.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Fecha límite de inscripción de jugadores

                  <input
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="playerRegistrationDeadline"
                    type="date"
                    value={form.playerRegistrationDeadline}
                    onChange={updateField}
                  />

                  <span className="mt-1.5 block text-xs font-normal text-slate-500">
                    Después de esta fecha, los DT de los equipos ya no pueden inscribir ni editar jugadores. Déjalo vacío para no poner límite.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Precio por equipo

                  <input
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="pricePerTeam"
                    type="number"
                    min="0"
                    step="1"
                    value={form.pricePerTeam}
                    onChange={updateField}
                    placeholder="Ej. 150000"
                  />

                  <span className="mt-1.5 block text-xs font-normal text-slate-500">
                    Lo que cobras a cada equipo por participar. El total a pagar se calcula
                    multiplicando esto por los equipos inscritos
                    {editingId
                      ? ` (actualmente ${
                          tournaments.find((item) => item.id === editingId)?._count.teams ?? 0
                        }).`
                      : '.'}
                    {' '}
                    Se muestra al admin del torneo cuando este quede inactivo por vencimiento,
                    como el total que debe pagar para reactivarlo. Déjalo vacío si no aplica.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Texto del campeón

                  <input
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="championLabel"
                    maxLength="60"
                    value={form.championLabel}
                    onChange={updateField}
                    placeholder="Ej. 2026"
                  />

                  <span className="mt-1.5 block text-xs font-normal text-slate-500">
                    Se muestra junto a la palabra &quot;Campeón&quot; en la llave y en la ficha del equipo ganador (por ejemplo, el año o la temporada).
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Modo de torneo

                  <select
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="mode"
                    value={form.mode}
                    onChange={updateField}
                  >
                    {MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {editingId && (
                    <span className="mt-1.5 block text-[11px] font-normal text-slate-500">
                      Puedes pasar de todos contra todos a grupos o llaves cuando todos sus partidos hayan terminado.
                    </span>
                  )}
                </label>

                {(form.mode === 'KNOCKOUT_SINGLE' || form.mode === 'KNOCKOUT_TWO_LEG') && (
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="hasThirdPlace"
                      checked={form.hasThirdPlace}
                      onChange={updateField}
                      className="h-4 w-4 rounded border-white/20 bg-slate-200 dark:bg-black/30 accent-emerald-500"
                    />
                    Jugar partido por el 3.º y 4.º puesto
                  </label>
                )}

                {form.mode === 'KNOCKOUT_TWO_LEG' && (
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="awayGoalsRule"
                      checked={form.awayGoalsRule}
                      onChange={updateField}
                      className="h-4 w-4 rounded border-white/20 bg-slate-200 dark:bg-black/30 accent-emerald-500"
                    />
                    Usar regla de gol de visitante en caso de empate global
                  </label>
                )}

                <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    name="blueCardEnabled"
                    checked={form.blueCardEnabled}
                    onChange={updateField}
                    className="h-4 w-4 rounded border-white/20 bg-slate-200 dark:bg-black/30 accent-blue-500"
                  />
                  Habilitar tarjeta azul
                </label>

              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-black/20 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">

                <button
                  className="min-h-11 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.025] px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 hover:dark:bg-white/[0.06] hover:text-slate-900 hover:dark:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                  onClick={cancelEditing}
                  type="button"
                  disabled={isSaving}
                >
                  Cancelar
                </button>

                <button
                  className="min-h-11 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 dark:text-slate-950 shadow-md shadow-emerald-500/10 transition hover:bg-emerald-400 hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving
                    ? 'Guardando...'
                    : editingId
                      ? 'Guardar cambios'
                      : 'Crear torneo'}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL — CAMBIAR MODO
      ========================================================= */}
      {isModeModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6 sm:backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelEditingMode();
            }
          }}
        >
          <div
            className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b1119] shadow-2xl shadow-black/70 sm:max-h-[90vh] sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tournament-mode-modal-title"
          >

            {/* MODAL HEADER */}
            <div className="relative overflow-hidden border-b border-slate-200 dark:border-white/[0.06] px-4 py-5 sm:px-6 sm:py-6">

              <div className="absolute -right-12 -top-16 hidden h-40 w-40 rounded-full bg-emerald-400/[0.07] blur-3xl sm:block" />

              <div className="relative flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 sm:mb-3 sm:text-[10px] sm:tracking-[0.18em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Modo de torneo
                  </div>

                  <h2
                    id="tournament-mode-modal-title"
                    className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl"
                  >
                    Cambiar modo
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 sm:mt-1.5 sm:text-sm">
                    Actualiza el formato de competencia del torneo.
                  </p>
                </div>

                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.03] text-sm text-slate-500 transition hover:bg-slate-200 hover:dark:bg-white/[0.07] hover:text-slate-900 hover:dark:text-white"
                  onClick={cancelEditingMode}
                  type="button"
                  aria-label="Cerrar modal"
                  disabled={isSavingMode}
                >
                  ✕
                </button>

              </div>
            </div>

            {/* FORM */}
            <form onSubmit={saveMode}>

              <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Modo de torneo

                  <select
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="mode"
                    value={modeForm.mode}
                    onChange={updateModeField}
                  >
                    {MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <span className="mt-1.5 block text-[11px] font-normal text-slate-500">
                    Puedes pasar de todos contra todos a grupos o llaves cuando todos sus partidos hayan terminado.
                  </span>
                </label>

                {(modeForm.mode === 'KNOCKOUT_SINGLE' || modeForm.mode === 'KNOCKOUT_TWO_LEG') && (
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="hasThirdPlace"
                      checked={modeForm.hasThirdPlace}
                      onChange={updateModeField}
                      className="h-4 w-4 rounded border-white/20 bg-slate-200 dark:bg-black/30 accent-emerald-500"
                    />
                    Jugar partido por el 3.º y 4.º puesto
                  </label>
                )}

                {modeForm.mode === 'KNOCKOUT_TWO_LEG' && (
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      name="awayGoalsRule"
                      checked={modeForm.awayGoalsRule}
                      onChange={updateModeField}
                      className="h-4 w-4 rounded border-white/20 bg-slate-200 dark:bg-black/30 accent-emerald-500"
                    />
                    Usar regla de gol de visitante en caso de empate global
                  </label>
                )}

              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-black/20 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">

                <button
                  className="min-h-11 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.025] px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 hover:dark:bg-white/[0.06] hover:text-slate-900 hover:dark:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                  onClick={cancelEditingMode}
                  type="button"
                  disabled={isSavingMode}
                >
                  Cancelar
                </button>

                <button
                  className="min-h-11 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 dark:text-slate-950 shadow-md shadow-emerald-500/10 transition hover:bg-emerald-400 hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingMode}
                  type="submit"
                >
                  {isSavingMode ? 'Guardando...' : 'Guardar cambios'}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {isDeadlineModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6 sm:backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelEditingDeadline();
            }
          }}
        >
          <div
            className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b1119] shadow-2xl shadow-black/70 sm:max-h-[90vh] sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tournament-deadline-modal-title"
          >

            {/* MODAL HEADER */}
            <div className="relative overflow-hidden border-b border-slate-200 dark:border-white/[0.06] px-4 py-5 sm:px-6 sm:py-6">

              <div className="absolute -right-12 -top-16 hidden h-40 w-40 rounded-full bg-emerald-400/[0.07] blur-3xl sm:block" />

              <div className="relative flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400 sm:mb-3 sm:text-[10px] sm:tracking-[0.18em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Inscripción de jugadores
                  </div>

                  <h2
                    id="tournament-deadline-modal-title"
                    className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl"
                  >
                    Fecha límite de inscripción
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 sm:mt-1.5 sm:text-sm">
                    Después de esta fecha, los DT de los equipos ya no pueden inscribir ni editar jugadores.
                  </p>
                </div>

                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.03] text-sm text-slate-500 transition hover:bg-slate-200 hover:dark:bg-white/[0.07] hover:text-slate-900 hover:dark:text-white"
                  onClick={cancelEditingDeadline}
                  type="button"
                  aria-label="Cerrar modal"
                  disabled={isSavingDeadline}
                >
                  ✕
                </button>

              </div>
            </div>

            {/* FORM */}
            <form onSubmit={saveDeadline}>

              <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Fecha límite

                  <input
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                    name="playerRegistrationDeadline"
                    type="date"
                    value={deadlineForm.playerRegistrationDeadline}
                    onChange={updateDeadlineField}
                  />

                  <span className="mt-1.5 block text-[11px] font-normal text-slate-500">
                    Déjala vacía para no poner límite.
                  </span>
                </label>

              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-black/20 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">

                <button
                  className="min-h-11 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.025] px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 hover:dark:bg-white/[0.06] hover:text-slate-900 hover:dark:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                  onClick={cancelEditingDeadline}
                  type="button"
                  disabled={isSavingDeadline}
                >
                  Cancelar
                </button>

                <button
                  className="min-h-11 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 dark:text-slate-950 shadow-md shadow-emerald-500/10 transition hover:bg-emerald-400 hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingDeadline}
                  type="submit"
                >
                  {isSavingDeadline ? 'Guardando...' : 'Guardar cambios'}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {isChampionModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6 sm:backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelEditingChampion();
            }
          }}
        >
          <div
            className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b1119] shadow-2xl shadow-black/70 sm:max-h-[90vh] sm:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tournament-champion-modal-title"
          >

            {/* MODAL HEADER */}
            <div className="relative overflow-hidden border-b border-slate-200 dark:border-white/[0.06] px-4 py-5 sm:px-6 sm:py-6">

              <div className="absolute -right-12 -top-16 hidden h-40 w-40 rounded-full bg-amber-400/[0.07] blur-3xl sm:block" />

              <div className="relative flex items-start justify-between gap-3">

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400 sm:mb-3 sm:text-[10px] sm:tracking-[0.18em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Campeón del torneo
                  </div>

                  <h2
                    id="tournament-champion-modal-title"
                    className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl"
                  >
                    Declarar campeón
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 sm:mt-1.5 sm:text-sm">
                    Se muestra en la portada como el último campeón de este torneo.
                  </p>
                </div>

                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.03] text-sm text-slate-500 transition hover:bg-slate-200 hover:dark:bg-white/[0.07] hover:text-slate-900 hover:dark:text-white"
                  onClick={cancelEditingChampion}
                  type="button"
                  aria-label="Cerrar modal"
                  disabled={isSavingChampion}
                >
                  ✕
                </button>

              </div>
            </div>

            {/* FORM */}
            <form onSubmit={saveChampion}>

              <div className="space-y-4 px-4 py-5 sm:space-y-5 sm:px-6 sm:py-6">

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Equipo campeón

                  <select
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-amber-400/50 focus:bg-slate-200 focus:dark:bg-black/40 focus:ring-2 focus:ring-amber-400/10 sm:px-4"
                    name="teamId"
                    value={championForm.teamId}
                    onChange={(event) => setChampionForm({ teamId: event.target.value })}
                    disabled={isLoadingChampionTeams}
                  >
                    <option value="">Sin campeón</option>
                    {championTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>

                  <span className="mt-1.5 block text-[11px] font-normal text-slate-500">
                    {isLoadingChampionTeams
                      ? 'Cargando equipos del torneo...'
                      : 'El nombre y escudo se toman del equipo que elijas. Al guardar, el torneo queda marcado como finalizado.'}
                  </span>
                </label>

              </div>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-black/20 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">

                <button
                  className="min-h-11 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-white/[0.025] px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-200 hover:dark:bg-white/[0.06] hover:text-slate-900 hover:dark:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                  onClick={cancelEditingChampion}
                  type="button"
                  disabled={isSavingChampion}
                >
                  Cancelar
                </button>

                <button
                  className="min-h-11 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/10 transition hover:bg-amber-400 hover:shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingChampion || isLoadingChampionTeams}
                  type="submit"
                >
                  {isSavingChampion ? 'Guardando...' : 'Guardar cambios'}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MOBILE FAB (acceso rápido para crear torneo sin volver arriba)
      ========================================================= */}
      {isSuperAdmin && !isLoading && tournaments.length > 0 && showMobileFab && (
        <button
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-95 sm:hidden"
          onClick={openCreateModal}
          type="button"
          aria-label="Crear nuevo torneo"
          title="Crear nuevo torneo"
        >
          +
        </button>
      )}
    </main>
  );
}
