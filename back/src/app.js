import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isPreviewCrawler, renderTournamentPreview } from './middlewares/share-preview.js';
import publicImageRoutes from './routes/public-image-routes.js';
import { addApiFallback, createApiApp } from './api-app.js';

const app = createApiApp();

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDirectory = path.resolve(backendDirectory, '../../front/dist');

app.use('/api/public', publicImageRoutes);
app.use('/uploads', express.static('uploads'));

app.get('/tournaments/:id', (request, response, next) => {
  if (!isPreviewCrawler(request.get('user-agent'))) return next();
  return renderTournamentPreview(request, response, next);
});

if (fs.existsSync(frontendDistDirectory)) {
  app.use(express.static(frontendDistDirectory));

  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api') || request.path.startsWith('/uploads')) {
      return next();
    }

    return response.sendFile(path.join(frontendDistDirectory, 'index.html'));
  });
}

addApiFallback(app);

export default app;
