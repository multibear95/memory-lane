import { env } from '../env.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

function log(level: Level, message: string, meta?: unknown): void {
  if (LEVELS[level] < LEVELS[env.LOG_LEVEL]) return;
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta !== undefined ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};
