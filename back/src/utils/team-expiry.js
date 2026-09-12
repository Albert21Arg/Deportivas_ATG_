// Un equipo con paidUntil vencido oculta su información pública (nombre,
// escudo y estadísticas salvo goles en contra). El escudo, además, puede
// vencer por su cuenta (logoExpiresAt) sin que el resto del equipo esté
// vencido. Estas funciones convierten las fechas crudas de la base de
// datos en banderas booleanas seguras para exponer en endpoints públicos,
// sin filtrar las fechas de pago exactas.

function isPast(date) {
  return Boolean(date) && new Date(date).getTime() < Date.now();
}

// Quita paidUntil/logoExpiresAt del objeto y agrega teamExpired/logoExpired.
export function withExpiryFlags(team) {
  if (!team) return team;
  const { paidUntil, logoExpiresAt, ...rest } = team;
  const teamExpired = isPast(paidUntil);
  const logoExpired = teamExpired || isPast(logoExpiresAt);
  return { ...rest, teamExpired, logoExpired };
}

// El jugador debe tener un pago individual vigente para mostrar su foto y
// nombre. Ese pago también le permite aparecer aunque su equipo esté moroso.
// Sin paidUntil (o ya vencido), su información queda expirada aunque el
// equipo sí haya pagado.
export function withPlayerExpiryFlags(player) {
  if (!player) return player;
  const { paidUntil, ...rest } = player;
  const hasIndividualPayment = Boolean(paidUntil) && !isPast(paidUntil);
  const playerExpired = !hasIndividualPayment;
  return { ...rest, playerExpired };
}
