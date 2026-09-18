import { useEffect, useState } from 'react';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import ConfirmActionModal from '../components/ConfirmActionModal.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

const emptyForm = { name: '', jerseyNumber: '' };

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value));
}

export default function DtPlayersPage() {
  const { notify } = useNotifications();

  const [context, setContext] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const tournamentId = context?.tournament?.id;
  const teamId = context?.team?.id;

  const deadline = context?.tournament?.playerRegistrationDeadline;
  const registrationClosed = Boolean(deadline && new Date(deadline).getTime() < Date.now());

  async function loadPlayers(currentTournamentId, currentTeamId) {
    try {
      const { data } = await api.get(`/tournaments/${currentTournamentId}/teams/${currentTeamId}/players`);
      setPlayers(data.data.players);
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  useEffect(() => {
    async function loadContext() {
      setIsLoading(true);

      try {
        const { data } = await api.get('/teams/me');
        setContext(data.data);

        if (data.data.tournament) {
          await loadPlayers(data.data.tournament.id, data.data.team.id);
        }
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadContext();
  }, [notify]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEditing(player) {
    setEditingId(player.id);
    setForm({ name: player.name, jerseyNumber: player.jerseyNumber ?? '' });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function savePlayer(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingId) {
        await api.patch(`/tournaments/${tournamentId}/teams/${teamId}/players/${editingId}`, form);
      } else {
        await api.post(`/tournaments/${tournamentId}/teams/${teamId}/players`, form);
      }

      notify({
        type: 'success',
        title: editingId ? 'Jugador actualizado' : 'Jugador inscrito',
        message: 'La información del jugador fue guardada.',
      });

      cancelEditing();
      await loadPlayers(tournamentId, teamId);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePlayer(playerId) {
    setIsDeleting(true);

    try {
      await api.delete(`/tournaments/${tournamentId}/teams/${teamId}/players/${playerId}`);
      notify({ type: 'success', title: 'Jugador eliminado', message: 'Se quitó de la lista de inscritos.' });
      setPlayerToDelete(null);
      await loadPlayers(tournamentId, teamId);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24 dark:bg-[#070b12] sm:px-6 lg:px-8">
      <DashboardNavbar />

      <section className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Inscripción de jugadores
        </h1>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Cargando...</p>
        ) : !context?.team ? (
          <p className="mt-4 text-sm text-slate-500">No se encontró tu equipo.</p>
        ) : !context?.tournament ? (
          <p className="mt-4 text-sm text-slate-500">
            Tu equipo ({context.team.name}) todavía no está inscrito en ningún torneo.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {context.team.name} · {context.tournament.name}
            </p>

            {deadline && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  registrationClosed
                    ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300'
                    : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300'
                }`}
              >
                {registrationClosed
                  ? `La inscripción de jugadores cerró el ${formatDate(deadline)}. Ya no podés agregar, editar ni eliminar jugadores.`
                  : `Fecha límite de inscripción: ${formatDate(deadline)}.`}
              </div>
            )}

            {!registrationClosed && (
              <form
                className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_140px_auto]"
                onSubmit={savePlayer}
              >
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nombre

                  <input
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Dorsal

                  <input
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    name="jerseyNumber"
                    value={form.jerseyNumber}
                    onChange={updateField}
                  />
                </label>

                <div className="flex items-end gap-2">
                  <button
                    className="h-11 flex-1 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Guardando...' : editingId ? 'Guardar' : 'Inscribir'}
                  </button>

                  {editingId && (
                    <button
                      className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                      type="button"
                      onClick={cancelEditing}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {players.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">Todavía no inscribiste jugadores.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {players.map((player) => (
                    <li key={player.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {player.name}
                        </p>
                        <p className="text-xs text-slate-500">Dorsal {player.jerseyNumber ?? '-'}</p>
                      </div>

                      {!registrationClosed && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                            type="button"
                            onClick={() => startEditing(player)}
                          >
                            Editar
                          </button>

                          <button
                            className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400"
                            type="button"
                            onClick={() => setPlayerToDelete(player)}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>

      <ConfirmActionModal
        isOpen={Boolean(playerToDelete)}
        title="¿Eliminar jugador?"
        message={playerToDelete ? `"${playerToDelete.name}" se quitará de la lista de inscritos.` : ''}
        confirmLabel="Sí, eliminar"
        isLoading={isDeleting}
        onCancel={() => setPlayerToDelete(null)}
        onConfirm={() => deletePlayer(playerToDelete.id)}
      />
    </main>
  );
}
