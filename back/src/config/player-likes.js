export const PLAYER_LIKES = {
  // Una misma IP no puede dar like al mismo jugador más de una vez dentro
  // de esta ventana.
  cooldownHours: 3,
  // Cada like suma 0.1 al OVR de la tarjeta, pero solo se refleja en pasos
  // enteros (cada 10 likes = +1), hasta un máximo de +14.
  ovrPerLike: 0.1,
  maxOvrBonus: 14,
};
