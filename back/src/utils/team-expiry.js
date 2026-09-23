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

// Si el jugador NUNCA tuvo un paidUntil propio, depende del pago del
// EQUIPO: equipo al día lo muestra, equipo moroso lo oculta.
//
// Si el jugador SÍ tiene (o tuvo) un paidUntil propio, ese es el que manda
// para él, sin importar si el equipo está al día: mientras esté vigente lo
// libra del bloqueo aunque el equipo esté moroso, pero si ya venció lo deja
// oculto aunque el equipo esté al día (un pago individual viejo no se da
// por bueno solo porque el equipo pagó por su cuenta después). La única
// forma de "refrescarlo" es que el admin vuelva a aplicarle una fecha
// vigente (p.ej. con "aplicar esta fecha a todos los jugadores del
// equipo" al actualizar el pago del equipo).
export function withPlayerExpiryFlags(player, teamExpired = false) {
  if (!player) return player;
  const { paidUntil, ...rest } = player;
  const hasOwnPaidUntil = Boolean(paidUntil);
  const ownPaymentExpired = hasOwnPaidUntil && isPast(paidUntil);
  const playerExpired = hasOwnPaidUntil
    ? ownPaymentExpired
    : Boolean(teamExpired);
  return { ...rest, playerExpired };
}
