import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import ConfirmActionModal from '../components/ConfirmActionModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

const STAGE_ORDER = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL', 'THIRD_PLACE'];
const STAGE_LABELS = {
  ROUND_OF_32: 'Dieciseisavos',
  ROUND_OF_16: 'Octavos',
  QUARTER: 'Cuartos',
  SEMI: 'Semifinal',
  FINAL: 'Final',
  THIRD_PLACE: '3.º y 4.º puesto',
};

function TieCard({ tie }) {
  const homeName = tie.homeTeam?.name ?? 'Por definir';
  const awayName = tie.awayTeam?.name ?? 'Por definir';

  function TeamShield({ team }) {
    return team?.logo ? (
      <img
        className="h-8 w-8 shrink-0 rounded-full border border-white/[0.1] bg-slate-950 object-cover p-0.5 sm:h-9 sm:w-9"
        src={team.logo}
        alt={`Escudo de ${team.name}`}
        loading="lazy"
      />
    ) : (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg sm:h-9 sm:w-9" aria-hidden="true">
        🛡️
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a1018]/90 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 truncate text-center font-semibold ${tie.winnerTeam?.id === tie.homeTeamId ? 'text-emerald-300' : 'text-slate-300'}`}>
          <TeamShield team={tie.homeTeam} />
          <span className="truncate">{homeName}</span>
        </span>
        <span className="text-slate-600">vs</span>
        <span className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 truncate text-center font-semibold ${tie.winnerTeam?.id === tie.awayTeamId ? 'text-emerald-300' : 'text-slate-300'}`}>
          <TeamShield team={tie.awayTeam} />
          <span className="truncate">{awayName}</span>
        </span>
      </div>

      {tie.matches.length > 0 && (
        <div className="mt-2 space-y-1">
          {tie.matches.map((match) => (
            <div key={match.id} className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{match.leg ? `Ida/vuelta ${match.leg}` : 'Partido único'} · {match.status}</span>
              <span>
                {match.homeScore ?? '-'} : {match.awayScore ?? '-'}
                {match.homePenaltyScore != null && match.awayPenaltyScore != null && (
                  <span className="ml-1 text-amber-400">
                    P({match.homePenaltyScore}-{match.awayPenaltyScore})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {tie.winnerTeam && (
        <p className="mt-2 text-[10px] font-bold text-emerald-300">Gana {tie.winnerTeam.name}</p>
      )}

      {!tie.winnerTeam && tie.homeTeam && tie.awayTeam && (
        <p className="mt-2 text-[10px] text-slate-600">
          El ganador avanzará automáticamente al finalizar el partido.
        </p>
      )}
    </div>
  );
}

export default function BracketPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(searchParams.get('tournamentId') ?? '');
  const isTournamentLocked = Boolean(searchParams.get('tournamentId'));

  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState([]);
  const [ties, setTies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [size, setSize] = useState(4);
  const [seeds, setSeeds] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    api
      .get('/tournaments')
      .then(({ data }) => {
        setTournaments(data.data.tournaments);
        setSelectedTournamentId((current) => current || String(data.data.tournaments[0]?.id ?? ''));
      })
      .catch((error) => notify(getApiErrorDetails(error)));
  }, [notify]);

  async function loadBracket(tournamentId) {
    setIsLoading(true);
    try {
      const [bracketRes, teamsRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}/bracket`),
        api.get(`/tournaments/${tournamentId}/teams`),
      ]);
      setTies(bracketRes.data.data.ties);
      setTeams(teamsRes.data.data.teams.map((row) => row.team));
      const standingsRes = await api.get(`/tournaments/${tournamentId}/standings`);
      setStandings(standingsRes.data.data.standings);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedTournamentId) return;
    loadBracket(selectedTournamentId);
    setSeeds([]);
  }, [selectedTournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTournament = tournaments.find((tournament) => String(tournament.id) === selectedTournamentId);

  const availableSizes = useMemo(() => {
    const sizes = [2, 4, 8, 16];
    return sizes.filter((value) => value <= teams.length);
  }, [teams]);

  const stages = useMemo(() => {
    const map = new Map();
    for (const tie of ties) {
      if (!map.has(tie.stage)) map.set(tie.stage, []);
      map.get(tie.stage).push(tie);
    }
    return STAGE_ORDER.filter((stage) => map.has(stage)).map((stage) => ({
      stage,
      ties: map.get(stage).sort((a, b) => a.slot - b.slot),
    }));
  }, [ties]);

  async function createBracket() {
    const teamIds = seeds.filter(Boolean).map(Number);
    if (teamIds.length !== Number(size) || new Set(teamIds).size !== teamIds.length) {
      notify({ type: 'error', title: 'Llave incompleta', message: 'Selecciona un equipo distinto para cada posición.' });
      return;
    }

    setIsCreating(true);
    try {
      const { data } = await api.post(`/tournaments/${selectedTournamentId}/bracket`, { teamIds });
      setTies(data.data.ties);
      notify({ type: 'success', title: 'Llave creada', message: 'La llave se generó correctamente.' });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsCreating(false);
    }
  }

  function generateSeeds(mode) {
    if (teams.length < Number(size)) {
      notify({ type: 'error', title: 'Equipos insuficientes', message: 'No hay suficientes equipos para esta llave.' });
      return;
    }

    if (mode === 'POINTS') {
      const rankedTeams = standings
        .map((row) => row.team)
        .filter((team) => teams.some((item) => item.id === team.id));
      setSeeds(rankedTeams.slice(0, Number(size)).map((team) => String(team.id)));
      return;
    }

    if (seeds.length !== Number(size)) {
      notify({
        type: 'error',
        title: 'Selecciona primero los mejores puntajes',
        message: 'El sorteo aleatorio mezclará únicamente los equipos de esa selección.',
      });
      return;
    }

    const shuffled = [...seeds];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    setSeeds(shuffled);
  }

  async function resetBracket() {
    setIsResetting(true);
    try {
      await api.delete(`/tournaments/${selectedTournamentId}/bracket`);
      setTies([]);
      setIsResetConfirmOpen(false);
      notify({ type: 'success', title: 'Llave eliminada', message: 'Puedes crear una nueva llave.' });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">
      <DashboardNavbar />

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-400" to="/dashboard/tournaments">
          ← Volver a torneos
        </Link>

        <h1 className="mt-4 text-2xl font-black tracking-tight text-cyan-500 dark:text-white sm:text-3xl">Llaves de eliminación</h1>
        <p className="mt-1 text-sm text-slate-500">Arma la llave, sigue los resultados y define ganadores en caso de empate.</p>

        {!isTournamentLocked && (
          <select
            className="mt-4 min-h-10 w-full max-w-sm rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2 text-xs font-medium text-slate-300 outline-none focus:border-emerald-400/50"
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

        {selectedTournament && !['KNOCKOUT_SINGLE', 'KNOCKOUT_TWO_LEG'].includes(selectedTournament.mode) && (
          <p className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-xs text-amber-300">
            Este torneo está en modo &quot;{selectedTournament.mode}&quot;, no en eliminación directa ni ida y vuelta.
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 text-sm text-slate-500">Cargando…</p>
        ) : (
          <>
            {isAdmin && ties.length === 0 && (
              <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0a1018]/90 p-4 sm:p-6">
                <h2 className="text-sm font-bold text-cyan-500 dark:text-white">Armar llave</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Elige cuántos equipos participan (potencia de 2) y en qué orden se enfrentan en la primera ronda.
                </p>

                <label className="mt-4 block max-w-[200px] text-xs font-semibold text-slate-400">
                  N.º de equipos
                  <select
                    className="mt-1.5 min-h-10 w-full rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2 text-sm text-cyan-500 outline-none focus:border-emerald-400/50 dark:text-white"
                    value={size}
                    onChange={(event) => {
                      setSize(event.target.value);
                      setSeeds([]);
                    }}
                  >
                    {availableSizes.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    className="min-h-10 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-5 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/[0.13] disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={teams.length < Number(size)}
                    onClick={() => generateSeeds('POINTS')}
                  >
                    Tomar mejores puntajes
                  </button>

                  <button
                    className="min-h-10 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-5 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/[0.13] disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={teams.length < Number(size)}
                    onClick={() => generateSeeds('RANDOM')}
                  >
                    Generar equipos al azar
                  </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: Number(size) }).map((_, index) => (
                    <label key={index} className="block text-xs font-semibold text-slate-400">
                      Posición {index + 1}
                      <select
                        className="mt-1.5 min-h-10 w-full rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2 text-sm text-cyan-500 outline-none focus:border-emerald-400/50 dark:text-white"
                        value={seeds[index] ?? ''}
                        onChange={(event) =>
                          setSeeds((current) => {
                            const next = [...current];
                            next[index] = event.target.value;
                            return next;
                          })
                        }
                      >
                        <option value="">Selecciona un equipo</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <button
                  className="mt-4 min-h-10 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  disabled={isCreating}
                  onClick={createBracket}
                >
                  {isCreating ? 'Creando…' : 'Crear llave'}
                </button>
              </div>
            )}

            {isAdmin && ties.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  className="rounded-lg border border-red-400/20 bg-red-400/[0.05] px-3 py-2 text-[11px] font-semibold text-red-300 hover:bg-red-400/[0.1]"
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                >
                  Eliminar llave y volver a armarla
                </button>
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {stages.map(({ stage, ties: stageTies }) => (
                <div key={stage}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {STAGE_LABELS[stage] ?? stage}
                  </h3>
                  <div className="space-y-2">
                    {stageTies.map((tie) => (
                      <TieCard key={tie.id} tie={tie} />
                    ))}
                  </div>
                </div>
              ))}

              {ties.length === 0 && (
                <p className="text-sm text-slate-500">Todavía no hay una llave para este torneo.</p>
              )}
            </div>
          </>
        )}
      </section>

      <ConfirmActionModal
        isOpen={isResetConfirmOpen}
        title="¿Eliminar la llave?"
        message="Se eliminarán los cruces actuales del torneo y podrás crear una nueva llave."
        confirmLabel="Sí, eliminar"
        isLoading={isResetting}
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={resetBracket}
      />
    </main>
  );
}
