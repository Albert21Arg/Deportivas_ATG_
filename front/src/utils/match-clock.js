// Calcula el minuto a mostrar de un partido en vivo a partir de su
// cronómetro (duración de cada tiempo, tiempo en curso, cuándo arrancó ese
// tiempo y los minutos de tiempo extra que se le agregaron). Puramente en
// el cliente (no depende de un tick del servidor): cada componente que lo
// usa se re-renderiza cada segundo con un setInterval propio.
//
// Devuelve null si el partido no está en vivo o todavía no tiene cronómetro
// (partidos iniciados antes de este feature, o cualquier otro estado).
export function getMatchClock(match) {
  if (!match || match.status !== 'STARTED' || !match.periodStartedAt || !match.halfDurationMinutes) {
    return null;
  }

  const half = match.halfDurationMinutes;
  const period = match.currentPeriod ?? 1;
  const extra = match.extraMinutes ?? 0;

  const elapsedMinutes = Math.max(
    0,
    (Date.now() - new Date(match.periodStartedAt).getTime()) / 60000
  );
  const cappedElapsed = Math.min(elapsedMinutes, half + extra);
  const periodEndMark = period === 2 ? half * 2 : half;
  const priorMinutes = period === 2 ? half : 0;
  const inStoppage = cappedElapsed >= half;

  const label = inStoppage
    ? `${periodEndMark}+${Math.max(1, Math.ceil(cappedElapsed - half))}'`
    : `${Math.floor(priorMinutes + cappedElapsed) + 1}'`;

  return {
    label,
    period,
    inStoppage,
    // Ya cumplió la duración normal de este tiempo: útil para resaltar el
    // botón de "siguiente tiempo" o "agregar tiempo extra" en el admin.
    reachedFullTime: elapsedMinutes >= half,
  };
}
