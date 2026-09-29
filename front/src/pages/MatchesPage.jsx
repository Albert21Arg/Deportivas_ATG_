import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import ConfirmActionModal from "../components/ConfirmActionModal.jsx";
import GenerateFixtureModal from "../components/GenerateFixtureModal.jsx";
import StartMatchModal from "../components/StartMatchModal.jsx";
import DashboardNavbar from "../components/DashboardNavbar.jsx";
import FutbolIcon from "../components/FutbolIcon.jsx";
import api from "../services/api.js";
import { getApiErrorDetails } from "../utils/api-error.js";
import { getMatchClock } from "../utils/match-clock.js";

const emptyForm = {
  homeTeamId: "",
  awayTeamId: "",
  date: "",
  time: "",
  streamUrl: "",
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
  SCHEDULED:
    "border-blue-400/20 bg-blue-400/[0.08] text-blue-700 dark:text-blue-300",
  STARTED:
    "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-700 dark:text-emerald-300",
  FINISHED:
    "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-700 dark:text-emerald-300",
  POSTPONED:
    "border-amber-400/20 bg-amber-400/[0.08] text-amber-700 dark:text-amber-300",
  CANCELLED:
    "border-red-400/20 bg-red-400/[0.08] text-red-700 dark:text-red-300",
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

// "Fecha N" automática, igual que en la página pública del torneo: cada día
// con partidos de liga/grupos (programados, en juego o finalizados) es una
// fecha, numerada en orden cronológico. Las eliminatorias no se numeran.
function buildRoundNumbers(matches) {
  const dates = [
    ...new Set(
      matches
        .filter(
          (match) =>
            !match.tieId &&
            ["SCHEDULED", "STARTED", "FINISHED"].includes(match.status),
        )
        .map((match) => dateValue(match.date))
        .filter(Boolean),
    ),
  ].sort();

  return new Map(dates.map((date, index) => [date, index + 1]));
}

// Agrupa partidos ya ordenados por día, manteniendo ese orden.
function groupMatchesByDay(matches) {
  const groups = new Map();

  matches.forEach((match) => {
    const date = dateValue(match.date);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(match);
  });

  return [...groups.entries()];
}

function getMatchTimestamp(match) {
  const date = dateValue(match.date);
  const time = timeValue(match.time);

  if (!date) {
    return 0;
  }

  return new Date(
    `${date}T${time || "00:00"}:00`,
  ).getTime();
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

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 4h8v4a4 4 0 0 1-8 0V4Z"
      />
      <path
        strokeLinecap="round"
        d="M8 6H5a2 2 0 0 0 2 5h1M16 6h3a2 2 0 0 1-2 5h-1M12 12v5M9 21h6M10 17h4"
      />
    </svg>
  );
}

function LiveIcon() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-5 w-5 animate-ping rounded-full bg-emerald-400/20" />
      <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

/* ================================================================
   TEAM LOGO
================================================================ */

function TeamLogo({ team, size = "normal" }) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses =
    size === "large"
      ? "h-16 w-16 sm:h-20 sm:w-20"
      : size === "small"
        ? "h-7 w-7 sm:h-8 sm:w-8"
        : "h-11 w-11 sm:h-14 sm:w-14 lg:h-16 lg:w-16";

  if (!team?.logo || hasError) {
    return (
      <div
        className={`
          mx-auto flex ${sizeClasses}
          items-center justify-center
          rounded-full
          border border-slate-200 dark:border-white/[0.06]
          bg-slate-100 dark:bg-white/[0.025]
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
      className={`mx-auto ${sizeClasses} object-contain`}
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
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{label}</span>

        <div className="relative mt-1.5">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <SearchIcon />
          </div>

          <input
            className="
              box-border block h-11 w-full
              appearance-none rounded-xl
              border border-slate-200 dark:border-white/[0.08]
              bg-white dark:bg-[#080d14]
              pl-10 pr-10
              text-sm text-slate-900 dark:text-white
              outline-none
              transition
              hover:border-slate-300 hover:dark:border-white/[0.12]
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
            rounded-xl border border-slate-200 dark:border-white/[0.08]
            bg-white dark:bg-[#080d14]
            p-1.5 shadow-xl shadow-black/30
          "
        >
          {matchingTeams.length ? (
            matchingTeams.map((team) => (
              <button
                className="
                  flex w-full items-center gap-2
                  rounded-lg px-2.5 py-2.5
                  text-left text-xs text-slate-700 dark:text-slate-200
                  transition
                  hover:bg-emerald-400/10
                  hover:text-emerald-700 hover:dark:text-emerald-300
                "
                key={team.id}
                type="button"
                onClick={() => selectTeam(team)}
              >
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt=""
                    className="h-6 w-6 shrink-0 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
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
              className="h-6 w-6 shrink-0 object-contain"
              loading="lazy"
            />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs">
              ⚽
            </span>
          )}

          <span
            className="min-w-0 flex-1 truncate text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
            title={selectedTeam.name}
          >
            {selectedTeam.name}
          </span>

          <button
            className="shrink-0 text-[10px] text-slate-500 transition hover:text-slate-900 hover:dark:text-white"
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
   DATE / TIME
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
    <label className="block min-w-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <span>{label}</span>

      <div className="relative mt-1.5">
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-500">
          <Icon />
        </div>

        <input
          className="
            box-border block h-11 w-full min-w-0
            appearance-none rounded-xl
            border border-slate-200 dark:border-white/[0.08]
            bg-white dark:bg-[#080d14]
            px-3 pl-10
            text-sm text-slate-900 dark:text-white
            outline-none
            transition
            hover:border-slate-300 hover:dark:border-white/[0.12]
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
   PANEL DE GOLEADORES Y TARJETAS
   ----------------------------------------------------------------
   variant="live": se usa mientras el partido está en vivo, incluye
   la corrección manual del marcador (requiere partido iniciado).

   variant="finished": el admin puede registrar goleadores/tarjetas
   de un partido ya finalizado (por ejemplo, si solo cargó el
   resultado final con "Resultado" y quiere agregar el detalle en
   otro momento). No toca el marcador final, que ya quedó fijo.
================================================================ */

function MatchEventsPanel({
  match,
  blueCardEnabled = true,
  variant = "live",
}) {
  const { notify } = useNotifications();

  const [teamId, setTeamId] = useState(
    String(match.homeTeamId),
  );

  const [players, setPlayers] = useState([]);
  const [type, setType] = useState("GOAL");
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState(null);
  const [minute, setMinute] = useState("");
  const [isPlayerPickerOpen, setIsPlayerPickerOpen] =
    useState(false);

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
          .filter(
            (event) => event.type === "RED_CARD",
          )
          .map((event) => event.playerId),
      ),
    [currentMatch.events],
  );

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return players.filter(
      (item) =>
        !expelled.has(item.id) &&
        item.name
          .toLowerCase()
          .includes(normalizedQuery),
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

  const isLiveVariant = variant === "live";

  return (
    <div className="mt-4 space-y-2.5 border-t border-slate-200 dark:border-white/[0.05] pt-3.5 sm:space-y-3 sm:pt-4">
      {!isLiveVariant && (
        <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] p-2.5 sm:p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-cyan-300">
            Goleadores y tarjetas
          </p>

          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Registra aquí quién anotó y qué tarjetas hubo en este
            partido finalizado. Esto no cambia el marcador final.
          </p>
        </div>
      )}

      <form
        className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-950/30 p-2.5 sm:p-3"
        onSubmit={saveCard}
      >
        <div
          className={`grid gap-1.5 ${
            blueCardEnabled
              ? "grid-cols-5"
              : "grid-cols-4"
          }`}
        >
          <button
            className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition sm:h-16 ${
              type === "GOAL"
                ? "bg-emerald-400 text-slate-950 dark:text-slate-950"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-700"
            }`}
            type="button"
            onClick={() => {
              setType("GOAL");
              setPlayer(null);
              setQuery("");
            }}
          >
            <span className="text-xl sm:text-2xl">⚽</span>
            <span>Gol</span>
          </button>

          <button
            className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition sm:h-16 ${
              type === "OWN_GOAL"
                ? "bg-orange-400 text-slate-950 dark:text-slate-950"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-700"
            }`}
            type="button"
            onClick={() => {
              setType("OWN_GOAL");
              setPlayer(null);
              setQuery("");
            }}
          >
            <FutbolIcon
              className={`h-6 w-6 sm:h-7 sm:w-7 ${
                type === "OWN_GOAL"
                  ? "text-red-600"
                  : "text-red-500"
              }`}
            />
            <span>Autogol</span>
          </button>

          <button
            className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition sm:h-16 ${
              type === "YELLOW_CARD"
                ? "bg-amber-400 text-slate-950 dark:text-slate-950"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-700"
            }`}
            type="button"
            onClick={() => {
              setType("YELLOW_CARD");
              setPlayer(null);
              setQuery("");
            }}
          >
            <span className="text-xl sm:text-2xl">🟨</span>
            <span>Amarilla</span>
          </button>

          <button
            className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition sm:h-16 ${
              type === "RED_CARD"
                ? "bg-red-500 text-slate-900 dark:text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-700"
            }`}
            type="button"
            onClick={() => {
              setType("RED_CARD");
              setPlayer(null);
              setQuery("");
            }}
          >
            <span className="text-xl sm:text-2xl">🟥</span>
            <span>Roja</span>
          </button>

          {blueCardEnabled && (
            <button
              className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition sm:h-16 ${
                type === "BLUE_CARD"
                  ? "bg-blue-500 text-slate-900 dark:text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-700"
              }`}
              type="button"
              onClick={() => {
                setType("BLUE_CARD");
                setPlayer(null);
                setQuery("");
              }}
            >
              <span className="text-xl sm:text-2xl">🟦</span>
              <span>Azul</span>
            </button>
          )}
        </div>

        {isOwnGoal && (
          <p className="mt-1.5 text-[11px] leading-4 text-orange-700 dark:text-orange-300">
            Autogol: el jugador debe pertenecer a{" "}
            {rivalTeamName}.
          </p>
        )}

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
              String(teamId) === String(match.homeTeamId)
                ? "border-emerald-400/40 bg-emerald-400/10"
                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 hover:dark:bg-slate-700"
            }`}
            type="button"
            onClick={() => {
              setTeamId(String(match.homeTeamId));
              setPlayer(null);
              setQuery("");
            }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-950">
              <TeamLogo team={match.homeTeam} size="small" />
            </span>

            <span
              className={`min-w-0 truncate text-[11px] font-bold ${
                String(teamId) === String(match.homeTeamId)
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {match.homeTeam.name}
            </span>
          </button>

          <button
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
              String(teamId) === String(match.awayTeamId)
                ? "border-emerald-400/40 bg-emerald-400/10"
                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 hover:dark:bg-slate-700"
            }`}
            type="button"
            onClick={() => {
              setTeamId(String(match.awayTeamId));
              setPlayer(null);
              setQuery("");
            }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-950">
              <TeamLogo team={match.awayTeam} size="small" />
            </span>

            <span
              className={`min-w-0 truncate text-[11px] font-bold ${
                String(teamId) === String(match.awayTeamId)
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {match.awayTeam.name}
            </span>
          </button>
        </div>

        <button
          className="mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-left text-xs outline-none transition hover:border-emerald-400/50"
          type="button"
          onClick={() => {
            setQuery("");
            setIsPlayerPickerOpen(true);
          }}
        >
          <span
            className={`min-w-0 truncate ${
              player
                ? "text-slate-900 dark:text-white"
                : "text-slate-600"
            }`}
          >
            {player ? player.name : "Buscar jugador..."}
          </span>

          <span className="shrink-0 text-slate-500">
            🔍
          </span>
        </button>

        {isPlayerPickerOpen && createPortal(
          <div
            className="fixed inset-0 z-[70] flex bg-slate-950/80 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsPlayerPickerOpen(false);
              }
            }}
          >
            <section
              className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-slate-900 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="player-picker-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.06] px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-950">
                    <TeamLogo
                      team={
                        String(teamId) ===
                        String(match.homeTeamId)
                          ? match.homeTeam
                          : match.awayTeam
                      }
                      size="small"
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Seleccionar jugador
                    </p>

                    <h3
                      id="player-picker-title"
                      className="truncate text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {String(teamId) ===
                      String(match.homeTeamId)
                        ? match.homeTeam.name
                        : match.awayTeam.name}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsPlayerPickerOpen(false)
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.06] text-slate-500 transition hover:bg-slate-100 hover:dark:bg-slate-800"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="border-b border-slate-200 dark:border-white/[0.06] p-3">
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
                  placeholder="Buscar jugador..."
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-500">
                    No hay jugadores disponibles.
                  </p>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPlayer(item);
                        setQuery(item.name);
                        setIsPlayerPickerOpen(false);
                      }}
                      className={`block w-full truncate rounded-lg px-3 py-2.5 text-left text-xs transition ${
                        player?.id === item.id
                          ? "bg-emerald-400/10 font-bold text-emerald-700 dark:text-emerald-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:dark:bg-slate-800"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))
                )}
              </div>
            </section>
          </div>,
          document.body
        )}

        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input
            className="h-10 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
            type="number"
            min="0"
            max="130"
            placeholder="Minuto"
            value={minute}
            onChange={(event) =>
              setMinute(event.target.value)
            }
          />

          <button
            className="rounded-lg bg-amber-400 px-3 text-[10px] font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!player}
          >
            Registrar
          </button>
        </div>
      </form>

      <div className="space-y-1.5">
        {(currentMatch.events ?? []).map((event) => (
          <div
            className="flex min-w-0 items-center gap-2 rounded-lg bg-white dark:bg-slate-950/50 px-2.5 py-2 text-[10px]"
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
                      ? (
                        <FutbolIcon className="h-3.5 w-3.5 text-red-500" />
                      )
                      : "⚽"}
            </span>

            <span className="shrink-0 text-slate-500">
              {event.minute != null
                ? `${event.minute}'`
                : "—"}
            </span>

            <span
              className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-300"
              title={
                event.player?.name ??
                event.team?.name
              }
            >
              {event.player?.name ??
                event.team?.name}
              {event.type === "OWN_GOAL" &&
                " (autogol)"}
            </span>

            <button
              className="shrink-0 text-[11px] text-red-700 dark:text-red-300 transition hover:text-red-700 hover:dark:text-red-200"
              type="button"
              onClick={() =>
                setEventToRemove(event)
              }
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <ConfirmActionModal
        isOpen={Boolean(eventToRemove)}
        title="¿Eliminar evento?"
        message={
          isLiveVariant
            ? "El evento se quitará del registro en vivo de este partido."
            : "El evento se quitará del registro de este partido finalizado."
        }
        confirmLabel="Sí, eliminar"
        isLoading={isRemovingEvent}
        onCancel={() => setEventToRemove(null)}
        onConfirm={() =>
          removeEvent(eventToRemove.id)
        }
      />
    </div>
  );
}

/* ================================================================
   CRONÓMETRO DEL PARTIDO
   ----------------------------------------------------------------
   Se re-renderiza solo (setInterval) cada segundo mientras el partido
   está en vivo, para que el minuto avance sin depender de que llegue un
   evento nuevo del partido.
================================================================ */

function LiveMatchClock({ match, className = '' }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (match.status !== 'STARTED') return undefined;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [match.status, match.periodStartedAt, match.currentPeriod, match.halfDurationMinutes]);

  const clock = getMatchClock(match);
  if (!clock) return null;

  return (
    <span className={className}>
      {clock.label}
      <span className="ml-1 text-slate-500">
        {clock.period === 1 ? '1T' : '2T'}
      </span>
    </span>
  );
}

/* ================================================================
   MATCH CARD PREMIUM
================================================================ */

// Botones de acción de la tarjeta: 44px de alto en celular (tamaño mínimo
// cómodo para el dedo), más compactos desde tablet.
const actionButtonClass =
  "min-h-11 rounded-lg px-3 text-xs transition sm:min-h-9 sm:text-[11px]";

const menuItemClass =
  "min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.04] sm:min-h-9 sm:text-xs";

function MatchCard({
  match,
  isAdmin,
  canCorrectFinished,
  startEditing,
  registerResult,
  changeStatus,
  startNextPeriod,
  addExtraTime,
  updateStreamUrl,
  tournament,
}) {
  const [localScore, setLocalScore] = useState({
    homeScore: "",
    awayScore: "",
  });

  const [isEditingStream, setIsEditingStream] =
    useState(false);
  const [streamDraft, setStreamDraft] = useState(
    match.streamUrl ?? "",
  );

  const [showFinishedEvents, setShowFinishedEvents] =
    useState(false);

  const [showMoreActions, setShowMoreActions] =
    useState(false);

  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "STARTED";
  const isPostponed = match.status === "POSTPONED";
  const isCancelled = match.status === "CANCELLED";

  const canEdit =
    !isCancelled &&
    (!isFinished || canCorrectFinished);

  const hasCurrentScore =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

  const showScore = isFinished || isLive;

  function handleRegisterResult() {
    registerResult(match, localScore);
  }

  return (
    <article
      id={`match-${match.id}`}
      className={`
        scroll-mt-40
        group relative overflow-hidden
        rounded-2xl
        border
        bg-white dark:bg-[#0b111a]
        shadow-2xl shadow-black/20
        transition-all duration-300
        hover:-translate-y-0.5
        ${
          isLive
            ? "border-emerald-400/25 shadow-emerald-950/20"
            : isPostponed
              ? "border-amber-400/15"
              : isCancelled
                ? "border-red-400/10 opacity-90"
                : "border-slate-200 dark:border-white/[0.07] hover:border-slate-300 hover:dark:border-white/[0.12]"
        }
      `}
    >
      {/* PREMIUM GLOW */}
      <div
        className={`
          pointer-events-none absolute -right-20 -top-20
          h-40 w-40 rounded-full blur-3xl
          ${
            isLive
              ? "bg-emerald-400/10"
              : isPostponed
                ? "bg-amber-400/[0.06]"
                : "bg-cyan-400/[0.025]"
          }
        `}
      />

      {/* TOP ACCENT */}
      <div
        className={`
          absolute inset-x-0 top-0 h-[2px]
          ${
            isLive
              ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
              : isPostponed
                ? "bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
                : isFinished
                  ? "bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
                  : "bg-slate-200 dark:bg-white/[0.06]"
          }
        `}
      />

      {/* HEADER */}
      <div className="relative border-b border-slate-200 dark:border-white/[0.05] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isLive ? (
                <LiveIcon />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-white/[0.035] text-[11px]">
                  ⚽
                </span>
              )}

              <span className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {isLive
                  ? "Partido en vivo"
                  : isFinished
                    ? "Partido finalizado"
                    : isPostponed
                      ? "Partido aplazado"
                      : "Próximo partido"}
              </span>

              {isLive && (
                <LiveMatchClock
                  match={match}
                  className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-black text-red-600 dark:text-red-400"
                />
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
              <span>{formatMatchDate(match.date)}</span>

              <span className="text-slate-700">
                •
              </span>

              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {timeValue(match.time) || "--:--"}
              </span>
            </div>
          </div>

          <span
            className={`
              shrink-0 rounded-full border
              px-2.5 py-1.5
              text-[10px] font-bold
              ${statusStyles[match.status] ??
              "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}
            `}
          >
            {statusLabels[match.status] ??
              match.status}
          </span>
        </div>
      </div>

      {/* MATCH BODY */}
      <div className="relative px-4 pb-4 pt-5">
        <div className="grid grid-cols-[1fr_76px_1fr] items-center gap-2">
          {/* HOME */}
          <div className="min-w-0 text-center">
            <TeamLogo team={match.homeTeam} />

            <h3
              className="mx-auto mt-3 max-w-[125px] truncate text-xs font-bold text-slate-900 dark:text-white sm:max-w-[145px] sm:text-sm"
              title={match.homeTeam.name}
            >
              {match.homeTeam.name}
            </h3>

            {showScore ? (
              <p
                className={`
                  mt-2 text-3xl font-black leading-none
                  sm:text-4xl
                  ${
                    isLive
                      ? "text-slate-900 dark:text-white"
                      : "text-emerald-700 dark:text-emerald-300"
                  }
                `}
              >
                {hasCurrentScore
                  ? match.homeScore
                  : 0}
              </p>
            ) : canEdit ? (
              <input
                className="mx-auto mt-2 block h-10 w-14 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center text-lg font-black text-slate-900 dark:text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                type="number"
                min="0"
                placeholder="0"
                value={localScore.homeScore}
                onChange={(event) =>
                  setLocalScore((current) => ({
                    ...current,
                    homeScore:
                      event.target.value,
                  }))
                }
              />
            ) : null}
          </div>

          {/* CENTER */}
          <div className="flex flex-col items-center justify-center">
            {isLive ? (
              <>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  LIVE
                </span>

                <div className="my-1 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/10 bg-emerald-400/[0.04]">
                  <span className="text-sm font-black text-slate-500">
                    -
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-600">
                  EN JUEGO
                </span>
              </>
            ) : isFinished ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  FINAL
                </span>

                <div className="my-1 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/10 bg-emerald-400/[0.03]">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    VS
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-600">
                  RESULTADO
                </span>
              </>
            ) : isPostponed ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
                  PAUSA
                </span>

                <div className="my-1 flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/10 bg-amber-400/[0.04]">
                  <span className="text-sm">
                    ⏸
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-600">
                  PENDIENTE
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
                  VS
                </span>

                <div className="my-1 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-950">
                  <span className="text-[10px] font-black text-slate-500">
                    VS
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-700">
                  PRÓXIMO
                </span>
              </>
            )}
          </div>

          {/* AWAY */}
          <div className="min-w-0 text-center">
            <TeamLogo team={match.awayTeam} />

            <h3
              className="mx-auto mt-3 max-w-[125px] truncate text-xs font-bold text-slate-900 dark:text-white sm:max-w-[145px] sm:text-sm"
              title={match.awayTeam.name}
            >
              {match.awayTeam.name}
            </h3>

            {showScore ? (
              <p
                className={`
                  mt-2 text-3xl font-black leading-none
                  sm:text-4xl
                  ${
                    isLive
                      ? "text-slate-900 dark:text-white"
                      : "text-emerald-700 dark:text-emerald-300"
                  }
                `}
              >
                {hasCurrentScore
                  ? match.awayScore
                  : 0}
              </p>
            ) : canEdit ? (
              <input
                className="mx-auto mt-2 block h-10 w-14 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center text-lg font-black text-slate-900 dark:text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                type="number"
                min="0"
                placeholder="0"
                value={localScore.awayScore}
                onChange={(event) =>
                  setLocalScore((current) => ({
                    ...current,
                    awayScore:
                      event.target.value,
                  }))
                }
              />
            ) : null}
          </div>
        </div>

        {/* FINISHED RESULT */}
        {isFinished && hasCurrentScore && (
          <div className="mt-4 flex justify-center">
            <div className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.035] px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              Resultado final{" "}
              <span className="mx-1.5 text-slate-700">
                •
              </span>
              {match.homeScore} -{" "}
              {match.awayScore}
              {match.homePenaltyScore != null &&
                match.awayPenaltyScore != null && (
                  <span className="ml-1.5 text-amber-700 dark:text-amber-300">
                    P({match.homePenaltyScore}-
                    {match.awayPenaltyScore})
                  </span>
                )}
            </div>
          </div>
        )}

        {/* GOLEADORES Y TARJETAS (partido finalizado) */}
        {isFinished && isAdmin && (
          <div className="mt-4">
            <button
              className="min-h-11 w-full rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-2 sm:min-h-0 text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-cyan-300 transition hover:bg-cyan-400/[0.08]"
              onClick={() =>
                setShowFinishedEvents(
                  (current) => !current,
                )
              }
              type="button"
            >
              {showFinishedEvents
                ? "▲ Ocultar goleadores y tarjetas"
                : "⚽ Agregar goleadores y tarjetas"}
            </button>

            {showFinishedEvents && (
              <MatchEventsPanel
                match={match}
                blueCardEnabled={
                  tournament?.blueCardEnabled ?? true
                }
                variant="finished"
              />
            )}
          </div>
        )}

        {/* POSTPONED INFO */}
        {isPostponed && (
          <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/[0.035] px-3 py-2.5 text-center">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-200">
              Este partido está aplazado
            </p>

            <p className="mt-0.5 text-[10px] text-slate-600">
              Puedes reprogramarlo cuando tengas nueva fecha.
            </p>
          </div>
        )}

        {/* LIVE */}
        {isLive && (
          <MatchEventsPanel
            match={match}
            blueCardEnabled={
              tournament?.blueCardEnabled ?? true
            }
            variant="live"
          />
        )}
      </div>

      {/* ACTIONS
          Solo la acción principal según el estado queda a la vista (en
          celular, botones de 44px de alto); lo demás va en "⋯ Más", con
          lo destructivo al final para no tocarlo por error. */}
      {isAdmin && canEdit && (
        <div className="border-t border-slate-200 dark:border-white/[0.05] bg-slate-100 dark:bg-black/10 p-2.5">
          <div className="flex flex-wrap gap-1.5 sm:justify-center">
            {match.status === "SCHEDULED" && (
              <button
                className={`${actionButtonClass} flex-1 bg-red-500 font-bold text-white hover:bg-red-400`}
                onClick={() => changeStatus(match, "start")}
                type="button"
              >
                🔴 Iniciar
              </button>
            )}

            {isLive && (
              <button
                className={`${actionButtonClass} flex-1 bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400`}
                onClick={() => changeStatus(match, "finish")}
                type="button"
              >
                Finalizar
              </button>
            )}

            {isLive && (match.currentPeriod ?? 1) === 1 && (
              <button
                className={`${actionButtonClass} flex-1 border border-emerald-500/60 bg-emerald-500/10 font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300`}
                onClick={() => startNextPeriod(match)}
                type="button"
              >
                ⏭️ Segundo tiempo
              </button>
            )}

            {isPostponed && (
              <button
                className={`${actionButtonClass} flex-1 border border-amber-500/50 bg-amber-500/10 font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-200`}
                onClick={() => startEditing(match)}
                type="button"
              >
                ✏️ Re-programar
              </button>
            )}

            {(match.status === "SCHEDULED" || isFinished) && (
              <button
                className={`${actionButtonClass} flex-1 bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400`}
                onClick={handleRegisterResult}
                type="button"
              >
                🏁 {isFinished ? "Corregir" : "Resultado"}
              </button>
            )}

            <button
              className={`${actionButtonClass} shrink-0 border border-slate-300 font-bold text-slate-700 hover:border-slate-400 dark:border-white/[0.1] dark:text-slate-300`}
              onClick={() => setShowMoreActions((current) => !current)}
              type="button"
              aria-expanded={showMoreActions}
              aria-label="Más acciones"
            >
              ⋯ Más
            </button>
          </div>

          {isLive && (
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                + tiempo:
              </span>
              {[1, 2, 5].map((minutes) => (
                <button
                  key={minutes}
                  className="min-h-11 min-w-11 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 transition hover:border-amber-400 hover:text-amber-600 dark:border-white/[0.08] dark:text-slate-300 dark:hover:text-amber-300 sm:min-h-9 sm:min-w-9"
                  onClick={() => addExtraTime(match, minutes)}
                  type="button"
                >
                  +{minutes}&apos;
                </button>
              ))}
            </div>
          )}

          {showMoreActions && (
            <div className="mt-2 grid gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-white/[0.06] dark:bg-[#080d14]">
              {isLive && (
                <button
                  className={menuItemClass}
                  onClick={() => {
                    setStreamDraft(match.streamUrl ?? "");
                    setIsEditingStream((current) => !current);
                    setShowMoreActions(false);
                  }}
                  type="button"
                >
                  🔗 {match.streamUrl ? "Editar enlace en vivo" : "Agregar enlace en vivo"}
                </button>
              )}

              {!isLive && !isPostponed && (
                <button
                  className={menuItemClass}
                  onClick={() => {
                    setShowMoreActions(false);
                    startEditing(match);
                  }}
                  type="button"
                >
                  ✏️ Editar partido
                </button>
              )}

              {isPostponed && (
                <button
                  className={menuItemClass}
                  onClick={() => {
                    setShowMoreActions(false);
                    handleRegisterResult();
                  }}
                  type="button"
                >
                  🏁 Registrar resultado
                </button>
              )}

              {!isFinished && !isPostponed && (
                <button
                  className={`${menuItemClass} text-amber-700 dark:text-amber-200`}
                  onClick={() => {
                    setShowMoreActions(false);
                    changeStatus(match, "postpone");
                  }}
                  type="button"
                >
                  ⏸️ Aplazar
                </button>
              )}

              <button
                className={`${menuItemClass} mt-1 border-t border-slate-200 text-red-700 dark:border-white/[0.06] dark:text-red-300`}
                onClick={() => {
                  setShowMoreActions(false);
                  changeStatus(match, "cancel");
                }}
                type="button"
              >
                ✕ Cancelar partido
              </button>
            </div>
          )}

          {isEditingStream && (
            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
              <input
                className="h-9 w-full min-w-0 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#080d14] px-2.5 text-[11px] text-slate-900 dark:text-white outline-none focus:border-emerald-400/50"
                type="url"
                value={streamDraft}
                onChange={(event) =>
                  setStreamDraft(event.target.value)
                }
                placeholder="https://youtube.com/..., https://facebook.com/..."
                autoFocus
              />

              <div className="flex shrink-0 gap-1.5">
                <button
                  className="h-9 rounded-lg bg-emerald-500 px-3 text-[10px] font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400"
                  type="button"
                  onClick={async () => {
                    await updateStreamUrl(
                      match,
                      streamDraft.trim(),
                    );
                    setIsEditingStream(false);
                  }}
                >
                  Guardar
                </button>

                <button
                  className="h-9 rounded-lg border border-slate-200 dark:border-white/[0.08] px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 transition hover:text-slate-900 hover:dark:text-white"
                  type="button"
                  onClick={() =>
                    setIsEditingStream(false)
                  }
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ================================================================
   ACCORDION PREMIUM
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
  id,
}) {
  return (
    <section
      id={id}
      className="
        scroll-mt-40
        overflow-hidden
        rounded-2xl
        border border-slate-200 dark:border-white/[0.07]
        bg-white dark:bg-[#0a1018]/90
        shadow-xl shadow-black/10
      "
    >
      <button
        className="
          flex w-full
          items-center justify-between
          gap-3
          px-4 py-4
          text-left
          transition
          hover:bg-slate-100 hover:dark:bg-white/[0.025]
          sm:px-5 sm:py-4.5
        "
        onClick={onToggle}
        type="button"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              flex h-10 w-10 shrink-0
              items-center justify-center
              rounded-xl
              border border-slate-200 dark:border-white/[0.06]
              bg-slate-100 dark:bg-white/[0.025]
              text-sm
            "
          >
            {icon}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`truncate text-xs font-bold sm:text-sm ${tone}`}
              >
                {title}
              </h3>

              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.05] bg-slate-100 dark:bg-slate-800/70 px-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:text-[11px]">
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
            flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-lg
            border border-slate-200 dark:border-white/[0.06]
            bg-slate-50 dark:bg-white/[0.015]
            text-xs text-slate-500
            transition-transform duration-300
            ${isOpen ? "rotate-180" : ""}
          `}
        >
          ↓
        </span>
      </button>

      {/*
        grid-template-rows (0fr/1fr) en vez de max-height fijo: con muchos
        partidos el contenido real supera cualquier max-height fijo (p.ej.
        max-h-[6000px]) y queda cortado sin poder hacer scroll, porque el
        wrapper tiene overflow-hidden. El truco de grid con fr anima igual
        de suave pero siempre ajusta al alto real del contenido.
      */}
      <div
        className={`
          grid
          transition-[grid-template-rows,opacity]
          duration-300
          ease-in-out
          ${
            isOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }
        `}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-200 dark:border-white/[0.05] p-2.5 sm:p-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   DATE ACCORDION (una fecha dentro de "Partidos finalizados")
================================================================ */

function DateAccordion({
  roundNumber,
  date,
  count,
  isOpen,
  onToggle,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.015]">
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-100 hover:dark:bg-white/[0.03] sm:px-4 sm:py-3"
        onClick={onToggle}
        type="button"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300 sm:text-xs">
            {roundNumber ? `Fecha ${roundNumber}` : formatMatchDate(date)}
          </span>
          {roundNumber && (
            <span className="truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
              · {formatMatchDate(date)}
            </span>
          )}
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-1.5 text-[11px] font-bold text-slate-500 dark:border-white/[0.05] dark:bg-slate-800/70 dark:text-slate-400">
            {count}
          </span>
        </div>

        <span
          className={`text-xs text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        >
          ↓
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-200 p-2.5 dark:border-white/[0.05] sm:p-3">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   FINISHED MATCH ROW (celular: una línea por partido; al tocarla se
   despliega la tarjeta completa con goleadores, tarjetas y acciones)
================================================================ */

function FinishedMatchRow({ match, isExpanded, onToggle, children }) {
  const hasPenalties =
    match.homePenaltyScore != null && match.awayPenaltyScore != null;

  return (
    <div>
      <button
        className={`grid min-h-12 w-full grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
          isExpanded
            ? "border-emerald-400/40 bg-emerald-400/[0.06]"
            : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/[0.06] dark:bg-[#0b111a]"
        }`}
        onClick={onToggle}
        type="button"
        aria-expanded={isExpanded}
      >
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {match.homeTeam.name}
          </span>
          <span className="shrink-0"><TeamLogo team={match.homeTeam} size="small" /></span>
        </span>

        <span className="flex flex-col items-center">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-black tabular-nums text-emerald-700 dark:bg-white/[0.05] dark:text-emerald-300">
            {match.homeScore ?? 0} - {match.awayScore ?? 0}
          </span>
          {hasPenalties && (
            <span className="mt-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              P({match.homePenaltyScore}-{match.awayPenaltyScore})
            </span>
          )}
        </span>

        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0"><TeamLogo team={match.awayTeam} size="small" /></span>
          <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {match.awayTeam.name}
          </span>
        </span>
      </button>

      {isExpanded && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

// true en pantallas de celular (menos de 640px, el breakpoint "sm" de
// Tailwind). Se actualiza si se gira el teléfono o se cambia el tamaño.
function useIsMobile() {
  const query = "(max-width: 639px)";
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event) => setIsMobile(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

/* ================================================================
   EMPTY SECTION
================================================================ */

function EmptySection({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-black/10 px-4 py-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.025] text-sm">
        ✦
      </div>

      <p className="mt-2 text-[10px] font-medium text-slate-600 sm:text-xs">
        {message}
      </p>
    </div>
  );
}

/* ================================================================
   PREMIUM STATS
================================================================ */

function StatCard({
  label,
  value,
  icon,
  tone = "text-slate-900 dark:text-white",
  accent = "border-slate-200 dark:border-white/[0.06]",
}) {
  return (
    <div
      className={`
        relative overflow-hidden
        rounded-2xl
        border ${accent}
        bg-white dark:bg-[#0a1018]/90
        p-4
      `}
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-slate-50 dark:bg-white/[0.02] blur-2xl" />

      <div className="relative flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.03] text-xs">
          {icon}
        </span>

        <span className={`text-2xl font-black ${tone}`}>
          {value}
        </span>
      </div>

      <p className="relative mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
        {label}
      </p>
    </div>
  );
}

/* ================================================================
   PENALTY SHOOTOUT MODAL
================================================================ */

function PenaltyShootoutModal({
  shootout,
  onCancel,
  onConfirm,
  isSaving,
}) {
  const { match, homeScore, awayScore } =
    shootout;

  const [teamId, setTeamId] = useState(
    String(match.homeTeamId),
  );

  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] =
    useState("");
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    let cancelled = false;

    api
      .get(
        `/tournaments/${match.tournamentId}/teams/${teamId}/players`,
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
    (entry) =>
      entry.teamId === match.homeTeamId,
  ).length;

  const awayCount = entries.filter(
    (entry) =>
      entry.teamId === match.awayTeamId,
  ).length;

  const canSave =
    entries.length > 0 &&
    homeCount !== awayCount;

  function addGoal(event) {
    event.preventDefault();

    if (!selectedPlayerId) return;

    const player = players.find(
      (item) =>
        String(item.id) ===
        selectedPlayerId,
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
    setEntries((current) =>
      current.filter(
        (entry) => entry.id !== id,
      ),
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-white dark:bg-slate-950/85 px-2 py-2 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
      <div
        className="my-auto w-full max-w-md max-h-[94vh] overflow-y-auto rounded-2xl border border-amber-500/20 bg-white dark:bg-slate-900 shadow-2xl sm:max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="penalty-shootout-title"
      >
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.06] text-sm">
              🥅
            </div>

            <div className="min-w-0">
              <h2
                id="penalty-shootout-title"
                className="text-sm font-bold text-slate-900 dark:text-white sm:text-base"
              >
                Definición por penales
              </h2>

              <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-[10px]">
                El partido {homeScore}-
                {awayScore} queda empatado.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 sm:gap-3 sm:p-4">
            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200 sm:text-xs">
                {match.homeTeam.name}
              </p>

              <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300 sm:text-3xl">
                {homeCount}
              </p>
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 sm:text-[10px]">
              Penales
            </span>

            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200 sm:text-xs">
                {match.awayTeam.name}
              </p>

              <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300 sm:text-3xl">
                {awayCount}
              </p>
            </div>
          </div>

          <form
            className="mt-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-slate-950/30 p-3"
            onSubmit={addGoal}
          >
            <div className="grid grid-cols-2 gap-1.5">
              <button
                className={`h-9 truncate rounded-lg px-2 text-[11px] font-bold transition ${
                  String(teamId) ===
                  String(match.homeTeamId)
                    ? "bg-emerald-400 text-slate-950 dark:text-slate-950"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-700"
                }`}
                type="button"
                onClick={() =>
                  setTeamId(
                    String(match.homeTeamId),
                  )
                }
              >
                {match.homeTeam.name}
              </button>

              <button
                className={`h-9 truncate rounded-lg px-2 text-[11px] font-bold transition ${
                  String(teamId) ===
                  String(match.awayTeamId)
                    ? "bg-emerald-400 text-slate-950 dark:text-slate-950"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-700"
                }`}
                type="button"
                onClick={() =>
                  setTeamId(
                    String(match.awayTeamId),
                  )
                }
              >
                {match.awayTeam.name}
              </button>
            </div>

            <select
              className="mt-2 h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-xs text-slate-900 dark:text-white outline-none transition focus:border-emerald-400"
              value={selectedPlayerId}
              onChange={(event) =>
                setSelectedPlayerId(
                  event.target.value,
                )
              }
            >
              <option value="">
                Selecciona un jugador...
              </option>

              {players.map((player) => (
                <option
                  key={player.id}
                  value={player.id}
                >
                  {player.name}
                </option>
              ))}
            </select>

            <button
              className="mt-2 h-9 w-full rounded-lg bg-emerald-500 text-[11px] font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={!selectedPlayerId}
            >
              + Gol de penal
            </button>
          </form>

          {entries.length > 0 && (
            <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {entries.map((entry, index) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-950/50 px-2.5 py-2 text-[10px]"
                  key={entry.id}
                >
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
                    {index + 1}.{" "}
                    {entry.playerName}

                    <span className="ml-1 text-slate-600">
                      (
                      {entry.teamId ===
                      match.homeTeamId
                        ? match.homeTeam.name
                        : match.awayTeam.name}
                      )
                    </span>
                  </span>

                  <button
                    className="shrink-0 text-[11px] text-red-700 dark:text-red-300 transition hover:text-red-700 hover:dark:text-red-200"
                    type="button"
                    onClick={() =>
                      removeEntry(entry.id)
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          {entries.length > 0 &&
            homeCount === awayCount && (
              <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
                Sigue registrando penales hasta que
                un equipo quede arriba.
              </p>
            )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-5 sm:py-4">
          <button
            className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:dark:bg-slate-800"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </button>

          <button
            className="h-10 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() =>
              onConfirm(entries)
            }
            disabled={!canSave || isSaving}
          >
            {isSaving
              ? "Guardando..."
              : "Guardar penales"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
================================================================ */

export default function MatchesPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] =
    useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  const [selectedTournamentId, setSelectedTournamentId] =
    useState(
      searchParams.get("tournamentId") ?? "",
    );

  const [form, setForm] = useState(emptyForm);
  const [scoreForm, setScoreForm] =
    useState(emptyScoreForm);

  const [editingId, setEditingId] =
    useState(null);

  const [confirmation, setConfirmation] =
    useState(null);

  const [startingMatch, setStartingMatch] = useState(null);
  const [isStartingMatch, setIsStartingMatch] = useState(false);

  const [penaltyShootout, setPenaltyShootout] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isConfirmingResult, setIsConfirmingResult] =
    useState(false);

  const [isConfirmingAction, setIsConfirmingAction] =
    useState(false);

  const [isConfirmingPenalties, setIsConfirmingPenalties] =
    useState(false);

  const [isGeneratingFixtures, setIsGeneratingFixtures] =
    useState(false);

  const [isConfirmingGenerateFixtures, setIsConfirmingGenerateFixtures] =
    useState(false);

  const [isConfirmingDeleteFixtures, setIsConfirmingDeleteFixtures] =
    useState(false);

  const [isDeletingFixtures, setIsDeletingFixtures] =
    useState(false);

  const [isScheduleOpen, setIsScheduleOpen] =
    useState(false);

  const [isFixtureSectionOpen, setIsFixtureSectionOpen] =
    useState(false);

  const [openSections, setOpenSections] =
    useState({
      live: true,
      pending: false,
      postponed: false,
      finished: false,
      cancelled: false,
    });

  // Fechas desplegadas dentro de "Próximos" y "Finalizados". Solo se
  // guarda lo que el usuario cambió ("pending:AAAA-MM-DD" -> true/false);
  // si no tocó una fecha, vale lo que diga su valor por defecto (en
  // Próximos, la fecha más cercana abierta; en Finalizados, todas cerradas).
  const [dateToggles, setDateToggles] = useState({});

  // Partido finalizado desplegado en la vista de filas (celular).
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const isMobile = useIsMobile();

  function isDateOpen(section, date, defaultOpen = false) {
    if (matchSearch.trim()) return true;
    const key = `${section}:${date}`;
    return key in dateToggles ? dateToggles[key] : defaultOpen;
  }

  function toggleDate(section, date, defaultOpen = false) {
    const key = `${section}:${date}`;
    setDateToggles((current) => ({
      ...current,
      [key]: !(key in current ? current[key] : defaultOpen),
    }));
  }

  const [matchSearch, setMatchSearch] = useState("");

  /* ==============================================================
     LIVE UPDATES
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
          tournamentsResponse.data.data
            .tournaments;

        setTournaments(loadedTournaments);

        setSelectedTournamentId((current) => {
          if (current) return current;

          return String(
            loadedTournaments[0]?.id ?? "",
          );
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
              (team) =>
                team.status === "ACTIVE",
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
      [event.target.name]:
        event.target.value,
    }));
  }

  function startEditing(match) {
    setEditingId(match.id);

    setForm({
      homeTeamId: String(match.homeTeamId),
      awayTeamId: String(match.awayTeamId),
      date: dateValue(match.date),
      time: timeValue(match.time),
      streamUrl: match.streamUrl ?? "",
    });

    setIsScheduleOpen(true);
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
        homeTeamId: Number(
          form.homeTeamId,
        ),
        awayTeamId: Number(
          form.awayTeamId,
        ),
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
     GENERATE FIXTURE
  ============================================================== */

  async function generateFixtures({ startDate, time, intervalDays }) {
    setIsGeneratingFixtures(true);

    try {
      await api.post(
        `/tournaments/${selectedTournamentId}/matches/generate-fixtures`,
        { startDate, time, intervalDays },
      );

      const { data } = await api.get(
        `/tournaments/${selectedTournamentId}/matches`,
      );

      setMatches(
        sortMatches(data.data.matches),
      );

      notify({
        type: "success",
        title: "Fixture generado",
        message:
          "Se programaron todos los partidos del torneo.",
      });

      setIsConfirmingGenerateFixtures(false);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsGeneratingFixtures(false);
    }
  }

  /* ==============================================================
     DELETE FIXTURE
  ============================================================== */

  async function deleteFixtures() {
    setIsDeletingFixtures(true);

    try {
      await api.delete(
        `/tournaments/${selectedTournamentId}/matches/fixtures`,
      );

      const { data } = await api.get(
        `/tournaments/${selectedTournamentId}/matches`,
      );

      setMatches(
        sortMatches(data.data.matches),
      );

      notify({
        type: "success",
        title: "Fixture eliminado",
        message:
          "Se eliminaron los partidos generados automáticamente.",
      });

      setIsConfirmingDeleteFixtures(false);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsDeletingFixtures(false);
    }
  }

  /* ==============================================================
     REGISTER RESULT
  ============================================================== */

  function registerResult(
    match,
    currentScore = null,
  ) {
    const homeScore =
      currentScore?.homeScore !==
        undefined &&
      currentScore.homeScore !== ""
        ? currentScore.homeScore
        : match.homeScore ?? 0;

    const awayScore =
      currentScore?.awayScore !==
        undefined &&
      currentScore.awayScore !== ""
        ? currentScore.awayScore
        : match.awayScore ?? 0;

    setScoreForm({
      homeScore: String(homeScore),
      awayScore: String(awayScore),
    });

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

    const homeScore = Number(
      scoreForm.homeScore,
    );

    const awayScore = Number(
      scoreForm.awayScore,
    );

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

      if (
        typeof BroadcastChannel !==
        "undefined"
      ) {
        const channel =
          new BroadcastChannel(
            "deportiva-results",
          );

        channel.postMessage({
          tournamentId:
            match.tournamentId,
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
      if (
        error.response?.data?.code ===
        "PENALTIES_REQUIRED"
      ) {
        setConfirmation(null);

        setPenaltyShootout({
          match,
          homeScore,
          awayScore,
          action: "result",
        });
      } else {
        notify(
          getApiErrorDetails(error),
        );
      }
    } finally {
      setIsConfirmingResult(false);
    }
  }

  /* ==============================================================
     POSTPONE
  ============================================================== */

  async function confirmPostpone() {
    if (!confirmation) return;

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

  /* ==============================================================
     CANCEL
  ============================================================== */

  async function confirmCancel() {
    if (!confirmation) return;

    const { match } = confirmation;

    setIsConfirmingAction(true);

    try {
      const { data } = await api.patch(
        `/matches/${match.id}/cancel`,
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
        title: "Partido cancelado",
        message:
          "El estado del partido fue actualizado.",
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsConfirmingAction(false);
    }
  }

  /* ==============================================================
     FINISH
  ============================================================== */

  async function confirmFinish() {
    if (
      !confirmation ||
      confirmation.type !== "finish"
    ) {
      return;
    }

    const { match } = confirmation;

    setIsConfirmingAction(true);

    try {
      const { data } = await api.patch(
        `/matches/${match.id}/finish`,
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
        title: "Partido finalizado",
        message:
          "El resultado quedó confirmado.",
      });
    } catch (error) {
      if (
        error.response?.data?.code ===
        "PENALTIES_REQUIRED"
      ) {
        setConfirmation(null);

        setPenaltyShootout({
          match,
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
          action: "finish",
        });
      } else {
        notify(
          getApiErrorDetails(error),
        );
      }
    } finally {
      setIsConfirmingAction(false);
    }
  }

  /* ==============================================================
     PENALTIES
  ============================================================== */

  async function confirmPenaltyShootout(
    entries,
  ) {
    if (!penaltyShootout) return;

    const {
      match,
      homeScore,
      awayScore,
      action,
    } = penaltyShootout;

    const penalties = entries.map(
      (entry) => ({
        teamId: entry.teamId,
        playerId: entry.playerId,
      }),
    );

    setIsConfirmingPenalties(true);

    try {
      const { data } =
        action === "finish"
          ? await api.patch(
              `/matches/${match.id}/finish`,
              {
                penalties,
              },
            )
          : await api.post(
              `/matches/${match.id}/result`,
              {
                homeScore,
                awayScore,
                penalties,
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

      if (
        typeof BroadcastChannel !==
        "undefined"
      ) {
        const channel =
          new BroadcastChannel(
            "deportiva-results",
          );

        channel.postMessage({
          tournamentId:
            match.tournamentId,
        });

        channel.close();
      }

      setScoreForm(emptyScoreForm);
      setPenaltyShootout(null);

      notify({
        type: "success",
        title:
          "Definición por penales guardada",
        message: `${match.homeTeam.name} ${data.data.match.homePenaltyScore} - ${data.data.match.awayPenaltyScore} ${match.awayTeam.name} (penales).`,
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsConfirmingPenalties(false);
    }
  }

  /* ==============================================================
     CONFIRM ACTION
  ============================================================== */

  function confirmPendingAction() {
    if (confirmation?.type === "result") {
      return confirmResult();
    }

    if (
      confirmation?.type === "postpone"
    ) {
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

  async function changeStatus(
    match,
    action,
  ) {
    if (
      action === "postpone" ||
      action === "cancel" ||
      action === "finish"
    ) {
      setConfirmation({
        type: action,
        match,
      });

      return;
    }

    if (action === "start") {
      setStartingMatch(match);
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

  async function confirmStartMatch(halfDurationMinutes) {
    if (!startingMatch) return;

    setIsStartingMatch(true);

    try {
      const { data } = await api.patch(
        `/matches/${startingMatch.id}/start`,
        { halfDurationMinutes },
      );

      setMatches((current) =>
        sortMatches(
          current.map((item) =>
            item.id === startingMatch.id
              ? data.data.match
              : item,
          ),
        ),
      );

      setOpenSections((current) => ({
        ...current,
        live: true,
        pending: false,
      }));

      notify({
        type: "success",
        title: "Partido iniciado",
        message: `Cada tiempo dura ${halfDurationMinutes} minutos.`,
      });

      setStartingMatch(null);
    } catch (error) {
      notify(getApiErrorDetails(error));
    } finally {
      setIsStartingMatch(false);
    }
  }

  async function startNextPeriod(match) {
    try {
      const { data } = await api.patch(
        `/matches/${match.id}/next-period`,
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
        title: "Segundo tiempo iniciado",
        message: "El cronómetro se reinició para el segundo tiempo.",
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  async function addExtraTime(match, minutes) {
    try {
      const { data } = await api.patch(
        `/matches/${match.id}/extra-time`,
        { minutes },
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
        title: "Tiempo extra agregado",
        message: `+${minutes} minuto${minutes === 1 ? "" : "s"} de tiempo extra.`,
      });
    } catch (error) {
      notify(getApiErrorDetails(error));
    }
  }

  async function updateStreamUrl(match, streamUrl) {
    try {
      const { data } = await api.put(
        `/matches/${match.id}`,
        { streamUrl },
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
        title: "Enlace actualizado",
        message: streamUrl
          ? "El enlace de transmisión en vivo se guardó correctamente."
          : "Se quitó el enlace de transmisión en vivo.",
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
    user.role === "ADMIN" ||
    user.role === "SUPERADMIN";

  /* ==============================================================
     GROUPS
  ============================================================== */

  // Independiente de la búsqueda: el resumen de arriba (Total/En vivo/
  // Finalizados) siempre refleja el torneo completo, no el filtro.
  const allFinishedCount = useMemo(
    () => matches.filter((match) => match.status === "FINISHED").length,
    [matches],
  );

  const filteredMatches = useMemo(() => {
    const query = matchSearch.trim().toLowerCase();

    if (!query) {
      return matches;
    }

    return matches.filter(
      (match) =>
        match.homeTeam.name.toLowerCase().includes(query) ||
        match.awayTeam.name.toLowerCase().includes(query),
    );
  }, [matches, matchSearch]);

  const pendingMatches = useMemo(
    () =>
      filteredMatches
        .filter(
          (match) =>
            match.status === "SCHEDULED",
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(a) -
            getMatchTimestamp(b),
        ),
    [filteredMatches],
  );

  const postponedMatches = useMemo(
    () =>
      filteredMatches
        .filter(
          (match) =>
            match.status === "POSTPONED",
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(a) -
            getMatchTimestamp(b),
        ),
    [filteredMatches],
  );

  const finishedMatches = useMemo(
    () =>
      filteredMatches
        .filter(
          (match) =>
            match.status === "FINISHED",
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(b) -
            getMatchTimestamp(a),
        ),
    [filteredMatches],
  );

  // Numeración sobre TODOS los partidos del torneo (no solo los que pasan
  // el buscador), para que "Fecha N" no cambie al filtrar.
  const roundNumbers = useMemo(
    () => buildRoundNumbers(matches),
    [matches],
  );

  const finishedMatchesByDate = useMemo(
    () => groupMatchesByDay(finishedMatches),
    [finishedMatches],
  );

  const pendingMatchesByDate = useMemo(
    () => groupMatchesByDay(pendingMatches),
    [pendingMatches],
  );

  const cancelledMatches = useMemo(
    () =>
      filteredMatches
        .filter(
          (match) =>
            match.status === "CANCELLED",
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(a) -
            getMatchTimestamp(b),
        ),
    [filteredMatches],
  );

  const liveMatches = useMemo(
    () =>
      filteredMatches
        .filter(
          (match) =>
            match.status === "STARTED",
        )
        .sort(
          (a, b) =>
            getMatchTimestamp(a) -
            getMatchTimestamp(b),
        ),
    [filteredMatches],
  );

  const liveMatchesCount = useMemo(
    () =>
      matches.filter(
        (match) => match.status === "STARTED",
      ).length,
    [matches],
  );

  // Para la barra fija de celular: todos los partidos en juego del torneo
  // (sin importar la búsqueda); se muestra el primero.
  const allLiveMatches = matches.filter((match) => match.status === "STARTED");
  const currentLiveMatch = allLiveMatches[0] ?? null;

  const sectionShortcuts = [
    { key: "live", label: "En vivo", count: liveMatches.length, className: "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300" },
    { key: "pending", label: "Próximos", count: pendingMatches.length, className: "border-blue-400/30 bg-blue-500/[0.06] text-blue-700 dark:text-blue-300" },
    { key: "postponed", label: "Aplazados", count: postponedMatches.length, className: "border-amber-400/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300" },
    { key: "finished", label: "Finalizados", count: finishedMatches.length, className: "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300" },
    { key: "cancelled", label: "Cancelados", count: cancelledMatches.length, className: "border-slate-300 bg-white text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300" },
  ];

  function jumpToSection(section, targetId = `matches-${section}`) {
    setOpenSections((current) => ({ ...current, [section]: true }));
    // Espera a que la sección se despliegue antes de desplazar.
    requestAnimationFrame(() => {
      document
        .getElementById(targetId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function renderMatchCard(match) {
    return (
      <MatchCard
        key={match.id}
        match={match}
        isAdmin={isAdmin}
        canCorrectFinished={canCorrectFinished}
        startEditing={startEditing}
        registerResult={registerResult}
        changeStatus={changeStatus}
        startNextPeriod={startNextPeriod}
        addExtraTime={addExtraTime}
        updateStreamUrl={updateStreamUrl}
        tournament={selectedTournament}
      />
    );
  }

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <main className="lm-ready min-h-screen bg-slate-50 text-slate-900 dark:bg-[#05090e] dark:text-slate-100">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/[0.045] blur-3xl" />

        <div className="absolute right-[-10rem] top-[30%] h-96 w-96 rounded-full bg-cyan-500/[0.025] blur-3xl" />

        <div className="absolute bottom-[-10rem] left-[35%] h-80 w-80 rounded-full bg-blue-500/[0.02] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <DashboardNavbar />

      <section className="relative mx-auto max-w-[1500px] px-3 pb-12 pt-24 sm:px-5 sm:pb-16 sm:pt-28 lg:px-8">
        {/* BACK */}
        <Link
          className="group mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-600 hover:dark:text-emerald-400"
          to={selectedTournamentId ? `/dashboard/tournaments/${selectedTournamentId}` : "/dashboard/tournaments"}
        >
          <span className="text-base transition-transform duration-200 group-hover:-translate-x-1">
            ←
          </span>

          Volver al torneo
        </Link>

        {/* ======================================================
            HERO
        ====================================================== */}

        <div className="hidden overflow-hidden rounded-3xl border border-slate-200 dark:border-white/[0.07] bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 dark:from-[#101923] dark:via-[#0a111a] dark:to-[#070c12] shadow-2xl shadow-black/5 dark:shadow-black/20 sm:relative sm:block">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-400/[0.045] blur-3xl" />

          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Gestión deportiva
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
                  Partidos
                </h1>

                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                  Controla el calendario, resultados y
                  partidos en vivo desde un solo lugar.
                </p>
              </div>

              {!isLoading &&
                selectedTournamentId && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[360px]">
                    <StatCard
                      label="Total"
                      value={matches.length}
                      icon="⚽"
                    />

                    <StatCard
                      label="En vivo"
                      value={liveMatchesCount}
                      icon="●"
                      tone="text-emerald-600 dark:text-emerald-400"
                      accent="border-emerald-400/10"
                    />

                    <StatCard
                      label="Finalizados"
                      value={
                        allFinishedCount
                      }
                      icon="✓"
                      tone="text-slate-900 dark:text-cyan-300"
                      accent="border-cyan-400/10"
                    />
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* ======================================================
            TOURNAMENT
        ====================================================== */}

        <div className="hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 p-3.5 shadow-xl shadow-black/10 sm:mt-5 sm:block sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-700 dark:text-emerald-300">
                <TrophyIcon />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                  Competición
                </p>

                <h2 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                  {isTournamentLocked
                    ? selectedTournament?.name ||
                      "Cargando torneo..."
                    : "Seleccionar torneo"}
                </h2>
              </div>
            </div>

            {!isTournamentLocked ? (
              <select
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-200 dark:bg-black/30 px-3 text-xs text-slate-900 dark:text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10 sm:max-w-sm"
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

                {tournaments.map(
                  (tournament) => (
                    <option
                      key={tournament.id}
                      value={tournament.id}
                    >
                      {tournament.name}
                    </option>
                  ),
                )}
              </select>
            ) : (
              <div className="max-w-full truncate rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-2.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 sm:text-xs">
                {selectedTournament?.name ||
                  "Cargando..."}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================
            GENERATE FIXTURE (acordeón cerrado por defecto)
        ====================================================== */}

        {isAdmin &&
          selectedTournamentId &&
          (selectedTournament?.mode ??
            "ROUND_ROBIN") ===
            "ROUND_ROBIN" && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 shadow-xl shadow-black/10 sm:mt-5">
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-100 hover:dark:bg-white/[0.025] sm:px-5"
                onClick={() =>
                  setIsFixtureSectionOpen(
                    (current) => !current,
                  )
                }
                type="button"
                aria-expanded={isFixtureSectionOpen}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-500/[0.06] text-sm">
                    ⚡
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-900 dark:text-cyan-400">
                      Automatización
                    </p>

                    <h2 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                      Generar fixture
                    </h2>

                    <p className="mt-0.5 hidden text-[10px] text-slate-600 sm:block">
                      Crea automáticamente los partidos de todos contra todos.
                    </p>
                  </div>
                </div>

                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 transition-transform ${
                    isFixtureSectionOpen
                      ? "rotate-180"
                      : ""
                  }`}
                >
                  ↓
                </span>
              </button>

              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                  isFixtureSectionOpen
                    ? "max-h-[400px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-white/[0.05] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-[11px] text-slate-600 dark:text-cyan-100 sm:text-xs">
                    Solo agrega los enfrentamientos que aún no existen, sin importar quién fue local o visitante en un partido ya creado.
                  </p>

                  <div className="flex shrink-0 gap-2">
                    <button
                      className="rounded-xl bg-cyan-500 px-4 py-2.5 text-[10px] font-bold text-slate-950 dark:text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                      type="button"
                      disabled={isGeneratingFixtures}
                      onClick={() =>
                        setIsConfirmingGenerateFixtures(true)
                      }
                    >
                      {isGeneratingFixtures
                        ? "Generando…"
                        : "Generar fixture"}
                    </button>

                    {matches.length > 0 && (
                      <button
                        className="rounded-xl border border-red-400/25 bg-red-400/[0.06] px-4 py-2.5 text-[10px] font-bold text-red-700 dark:text-red-300 transition hover:bg-red-400/[0.12] disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                        type="button"
                        disabled={isDeletingFixtures}
                        onClick={() =>
                          setIsConfirmingDeleteFixtures(true)
                        }
                      >
                        {isDeletingFixtures
                          ? "Eliminando…"
                          : "Eliminar fixture"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* ======================================================
            SCHEDULE — botón que abre una modal
        ====================================================== */}

        {isAdmin && selectedTournamentId && (
          <div className="mt-4 sm:mt-5">
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 px-4 py-4 text-left shadow-xl shadow-black/10 transition hover:bg-slate-100 hover:dark:bg-white/[0.025] sm:px-5"
              onClick={() => setIsScheduleOpen(true)}
              type="button"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/[0.06] text-sm">
                ＋
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                  Calendario
                </p>

                <h2 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                  Programar partido
                </h2>

                <p className="mt-0.5 hidden text-[10px] text-slate-600 sm:block">
                  Añade un nuevo encuentro del torneo.
                </p>
              </div>
            </button>
          </div>
        )}

        {isScheduleOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/80 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                cancelEditing();
                setIsScheduleOpen(false);
              }
            }}
          >
            <section
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018] shadow-2xl shadow-black/20 dark:shadow-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="schedule-match-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.06] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/[0.06] text-sm">
                    {editingId ? "✏️" : "＋"}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                      Calendario
                    </p>

                    <h2
                      id="schedule-match-title"
                      className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white"
                    >
                      {editingId
                        ? "Editar partido"
                        : "Programar partido"}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    cancelEditing();
                    setIsScheduleOpen(false);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.06] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 hover:dark:bg-slate-800 hover:dark:text-white"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 sm:p-5">
                <form onSubmit={saveMatch}>
                  <div className="grid gap-3.5 md:grid-cols-2">
                    <TeamSearch
                      label="Equipo local"
                      value={form.homeTeamId}
                      teams={teams}
                      excludeId={
                        form.awayTeamId
                      }
                      required
                      onChange={(
                        homeTeamId,
                      ) =>
                        setForm((prev) => ({
                          ...prev,
                          homeTeamId,
                        }))
                      }
                    />

                    <TeamSearch
                      label="Equipo visitante"
                      value={form.awayTeamId}
                      teams={teams}
                      excludeId={
                        form.homeTeamId
                      }
                      required
                      onChange={(
                        awayTeamId,
                      ) =>
                        setForm((prev) => ({
                          ...prev,
                          awayTeamId,
                        }))
                      }
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

                    <label className="block min-w-0 text-xs font-semibold text-slate-500 dark:text-slate-400 md:col-span-2">
                      <span>Enlace de transmisión en vivo (opcional)</span>

                      <input
                        className="mt-1.5 h-11 w-full min-w-0 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#080d14] px-3 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                        type="url"
                        name="streamUrl"
                        value={form.streamUrl}
                        onChange={updateField}
                        placeholder="https://youtube.com/..., https://facebook.com/..."
                      />

                      <span className="mt-1.5 block text-[11px] font-normal text-slate-500">
                        Se muestra como botón &quot;Ver en vivo&quot; mientras el partido está en curso.
                      </span>
                    </label>
                  </div>

                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      className="h-11 rounded-xl border border-slate-200 dark:border-white/[0.08] px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:dark:bg-white/[0.03] hover:text-slate-900 hover:dark:text-white"
                      onClick={() => {
                        cancelEditing();
                        setIsScheduleOpen(false);
                      }}
                      type="button"
                    >
                      Cancelar
                    </button>

                    <button
                      className="h-11 rounded-xl bg-emerald-500 px-5 text-xs font-bold text-slate-950 dark:text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
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
            </section>
          </div>
        )}

        {/* ======================================================
            CALENDAR HEADER
        ====================================================== */}

        <section className="mt-7 sm:mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Centro de partidos
                </p>
              </div>

              <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                Calendario
              </h2>

              <p className="mt-1 text-[10px] text-slate-600 sm:text-xs">
                Todos los encuentros organizados por estado.
              </p>
            </div>

            {!isLoading && (
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Total
                </p>

                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {matches.length}
                </p>
              </div>
            )}
          </div>

          {/* SEARCH */}
          {!isLoading && selectedTournamentId && matches.length > 0 && (
            <div className="sticky top-[64px] z-30 -mx-4 mb-4 bg-slate-50/95 px-4 py-2.5 backdrop-blur dark:bg-[#070b12]/95 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none sm:dark:bg-transparent">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  🔎
                </span>

                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  type="search"
                  value={matchSearch}
                  onChange={(event) => setMatchSearch(event.target.value)}
                  placeholder="Buscar partido por equipo..."
                  aria-label="Buscar partido por equipo"
                />
              </div>

              {/* Accesos rápidos: abren la sección y saltan a ella. */}
              <nav
                className="scroll-invisible -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
                aria-label="Ir a una sección de partidos"
              >
                {sectionShortcuts
                  .filter((section) => section.count > 0)
                  .map((section) => (
                    <button
                      key={section.key}
                      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${section.className}`}
                      onClick={() => jumpToSection(section.key)}
                      type="button"
                    >
                      {section.key === "live" && (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      )}
                      {section.label}
                      <span className="rounded-full bg-black/[0.06] px-1.5 text-[10px] font-bold dark:bg-white/[0.08]">
                        {section.count}
                      </span>
                    </button>
                  ))}
              </nav>
            </div>
          )}

          {/* LOADING */}

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a1018]/90 p-12 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-emerald-400" />

              <p className="mt-3 text-xs text-slate-500">
                Cargando partidos...
              </p>
            </div>
          ) : !selectedTournamentId ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#0a1018]/70 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.03] text-lg">
                🏆
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                Selecciona un torneo
              </h3>

              <p className="mt-1 text-xs text-slate-600">
                Selecciona una competición para ver sus partidos.
              </p>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#0a1018]/70 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.03] text-lg">
                🏟️
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                No hay partidos
              </h3>

              <p className="mt-1 text-xs text-slate-600">
                Todavía no hay partidos programados para este torneo.
              </p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#0a1018]/70 p-10 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Ningún partido coincide con tu búsqueda.
              </p>

              <button
                className="mt-2 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                type="button"
                onClick={() => setMatchSearch("")}
              >
                Quitar búsqueda
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* ==================================================
                  EN VIVO
              ================================================== */}

              <MatchAccordion
                id="matches-live"
                title="Partidos en vivo"
                description="Encuentros que se están jugando en este momento"
                icon="🔴"
                tone="text-emerald-700 dark:text-emerald-300"
                count={liveMatches.length}
                isOpen={openSections.live}
                onToggle={() =>
                  toggleSection("live")
                }
              >
                {liveMatches.length === 0 ? (
                  <EmptySection message="No hay partidos en vivo en este momento." />
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {liveMatches.map(
                      (match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isAdmin={isAdmin}
                          canCorrectFinished={
                            canCorrectFinished
                          }
                          startEditing={
                            startEditing
                          }
                          registerResult={
                            registerResult
                          }
                          changeStatus={
                            changeStatus
                          }
                          startNextPeriod={
                            startNextPeriod
                          }
                          addExtraTime={
                            addExtraTime
                          }
                          updateStreamUrl={
                            updateStreamUrl
                          }
                          tournament={
                            selectedTournament
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </MatchAccordion>

              {/* ==================================================
                  PENDIENTES
              ================================================== */}

              <MatchAccordion
                id="matches-pending"
                title="Próximos partidos"
                description="Encuentros programados que aún no comienzan"
                icon="📅"
                tone="text-blue-700 dark:text-blue-300"
                count={pendingMatches.length}
                isOpen={
                  openSections.pending
                }
                onToggle={() =>
                  toggleSection("pending")
                }
              >
                {pendingMatches.length ===
                0 ? (
                  <EmptySection message="No hay partidos pendientes." />
                ) : (
                  <div className="space-y-2.5">
                    {pendingMatchesByDate.map(
                      ([date, dateMatches], index) => (
                        <DateAccordion
                          key={date}
                          date={date}
                          roundNumber={roundNumbers.get(date)}
                          count={dateMatches.length}
                          // La fecha más cercana arranca abierta: es la
                          // que el admin necesita tener a mano.
                          isOpen={isDateOpen("pending", date, index === 0)}
                          onToggle={() =>
                            toggleDate("pending", date, index === 0)
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {dateMatches.map(renderMatchCard)}
                          </div>
                        </DateAccordion>
                      ),
                    )}
                  </div>
                )}
              </MatchAccordion>

              {/* ==================================================
                  APLAZADOS
              ================================================== */}

              <MatchAccordion
                id="matches-postponed"
                title="Partidos aplazados"
                description="Encuentros pendientes de nueva programación"
                icon="⏸️"
                tone="text-amber-700 dark:text-amber-300"
                count={
                  postponedMatches.length
                }
                isOpen={
                  openSections.postponed
                }
                onToggle={() =>
                  toggleSection("postponed")
                }
              >
                {postponedMatches.length ===
                0 ? (
                  <EmptySection message="No hay partidos aplazados." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {postponedMatches.map(
                      (match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isAdmin={isAdmin}
                          canCorrectFinished={
                            canCorrectFinished
                          }
                          startEditing={
                            startEditing
                          }
                          registerResult={
                            registerResult
                          }
                          changeStatus={
                            changeStatus
                          }
                          startNextPeriod={
                            startNextPeriod
                          }
                          addExtraTime={
                            addExtraTime
                          }
                          updateStreamUrl={
                            updateStreamUrl
                          }
                          tournament={
                            selectedTournament
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </MatchAccordion>

              {/* ==================================================
                  FINALIZADOS
              ================================================== */}

              <MatchAccordion
                id="matches-finished"
                title="Partidos finalizados"
                description="Resultados registrados, mostrando los más recientes primero"
                icon="🏁"
                tone="text-emerald-700 dark:text-emerald-300"
                count={
                  finishedMatches.length
                }
                isOpen={
                  openSections.finished
                }
                onToggle={() =>
                  toggleSection("finished")
                }
              >
                {finishedMatches.length ===
                0 ? (
                  <EmptySection message="No hay partidos finalizados." />
                ) : (
                  <div className="space-y-2.5">
                    {finishedMatchesByDate.map(
                      ([date, dateMatches]) => (
                        <DateAccordion
                          key={date}
                          date={date}
                          roundNumber={roundNumbers.get(date)}
                          count={dateMatches.length}
                          // Con una búsqueda activa se despliegan solas
                          // para ver de una vez los partidos encontrados.
                          isOpen={isDateOpen("finished", date)}
                          onToggle={() =>
                            toggleDate("finished", date)
                          }
                        >
                          {isMobile ? (
                            <div className="grid gap-1.5">
                              {dateMatches.map((match) => (
                                <FinishedMatchRow
                                  key={match.id}
                                  match={match}
                                  isExpanded={expandedMatchId === match.id}
                                  onToggle={() =>
                                    setExpandedMatchId((current) =>
                                      current === match.id ? null : match.id,
                                    )
                                  }
                                >
                                  {renderMatchCard(match)}
                                </FinishedMatchRow>
                              ))}
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                              {dateMatches.map(renderMatchCard)}
                            </div>
                          )}
                        </DateAccordion>
                      ),
                    )}
                  </div>
                )}
              </MatchAccordion>

              {/* ==================================================
                  CANCELADOS
              ================================================== */}

              <MatchAccordion
                id="matches-cancelled"
                title="Partidos cancelados"
                description="Encuentros que no se disputarán"
                icon="✕"
                tone="text-red-700 dark:text-red-300"
                count={
                  cancelledMatches.length
                }
                isOpen={
                  openSections.cancelled
                }
                onToggle={() =>
                  toggleSection("cancelled")
                }
              >
                {cancelledMatches.length ===
                0 ? (
                  <EmptySection message="No hay partidos cancelados." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {cancelledMatches.map(
                      (match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isAdmin={isAdmin}
                          canCorrectFinished={
                            canCorrectFinished
                          }
                          startEditing={
                            startEditing
                          }
                          registerResult={
                            registerResult
                          }
                          changeStatus={
                            changeStatus
                          }
                          startNextPeriod={
                            startNextPeriod
                          }
                          addExtraTime={
                            addExtraTime
                          }
                          updateStreamUrl={
                            updateStreamUrl
                          }
                          tournament={
                            selectedTournament
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </MatchAccordion>
            </div>
          )}
        </section>

        {/* Espacio para que la barra de "en vivo" no tape el final. */}
        {currentLiveMatch && <div className="h-20 sm:hidden" />}
      </section>

      {/* ==========================================================
          BARRA "EN VIVO" (celular): marcador a mano y acceso directo
          a la tarjeta del partido para registrar goles y tarjetas.
      ========================================================== */}

      {currentLiveMatch && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-400/30 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur dark:bg-[#070b12]/95 sm:hidden">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                {currentLiveMatch.homeTeam.name}{" "}
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  {currentLiveMatch.homeScore ?? 0} - {currentLiveMatch.awayScore ?? 0}
                </span>{" "}
                {currentLiveMatch.awayTeam.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                <LiveMatchClock match={currentLiveMatch} />
                {allLiveMatches.length > 1 && ` · ${allLiveMatches.length} partidos en vivo`}
              </p>
            </div>
            <button
              className="min-h-11 shrink-0 rounded-xl bg-emerald-500 px-3.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
              onClick={() => {
                // Si la búsqueda ocultara el partido, se limpia primero.
                setMatchSearch("");
                jumpToSection("live", `match-${currentLiveMatch.id}`);
              }}
              type="button"
            >
              Ir al partido
            </button>
          </div>
        </div>
      )}

      {/* ==========================================================
          CONFIRMATION MODAL
      ========================================================== */}

      {confirmation && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-white dark:bg-slate-950/80 px-2 py-2 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
          <div
            className="my-auto w-full max-w-md max-h-[94vh] overflow-y-auto rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl sm:max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-confirmation-title"
          >
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.05] text-sm">
                  {confirmation.type ===
                  "result"
                    ? "🏁"
                    : confirmation.type ===
                        "postpone"
                      ? "⏸️"
                      : confirmation.type ===
                          "finish"
                        ? "🏁"
                        : "✕"}
                </div>

                <div className="min-w-0">
                  <h2
                    id="match-confirmation-title"
                    className="text-sm font-bold text-slate-900 dark:text-white sm:text-base"
                  >
                    {confirmation.type ===
                    "result"
                      ? confirmation.match
                          .status ===
                        "FINISHED"
                        ? "Corregir marcador"
                        : "Confirmar resultado"
                      : confirmation.type ===
                          "postpone"
                        ? "Confirmar aplazamiento"
                        : confirmation.type ===
                            "finish"
                          ? "Confirmar finalización"
                          : "Confirmar cancelación"}
                  </h2>

                  {confirmation.type ===
                    "result" && (
                    <p className="mt-0.5 text-[11px] text-slate-500 sm:text-[10px]">
                      Puedes modificar el marcador
                      antes de confirmar.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-5 sm:py-5">
              {confirmation.type ===
              "result" ? (
                <>
                  <p className="text-[11px] leading-5 text-slate-700 dark:text-slate-300 sm:text-xs">
                    {confirmation.match
                      .status === "FINISHED"
                      ? "Modifica el marcador actual y confirma el nuevo resultado."
                      : "Ingresa el marcador final del partido."}
                  </p>

                  <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 sm:mt-4 sm:p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
                      <div className="min-w-0 text-center">
                        <TeamLogo
                          team={
                            confirmation
                              .match.homeTeam
                          }
                          size="large"
                        />

                        <p className="mx-auto mt-2 max-w-[130px] truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                          {
                            confirmation
                              .match.homeTeam
                              .name
                          }
                        </p>

                        <input
                          className="mx-auto mt-2 block h-11 w-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-xl font-black text-emerald-700 dark:text-emerald-300 outline-none transition focus:border-emerald-400 sm:h-12 sm:w-20 sm:text-2xl"
                          type="number"
                          min="0"
                          value={
                            scoreForm.homeScore
                          }
                          onChange={(event) =>
                            setScoreForm(
                              (current) => ({
                                ...current,
                                homeScore:
                                  event.target
                                    .value,
                              }),
                            )
                          }
                        />
                      </div>

                      <div className="flex h-[115px] items-center justify-center sm:h-[135px]">
                        <span className="text-base font-black text-slate-700">
                          -
                        </span>
                      </div>

                      <div className="min-w-0 text-center">
                        <TeamLogo
                          team={
                            confirmation
                              .match.awayTeam
                          }
                          size="large"
                        />

                        <p className="mx-auto mt-2 max-w-[130px] truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                          {
                            confirmation
                              .match.awayTeam
                              .name
                          }
                        </p>

                        <input
                          className="mx-auto mt-2 block h-11 w-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-xl font-black text-emerald-700 dark:text-emerald-300 outline-none transition focus:border-emerald-400 sm:h-12 sm:w-20 sm:text-2xl"
                          type="number"
                          min="0"
                          value={
                            scoreForm.awayScore
                          }
                          onChange={(event) =>
                            setScoreForm(
                              (current) => ({
                                ...current,
                                awayScore:
                                  event.target
                                    .value,
                              }),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-slate-600 sm:text-[10px]">
                    Al confirmar, el resultado se
                    guardará y afectará la tabla de
                    posiciones.
                  </p>
                </>
              ) : confirmation.type ===
                "postpone" ? (
                <>
                  <p className="text-[11px] leading-5 text-slate-700 dark:text-slate-300 sm:text-xs">
                    ¿Confirmas aplazar el partido
                    entre{" "}
                    <strong className="text-amber-700 dark:text-amber-200">
                      {
                        confirmation.match
                          .homeTeam.name
                      }
                    </strong>{" "}
                    y{" "}
                    <strong className="text-amber-700 dark:text-amber-200">
                      {
                        confirmation.match
                          .awayTeam.name
                      }
                    </strong>
                    ?
                  </p>

                  <div className="mt-4 rounded-xl border border-amber-900/40 bg-amber-500/5 p-3">
                    <p className="text-[10px] leading-5 text-amber-700 dark:text-amber-200 sm:text-xs">
                      El partido pasará a la sección
                      independiente de aplazados y no
                      afectará la tabla.
                    </p>
                  </div>
                </>
              ) : confirmation.type ===
                "finish" ? (
                <p className="text-[11px] leading-5 text-slate-700 dark:text-slate-300 sm:text-xs">
                  ¿Confirmas finalizar el partido
                  entre{" "}
                  <strong className="text-emerald-700 dark:text-emerald-200">
                    {
                      confirmation.match
                        .homeTeam.name
                    }
                  </strong>{" "}
                  y{" "}
                  <strong className="text-emerald-700 dark:text-emerald-200">
                    {
                      confirmation.match
                        .awayTeam.name
                    }
                  </strong>
                  ?
                </p>
              ) : (
                <p className="text-[11px] leading-5 text-slate-700 dark:text-slate-300 sm:text-xs">
                  ¿Confirmas cancelar el partido
                  entre{" "}
                  <strong className="text-red-700 dark:text-red-200">
                    {
                      confirmation.match
                        .homeTeam.name
                    }
                  </strong>{" "}
                  y{" "}
                  <strong className="text-red-700 dark:text-red-200">
                    {
                      confirmation.match
                        .awayTeam.name
                    }
                  </strong>
                  ?
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 px-4 py-3 sm:flex sm:justify-end sm:px-5">
              <button
                className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 px-3 text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-400 hover:dark:border-slate-500 hover:text-slate-900 hover:dark:text-white sm:px-4 sm:text-xs"
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  setScoreForm(
                    emptyScoreForm,
                  );
                }}
                disabled={
                  isConfirmingResult ||
                  isConfirmingAction
                }
              >
                Cancelar
              </button>

              <button
                className="h-10 rounded-xl bg-emerald-500 px-3 text-[10px] font-bold text-slate-950 dark:text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-xs"
                type="button"
                onClick={
                  confirmPendingAction
                }
                disabled={
                  isConfirmingResult ||
                  isConfirmingAction
                }
              >
                {isConfirmingResult
                  ? "Guardando..."
                  : confirmation.type ===
                      "result"
                    ? "Confirmar marcador"
                    : confirmation.type ===
                        "postpone"
                      ? "Aplazar partido"
                      : confirmation.type ===
                          "finish"
                        ? "Finalizar partido"
                        : "Cancelar partido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          PENALTY MODAL
      ========================================================== */}

      {penaltyShootout && (
        <PenaltyShootoutModal
          shootout={penaltyShootout}
          onCancel={() =>
            setPenaltyShootout(null)
          }
          onConfirm={
            confirmPenaltyShootout
          }
          isSaving={
            isConfirmingPenalties
          }
        />
      )}

      <GenerateFixtureModal
        isOpen={isConfirmingGenerateFixtures}
        isLoading={isGeneratingFixtures}
        onCancel={() =>
          setIsConfirmingGenerateFixtures(false)
        }
        onConfirm={generateFixtures}
      />

      <ConfirmActionModal
        isOpen={isConfirmingDeleteFixtures}
        title="¿Eliminar el fixture?"
        message="Se eliminarán todos los partidos generados automáticamente que todavía no hayan iniciado. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        isLoading={isDeletingFixtures}
        onCancel={() =>
          setIsConfirmingDeleteFixtures(false)
        }
        onConfirm={deleteFixtures}
      />

      <StartMatchModal
        match={startingMatch}
        isLoading={isStartingMatch}
        onCancel={() => setStartingMatch(null)}
        onConfirm={confirmStartMatch}
      />
    </main>
  );
}
