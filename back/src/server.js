import 'dotenv/config';

import app from './app.js';
import { advanceDueHalftimes, finishDueMatches } from './services/match-service.js';

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

// Partidos en vivo, cada 15 s: pasa al segundo tiempo los que terminaron el
// descanso (advanceDueHalftimes) y finaliza los que cumplieron el segundo
// tiempo hace más de 5 minutos sin tiempo extra nuevo (finishDueMatches).
const LIVE_MATCHES_CHECK_MS = 15 * 1000;

async function checkLiveMatches() {
  try {
    await advanceDueHalftimes();
    await finishDueMatches();
  } catch (error) {
    console.error('[partidos en vivo] No se pudo revisar los partidos en vivo:', error.message);
  }
}

checkLiveMatches();
setInterval(checkLiveMatches, LIVE_MATCHES_CHECK_MS);
