import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Railway injects PORT at runtime. Never hardcode it in production.
  PORT: z.coerce.number().int().positive().default(3000),
  // Comma-separated list of allowed browser origins. "*" allows any.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Serve the built web client from the API process (single-service deploy).
  SERVE_CLIENT: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';

export function corsOrigins(): string[] | true {
  if (env.CORS_ORIGIN.trim() === '*') return true;
  return env.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
