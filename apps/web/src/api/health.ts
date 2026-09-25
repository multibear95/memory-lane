import { API_ROUTES, type HealthResponse } from '@memory-lane/shared';
import { apiFetch } from './client';

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>(API_ROUTES.health);
}
