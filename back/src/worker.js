import { createServer } from 'node:http';
import { handleAsNodeRequest } from 'cloudflare:node';

import { addApiFallback, createApiApp } from './api-app.js';
import { configurePrismaD1 } from './config/prisma.js';
import workerImageRoutes from './routes/worker-image-routes.js';
import { advanceDueHalftimes, finishDueMatches } from './services/match-service.js';
import { isWorkerPreviewCrawler, renderWorkerTournamentPreview } from './worker-preview.js';

const app = createApiApp({ trustCloudflareIp: true });
app.use('/api/public', workerImageRoutes);
addApiFallback(app);
const apiServer = createServer(app);
const API_PORT = 8787;
apiServer.listen(API_PORT);

export default {
  async fetch(request, env) {
    configurePrismaD1(env.DB);

    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return handleAsNodeRequest(API_PORT, request);
    }

    if (pathname === '/uploads' || pathname.startsWith('/uploads/')) {
      return new Response('Not found', { status: 404 });
    }

    if (request.method === 'GET' && /^\/tournaments\/\d+$/.test(pathname)
      && isWorkerPreviewCrawler(request.headers.get('user-agent'))) {
      return renderWorkerTournamentPreview(request);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, context) {
    configurePrismaD1(env.DB);
    context.waitUntil((async () => {
      await advanceDueHalftimes();
      await finishDueMatches();
    })());
  },
};
