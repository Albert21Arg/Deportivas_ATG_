import { Fragment } from 'react';

import { EXPIRED_CLASS, isLogoHidden, isTeamExpired } from '../utils/team-expiry.js';

// Etiquetas cortas para el árbol de llaves, al estilo de un gráfico de
// bracket de torneo (16AVOS · 8VOS · 4TOS · SEMI).
const compactStageLabels = {
  ROUND_OF_32: '32avos',
  ROUND_OF_16: '16avos',
  QUARTER: '8vos',
  SEMI: 'Semis',
};

function formatMatchDate(value) {
  if (!value) return 'Fecha pendiente';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function GroupsOverview({ groups = [] }) {
  return (
    <div className="space-y-3">
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-xs text-slate-500">
          Los grupos aún no han sido generados.
        </p>
      ) : (
        groups.map((group) => (
          <article className="rounded-xl border border-cyan-400/10 bg-slate-950/40 p-3" key={group.id}>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-sm font-bold text-white">{group.name}</h3>
              <span className="text-[10px] text-cyan-300">{group.teams.length} equipos</span>
            </div>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {group.teams.map(({ team, pot }) => (
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-2" key={team.id}>
                  <span className="truncate text-xs font-semibold text-slate-300">
                    {team.name}
                  </span>
                  <span className="shrink-0 text-[9px] text-slate-600">Bombo {pot}</span>
                </div>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}

const TIE_HEIGHT = 60; // px — alto de la caja de una llave a partido único
const TWO_LEG_ROW_HEIGHT = 22; // px extra para la fila "Ida/Vuelta" en llaves a doble partido
const TIE_GAP = 32; // px de separación vertical entre llaves en la ronda más externa
const CONNECTOR_WIDTH = 32; // px del "gutter" que conecta una ronda con la siguiente

// Todas las rondas comparten el mismo alto total; centerY reparte cada
// ronda en franjas iguales, así una ronda con menos llaves queda centrada
// justo sobre el punto medio de su pareja en la ronda anterior.
function centerY(index, count, totalHeight) {
  return (totalHeight / count) * (index + 0.5);
}

function TeamCrest({ team, size = 'h-5 w-5' }) {
  const expired = isTeamExpired(team);
  return team?.logo && !isLogoHidden(team) ? (
    <img className={`${size} shrink-0 rounded object-cover ${expired ? EXPIRED_CLASS : ''}`} src={team.logo} alt="" />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded bg-slate-800 text-[8px] font-black text-slate-500 ${expired ? EXPIRED_CLASS : ''}`}
    >
      {expired ? '' : team?.name?.slice(0, 2).toUpperCase() ?? ''}
    </span>
  );
}

function BracketSlot({ team, score, penaltyScore, variant, isFinal }) {
  return (
    <div
      className={`flex h-full items-center gap-1 px-1 text-[10px] font-bold sm:gap-2 sm:px-2.5 sm:text-[11px] ${
        variant === 'winner'
          ? 'bg-emerald-400/[0.08] text-emerald-200'
          : variant === 'loser'
            ? 'text-slate-500 opacity-40 grayscale'
            : 'text-slate-300'
      }`}
    >
      <TeamCrest team={team} size={isFinal ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-4 w-4 sm:h-5 sm:w-5'} />
      <span className="min-w-0 flex-1 truncate">{team?.name ?? 'Por definir'}</span>
      {isFinal && variant === 'winner' && (
        <span className="shrink-0 text-xs" aria-label="Campeón">
          👑
        </span>
      )}
      {score != null && (
        <span className={`shrink-0 font-black ${variant === 'winner' ? 'text-emerald-300' : 'text-slate-500'}`}>
          {score}
          {penaltyScore != null && <span className="ml-0.5 text-amber-400">({penaltyScore})</span>}
        </span>
      )}
    </div>
  );
}

// Calcula el marcador a mostrar (agregado a doble partido, o resultado a
// partido único) y el ganador de una llave a partir de ESE MISMO marcador,
// en vez de confiar ciegamente en tie.winnerTeamId: si un admin corrige el
// resultado de una llave que ya tenía ganador, el backend no recalcula esa
// llave sola (para no descuadrar rondas ya avanzadas), así que winnerTeamId
// puede quedar desactualizado frente al marcador que realmente se ve en
// pantalla — usado tanto por la caja de cada llave como por el "Campeón".
// El JSON público no trae homeTeamId/awayTeamId planos en cada partido
// (solo homeTeam.id/awayTeam.id anidados), a diferencia del objeto de la
// llave que sí los trae planos. Sin este fallback, la comparación con el
// id de la llave siempre daba undefined !== id (falso), lo que arma mal
// el agregado a doble partido en la Vuelta.
function matchHomeId(match) {
  return match.homeTeam?.id ?? match.homeTeamId;
}

function resolveTieOutcome(tie) {
  const matches = tie.matches ?? [];
  const isTwoLeg = matches.length === 2;
  const homeId = tie.homeTeamId ?? tie.homeTeam?.id;
  const awayId = tie.awayTeamId ?? tie.awayTeam?.id;

  let homeScore = null;
  let awayScore = null;
  let homePenaltyScore = null;
  let awayPenaltyScore = null;
  let singleMatch = null;
  let allLegsFinished = false;

  if (isTwoLeg) {
    // El marcador global arranca en 0-0 y solo suma los goles de ambos
    // partidos cuando los DOS ya terminaron (no basta con que hayan
    // iniciado, ya que un partido en curso también tiene marcador 0/0 o
    // parcial); mientras tanto se queda en 0-0 en vez de mostrar una suma
    // a medias.
    allLegsFinished = matches.every((match) => match.status === 'FINISHED');
    homeScore = 0;
    awayScore = 0;

    if (allLegsFinished) {
      for (const match of matches) {
        const legHomeIsTieHome = matchHomeId(match) === homeId;
        homeScore += legHomeIsTieHome ? match.homeScore : match.awayScore;
        awayScore += legHomeIsTieHome ? match.awayScore : match.homeScore;
      }

      const decidingLeg = [...matches].reverse().find(
        (match) => match.homePenaltyScore != null && match.awayPenaltyScore != null
      );

      if (decidingLeg) {
        const legHomeIsTieHome = matchHomeId(decidingLeg) === homeId;
        homePenaltyScore = legHomeIsTieHome ? decidingLeg.homePenaltyScore : decidingLeg.awayPenaltyScore;
        awayPenaltyScore = legHomeIsTieHome ? decidingLeg.awayPenaltyScore : decidingLeg.homePenaltyScore;
      }
    }
  } else {
    singleMatch = matches[matches.length - 1] ?? matches[0] ?? null;
    homeScore = singleMatch?.homeScore ?? null;
    awayScore = singleMatch?.awayScore ?? null;
    homePenaltyScore = singleMatch?.homePenaltyScore ?? null;
    awayPenaltyScore = singleMatch?.awayPenaltyScore ?? null;
    allLegsFinished = singleMatch?.status === 'FINISHED';
  }

  let winnerId = null;
  if (allLegsFinished && homeScore !== awayScore) {
    winnerId = homeScore > awayScore ? homeId : awayId;
  } else if (allLegsFinished && homePenaltyScore != null && awayPenaltyScore != null && homePenaltyScore !== awayPenaltyScore) {
    winnerId = homePenaltyScore > awayPenaltyScore ? homeId : awayId;
  } else {
    winnerId = tie.winnerTeamId ?? tie.winnerTeam?.id ?? null;
  }

  return { isTwoLeg, homeId, awayId, homeScore, awayScore, homePenaltyScore, awayPenaltyScore, singleMatch, winnerId };
}

// A partido único, la llave muestra el resultado de ese partido. A doble
// partido (ida y vuelta), muestra el global (suma de ambos partidos, según
// quién hizo de local en cada uno) en la caja principal, y una fila con
// el resultado y la fecha de cada partido por separado debajo.
function BracketTieBlock({ tie, isFinal = false, onSelectMatch }) {
  const {
    isTwoLeg,
    homeId,
    awayId,
    homeScore,
    awayScore,
    homePenaltyScore,
    awayPenaltyScore,
    singleMatch,
    winnerId,
  } = resolveTieOutcome(tie);

  const hasWinner = Boolean(winnerId);
  const variantFor = (teamId) => (!hasWinner ? 'neutral' : winnerId === teamId ? 'winner' : 'loser');
  const matches = tie.matches ?? [];

  return (
    <div className="flex h-full flex-col gap-1">
      <article
        className={`flex flex-1 flex-col overflow-hidden rounded-lg border bg-[#0a1018] shadow-md shadow-black/20 ${
          hasWinner ? 'border-emerald-400/15' : 'border-white/[0.07]'
        } ${onSelectMatch && singleMatch ? 'cursor-pointer transition hover:border-emerald-400/40' : ''}`}
        role={onSelectMatch && singleMatch ? 'button' : undefined}
        tabIndex={onSelectMatch && singleMatch ? 0 : undefined}
        onClick={() => singleMatch && onSelectMatch?.(singleMatch)}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && singleMatch) {
            event.preventDefault();
            onSelectMatch?.(singleMatch);
          }
        }}
      >
        <div className="flex-1">
          <BracketSlot
            team={tie.homeTeam}
            score={homeScore}
            penaltyScore={homePenaltyScore}
            variant={variantFor(homeId)}
            isFinal={isFinal}
          />
        </div>
        <div className="flex-1 border-t border-white/[0.06]">
          <BracketSlot
            team={tie.awayTeam}
            score={awayScore}
            penaltyScore={awayPenaltyScore}
            variant={variantFor(awayId)}
            isFinal={isFinal}
          />
        </div>
      </article>

      {isTwoLeg && (
        <div className="flex shrink-0 gap-1" style={{ height: TWO_LEG_ROW_HEIGHT }}>
          {matches.map((match, index) => {
            const legHomeIsTieHome = matchHomeId(match) === homeId;
            const played = match.status === 'FINISHED';
            const legHomeScore = legHomeIsTieHome ? match.homeScore : match.awayScore;
            const legAwayScore = legHomeIsTieHome ? match.awayScore : match.homeScore;

            return (
              <button
                className="min-w-0 flex-1 truncate rounded bg-slate-900/80 px-1 text-center text-[8px] font-semibold text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 sm:text-[9px]"
                key={match.id}
                type="button"
                onClick={() => onSelectMatch?.(match)}
                title={formatMatchDate(match.date)}
              >
                {index === 0 ? 'Ida' : 'Vta'} {played ? `${legHomeScore}-${legAwayScore}` : '–'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Dibuja las líneas del bracket entre una ronda y la siguiente: cada pareja
// de llaves se fusiona en una sola línea que entra a la ronda siguiente,
// justo en el punto medio de la pareja (ver centerY). La última ronda antes
// de la Final no tiene pareja: es una única línea recta hacia la Final.
function BracketConnectors({ fromCount, totalHeight, isLastRound, mirrored }) {
  const midX = CONNECTOR_WIDTH / 2;
  const segments = [];

  if (isLastRound) {
    const y = centerY(0, fromCount, totalHeight);
    segments.push(`M0,${y} H${CONNECTOR_WIDTH}`);
  } else {
    for (let pair = 0; pair < fromCount / 2; pair += 1) {
      const topY = centerY(pair * 2, fromCount, totalHeight);
      const bottomY = centerY(pair * 2 + 1, fromCount, totalHeight);
      const midY = (topY + bottomY) / 2;
      segments.push(`M0,${topY} H${midX}`);
      segments.push(`M0,${bottomY} H${midX}`);
      segments.push(`M${midX},${topY} V${bottomY}`);
      segments.push(`M${midX},${midY} H${CONNECTOR_WIDTH}`);
    }
  }

  return (
    // El ancho se controla por CSS (más angosto en móvil) mientras el
    // viewBox se mantiene fijo; preserveAspectRatio="none" comprime solo
    // el eje X, así las líneas siguen alineadas verticalmente con las llaves.
    <svg
      className="w-3.5 shrink-0 text-emerald-400/25 sm:w-8"
      height={totalHeight}
      viewBox={`0 0 ${CONNECTOR_WIDTH} ${totalHeight}`}
      preserveAspectRatio="none"
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {segments.map((d) => (
          <path d={d} key={d} />
        ))}
      </g>
    </svg>
  );
}

function BracketRoundColumn({ round, side, totalHeight, tieHeight, onSelectMatch }) {
  const half = round.ties.length / 2;
  const ties = side === 'left' ? round.ties.slice(0, half) : round.ties.slice(half);
  const label = compactStageLabels[round.stage] ?? round.stage;
  const labelTop = Math.max(0, centerY(0, half, totalHeight) - tieHeight / 2 - 22);

  return (
    <div className="relative w-24 shrink-0 sm:w-[125px]" style={{ height: totalHeight }}>
      <span
        className="absolute inset-x-0 text-center text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"
        style={{ top: labelTop }}
      >
        {label}
      </span>

      {ties.map((tie, index) => (
        <div
          className="absolute inset-x-0"
          key={tie.id}
          style={{ top: centerY(index, half, totalHeight) - tieHeight / 2, height: tieHeight }}
        >
          <BracketTieBlock tie={tie} onSelectMatch={onSelectMatch} />
        </div>
      ))}
    </div>
  );
}

// Un lado completo del árbol (izquierdo o derecho): rondas + gutters con
// líneas conectoras, en el orden correcto para que la ronda más cercana a
// la Final quede pegada al centro y la más externa quede en el borde.
function BracketTreeSide({ rounds, side, totalHeight, tieHeight, onSelectMatch }) {
  const roundIndices = rounds.map((_, index) => index);
  const orderedIndices = side === 'left' ? roundIndices : [...roundIndices].reverse();

  return (
    <div className="flex shrink-0">
      {orderedIndices.map((roundIndex) => {
        const round = rounds[roundIndex];
        const half = round.ties.length / 2;
        const isLastRound = roundIndex === rounds.length - 1;

        const column = (
          <BracketRoundColumn
            round={round}
            side={side}
            totalHeight={totalHeight}
            tieHeight={tieHeight}
            onSelectMatch={onSelectMatch}
          />
        );
        const connectors = (
          <BracketConnectors
            fromCount={half}
            totalHeight={totalHeight}
            isLastRound={isLastRound}
            mirrored={side === 'right'}
          />
        );

        return <Fragment key={round.stage}>{side === 'left' ? <>{column}{connectors}</> : <>{connectors}{column}</>}</Fragment>;
      })}
    </div>
  );
}

const ROUND_ORDER = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER', 'SEMI'];

function isTieDefined(tie) {
  return Boolean(tie?.homeTeamId || tie?.awayTeamId);
}

function BracketOverview({ ties = [], onSelectMatch }) {
  const finalTie = ties.find((tie) => tie.stage === 'FINAL');
  const thirdPlaceTie = ties.find((tie) => tie.stage === 'THIRD_PLACE');
  const leftTies = ties.filter((tie) => tie.stage !== 'FINAL' && tie.stage !== 'THIRD_PLACE');

  const rounds = [...new Set(leftTies.map((tie) => tie.stage))]
    .sort((left, right) => ROUND_ORDER.indexOf(left) - ROUND_ORDER.indexOf(right))
    .map((stage) => ({ stage, ties: leftTies.filter((tie) => tie.stage === stage) }))
    .filter((round) => round.ties.some(isTieDefined));

  const showFinal = isTieDefined(finalTie);
  const finalOutcome = showFinal ? resolveTieOutcome(finalTie) : null;
  const championTeam = finalOutcome?.winnerId
    ? finalOutcome.winnerId === finalOutcome.homeId
      ? finalTie.homeTeam
      : finalTie.awayTeam
    : null;
  const showThirdPlace = isTieDefined(thirdPlaceTie);

  const hasContent = rounds.length > 0 || showFinal || showThirdPlace;

  // A doble partido (ida y vuelta) cada llave necesita espacio extra para
  // mostrar el resultado y la fecha de cada partido por separado, no solo
  // el global.
  const isTwoLegMode = ties.some((tie) => (tie.matches?.length ?? 0) === 2);
  const tieHeight = TIE_HEIGHT + (isTwoLegMode ? TWO_LEG_ROW_HEIGHT + 4 : 0);
  const roundPitch = tieHeight + TIE_GAP;

  const firstRoundHalf = rounds.length > 0 ? rounds[0].ties.length / 2 : 0;
  const totalHeight = Math.max(firstRoundHalf * roundPitch, tieHeight);

  if (!hasContent) {
    return (
      <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-xs text-slate-500">
        Las llaves aún no han sido generadas.
      </p>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#05090e] p-2 sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-emerald-500/[0.08] to-transparent" />

      <div className="scroll-invisible relative overflow-x-auto pb-2">
        <div className="flex min-w-max items-center justify-center">
          {rounds.length > 0 && (
            <BracketTreeSide
              rounds={rounds}
              side="left"
              totalHeight={totalHeight}
              tieHeight={tieHeight}
              onSelectMatch={onSelectMatch}
            />
          )}

          <div className="flex shrink-0 flex-col items-center gap-2 px-1 sm:gap-3 sm:px-4">
            <span className="text-sm font-black uppercase tracking-[0.14em] text-amber-300 sm:text-base">Final</span>

            {showFinal ? (
              <div className="w-[140px] sm:w-[190px]" style={{ height: tieHeight }}>
                <BracketTieBlock tie={finalTie} isFinal onSelectMatch={onSelectMatch} />
              </div>
            ) : (
              <div
                className="flex w-[140px] items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-[10px] text-slate-600 sm:w-[190px]"
                style={{ height: tieHeight }}
              >
                Por definir
              </div>
            )}

            <span className="text-4xl drop-shadow-[0_0_18px_rgba(245,215,138,.3)] sm:text-5xl" aria-hidden="true">
              🏆
            </span>

            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Campeón</p>
              <p className="mt-0.5 text-xs font-black text-amber-200 sm:text-sm">{championTeam?.name ?? 'Por definir'}</p>
            </div>

            {showThirdPlace && (
              <div className="mt-4 w-[130px] sm:w-[170px]">
                <p className="mb-1.5 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  3.º y 4.º puesto
                </p>
                <div style={{ height: tieHeight }}>
                  <BracketTieBlock tie={thirdPlaceTie} onSelectMatch={onSelectMatch} />
                </div>
              </div>
            )}
          </div>

          {rounds.length > 0 && (
            <BracketTreeSide
              rounds={rounds}
              side="right"
              totalHeight={totalHeight}
              tieHeight={tieHeight}
              onSelectMatch={onSelectMatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompetitionOverview({ mode, groups, ties, onSelectMatch }) {
  if (mode === 'GROUP_STAGE') {
    return <GroupsOverview groups={groups} />;
  }

  if (mode === 'KNOCKOUT_SINGLE' || mode === 'KNOCKOUT_TWO_LEG') {
    return <BracketOverview ties={ties} onSelectMatch={onSelectMatch} />;
  }

  return null;
}
