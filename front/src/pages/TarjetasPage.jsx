import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import ConfirmActionModal from '../components/ConfirmActionModal.jsx';
import DashboardNavbar from '../components/DashboardNavbar.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

/*
|--------------------------------------------------------------------------
| Multas por tarjetas
|--------------------------------------------------------------------------
| Vista admin, por equipo, de los jugadores con tarjetas pendientes de
| pagar. Es una multa aparte del pago individual del jugador (el que
| controla si su foto sale en público): se paga por haber recibido
| tarjetas, no por la foto. Cada tipo de tarjeta se paga por separado
| (pagar las amarillas no cubre rojas ni azules); al marcar un tipo como
| pagado desaparece de "pendientes", pero si más adelante recibe una
| tarjeta nueva de ese tipo, vuelve a aparecer (se compara contra el total
| real, no es un simple sí/no fijo).
*/

const CARD_META = {
  YELLOW_CARD: { label: 'Amarilla', plural: 'amarillas', emoji: '🟨', badgeClass: 'bg-amber-400/10 text-amber-300' },
  BLUE_CARD: { label: 'Azul', plural: 'azules', emoji: '🟦', badgeClass: 'bg-blue-400/10 text-blue-300' },
  RED_CARD: { label: 'Roja', plural: 'rojas', emoji: '🟥', badgeClass: 'bg-red-400/10 text-red-300' },
};

export default function TarjetasPage() {
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    searchParams.get('tournamentId') ?? ''
  );
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPaidOnly, setShowPaidOnly] = useState(false);

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

  const loadCardFines = useCallback(async () => {
    if (!selectedTournamentId) {
      setTeams([]);
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.get(
        `/tournaments/${selectedTournamentId}/card-fines`
      );

      setTeams(data.data.teams);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsLoading(false);
    }
  }, [notify, selectedTournamentId]);

  useEffect(() => {
    loadCardFines();
  }, [loadCardFines]);

  async function confirmAction() {
    if (!pendingAction) return;

    const { player, fine } = pendingAction;
    setIsSaving(true);

    try {
      await api.patch(
        `/tournaments/${selectedTournamentId}/card-fines/${player.id}`,
        { cardType: fine.type, paid: !fine.finePaid }
      );

      const cardLabel = CARD_META[fine.type].label.toLowerCase();

      notify({
        type: 'success',
        title: fine.finePaid ? 'Pago revertido' : 'Pago confirmado',
        message: fine.finePaid
          ? `La ${cardLabel} de ${player.name} vuelve a aparecer como pendiente.`
          : `${player.name} queda al día con su tarjeta ${cardLabel}.`,
      });

      setPendingAction(null);
      await loadCardFines();
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  const tournamentName = selectedTournament?.name || 'Torneo';

  const visibleTeams = teams
    .map((entry) => ({
      ...entry,
      players: entry.players
        .map((row) => ({
          ...row,
          fines: row.fines.filter((fine) => showPaidOnly || !fine.finePaid),
        }))
        .filter((row) => row.fines.length > 0),
    }))
    .filter((entry) => entry.players.length > 0);

  const pendingCount = teams.reduce(
    (total, entry) =>
      total + entry.players.reduce((count, row) => count + row.fines.filter((fine) => !fine.finePaid).length, 0),
    0
  );

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

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-4 shadow-xl shadow-black/15 sm:mt-6 sm:rounded-3xl sm:p-7 md:p-8 lg:p-9">
          <div className="pointer-events-none absolute -right-24 -top-24 hidden h-64 w-64 rounded-full bg-amber-400/[0.07] blur-3xl sm:block" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300 sm:mb-4 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
              Multas por tarjetas
            </div>

            <h1 className="max-w-3xl text-[clamp(1.45rem,6vw,3rem)] font-black leading-[1.1] tracking-tight text-white">
              Tarjetas pendientes de pago
              <span className="mx-1.5 font-normal text-slate-600 sm:mx-2">|</span>
              <span className="text-slate-300">{tournamentName}</span>
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400 sm:mt-3 sm:text-base sm:leading-6">
              Por equipo, quién tiene amarillas, azules o rojas sin pagar. Es una multa aparte del pago de la foto del jugador.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-end sm:justify-between">
          {!isTournamentLocked && (
            <div className="w-full sm:max-w-md">
              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
                  Seleccionar torneo
                </span>

                <select
                  className="min-h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-200 outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 sm:px-4 sm:py-3"
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

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 sm:text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-amber-400"
              checked={showPaidOnly}
              onChange={(event) => setShowPaidOnly(event.target.checked)}
            />
            Mostrar también los que ya pagaron
          </label>
        </div>

        <div className="mt-5 sm:mt-6">
          {isLoading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-8 text-center sm:min-h-[280px] sm:rounded-2xl sm:p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400 sm:h-8 sm:w-8" />
              <p className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">Buscando tarjetas...</p>
            </div>
          ) : visibleTeams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-14 text-center sm:rounded-2xl">
              <p className="text-sm font-bold text-slate-300">
                {pendingCount === 0
                  ? 'Ningún jugador tiene tarjetas pendientes de pagar.'
                  : 'No hay jugadores con tarjetas todavía.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleTeams.map((entry) => (
                <div
                  key={entry.team.id}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10"
                >
                  <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-200">{entry.team.name}</h2>
                  </div>

                  <ul className="divide-y divide-slate-800/70">
                    {entry.players.map((row) => (
                      <li key={row.player.id} className="px-4 py-3.5">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {row.player.name}
                          {row.player.jerseyNumber && (
                            <span className="ml-1.5 text-xs font-medium text-slate-500">
                              #{row.player.jerseyNumber}
                            </span>
                          )}
                        </p>

                        <div className="mt-2 space-y-1.5">
                          {row.fines.map((fine) => {
                            const meta = CARD_META[fine.type];

                            return (
                              <div
                                key={fine.type}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                  <span className={`rounded-full px-2 py-0.5 ${meta.badgeClass}`}>
                                    {meta.emoji} {meta.label} × {fine.count}
                                  </span>

                                  <span
                                    className={`rounded-full px-2 py-0.5 ${
                                      fine.finePaid
                                        ? 'bg-emerald-400/10 text-emerald-300'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {fine.finePaid
                                      ? 'Pagado'
                                      : `Pendiente: ${fine.pendingCount} de ${fine.count}`}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold transition sm:text-sm ${
                                    fine.finePaid
                                      ? 'border-slate-700 bg-slate-950/40 text-slate-400 hover:border-amber-400/30 hover:bg-amber-400/[0.06] hover:text-amber-300'
                                      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:border-emerald-400/50 hover:bg-emerald-400/[0.16]'
                                  }`}
                                  onClick={() => setPendingAction({ player: row.player, fine })}
                                >
                                  {fine.finePaid ? 'Revertir pago' : 'Marcar como pagado'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmActionModal
        isOpen={Boolean(pendingAction)}
        title={
          pendingAction?.fine.finePaid
            ? '¿Revertir el pago de la multa?'
            : '¿Confirmar el pago de la multa?'
        }
        message={
          pendingAction
            ? (() => {
                const { player, fine } = pendingAction;
                const meta = CARD_META[fine.type];
                const cardWord =
                  fine.count === 1
                    ? `tarjeta ${meta.label.toLowerCase()}`
                    : `tarjetas ${meta.plural}`;

                return fine.finePaid
                  ? `"${player.name}" volverá a aparecer como pendiente por sus ${fine.count} ${cardWord}.`
                  : `Confirmas que "${player.name}" ya pagó la multa por sus ${fine.count} ${cardWord} en este torneo.`;
              })()
            : ''
        }
        confirmLabel={pendingAction?.fine.finePaid ? 'Sí, revertir' : 'Sí, ya pagó'}
        isLoading={isSaving}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </main>
  );
}
