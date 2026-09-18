import { useState } from 'react';

import api from '../services/api.js';
import { PLAYER_EXPIRED_CLASS, isPlayerExpired } from '../utils/team-expiry.js';
import PlayerCardModal from './PlayerCardModal.jsx';

function mediaUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;
}

function GoalkeeperCellBody({ row, photo, expired, nameHidden, isLeader, isSecond }) {
  return (
    <>
      <div className="relative shrink-0">
        {photo ? (
          <img
            className={`h-7 w-7 rounded-lg object-cover sm:h-8 sm:w-8 ${
              expired ? PLAYER_EXPIRED_CLASS : ''
            } ${
              isLeader
                ? 'ring-2 ring-amber-400/50 shadow-[0_0_18px_rgba(251,191,36,0.2)]'
                : isSecond
                  ? 'ring-2 ring-slate-300/30'
                  : 'ring-1 ring-white/5'
            }`}
            src={photo}
            alt={`Foto de ${row.player.name}`}
          />
        ) : (
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold dark:bg-slate-800 sm:h-8 sm:w-8 ${
              expired ? PLAYER_EXPIRED_CLASS : ''
            } ${
              isLeader
                ? 'ring-2 ring-amber-400/40'
                : isSecond
                  ? 'ring-2 ring-slate-300/30'
                  : ''
            }`}
            aria-hidden="true"
          >
            {row.player.name?.slice(0, 2).toUpperCase()}
          </div>
        )}

        {isLeader && (
          <span
            className="absolute -right-2 -top-3 text-base leading-none drop-shadow-[0_0_6px_rgba(251,191,36,0.75)]"
            title="Valla menos vencida"
            aria-label="Valla menos vencida"
          >
            🧤
          </span>
        )}
      </div>

      <div className="min-w-0">
        <span
          className={`block max-w-full truncate text-xs font-semibold sm:text-sm ${
            isLeader
              ? 'text-amber-600 dark:text-amber-100'
              : isSecond
                ? 'text-slate-700 dark:text-slate-200'
                : 'text-slate-700 dark:text-slate-300'
          } ${nameHidden ? PLAYER_EXPIRED_CLASS : ''}`}
          title={row.player.name}
        >
          {row.player.name}
        </span>

        {row.team && (
          <p className="truncate text-[10px] text-slate-600">
            {row.team.name}
          </p>
        )}
      </div>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Valla menos vencida
|--------------------------------------------------------------------------
| Ranking de arqueros designados por menos goles recibidos
| (no hay alineación por partido: el arquero asume partidos/goles en
| contra de todo su equipo). Al hacer clic en el nombre se abre su
| tarjeta, con el mismo estilo que la de goleador pero con el OVR
| calculado por esa razón goles-recibidos/partidos.
*/

export default function GoalkeepersTable({
  goalkeepers,
  emptyMessage = 'Todavía no hay un arquero con partidos jugados.',
  respectPaymentStatus = false,
}) {
  const [selectedRow, setSelectedRow] = useState(null);

  if (!goalkeepers || goalkeepers.length === 0) {
    return <p className="px-3 py-4 text-xs text-slate-600">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <th className="w-10 px-1.5 py-3 text-center sm:w-16 sm:px-3">Pos</th>
              <th className="px-2 py-3 text-left sm:px-3">Arquero</th>
              <th className="w-14 px-1.5 py-3 text-center sm:w-16 sm:px-3">PJ</th>
              <th className="w-14 px-1.5 py-3 text-center sm:w-20 sm:px-3">Recibidos</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {goalkeepers.map((row) => {
              const isLeader = row.position === 1;
              const isSecond = row.position === 2;
              const isTopThree = row.position <= 3;

              const expired =
                respectPaymentStatus && isPlayerExpired(row.player);

              const nameHidden =
                respectPaymentStatus &&
                (row.player.showName === false || expired);

              const photo = mediaUrl(row.player.photo);

              return (
                <tr
                  key={row.player.id}
                  className={`transition-colors duration-150 ${
                    isLeader
                      ? 'border-l-2 border-amber-400 bg-gradient-to-r from-amber-400/[0.12] via-amber-400/[0.045] to-transparent'
                      : isSecond
                        ? 'border-l-2 border-slate-300/40 bg-gradient-to-r from-slate-300/[0.07] via-slate-300/[0.025] to-transparent'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* POSICIÓN */}
                  <td className="px-1.5 py-3 text-center sm:px-3">
                    {isTopThree ? (
                      <span
                        className={`mx-auto flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold sm:h-7 sm:w-7 ${
                          row.position === 1
                            ? 'bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                            : row.position === 2
                              ? 'bg-slate-300 text-slate-900'
                              : 'bg-orange-400 text-slate-950'
                        }`}
                      >
                        {row.position}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        {row.position}
                      </span>
                    )}
                  </td>

                  {/* ARQUERO */}
                  <td className="px-2 py-3 sm:px-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRow(row)}
                      className="flex w-full items-center gap-2 text-left transition hover:opacity-80 sm:gap-2.5"
                    >
                      <GoalkeeperCellBody
                        row={row}
                        photo={photo}
                        expired={expired}
                        nameHidden={nameHidden}
                        isLeader={isLeader}
                        isSecond={isSecond}
                      />
                    </button>
                  </td>

                  {/* PARTIDOS */}
                  <td className="px-1.5 py-3 text-center text-sm text-slate-500 dark:text-slate-400 sm:px-3">
                    {row.matchesPlayed}
                  </td>

                  {/* GOLES RECIBIDOS */}
                  <td
                    className={`px-1.5 py-3 text-center text-sm sm:px-3 ${
                      isLeader
                        ? 'font-black text-amber-600 dark:text-amber-300'
                        : 'font-bold text-emerald-600 dark:text-emerald-300'
                    }`}
                  >
                    {row.goalsConceded}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PlayerCardModal
        row={selectedRow}
        respectPaymentStatus={respectPaymentStatus}
        isGoalkeeper
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}
