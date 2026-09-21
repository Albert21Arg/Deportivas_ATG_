export const VIEWS = {
  // Una misma IP no vuelve a contar como visita nueva para el mismo torneo
  // dentro de esta ventana (evita que un refresh o recarga infle el
  // contador; cada "ingreso" real espaciado sí cuenta).
  cooldownMinutes: 5,
};
