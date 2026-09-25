import { useEffect, useState } from 'react';
import type { HealthResponse } from '@memory-lane/shared';
import { getHealth } from '../api/health';

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; data: HealthResponse }
  | { kind: 'error'; message: string };

export function HomePage() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((data) => {
        if (!cancelled) setStatus({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page">
      <h1>Memory Lane</h1>
      <p className="muted">Frontend and backend are wired up. Waiting on the spec.</p>

      <section className="card">
        <h2>API status</h2>
        {status.kind === 'loading' && <p>Checking…</p>}
        {status.kind === 'error' && <p className="error">Unreachable: {status.message}</p>}
        {status.kind === 'ready' && (
          <dl>
            <dt>status</dt>
            <dd>{status.data.status}</dd>
            <dt>uptime</dt>
            <dd>{status.data.uptimeSeconds}s</dd>
            <dt>version</dt>
            <dd>{status.data.version}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
