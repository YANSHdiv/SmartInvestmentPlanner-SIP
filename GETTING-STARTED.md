# Getting Started with Smart Investment Planner

This guide explains the project from the very basics: what it is, what it is built with, how to run it, how to use it, and how to change it safely. No prior experience with this codebase is assumed.

---

## 1. What this project is

Smart Investment Planner is a full-stack web application for students and first-time investors. Instead of telling people "where to invest", it answers **"What should I do with my money next?"**

A user signs up, walks through a short onboarding (income, expenses, savings, debt, goals, risk comfort), and the app:

1. Analyses their situation with a built-in decision engine.
2. Names the single most important next action — and explains **why**, in plain language.
3. Plans their goals, emergency fund and an illustrative investment mix.
4. Teaches the basics in an education centre, and lets them run "what-if" scenarios without changing their real plan.

Everything is educational — the app never promises returns and never claims to be professional financial advice.

---

## 2. What it is built with (and why)

| Part | Technology | What it does |
| --- | --- | --- |
| Pages & UI | **React 19 + TypeScript** | Every screen is a React component. TypeScript adds type checking so mistakes are caught before the app runs. |
| Styling | **Tailwind CSS v4** | Utility classes like `p-4 rounded-xl` directly in the markup. The color palette lives in `src/styles.css` as design tokens. |
| Routing | **TanStack Router** | File-based routing: each file in `src/routes/` becomes a page. `index.tsx` is `/`, `auth.tsx` is `/auth`, etc. |
| Backend | **TanStack Start server functions** | Typed functions that run on the server and talk to the database. The browser calls them like normal functions. |
| Database | **PostgreSQL** (managed, with row-level security) | Stores users' financial data. Row-level security means one user can never read another user's rows. |
| Auth | **Email + password** with hashed passwords and short-lived tokens | Sign up / sign in. Every server function requires a signed-in user. |
| Data fetching | **TanStack Query** | Caches server data on the pages and refreshes it when things change. |
| Forms | **React Hook Form + Zod** | Zod schemas validate every input (e.g. amounts can't be negative) on both browser and server. |
| Charts | **Recharts** | The progress and comparison charts on the dashboard and history pages. |
| Tests | **Vitest + React Testing Library** | 56 automated tests for the decision engine and key components. |
| Build | **Vite 7 + Bun** | Vite bundles the app; Bun is the package manager / runner (npm works too). |

You do **not** need to install PostgreSQL or an auth server yourself for the hosted version — the project was built on a managed cloud backend and the connection values go in `.env`.

---

## 3. Folder map — where everything lives

```text
src/
  routes/                  one file per page (URL)
    index.tsx              the landing page (/)
    auth.tsx               sign in / sign up
    learn.index.tsx        education centre
    learn.$slug.tsx        a single education article
    api/public/health.ts   GET /api/public/health -> {"status":"healthy"}
    _authenticated/        pages that require sign-in
      onboarding.tsx       the step-by-step setup wizard
      dashboard.tsx        home screen after sign-in
      plan.tsx             the full plan
      invest.tsx           "Where should I invest?"
      goals.tsx            goal planner
      what-if.tsx          scenario simulator
      history.tsx          saved plans + comparison
      settings.tsx         name, currency, risk assessment
  components/              reusable UI (buttons, cards, layout, plan pieces)
  lib/
    planner/
      types.ts             every input/output type of the engine
      config.ts            ALL the tunable rules (thresholds, labels, text)
      engine.ts            the pure decision engine (no database, no network)
      assetConfig.ts       the 11 asset classes and their characteristics
      assetEngine.ts       risk bands, capacity, suitability, gaps, screener
    api/
      finance.functions.ts server functions: read/write data, run the engine
      opportunity.functions.ts  serves the investment-opportunity report
      explain.functions.ts optional plain-language explanation layer
    market/                market-data service layer (currently sample data)
    content/               glossary terms + education articles (plain data)
    format.ts              money/number/date formatting helpers
  integrations/            auto-generated backend client — DO NOT EDIT
  styles.css               the design system: colors, fonts, tokens
supabase/migrations/       database schema, applied in order
public/                    icons and static files
README.md                  product and architecture overview
INTERVIEW.md               deep technical Q&A about this codebase
Dockerfile                 container build
.github/workflows/ci.yml   automated checks on every push
```

**The single most important idea:** all money decisions are made in `src/lib/planner/`, which is *pure* — it takes numbers in and returns a plan out, with no database or network. Pages only display what the engine returns. This is what makes the app testable and safe to modify.

---

## 4. Running it on your own computer

You need [Bun](https://bun.sh) (or Node.js 20+) installed.

```bash
# 1. install dependencies
bun install

# 2. create your environment file and fill in the backend values
cp .env.example .env

# 3. start the dev server
bun run dev
# open http://localhost:8080
```

Other commands:

```bash
bun run test        # run all automated tests
bunx tsgo --noEmit  # type-check the whole project
bun run lint        # check code style
bun run build       # produce the production build in dist/
```

### What goes in `.env`

`.env.example` lists every name with an explanation. The `VITE_`-prefixed values point the app at your managed database project; the rest are server-only. The AI explanation panel is **optional** — without its key the app works exactly the same, just without the "in simpler words" box. Never commit a real `.env` (it is already git-ignored).

---

## 5. Using the app (a full tour)

1. **Landing page** — "Build My Plan" starts registration.
2. **Sign up** with an email and password, then confirm the email.
3. **Onboarding (8 steps)** — profile → income → expenses → savings → debt → investments → goals → risk comfort. Each step explains why the question matters. You can stop and come back; progress is saved.
4. **Dashboard** — the greeting, your next action, a snapshot of your numbers, emergency-fund progress, goals, and suggested reading.
5. **Your plan** — the full priority sequence with WHAT / WHY / HOW / AFTER THIS for each step, and the illustrative investment mix.
6. **Where should I invest?** — your risk profile (calculated from eight parts of your situation, not one question), how much you could reasonably invest today and each month, what should stay reachable, then eleven investment categories each marked *Strong fit / Potential fit / Limited fit / Currently not suitable* with reasons — plus a gap check against what you already hold and a scenario simulator.
7. **Goals** — add, edit, complete or delete goals; each shows progress and an estimated monthly contribution.
8. **What-if** — change income, expenses or saving and compare "current plan" vs "scenario" side by side. Nothing is saved.
9. **History** — every saved plan, with a comparison view between any two.
10. **Learn** — beginner articles on saving vs investing, compounding, risk, diversification, fund types and more.
11. **Settings** — display name, currency, and retaking the risk assessment.

---

## 6. How to modify it (common tasks)

Always run `bun run test` and `bunx tsgo --noEmit` after changes — the tests exist to catch broken money logic.

### Change the wording of any recommendation
Every sentence the engine produces lives in **`src/lib/planner/config.ts`** (titles, explanations, next steps) or `src/lib/planner/assetConfig.ts` (asset-class descriptions). Edit the text; the logic is untouched.

### Tune the rules (thresholds)
Also `src/lib/planner/config.ts`: emergency-fund months target, the interest rate that counts as "expensive debt", short/long-term goal horizons, the share of surplus assigned to the current priority. Each value has a comment.

### Add or change an asset class
Edit `ASSET_UNIVERSE` in `src/lib/planner/assetConfig.ts` — label, role, risk level, liquidity, horizon, beginner note. The engine in `assetEngine.ts` picks it up automatically; add a test in `assetEngine.test.ts`.

### Add a new page
Create a file in `src/routes/` (e.g. `reports.tsx` → `/reports`, or under `_authenticated/` if sign-in is required). Links use TanStack Router's `<Link to="/reports">`. Add a menu entry in `src/components/layout/AppShell.tsx`.

### Change colors or fonts
Design tokens are at the top of **`src/styles.css`** (colors, radius, fonts). Components use token classes (`bg-card`, `text-foreground`, `panel`), so changing the token changes the whole app. Never hard-code hex colors in components.

### Add a new education article or glossary term
Both are plain data arrays in **`src/lib/content/education.ts`** and **`glossary.ts`** — add an entry and it appears on the site; no other code needed.

### Add a database field
Create a new migration file in `supabase/migrations/` (never edit old ones), remember the `GRANT` statements, update the Zod schema in `src/lib/api/finance.functions.ts`, and the types in `src/lib/planner/types.ts` if the engine should see it.

### Change a calculation in the engine
Edit `src/lib/planner/engine.ts` (priorities) or `assetEngine.ts` (investment analysis). Both are pure functions: same input → same output, no side effects. Add/adjust the matching tests, then run `bun run test`. **Never put decision logic inside a page component or a server function handler** — those only move data around.

### Plug in a real market-data feed later
`src/lib/market/provider.ts` is the single switch point. It currently returns clearly-labelled sample data. A real provider would be selected there using a server-side environment variable — keys must never reach browser code.

---

## 7. Rules that protect the app (please keep them)

- **No guaranteed returns, ever** — not in text, not in variable names. The tests actively scan for banned phrases.
- **The priority gate comes first** — a user with no emergency fund, expensive debt or negative cash flow is always shown those steps before any aggressive investing, regardless of their risk answers.
- **Validation everywhere** — amounts are non-negative, goal targets positive, rates bounded. New inputs need the same Zod checks.
- **Secrets stay server-side** — only `VITE_`-prefixed env values may be used in browser code.
- **Row-level security stays on** — every new table needs RLS policies and `GRANT`s in the same migration.

---

## 8. Testing & deploying

- `bun run test` — 56 tests: the priority engine, the investment engine, and UI components.
- `bun run build` — the production bundle (also what Docker and CI run).
- **Docker**: `docker build -t sip . && docker run -p 8080:8080 --env-file .env sip`
- **CI**: every push runs install → type-check → lint → tests → build (`.github/workflows/ci.yml`).
- **Health check** for any hosting platform: `GET /api/public/health` returns `{"status":"healthy"}`.

---

## 9. Where to read next

- `README.md` — architecture, database design, API table, decision-engine rules.
- `INTERVIEW.md` — how every part works in depth, with Q&A.

## Disclaimer

This application provides educational information, planning calculations and simplified scenarios based on information provided by the user. It is not individualized professional financial, investment, tax or legal advice. Investment values can fluctuate and past performance does not guarantee future results.
