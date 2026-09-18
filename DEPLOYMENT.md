# Deployment guide — Smart Investment Planner

This document describes how the application is configured for local
development, testing and production, and how to deploy it.

## 1. What is actually deployed

The application is a single full-stack TanStack Start (React 19 + TypeScript +
Vite) deployment plus a managed PostgreSQL database:

```
Browser ──▶ TanStack Start server (SSR + server functions / REST routes)
                     │
                     ├─▶ Managed PostgreSQL (row-level security, migrations)
                     ├─▶ Market-data service layer (sample provider by default)
                     └─▶ AI explanation layer (optional, server-side only)
```

The API layer lives in the same deployment as the UI:

- `src/lib/api/*.functions.ts` — authenticated typed RPC endpoints
  (`createServerFn` + auth middleware), the equivalent of feature-scoped
  routers.
- `src/routes/api/public/*` — raw HTTP endpoints for external callers, e.g.
  `GET /api/public/health` → `{"status":"healthy"}`.

Because the browser and the API share one origin, **no CORS configuration is
required** and no backend URL is ever hard-coded. If you ever split the API onto its
own domain, set `VITE_API_BASE_URL` (see below) and add an explicit origin
allow-list in the server layer at that point.

## 2. Environments

| Environment | Config source | Database | Notes |
| --- | --- | --- | --- |
| Local development | `.env` (copied from `.env.example`) | your own dev database | `npm run dev` on port 8080 |
| Testing / CI | GitHub Actions secrets + Vitest env | none (engine tests are pure) | `npm test`, typecheck, production build |
| Production | hosting provider environment variables | managed PostgreSQL | `npm run build` then the provider start command |

No URL is hard-coded anywhere in the source. `localhost` appears only in
developer documentation and the dev-server config.

## 3. Environment variables

Only `VITE_`-prefixed values are compiled into the browser bundle. Everything
else is read inside server handlers at request time and never shipped to the
client.

Browser-safe:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_API_BASE_URL` — optional. Leave empty for the default same-origin API.
  Set it only if the API is hosted on a separate domain.

Server-only (never expose):

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — privileged database access; optional, the app
  does not need it to run
- `DATABASE_URL` — managed PostgreSQL connection string, used by migration
  tooling only
- `PORT` — port the production server listens on (hosting platforms set this)
- `NITRO_PRESET` — build target, `node-server` by default
- `MARKET_DATA_PROVIDER`, `MARKET_DATA_API_KEY` — external market data
- `AI_GATEWAY_API_KEY`, `AI_GATEWAY_URL`, `AI_GATEWAY_MODEL` — optional
  explanation layer; `AI_GATEWAY_URL` is any OpenAI-compatible chat completions
  endpoint. Both the URL and the key must be set for the panel to appear; the
  app works fully without them


`.env` is git-ignored. Only `.env.example` — with placeholder values — is
committed.

## 4. Deploying the frontend (Vercel)

1. Import the GitHub repository into Vercel.
2. Build command `npm run build`, install command `npm install`.
   `vercel.json` already sets these plus baseline security headers. The build
   produces `dist/client` (static assets) and `dist/server/index.mjs` (the
   server entry). Set `NITRO_PRESET=vercel` in the project's environment
   variables so the build emits Vercel's own output layout.
3. Add the environment variables above in Project Settings → Environment
   Variables (Production and Preview separately). Add only the `VITE_` values
   if the API is deployed elsewhere; add the server-only values too when the
   whole app is deployed here.
4. Deep links and refreshes on nested routes work without rewrite rules: the
   server renders every route. There is no client-only SPA fallback to
   configure.

## 5. Deploying to Railway (verified path)

```
GitHub ──▶ Railway build (npm install, npm run build)
              ──▶ node dist/server/index.mjs  (Smart Investment Planner)
                     ──▶ PostgreSQL (managed, row-level security)
```

`railway.json` pins the whole flow to the container path, so builds are
reproducible and the browser bundle always gets its build-time values:

```json
{ "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": { "startCommand": "node dist/server/index.mjs",
              "healthcheckPath": "/api/public/health" } }
```

1. Create a Railway project from the GitHub repository. Railway builds the
   `Dockerfile` (`node:22-slim`, `npm install`, `npm run build`) and runs the
   start command above.
2. `npm run build` defaults to the `node-server` target and writes
   `dist/server/index.mjs` + `dist/client`. The server binds `$PORT`, which
   Railway sets.
3. Add a managed PostgreSQL instance (or point at your existing managed
   database) and expose the connection string as `DATABASE_URL` through a
   variable reference. Never paste a password into source.
4. Set the remaining variables from section 3: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and optionally the AI and
   market-data variables. The `VITE_` values must be present at **build** time.
5. Health check path `/api/public/health`, expected body `{"status":"healthy"}`.
6. Apply migrations before the first start — see section 6.

> **Why the build args matter:** the `VITE_` values are compiled into the
> browser bundle, and a container build does not inherit runtime variables.
> The `Dockerfile` declares them as `ARG`/`ENV` (Railway passes matching
> service variables in automatically) and fails fast with a clear message if
> either required value is missing. Without this the site starts and the health
> check passes, but the browser cannot reach the backend and every page that
> touches sign-in shows the generic error screen.

>
> Also add the Railway domain (`https://<service>.up.railway.app`) to the
> backend's allowed Site URL / redirect URLs, otherwise confirmation and
> password-reset links point back at the wrong host.

Verified locally with the exact production commands: `npm run build` with the
`node-server` target, then `node dist/server/index.mjs`, gives a listening
server whose health endpoint returns `{"status":"healthy"}` and whose pages,
authentication and server functions work against the managed database.

SQLite is never used. Every environment, including CI, targets PostgreSQL.

## 6. Database and migrations

- Schema lives in `supabase/migrations/*.sql`, applied in timestamp order.
- Apply on deploy with the migration step of your host, e.g.
  `psql "$DATABASE_URL" -f supabase/migrations/<file>.sql` executed in order,
  or the platform's migration command.
- Every table has a primary key, foreign keys to `auth.users` /
  `profiles` with `on delete cascade`, and indexes on the columns the app
  queries by (`user_id`, `status`, `created_at`).
- Row-level security is enabled on every table with per-user policies, so a
  user can only ever read or write their own financial rows.
- Credentials exist only as environment variables.

## 7. CI/CD

`.github/workflows/ci.yml` runs on every push to `main` and every pull
request:

1. Install dependencies (locked).
2. Typecheck.
3. Run the test suite (planner engine, opportunity engine, components).
4. Run the production build.

Any failing step fails the check with its own named step in the log.

## 8. Release verification checklist

- [ ] Frontend loads over HTTPS and the landing page renders
- [ ] `GET /api/public/health` returns `{"status":"healthy"}`
- [ ] Registration creates an account and a profile row
- [ ] Login returns a session and protected routes redirect when signed out
- [ ] Onboarding writes income, expenses, savings, debt, investments, goals
- [ ] Dashboard, plan, goals, "Where should I invest?", what-if and history load
- [ ] Planner and opportunity calculations reflect the stored data
- [ ] API errors surface a readable message instead of a blank screen
- [ ] Data persists across sign-out and sign-in (PostgreSQL persistence)
- [ ] Production build succeeds
- [ ] `grep` the built bundle for secret names: no service-role key, JWT secret
      or provider API key appears
- [ ] No development-platform branding anywhere in the UI or metadata
