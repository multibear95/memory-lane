# Memory Lane

TypeScript monorepo: React (Vite) frontend + Express backend + shared types package.

```
apps/
  server/   Express 4 API, TypeScript (ESM), zod-validated env
  web/      React 18 + Vite 5 SPA
packages/
  shared/   Types & route constants imported by both sides
```

## Requirements

Node >= 18.18 (Node 20 recommended — see `.nvmrc`), npm 9+.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api/health

Vite proxies `/api` to the API server in dev, so the browser only ever talks to one origin.

## Scripts (run from repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | server + web together |
| `npm run dev:server` / `npm run dev:web` | one side only |
| `npm run build` | shared, then server, then web |
| `npm run build:server` / `npm run build:web` | one deploy target |
| `npm start` | run the compiled API |
| `npm run typecheck` | tsc across all workspaces |

## Adding an API endpoint

1. Add request/response types in `packages/shared/src/types.ts` and a path in `API_ROUTES`.
2. Add a router in `apps/server/src/routes/` and mount it in `routes/index.ts`.
3. Add a typed caller in `apps/web/src/api/`.

Shared types are consumed from `dist`, so run `npm run build -w @memory-lane/shared`
(or `npm run dev -w @memory-lane/shared` to watch) after changing them.

## Deployment

See [DEPLOY.md](DEPLOY.md) — Railway, single-service or split.
