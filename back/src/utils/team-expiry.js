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

// El pago del EQUIPO es lo que manda: si el equipo está al día, sus
// jugadores se muestran normal sin importar si tienen o no un pago
// individual propio. Si el equipo está moroso, un jugador solo se libra
// del bloqueo (foto y nombre visibles en todos lados) pagando aparte un
// paidUntil propio todavía vigente; sin eso, queda expirado igual que su
// equipo.
export function withPlayerExpiryFlags(player, teamExpired = false) {
  if (!player) return player;
  const { paidUntil, ...rest } = player;
  const hasIndividualPayment = Boolean(paidUntil) && !isPast(paidUntil);
  const playerExpired = Boolean(teamExpired) && !hasIndividualPayment;
  return { ...rest, playerExpired };
}
