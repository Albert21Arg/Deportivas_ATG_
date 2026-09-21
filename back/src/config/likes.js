export const LIKES = {
  // Una misma IP no puede dar like al mismo torneo más de una vez dentro de
  // esta ventana.
  cooldownHours: 24,
  // Puntuación del Home = likes totales + (likes de los últimos N días) *
  // peso. Así un torneo nuevo con actividad reciente puede superar a uno
  // viejo con muchos likes acumulados pero ya sin movimiento.
  recentWindowDays: 7,
  recentWeight: 5,
};
