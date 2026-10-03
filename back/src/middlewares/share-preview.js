import * as publicRepository from '../repositories/public-repository.js';
import { formatDay, getRoundInfo, isValidDay } from '../services/round-image-service.js';

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

    let title = liveMatch
      ? `⚽ EN VIVO: ${liveMatch.homeTeam.name} ${liveMatch.homeScore ?? 0} - ${liveMatch.awayScore ?? 0} ${liveMatch.awayTeam.name}`
      : tournament.name;

    let description = liveMatch
      ? `${tournament.name} · Sigue el marcador en vivo.`
      : tournament.description || 'Resultados, calendario y tabla de posiciones.';

    const origin = `${request.protocol}://${request.get('host')}`;
    const pageUrl = `${origin}${request.originalUrl}`;
    let image = tournament.logo || '';
    let imageSize = null;

    const requestedMatchId = Number(request.query.partido);
    if (Number.isInteger(requestedMatchId) && requestedMatchId > 0) {
      const sharedMatch = await publicRepository.findLiveMatchById(tournamentId, requestedMatchId);
      if (sharedMatch) {
        title = `⚽ EN VIVO: ${sharedMatch.homeTeam.name} ${sharedMatch.homeScore ?? 0} - ${sharedMatch.awayScore ?? 0} ${sharedMatch.awayTeam.name}`;
        description = `${tournament.name} · Toca para ver el partido en vivo.`;
        image = `${origin}/api/public/tournaments/${tournamentId}/matches/${requestedMatchId}/live-image`;
        imageSize = { width: 1200, height: 630 };
      }
    }

    // Enlace de una fecha (/tournaments/:id?fecha=AAAA-MM-DD, botón
    // "Compartir" de la página pública): la vista previa muestra la imagen
    // con los partidos de ese día en vez del logo del torneo.
    const day = request.query.fecha;
    if (!request.query.partido && isValidDay(day)) {
      const round = await getRoundInfo(tournamentId, day).catch(() => null);
      if (round) {
        const label = round.roundNumber ? `Fecha ${round.roundNumber}` : formatDay(day);
        title = `${tournament.name} — ${label}`;
        description = `${formatDay(day)} · ${round.matches.length} ${round.matches.length === 1 ? 'partido' : 'partidos'}`;
        image = `${origin}/api/public/tournaments/${tournamentId}/rounds/${day}/image`;
        imageSize = { width: 1200, height: 630 };
      }
    }

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
    ${imageSize ? `<meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="${imageSize.width}" />
    <meta property="og:image:height" content="${imageSize.height}" />` : ''}
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
