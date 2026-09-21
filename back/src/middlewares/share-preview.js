import * as publicRepository from '../repositories/public-repository.js';

// UA que usan los "crawlers" de vista previa de enlaces (no ejecutan JS, así
// que la SPA de React no les sirve nada útil: hay que responder HTML estático
// con las etiquetas og:* ya resueltas en el servidor).
const CRAWLER_USER_AGENT = /whatsapp|facebookexternalhit|telegrambot|twitterbot|slackbot|discordbot|linkedinbot/i;

export function isPreviewCrawler(userAgent) {
  return CRAWLER_USER_AGENT.test(userAgent ?? '');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

// Genera la vista previa (og:title/og:description/og:image) que verá el
// crawler en el momento en que alguien comparte el enlace: si hay un partido
// en vivo, muestra el marcador actual. WhatsApp cachea esta vista previa una
// vez la genera para un mensaje ya enviado, así que no se actualiza sola
// dentro de un chat existente; cada nuevo envío del enlace vuelve a pedirla
// y muestra el estado más reciente del partido.
export async function renderTournamentPreview(request, response, next) {
  try {
    const tournamentId = Number(request.params.id);

    if (!Number.isInteger(tournamentId)) {
      return response.status(404).send('Torneo no encontrado');
    }

    const tournament = await publicRepository.findActiveTournament(tournamentId);
    if (!tournament) {
      return response.status(404).send('Torneo no encontrado');
    }

    const matches = await publicRepository.findUpcomingMatches(tournamentId);
    const liveMatch = matches.find((match) => match.status === 'STARTED');

    const title = liveMatch
      ? `⚽ EN VIVO: ${liveMatch.homeTeam.name} ${liveMatch.homeScore ?? 0} - ${liveMatch.awayScore ?? 0} ${liveMatch.awayTeam.name}`
      : tournament.name;

    const description = liveMatch
      ? `${tournament.name} · Sigue el marcador en vivo.`
      : tournament.description || 'Resultados, calendario y tabla de posiciones.';

    const pageUrl = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    const image = tournament.logo || '';

    response.set('Content-Type', 'text/html; charset=utf-8');
    response.send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <p>${escapeHtml(title)}</p>
    <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a>
  </body>
</html>`);
  } catch (error) {
    next(error);
  }
}
