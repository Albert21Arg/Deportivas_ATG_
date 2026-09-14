import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api.js';
import {
  EXPIRED_CLASS,
  isLogoHidden,
  isPlayerExpired,
  isTeamExpired,
} from '../utils/team-expiry.js';

function mediaUrl(path) {
  if (!path) return null;

  return path.startsWith('http')
    ? path
    : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;
}

/*
|--------------------------------------------------------------------------
| SILUETA
|--------------------------------------------------------------------------
*/

function PlayerSilhouette() {
  return (
    <svg
      className="h-[65%] w-[65%] text-black/20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4.2" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| FORMA DE LA CARTA
|--------------------------------------------------------------------------
*/

const CARD_CLIP = 'url(#player-card-shape)';

/*
|--------------------------------------------------------------------------
| CALCULAR OVR
|
| Sistema:
|
| Base: 60
|
| Goles:
| +1 por gol
|
| Partidos:
| +1 por cada 5 partidos
|
| Posición:
| 1.º = +5
| 2.º = +3
| 3.º = +2
|
| Disciplina:
| Amarilla = -1
| Azul     = -2
| Roja     = -3
|
| Hasta 80:
| progresión normal.
|
| Después de 80:
| la progresión se hace progresivamente más difícil.
|
|--------------------------------------------------------------------------
*/

function calculateOverall({
  goals = 0,
  yellowCards = 0,
  blueCards = 0,
  redCards = 0,
  matchesPlayed = 0,
  position,
}) {
  const goalsValue = Math.max(
    Number(goals) || 0,
    0
  );

  const yellowValue = Math.max(
    Number(yellowCards) || 0,
    0
  );

  const blueValue = Math.max(
    Number(blueCards) || 0,
    0
  );

  const redValue = Math.max(
    Number(redCards) || 0,
    0
  );

  const matchesValue = Math.max(
    Number(matchesPlayed) || 0,
    0
  );

  /*
  |--------------------------------------------------------------------------
  | BASE
  |--------------------------------------------------------------------------
  */

  let overall = 60;

  /*
  |--------------------------------------------------------------------------
  | GOLES
  |--------------------------------------------------------------------------
  */

  overall += goalsValue;

  /*
  |--------------------------------------------------------------------------
  | PARTIDOS
  |--------------------------------------------------------------------------
  */

  overall += Math.floor(
    matchesValue / 5
  );

  /*
  |--------------------------------------------------------------------------
  | POSICIÓN
  |--------------------------------------------------------------------------
  */

  if (position === 1) {
    overall += 5;
  } else if (position === 2) {
    overall += 3;
  } else if (position === 3) {
    overall += 2;
  }

  /*
  |--------------------------------------------------------------------------
  | DISCIPLINA
  |--------------------------------------------------------------------------
  */

  overall -= yellowValue;
  overall -= blueValue * 2;
  overall -= redValue * 3;

  /*
  |--------------------------------------------------------------------------
  | PROGRESIÓN NORMAL HASTA 80
  |--------------------------------------------------------------------------
  */

  if (overall <= 80) {
    return Math.min(
      Math.max(
        Math.round(overall),
        60
      ),
      99
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DESDE 80 LA PROGRESIÓN ES MÁS DIFÍCIL
  |--------------------------------------------------------------------------
  */

  const extra =
    overall - 80;

  /*
  |--------------------------------------------------------------------------
  | 80 → 83
  |
  | Primeros puntos después de 80.
  |--------------------------------------------------------------------------
  */

  if (extra <= 5) {
    overall =
      80 +
      Math.floor(
        extra * 0.7
      );
  }

  /*
  |--------------------------------------------------------------------------
  | 84 → 85
  |
  | A partir de aquí cuesta más.
  |--------------------------------------------------------------------------
  */

  else if (extra <= 10) {
    overall =
      83 +
      Math.floor(
        (extra - 5) * 0.5
      );
  }

  /*
  |--------------------------------------------------------------------------
  | 86+
  |
  | Muy difícil seguir subiendo.
  |--------------------------------------------------------------------------
  */

  else {
    overall =
      85 +
      Math.floor(
        (extra - 10) * 0.3
      );
  }

  /*
  |--------------------------------------------------------------------------
  | LIMITES
  |--------------------------------------------------------------------------
  */

  return Math.min(
    Math.max(
      Math.round(overall),
      60
    ),
    99
  );
}

/*
|--------------------------------------------------------------------------
| CALCULAR OVR DEL ARQUERO
|
| No hay alineación por partido en este sistema: el arquero asume los
| partidos y goles en contra de todo su equipo (ver getGoalkeepers en el
| backend). El OVR depende solo de esa razón (goles recibidos / partidos),
| no de goles/tarjetas propias:
|
| - 0 goles recibidos en promedio -> 99.
| - 1 gol por partido (un promedio mediocre) -> ~70, no más.
| - Un arquero realmente bueno (~0.3-0.5 goles por partido) sube hasta la
|   franja de 80.
| - De ahí en adelante cuesta cada vez más: solo el que casi no recibe
|   goles se acerca a 99.
|
| Es una raíz cuadrada invertida: al inicio (cerca de 0) cae rápido, así
| que un arquero genuinamente bueno llega rápido a los 80, pero después se
| aplana y hace falta un promedio casi perfecto para seguir subiendo.
|--------------------------------------------------------------------------
*/

function calculateGoalkeeperOverall({
  matchesPlayed = 0,
  goalsConceded = 0,
}) {
  const matchesValue = Math.max(
    Number(matchesPlayed) || 0,
    0
  );

  const concededValue = Math.max(
    Number(goalsConceded) || 0,
    0
  );

  if (matchesValue === 0) {
    return 60;
  }

  const concededPerMatch =
    concededValue / matchesValue;

  const overall =
    99 -
    29 *
      Math.sqrt(
        concededPerMatch
      );

  return Math.min(
    Math.max(
      Math.round(overall),
      60
    ),
    99
  );
}

/*
|--------------------------------------------------------------------------
| COMPONENTE
|--------------------------------------------------------------------------
*/

export default function PlayerCardModal({
  row,
  onClose,
  respectPaymentStatus = false,
  blueCardEnabled = false,
  isGoalkeeper = false,
}) {
  /*
  |--------------------------------------------------------------------------
  | BLOQUEAR SCROLL DEL FONDO
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!row) return;

    const html =
      document.documentElement;

    const body =
      document.body;

    const originalHtmlOverflow =
      html.style.overflow;

    const originalHtmlOverscroll =
      html.style.overscrollBehavior;

    const originalBodyOverflow =
      body.style.overflow;

    const originalBodyTouchAction =
      body.style.touchAction;

    const originalBodyOverscroll =
      body.style.overscrollBehavior;

    const originalBodyPaddingRight =
      body.style.paddingRight;

    const originalBodyPosition =
      body.style.position;

    const originalBodyWidth =
      body.style.width;

    const scrollbarWidth =
      window.innerWidth -
      document.documentElement
        .clientWidth;

    html.style.overflow =
      'hidden';

    html.style.overscrollBehavior =
      'none';

    body.style.overflow =
      'hidden';

    body.style.touchAction =
      'none';

    body.style.overscrollBehavior =
      'none';

    if (scrollbarWidth > 0) {
      body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    body.style.position =
      'relative';

    body.style.width =
      '100%';

    return () => {
      html.style.overflow =
        originalHtmlOverflow;

      html.style.overscrollBehavior =
        originalHtmlOverscroll;

      body.style.overflow =
        originalBodyOverflow;

      body.style.touchAction =
        originalBodyTouchAction;

      body.style.overscrollBehavior =
        originalBodyOverscroll;

      body.style.paddingRight =
        originalBodyPaddingRight;

      body.style.position =
        originalBodyPosition;

      body.style.width =
        originalBodyWidth;
    };
  }, [row]);

  /*
  |--------------------------------------------------------------------------
  | SIN JUGADOR
  |--------------------------------------------------------------------------
  */

  if (!row) {
    return null;
  }

  const {
    player,
    team,
    goals,
    yellowCards,
    redCards,
    blueCards,
    matchesPlayed,
    goalsConceded,
    position,
  } = row;

  /*
  |--------------------------------------------------------------------------
  | ESTADOS
  |--------------------------------------------------------------------------
  */

  const expired =
    respectPaymentStatus &&
    isPlayerExpired(player);

  const photo =
    mediaUrl(player.photo);

  const crestHidden =
    respectPaymentStatus &&
    isLogoHidden(team);

  const crestExpiredClass =
    respectPaymentStatus &&
    isTeamExpired(team)
      ? EXPIRED_CLASS
      : '';

  /*
  |--------------------------------------------------------------------------
  | OVR
  |--------------------------------------------------------------------------
  */

  const overall = isGoalkeeper
    ? calculateGoalkeeperOverall({
        matchesPlayed,
        goalsConceded,
      })
    : calculateOverall({
        goals,
        yellowCards,
        blueCards,
        redCards,
        matchesPlayed,
        position,
      });

  const isLeader =
    position === 1;

  /*
  |--------------------------------------------------------------------------
  | TIPO DE CARTA
  |--------------------------------------------------------------------------
  */

  const cardType =
    isLeader
      ? 'gold'
      : player?.special
        ? 'blue'
        : 'silver';

  /*
  |--------------------------------------------------------------------------
  | ESTADÍSTICAS
  |--------------------------------------------------------------------------
  */

  const stats = isGoalkeeper
    ? [
        {
          label: 'Partidos',
          value: matchesPlayed ?? 0,
          type: 'matches',
        },
        {
          label: 'Recibidos',
          value: goalsConceded ?? 0,
          type: 'conceded',
        },
      ]
    : [
        {
          label: 'Partidos',
          value: matchesPlayed ?? 0,
          type: 'matches',
        },
        {
          label: 'Goles',
          value: goals ?? 0,
          type: 'goals',
        },
        {
          label: 'Amarillas',
          value: yellowCards ?? 0,
          type: 'yellow',
        },
        {
          label: 'Rojas',
          value: redCards ?? 0,
          type: 'red',
        },
      ];

  if (!isGoalkeeper && blueCardEnabled) {
    stats.push({
      label: 'Azules',
      value: blueCards ?? 0,
      type: 'blue',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | TEMAS
  |--------------------------------------------------------------------------
  */

  const CARD_THEMES = {
    silver: {
      outer:
        'from-[#ffffff] via-[#b7c0ca] to-[#26313d]',

      inner:
        'from-[#edf1f5] via-[#b9c2cc] to-[#596572]',

      accent:
        'bg-white/10',

      text:
        'text-[#101722]',

      line:
        'bg-[#111827]/20',

      glowColor:
        'rgba(203,213,225,.30)',

      shine:
        'via-white/50',

      border:
        'border-white/30',
    },

    gold: {
      outer:
        'from-[#fffbd0] via-[#e4b83e] to-[#704500]',

      inner:
        'from-[#fff4a8] via-[#d9aa2e] to-[#855400]',

      accent:
        'bg-yellow-100/10',

      text:
        'text-[#271800]',

      line:
        'bg-[#3d2805]/25',

      glowColor:
        'rgba(255,190,40,.45)',

      shine:
        'via-white/70',

      border:
        'border-yellow-100/30',
    },

    blue: {
      outer:
        'from-[#e0fbff] via-[#22d3ee] to-[#164e63]',

      inner:
        'from-[#cffafe] via-[#0891b2] to-[#172554]',

      accent:
        'bg-cyan-100/10',

      text:
        'text-[#061522]',

      line:
        'bg-[#06202d]/25',

      glowColor:
        'rgba(34,211,238,.48)',

      shine:
        'via-cyan-100/70',

      border:
        'border-cyan-100/30',
    },
  };

  const cardColors =
    CARD_THEMES[cardType];

  /*
  |--------------------------------------------------------------------------
  | SOMBRA DEL OVR
  |--------------------------------------------------------------------------
  */

  const numberShadow =
    cardType === 'gold'
      ? `
          -1px -1px 0 #fff4a8,
           1px -1px 0 #d4af37,
          -1px  1px 0 #d4af37,
           1px  1px 0 #704500,
           0 3px 0 rgba(255,255,255,.30),
           0 5px 8px rgba(80,50,0,.30)
        `
      : cardType === 'blue'
        ? `
            -1px -1px 0 rgba(255,255,255,.75),
             1px -1px 0 rgba(14,116,144,.7),
            -1px  1px 0 rgba(14,116,144,.7),
             1px  1px 0 rgba(7,47,73,.8),
             0 4px 8px rgba(0,50,80,.35)
          `
        : `
            -1px -1px 0 rgba(255,255,255,.9),
             1px -1px 0 rgba(100,116,139,.7),
            -1px  1px 0 rgba(100,116,139,.7),
             1px  1px 0 rgba(15,23,42,.55),
             0 4px 8px rgba(15,23,42,.25)
          `;

  /*
  |--------------------------------------------------------------------------
  | MODAL
  |--------------------------------------------------------------------------
  */

  const modalContent = (
    <div
      className="
        fixed
        inset-0
        z-[2147483647]
        flex
        items-center
        justify-center
        overflow-hidden
        bg-black
        px-3
        py-3
        select-none
        touch-none
        sm:px-6
        sm:py-6
      "
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '100dvh',
        zIndex: 2147483647,

        background:
          'radial-gradient(circle at 50% 35%, #1c2738 0%, #080c13 42%, #020306 78%, #000 100%)',

        isolation: 'isolate',

        pointerEvents: 'auto',

        overscrollBehavior: 'none',

        WebkitOverflowScrolling:
          'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Tarjeta de ${player.name}`}
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
      }}
      onMouseUp={(event) => {
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
      }}
      onTouchStart={(event) => {
        event.stopPropagation();
      }}
      onTouchMove={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchEnd={(event) => {
        event.stopPropagation();
      }}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.stopPropagation();
      }}
    >
      {/* ================================================================
          SVG
      ================================================================ */}

      <svg
        className="
          pointer-events-none
          absolute
          h-0
          w-0
        "
        aria-hidden="true"
      >
        <defs>
          <clipPath
            id="player-card-shape"
            clipPathUnits="objectBoundingBox"
          >
            <path
              d="
                M 0.08,0.075
                C 0.08,0.055
                  0.11,0.052
                  0.14,0.045

                C 0.25,0.015
                  0.37,0
                  0.50,0

                C 0.63,0
                  0.75,0.015
                  0.86,0.045

                C 0.89,0.052
                  0.92,0.055
                  0.92,0.075

                C 0.92,0.105
                  0.94,0.125
                  0.97,0.135

                C 0.99,0.142
                  1,0.155
                  1,0.175

                L 1,0.865

                C 1,0.895
                  0.985,0.920
                  0.955,0.935

                C 0.88,0.970
                  0.76,0.985
                  0.66,0.990

                C 0.59,0.995
                  0.54,0.998
                  0.50,1

                C 0.46,0.998
                  0.41,0.995
                  0.34,0.990

                C 0.24,0.985
                  0.12,0.970
                  0.045,0.935

                C 0.015,0.920
                  0,0.895
                  0,0.865

                L 0,0.175

                C 0,0.155
                  0.01,0.142
                  0.03,0.135

                C 0.06,0.125
                  0.08,0.105
                  0.08,0.075

                Z
              "
            />
          </clipPath>
        </defs>
      </svg>

      {/* ================================================================
          BACKGROUND GLOW
      ================================================================ */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
        "
      >
        <div
          className="
            absolute
            left-1/2
            top-[15%]
            h-[420px]
            w-[420px]
            -translate-x-1/2
            rounded-full
            blur-[120px]
          "
          style={{
            backgroundColor:
              cardColors.glowColor,
          }}
        />

        <div
          className="
            absolute
            bottom-[5%]
            left-[5%]
            h-[300px]
            w-[300px]
            rounded-full
            bg-blue-500/10
            blur-[100px]
          "
        />

        <div
          className="
            absolute
            bottom-[10%]
            right-[5%]
            h-[280px]
            w-[280px]
            rounded-full
            bg-purple-500/10
            blur-[100px]
          "
        />
      </div>

      {/* ================================================================
          GRID
      ================================================================ */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          opacity-[0.05]
        "
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(255,255,255,.8) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,.8) 1px,
              transparent 1px
            )
          `,
          backgroundSize:
            '70px 70px',

          maskImage:
            'linear-gradient(to bottom, transparent, black, transparent)',
        }}
      />

      {/* ================================================================
          CARTA
      ================================================================ */}

      <div
        className="
          relative
          z-20
          h-[min(86dvh,680px)]
          w-auto
          max-w-[92vw]
          aspect-[5/7]
          sm:h-[min(88dvh,680px)]
        "
        style={{
          pointerEvents: 'auto',
          filter:
            'drop-shadow(0 40px 60px rgba(0,0,0,.85))',
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onTouchStart={(event) => {
          event.stopPropagation();
        }}
      >
        {/* ==============================================================
            BOTÓN CERRAR
        ============================================================== */}

        <button
          className="
            absolute
            -right-3
            -top-3
            z-[100]
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-white/20
            bg-black/85
            text-[21px]
            font-light
            leading-none
            text-white
            shadow-2xl
            backdrop-blur-xl
            transition-all
            duration-200
            hover:scale-110
            hover:border-white/40
            hover:bg-white
            hover:text-black
            active:scale-95
          "
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Cerrar tarjeta"
        >
          ×
        </button>

        {/* ==============================================================
            MARCO
        ============================================================== */}

        <div
          className={`
            relative
            h-full
            w-full
            overflow-hidden
            bg-gradient-to-br
            ${cardColors.outer}
            p-[3px]
            ${expired ? 'blur-2xl grayscale pointer-events-none select-none' : ''}
          `}
          style={{
            clipPath: CARD_CLIP,
          }}
        >
          {/* ============================================================
              INTERIOR
          ============================================================ */}

          <div
            className={`
              relative
              flex
              h-full
              w-full
              min-h-0
              flex-col
              overflow-hidden
              bg-gradient-to-br
              ${cardColors.inner}
            `}
            style={{
              clipPath: CARD_CLIP,
            }}
          >
            {/* ========================================================
                TEXTURA
            ======================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                inset-0
                z-30
                opacity-[0.15]
                mix-blend-overlay
              "
              style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    115deg,
                    transparent 0px,
                    transparent 8px,
                    rgba(255,255,255,.4) 9px,
                    transparent 10px,
                    transparent 20px
                  ),
                  repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,.08) 0px,
                    rgba(0,0,0,.08) 1px,
                    transparent 1px,
                    transparent 5px
                  )
                `,
              }}
            />

            {/* ========================================================
                PATRÓN
            ======================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                inset-0
                z-20
                opacity-[0.10]
              "
              style={{
                backgroundImage: `
                  linear-gradient(
                    135deg,
                    rgba(255,255,255,.8) 1px,
                    transparent 1px
                  ),
                  linear-gradient(
                    45deg,
                    rgba(255,255,255,.5) 1px,
                    transparent 1px
                  )
                `,
                backgroundSize:
                  '28px 28px',
              }}
            />

            {/* ========================================================
                HOLOGRAMAS
            ======================================================== */}

            <div
              className={`
                pointer-events-none
                absolute
                -left-[30%]
                top-[-20%]
                z-50
                h-[145%]
                w-[22%]
                rotate-[23deg]
                bg-gradient-to-b
                from-transparent
                ${cardColors.shine}
                to-transparent
                blur-xl
                opacity-60
              `}
            />

            <div
              className="
                pointer-events-none
                absolute
                -right-[25%]
                bottom-[-15%]
                z-50
                h-[130%]
                w-[15%]
                rotate-[23deg]
                bg-gradient-to-b
                from-transparent
                via-white/20
                to-transparent
                blur-2xl
              "
            />

            {/* ========================================================
                BORDES
            ======================================================== */}

            <div
              className={`
                pointer-events-none
                absolute
                inset-[8px]
                z-40
                border
                ${cardColors.border}
              `}
            />

            <div
              className="
                pointer-events-none
                absolute
                inset-[12px]
                z-40
                border
                border-white/15
              "
            />

            {/* ========================================================
                FOTO
            ======================================================== */}

            <div
              className="
                relative
                h-[55%]
                min-h-0
                w-full
                shrink-0
                overflow-hidden
              "
            >
              {photo ? (
                <img
                  className={`
                    absolute
                    inset-0
                    block
                    h-full
                    w-full
                    max-h-full
                    max-w-full
                    object-cover
                    object-top
                  `}
                  src={photo}
                  alt={player.name}
                  draggable="false"
                />
              ) : (
                <div
                  className="
                    flex
                    h-full
                    w-full
                    items-center
                    justify-center
                    bg-gradient-to-b
                    from-white/10
                    to-black/15
                  "
                >
                  <PlayerSilhouette />
                </div>
              )}

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  bg-gradient-to-b
                  from-transparent
                  via-transparent
                  to-black/60
                "
              />

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-x-0
                  bottom-0
                  h-[38%]
                  bg-gradient-to-t
                  from-black/45
                  via-transparent
                  to-transparent
                "
              />
            </div>

            {/* ========================================================
                OVR
            ======================================================== */}

            <div
              className="
                absolute
                left-[9%]
                top-[7%]
                z-50
              "
            >
              <div className="flex flex-col">
                <span
                  className={`
                    text-[4.6rem]
                    font-black
                    leading-[.76]
                    tracking-[-.10em]
                    ${cardColors.text}
                  `}
                  style={{
                    textShadow:
                      numberShadow,
                  }}
                >
                  {overall}
                </span>

                <span
                  className={`
                    mt-2
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[.35em]
                    ${cardColors.text}
                    opacity-60
                  `}
                >
                  RATING
                </span>
              </div>
            </div>

            {/* ========================================================
                ESCUDO
            ======================================================== */}

            <div
              className="
                absolute
                left-[9%]
                top-[20%]
                z-50
              "
            >
              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/50
                  bg-white/15
                  p-2
                  shadow-xl
                  backdrop-blur-md
                "
              >
                {team?.logo &&
                !crestHidden ? (
                  <img
                    className={`
                      block
                      h-full
                      w-full
                      object-contain
                      drop-shadow-[0_4px_6px_rgba(0,0,0,.5)]
                      ${crestExpiredClass}
                    `}
                    src={team.logo}
                    alt=""
                    draggable="false"
                  />
                ) : (
                  <div
                    className={`
                      flex
                      h-full
                      w-full
                      items-center
                      justify-center
                      rounded-full
                      bg-black/10
                      text-[9px]
                      font-black
                      ${cardColors.text}
                      ${crestExpiredClass}
                    `}
                  >
                    {team?.name
                      ?.slice(0, 2)
                      .toUpperCase() ?? ''}
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================
                DORSAL
            ======================================================== */}

            <div
              className="
                absolute
                right-[9%]
                top-[7%]
                z-50
              "
            >
              <div className="flex flex-col items-end">
                <span
                  className={`
                    text-[2.35rem]
                    font-black
                    leading-[.8]
                    tracking-[-.07em]
                    ${cardColors.text}
                  `}
                  style={{
                    textShadow:
                      numberShadow,
                  }}
                >
                  #{player.jerseyNumber ?? '—'}
                </span>

                <span
                  className={`
                    mt-2
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[.25em]
                    ${cardColors.text}
                    opacity-55
                  `}
                >
                  JERSEY
                </span>
              </div>
            </div>

            {/* ========================================================
                BADGE SPECIAL
            ======================================================== */}

            {cardType === 'blue' && (
              <div
                className="
                  absolute
                  right-[8%]
                  top-[20%]
                  z-50
                "
              >
                <div
                  className="
                    rounded-full
                    border
                    border-cyan-100/40
                    bg-cyan-950/25
                    px-3
                    py-1.5
                    shadow-[0_0_20px_rgba(34,211,238,.35)]
                    backdrop-blur-md
                  "
                >
                  <span
                    className="
                      text-[8px]
                      font-black
                      uppercase
                      tracking-[.2em]
                      text-cyan-950
                    "
                  >
                    SPECIAL
                  </span>
                </div>
              </div>
            )}

            {/* ========================================================
                BADGE LÍDER
            ======================================================== */}

            {isLeader && (
              <div
                className="
                  absolute
                  right-[8%]
                  top-[20%]
                  z-50
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-yellow-100/40
                    bg-black/20
                    px-3
                    py-1.5
                    shadow-[0_0_20px_rgba(255,190,40,.35)]
                    backdrop-blur-md
                  "
                >
                  <span
                    className="
                      text-[12px]
                      text-yellow-100
                    "
                  >
                    ★
                  </span>

                  <span
                    className={`
                      text-[8px]
                      font-black
                      uppercase
                      tracking-[.18em]
                      ${cardColors.text}
                    `}
                  >
                    #1 PLAYER
                  </span>
                </div>
              </div>
            )}

            {/* ========================================================
                ZONA INFERIOR
            ======================================================== */}

            <div
              className="
                relative
                z-10
                flex
                min-h-0
                flex-1
                flex-col
                overflow-hidden
                px-[8%]
                pb-[7%]
                pt-2
              "
            >
              <div
                className={`
                  mx-auto
                  h-[3px]
                  w-20
                  shrink-0
                  rounded-full
                  ${cardColors.line}
                `}
              />

              {/* ====================================================
                  EQUIPO + NOMBRE
              ==================================================== */}

              <div
                className="
                  mt-3
                  min-w-0
                  shrink-0
                  text-center
                "
              >
                {team?.name && (
                  <p
                    className={`
                      truncate
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[.28em]
                      ${cardColors.text}
                      opacity-60
                    `}
                    title={team.name}
                  >
                    {team.name}
                  </p>
                )}

                <h2
                  className={`
                    mt-2
                    truncate
                    text-[1.75rem]
                    font-black
                    uppercase
                    leading-[.95]
                    tracking-[-.045em]
                    ${cardColors.text}
                  `}
                  title={player.name}
                >
                  {player.name}
                </h2>
              </div>

              {/* ====================================================
                  DIVISOR
              ==================================================== */}

              <div
                className="
                  my-4
                  flex
                  items-center
                  gap-3
                "
              >
                <span
                  className={`
                    h-[2px]
                    flex-1
                    ${cardColors.line}
                  `}
                />

                <span
                  className={`
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[.3em]
                    ${cardColors.text}
                    opacity-50
                  `}
                >
                  STATS
                </span>

                <span
                  className={`
                    h-[2px]
                    flex-1
                    ${cardColors.line}
                  `}
                />
              </div>

              {/* ====================================================
                  ESTADÍSTICAS
              ==================================================== */}

              <div
                className={`
                  grid
                  ${
                    stats.length === 5
                      ? 'grid-cols-5'
                      : stats.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-4'
                  }
                  gap-1.5
                  sm:gap-2
                  lg:gap-2.5
                `}
              >
                {stats.map((stat) => {
                  const statColor =
                    stat.type === 'yellow'
                      ? 'bg-yellow-400'
                      : stat.type === 'red'
                        ? 'bg-red-500'
                        : stat.type === 'blue'
                          ? 'bg-cyan-400'
                          : cardType === 'blue'
                            ? 'bg-cyan-950/60'
                            : 'bg-black/60';

                  return (
                    <div
                      key={stat.label}
                      className={`
                        flex
                        min-w-0
                        flex-col
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-xl
                        border
                        border-black/10
                        ${cardColors.accent}
                        px-1
                        py-2
                        sm:px-1.5
                        sm:py-3
                        backdrop-blur-sm
                      `}
                    >
                      {/* Indicador */}

                      <div
                        className="
                          mb-1.5
                          flex
                          h-6
                          w-6
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-black/10
                          bg-white/25
                          sm:mb-2
                          sm:h-7
                          sm:w-7
                        "
                      >
                        <span
                          className={`
                            h-2.5
                            w-2.5
                            rounded-full
                            ${statColor}
                            shadow-sm
                            sm:h-3
                            sm:w-3
                          `}
                        />
                      </div>

                      {/* Número */}

                      <span
                        className={`
                          text-[1.15rem]
                          font-black
                          leading-none
                          tracking-[-.04em]
                          sm:text-[1.4rem]
                          lg:text-[1.55rem]
                          ${cardColors.text}
                        `}
                      >
                        {stat.value}
                      </span>

                      {/* Etiqueta */}

                      <span
                        className={`
                          mt-1.5
                          max-w-full
                          truncate
                          text-center
                          text-[6px]
                          font-black
                          uppercase
                          leading-tight
                          tracking-[.08em]
                          ${cardColors.text}
                          opacity-65
                          sm:mt-2
                          sm:text-[7px]
                          sm:tracking-[.12em]
                        `}
                        title={stat.label}
                      >
                        {stat.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ====================================================
                  FOOTER
              ==================================================== */}

              <div
                className="
                  mt-auto
                  flex
                  items-center
                  gap-3
                "
              >
                <span
                  className={`
                    h-[2px]
                    flex-1
                    ${cardColors.line}
                  `}
                />

                <span
                  className={`
                    whitespace-nowrap
                    text-[7px]
                    font-black
                    uppercase
                    tracking-[.35em]
                    ${cardColors.text}
                    opacity-45
                  `}
                >
                  SEASON
                </span>

                <span
                  className={`
                    h-[2px]
                    flex-1
                    ${cardColors.line}
                  `}
                />
              </div>
            </div>

            {/* ========================================================
                BRILLO INFERIOR
            ======================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                bottom-[4%]
                left-[18%]
                right-[18%]
                z-40
                h-[2px]
                rounded-full
                bg-gradient-to-r
                from-transparent
                via-white/70
                to-transparent
              "
            />

            {/* ========================================================
                DETALLES DE ESQUINAS
            ======================================================== */}

            <div
              className={`
                pointer-events-none
                absolute
                bottom-[7%]
                left-[8%]
                z-40
                h-5
                w-5
                border-b
                border-l
                ${cardColors.line}
              `}
            />

            <div
              className={`
                pointer-events-none
                absolute
                bottom-[7%]
                right-[8%]
                z-40
                h-5
                w-5
                border-b
                border-r
                ${cardColors.line}
              `}
            />
          </div>
        </div>
      </div>
    </div>
  );

  /*
  |--------------------------------------------------------------------------
  | PORTAL
  |--------------------------------------------------------------------------
  */

  return createPortal(
    modalContent,
    document.body
  );
}
