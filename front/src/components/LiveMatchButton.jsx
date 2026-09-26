import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

const POLL_INTERVAL_MS = 20000;

/*
|--------------------------------------------------------------------------
| Botón flotante "LIVE"
|--------------------------------------------------------------------------
| Visible solo para SUPERADMIN/ADMIN. Si hay algún partido en vivo dentro
| de su alcance (todos los torneos si es SUPERADMIN, solo los que
| administra si es ADMIN), muestra un botón fijo a la derecha que lleva
| directo a la vista de registrar eventos de ese partido.
*/

export default function LiveMatchButton() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [liveMatch, setLiveMatch] = useState(null);
  const intervalRef = useRef(null);

  const canSeeLiveButton = isAuthenticated && ['SUPERADMIN', 'ADMIN'].includes(user?.role);

  useEffect(() => {
    if (!canSeeLiveButton) {
      setLiveMatch(null);
      return;
    }

    let cancelled = false;

    function poll() {
      api.get('/matches/live')
        .then(({ data }) => {
          if (!cancelled) setLiveMatch(data.data.match);
        })
        .catch(() => {
          if (!cancelled) setLiveMatch(null);
        });
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [canSeeLiveButton]);

  if (!canSeeLiveButton || !liveMatch) return null;

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/dashboard/matches?tournamentId=${liveMatch.tournamentId}`)
      }
      className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border border-red-400/30 bg-slate-950 px-3.5 py-2.5 shadow-2xl shadow-black/40 transition hover:scale-105 hover:border-red-400/60 sm:bottom-6 sm:right-6 sm:px-4"
      aria-label={`Partido en vivo: ${liveMatch.homeTeam.name} ${liveMatch.homeScore ?? 0} - ${liveMatch.awayScore ?? 0} ${liveMatch.awayTeam.name}. Ir a registrar eventos.`}
      title={`${liveMatch.homeTeam.name} ${liveMatch.homeScore ?? 0} - ${liveMatch.awayScore ?? 0} ${liveMatch.awayTeam.name}`}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>

      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white sm:text-xs">
        LIVE
      </span>

      
    </button>
  );
}
