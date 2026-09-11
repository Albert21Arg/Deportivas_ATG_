import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth-routes.js';
import tournamentRoutes from './routes/tournament-routes.js';
import userRoutes from './routes/user-routes.js';
import teamRoutes from './routes/team-routes.js';
import matchRoutes from './routes/match-routes.js';
import matchDetailRoutes from './routes/match-detail-routes.js';
import standingsRoutes from './routes/standings-routes.js';
import publicRoutes from './routes/public-routes.js';
import announcementRoutes from './routes/announcement-routes.js';
import floatingBubbleRoutes from './routes/floating-bubble-routes.js';
import { errorHandler } from './middlewares/error-handler.js';
import { HttpError } from './utils/http-error.js';

const app = express();
const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDirectory = path.resolve(backendDirectory, '../../frontend/dist');
const allowedOrigins = new Set([
  process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://v7n460l4-5173.use.devtunnels.ms',
]);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new HttpError(403, 'Origen no permitido'));
  },
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/floating-bubbles', floatingBubbleRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', matchRoutes);
app.use('/api/tournaments', standingsRoutes);
app.use('/api/matches', matchDetailRoutes);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

// Producción/túnel: una sola aplicación en el puerto del backend.
// En desarrollo con Vite, esta carpeta simplemente no existe o se actualiza al compilar.
if (fs.existsSync(frontendDistDirectory)) {
  app.use(express.static(frontendDistDirectory));

  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api') || request.path.startsWith('/uploads')) {
      return next();
    }

    return response.sendFile(path.join(frontendDistDirectory, 'index.html'));
  });
}

app.use((_request, _response, next) => {
  next(new HttpError(404, 'Recurso no encontrado'));
});

app.use(errorHandler);

export default app;
