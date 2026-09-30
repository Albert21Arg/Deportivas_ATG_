// Calcula el minuto a mostrar de un partido en vivo a partir de su
// cronómetro (duración de cada tiempo, tiempo en curso, cuándo arrancó ese
// tiempo y los minutos de tiempo extra que se le agregaron). Puramente en
// el cliente (no depende de un tick del servidor): cada componente que lo
// usa se re-renderiza cada segundo con un setInterval propio.
//
// Entretiempo automático: cuando el primer tiempo llega a su límite
// (duración + tiempo extra agregado) empieza un descanso de
// HALFTIME_MINUTES; al terminar, el segundo tiempo arranca solo y su
// cronómetro vuelve a empezar desde el inicio. El backend hace el mismo
// cambio (match-service.js, advanceDueHalftimes) y guarda como inicio del
// segundo tiempo ese mismo instante, así que el cálculo de aquí coincide
// con lo que guarda el servidor aunque la página no se haya recargado.
//
// Devuelve null si el partido no está en vivo o todavía no tiene cronómetro
// (partidos iniciados antes de este feature, o cualquier otro estado).

// Mantener igual que HALFTIME_MINUTES en back/src/services/match-service.js.
export const HALFTIME_MINUTES = 10;

// Espera tras cumplirse el segundo tiempo antes de que el backend finalice
// el partido solo (si no se agrega tiempo extra). Mantener igual que
// FULL_TIME_GRACE_MINUTES en back/src/services/match-service.js.
export const FULL_TIME_GRACE_MINUTES = 5;

const MINUTE_MS = 60 * 1000;

function resolvePeriod(match, now) {
  const half = match.halfDurationMinutes;
  const period = match.currentPeriod ?? 1;
  const startedAt = new Date(match.periodStartedAt).getTime();
  const extra = match.extraMinutes ?? 0;

  if (period === 1) {
    const firstHalfEnd = startedAt + (half + extra) * MINUTE_MS;
    const secondHalfStart = firstHalfEnd + HALFTIME_MINUTES * MINUTE_MS;

    if (now >= secondHalfStart) {
      return { period: 2, startedAt: secondHalfStart, extra: 0, isHalftime: false };
    }

    if (now >= firstHalfEnd) {
      return { period: 1, startedAt, extra, isHalftime: true, secondHalfStart };
    }
  }

  return { period, startedAt, extra, isHalftime: false };
}

export function getMatchClock(match) {
  if (!match || match.status !== 'STARTED' || !match.periodStartedAt || !match.halfDurationMinutes) {
    return null;
  }

  const now = Date.now();
  const half = match.halfDurationMinutes;
  const { period, startedAt, extra, isHalftime, secondHalfStart } = resolvePeriod(match, now);

  if (isHalftime) {
    return {
      label: 'Descanso',
      period,
      isHalftime: true,
      // Minutos (redondeados hacia arriba) que faltan para el segundo tiempo.
      minutesToSecondHalf: Math.max(1, Math.ceil((secondHalfStart - now) / MINUTE_MS)),
      inStoppage: false,
      reachedFullTime: true,
      minute: null,
    };
  }

  // Cada tiempo cuenta desde su propio inicio (el segundo también arranca
  // de cero); lo que pase de la duración normal es tiempo extra: 25+2'.
  const elapsedMinutes = Math.max(0, (now - startedAt) / MINUTE_MS);
  const cappedElapsed = Math.min(elapsedMinutes, half + extra);
  const inStoppage = cappedElapsed >= half;
  const stoppage = Math.max(1, Math.ceil(cappedElapsed - half));
  const minute = inStoppage ? half + stoppage : Math.floor(cappedElapsed) + 1;

  // Segundo tiempo cumplido (duración + extra): espera de
  // FULL_TIME_GRACE_MINUTES antes de que el partido se finalice solo.
  const periodEnd = startedAt + (half + extra) * MINUTE_MS;
  const isFullTime = period === 2 && now >= periodEnd;

  return {
    label: isFullTime ? 'Tiempo cumplido' : inStoppage ? `${half}+${stoppage}'` : `${minute}'`,
    period,
    isHalftime: false,
    isFullTime,
    minutesToAutoFinish: isFullTime
      ? Math.max(1, Math.ceil((periodEnd + FULL_TIME_GRACE_MINUTES * MINUTE_MS - now) / MINUTE_MS))
      : null,
    inStoppage,
    // Ya cumplió la duración normal de este tiempo: útil para resaltar el
    // botón de "siguiente tiempo" o "agregar tiempo extra" en el admin.
    reachedFullTime: elapsedMinutes >= half,
    // Minuto que se guarda por defecto al registrar un gol o tarjeta.
    minute,
  };
}

// Texto del momento de un gol/tarjeta: "3' 1T", "3' 2T". Como cada tiempo
// empieza de cero, el minuto solo no dice en cuál fue. Eventos viejos (sin
// tiempo guardado) muestran solo el minuto; sin ningún dato, "—".
export function formatEventTime(event) {
  const minute = event?.minute != null ? `${event.minute}'` : '';
  const period = event?.period ? `${event.period}T` : '';
  return [minute, period].filter(Boolean).join(' ') || '—';
}
