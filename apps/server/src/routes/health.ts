import { Router } from 'express';
import type { HealthResponse } from '@memory-lane/shared';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  const body: HealthResponse = {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    version: process.env['npm_package_version'] ?? '0.1.0',
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});
