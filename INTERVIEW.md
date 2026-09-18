# Smart Investment Planner — technical walkthrough

## Explain it in 30 seconds

Smart Investment Planner is a full-stack TypeScript application that answers "what should I do with my money next?" for students and first-time investors. A user enters income, expenses, savings, debt, existing investments and goals; a pure decision engine turns that into one prioritised next action with a plain-language explanation of which of their own numbers caused it, plus an education centre and a what-if simulator.

## Explain it in 2 minutes

The front end is React 19 with TypeScript, file-based TanStack Router routes, TanStack Query for server state and React Hook Form with Zod for input. The server layer is TanStack Start server functions — typed RPC endpoints — each protected by an authentication middleware and validating its input with Zod. Data lives in PostgreSQL with row-level security, so authorization is enforced by the database itself rather than only in application code.

The core of the product is the decision engine: a pure TypeScript module with no I/O that takes a snapshot of one person's finances and returns totals, emergency-fund coverage, debt statistics, goal analyses, an ordered priority list, one primary action and an illustrative allocation. Because it is pure, the same input always yields the same plan and the whole thing is unit-testable without a database or a network.

Everything else is presentation around that engine: an 8-step onboarding wizard, a dashboard with seven cards, a goal planner, an investment-mix view, plan history with a two-plan comparison, and an education centre with inline terminology definitions.

## Explain it in 5 minutes

Start with the problem. Beginner finance advice is generic and often wrong for the person receiving it — telling someone whose expenses exceed their income to invest 20% of it is harmful. So the product is built around sequencing rather than product selection.

The sequence is encoded as six priorities: fix negative cash flow, build an accessible reserve, address expensive debt, fund near-term goals, begin or increase long-term investing, then review the allocation. Which one becomes the primary action depends entirely on the user's data: surplus sign, reserve coverage in months against a configurable target, the highest interest rate among their debts against a configurable threshold, unfunded goals inside the short-term horizon, and their investment experience. Two users almost never see the same answer.

Every recommendation carries four parts — WHAT, WHY, HOW, AFTER THIS — and the WHY quotes the user's own figures. That is the trust mechanism: nothing is a black box.

Architecturally there are three layers with a strict rule between them. The database and server functions handle persistence and auth. The engine handles decisions and is pure. An optional explanation layer receives the engine's structured output and rewrites it in simpler words — it is explicitly forbidden from changing rankings, guaranteeing returns, predicting markets or inventing figures, and the application is fully functional when it is switched off. Deterministic logic first, language second.

Testing follows the same shape: the engine is covered by unit tests across cash-flow, reserve, debt, goal, risk-profile and invalid-input scenarios; components are tested with React Testing Library. CI type-checks, lints, tests and builds. The app containerises into a single image and exposes `GET /api/public/health` returning `{"status":"healthy"}` for platform checks.

## Architecture

```text
routes/           file-based pages; _authenticated/* is gated
components/       reusable UI (Button, Card, Tooltip, ProgressBar,
                  GoalCard, RecommendationCard, AllocationCard,
                  FinancialSummary, Loading/Empty/Error states)
lib/api/*.functions.ts   authenticated server functions (RPC)
lib/planner/      pure decision engine: types, config, engine
lib/content/      education articles and glossary
integrations/     database and auth clients
```

Data flow: component → TanStack Query → server function → database read → `analysePlan()` → structured analysis → rendered cards.

## Database

Nine tables: `profiles`, `financial_profiles`, `incomes`, `expenses`, `savings`, `debts`, `investments`, `goals`, `plans`. One-to-one for the two profile tables, one-to-many for the ledger tables and goals, and `plans` stores immutable snapshots including the full analysis as JSON so historical plans stay readable even after the engine changes. Row-level security policies scope every row to its owner; grants are explicit; `updated_at` maintained by trigger; a signup trigger creates the profile row.

Ledger sections use replace-on-save (delete the section's rows, insert the new set) because the wizard and settings edit a whole section as one form — this keeps the client simple and avoids per-row diffing.

## API design

Typed server functions rather than hand-written REST handlers: the client imports the function and gets end-to-end type inference, and the auth middleware cannot be forgotten. Reads: `getFinancialSnapshot`, `analyseCurrentPlan`, `listPlans`. Writes: `updateProfile`, `updateFinancialProfile`, `replaceLedger`, `createGoal`, `updateGoal`, `deleteGoal`, `savePlan`, `deletePlan`. One public HTTP route exists — the health check — because an external caller needs a plain URL.

## Authentication

Email/password with server-side hashing and short-lived access tokens. Three enforcement layers: the route gate redirects signed-out visitors, the server middleware rejects unauthenticated calls, and row-level security prevents cross-user reads at the database. Expired sessions surface as an auth error and return the user to sign-in rather than showing an empty dashboard.

## Decision engine and recommendation logic

`analysePlan(input)` computes totals, surplus and surplus rate; essential-expense base and reserve coverage in months; debt totals, highest rate, debt-to-income ratio and an expensive-debt flag; per-goal remaining amount, months remaining, horizon bucket and monthly estimate; then evaluates priority conditions in order and takes the first as the primary action. Allocation comes from a per-risk-profile template whose percentages sum to 100, applied to the investable monthly amount, with a purpose, risk note and complexity label per category. Assumptions and warnings are returned alongside so the UI can show them.

## React architecture and state management

Server state is TanStack Query keyed by `["snapshot"]`, `["analysis"]` and `["plans"]`; mutations invalidate them. Local UI state (wizard step, dialog open, scenario sliders) is component state — no global store, because there is no cross-tree client state worth centralising. The what-if simulator reuses the same engine in the browser, so scenarios need no round trip and cannot touch saved data.

## Error handling

Explicit loading, empty and error states for every data surface; empty states route the user to the action that fills them (onboarding, add a goal). Server functions validate input and return useful messages; negative or non-numeric figures are coerced to zero rather than producing NaN, and the engine emits warnings when income or expenses are missing so coverage numbers are not read as reliable.

## Testing

Vitest with a jsdom environment. Engine unit tests cover income above/equal to/below expenses, zero savings, sufficient and insufficient reserves, custom reserve targets, expensive versus low-cost debt, no debt, short- and long-term goals, funded and deleted goals, all three risk profiles, beginner versus existing investor, allocation totalling 100%, and invalid input. Component tests use React Testing Library against rendered cards.

## Docker, deployment and CI/CD

A single image builds the production bundle and serves the app and its server functions. GitHub Actions runs install → typecheck → lint → test → build on push and pull request. Database migrations are ordered SQL files applied before release. Health checks hit `/api/public/health`.

## Security

Hashed passwords, protected endpoints, database-level authorization, Zod validation on every input, CORS handled by the framework's same-origin server functions, secrets only in server-side environment variables, `.env` git-ignored with a documented `.env.example`, and logging that deliberately excludes credentials, tokens and financial detail.

## Scalability

The engine is stateless and pure, so it scales horizontally with no coordination. Natural extension points, each justified by a real use case rather than added preemptively: a cache in front of `analyseCurrentPlan`, background jobs for scheduled plan reviews, a queue for notification fan-out, object storage for exported plans, and an analytics sink for aggregate priority distribution.

## Technical challenges

1. **Keeping decisions out of endpoints.** The temptation is to compute priorities where the data is fetched. Isolating the engine cost some plumbing but made the product testable and let the browser reuse it for what-if scenarios.
2. **Explaining without over-claiming.** Every phrasing had to be checked for accidental guarantees. Recommendations reference the user's data and the plan's assumptions, never expected returns.
3. **Beginner-safe risk profiling.** The questionnaire avoids jargon and the result is labelled an educational profile, not a suitability assessment.
4. **Strict TypeScript with optional fields.** `exactOptionalPropertyTypes` forced explicit nullability across engine outputs and a helper that strips undefined keys before writes.

## Trade-offs

- Server functions instead of a separate REST service: less operational surface and full type inference, at the cost of language-agnostic reuse.
- Replace-on-save ledgers instead of row diffing: simpler forms, more write volume.
- Snapshot JSON in `plans` instead of recomputing history: history stays truthful across engine changes, at the cost of storage.
- Rules in a config module instead of a database table: reviewable in version control now, movable to data later if non-developers need to tune them.
- No global state library: less indirection, at the cost of prop passing in the wizard.

## Future improvements

Event-driven plan review workflow, notification scheduling, exportable plan documents, richer scenario comparison across more than two plans, and locale-aware content beyond currency selection.

---

## Why these technologies

- **React + TypeScript** — the product is a form-and-explanation heavy app whose
  core is money maths. Static types make the domain model (`PlannerInput`,
  `PlannerAnalysis`, `OpportunityReport`) the contract between database rows,
  the engines and the UI, so a schema change fails at compile time rather than
  in someone's financial plan.
- **TanStack Start** — one framework gives file-based routing, SSR (real URLs,
  per-page metadata, working refreshes on nested routes) and typed server
  functions in the same codebase and type system. No second service, no
  hand-written fetch layer, no duplicated request/response types.
- **Server functions instead of a REST controller layer** — every call is a
  typed function with a Zod validator and auth middleware attached. The client
  cannot call it with the wrong shape, and the endpoint cannot be reached
  without a verified token. Raw HTTP is still available for genuine HTTP
  callers, which is why the health check is a plain route.
- **PostgreSQL** — the data is relational (a user has incomes, expenses, debts,
  goals, plans) and money needs exact numeric types, constraints and foreign
  keys. Plan snapshots use `jsonb`, so the flexible part lives beside the
  relational part without a second database.
- **Supabase Auth** — email/password with hashing, token issue and refresh,
  provider sign-in and confirmation flows are solved, audited plumbing. The
  interesting problem in this project is the financial engine, not re-writing
  session handling.
- **Row-Level Security** — authorization belongs next to the data. Middleware
  can be bypassed by a bug in one handler; an RLS policy applies to every query
  through every path. It is the reason the isolation integration test can ask
  for another user's rows by id and still get nothing back.
- **The engine is separate from the database** — `src/lib/planner/*` takes plain
  objects and returns plain objects: no client, no `await`, no I/O. That makes
  every rule testable in milliseconds, keeps recommendations reproducible from
  stored data, and means the engine could be reused unchanged behind a
  different transport.

## How investment suitability is calculated

`src/lib/planner/assetEngine.ts`, in order:

1. `calculateRiskProfile` — combines the questionnaire score, investment
   experience, income stability, emergency-reserve coverage, expensive debt,
   goal horizon, the share of available money being invested and liquidity
   needs into one of five bands. If basic priorities are unresolved the band is
   capped, so a "high risk" answer cannot unlock aggressive positioning.
2. `calculateLiquidityRequirement` / `calculateInvestmentCapacity` — splits what
   the person actually holds into money that must stay reachable (reserve plus
   near-term goals), a one-time amount that could be invested today, and a
   monthly amount from surplus. Bank balance is never treated as investable in
   full.
3. `evaluateAssetClassSuitability` — scores each of eleven asset classes
   independently on risk fit, horizon fit, minimum practical capital,
   liquidity, diversification value and experience, then converts the internal
   score into Strong fit / Potential fit / Limited fit / Currently not suitable.
   Internal numbers are never presented as precise measurements.
4. `generateAllocationFramework` — takes the band's weights, drops classes that
   are not suitable, renormalises to 100% and turns percentages into illustrative
   ranges and amounts.
5. `generateRecommendationExplanation` — attaches WHAT / WHY / RISK / TIME /
   LIQUIDITY / HOW MUCH / WHAT NEXT to each class, referencing the user's own
   numbers.
6. `generatePortfolioGapAnalysis` — compares what is held against the framework
   (concentration, thin reserve, missing diversification, goal, liquidity and
   risk mismatches) and never tells anyone to sell immediately.

## How authentication and data isolation work

Sign-in issues a short-lived access token held by the client. Client middleware
attaches it as a bearer header to every server-function call. The server
middleware verifies the token, resolves the user id and builds a database client
scoped to that user; every query then also filters on the caller's own id, and
RLS policies enforce the same restriction inside PostgreSQL. Three independent
layers, and the integration tests attack all three from the outside.

## How deployment works

`npm run build` produces `dist/client` and `dist/server/index.mjs`; `npm start`
runs it on `$PORT`. The build target is a variable (`NITRO_PRESET`, default
`node-server`), which is what makes the same repository deployable to Railway,
a container host, a VM or Vercel without code changes. The database is managed
PostgreSQL, migrations are plain SQL applied in timestamp order, and every URL
or credential comes from an environment variable.

## Current limitations

Sample market data only (clearly labelled, never fabricated prices); optional AI
explanation layer that can never change a recommendation; educational rather
than regulated risk banding; five-band risk recomputed per request rather than
stored; plan history capped at 50 entries without pagination; no multi-factor
authentication yet.

## Technical questions on this codebase

1. Why is the decision engine a pure module, and what would break if priority logic moved into the server functions?
2. Walk through `analysePlan()` from input to primary action.
3. How does the engine decide between priority B and priority C for a user with both a thin reserve and a 36% credit-card balance?
4. Where is the expensive-debt threshold defined, and what happens if it changes to 10%?
5. Why does the emergency-fund calculation use essential expenses rather than total expenses, and what is the fallback when nothing is marked essential?
6. How is coverage in months computed, and why is the month target per-user rather than fixed?
7. What guarantees that allocation percentages sum to 100, and which test enforces it?
8. How does `analyseGoals()` classify horizons, and what happens when a target date is missing or unparseable?
9. Why are monthly goal contributions labelled estimates in the UI?
10. What does the engine do with a negative or non-numeric amount, and where is that handled?
11. Why can't a user with negative surplus receive a recommendation to increase investing?
12. How is `investableMonthly` derived, and why is only part of the surplus directed at the current priority?
13. What is `beginnerMode`, what triggers it, and what does it change in the UI?
14. Explain the three enforcement layers behind an authenticated read.
15. What exactly does row-level security protect against that middleware alone does not?
16. Why does the `_authenticated` route subtree need to be a real route file with children?
17. How does the client attach its access token to a server-function call?
18. Why must `process.env` values be read inside a handler rather than at module scope?
19. Which environment variables reach the browser, and how is that enforced?
20. Why is the health check under `/api/public/`, and what would make a route there unsafe?
21. How does `replaceLedger` avoid leaving a section partially written, and what are its trade-offs versus per-row updates?
22. Why does `plans` store a full analysis snapshot instead of recomputing from historical rows?
23. Which query keys exist, and which mutations invalidate each?
24. How does the what-if simulator produce a scenario plan without a server round trip, and how does it avoid mutating saved data?
25. Why does the what-if scenario add deltas as synthetic rows rather than editing existing ones?
26. How does onboarding resume after a user leaves mid-wizard?
27. How does the risk questionnaire map answers to a profile, and why is the result called educational?
28. Where does the recommended-learning list come from, and how is it tied to the current priority?
29. How does the terminology helper connect an inline term to a full article?
30. What prevents the explanation layer from changing the plan's ranking?
31. How does the application behave with no model key configured, and where is that fallback implemented?
32. Why is the explanation layer given a structured summary rather than raw database rows?
33. What is logged and what is deliberately never logged?
34. Which database constraints would reject a goal with a zero target amount or a 150% interest rate?
35. How would you add a seventh priority without destabilising the existing five?
36. Where would a cache go, and how would you invalidate it on a ledger write?
37. What would need to change to support multiple currencies within one user's plan?
38. How is the currency symbol and locale formatting resolved at render time?
39. Which parts of the codebase would change first if the rules had to be editable by a non-developer?
40. How would you verify that a plan shown to a user is reproducible from stored data months later?
41. Why is the five-band risk profile computed per request instead of stored, and what would storing it cost?
42. How can a "high risk tolerance" answer fail to produce an aggressive band? Which function caps it?
43. Why is investment capacity not simply savings minus the emergency reserve?
44. What stops the allocation framework from being identical for two users in the same risk band?
45. Where does the illustrative allocation get renormalised, and why is that necessary?
46. Why does the equity ladder start with broad-market exposure rather than individual companies?
47. How is the company research list produced, and what guarantees it is never presented as live prices?
48. If a live market provider were added, which single file would change, and where would its key live?
49. Which asset classes are excluded on capital grounds, and how is the minimum expressed so it stays currency-neutral?
50. What does the portfolio gap analysis deliberately never recommend, and why?
51. How does `assertNoDbError` decide between an authorization failure and a database failure?
52. What exactly does `redact()` strip, and why does redaction happen at log time rather than at throw time?
53. Which errors reach the user verbatim, and which are replaced?
54. How do the integration tests prove user isolation without a second real account?
55. How do the database and HTTP integration tests behave in CI with no secrets configured?
56. Why does the browser bundle test parse the served HTML rather than reading files from `dist/`?
57. What does `NITRO_PRESET` change, and why is a variable preset better than a hard-coded one?
58. Why is `staleTime` 30 seconds on queries, and which pages benefit from it?
59. Why does `goals` have a composite index on `(user_id, status)` rather than two single-column indexes?
60. How would you prove, from outside the application, that no service-role key is present in the client bundle?
