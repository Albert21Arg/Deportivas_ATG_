import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import ConfirmActionModal from '../components/ConfirmActionModal.jsx';
import DashboardNavbar from '../components/DashboardNavbar.jsx';
import StandingsTable from '../components/StandingsTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

function GroupStandings({ tournamentId, groupId }) {
  const { notify } = useNotifications();
  const [standings, setStandings] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/tournaments/${tournamentId}/standings`, { params: { groupId } })
      .then(({ data }) => {
        if (!cancelled) setStandings(data.data.standings);
      })
      .catch((error) => {
        if (!cancelled) notify(getApiErrorDetails(error));
      });

    return () => {
      cancelled = true;
    };
  }, [tournamentId, groupId, notify]);

  if (!standings) {
    return <p className="px-3 py-3 text-xs text-slate-600">Cargando tabla…</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-500">
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Equipo</th>
            <th className="px-2 py-2 text-center">PJ</th>
            <th className="px-2 py-2 text-center">GF</th>
            <th className="px-2 py-2 text-center">GC</th>
            <th className="px-2 py-2 text-center">DG</th>
            <th className="px-2 py-2 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.team.id} className="border-t border-slate-200 dark:border-white/[0.05] text-slate-700 dark:text-slate-300">
              <td className="px-2 py-2 font-bold text-slate-900 dark:text-white">{row.position}</td>
              <td className="px-2 py-2 truncate">{row.team.name}</td>
              <td className="px-2 py-2 text-center">{row.played}</td>
              <td className="px-2 py-2 text-center">{row.goalsFor}</td>
              <td className="px-2 py-2 text-center">{row.goalsAgainst}</td>
              <td className="px-2 py-2 text-center">{row.goalDifference}</td>
              <td className="px-2 py-2 text-center font-bold text-emerald-700 dark:text-emerald-300">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GroupsPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(searchParams.get('tournamentId') ?? '');
  const isTournamentLocked = Boolean(searchParams.get('tournamentId'));

  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [potStandings, setPotStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [groupCount, setGroupCount] = useState(2);
  const [pots, setPots] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConfirmingDraw, setIsConfirmingDraw] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isResettingGroups, setIsResettingGroups] = useState(false);

  useEffect(() => {
    api
      .get('/tournaments')
      .then(({ data }) => {
        setTournaments(data.data.tournaments);
        setSelectedTournamentId((current) => current || String(data.data.tournaments[0]?.id ?? ''));
      })
      .catch((error) => notify(getApiErrorDetails(error)));
  }, [notify]);

  async function loadGroupsAndTeams(tournamentId) {
    setIsLoading(true);
    try {
      const [groupsRes, teamsRes, potStandingsRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}/groups`),
        api.get(`/tournaments/${tournamentId}/teams`),
        api.get(`/tournaments/${tournamentId}/standings/by-pot`),
      ]);
      setGroups(groupsRes.data.data.groups);
      setTeams(teamsRes.data.data.teams.map((row) => row.team));
      setPotStandings(potStandingsRes.data.data.pots);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedTournamentId) return;
    loadGroupsAndTeams(selectedTournamentId);
    setPots({});
  }, [selectedTournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTournament = tournaments.find((tournament) => String(tournament.id) === selectedTournamentId);

  const potGroups = useMemo(() => {
    const map = new Map();
    for (const team of teams) {
      const pot = pots[team.id] ?? 1;
      if (!map.has(pot)) map.set(pot, []);
      map.get(pot).push(team.id);
    }
    return map;
  }, [teams, pots]);

  async function runDraw() {
    setIsDrawing(true);
    try {
      const potsPayload = {};
      for (const [pot, teamIds] of potGroups.entries()) {
        potsPayload[pot] = teamIds;
      }
      const { data } = await api.post(`/tournaments/${selectedTournamentId}/groups/draw`, {
        groupCount: Number(groupCount),
        pots: potsPayload,
      });
      setGroups(data.data.groups);

      const potStandingsRes = await api.get(`/tournaments/${selectedTournamentId}/standings/by-pot`);
      setPotStandings(potStandingsRes.data.data.pots);

      notify({ type: 'success', title: 'Sorteo realizado', message: 'Los grupos se generaron correctamente.' });
      setIsConfirmingDraw(false);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsDrawing(false);
    }
  }

  function randomizePots() {
    const count = Number(groupCount);

    if (teams.length < count || teams.length % count !== 0) {
      notify({
        type: 'error',
        title: 'Equipos no divisibles',
        message: 'La cantidad de equipos debe poder repartirse exactamente entre los grupos.',
      });
      return;
    }

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const nextPots = {};

    shuffled.forEach((team, index) => {
      nextPots[team.id] = Math.floor(index / count) + 1;
    });

    setPots(nextPots);
    notify({
      type: 'success',
      title: 'Bombos generados',
      message: 'Los equipos fueron distribuidos al azar. Ahora puedes sortear los grupos.',
    });
  }

  async function resetGroups() {
    setIsResettingGroups(true);
    try {
      await api.delete(`/tournaments/${selectedTournamentId}/groups`);
      setGroups([]);
      setPotStandings([]);
      setIsConfirmingReset(false);
      notify({ type: 'success', title: 'Bombos eliminados', message: 'Puedes armar un nuevo sorteo para este torneo.' });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsResettingGroups(false);
    }
  }

  async function generateFixtures(groupId) {
    try {
      await api.post(`/tournaments/${selectedTournamentId}/matches/generate-fixtures`, { groupId });
      notify({ type: 'success', title: 'Fixture generado', message: 'Se crearon los partidos del grupo.' });
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  return (
    <main className="lm-ready min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">
      <DashboardNavbar />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-600 hover:dark:text-emerald-400" to="/dashboard/tournaments">
          ← Volver a torneos
        </Link>

        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Fase de grupos</h1>
        <p className="mt-1 text-sm text-slate-500">Arma los bombos, sortea los grupos y genera sus partidos.</p>

        {!isTournamentLocked && (
          <select
            className="mt-4 min-h-10 w-full max-w-sm rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-400/50"
            value={selectedTournamentId}
            onChange={(event) => setSelectedTournamentId(event.target.value)}
          >
            <option value="">Selecciona un torneo</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        )}

        {selectedTournament && selectedTournament.mode !== 'GROUP_STAGE' && (
          <p className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            Este torneo está en modo &quot;{selectedTournament.mode}&quot;, no en fase de grupos. Cambia el modo desde la edición del torneo si quieres usar esta sección.
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 text-sm text-slate-500">Cargando…</p>
        ) : (
          <>
            {isAdmin && (
              <div className="mt-8 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sorteo de bombos</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Asigna un bombo a cada equipo y elige cuántos grupos quieres. Cada bombo debe tener exactamente
                  tantos equipos como grupos, para repartir uno por grupo.
                </p>

                <label className="mt-4 block max-w-[160px] text-xs font-semibold text-slate-500 dark:text-slate-400">
                  N.º de grupos
                  <input
                    type="number"
                    min="2"
                    className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-200 dark:bg-black/30 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-400/50"
                    value={groupCount}
                    onChange={(event) => setGroupCount(event.target.value)}
                  />
                </label>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/[0.05] bg-slate-100 dark:bg-black/20 px-3 py-2">
                      <span className="truncate text-xs text-slate-700 dark:text-slate-300">{team.name}</span>
                      <input
                        type="number"
                        min="1"
                        className="h-8 w-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-center text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-400"
                        value={pots[team.id] ?? 1}
                        onChange={(event) =>
                          setPots((current) => ({ ...current, [team.id]: Number(event.target.value) }))
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    className="min-h-10 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-5 py-2.5 text-xs font-bold text-slate-900 dark:text-cyan-300 transition hover:bg-cyan-400/[0.13] disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={isDrawing || teams.length < 2}
                    onClick={randomizePots}
                  >
                    Generar bombos al azar
                  </button>

                  <button
                    className="min-h-10 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={isDrawing || teams.length < 2}
                    onClick={() => setIsConfirmingDraw(true)}
                  >
                    {isDrawing ? 'Sorteando…' : 'Sortear grupos'}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-600">
                  Sortear reemplaza los grupos existentes de este torneo.
                </p>
              </div>
            )}

            <ConfirmActionModal
              isOpen={isConfirmingDraw}
              title="¿Sortear los grupos?"
              message="Se reemplazarán los bombos y grupos existentes de este torneo. Si algún grupo ya tiene partidos pendientes, el sorteo no se podrá completar hasta que los resuelvas o canceles."
              confirmLabel="Sí, sortear"
              isLoading={isDrawing}
              onCancel={() => setIsConfirmingDraw(false)}
              onConfirm={runDraw}
            />

            <ConfirmActionModal
              isOpen={isConfirmingReset}
              title="¿Eliminar los bombos?"
              message="Se eliminarán los grupos actuales de este torneo. Solo se puede hacer si ningún partido de esos grupos está pendiente."
              confirmLabel="Sí, eliminar"
              isLoading={isResettingGroups}
              onCancel={() => setIsConfirmingReset(false)}
              onConfirm={resetGroups}
            />

            {potStandings.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">Tabla de posiciones por bombo</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Compara a los equipos que comparten bombo usando lo que ya jugaron en su propio grupo, aunque no se enfrenten directamente entre ellos.
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {potStandings.map(({ pot, standings }) => (
                    <div key={pot}>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Bombo {pot}
                      </h3>
                      <StandingsTable standings={standings} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && groups.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  className="rounded-lg border border-red-400/20 bg-red-400/[0.05] px-3 py-2 text-[11px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-400/[0.1]"
                  type="button"
                  onClick={() => setIsConfirmingReset(true)}
                >
                  Eliminar bombos
                </button>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <div key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.06] px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{group.name}</h3>
                    {isAdmin && (
                      <button
                        className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-700 hover:dark:text-emerald-200"
                        type="button"
                        onClick={() => generateFixtures(group.id)}
                      >
                        Generar fixture
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 px-4 py-3">
                    {group.teams.map(({ team, pot }) => (
                      <span key={team.id} className="rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-100 dark:bg-black/20 px-2.5 py-1 text-[10px] text-slate-700 dark:text-slate-300">
                        {team.name} · bombo {pot}
                      </span>
                    ))}
                  </div>

                  <GroupStandings tournamentId={selectedTournamentId} groupId={group.id} />
                </div>
              ))}

              {groups.length === 0 && (
                <p className="text-sm text-slate-500">Todavía no hay grupos para este torneo.</p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
