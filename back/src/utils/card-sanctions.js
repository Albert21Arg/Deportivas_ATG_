const CARD_SEVERITY = { YELLOW_CARD: 1, BLUE_CARD: 2, RED_CARD: 3 };

// Dentro de un mismo partido una tarjeta puede quedar reemplazada por otra
// más grave (dos amarillas -> expulsión con roja, amarilla y azul -> azul,
// azul y roja -> roja): solo la sanción definitiva (la más grave) se cobra,
// las que quedaron reemplazadas no generan multa aparte.
function definitiveCardType(typesInMatch) {
  return typesInMatch.reduce(
    (definitive, type) => (CARD_SEVERITY[type] > (CARD_SEVERITY[definitive] ?? 0) ? type : definitive),
    null
  );
}

// Recibe eventos crudos { playerId, matchId, type } y devuelve, por jugador,
// cuántas tarjetas definitivas (cobrables) tiene de cada tipo.
export function countBillableCardsByPlayer(cardEvents) {
  const typesByPlayerMatch = new Map();
  for (const event of cardEvents) {
    const key = `${event.playerId}:${event.matchId}`;
    if (!typesByPlayerMatch.has(key)) typesByPlayerMatch.set(key, { playerId: event.playerId, types: [] });
    typesByPlayerMatch.get(key).types.push(event.type);
  }

  const totals = new Map();
  for (const { playerId, types } of typesByPlayerMatch.values()) {
    const type = definitiveCardType(types);
    if (!type) continue;
    const entry = totals.get(playerId) ?? { YELLOW_CARD: 0, BLUE_CARD: 0, RED_CARD: 0 };
    entry[type] += 1;
    totals.set(playerId, entry);
  }
  return totals;
}
