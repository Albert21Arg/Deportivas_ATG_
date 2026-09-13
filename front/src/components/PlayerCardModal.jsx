import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api.js';
import {
  EXPIRED_CLASS,
  isLogoHidden,
  isPlayerExpired,
  isTeamExpired,
  PLAYER_EXPIRED_CLASS,
} from '../utils/team-expiry.js';

function mediaUrl(path) {
  if (!path) return null;

  return path.startsWith('http')
    ? path
    : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;
}

/*
|--------------------------------------------------------------------------
| Silueta cuando no se puede mostrar la foto
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
| FORMA ORIGINAL DE LA CARTA
|--------------------------------------------------------------------------
*/

const CARD_CLIP = 'url(#player-card-shape)';

/*
|--------------------------------------------------------------------------
| CALCULAR VALORACIÓN
|--------------------------------------------------------------------------
*/

function calculateOverall({
  goals = 0,
  yellowCards = 0,
  blueCards = 0,
  redCards = 0,
  position,
}) {
  const goalValue = Math.max(Number(goals) || 0, 0);
  const yellowValue = Math.max(Number(yellowCards) || 0, 0);
  const blueValue = Math.max(Number(blueCards) || 0, 0);
  const redValue = Math.max(Number(redCards) || 0, 0);

  let overall = 55;

  // Goles
  overall += goalValue;

  // Posición
  if (position === 1) {
    overall += 8;
  } else if (position === 2) {
    overall += 5;
  } else if (position === 3) {
    overall += 3;
  }

  // Tarjetas
  overall -= yellowValue * 2;
  overall -= blueValue * 4;
  overall -= redValue * 6;

  return Math.min(
    Math.max(Math.round(overall), 55),
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
}) {
  /*
  |--------------------------------------------------------------------------
  | BLOQUEAR COMPLETAMENTE EL SCROLL DEL FONDO
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!row) return;

    const html = document.documentElement;
    const body = document.body;

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
      document.documentElement.clientWidth;

    /*
    |--------------------------------------------------------------------------
    | BLOQUEAR SCROLL
    |--------------------------------------------------------------------------
    */

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    body.style.overscrollBehavior = 'none';

    /*
    |--------------------------------------------------------------------------
    | EVITAR SALTO POR DESAPARICIÓN DEL SCROLLBAR
    |--------------------------------------------------------------------------
    */

    if (scrollbarWidth > 0) {
      body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    body.style.position = 'relative';
    body.style.width = '100%';

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
  | SI NO HAY JUGADOR
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
  | VALORACIÓN
  |--------------------------------------------------------------------------
  */

  const overall = calculateOverall({
    goals,
    yellowCards,
    blueCards,
    redCards,
    position,
  });

  const isLeader =
    position === 1;

  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const stats = [
    {
      label: 'Goles',
      value: goals ?? 0,
      icon: '⚽',
    },
    {
      label: 'Amarillas',
      value: yellowCards ?? 0,
      icon: '🟨',
    },
    {
      label: 'Rojas',
      value: redCards ?? 0,
      icon: '🟥',
    },
  ];

  if (blueCardEnabled) {
    stats.push({
      label: 'Azules',
      value: blueCards ?? 0,
      icon: '🟦',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | COLORES
  |--------------------------------------------------------------------------
  */

  const cardColors = isLeader
    ? {
        outer:
          'from-yellow-100 via-amber-400 to-orange-700',
        inner:
          'from-amber-100 via-yellow-300 to-amber-500',
        glow:
          'bg-amber-400/20',
        accent:
          'text-amber-950',
      }
    : {
        outer:
          'from-slate-100 via-slate-400 to-slate-700',
        inner:
          'from-slate-100 via-slate-300 to-slate-500',
        glow:
          'bg-slate-300/15',
        accent:
          'text-slate-950',
      };

  /*
  |--------------------------------------------------------------------------
  | BORDE DORADO PARA VALOR Y DORSAL
  |--------------------------------------------------------------------------
  */

  const goldNumberShadow = `
    -1px -1px 0 #fff3a3,
     1px -1px 0 #d4af37,
    -1px  1px 0 #d4af37,
     1px  1px 0 #8a5a00,
     0 2px 0 rgba(255,255,255,.35),
     0 3px 5px rgba(80,50,0,.30)
  `;

  /*
  |--------------------------------------------------------------------------
  | CONTENIDO DEL MODAL
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
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,

        width: '100vw',
        height: '100dvh',
        minHeight: '100dvh',

        zIndex: 2147483647,

        backgroundColor:
          'rgba(0, 0, 0, 0.96)',

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
        /*
        |--------------------------------------------------------------------------
        | CERRAR SOLO AL HACER CLICK EN EL FONDO
        |--------------------------------------------------------------------------
        */

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
          FONDO NEGRO ABSOLUTO
      ================================================================ */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          bg-black
        "
        style={{
          opacity: 0.96,
        }}
      />

      {/* ================================================================
          BLUR DEL FONDO
      ================================================================ */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-0
          bg-black/30
          backdrop-blur-[25px]
          backdrop-saturate-0
        "
      />

      {/* ================================================================
          FORMA ORIGINAL
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
          GLOW
      ================================================================ */}

      <div
        className={`
          pointer-events-none
          absolute
          z-0
          h-[460px]
          w-[340px]
          rounded-full
          blur-[110px]
          ${cardColors.glow}
        `}
      />

      {/* ================================================================
          CARTA
      ================================================================ */}

      <div
        className="
          relative
          z-20
          h-[420px]
          w-[300px]
          max-h-[calc(100dvh-24px)]
          aspect-[5/7]

          sm:h-[490px]
          sm:w-[350px]
          sm:max-h-[calc(100dvh-48px)]

          lg:h-[680.4px]
          lg:w-[486px]
          lg:max-h-[calc(100dvh-64px)]
          lg:max-w-[486px]
        "
        style={{
          aspectRatio: '5 / 7',
          pointerEvents: 'auto',
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
            z-[50]
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-white/10
            bg-slate-900/95
            text-xl
            font-light
            text-slate-300
            shadow-2xl
            shadow-black/70
            transition-all
            duration-300
            hover:scale-105
            hover:border-white/20
            hover:bg-slate-800
            hover:text-white
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
            MARCO METÁLICO
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
            shadow-[0_35px_100px_rgba(0,0,0,0.95)]
          `}
          style={{
            clipPath: CARD_CLIP,
          }}
        >
          {/* ============================================================
              CARTA INTERIOR
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
                opacity-[0.14]
                mix-blend-overlay
              "
              style={{
                backgroundImage: `
                  linear-gradient(
                    135deg,
                    transparent 0%,
                    rgba(255,255,255,.8) 45%,
                    transparent 46%
                  ),
                  repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,.08) 0px,
                    rgba(0,0,0,.08) 1px,
                    transparent 1px,
                    transparent 4px
                  )
                `,
                backgroundSize:
                  '160% 160%, 100% 100%',
              }}
            />

            {/* ========================================================
                PATRÓN GEOMÉTRICO
            ======================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                inset-0
                z-20
                opacity-[0.12]
              "
              style={{
                backgroundImage:
                  'linear-gradient(135deg, rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(45deg, rgba(255,255,255,.5) 1px, transparent 1px)',
                backgroundSize:
                  '26px 26px',
              }}
            />

            {/* ========================================================
                BRILLO
            ======================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                -right-28
                top-24
                z-30
                h-[420px]
                w-28
                rotate-[28deg]
                bg-white/30
                blur-2xl
              "
            />

            {/* ========================================================
                BORDE INTERIOR
            ======================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                inset-[8px]
                z-40
                border
                border-black/15
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
                    ${expired ? PLAYER_EXPIRED_CLASS : ''}
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
                    to-black/10
                  "
                >
                  <PlayerSilhouette />
                </div>
              )}

              {/* ======================================================
                  DEGRADADO
              ====================================================== */}

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-x-0
                  bottom-0
                  h-36
                  bg-gradient-to-t
                  from-black/25
                  via-transparent
                  to-transparent
                "
              />

              {/* ======================================================
                  OVR / VALOR
              ====================================================== */}

              <div
                className="
                  absolute
                  left-7
                  top-6
                  z-10
                "
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`
                      text-[3.25rem]
                      font-black
                      leading-[0.8]
                      tracking-[-0.09em]
                      ${cardColors.accent}
                    `}
                    style={{
                      textShadow:
                        goldNumberShadow,
                    }}
                  >
                    {overall}
                  </span>

                  <span
                    className={`
                      mt-1
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.22em]
                      ${cardColors.accent}
                      opacity-70
                    `}
                  >
                    VALOR
                  </span>

                  <div
                    className="
                      mt-1
                      h-px
                      w-9
                      bg-slate-950/25
                    "
                  />
                </div>
              </div>

              {/* ======================================================
                  ESCUDO
              ====================================================== */}

              <div
                className="
                  absolute
                  left-[85px]
                  top-6
                  z-10
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/40
                    bg-white/20
                    p-1.5
                    shadow-xl
                    backdrop-blur-md
                  "
                >
                  {team?.logo && !crestHidden ? (
                    <img
                      className={`
                        block
                        h-full
                        w-full
                        object-contain
                        drop-shadow-lg
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
                        text-slate-800
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

              {/* ======================================================
                  DORSAL
              ====================================================== */}

              <div
                className="
                  absolute
                  right-7
                  top-7
                  z-10
                "
              >
                <span
                  className={`
                    text-[2rem]
                    font-black
                    leading-none
                    ${cardColors.accent}
                  `}
                  style={{
                    textShadow:
                      goldNumberShadow,
                  }}
                >
                  #{player.jerseyNumber ?? '—'}
                </span>
              </div>

              {/* ======================================================
                  LÍDER
              ====================================================== */}

              {isLeader && (
                <div
                  className="
                    absolute
                    right-4
                    top-[78px]
                    z-20
                  "
                >
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/50
                      bg-gradient-to-br
                      from-yellow-200
                      via-amber-400
                      to-orange-500
                      text-lg
                      shadow-[0_8px_25px_rgba(120,53,15,.4)]
                    "
                  >
                    👑
                  </div>
                </div>
              )}
            </div>

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
                px-4
                pb-8
                pt-1
              "
            >
              {/* Línea decorativa */}

              <div
                className="
                  mx-auto
                  h-[3px]
                  w-20
                  shrink-0
                  rounded-full
                  bg-gradient-to-r
                  from-transparent
                  via-slate-950/40
                  to-transparent
                "
              />

              {/* ======================================================
                  NOMBRE
              ====================================================== */}

              <div
                className="
                  mt-2
                  min-w-0
                  shrink-0
                  text-center
                "
              >
                <h2
                  className={`
                    truncate
                    text-[1.18rem]
                    font-black
                    uppercase
                    leading-none
                    tracking-[-0.03em]
                    ${cardColors.accent}
                  `}
                  title={player.name}
                >
                  {player.name}
                </h2>

                {team?.name && (
                  <p
                    className={`
                      mt-1
                      truncate
                      text-[7px]
                      font-black
                      uppercase
                      tracking-[0.2em]
                      ${cardColors.accent}
                      opacity-55
                    `}
                    title={team.name}
                  >
                    {team.name}
                  </p>
                )}
              </div>

              {/* ======================================================
                  STATS
              ====================================================== */}

              <div
                className="
                  mt-3
                  min-h-0
                  flex-1
                  overflow-hidden
                "
              >
                <div
                  className="
                    grid
                    grid-cols-2
                    gap-x-3
                    gap-y-1.5
                  "
                >
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="
                        flex
                        min-w-0
                        items-center
                        justify-between
                        border-b
                        border-slate-950/10
                        py-1.5
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          items-center
                          gap-1.5
                        "
                      >
                        <span
                          className="
                            shrink-0
                            text-[9px]
                          "
                        >
                          {stat.icon}
                        </span>

                        <span
                          className={`
                            truncate
                            text-[8px]
                            font-black
                            uppercase
                            tracking-wide
                            ${cardColors.accent}
                            opacity-65
                          `}
                        >
                          {stat.label}
                        </span>
                      </div>

                      <span
                        className={`
                          ml-2
                          shrink-0
                          text-[1.05rem]
                          font-black
                          leading-none
                          ${cardColors.accent}
                        `}
                      >
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ======================================================
                  FOOTER
              ====================================================== */}

              <div
                className="
                  mt-auto
                  shrink-0
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      h-px
                      flex-1
                      bg-slate-950/15
                    "
                  />

                  <span
                    className={`
                      text-[6px]
                      font-black
                      uppercase
                      tracking-[0.25em]
                      ${cardColors.accent}
                      opacity-45
                    `}
                  >
                    Player Card
                  </span>

                  <span
                    className="
                      h-px
                      flex-1
                      bg-slate-950/15
                    "
                  />
                </div>
              </div>
            </div>

            {/* ========================================================
                BRILLO INFERIOR
            ======================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                bottom-[5%]
                left-[18%]
                right-[18%]
                z-40
                h-[2px]
                rounded-full
                bg-gradient-to-r
                from-transparent
                via-white/60
                to-transparent
              "
            />
          </div>
        </div>
      </div>
    </div>
  );

  /*
  |--------------------------------------------------------------------------
  | PORTAL
  |
  | IMPORTANTE:
  | El modal se monta directamente dentro de <body>.
  | No queda atrapado dentro del z-index de la sección Tarjetas.
  |--------------------------------------------------------------------------
  */

  return createPortal(
    modalContent,
    document.body
  );
}
