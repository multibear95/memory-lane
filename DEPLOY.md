# Deploying to Railway

Two supported shapes. Pick one.

## Option A — single service (simplest)

The API process serves the built React app, so there is one URL and no CORS to configure.

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Leave the service's *Root Directory* empty. Railway picks up the root `railway.json`,
   which runs `npm ci && npm run build` and starts `npm run start -w @memory-lane/server`.
3. Set variables on the service:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `SERVE_CLIENT` | `true` |
   | `CORS_ORIGIN` | your Railway domain, e.g. `https://memory-lane.up.railway.app` |

   Do **not** set `PORT` — Railway injects it and the server reads it.
4. **Settings → Networking → Generate Domain**.

Healthcheck is `/api/health`; deploys fail fast if the app does not come up.

## Option B — two services (independent scaling)

Create two services in the same project, both from this repo.

**API service**
- Settings → Config-as-code path: `apps/server/railway.json`
- Variables: `NODE_ENV=production`, `SERVE_CLIENT=false`,
  `CORS_ORIGIN=https://<web-domain>`
- Generate a domain.

**Web service**
- Settings → Config-as-code path: `apps/web/railway.json`
- Variables: `VITE_API_URL=https://<api-domain>`
  (Vite inlines `VITE_*` at build time — changing it requires a redeploy.)
- Generate a domain.

Leave *Root Directory* empty on both: npm workspaces need the repo root to install.

## CLI alternative

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

## Notes

- Node version comes from `nixpacks.toml` (`nodejs_20`); `.nvmrc` matches it.
- The server binds `0.0.0.0` and handles `SIGTERM`, so Railway restarts/redeploys drain cleanly.
- `app.set('trust proxy', 1)` is set because Railway terminates TLS at its edge.
- Add a database with **New → Database → Postgres**; Railway exposes `DATABASE_URL`.
  Add it to the schema in `apps/server/src/env.ts` before using it.
