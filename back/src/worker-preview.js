import * as publicRepository from './repositories/public-repository.js';

const CRAWLER_USER_AGENT = /whatsapp|facebookexternalhit|telegrambot|twitterbot|slackbot|discordbot|linkedinbot/i;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

export async function renderWorkerTournamentPreview(request) {
  const url = new URL(request.url);
  const id = Number(url.pathname.split('/')[2]);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response('Torneo no encontrado', { status: 404 });
  }

  const tournament = await publicRepository.findActiveTournament(id);
  if (!tournament) return new Response('Torneo no encontrado', { status: 404 });

  const matches = await publicRepository.findUpcomingMatches(id);
  const liveMatch = matches.find((match) => match.status === 'STARTED');
  let title = liveMatch
    ? `EN VIVO: ${liveMatch.homeTeam.name} ${liveMatch.homeScore ?? 0} - ${liveMatch.awayScore ?? 0} ${liveMatch.awayTeam.name}`
    : tournament.name;
  let description = liveMatch
    ? `${tournament.name} · Sigue el marcador en vivo.`
    : tournament.description || 'Resultados, calendario y tabla de posiciones.';

  const sharedMatchId = Number(url.searchParams.get('partido'));
  if (Number.isInteger(sharedMatchId) && sharedMatchId > 0) {
    const match = await publicRepository.findLiveMatchById(id, sharedMatchId);
    if (match) {
      title = `EN VIVO: ${match.homeTeam.name} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam.name}`;
      description = `${tournament.name} · Toca para ver el partido en vivo.`;
    }
  }

  const pageUrl = url.href;
  const imageUrl = tournament.logo?.startsWith('http') ? tournament.logo : '';
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <p>${escapeHtml(title)}</p>
    <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

export function isWorkerPreviewCrawler(userAgent) {
  return CRAWLER_USER_AGENT.test(userAgent ?? '');
}
