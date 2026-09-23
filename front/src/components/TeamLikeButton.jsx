import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import { getApiErrorDetails } from '../utils/api-error.js';

/*
|--------------------------------------------------------------------------
| Like de equipo
|
| El backend valida el límite real de 1 like por IP/equipo cada 3h; acá
| solo recordamos localmente (localStorage) que este navegador ya dio like
| a este equipo. Dentro de cada torneo, el/los equipo(s) con más likes le
| suman +5 OVR a todos sus jugadores (ver team-like-service.js).
|--------------------------------------------------------------------------
*/

const TEAM_LIKE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

function hasLikedTeamRecently(teamId) {
  try {
    const storedAt = localStorage.getItem(`teamLike:${teamId}`);
    return Boolean(storedAt) && Date.now() - Number(storedAt) < TEAM_LIKE_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function rememberTeamLike(teamId) {
  try {
    localStorage.setItem(`teamLike:${teamId}`, String(Date.now()));
  } catch {
    // localStorage puede fallar en modo privado; no es crítico, el backend
    // igual aplica el límite real por IP.
  }
}

function forgetTeamLike(teamId) {
  try {
    localStorage.removeItem(`teamLike:${teamId}`);
  } catch {
    // Ídem: si falla, no es crítico.
  }
}

export default function TeamLikeButton({ teamId, className = '' }) {
  const { notify } = useNotifications();
  const [total, setTotal] = useState(0);
  const [isLiked, setIsLiked] = useState(() => hasLikedTeamRecently(teamId));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/public/teams/likes?ids=${teamId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setTotal(data.data.totals?.[teamId] ?? 0);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  async function handleToggleLike(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isSaving) return;

    setIsSaving(true);

    try {
      if (isLiked) {
        const { data } = await api.delete(`/public/teams/${teamId}/like`);
        setTotal(data.data.total);
        setIsLiked(false);
        forgetTeamLike(teamId);
      } else {
        const { data } = await api.post(`/public/teams/${teamId}/like`);
        setTotal(data.data.total);
        setIsLiked(true);
        rememberTeamLike(teamId);
      }
    } catch (error) {
      const details = getApiErrorDetails(error);
      if (details.message?.startsWith('Ya le diste like')) {
        setIsLiked(true);
        rememberTeamLike(teamId);
      } else if (details.message?.includes('No tenés un like reciente')) {
        setIsLiked(false);
        forgetTeamLike(teamId);
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
        inline-flex items-center gap-2 rounded-full border-2 px-4 py-2
        text-sm font-black transition-all duration-200
        ${
          isLiked
            ? 'border-rose-400/40 bg-rose-400/15 text-rose-600 dark:text-rose-300'
            : 'border-slate-200 bg-white text-slate-500 hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-600 dark:border-white/[0.08] dark:bg-black/40 dark:text-slate-400 dark:hover:text-rose-300'
        }
        ${isSaving ? 'cursor-wait opacity-70' : 'cursor-pointer active:scale-95'}
        ${className}
      `}
      title={isLiked ? 'Quitar like (por si fue un error)' : 'Dar like a este equipo'}
    >
      <span aria-hidden="true">{isLiked ? '❤️' : '🤍'}</span>
      <span className="tabular-nums">{total}</span>
    </button>
  );
}
