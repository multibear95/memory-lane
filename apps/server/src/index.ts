import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info('Server listening', { port: env.PORT, env: env.NODE_ENV });
});

function shutdown(signal: string): void {
  logger.info('Shutting down', { signal });
  server.close(() => process.exit(0));
  // Force-exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
