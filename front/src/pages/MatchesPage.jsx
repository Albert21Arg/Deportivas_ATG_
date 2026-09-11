import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import ConfirmActionModal from "../components/ConfirmActionModal.jsx";
import DashboardNavbar from "../components/DashboardNavbar.jsx";
import FutbolIcon from "../components/FutbolIcon.jsx";
import api from "../services/api.js";
import { getApiErrorDetails } from "../utils/api-error.js";

const emptyForm = {
  homeTeamId: "",
  awayTeamId: "",
  date: "",
  time: "",
};

const emptyScoreForm = {
  homeScore: "",
  awayScore: "",
};

const statusLabels = {
  SCHEDULED: "Programado",
  STARTED: "En vivo",
  FINISHED: "Finalizado",
  POSTPONED: "Aplazado",
  CANCELLED: "Cancelado",
};

const statusStyles = {
  SCHEDULED: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  STARTED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  FINISHED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  POSTPONED: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  CANCELLED: "border-red-500/20 bg-red-500/10 text-red-300",
};

function dateValue(value) {
  return String(value ?? "").slice(0, 10);
}

function timeValue(value) {
  return String(value ?? "").slice(0, 5);
}

function formatMatchDate(value) {
  const calendarDate = dateValue(value);

  if (!calendarDate) {
    return "Fecha pendiente";
  }

  const [year, month, day] = calendarDate.split("-").map(Number);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function getMatchTimestamp(match) {
  const date = dateValue(match.date);
  const time = timeValue(match.time);

  if (!date) {
    return 0;
  }

  return new Date(`${date}T${time || "00:00"}:00`).getTime();
}

function sortMatches(matches) {
  const statusPriority = {
    SCHEDULED: 0,
    STARTED: 0,
    POSTPONED: 1,
    CANCELLED: 2,
    FINISHED: 3,
  };

  return [...matches].sort((left, right) => {
    const leftPriority = statusPriority[left.status] ?? 2;
    const rightPriority = statusPriority[right.status] ?? 2;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftTimestamp = getMatchTimestamp(left);
    const rightTimestamp = getMatchTimestamp(right);

    if (
      left.status === "FINISHED" &&
      right.status === "FINISHED"
    ) {
      return rightTimestamp - leftTimestamp;
    }

    return leftTimestamp - rightTimestamp;
  });
}

/* ================================================================
   ICONS
================================================================ */

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m16 16 4 4" />
    </svg>
  );
}

/* ================================================================
   TEAM LOGO
================================================================ */

function TeamLogo({ team, size = "normal" }) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses =
    size === "large"
      ? "h-14 w-14 sm:h-16 sm:w-16"
      : "h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14";

  if (!team?.logo || hasError) {
    return (
      <div
        className={`
          mx-auto flex ${sizeClasses}
          items-center justify-center
          rounded-full border border-slate-700
          bg-slate-800
          text-base sm:text-lg
        `}
        aria-label={`Sin logo para ${team?.name ?? "equipo"}`}
      >
        ⚽
      </div>
    );
  }

  return (
    <img
      className={`
        mx-auto ${sizeClasses}
        rounded-full border border-slate-700
        bg-slate-950 object-cover p-0.5
      `}
      src={team.logo}
      alt={`Logo de ${team.name}`}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

/* ================================================================
   TEAM SEARCH
================================================================ */

function TeamSearch({
  label,
  value,
  teams,
  excludeId,
  onChange,
  required = false,
}) {
  const [query, setQuery] = useState("");

  const selectedTeam = teams.find(
    (team) => String(team.id) === String(value),
  );

  const availableTeams = teams.filter(
    (team) => String(team.id) !== String(excludeId),
  );

  const normalizedQuery = query.trim().toLowerCase();

  const matchingTeams = availableTeams.filter((team) =>
    team.name.toLowerCase().includes(normalizedQuery),
  );

  function handleQueryChange(event) {
    setQuery(event.target.value);
    onChange("");
  }

  function selectTeam(team) {
    onChange(String(team.id));
    setQuery("");
  }

  return (
    <div className="relative min-w-0">
      <label className="block text-xs font-semibold text-slate-400">
        <span>{label}</span>

        <div className="relative mt-1.5">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <SearchIcon />
          </div>

          <input
            className="
              box-border block h-11 w-full
              appearance-none rounded-xl
              border border-white/[0.08]
              bg-[#080d14]
              pl-10 pr-10
              text-sm text-white
              outline-none
              transition
              hover:border-white/[0.12]
              focus:border-emerald-400/60
              focus:ring-2 focus:ring-emerald-400/10
            "
            value={query}
            onChange={handleQueryChange}
            placeholder="Buscar equipo..."
            required={required && !value}
            aria-label={label}
            autoComplete="off"
          />

          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
            ↓
          </div>
        </div>
      </label>

      {query.trim() && !selectedTeam && (
        <div
          className="
            absolute left-0 right-0 top-full z-30 mt-2
            max-h-48 overflow-y-auto
            rounded-xl border border-white/[0.08]
            bg-[#080d14]
            p-1.5 shadow-xl shadow-black/30
          "
        >
          {matchingTeams.length ? (
            matchingTeams.map((team) => (
              <button
                className="
                  flex w-full items-center gap-2
                  rounded-lg px-2.5 py-2.5
                  text-left text-xs text-slate-200
                  transition
                  hover:bg-emerald-400/10
                  hover:text-emerald-300
                "
                key={team.id}
                type="button"
                onClick={() => selectTeam(team)}
              >
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt=""
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800">
                    ⚽
                  </span>
                )}

                <span className="min-w-0 truncate font-semibold">
                  {team.name}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-xs text-slate-500">
              No se encontraron equipos.
            </p>
          )}
        </div>
      )}

      {selectedTeam && (
        <div className="mt-2 flex min-w-0 items-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.03] px-2.5 py-2">
          {selectedTeam.logo ? (
            <img
              src={selectedTeam.logo}
              alt=""
              className="h-6 w-6 shrink-0 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs">
              ⚽
            </span>
          )}

          <span
            className="min-w-0 flex-1 truncate text-[10px] font-semibold text-emerald-300"
            title={selectedTeam.name}
          >
            {selectedTeam.name}
          </span>

          <button
            className="shrink-0 text-[10px] text-slate-500 transition hover:text-white"
            type="button"
            onClick={() => onChange("")}
          >
            Cambiar
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   DATE / TIME FIELD
================================================================ */

function DateTimeField({
  label,
  type,
  name,
  value,
  onChange,
}) {
  const Icon = type === "date" ? CalendarIcon : ClockIcon;

  return (
    <label className="block min-w-0 text-xs font-semibold text-slate-400">
      <span>{label}</span>

      <div className="relative mt-1.5">
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500">
          <Icon />
        </div>

        <input
          className="
            box-border block h-11 w-full min-w-0
            appearance-none rounded-xl
            border border-white/[0.08]
            bg-[#080d14]
            px-3 pl-10
            text-sm text-white
            outline-none
            transition
            hover:border-white/[0.12]
            focus:border-emerald-400/60
            focus:ring-2 focus:ring-emerald-400/10
          "
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required
          style={{
            colorScheme: "dark",
          }}
        />
      </div>
    </label>
  );
}

/* ================================================================
   LIVE EVENT PANEL
================================================================ */

function LiveEventPanel({ match, blueCardEnabled = true }) {
  const { notify } = useNotifications();

  const [teamId, setTeamId] = useState(
    String(match.homeTeamId),
  );

  const [players, setPlayers] = useState([]);
  const [type, setType] = useState("GOAL");
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState(null);
  const [minute, setMinute] = useState("");

  const [score, setScore] = useState({
    homeScore: String(match.homeScore ?? 0),
    awayScore: String(match.awayScore ?? 0),
  });

  const [currentMatch, setCurrentMatch] = useState(match);
  const [eventToRemove, setEventToRemove] = useState(null);
  const [isRemovingEvent, setIsRemovingEvent] = useState(false);

  const isOwnGoal = type === "OWN_GOAL";

  const rosterTeamId = isOwnGoal
    ? String(teamId) === String(match.homeTeamId)
      ? match.awayTeamId
      : match.homeTeamId
    : Number(teamId);

  const rivalTeamName =
    String(teamId) === String(match.homeTeamId)
      ? match.awayTeam.name
      : match.homeTeam.name;

  useEffect(() => {
    let cancelled = false;

    api
      .get(
        `/tournaments/${match.tournamentId}/teams/${rosterTeamId}/players`,
      )
      .then(({ data }) => {
        if (cancelled) return;

        setPlayers(
          data.data.players.filter(
            (item) => item.status === "ACTIVE",
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPlayers([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [match.tournamentId, rosterTeamId]);

  useEffect(() => {
    setCurrentMatch(match);

    setScore({
      homeScore: String(match.homeScore ?? 0),
      awayScore: String(match.awayScore ?? 0),
    });
  }, [
    match.id,
    match.homeScore,
    match.awayScore,
    match.events,
  ]);

  const expelled = useMemo(
    () =>
      new Set(
        (currentMatch.events ?? [])
          .filter((event) => event.type === "RED_CARD")
          .map((event) => event.playerId),
      ),
    [currentMatch.events],
  );

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return players.filter(
      (item) =>
        !expelled.has(item.id) &&
        item.name.toLowerCase().includes(normalizedQuery),
    );
  }, [players, expelled, query]);

  function apply(updated) {
    setCurrentMatch(updated);

    window.dispatchEvent(
      new CustomEvent("deportiva:match-updated", {
        detail: updated,
      }),
    );
  }

  async function saveScore(event) {
    event.preventDefault();

    try {
      const { data } = await api.patch(
        `/matches/${match.id}/live-score`,
        {
          homeScore: Number(score.homeScore),
          awayScore: Number(score.awayScore),
        },
      );

      apply(data.data.match);
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  async function saveCard(event) {
    event.preventDefault();

    if (!player) return;

    try {
      const { data } = await api.post(
        `/matches/${match.id}/events`,
        {
          teamId: Number(teamId),
          playerId: player.id,
          type,
          minute: minute || undefined,
        },
      );

      apply(data.data.match);

      setPlayer(null);
      setQuery("");
      setMinute("");
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  async function removeEvent(eventId) {
    setIsRemovingEvent(true);
    try {
      const { data } = await api.delete(
        `/matches/${match.id}/events/${eventId}`,
      );

      apply(data.data.match);
      setEventToRemove(null);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsRemovingEvent(false);
    }
  }

  return (
    <div className="mt-4 space-y-2.5 border-t border-white/[0.05] pt-3.5 sm:space-y-3 sm:pt-4">
      {/* SCORE */}
      <form
        className="
          rounded-xl
          border border-emerald-400/10
          bg-emerald-400/[0.035]
          p-2.5 sm:p-3
        "
        onSubmit={saveScore}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">
            Corrección manual del marcador
          </p>

          <span className="flex items-center gap-1 text-[8px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            EN VIVO
          </span>
        </div>

        <p className="mt-1 text-[9px] leading-4 text-slate-500">
          Usa esto solo para corregir errores. Para anotar goles usa
          el botón ⚽ / 🔴 de abajo: así quedan enlazados al
          jugador.
        </p>

        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <input
            className="
              h-10 w-full rounded-lg
              border border-slate-700
              bg-slate-950
              text-center text-xl font-black
              text-white outline-none
              focus:border-emerald-400
            "
            min="0"
            type="number"
            value={score.homeScore}
            onChange={(event) =>
              setScore((current) => ({
                ...current,
                homeScore: event.target.value,
              }))
            }
            aria-label={`Marcador de ${match.homeTeam.name}`}
          />

          <span className="text-sm font-bold text-slate-600">
            -
          </span>

          <input
            className="
              h-10 w-full rounded-lg
              border border-slate-700
              bg-slate-950
              text-center text-xl font-black
              text-white outline-none
              focus:border-emerald-400
            "
            min="0"
            type="number"
            value={score.awayScore}
            onChange={(event) =>
              setScore((current) => ({
                ...current,
                awayScore: event.target.value,
              }))
            }
            aria-label={`Marcador de ${match.awayTeam.name}`}
          />
        </div>
      </form>

      {/* EVENT */}
      <form
        className="
          rounded-xl
          border border-white/[0.06]
          bg-slate-950/30
          p-2.5 sm:p-3
        "
        onSubmit={saveCard}
      >
        <div
          className={`grid gap-1.5 ${
            blueCardEnabled ? "grid-cols-5" : "grid-cols-4"
          }`}
        >
          <button
            className={`
              h-9 rounded-lg
              text-[9px] font-bold
              transition
              ${
                type === "GOAL"
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }
            `}
            type="button"
            onClick={() => {
              setType("GOAL");
              setPlayer(null);
              setQuery("");
            }}
            aria-label="Gol"
          >
            ⚽
          </button>

          <button
            className={`
              flex h-9 items-center justify-center rounded-lg
              text-[9px] font-bold
              transition
              ${
                type === "OWN_GOAL"
                  ? "bg-orange-400 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }
            `}
            type="button"
            onClick={() => {
              setType("OWN_GOAL");
              setPlayer(null);
              setQuery("");
            }}
            aria-label="Autogol"
            title="Autogol"
          >
            <FutbolIcon
              className={`h-4 w-4 ${
                type === "OWN_GOAL" ? "text-red-600" : "text-red-500"
              }`}
            />
          </button>

          <button
            className={`
              h-9 rounded-lg
              text-[9px] font-bold
              transition
              ${
                type === "YELLOW_CARD"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }
            `}
            type="button"
            onClick={() => {
              setType("YELLOW_CARD");
              setPlayer(null);
              setQuery("");
            }}
            aria-label="Tarjeta amarilla"
          >
            🟨
          </button>

          <button
            className={`
              h-9 rounded-lg
              text-[9px] font-bold
              transition
              ${
                type === "RED_CARD"
                  ? "bg-red-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }
            `}
            type="button"
            onClick={() => {
              setType("RED_CARD");
              setPlayer(null);
              setQuery("");
            }}
            aria-label="Tarjeta roja"
          >
            🟥
          </button>

          {blueCardEnabled && (
            <button
              className={`
                h-9 rounded-lg
                text-[9px] font-bold
                transition
                ${
                  type === "BLUE_CARD"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }
              `}
              type="button"
              onClick={() => {
                setType("BLUE_CARD");
                setPlayer(null);
                setQuery("");
              }}
              aria-label="Tarjeta azul"
            >
              🟦
            </button>
          )}
        </div>

        {isOwnGoal && (
          <p className="mt-1.5 text-[9px] leading-4 text-orange-300">
            Autogol: el equipo seleccionado abajo es el que se
            beneficia del gol. El jugador debe pertenecer a{" "}
            {rivalTeamName}.
          </p>
        )}

        <select
          className="
            mt-2 h-10 w-full rounded-lg
            border border-slate-700
            bg-slate-950
            px-2 text-xs text-white
            outline-none
            focus:border-emerald-400
          "
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value);
            setPlayer(null);
            setQuery("");
          }}
        >
          <option value={match.homeTeamId}>
            {match.homeTeam.name}
          </option>

          <option value={match.awayTeamId}>
            {match.awayTeam.name}
          </option>
        </select>

        <div className="relative">
          <input
            className="
              mt-2 h-10 w-full rounded-lg
              border border-slate-700
              bg-slate-950
              px-3 text-xs text-white
              outline-none
              placeholder:text-slate-600
              focus:border-emerald-400
            "
            placeholder="Buscar jugador..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPlayer(null);
            }}
            autoComplete="off"
          />

          {query && !player && (
            <div
              className="
                absolute left-0 right-0 top-full z-20 mt-1
                max-h-32 overflow-y-auto
                rounded-lg border border-slate-700
                bg-slate-950 shadow-xl
              "
            >
              {results.map((item) => (
                <button
                  className="
                    block w-full truncate
                    px-3 py-2.5
                    text-left text-xs
                    text-slate-300
                    hover:bg-slate-800
                  "
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPlayer(item);
                    setQuery(item.name);
                  }}
                >
                  {item.name}
                </button>
              ))}

              {results.length === 0 && (
                <p className="px-3 py-2.5 text-xs text-slate-500">
                  No hay jugadores disponibles.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input
            className="
              h-10 min-w-0 rounded-lg
              border border-slate-700
              bg-slate-950
              px-2 text-xs text-white
              outline-none
              placeholder:text-slate-600
              focus:border-emerald-400
            "
            type="number"
            min="0"
            max="130"
            placeholder="Minuto"
            value={minute}
            onChange={(event) => setMinute(event.target.value)}
          />

          <button
            className="
              rounded-lg
              bg-slate-100
              px-3
              text-[10px] font-bold
              text-slate-950
              transition
              hover:bg-white
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
            disabled={!player}
          >
            Registrar
          </button>
        </div>
      </form>

      {/* EVENTS */}
      <div className="space-y-1.5">
        {(currentMatch.events ?? []).map((event) => (
          <div
            className="
              flex min-w-0 items-center gap-2
              rounded-lg
              bg-slate-950/50
              px-2.5 py-2
              text-[10px]
            "
            key={event.id}
          >
            <span className="flex shrink-0 items-center">
              {event.type === "YELLOW_CARD"
                ? "🟨"
                : event.type === "RED_CARD"
                  ? "🟥"
                  : event.type === "BLUE_CARD"
                    ? "🟦"
                    : event.type === "OWN_GOAL"
                      ? <FutbolIcon className="h-3.5 w-3.5 text-red-500" />
                      : "⚽"}
            </span>

            <span className="shrink-0 text-slate-500">
              {event.minute != null
                ? `${event.minute}'`
                : "—"}
            </span>

            <span
              className="min-w-0 flex-1 truncate font-semibold text-slate-300"
              title={
                event.player?.name ??
                event.team?.name
              }
            >
              {event.player?.name ??
                event.team?.name}
              {event.type === "OWN_GOAL" && " (autogol)"}
            </span>

            <button
              className="shrink-0 text-[9px] text-red-300 transition hover:text-red-200"
              type="button"
              onClick={() => setEventToRemove(event)}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <ConfirmActionModal
        isOpen={Boolean(eventToRemove)}
        title="¿Eliminar evento?"
        message="El evento se quitará del registro en vivo de este partido."
        confirmLabel="Sí, eliminar"
        isLoading={isRemovingEvent}
        onCancel={() => setEventToRemove(null)}
        onConfirm={() => removeEvent(eventToRemove.id)}
      />
    </div>
  );
}

/* ================================================================
   MATCH CARD
================================================================ */

function MatchCard({
  match,
  isAdmin,
  canCorrectFinished,
  startEditing,
  registerResult,
  changeStatus,
  tournament,
}) {
  // Marcador rápido en la tarjeta: estado propio de este partido, no
  // compartido entre tarjetas (antes usaba un estado global de la página
  // y escribir el marcador de un partido se reflejaba en todos los demás).
  const [localScore, setLocalScore] = useState({
    homeScore: "",
    awayScore: "",
  });

  const isFinished = match.status === "FINISHED";

  const canEdit =
    match.status !== "CANCELLED" &&
    (!isFinished || canCorrectFinished);

  const hasCurrentScore =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

  const showScore =
    isFinished || match.status === "STARTED";

  function handleRegisterResult() {
    registerResult(match, localScore);
  }

  return (
    <article
      className="
        group relative overflow-hidden
        rounded-xl sm:rounded-2xl
        border border-white/[0.07]
        bg-[#0b111a]
        shadow-lg shadow-black/10
        transition-colors duration-200
        hover:border-white/[0.11]
        sm:shadow-xl sm:shadow-black/15
      "
    >
      {/* TOP ACCENT */}
      <div
        className={`absolute inset-x-0 top-0 h-px ${
          match.status === "STARTED"
            ? "bg-emerald-400/70"
            : match.status === "FINISHED"
              ? "bg-emerald-400/40"
              : "bg-white/[0.07]"
        }`}
      />

      {/* HEADER */}
      <div className="border-b border-white/[0.05] px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Partido
            </p>

            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500 sm:text-xs">
              <span className="truncate">
                {formatMatchDate(match.date)}
              </span>

              <span className="shrink-0 text-slate-700">
                •
              </span>

              <span className="shrink-0">
                {timeValue(match.time)}
              </span>
            </div>
          </div>

          <span
            className={`
              shrink-0 rounded-full border
              px-2 py-1
              text-[8px] font-bold
              sm:px-2.5 sm:text-[9px]
              ${
                statusStyles[match.status] ??
                "border-slate-700 bg-slate-800 text-slate-300"
              }
            `}
          >
            {statusLabels[match.status] ??
              match.status}
          </span>
        </div>
      </div>

      {/* TEAMS */}
      <div className="px-3.5 py-4 sm:px-4 sm:py-5">
        <div
          className="
            grid
            grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)]
            items-start
            gap-1
            sm:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)]
            sm:gap-2
          "
        >
          {/* HOME */}
          <div className="min-w-0 text-center">
            <TeamLogo team={match.homeTeam} />

            <h3
              className="
                mx-auto mt-2
                max-w-[130px]
                truncate
                text-xs font-bold leading-5
                text-slate-100
                sm:max-w-[160px]
                sm:text-sm
              "
              title={match.homeTeam.name}
            >
              {match.homeTeam.name}
            </h3>

            {showScore ? (
              <p className="mt-2 text-2xl font-black leading-none text-emerald-300 sm:text-3xl">
                {hasCurrentScore
                  ? match.homeScore
                  : 0}
              </p>
            ) : canEdit ? (
              <input
                className="
                  mx-auto mt-2 block
                  h-10 w-14
                  rounded-lg
                  border border-slate-700
                  bg-slate-950
                  px-1
                  text-center text-lg font-bold
                  text-slate-100
                  outline-none
                  transition
                  focus:border-emerald-400
                  focus:ring-2 focus:ring-emerald-500/20
                  sm:h-11 sm:w-16 sm:text-xl
                "
                type="number"
                min="0"
                placeholder="0"
                value={localScore.homeScore}
                onChange={(event) =>
                  setLocalScore((current) => ({
                    ...current,
                    homeScore: event.target.value,
                  }))
                }
                aria-label={`Marcador de ${match.homeTeam.name}`}
              />
            ) : null}
          </div>

          {/* VS */}
          <div className="flex h-[78px] items-center justify-center sm:h-[98px]">
            <span
              className="
                flex h-7 w-7
                items-center justify-center
                rounded-full
                border border-white/[0.06]
                bg-slate-950
                text-[8px] font-black
                text-slate-600
                sm:h-8 sm:w-8 sm:text-[9px]
              "
            >
              VS
            </span>
          </div>

          {/* AWAY */}
          <div className="min-w-0 text-center">
            <TeamLogo team={match.awayTeam} />

            <h3
              className="
                mx-auto mt-2
                max-w-[130px]
                truncate
                text-xs font-bold leading-5
                text-slate-100
                sm:max-w-[160px]
                sm:text-sm
              "
              title={match.awayTeam.name}
            >
              {match.awayTeam.name}
            </h3>

            {showScore ? (
              <p className="mt-2 text-2xl font-black leading-none text-emerald-300 sm:text-3xl">
                {hasCurrentScore
                  ? match.awayScore
                  : 0}
              </p>
            ) : canEdit ? (
              <input
                className="
                  mx-auto mt-2 block
                  h-10 w-14
                  rounded-lg
                  border border-slate-700
                  bg-slate-950
                  px-1
                  text-center text-lg font-bold
                  text-slate-100
                  outline-none
                  transition
                  focus:border-emerald-400
                  focus:ring-2 focus:ring-emerald-500/20
                  sm:h-11 sm:w-16 sm:text-xl
                "
                type="number"
                min="0"
                placeholder="0"
                value={localScore.awayScore}
                onChange={(event) =>
                  setLocalScore((current) => ({
                    ...current,
                    awayScore: event.target.value,
                  }))
                }
                aria-label={`Marcador de ${match.awayTeam.name}`}
              />
            ) : null}
          </div>
        </div>

        {/* RESULT */}
        {isFinished && hasCurrentScore && (
          <div className="mt-3 flex justify-center">
            <span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.04] px-2.5 py-1 text-[9px] font-bold text-emerald-300 sm:px-3 sm:text-[10px]">
              Resultado: {match.homeScore} -{" "}
              {match.awayScore}
              {match.homePenaltyScore != null &&
                match.awayPenaltyScore != null && (
                  <span className="ml-1.5 text-amber-300">
                    P({match.homePenaltyScore}-
                    {match.awayPenaltyScore})
                  </span>
                )}
            </span>
          </div>
        )}

        {/* LIVE */}
        {match.status === "STARTED" && (
          <LiveEventPanel
            match={match}
            blueCardEnabled={
              tournament?.blueCardEnabled ?? true
            }
          />
        )}
      </div>

      {/* ACTIONS */}
      {isAdmin && canEdit && (
        <div className="border-t border-white/[0.05] bg-slate-950/20 p-2.5 sm:p-3">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-center">
            {match.status === "SCHEDULED" && (
              <button
                className="
                  rounded-lg bg-red-500
                  px-2 py-2
                  text-[9px] font-bold text-white
                  transition hover:bg-red-400
                  sm:px-2.5 sm:py-1.5
                "
                onClick={() =>
                  changeStatus(match, "start")
                }
                type="button"
              >
                🔴 Iniciar
              </button>
            )}

            {match.status === "STARTED" && (
              <button
                className="
                  rounded-lg bg-emerald-500
                  px-2 py-2
                  text-[9px] font-bold text-slate-950
                  transition hover:bg-emerald-400
                  sm:px-2.5 sm:py-1.5
                "
                onClick={() =>
                  changeStatus(match, "finish")
                }
                type="button"
              >
                Finalizar
              </button>
            )}

            {match.status !== "STARTED" && (
              <>
                <button
                  className="
                    rounded-lg border border-slate-700
                    px-2 py-2
                    text-[9px] font-semibold text-slate-300
                    transition
                    hover:border-slate-500
                    hover:text-white
                    sm:px-2.5 sm:py-1.5
                  "
                  onClick={() => startEditing(match)}
                  type="button"
                >
                  ✏️{" "}
                  {match.status === "POSTPONED"
                    ? "Re-programar"
                    : "Editar"}
                </button>

                <button
                  className="
                    rounded-lg bg-emerald-500
                    px-2 py-2
                    text-[9px] font-bold text-slate-950
                    transition hover:bg-emerald-400
                    sm:px-2.5 sm:py-1.5
                  "
                  onClick={handleRegisterResult}
                  type="button"
                >
                  🏁{" "}
                  {match.status === "FINISHED"
                    ? "Corregir"
                    : "Resultado"}
                </button>
              </>
            )}

            {match.status !== "FINISHED" &&
              match.status !== "POSTPONED" && (
                <button
                  className="
                    rounded-lg border border-amber-800/60
                    px-2 py-2
                    text-[9px] font-semibold text-amber-200
                    transition
                    hover:border-amber-500
                    hover:bg-amber-500/10
                    sm:px-2.5 sm:py-1.5
                  "
                  onClick={() =>
                    changeStatus(match, "postpone")
                  }
                  type="button"
                >
                  ⏸️ Aplazar
                </button>
              )}

            <button
              className="
                rounded-lg border border-red-900/60
                px-2 py-2
                text-[9px] font-semibold text-red-300
                transition
                hover:border-red-500
                hover:bg-red-500/10
                sm:px-2.5 sm:py-1.5
              "
              onClick={() =>
                changeStatus(match, "cancel")
              }
              type="button"
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ================================================================
   ACCORDION
================================================================ */

function MatchAccordion({
  title,
  description,
  icon,
  tone,
  count,
  isOpen,
  onToggle,
  children,
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-xl sm:rounded-2xl
        border border-white/[0.07]
        bg-[#0a1018]/90
        shadow-lg shadow-black/10
        sm:shadow-xl sm:shadow-black/10
      "
    >
      <button
        className="
          flex w-full
          items-center justify-between
          gap-3
          px-3.5 py-3.5
          text-left
          transition
          hover:bg-white/[0.025]
          sm:px-5 sm:py-4
        "
        onClick={onToggle}
        type="button"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div
            className="
              flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-lg
              border border-white/[0.06]
              bg-white/[0.025]
              text-sm
              sm:h-10 sm:w-10 sm:rounded-xl
            "
          >
            {icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3
                className={`truncate text-xs font-bold sm:text-sm ${tone}`}
              >
                {title}
              </h3>

              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 px-1.5 text-[8px] font-bold text-slate-500 sm:text-[9px]">
                {count}
              </span>
            </div>

            <p className="mt-0.5 hidden truncate text-[10px] text-slate-600 sm:block">
              {description}
            </p>
          </div>
        </div>

        <span
          className={`
            flex h-7 w-7 shrink-0
            items-center justify-center
            rounded-lg
            border border-white/[0.06]
            text-xs text-slate-500
            transition-transform duration-300
            sm:h-8 sm:w-8
            ${isOpen ? "rotate-180" : ""}
          `}
        >
          ↓
        </span>
      </button>

      <div
        className={`
          overflow-hidden
          transition-[max-height,opacity]
          duration-300
          ease-in-out
          ${
            isOpen
              ? "max-h-[5000px] opacity-100"
              : "max-h-0 opacity-0"
          }
        `}
      >
        <div className="border-t border-white/[0.05] p-2.5 sm:p-4">
          {children}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   MAIN PAGE
================================================================ */

/* ==================================================================
   DEFINICIÓN POR PENALES
================================================================== */

function PenaltyShootoutModal({ shootout, onCancel, onConfirm, isSaving }) {
  const { match, homeScore, awayScore } = shootout;

  const [teamId, setTeamId] = useState(String(match.homeTeamId));
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/tournaments/${match.tournamentId}/teams/${teamId}/players`)
      .then(({ data }) => {
        if (cancelled) return;
        setPlayers(
          data.data.players.filter((item) => item.status === "ACTIVE"),
        );
      })
      .catch(() => {
        if (!cancelled) setPlayers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [match.tournamentId, teamId]);

  useEffect(() => {
    setSelectedPlayerId("");
  }, [teamId]);

  const homeCount = entries.filter(
    (entry) => entry.teamId === match.homeTeamId,
  ).length;
  const awayCount = entries.filter(
    (entry) => entry.teamId === match.awayTeamId,
  ).length;
  const canSave = entries.length > 0 && homeCount !== awayCount;

  function addGoal(event) {
    event.preventDefault();
    if (!selectedPlayerId) return;

    const player = players.find(
      (item) => String(item.id) === selectedPlayerId,
    );
    if (!player) return;

    setEntries((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        teamId: Number(teamId),
        playerId: player.id,
        playerName: player.name,
      },
    ]);
    setSelectedPlayerId("");
  }

  function removeEntry(id) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <div
      className="
        fixed inset-0 z-[70]
        flex items-end justify-center
        overflow-y-auto
        bg-slate-950/85
        px-2 py-2
        backdrop-blur-sm
        sm:items-center
        sm:px-4 sm:py-6
      "
      role="presentation"
    >
      <div
        className="
          my-auto w-full max-w-md
          max-h-[94vh]
          overflow-y-auto
          rounded-2xl
          border border-amber-500/20
          bg-slate-900
          shadow-2xl
          sm:max-h-[90vh]
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="penalty-shootout-title"
      >
        {/* HEADER */}
        <div className="border-b border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm sm:h-9 sm:w-9">
              🥅
            </div>

            <div className="min-w-0">
              <h2
                id="penalty-shootout-title"
                className="text-sm font-bold text-white sm:text-base"
              >
                Definición por penales
              </h2>

              <p className="mt-0.5 text-[9px] leading-4 text-slate-500 sm:text-[10px]">
                El partido {homeScore}-{awayScore} queda empatado:
                registra quién anota cada penal hasta que haya un
                ganador.
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {/* MARCADOR DE PENALES */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:gap-3 sm:p-4">
            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-bold text-slate-200 sm:text-xs">
                {match.homeTeam.name}
              </p>
              <p className="mt-1 text-2xl font-black text-amber-300 sm:text-3xl">
                {homeCount}
              </p>
            </div>

            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 sm:text-[10px]">
              Penales
            </span>

            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-bold text-slate-200 sm:text-xs">
                {match.awayTeam.name}
              </p>
              <p className="mt-1 text-2xl font-black text-amber-300 sm:text-3xl">
                {awayCount}
              </p>
            </div>
          </div>

          {/* AGREGAR GOL */}
          <form
            className="mt-4 rounded-xl border border-white/[0.06] bg-slate-950/30 p-3"
            onSubmit={addGoal}
          >
            <div className="grid grid-cols-2 gap-1.5">
              <button
                className={`h-9 truncate rounded-lg px-2 text-[11px] font-bold transition ${
                  String(teamId) === String(match.homeTeamId)
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
                type="button"
                onClick={() => setTeamId(String(match.homeTeamId))}
              >
                {match.homeTeam.name}
              </button>

              <button
                className={`h-9 truncate rounded-lg px-2 text-[11px] font-bold transition ${
                  String(teamId) === String(match.awayTeamId)
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
                type="button"
                onClick={() => setTeamId(String(match.awayTeamId))}
              >
                {match.awayTeam.name}
              </button>
            </div>

            <select
              className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-white outline-none transition focus:border-emerald-400"
              value={selectedPlayerId}
              onChange={(event) => setSelectedPlayerId(event.target.value)}
            >
              <option value="">Selecciona un jugador...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>

            <button
              className="mt-2 h-9 w-full rounded-lg bg-emerald-500 text-[11px] font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={!selectedPlayerId}
            >
              + Gol de penal
            </button>
          </form>

          {/* PENALES REGISTRADOS */}
          {entries.length > 0 && (
            <div className="scroll-invisible mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {entries.map((entry, index) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/50 px-2.5 py-2 text-[10px]"
                  key={entry.id}
                >
                  <span className="min-w-0 flex-1 truncate text-slate-300">
                    {index + 1}. {entry.playerName}
                    <span className="ml-1 text-slate-600">
                      (
                      {entry.teamId === match.homeTeamId
                        ? match.homeTeam.name
                        : match.awayTeam.name}
                      )
                    </span>
                  </span>

                  <button
                    className="shrink-0 text-[9px] text-red-300 transition hover:text-red-200"
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {entries.length > 0 && homeCount === awayCount && (
            <p className="mt-2 text-[10px] text-amber-300">
              Sigue registrando penales hasta que un equipo quede
              arriba en el marcador.
            </p>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3 sm:px-5 sm:py-4">
          <button
            className="h-10 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-400 transition hover:bg-slate-800"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </button>

          <button
            className="h-10 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => onConfirm(entries)}
            disabled={!canSave || isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar penales"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  const [selectedTournamentId, setSelectedTournamentId] =
    useState(searchParams.get("tournamentId") ?? "");

  const [form, setForm] = useState(emptyForm);
  const [scoreForm, setScoreForm] = useState(emptyScoreForm);

  const [editingId, setEditingId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [penaltyShootout, setPenaltyShootout] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingResult, setIsConfirmingResult] =
    useState(false);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [isConfirmingPenalties, setIsConfirmingPenalties] =
    useState(false);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const [openSections, setOpenSections] = useState({
    pending: false,
    finished: false,
    cancelled: false,
  });

  /* ==============================================================
     LIVE MATCH UPDATES
  ============================================================== */

  useEffect(() => {
    function updateMatch(event) {
      const updatedMatch = event.detail;

      setMatches((current) =>
        sortMatches(
          current.map((match) =>
            match.id === updatedMatch.id
              ? updatedMatch
              : match,
          ),
        ),
      );
    }

    window.addEventListener(
      "deportiva:match-updated",
      updateMatch,
    );

    return () => {
      window.removeEventListener(
        "deportiva:match-updated",
        updateMatch,
      );
    };
  }, []);

  /* ==============================================================
     ACCORDION
  ============================================================== */

  function toggleSection(section) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  /* ==============================================================
     LOAD TOURNAMENTS
  ============================================================== */

  useEffect(() => {
    async function loadBaseData() {
      try {
        const tournamentsResponse =
          await api.get("/tournaments");

        const loadedTournaments =
          tournamentsResponse.data.data.tournaments;

        setTournaments(loadedTournaments);

        setSelectedTournamentId((current) => {
          if (current) {
            return current;
          }

          return String(loadedTournaments[0]?.id ?? "");
        });
      } catch (error) {
        notify(getApiErrorDetails(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadBaseData();
  }, [notify]);

  /* ==============================================================
     LOAD MATCHES
  ============================================================== */

  useEffect(() => {
    if (!selectedTournamentId) {
      setMatches([]);
      setTeams([]);
      return;
    }

    async function loadMatches() {
      try {
        const [
          matchesResponse,
          teamsResponse,
        ] = await Promise.all([
          api.get(
            `/tournaments/${selectedTournamentId}/matches`,
          ),
          api.get(
            `/tournaments/${selectedTournamentId}/teams`,
          ),
        ]);

        setMatches(
          sortMatches(
            matchesResponse.data.data.matches,
          ),
        );

        setTeams(
          teamsResponse.data.data.teams
            .map(({ team }) => team)
            .filter(
              (team) => team.status === "ACTIVE",
            ),
        );
      } catch (error) {
        notify(getApiErrorDetails(error));
      }
    }

    loadMatches();
  }, [notify, selectedTournamentId]);

  /* ==============================================================
     FORM
  ============================================================== */

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function startEditing(match) {
    setEditingId(match.id);

    setForm({
      homeTeamId: String(match.homeTeamId),
      awayTeamId: String(match.awayTeamId),
      date: dateValue(match.date),
      time: timeValue(match.time),
    });

    setIsScheduleOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
  }

  /* ==============================================================
     SAVE MATCH
  ============================================================== */

  async function saveMatch(event) {
    event.preventDefault();

    if (
      !form.homeTeamId ||
      !form.awayTeamId ||
      !form.date ||
      !form.time
    ) {
      notify({
        title: "Datos incompletos",
        message:
          "Completa todos los campos del partido.",
      });

      return;
    }

    if (
      String(form.homeTeamId) ===
      String(form.awayTeamId)
    ) {
      notify({
        title: "Equipos inválidos",
        message:
          "El equipo local y visitante deben ser diferentes.",
      });

      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        ...form,
        homeTeamId: Number(form.homeTeamId),
        awayTeamId: Number(form.awayTeamId),
      };

      const response = editingId
        ? await api.put(
            `/matches/${editingId}`,
            payload,
          )
        : await api.post(
            `/tournaments/${selectedTournamentId}/matches`,
            payload,
          );

      const savedMatch =
        response.data.data.match;

      setMatches((current) =>
        sortMatches(
          editingId
            ? current.map((match) =>
                match.id === editingId
                  ? savedMatch
                  : match,
              )
            : [...current, savedMatch],
        ),
      );

      notify({
        type: "success",
        title: editingId
          ? "Partido actualizado"
          : "Partido programado",
        message:
          "La operación se completó correctamente.",
      });

      cancelEditing();
      setIsScheduleOpen(false);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsSaving(false);
    }
  }

  /* ==============================================================
     GENERATE ROUND-ROBIN FIXTURES
  ============================================================== */

  const [isGeneratingFixtures, setIsGeneratingFixtures] = useState(false);

  async function generateFixtures() {
    setIsGeneratingFixtures(true);

    try {
      await api.post(
        `/tournaments/${selectedTournamentId}/matches/generate-fixtures`,
        {},
      );

      const { data } = await api.get(
        `/tournaments/${selectedTournamentId}/matches`,
      );

      setMatches(sortMatches(data.data.matches));

      notify({
        type: "success",
        title: "Fixture generado",
        message: "Se programaron todos los partidos del torneo.",
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsGeneratingFixtures(false);
    }
  }

  /* ==============================================================
     REGISTER RESULT
  ============================================================== */

  function registerResult(match, currentScore = null) {
    const homeScore = currentScore?.homeScore !== undefined && currentScore.homeScore !== ''
      ? currentScore.homeScore
      : match.homeScore ?? 0;
    const awayScore = currentScore?.awayScore !== undefined && currentScore.awayScore !== ''
      ? currentScore.awayScore
      : match.awayScore ?? 0;
    const nextScoreForm = {
      homeScore: String(homeScore),
      awayScore: String(awayScore),
    };

    setScoreForm(nextScoreForm);

    setConfirmation({
      type: "result",
      match,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
    });
  }

  /* ==============================================================
     CONFIRM RESULT
  ============================================================== */

  async function confirmResult() {
    if (
      !confirmation ||
      confirmation.type !== "result"
    ) {
      return;
    }

    const { match } = confirmation;

    const homeScore = Number(scoreForm.homeScore);
    const awayScore = Number(scoreForm.awayScore);

    if (
      !Number.isInteger(homeScore) ||
      homeScore < 0 ||
      !Number.isInteger(awayScore) ||
      awayScore < 0
    ) {
      notify({
        title: "Marcador inválido",
        message:
          "Los goles deben ser enteros mayores o iguales a cero.",
      });

      return;
    }

    setIsConfirmingResult(true);

    try {
      const { data } = await api.post(
        `/matches/${match.id}/result`,
        {
          homeScore,
          awayScore,
        },
      );

      setMatches((current) =>
        sortMatches(
          current.map((item) =>
            item.id === match.id
              ? data.data.match
              : item,
          ),
        ),
      );

      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(
          "deportiva-results",
        );

        channel.postMessage({
          tournamentId: match.tournamentId,
        });

        channel.close();
      }

      setScoreForm(emptyScoreForm);

      notify({
        type: "success",
        title:
          match.status === "FINISHED"
            ? "Marcador corregido"
            : "Resultado registrado",
        message: `${match.homeTeam.name} ${homeScore} - ${awayScore} ${match.awayTeam.name}.`,
      });

      setConfirmation(null);
    } catch (error) {
      if (error.response?.data?.code === "PENALTIES_REQUIRED") {
        setConfirmation(null);
        setPenaltyShootout({ match, homeScore, awayScore, action: "result" });
      } else {
        notify(getApiErrorDetails(error));
      }
    } finally {
      setIsConfirmingResult(false);
    }
  }

  /* ==============================================================
     POSTPONE
  ============================================================== */

  async function confirmPostpone() {
    if (!confirmation) {
      return;
    }

    const { match } = confirmation;

    setIsConfirmingAction(true);

    try {
      const { data } = await api.patch(
        `/matches/${match.id}/postpone`,
      );

      setMatches((current) =>
        sortMatches(
          current.map((item) =>
            item.id === match.id
              ? data.data.match
              : item,
          ),
        ),
      );

      setConfirmation(null);

      notify({
        type: "success",
        title: "Partido aplazado",
        message:
          "El estado del partido fue actualizado.",
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsConfirmingAction(false);
    }
  }

  async function confirmCancel() {
    if (!confirmation) {
      return;
    }

    const { match } = confirmation;

    setIsConfirmingAction(true);

    try {
      const { data } = await api.patch(
        `/matches/${match.id}/cancel`,
      );

      setMatches((current) =>
        sortMatches(
          current.map((item) =>
            item.id === match.id ? data.data.match : item,
          ),
        ),
      );

      setConfirmation(null);
      notify({
        type: "success",
        title: "Partido cancelado",
        message: "El estado del partido fue actualizado.",
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsConfirmingAction(false);
    }
  }

  async function confirmFinish() {
    if (!confirmation || confirmation.type !== "finish") {
      return;
    }

    const { match } = confirmation;
    setIsConfirmingAction(true);

    try {
      const { data } = await api.patch(`/matches/${match.id}/finish`);

      setMatches((current) =>
        sortMatches(
          current.map((item) =>
            item.id === match.id ? data.data.match : item,
          ),
        ),
      );

      setConfirmation(null);
      notify({
        type: "success",
        title: "Partido finalizado",
        message: "El resultado quedó confirmado.",
      });
    } catch (error) {
      if (error.response?.data?.code === "PENALTIES_REQUIRED") {
        setConfirmation(null);
        setPenaltyShootout({
          match,
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
          action: "finish",
        });
      } else {
        notify(getApiErrorDetails(error));
      }
    } finally {
      setIsConfirmingAction(false);
    }
  }

  /* ==============================================================
     PENALTY SHOOTOUT
  ============================================================== */

  async function confirmPenaltyShootout(entries) {
    if (!penaltyShootout) {
      return;
    }

    const { match, homeScore, awayScore, action } = penaltyShootout;
    const penalties = entries.map((entry) => ({
      teamId: entry.teamId,
      playerId: entry.playerId,
    }));

    setIsConfirmingPenalties(true);

    try {
      const { data } =
        action === "finish"
          ? await api.patch(`/matches/${match.id}/finish`, {
              penalties,
            })
          : await api.post(`/matches/${match.id}/result`, {
              homeScore,
              awayScore,
              penalties,
            });

      setMatches((current) =>
        sortMatches(
          current.map((item) =>
            item.id === match.id ? data.data.match : item,
          ),
        ),
      );

      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("deportiva-results");
        channel.postMessage({ tournamentId: match.tournamentId });
        channel.close();
      }

      setScoreForm(emptyScoreForm);
      setPenaltyShootout(null);

      notify({
        type: "success",
        title: "Definición por penales guardada",
        message: `${match.homeTeam.name} ${data.data.match.homePenaltyScore} - ${data.data.match.awayPenaltyScore} ${match.awayTeam.name} (penales).`,
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsConfirmingPenalties(false);
    }
  }

  function confirmPendingAction() {
    if (confirmation?.type === "result") {
      return confirmResult();
    }

    if (confirmation?.type === "postpone") {
      return confirmPostpone();
    }

    if (confirmation?.type === "cancel") {
      return confirmCancel();
    }

    if (confirmation?.type === "finish") {
      return confirmFinish();
    }

    return null;
  }

  /* ==============================================================
     STATUS
  ============================================================== */

  async function changeStatus(match, action) {
    if (action === "postpone" || action === "cancel" || action === "finish") {
      setConfirmation({
        type: action,
        match,
      });

      return;
    }

    try {
      const { data } = await api.patch(
        `/matches/${match.id}/${action}`,
      );

      setMatches((current) =>
        sortMatches(
          current.map((item) =>
            item.id === match.id
              ? data.data.match
              : item,
          ),
        ),
      );

      notify({
        type: "success",
        title:
          action === "cancel"
            ? "Partido cancelado"
            : "Partido actualizado",
        message:
          "El estado del partido fue actualizado.",
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  /* ==============================================================
     PERMISSIONS
  ============================================================== */

  const isAdmin =
    user.role === "ADMIN" ||
    user.role === "SUPERADMIN";

  const isTournamentLocked = Boolean(
    searchParams.get("tournamentId"),
  );

  const selectedTournament =
    tournaments.find(
      (tournament) =>
        String(tournament.id) ===
        selectedTournamentId,
    );

  const canCorrectFinished =
    user.role === "SUPERADMIN";

  /* ==============================================================
     MATCH GROUPS
  ============================================================== */

  const pendingMatches = useMemo(
    () =>
      matches
        .filter((match) =>
          [
            "SCHEDULED",
            "STARTED",
            "POSTPONED",
          ].includes(match.status),
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(a) -
            getMatchTimestamp(b),
        ),
    [matches],
  );

  const finishedMatches = useMemo(
    () =>
      matches
        .filter(
          (match) =>
            match.status === "FINISHED",
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(b) -
            getMatchTimestamp(a),
        ),
    [matches],
  );

  const cancelledMatches = useMemo(
    () =>
      matches
        .filter(
          (match) =>
            match.status === "CANCELLED",
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(a) -
            getMatchTimestamp(b),
        ),
    [matches],
  );

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">
      {/* ==========================================================
          BACKGROUND
      ========================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-emerald-500/[0.035] blur-3xl" />

        <div className="absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-cyan-500/[0.02] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <DashboardNavbar />

      {/* ==========================================================
          CONTENT
      ========================================================== */}

      <section className="relative mx-auto max-w-7xl px-3 pb-10 pt-24 sm:px-5 sm:pb-16 sm:pt-28 lg:px-8">
        {/* BACK */}

        {/* ========================================================
            HEADER
        ======================================================== */}

        <div
          className="
            mt-3
            rounded-xl
            border border-white/[0.06]
            bg-white/[0.025]
            p-4
            sm:mt-5 sm:rounded-2xl sm:p-6
          "
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <div className="min-w-0">
              {/* <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-emerald-400 sm:px-2.5 sm:text-[9px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Gestión deportiva
              </div> */}

              <h1 className="mt-2.5 text-xl font-black tracking-tight text-white sm:mt-3 sm:text-3xl">
                Partidos
              </h1>

              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500 sm:mt-1.5 sm:text-sm">
                Programa partidos, registra resultados y
                administra el calendario de tus torneos.
              </p>
            </div>

            {/* {!isLoading && matches.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-center sm:rounded-xl sm:px-4 sm:py-2.5">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-600">
                    Partidoss
                  </p>

                  <p className="mt-0.5 text-lg font-black text-white sm:text-xl">
                    {matches.length}
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/[0.03] px-3 py-2 text-center sm:rounded-xl sm:px-4 sm:py-2.5">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-600">
                    Finalizados
                  </p>

                  <p className="mt-0.5 text-lg font-black text-emerald-400 sm:text-xl">
                    {finishedMatches.length}
                  </p>
                </div>
              </div>
            )} */}
          </div>
        </div>

        {/* ========================================================
            TOURNAMENT SELECTOR
        ======================================================== */}

        <div
          className="
            mt-3.5
            rounded-xl
            border border-white/[0.06]
            bg-[#0a1018]/90
            p-3.5
            sm:mt-5 sm:rounded-2xl sm:p-5
          "
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/10 bg-emerald-400/[0.05] text-sm sm:h-9 sm:w-9">
                🏆
              </div>

              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-400 sm:text-[9px]">
                  Torneo
                </p>

                <h2 className="mt-0.5 truncate text-xs font-bold text-white sm:text-sm">
                  {isTournamentLocked
                    ? selectedTournament?.name ||
                      "Cargando torneo..."
                    : "Seleccionar torneo"}
                </h2>
              </div>
            </div> */}

            {!isTournamentLocked ? (
              <select
                className="
                  h-10 w-full
                  rounded-lg
                  border border-white/[0.08]
                  bg-black/30
                  px-3
                  text-xs text-white
                  outline-none
                  transition
                  focus:border-emerald-400/50
                  focus:ring-2 focus:ring-emerald-400/10
                  sm:h-11 sm:max-w-sm sm:rounded-xl
                "
                value={selectedTournamentId}
                onChange={(event) => {
                  setSelectedTournamentId(
                    event.target.value,
                  );

                  cancelEditing();
                  setScoreForm(emptyScoreForm);
                  setConfirmation(null);
                }}
              >
                <option value="">
                  Selecciona un torneo
                </option>

                {tournaments.map((tournament) => (
                  <option
                    key={tournament.id}
                    value={tournament.id}
                  >
                    {tournament.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="max-w-full truncate rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-2 text-[10px] font-semibold text-emerald-300 sm:text-xs">
                {selectedTournament?.name ||
                  "Cargando..."}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            GENERAR FIXTURE (todos contra todos)
        ======================================================== */}

        {isAdmin &&
          selectedTournamentId &&
          (selectedTournament?.mode ?? "ROUND_ROBIN") ===
            "ROUND_ROBIN" && (
            <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-3 sm:mt-5 sm:rounded-2xl">
              <p className="text-[11px] text-cyan-200 sm:text-xs">
                Genera automáticamente todos los partidos de todos
                contra todos.
              </p>

              <button
                className="shrink-0 rounded-lg bg-cyan-500 px-3 py-2 text-[10px] font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                type="button"
                disabled={isGeneratingFixtures}
                onClick={generateFixtures}
              >
                {isGeneratingFixtures
                  ? "Generando…"
                  : "Generar fixture"}
              </button>
            </div>
          )}

        {/* ========================================================
            PROGRAMAR PARTIDO
        ======================================================== */}

        {isAdmin && selectedTournamentId && (
          <div
            className="
              mt-3.5
              overflow-hidden
              rounded-xl
              border border-white/[0.06]
              bg-[#0a1018]/90
              sm:mt-5 sm:rounded-2xl
            "
          >
            <button
              className="
                flex w-full
                items-center justify-between
                gap-3
                px-3.5 py-3.5
                text-left
                transition
                hover:bg-white/[0.025]
                sm:px-5 sm:py-4
              "
              onClick={() =>
                setIsScheduleOpen(
                  (current) => !current,
                )
              }
              type="button"
              aria-expanded={isScheduleOpen}
            >
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-400/10 bg-blue-500/[0.06] text-sm sm:h-10 sm:w-10 sm:rounded-xl">
                  {editingId ? "✏️" : "➕"}
                </div>

                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-blue-300 sm:text-[9px]">
                    Calendario
                  </p>

                  <h2 className="mt-0.5 truncate text-xs font-bold text-white sm:text-sm">
                    {editingId
                      ? "Editar partido"
                      : "Programar partido"}
                  </h2>

                  <p className="mt-0.5 hidden text-[10px] text-slate-600 sm:block">
                    {editingId
                      ? "Modifica la información del encuentro."
                      : "Agrega un nuevo partido al calendario."}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {editingId && (
                  <span className="hidden rounded-full bg-amber-400/[0.08] px-2 py-1 text-[9px] font-bold text-amber-300 sm:inline-flex">
                    Editando
                  </span>
                )}

                <span
                  className={`
                    flex h-7 w-7
                    items-center justify-center
                    rounded-lg
                    border border-white/[0.06]
                    text-xs text-slate-500
                    transition-transform duration-300
                    sm:h-8 sm:w-8
                    ${
                      isScheduleOpen
                        ? "rotate-180"
                        : ""
                    }
                  `}
                >
                  ↓
                </span>
              </div>
            </button>

            <div
              className={`
                overflow-hidden
                transition-[max-height,opacity]
                duration-300
                ease-in-out
                ${
                  isScheduleOpen
                    ? "max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                }
              `}
            >
              <div className="border-t border-white/[0.05] p-3.5 sm:p-5">
                <form onSubmit={saveMatch}>
                  <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
                    <TeamSearch
                      label="Equipo local"
                      value={form.homeTeamId}
                      teams={teams}
                      excludeId={form.awayTeamId}
                      required
                      onChange={(homeTeamId) => {
                        setForm((prev) => ({
                          ...prev,
                          homeTeamId,
                        }));
                      }}
                    />

                    <TeamSearch
                      label="Equipo visitante"
                      value={form.awayTeamId}
                      teams={teams}
                      excludeId={form.homeTeamId}
                      required
                      onChange={(awayTeamId) => {
                        setForm((prev) => ({
                          ...prev,
                          awayTeamId,
                        }));
                      }}
                    />

                    <DateTimeField
                      label="Fecha"
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={updateField}
                    />

                    <DateTimeField
                      label="Hora"
                      type="time"
                      name="time"
                      value={form.time}
                      onChange={updateField}
                    />
                  </div>

                  <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-5 sm:flex-row sm:justify-end">
                    {editingId && (
                      <button
                        className="
                          h-10 rounded-xl
                          border border-white/[0.08]
                          px-4
                          text-xs font-semibold
                          text-slate-400
                          transition
                          hover:bg-white/[0.03]
                          hover:text-white
                          sm:h-11
                        "
                        onClick={() => {
                          cancelEditing();
                          setIsScheduleOpen(false);
                        }}
                        type="button"
                      >
                        Cancelar
                      </button>
                    )}

                    <button
                      className="
                        h-10 rounded-xl
                        bg-emerald-500
                        px-5
                        text-xs font-bold
                        text-slate-950
                        shadow-lg shadow-emerald-500/10
                        transition
                        hover:bg-emerald-400
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                        sm:h-11
                      "
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving
                        ? "Guardando..."
                        : editingId
                          ? "Guardar cambios"
                          : "Programar partido"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            CALENDARIO
        ======================================================== */}

        <section className="mt-6 sm:mt-7">
          <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />

                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-400 sm:text-[9px]">
                  Calendario
                </p>
              </div>

              <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
                Partidos
              </h2>

              <p className="mt-0.5 hidden text-[10px] text-slate-600 sm:block">
                Gestiona cada encuentro del torneo.
              </p>
            </div>

            {!isLoading && (
              <span className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[9px] font-bold text-slate-500 sm:px-2.5 sm:text-[10px]">
                {matches.length}{" "}
                {matches.length === 1
                  ? "partido"
                  : "partidos"}
              </span>
            )}
          </div>

          {/* LOADING */}

          {isLoading ? (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a1018]/90 p-8 text-center sm:rounded-2xl sm:p-10">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400 sm:h-7 sm:w-7" />

              <p className="mt-3 text-[11px] text-slate-500 sm:text-xs">
                Cargando partidos...
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.07] bg-[#0a1018]/70 p-8 text-center sm:rounded-2xl sm:p-10">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-lg">
                🏟️
              </div>

              <h3 className="mt-3 text-xs font-bold text-slate-200 sm:text-sm">
                No hay partidos
              </h3>

              <p className="mt-1 text-[10px] text-slate-600 sm:text-xs">
                No hay partidos programados para este
                torneo.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {/* ==================================================
                  PENDIENTES
              ================================================== */}

              <MatchAccordion
                title="Partidos pendientes"
                description="Programados, en vivo y aplazados"
                icon="📅"
                tone="text-amber-300"
                count={pendingMatches.length}
                isOpen={openSections.pending}
                onToggle={() =>
                  toggleSection("pending")
                }
              >
                {pendingMatches.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/[0.06] px-4 py-6 text-center">
                    <p className="text-[10px] font-medium text-slate-600 sm:text-xs">
                      No hay partidos pendientes.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                    {pendingMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        isAdmin={isAdmin}
                        canCorrectFinished={
                          canCorrectFinished
                        }
                        startEditing={startEditing}
                        registerResult={registerResult}
                        changeStatus={changeStatus}
                        tournament={selectedTournament}
                      />
                    ))}
                  </div>
                )}
              </MatchAccordion>

              {/* ==================================================
                  FINALIZADOS
              ================================================== */}

              <MatchAccordion
                title="Partidos finalizados"
                description="Resultados registrados · más recientes primero"
                icon="🏁"
                tone="text-emerald-300"
                count={finishedMatches.length}
                isOpen={openSections.finished}
                onToggle={() =>
                  toggleSection("finished")
                }
              >
                {finishedMatches.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/[0.06] px-4 py-6 text-center">
                    <p className="text-[10px] font-medium text-slate-600 sm:text-xs">
                      No hay partidos finalizados.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                    {finishedMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        isAdmin={isAdmin}
                        canCorrectFinished={
                          canCorrectFinished
                        }
                        startEditing={startEditing}
                        registerResult={registerResult}
                        changeStatus={changeStatus}
                        tournament={selectedTournament}
                      />
                    ))}
                  </div>
                )}
              </MatchAccordion>

              {/* ==================================================
                  CANCELADOS
              ================================================== */}

              <MatchAccordion
                title="Partidos cancelados"
                description="Partidos que no se disputarán"
                icon="✕"
                tone="text-red-300"
                count={cancelledMatches.length}
                isOpen={openSections.cancelled}
                onToggle={() =>
                  toggleSection("cancelled")
                }
              >
                {cancelledMatches.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/[0.06] px-4 py-6 text-center">
                    <p className="text-[10px] font-medium text-slate-600 sm:text-xs">
                      No hay partidos cancelados.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                    {cancelledMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        isAdmin={isAdmin}
                        canCorrectFinished={
                          canCorrectFinished
                        }
                        startEditing={startEditing}
                        registerResult={registerResult}
                        changeStatus={changeStatus}
                        tournament={selectedTournament}
                      />
                    ))}
                  </div>
                )}
              </MatchAccordion>
            </div>
          )}
        </section>
      </section>

      {/* ==========================================================
          MODAL
      ========================================================== */}

      {confirmation && (
        <div
          className="
            fixed inset-0 z-[60]
            flex items-end justify-center
            overflow-y-auto
            bg-slate-950/80
            px-2 py-2
            backdrop-blur-sm
            sm:items-center
            sm:px-4 sm:py-6
          "
          role="presentation"
        >
          <div
            className="
              my-auto w-full max-w-md
              max-h-[94vh]
              overflow-y-auto
              rounded-2xl
              border border-slate-700
              bg-slate-900
              shadow-2xl
              sm:max-h-[90vh]
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-confirmation-title"
          >
            {/* HEADER */}

            <div className="border-b border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm sm:h-9 sm:w-9">
                  {confirmation.type === "result"
                    ? "🏁"
                    : confirmation.type === "postpone"
                      ? "⚠️"
                      : confirmation.type === "finish"
                        ? "🏁"
                        : "✕"}
                </div>

                <div className="min-w-0">
                  <h2
                    id="match-confirmation-title"
                    className="text-sm font-bold text-white sm:text-base"
                  >
                    {confirmation.type === "result"
                      ? confirmation.match.status ===
                        "FINISHED"
                        ? "Corregir marcador"
                        : "Confirmar resultado"
                      : confirmation.type === "postpone"
                        ? "Confirmar aplazamiento"
                        : confirmation.type === "finish"
                          ? "Confirmar finalización"
                          : "Confirmar cancelación"}
                  </h2>

                  {confirmation.type === "result" && (
                    <p className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">
                      Puedes modificar el marcador
                      antes de confirmar.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CONTENT */}

            <div className="px-4 py-4 sm:px-5 sm:py-5">
              {confirmation.type === "result" ? (
                <>
                  <p className="text-[11px] leading-5 text-slate-300 sm:text-xs">
                    {confirmation.match.status ===
                    "FINISHED"
                      ? "Modifica el marcador actual y confirma el nuevo resultado."
                      : "Ingresa el marcador final del partido."}
                  </p>

                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:mt-4 sm:p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
                      {/* HOME */}

                      <div className="min-w-0 text-center">
                        <TeamLogo
                          team={confirmation.match.homeTeam}
                          size="large"
                        />

                        <p
                          className="
                            mx-auto mt-2
                            max-w-[110px]
                            truncate
                            text-[10px] font-bold
                            leading-4 text-slate-100
                            sm:max-w-[130px]
                            sm:text-xs
                          "
                          title={
                            confirmation.match.homeTeam.name
                          }
                        >
                          {
                            confirmation.match
                              .homeTeam.name
                          }
                        </p>

                        <input
                          className="
                            mx-auto mt-2 block
                            h-11 w-16
                            rounded-xl
                            border border-slate-700
                            bg-slate-900
                            px-1
                            text-center text-xl
                            font-black
                            text-emerald-300
                            outline-none
                            transition
                            focus:border-emerald-400
                            focus:ring-2
                            focus:ring-emerald-500/20
                            sm:h-12 sm:w-20 sm:text-2xl
                          "
                          type="number"
                          min="0"
                          value={scoreForm.homeScore}
                          onChange={(event) => {
                            setScoreForm(
                              (current) => ({
                                ...current,
                                homeScore:
                                  event.target.value,
                              }),
                            );
                          }}
                          aria-label={`Nuevo marcador de ${confirmation.match.homeTeam.name}`}
                        />

                        {confirmation.match.status ===
                          "FINISHED" && (
                          <p className="mt-1 text-[8px] text-slate-600 sm:text-[9px]">
                            Actual:{" "}
                            {
                              confirmation.match
                                .homeScore
                            }
                          </p>
                        )}
                      </div>

                      {/* SEPARATOR */}

                      <div className="flex h-[115px] items-center justify-center sm:h-[135px]">
                        <span className="text-base font-black text-slate-700 sm:text-lg">
                          -
                        </span>
                      </div>

                      {/* AWAY */}

                      <div className="min-w-0 text-center">
                        <TeamLogo
                          team={confirmation.match.awayTeam}
                          size="large"
                        />

                        <p
                          className="
                            mx-auto mt-2
                            max-w-[110px]
                            truncate
                            text-[10px] font-bold
                            leading-4 text-slate-100
                            sm:max-w-[130px]
                            sm:text-xs
                          "
                          title={
                            confirmation.match.awayTeam.name
                          }
                        >
                          {
                            confirmation.match
                              .awayTeam.name
                          }
                        </p>

                        <input
                          className="
                            mx-auto mt-2 block
                            h-11 w-16
                            rounded-xl
                            border border-slate-700
                            bg-slate-900
                            px-1
                            text-center text-xl
                            font-black
                            text-emerald-300
                            outline-none
                            transition
                            focus:border-emerald-400
                            focus:ring-2
                            focus:ring-emerald-500/20
                            sm:h-12 sm:w-20 sm:text-2xl
                          "
                          type="number"
                          min="0"
                          value={scoreForm.awayScore}
                          onChange={(event) => {
                            setScoreForm(
                              (current) => ({
                                ...current,
                                awayScore:
                                  event.target.value,
                              }),
                            );
                          }}
                          aria-label={`Nuevo marcador de ${confirmation.match.awayTeam.name}`}
                        />

                        {confirmation.match.status ===
                          "FINISHED" && (
                          <p className="mt-1 text-[8px] text-slate-600 sm:text-[9px]">
                            Actual:{" "}
                            {
                              confirmation.match
                                .awayScore
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {confirmation.match.status ===
                    "FINISHED" && (
                    <div className="mt-2.5 rounded-xl border border-amber-900/40 bg-amber-500/5 p-2.5 sm:mt-3 sm:p-3">
                      <p className="text-[10px] leading-5 text-amber-200 sm:text-xs">
                        ⚠️ El marcador actual es{" "}
                        <strong>
                          {
                            confirmation.match
                              .homeScore
                          }{" "}
                          -{" "}
                          {
                            confirmation.match
                              .awayScore
                          }
                        </strong>
                        . Puedes cambiarlo antes de
                        confirmar.
                      </p>
                    </div>
                  )}

                  <p className="mt-2.5 text-[9px] leading-5 text-slate-600 sm:mt-3 sm:text-[10px]">
                    Al confirmar, el resultado se
                    guardará y afectará la tabla de
                    posiciones.
                  </p>
                </>
              ) : confirmation.type === "postpone" ? (
                <>
                  <p className="text-[11px] leading-5 text-slate-300 sm:text-xs">
                    ¿Confirmas aplazar el partido entre{" "}
                    <strong className="text-amber-200">
                      {confirmation.match.homeTeam.name}
                    </strong>{" "}
                    y{" "}
                    <strong className="text-amber-200">
                      {confirmation.match.awayTeam.name}
                    </strong>
                    ?
                  </p>

                  <div className="mt-3 rounded-xl border border-amber-900/40 bg-amber-500/5 p-2.5 sm:mt-4 sm:p-3">
                    <p className="text-[10px] leading-5 text-amber-200 sm:text-xs">
                      ℹ️ El partido quedará como aplazado
                      y no afectará la tabla de
                      posiciones.
                    </p>
                  </div>
                </>
              ) : confirmation.type === "finish" ? (
                <p className="text-[11px] leading-5 text-slate-300 sm:text-xs">
                  ¿Confirmas finalizar el partido entre{" "}
                  <strong className="text-emerald-200">
                    {confirmation.match.homeTeam.name}
                  </strong>{" "}
                  y{" "}
                  <strong className="text-emerald-200">
                    {confirmation.match.awayTeam.name}
                  </strong>
                  ? El marcador actual quedará registrado como resultado final.
                </p>
              ) : (
                <p className="text-[11px] leading-5 text-slate-300 sm:text-xs">
                  ¿Confirmas cancelar el partido entre{" "}
                  <strong className="text-red-200">
                    {confirmation.match.homeTeam.name}
                  </strong>{" "}
                  y{" "}
                  <strong className="text-red-200">
                    {confirmation.match.awayTeam.name}
                  </strong>
                  ? El partido quedará cancelado y no afectará la tabla de
                  posiciones.
                </p>
              )}
            </div>

            {/* BUTTONS */}

            <div className="grid grid-cols-2 gap-2 border-t border-slate-800 bg-slate-950/30 px-4 py-3 sm:flex sm:justify-end sm:px-5">
              <button
                className="
                  h-10 rounded-xl
                  border border-slate-700
                  px-3
                  text-[10px] font-semibold
                  text-slate-300
                  transition
                  hover:border-slate-500
                  hover:text-white
                  disabled:opacity-50
                  sm:px-4 sm:text-xs
                "
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  setScoreForm(emptyScoreForm);
                }}
                disabled={isConfirmingResult || isConfirmingAction}
              >
                Cancelar
              </button>

              <button
                className="
                  h-10 rounded-xl
                  bg-emerald-500
                  px-3
                  text-[10px] font-bold
                  text-slate-950
                  transition
                  hover:bg-emerald-400
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:px-4 sm:text-xs
                "
                type="button"
                onClick={confirmPendingAction}
                disabled={isConfirmingResult || isConfirmingAction}
              >
                {isConfirmingResult
                  ? "Guardando..."
                  : confirmation.type === "result"
                    ? "Confirmar marcador"
                    : confirmation.type === "postpone"
                      ? "Aplazar partido"
                      : confirmation.type === "finish"
                        ? "Finalizar partido"
                        : "Cancelar partido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {penaltyShootout && (
        <PenaltyShootoutModal
          shootout={penaltyShootout}
          onCancel={() => setPenaltyShootout(null)}
          onConfirm={confirmPenaltyShootout}
          isSaving={isConfirmingPenalties}
        />
      )}
    </main>
  );
}
