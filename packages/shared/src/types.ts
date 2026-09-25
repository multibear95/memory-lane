/**
 * Types shared between the web client and the API server.
 * Replace / extend these once the product spec lands.
 */

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
  version: string;
  timestamp: string;
}

export const API_ROUTES = {
  health: '/api/health',
} as const;
