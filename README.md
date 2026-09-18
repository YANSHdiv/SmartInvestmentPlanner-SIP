# Smart Investment Planner

A beginner-friendly financial planning application that helps users understand their financial priorities, set goals, and learn the basics of investing.

## Problem statement

Most personal-finance tools answer "where should I invest?" — a question that only makes sense once someone already has stable cash flow, an accessible reserve and no expensive debt. Beginners are left guessing, and generic advice ("invest 20% of your income") can be actively harmful when expenses exceed income.

Smart Investment Planner answers a different question: **what should I do with my money next?** It looks at one person's actual numbers, decides the single next action, explains which of their figures produced it, and teaches the concepts behind it.

## Target users

- Students with irregular or small incomes
- Interns and first-job employees making their first financial decisions
- Anyone who has never invested and wants to understand the basics before acting

## Features

- **Guided onboarding** — an 8-step wizard covering profile, income, expenses, savings, debt, existing investments, goals and an educational risk profile. Progress is saved between steps.
- **Explainable decision engine** — an ordered priority sequence (cash flow → emergency reserve → expensive debt → short-term goals → long-term investing → allocation review) derived from the user's own data.
- **"What should I do next?"** — exactly one primary action, always with WHAT / WHY / HOW / AFTER THIS.
- **Emergency fund tracking** — current amount, configurable month target, coverage in months, progress.
- **Goal planner** — create, edit, complete and delete goals with progress, remaining amount and an estimated monthly contribution (clearly labelled as an estimate).
- **Illustrative investment mix** — per-category share, approximate amount, purpose, risk note and complexity level. No return figures, no guarantees.
- **Where should I invest? (investment opportunity engine)** — a five-band risk classification calculated from eight parts of the user's situation (not one question), an investment capacity split into one-time, monthly and money that should stay liquid, a "before investing" gate driven by the priority engine, eleven asset classes each judged independently as Strong fit / Potential fit / Limited fit / Currently not suitable with WHAT / WHY / RISK / TIME / LIQUIDITY / HOW MUCH / WHAT NEXT, an illustrative allocation framework generated from the user's own numbers, an equity ladder (index → diversified funds → individual shares), a company research screen fed by a separate market-data service layer using clearly labelled sample data, portfolio gap analysis, a low-capital/student mode and an assumption-driven scenario simulator. Modules: `src/lib/planner/assetEngine.ts`, `src/lib/planner/assetConfig.ts`, `src/lib/market/*`.
- **Beginner mode** — hides jargon metrics, explains every asset class and term, and surfaces a Start Here reading list.
- **Education centre** — Investing Basics, Investment Types and Beginner Guides. Each article covers what it is, a simple example, why people use it, risks and things to consider.
- **Terminology helper** — inline definitions with a link to the full article.
- **What-if simulator** — adjust monthly investing, expenses, savings and goal timing, and compare the current plan against the scenario side by side. Nothing is saved.
- **Plan history** — saved plans with date, totals, primary priority and allocation, plus a comparison view between any two plans.
- **Dashboard** — greeting, next action, financial snapshot, emergency fund, goals, investments, journey stage and recommended learning.
- **Optional plain-language explanation layer** — rewrites the plan in simpler words. It cannot change the plan, and the app works fully without it.

## Architecture

```text
React 19 + TypeScript (routes, components, forms)
        │  typed server-function calls (RPC over HTTP)
        ▼
TanStack Start server layer  ──►  Financial Decision Engine (pure TypeScript)
        │                              (income, expenses, surplus, reserve,
        │                               debt, goals, risk → priorities)
        ▼
PostgreSQL (row-level security, per-user isolation)
```

- The decision engine is a **pure module** (`src/lib/planner/`). It performs no I/O, so the same input always produces the same plan and it is unit-testable in isolation. No decision logic lives in a request handler.
- Server functions (`src/lib/api/*.functions.ts`) read and write the database and call the engine. Every one of them requires an authenticated session.
- The explanation layer is a separate server function that receives the engine's structured result. It never participates in calculations.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS v4, Radix primitives |
| Routing | TanStack Router (file-based routes) |
| Server | TanStack Start server functions, Zod validation |
| Data fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Database | PostgreSQL with row-level security |
| Auth | Email/password sessions with hashed passwords and JWT-based access tokens |
| Tests | Vitest, React Testing Library |
| Build | Vite 7 |
| Container | Docker |
| CI | GitHub Actions |

## Database design

| Table | Purpose |
| --- | --- |
| `profiles` | display name, currency, onboarding state (1 row per user, keyed to the auth user) |
| `financial_profiles` | age range, occupation, income stability, investment experience, risk answers/score/profile, emergency-month target, debt flag |
| `incomes` | kind, monthly amount |
| `expenses` | category, monthly amount, essential flag |
| `savings` | kind, amount |
| `debts` | kind, outstanding amount, monthly payment, interest rate (0–100) |
| `investments` | kind, current value, monthly contribution |
| `goals` | name, category, target amount (> 0), current amount, target date, priority, status |
| `plans` | saved plan snapshots: totals, surplus, primary priority, risk profile, full analysis JSON |

Every table has row-level security enabled with per-user policies, explicit grants, and `updated_at` triggers. A signup trigger creates the matching profile row. Financial figures are constrained to non-negative values; goal targets must be positive.

## API

Typed server functions, all authenticated:

| Function | Purpose |
| --- | --- |
| `getFinancialSnapshot` | all of a user's rows in one call |
| `analyseCurrentPlan` | snapshot → engine → full analysis |
| `updateProfile`, `updateFinancialProfile` | profile and risk settings |
| `replaceLedger` | replaces one section (income, expenses, savings, debts, investments) |
| `createGoal`, `updateGoal`, `deleteGoal` | goal management |
| `savePlan`, `listPlans`, `deletePlan` | plan history |
| `explainPlan` | optional plain-language explanation |

Public HTTP route: `GET /api/public/health` → `{"status":"healthy"}`.

## Financial decision engine

Priorities, in order, with the condition that triggers each:

| Code | Priority | Condition |
| --- | --- | --- |
| A | Improve monthly cash flow | surplus ≤ 0 |
| B | Build emergency savings | coverage months < configured target |
| C | Address expensive debt | any interest rate ≥ the configured expensive-debt threshold |
| D | Fund short-term goals | an unfunded goal within the short-term horizon |
| E | Begin or increase long-term investing | basics covered and surplus available |
| F | Review allocation | already investing across several categories |

Rules live in `src/lib/planner/config.ts` (reserve months, expensive-debt rate, horizons, share of surplus directed at the current priority) so they can be tuned without touching engine logic. Key guarantees: when expenses exceed income the plan never encourages larger investment contributions; with no reserve it explains building accessible savings first; assumptions used are listed to the user; nothing is presented as a guaranteed return.

## Error handling

`src/lib/errors.ts` is the single place that decides what a person sees and what
the log records. Validation, authentication, authorization, database,
unavailable-service and unexpected failures each map to a short understandable
sentence; the technical cause is logged server-side with connection strings,
tokens, bearer headers and API keys redacted. No stack trace, database message
or secret ever reaches the browser.

## Authentication and security

- Email/password sign-up with server-side password hashing; sessions carry short-lived access tokens.
- Every server function is behind an auth middleware; unauthenticated calls are rejected.
- Route-level protection: the authenticated route subtree redirects signed-out visitors to sign in.
- Authorization is enforced in the database itself through row-level security, so one user cannot read another's financial rows even if a query is malformed.
- All input is validated with Zod on the server; amounts must be non-negative, percentages bounded, dates parseable.
- Secrets are read from environment variables on the server only. Only `VITE_`-prefixed values reach the browser. `.env` is git-ignored; `.env.example` documents required names without values.
- Logs record requests, statuses, errors and important events — never passwords, tokens, keys or financial detail.

## Testing

```bash
npm test            # Vitest: unit + integration (84 tests)
npx tsgo --noEmit   # type check
npm run lint
```

Two layers:

**Unit tests** (`src/lib/**/*.test.ts`, `src/components/**/*.test.tsx`) cover income above/equal to/below expenses, zero savings, sufficient and insufficient reserves, debt and no debt, expensive versus low-cost debt, short- and long-term goals, all three risk profiles, beginner and existing investors, allocation totals, and invalid or non-numeric input. Error handling is tested for redaction of connection strings, tokens and keys, and for never surfacing raw database text to the user.

**Integration tests** (`src/test/integration/`) exercise the architecture itself:

| File | What it proves |
| --- | --- |
| `dataIsolation.integration.test.ts` | Against the real database: an unauthenticated request reads and writes nothing; a signed-in user only ever sees their own rows, gets nothing when asking for another user's id, and cannot insert, update or delete another user's rows. |
| `planningFlow.integration.test.ts` | Database-shaped rows → `toPlannerInput` → decision engine → investment opportunity engine → structured JSON: mapping, primary recommendation with its explanation, risk band, capacity, per-asset suitability, allocation totalling 100%, and priorities overriding a risk-tolerant answer. |
| `httpApi.integration.test.ts` | Against a running instance: health check answers `{"status":"healthy"}`, public pages render, protected pages embed no user rows, and no server-only secret appears in the served HTML or JavaScript. |

The database and HTTP tests skip themselves when no backend URL, access token
(`TEST_USER_ACCESS_TOKEN`) or running server (`TEST_BASE_URL`) is available, so
CI passes without secrets.

## Local setup

```bash
npm install
cp .env.example .env   # fill in your backend values
npm run dev            # http://localhost:8080
```

The project is standalone: every dependency is a public, general-purpose
package (React, Vite, TanStack Start, Nitro, Tailwind, Supabase client). No
editor- or platform-specific package is needed to install, build or run it.



`bun` works equally well (`bun install`, `bun run dev`); nothing in the project
requires a specific package manager or runtime.

## Environment variables

See `.env.example`. Browser values are prefixed `VITE_`; everything else is server-side only. The AI explanation variables are optional.

## Docker

```bash
docker build -t smart-investment-planner .
docker run -p 3000:3000 --env-file .env smart-investment-planner
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full production guide (environments, environment variables, hosting, migrations, verification checklist).

- Frontend and server API deploy together as one application. `npm run build` produces `dist/client` (static assets) and `dist/server/index.mjs` (a standard Node HTTP server), and `npm start` runs it — verified locally end to end. `railway.json`, `Dockerfile` and `vercel.json` are all included; `NITRO_PRESET` selects the target (`node-server` by default).
- A managed PostgreSQL instance holds all data. Migrations live under `supabase/migrations` and are applied in order during deployment.
- `GET /api/public/health` returns `{"status":"healthy"}` and is suitable as a platform health check.
- Every URL, credential and API key comes from environment variables; `.env` is git-ignored and only `.env.example` is committed.


## CI/CD

`.github/workflows/ci.yml` installs dependencies, type-checks, lints, runs tests and builds on every push and pull request.

## Known limitations

- Market data is a fixed, fictional sample set, clearly labelled as such
  throughout the UI. No live prices are fetched, and none are fabricated.
- The AI explanation layer is optional and purely descriptive; with no key
  configured the panel hides itself and every calculation is unaffected.
- Risk banding is educational, not a regulated suitability assessment.
- Email/password and the hosted providers configured in the backend are the
  only sign-in methods; there is no multi-factor authentication yet.
- The five-band risk profile is recomputed on each request rather than stored,
  so historical plans keep the three-band label they were saved with.
- Plan history is capped at the 50 most recent plans per user (no pagination
  yet).

## Future improvements

- Event-driven plan workflow: plan generated → plan event recorded → review reminder scheduled → user revisits the plan.
- Background jobs and a queue for scheduled plan reviews and notifications.
- Caching layer for repeated analysis reads, and pagination for long plan histories.
- Object storage for exported plan documents.
- Aggregate, anonymised analytics on which priorities users reach.

## Disclaimer

This application provides educational information, planning calculations and simplified scenarios based on information provided by the user. It is not individualized professional financial, investment, tax or legal advice. Investment values can fluctuate and past performance does not guarantee future results.
