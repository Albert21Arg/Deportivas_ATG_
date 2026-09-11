import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';
import DashboardNavbar from '../components/DashboardNavbar.jsx';
import ScorersTable from '../components/ScorersTable.jsx';

export default function GoleadoresPage() {
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    searchParams.get('tournamentId') ?? ''
  );
  const [scorers, setScorers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTournamentLocked = Boolean(searchParams.get('tournamentId'));

  const selectedTournament = tournaments.find(
    (tournament) => String(tournament.id) === selectedTournamentId
  );

  useEffect(() => {
    async function loadTournaments() {
      try {
        const { data } = await api.get('/tournaments');

        const loadedTournaments = data.data.tournaments;

        setTournaments(loadedTournaments);

        setSelectedTournamentId((current) =>
          current || String(loadedTournaments[0]?.id ?? '')
        );
      } catch (error) {
        notify(getApiErrorDetails(error));
      }
    }

    loadTournaments();
  }, [notify]);

  useEffect(() => {
    if (!selectedTournamentId) {
      setScorers([]);
      return;
    }

    async function loadScorers() {
      setIsLoading(true);

      try {
        const { data } = await api.get(
          `/tournaments/${selectedTournamentId}/scorers`
        );

        setScorers(data.data.scorers);
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadScorers();
  }, [notify, selectedTournamentId]);

  const tournamentName = selectedTournament?.name || 'Torneo';

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-3 pb-8 pt-20 text-slate-900 dark:bg-[#070b12] dark:text-slate-100 sm:px-5 sm:pb-12 sm:pt-24 lg:px-8 lg:pb-16 lg:pt-28">
      <DashboardNavbar />

      <section className="mx-auto w-full max-w-4xl">
        <Link
          className="group inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-emerald-400 sm:text-sm"
          to="/dashboard"
        >
          <span className="text-base transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>
          Volver al dashboard
        </Link>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-4 shadow-xl shadow-black/15 sm:mt-6 sm:rounded-3xl sm:p-7 md:p-8 lg:p-9">
          <div className="pointer-events-none absolute -right-24 -top-24 hidden h-64 w-64 rounded-full bg-emerald-400/[0.07] blur-3xl sm:block" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300 sm:mb-4 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              Goleadores
            </div>

            <h1 className="max-w-3xl text-[clamp(1.45rem,6vw,3rem)] font-black leading-[1.1] tracking-tight text-white">
              Tabla de goleadores
              <span className="mx-1.5 font-normal text-slate-600 sm:mx-2">|</span>
              <span className="text-slate-300">{tournamentName}</span>
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400 sm:mt-3 sm:text-base sm:leading-6">
              Ranking de goles anotados por jugador en el torneo.
            </p>
          </div>
        </div>

        {!isTournamentLocked && (
          <div className="mt-5 w-full sm:mt-6 sm:max-w-md">
            <label className="block">
              <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
                Seleccionar torneo
              </span>

              <select
                className="min-h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-200 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10 sm:px-4 sm:py-3"
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
            </label>
          </div>
        )}

        <div className="mt-5 sm:mt-6">
          {isLoading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-8 text-center sm:min-h-[280px] sm:rounded-2xl sm:p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400 sm:h-8 sm:w-8" />
              <p className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">Calculando goleadores...</p>
            </div>
          ) : (
            <ScorersTable
              scorers={scorers}
              emptyMessage="Todavía no hay goles registrados en este torneo."
            />
          )}
        </div>
      </section>
    </main>
  );
}
