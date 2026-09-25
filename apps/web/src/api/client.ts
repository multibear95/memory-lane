import type { ApiError } from '@memory-lane/shared';

// Empty base URL keeps requests same-origin (dev proxy or single-service deploy).
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = payload as ApiError | null;
    throw new ApiRequestError(response.status, error?.error ?? response.statusText, error?.details);
  }

  return payload as T;
}
