// Un equipo con el pago vencido (team.teamExpired) muestra su nombre,
// escudo y estadísticas (salvo goles en contra) borrosos y opacos en las
// vistas públicas. Si solo venció el escudo (team.logoExpired) se
// reemplaza por un ícono genérico, sin distorsionar el resto.
export function isTeamExpired(team) {
  return Boolean(team?.teamExpired);
}

export function isLogoHidden(team) {
  return Boolean(team?.logoExpired);
}

// Un jugador puede pagar aparte para que su foto/nombre se muestren aunque
// su equipo esté moroso; el backend ya resuelve esa lógica (equipo +
// pago individual) y entrega playerExpired listo para usar.
export function isPlayerExpired(player) {
  return Boolean(player?.playerExpired);
}

export const EXPIRED_CLASS = 'blur-[3px] opacity-40 grayscale select-none';
export const PLAYER_EXPIRED_CLASS = 'blur-[12px] opacity-20 grayscale select-none';
