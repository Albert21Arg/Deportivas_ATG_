import { EXPIRED_CLASS, isLogoHidden, isTeamExpired } from '../utils/team-expiry.js';

const COLUMNS = [
  ['played', 'PJ'],
  ['yellowCards', '🟨'],
  ['redCards', '🟥'],
  ['blueCards', '🟦'],
  ['wins', 'PG'],
  ['draws', 'PE'],
  ['losses', 'PP'],
  ['goalsFor', 'GF'],
  ['goalsAgainst', 'GC'],
  ['goalDifference', 'DG'],
  ['points', 'PTS'],
];

function TeamCellBody({ row, expired, logoHidden, isLeader, isSecond }) {
  return (
    <>
      <div className="relative shrink-0">
        {row.team.logo && !logoHidden ? (
          <img
            className={`h-10 w-10 object-contain ${expired ? EXPIRED_CLASS : ''}`}
            src={row.team.logo}
            alt={expired ? '' : `Logo de ${row.team.name}`}
          />
        ) : (
          <div
            className={`flex h-10 w-10 items-center justify-center text-[10px] font-semibold ${expired ? EXPIRED_CLASS : ''}`}
            aria-hidden="true"
          >
            {expired ? '' : row.team.name?.slice(0, 2).toUpperCase()}
          </div>
        )}

        {isLeader && !expired && (
          <span
            className="absolute -right-2 -top-3 text-base leading-none drop-shadow-[0_0_6px_rgba(251,191,36,0.75)]"
            title="Primer lugar"
            aria-label="Primer lugar"
          >
            👑
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p
          className={`truncate text-xs font-semibold sm:text-sm ${
            isLeader ? 'text-amber-100' : isSecond ? 'text-slate-200' : 'text-slate-300'
          }`}
          title={row.team.name}
        >
          {row.team.name}
        </p>

        {row.groupName && (
          <p className="truncate text-[10px] text-slate-600">{row.groupName}</p>
        )}
      </div>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Tabla de posiciones reutilizable
|--------------------------------------------------------------------------
| Mismo lenguaje visual que la tabla de todos-contra-todos (corona para el
| líder, medallero para el top 3, DG/PTS resaltados) pero en un solo
| componente compacto, pensado para insertarse varias veces en una página
| (ej. una tabla por bombo).
*/

export default function StandingsTable({ standings, emptyMessage = 'No hay datos disponibles todavía.', respectPaymentStatus = false, onSelectTeam }) {
  if (!standings || standings.length === 0) {
    return <p className="px-3 py-4 text-xs text-slate-600">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-950">
            <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <th className="w-16 px-3 py-3 text-center">Pos</th>
              <th className="px-3 py-3 text-left">Equipo</th>
              {COLUMNS.map(([, label]) => (
                <th className="min-w-[48px] px-2.5 py-3 text-center" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/70">
            {standings.map((row) => {
              const isLeader = row.position === 1;
              const isSecond = row.position === 2;
              const isTopThree = row.position <= 3;
              const expired = respectPaymentStatus && isTeamExpired(row.team);
              const logoHidden = respectPaymentStatus && isLogoHidden(row.team);

              return (
                <tr
                  key={row.team.id}
                  className={`transition-colors duration-150 ${
                    isLeader
                      ? 'border-l-2 border-amber-400 bg-gradient-to-r from-amber-400/[0.12] via-amber-400/[0.045] to-transparent'
                      : isSecond
                        ? 'border-l-2 border-slate-300/40 bg-gradient-to-r from-slate-300/[0.07] via-slate-300/[0.025] to-transparent'
                        : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* POSICIÓN */}
                  <td className="px-3 py-3 text-center">
                    {isTopThree ? (
                      <span
                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
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
                      <span className="text-xs font-semibold text-slate-500">{row.position}</span>
                    )}
                  </td>

                  {/* EQUIPO */}
                  <td className="px-3 py-3">
                    {onSelectTeam ? (
                      <button
                        type="button"
                        onClick={() => onSelectTeam(row)}
                        className="flex w-full items-center gap-2.5 text-left transition hover:opacity-80"
                      >
                        <TeamCellBody row={row} expired={expired} logoHidden={logoHidden} isLeader={isLeader} isSecond={isSecond} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <TeamCellBody row={row} expired={expired} logoHidden={logoHidden} isLeader={isLeader} isSecond={isSecond} />
                      </div>
                    )}
                  </td>

                  {/* ESTADÍSTICAS */}
                  {COLUMNS.map(([key]) => {
                    const isPoints = key === 'points';
                    const isGoalDifference = key === 'goalDifference';
                    // Los goles en contra siempre se ven, incluso con el pago vencido.
                    const distortThisCell = expired && key !== 'goalsAgainst';

                    let valueClass = 'text-slate-400';

                    if (isPoints) {
                      valueClass = isLeader ? 'font-black text-amber-300' : 'font-bold text-emerald-300';
                    } else if (isGoalDifference && row[key] > 0) {
                      valueClass = isLeader ? 'font-semibold text-amber-300' : 'font-semibold text-emerald-400';
                    } else if (isGoalDifference && row[key] < 0) {
                      valueClass = 'font-semibold text-rose-400';
                    }

                    if (distortThisCell) valueClass += ` ${EXPIRED_CLASS}`;

                    return (
                      <td
                        className={`min-w-[48px] whitespace-nowrap px-2.5 py-3 text-center text-xs sm:text-sm ${valueClass}`}
                        key={key}
                      >
                        {isGoalDifference && row[key] > 0 ? `+${row[key]}` : row[key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* LEYENDA */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-800 px-3 py-2.5 text-[10px] text-slate-600">
        <span>
          <strong className="text-slate-500">PJ</strong> Partidos
        </span>
        <span>
          <strong className="text-slate-500">PG</strong> Ganados
        </span>
        <span>
          <strong className="text-slate-500">PE</strong> Empatados
        </span>
        <span>
          <strong className="text-slate-500">PP</strong> Perdidos
        </span>
        <span>
          <strong className="text-slate-500">GF/GC</strong> Goles
        </span>
        <span>
          <strong className="text-slate-500">DG</strong> Diferencia
        </span>
        <span>
          <strong className="text-emerald-400">PTS</strong> Puntos
        </span>
      </div>
    </div>
  );
}
