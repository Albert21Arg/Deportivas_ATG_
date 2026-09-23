export const TEAM_LIKES = {
  // Una misma IP no puede dar like al mismo equipo más de una vez dentro
  // de esta ventana.
  cooldownHours: 3,
  // Dentro de cada torneo, el equipo con MÁS likes (y solo ese, sin
  // importar cuántos likes tenga exactamente) le suma este OVR fijo a
  // todos sus jugadores. Si hay empate en el máximo, todos los equipos
  // empatados lo reciben. Si el máximo es 0 (nadie tiene likes), nadie
  // recibe el bonus.
  bonusOvr: 5,
};
