import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

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
import siteSettingRoutes from './routes/site-setting-routes.js';
import { errorHandler } from './middlewares/error-handler.js';
import { HttpError } from './utils/http-error.js';

export function createApiApp({ trustCloudflareIp = false } = {}) {
  const app = express();

  app.set('trust proxy', 1);

  if (trustCloudflareIp) {
    app.use((request, _response, next) => {
      const clientIp = request.get('cf-connecting-ip');
      if (clientIp) request.headers['x-forwarded-for'] = clientIp;
      next();
    });
  }

  const allowedOrigins = new Set([
    process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://v7n460l4-5173.use.devtunnels.ms',
    'https://deportivas-atg.alberttaborda.workers.dev',
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
  app.use('/api/site-settings', siteSettingRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/tournaments', matchRoutes);
  app.use('/api/tournaments', standingsRoutes);
  app.use('/api/matches', matchDetailRoutes);

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  return app;
}

export function addApiFallback(app) {
  app.use((_request, _response, next) => {
    next(new HttpError(404, 'Recurso no encontrado'));
  });

  app.use(errorHandler);

  return app;
}
