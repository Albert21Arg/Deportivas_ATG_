import { useState } from 'react';
import { EXPIRED_CLASS, isLogoHidden, isTeamExpired, PLAYER_EXPIRED_CLASS } from '../utils/team-expiry.js';
import api from '../services/api.js';
import PlayerCardModal from './PlayerCardModal.jsx';
import TeamLikeButton from './TeamLikeButton.jsx';

const formStyles = {
  G: 'bg-emerald-500 text-slate-950',
  E: 'bg-amber-400 text-slate-950',
  P: 'bg-red-500 text-white',
};

const mediaUrl = (path) =>
  path?.startsWith('http')
    ? path
    : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;

/*
|--------------------------------------------------------------------------
| Logo del equipo
|--------------------------------------------------------------------------
*/

function TeamLogo({ team, size = 'h-9 w-9', className = '' }) {
  const expired = isTeamExpired(team);
  const expiredClass = expired ? EXPIRED_CLASS : '';

  if (!team.logo || isLogoHidden(team)) {
    return (
      <div
        className={`flex ${size} shrink-0 items-center justify-center text-xs text-slate-400 ${className} ${expiredClass}`}
        aria-label={expired ? undefined : `Sin escudo para ${team.name}`}
      >
        ⚽
      </div>
    );
  }

  return (
    <img
      className={`${size} shrink-0 object-contain ${className} ${expiredClass}`}
      src={team.logo}
      alt={expired ? '' : `Escudo de ${team.name}`}
    />
  );
}

/*
|--------------------------------------------------------------------------
| Modal de detalle de equipo
|--------------------------------------------------------------------------
| Mismo contenido que el modal de equipo de la portada (estadísticas,
| últimos resultados y jugadores), reutilizable en cualquier página
| pública que muestre una tabla de posiciones clicable.
*/

export default function TeamDetailModal({ selection, onClose, blueCardEnabled = false }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  if (!selection) return null;

  const { row, recentForm = [] } = selection;
  const isLeader = row.position === 1;

  // Mismas reglas que la tarjeta abierta desde Goleadores: cada jugador del
  // roster ya trae goles/tarjetas/partidos/posición (ver getPlayerStatMaps
  // en el backend), solo hay que armar el shape que espera PlayerCardModal.
  function openPlayerCard(player) {
    setSelectedPlayer({
      player: {
        id: player.id,
        name: player.name,
        photo: player.photo,
        jerseyNumber: player.jerseyNumber,
        paidUntil: player.paidUntil,
        playerExpired: player.playerExpired,
        showName: player.showName,
        fixedOvr: player.fixedOvr,
        likesTotal: player.likesTotal,
        likesOvrBonus: player.likesOvrBonus,
        teamLikeBonus: player.teamLikeBonus,
      },
      team: row.team,
      goals: player.goals,
      yellowCards: player.yellowCards,
      redCards: player.redCards,
      blueCards: player.blueCards,
      matchesPlayed: player.matchesPlayed,
      goalsConceded: player.goalsConceded,
      position: player.position,
      isGoalkeeper: Boolean(player.isGoalkeeper),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex bg-slate-950/90"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="h-[100dvh] w-full overflow-y-auto bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-detail-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Barra fija: la X queda siempre visible aunque se baje por la
            lista de jugadores, para cerrar en cualquier momento. */}
        <div className="sticky top-0 z-10 flex justify-end border-b border-slate-200/70 bg-white/90 px-3 py-2 backdrop-blur dark:border-white/[0.06] dark:bg-slate-900/90 sm:px-4">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        </div>

        <div className="mx-auto max-w-lg px-4 pb-10 pt-4 text-center sm:px-6">
          <div className="relative mx-auto w-fit">
            <TeamLogo team={row.team} size="h-24 w-24 sm:h-28 sm:w-28" />

            {isLeader && (
              <span
                className="absolute -right-2 -top-3 text-xl drop-shadow-[0_0_6px_rgba(251,191,36,0.7)] sm:-right-3 sm:-top-4 sm:text-2xl sm:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                aria-label="Primer lugar"
              >
                👑
              </span>
            )}
          </div>

          <h2
            className={`mt-3 text-xl font-black sm:mt-4 sm:text-2xl ${isLeader ? 'text-amber-600 dark:text-amber-100' : 'text-slate-900 dark:text-white'}`}
            id="team-detail-modal-title"
          >
            {row.team.name}
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Posición #{row.position} · {row.points} puntos
          </p>

          <div className="mt-3 flex justify-center">
            <TeamLikeButton teamId={row.team.id} />
          </div>

          <div className="mt-5 sm:mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Últimos 3 resultados
            </p>

            {recentForm.length ? (
              <div className="mt-3 flex justify-center gap-2">
                {recentForm.map((result, index) => (
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${formStyles[result]}`}
                    key={`${result}-${index}`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500 sm:text-sm">Sin partidos finalizados.</p>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5 text-left dark:border-white/[0.06] sm:mt-7 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">Jugadores</h3>
              <span className="text-xs text-slate-500">{row.players?.length ?? 0} registrados</span>
            </div>

            {row.players?.length ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {row.players.map((player) => (
                  <button
                    type="button"
                    onClick={() => openPlayerCard(player)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-emerald-400/30 hover:bg-slate-100 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-emerald-400/20 dark:hover:bg-white/[0.05]"
                    key={player.id}
                  >
                    {player.photo ? (
                      <img
                        className={`h-10 w-10 shrink-0 rounded-lg object-cover ${player.playerExpired ? PLAYER_EXPIRED_CLASS : ''}`}
                        src={mediaUrl(player.photo)}
                        alt=""
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {player.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold text-slate-700 dark:text-slate-200 ${player.showName === false || player.playerExpired ? PLAYER_EXPIRED_CLASS : ''}`}>{player.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {player.jerseyNumber ? `Dorsal ${player.jerseyNumber}` : 'Jugador'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Este equipo aún no tiene jugadores registrados.</p>
            )}
          </div>
        </div>
      </section>

      <div
        onMouseDown={(event) => event.stopPropagation()}
      >
        <PlayerCardModal
          row={selectedPlayer}
          respectPaymentStatus
          blueCardEnabled={blueCardEnabled}
          isGoalkeeper={Boolean(selectedPlayer?.isGoalkeeper)}
          onClose={() => setSelectedPlayer(null)}
        />
      </div>
    </div>
  );
}
