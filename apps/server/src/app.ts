import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { corsOrigins, env } from './env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/app.js -> apps/server/dist -> apps/web/dist
const clientDist = process.env['CLIENT_DIST_PATH'] ?? path.resolve(here, '../../web/dist');

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // Railway terminates TLS at its edge proxy.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cors({ origin: corsOrigins(), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiRouter);

  if (env.SERVE_CLIENT) {
    if (existsSync(clientDist)) {
      logger.info('Serving web client', { clientDist });
      app.use(express.static(clientDist));
      // SPA fallback: anything not matched above returns index.html.
      app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    } else {
      logger.warn('SERVE_CLIENT=true but client build is missing', { clientDist });
    }
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
