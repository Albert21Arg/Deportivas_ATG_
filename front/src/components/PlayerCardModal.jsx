import { useEffect, useState } from 'react';

import { createPortal } from 'react-dom';

import api from '../services/api.js';

import { useNotifications } from '../context/NotificationContext.jsx';

import { getApiErrorDetails } from '../utils/api-error.js';

import {

  EXPIRED_CLASS,

  isLogoHidden,

  isPlayerExpired,

  isTeamExpired,

  PLAYER_EXPIRED_CLASS,

} from '../utils/team-expiry.js';



/*

|--------------------------------------------------------------------------

| Like de jugador

|

| El backend valida el límite real de 1 like por IP/jugador cada 3h; acá

| solo recordamos localmente (localStorage) que este navegador ya dio like

| a este jugador, para no mostrar el botón activo otra vez hasta que pasen

| las 3h, aunque se recargue la página.

|--------------------------------------------------------------------------

*/



const PLAYER_LIKE_COOLDOWN_MS = 3 * 60 * 60 * 1000;



function hasLikedPlayerRecently(playerId) {

  try {

    const storedAt = localStorage.getItem(`playerLike:${playerId}`);

    return Boolean(storedAt) && Date.now() - Number(storedAt) < PLAYER_LIKE_COOLDOWN_MS;

  } catch {

    return false;

  }

}



function rememberPlayerLike(playerId) {

  try {

    localStorage.setItem(`playerLike:${playerId}`, String(Date.now()));

  } catch {

    // localStorage puede fallar en modo privado; no es crítico, el backend

    // igual aplica el límite real por IP.

  }

}



function forgetPlayerLike(playerId) {

  try {

    localStorage.removeItem(`playerLike:${playerId}`);

  } catch {

    // Ídem: si falla, no es crítico.

  }

}



// El botón permite deshacer el like (por si fue un click por error): el

// backend solo deja quitar el más reciente, dentro de la misma ventana de

// cooldown en la que se muestra como "ya le diste like".

function PlayerLikeButton({ playerId, total, onLiked }) {

  const { notify } = useNotifications();

  const [isLiked, setIsLiked] = useState(() => hasLikedPlayerRecently(playerId));

  const [isSaving, setIsSaving] = useState(false);



  async function handleToggleLike(event) {

    event.stopPropagation();

    if (isSaving) return;



    setIsSaving(true);



    try {

      if (isLiked) {

        const { data } = await api.delete(`/public/players/${playerId}/like`);

        setIsLiked(false);

        forgetPlayerLike(playerId);

        onLiked(data.data);

      } else {

        const { data } = await api.post(`/public/players/${playerId}/like`);

        setIsLiked(true);

        rememberPlayerLike(playerId);

        onLiked(data.data);

      }

    } catch (error) {

      const details = getApiErrorDetails(error);

      if (details.message?.startsWith('Ya le diste like')) {

        setIsLiked(true);

        rememberPlayerLike(playerId);

      } else if (details.message?.includes('No tenés un like reciente')) {

        setIsLiked(false);

        forgetPlayerLike(playerId);

      }

      notify(details);

    } finally {

      setIsSaving(false);

    }

  }



  return (

    <button

      type="button"

      onClick={handleToggleLike}

      disabled={isSaving}

      className={`

        relative z-[100]

        flex h-10 min-w-[2.75rem] items-center justify-center gap-1

        rounded-full border px-2.5

        text-sm font-black leading-none

        shadow-2xl backdrop-blur-xl transition-all duration-200

        ${

          isLiked

            ? 'border-rose-400/40 bg-rose-400/20 text-rose-300'

            : 'border-white/20 bg-black/85 text-white hover:scale-110 hover:border-rose-400/40 hover:bg-rose-400/10'

        }

        ${isSaving ? 'cursor-wait opacity-70' : 'cursor-pointer active:scale-95'}

      `}

      title={isLiked ? 'Quitar like (por si fue un error)' : 'Dar like a este jugador'}

    >

      <span aria-hidden="true">{isLiked ? '❤️' : '🤍'}</span>

      <span className="tabular-nums">{total}</span>

    </button>

  );

}



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

| +1 por partido (jugados por el EQUIPO, no eventos propios del jugador)

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



  overall += matchesValue;



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

| Tabla de referencia (goles recibidos por partido -> OVR):

|   0.00 -> 99   0.50 -> 77   1.50 -> 61

|   0.25 -> 84   0.75 -> 73   2.00 -> 55

|   0.33 -> 81   1.00 -> 68   3.00 -> 47

|

| Es una raíz cuadrada invertida: al inicio (cerca de 0) cae rápido, y se

| va aplanando después, pero nunca deja de bajar, así que ni un promedio

| catastrófico deja de diferenciarse de otro peor.

|

| El piso NO es 60: si fuera 60, cualquier promedio malo (por ejemplo 3 o 5

| goles en un solo partido) quedaría recortado al mismo valor y dos arqueros

| claramente distintos se verían con el mismo OVR. El piso real (20) solo

| se alcanza con promedios catastróficos, así que los malos siguen

| diferenciándose entre sí. Los 0 partidos jugados son un caso aparte: ahí

| no hay datos, así que se usa 60 como valor neutral.

|

| Valla invicta (0 goles recibidos) es un caso especial aparte de la fórmula:

| no basta con no haber recibido goles, también hace falta muestra suficiente.

| - Menos de 5 partidos sin recibir gol -> 83 (buen arranque, pero todavía

|   poca muestra para el 99).

| - Desde el partido 5 en adelante, +1 por cada partido extra sin recibir gol

|   (83, 84, 85...) hasta llegar al techo de 99 (partido 21 en adelante).

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



  if (concededValue === 0) {

    if (matchesValue < 5) {

      return 83;

    }



    return Math.min(

      83 + (matchesValue - 5),

      99

    );

  }



  const concededPerMatch =

    concededValue / matchesValue;



  const overall =

    99 -

    31 *

      Math.sqrt(

        concededPerMatch

      );



  return Math.min(

    Math.max(

      Math.round(overall),

      20

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

  | LIKES (bonus de OVR)

  |--------------------------------------------------------------------------

  */



  const [likeTotal, setLikeTotal] = useState(row?.player?.likesTotal ?? 0);

  const [likeBonus, setLikeBonus] = useState(row?.player?.likesOvrBonus ?? 0);



  useEffect(() => {

    setLikeTotal(row?.player?.likesTotal ?? 0);

    setLikeBonus(row?.player?.likesOvrBonus ?? 0);

  }, [row?.player?.id, row?.player?.likesTotal, row?.player?.likesOvrBonus]);



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

    goalkeeperPosition,

  } = row;



  /*

  |--------------------------------------------------------------------------

  | ESTADOS

  |--------------------------------------------------------------------------

  */



  const expired =

    respectPaymentStatus &&

    isPlayerExpired(player);



  const nameHidden =

    respectPaymentStatus &&

    (player.showName === false || expired);



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



  // El superadmin puede fijar un OVR manual por jugador (fixedOvr): si está

  // presente, pisa el cálculo automático de la tarjeta (y no recibe el

  // bonus de likes, que solo aplica sobre el cálculo automático).

  const calculatedOverall = isGoalkeeper

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



  // El equipo líder en likes del torneo (ver team-like-service.js) le suma

  // este bonus fijo a todos sus jugadores, igual que likeBonus: solo aplica

  // sobre el cálculo automático, no sobre un OVR fijo.

  const teamLikeBonus = player.teamLikeBonus ?? 0;



  const overall =

    player.fixedOvr ??

    Math.min(calculatedOverall + likeBonus + teamLikeBonus, 99);



  // Un arquero abierto desde la tabla de goleadores/tarjetas trae su propio

  // `position` dentro de ESE ranking (no el de valla), así que la carta

  // dorada usa `goalkeeperPosition` cuando está presente; si viene de la

  // tabla de valla menos vencida, esa tabla ya manda su posición en `position`.

  const isLeader = isGoalkeeper

    ? (goalkeeperPosition ?? position) === 1

    : position === 1;



  /*

  |--------------------------------------------------------------------------

  | TIPO DE CARTA

  |--------------------------------------------------------------------------

  */



  // Tier de la tarjeta según el OVR (fijo o calculado): 1-57 madera,

  // 58-65 gris con madera, 66-77 plata, 78-90 dorada plata, 91-99 fuego

  // azul cyan dorada. El #1 de goleadores o de valla menos vencida siempre

  // cae en el tier "dorada plata", sin importar su OVR (incluso si su OVR

  // califica para el tier de fuego azul cyan dorada).

  const cardType =

    isLeader

      ? 'goldSilver'

      : overall >= 91

        ? 'cyanGoldFire'

        : overall >= 78

          ? 'goldSilver'

          : overall >= 66

            ? 'silver'

            : overall >= 58

              ? 'greyWood'

              : 'wood';



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

        // Un arquero normalmente no anota: solo se muestra esta columna

        // extra si de verdad tiene goles a favor (para no ensuciar la

        // tarjeta del resto de arqueros con un "0" irrelevante).

        ...(goals > 0

          ? [

              {

                label: 'Goles',

                value: goals,

                type: 'goals',

              },

            ]

          : []),

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

    wood: {

      outer:

        'from-[#f0c48a] via-[#c2793a] to-[#3d2008]',



      inner:

        'from-[#ffdba3] via-[#b6672a] to-[#4a2810]',



      accent:

        'bg-amber-200/14',



      text:

        'text-[#2b1a08]',



      line:

        'bg-[#2b1a08]/25',



      glowColor:

        'rgba(194,121,58,.45)',



      shine:

        'via-amber-200/60',



      border:

        'border-amber-200/32',

    },



    greyWood: {

      outer:

        'from-[#f0dcae] via-[#8a7a5c] to-[#22242a]',



      inner:

        'from-[#ffedc4] via-[#9c8a68] to-[#2e3038]',



      accent:

        'bg-stone-200/16',



      text:

        'text-[#201e1a]',



      line:

        'bg-[#201e1a]/25',



      glowColor:

        'rgba(154,132,92,.48)',



      shine:

        'via-orange-100/55',



      border:

        'border-stone-200/34',

    },



    silver: {

      outer:

        'from-[#ffffff] via-[#9fc3dd] to-[#101c29]',



      inner:

        'from-[#f0f8ff] via-[#a8c6dd] to-[#1c2c3d]',



      accent:

        'bg-sky-100/16',



      text:

        'text-[#0b1520]',



      line:

        'bg-[#0b1520]/22',



      glowColor:

        'rgba(147,197,253,.55)',



      shine:

        'via-sky-100/75',



      border:

        'border-sky-100/42',

    },



    goldSilver: {

      outer:

        'from-[#fff0a0] via-[#eab63f] to-[#3d4656]',



      inner:

        'from-[#ffe985] via-[#d9a637] to-[#495363]',



      accent:

        'bg-yellow-100/18',



      text:

        'text-[#241d08]',



      line:

        'bg-[#241d08]/22',



      glowColor:

        'rgba(234,182,63,.58)',



      shine:

        'via-yellow-50/80',



      border:

        'border-yellow-200/46',

    },



    cyanGoldFire: {

      outer:

        'from-[#fff28a] via-[#00e1ff] to-[#052c5c]',



      inner:

        'from-[#ffe37a] via-[#00b8e6] to-[#0a3d7a]',



      accent:

        'bg-cyan-100/22',



      text:

        'text-[#0b1a2b]',



      line:

        'bg-[#031225]/25',



      glowColor:

        'rgba(0,225,255,.65)',



      shine:

        'via-cyan-50/90',



      border:

        'border-cyan-100/55',

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

    cardType === 'goldSilver'

      ? `

          -1px -1px 0 #fff0a0,

           1px -1px 0 #eab63f,

          -1px  1px 0 #3d4656,

           1px  1px 0 #1f242c,

           0 3px 0 rgba(255,255,255,.40),

           0 5px 10px rgba(234,182,63,.35)

        `

      : cardType === 'blue'

        ? `

            -1px -1px 0 rgba(255,255,255,.75),

             1px -1px 0 rgba(14,116,144,.7),

            -1px  1px 0 rgba(14,116,144,.7),

             1px  1px 0 rgba(7,47,73,.8),

             0 4px 8px rgba(0,50,80,.35)

          `

        : cardType === 'cyanGoldFire'

          ? `

              -1px -1px 0 #fff28a,

               1px -1px 0 #00e1ff,

              -1px  1px 0 #00b8e6,

               1px  1px 0 #052c5c,

               0 3px 0 rgba(255,255,255,.45),

               0 5px 12px rgba(0,225,255,.55)

            `

          : cardType === 'greyWood'

            ? `

                -1px -1px 0 #f0dcae,

                 1px -1px 0 #8a7a5c,

                -1px  1px 0 #8a7a5c,

                 1px  1px 0 #22242a,

                 0 3px 0 rgba(255,255,255,.30),

                 0 5px 10px rgba(34,36,42,.40)

              `

            : cardType === 'wood'

              ? `

                  -1px -1px 0 #f0c48a,

                   1px -1px 0 #c2793a,

                  -1px  1px 0 #c2793a,

                   1px  1px 0 #3d2008,

                   0 3px 0 rgba(255,255,255,.30),

                   0 5px 10px rgba(61,32,8,.40)

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

              <div
                className="
                  pointer-events-auto
                  absolute
                  left-1/2
                  top-[85%]
                  z-[100]
                  -translate-x-1/2
                "
              >
                <PlayerLikeButton
                  playerId={player.id}
                  total={likeTotal}
                  onLiked={({ total, ovrBonus }) => {
                    setLikeTotal(total);
                    setLikeBonus(ovrBonus);
                  }}
                />
              </div>

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

    top-[22%]

    z-50

  "

>

  {team?.logo && !crestHidden ? (

    <img

      className={`

        block

        h-[72px]

        w-[72px]

        object-contain

        drop-shadow-[0_5px_8px_rgba(0,0,0,.6)]

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

        h-[72px]

        w-[72px]

        items-center

        justify-center

        text-[10px]

        font-black

        ${cardColors.text}

        ${crestExpiredClass}

      `}

    >

      {team?.name?.slice(0, 2).toUpperCase() ?? ''}

    </div>

  )}

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
                  relative
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

                    ${nameHidden ? PLAYER_EXPIRED_CLASS : ''}

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

                      : stats.length === 3

                        ? 'grid-cols-3'

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

                  className="

                    whitespace-nowrap

                    text-base

                    leading-none

                    opacity-70

                  "

                >

                  {isGoalkeeper ? (

                      <img

                        src="https://img.icons8.com/?size=100&id=80IrfPbBUOYM&format=png&color=000000"

                        alt="Arquero"

                        style={{ width: 55, height: 55 }}

                      />

                    ) : (

                      <img

                        src="https://img.icons8.com/?size=100&id=erCS43MlrpQn&format=png&color=000000"

                        alt="Jugador"

                        style={{ width: 55, height: 55 }}

                      />

                    )}



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
