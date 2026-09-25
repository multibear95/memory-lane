# Deploying to Railway

Two supported shapes. Pick one.

## Option A — single service (simplest)

The API process serves the built React app, so there is one URL and no CORS to configure.

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Leave the service's *Root Directory* empty. Railway picks up the root `railway.json`,
   which runs `npm run build` (Nixpacks installs dependencies itself) and starts `npm run start -w @memory-lane/server`.
3. Set variables on the service:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `SERVE_CLIENT` | `true` |
   | `CORS_ORIGIN` | your Railway domain, e.g. `https://memory-lane.up.railway.app` |
   | `NPM_CONFIG_INCLUDE` | `dev` |

   Do **not** set `PORT` — Railway injects it and the server reads it.

   `NPM_CONFIG_INCLUDE=dev` is not optional: `NODE_ENV=production` makes `npm ci`
   skip devDependencies, and the build needs `typescript`, `vite` and `tsx` from there.
   Without it the build fails with `tsc: not found`.
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

## Updating a deployment

Railway watches the branch you selected when the service was created (default `main`).
Every push to that branch triggers a build + deploy automatically — no action needed
beyond `git push`.

### Normal flow (automatic)

```bash
npm run typecheck && npm run build   # fail locally, not in CI
git add -A
git commit -m "feat: ..."
git push origin main
```

Then watch **Railway → service → Deployments**: the newest entry goes
`Building → Deploying → Active`. A failed healthcheck on `/api/health` marks the
deploy as failed and keeps the previous version serving traffic.

### Manual redeploy (no new commit)

Use this after changing variables, or to retry a flaky build.

Dashboard: **service → Deployments → latest → ⋮ → Redeploy**.

CLI:

```bash
npm i -g @railway/cli
railway login
railway link          # once per clone: pick project + service
railway redeploy      # rebuild the currently deployed commit
```

### Deploying uncommitted local code

`railway up` uploads the working directory directly, bypassing GitHub. Handy for a
hackathon demo fix; the next push to `main` overwrites it.

```bash
railway up            # upload + build + deploy
railway up --detach   # same, without streaming build logs
```

### Turning auto-deploy off

**Settings → Source → Disconnect** (or set a branch nobody pushes to). Deploys then
only happen via `railway up` / `Redeploy`.

### Verifying a deploy

```bash
export ML_URL='https://your-domain.up.railway.app'
curl --fail-with-body -sS "$ML_URL/api/health"   # {"status":"ok",...}
curl --fail-with-body -I "$ML_URL/"              # 200 when SERVE_CLIENT=true
```

Logs: `railway logs` or **service → Deployments → latest → View Logs**.

### Rollback

**Deployments → pick an older Active deployment → ⋮ → Redeploy**. Railway rebuilds
that exact commit. Nothing in this app is stateful yet, so rollback is safe.

### After changing variables

Variable edits are staged. Click **Deploy** in the banner Railway shows, or the change
does not reach the running container. `VITE_*` values are inlined at build time, so a
rebuild — not a restart — is required for them.
