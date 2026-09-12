import api from '../services/api.js';
import { EXPIRED_CLASS, isLogoHidden, isPlayerExpired, isTeamExpired, PLAYER_EXPIRED_CLASS } from '../utils/team-expiry.js';

function mediaUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${path}`;
}

// Silueta genérica para cuando la foto del jugador está oculta (no pagó):
// no se muestra ninguna imagen real, solo una figura oscura de relleno.
function PlayerSilhouette() {
  return (
    <svg className="h-[60%] w-[60%] text-black/25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
    </svg>
  );
}

// Silueta en forma de escudo/carta de jugador (estilo cromo dorado), con
// esquinas biseladas y una punta angosta solo en el último tramo inferior;
// el clip-path aplica al contenedor y recorta también a sus hijos (foto,
// franjas, etc), así que el contenido (nombre/estadísticas) debe quedar
// dentro de la zona recta (antes del 86% de alto) o se corta con la punta.
const CARD_CLIP = 'polygon(8% 0%, 92% 0%, 100% 5%, 100% 86%, 50% 100%, 0% 86%, 0% 5%)';

export default function PlayerCardModal({ row, onClose, respectPaymentStatus = false, blueCardEnabled = false }) {
  if (!row) return null;

  const { player, team, goals, yellowCards, redCards, blueCards, position } = row;
  const expired = respectPaymentStatus && isPlayerExpired(player);
  const photo = mediaUrl(player.photo);
  const crestHidden = respectPaymentStatus && isLogoHidden(team);
  const crestExpiredClass = respectPaymentStatus && isTeamExpired(team) ? EXPIRED_CLASS : '';

  // Solo el 1.º lugar tiene la tarjeta dorada; el resto es gris claro.
  const isLeader = position === 1;
  const cardGradient = isLeader
    ? 'from-amber-200 via-yellow-400 to-amber-600'
    : 'from-slate-200 via-slate-300 to-slate-400';
  const photoOverlayGradient = isLeader ? 'from-amber-100/40' : 'from-slate-100/40';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <div className="relative" onMouseDown={(event) => event.stopPropagation()}>
        <button
          className="absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-lg text-slate-300 shadow-lg transition hover:bg-slate-800 hover:text-white"
          type="button"
          onClick={onClose}
          aria-label="Cerrar tarjeta"
        >
          ×
        </button>

        <div
          className={`relative flex w-[280px] flex-col bg-gradient-to-br shadow-2xl shadow-black/50 ${cardGradient}`}
          style={{ clipPath: CARD_CLIP, aspectRatio: '5 / 7' }}
        >
          {/* FOTO / SILUETA */}
          <div className={`relative h-[52%] w-full shrink-0 overflow-hidden bg-gradient-to-b to-transparent ${photoOverlayGradient}`}>
            {photo ? (
              <img className={`h-full w-full object-cover ${expired ? PLAYER_EXPIRED_CLASS : ''}`} src={photo} alt={player.name} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/10">
                <PlayerSilhouette />
              </div>
            )}

            {/* DORSAL */}
            <p
              className="absolute left-5 top-4 text-4xl font-black leading-none text-slate-900 drop-shadow-sm"
            >
              {player.jerseyNumber ?? '—'}
            </p>

            {/* ESCUDO */}
            <div className="absolute left-4 top-16">
              {team?.logo && !crestHidden ? (
                <img
                  className={`h-[55px] w-[55px] object-contain drop-shadow ${crestExpiredClass}`}
                  src={team.logo}
                  alt=""
                />
              ) : (
                <div
                  className={`flex h-[41px] w-[41px] items-center justify-center rounded bg-black/10 text-[9px] font-black text-slate-800 ${crestExpiredClass}`}
                >
                  {team?.name?.slice(0, 2).toUpperCase() ?? ''}
                </div>
              )}
            </div>
          </div>

          {/* NOMBRE */}
          <div className="shrink-0 px-4 pt-2 text-center">
            <h2
              className="truncate text-lg font-black uppercase tracking-tight text-slate-900"
              title={player.name}
            >
              {player.name}
            </h2>
            <div className="mx-auto mt-1.5 h-px w-4/5 bg-slate-900/25" />
          </div>

          {/* ESTADÍSTICAS */}
          <div className="mt-3 flex shrink-0 items-start justify-center gap-1.5 px-3">
            {[
              { label: 'Goles', value: goals },
              { label: 'Amarillas', value: yellowCards },
              { label: 'Rojas', value: redCards },
              ...(blueCardEnabled ? [{ label: 'Azules', value: blueCards }] : []),
            ].map((stat, index) => (
              <div className="flex items-start gap-1.5" key={stat.label}>
                {index > 0 && <div className="mt-0.5 h-7 w-px shrink-0 bg-slate-900/20" />}
                <div className="w-12 text-center">
                  <p className="text-xl font-black leading-none text-slate-900">{stat.value}</p>
                  <p className="mt-1 truncate text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-800/70">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
