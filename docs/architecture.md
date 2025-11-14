# Structure Is Grace – Architecture & Interconnections

_Last updated: 2025-11-12_

This document explains how the application is wired today, how data flows end-to-end, and where to look if something breaks. It pairs with `docs/roadmap.md` to show both current state and planned evolution.

---

## 1. Runtime Topology

### 1.1 Tech stack
- **Web**: Next.js App Router (v15) with React Server Components. TypeScript throughout.
- **State/query**: React Query for client-side caching/mutations (`<Providers>` sets a `QueryClient`).
- **Styles**: Tailwind CSS, global tokens in `src/app/globals.css`.
- **APIs**: Next.js route handlers under `src/app/api/**`.
- **Data**: PostgreSQL via Prisma Client.
- **Auth**: NextAuth (email magic link). Session context exposed through `SessionProvider` and `requireUser()` helper.

### 1.2 Request lifecycle
1. **Browser → Next.js Route** – App Router loads layout wrappers and server components.
2. **Server data fetch** – Server components call libraries in `src/lib/**` (e.g., `getFinanceInitialData`) which in turn query Prisma.
3. **Client hydration** – Client components (e.g., `FinanceDashboard`) get initial data via props, then React Query revalidates through `/api/**` endpoints.
4. **Mutations** – Client fire-and-forget using `postJson/patchJson/deleteRequest`. On success we invalidate relevant query keys so caches refresh.

---

## 2. Shared Infrastructure

### 2.1 Providers
`src/components/providers.tsx` wraps the app with:
- `SessionProvider` from NextAuth – surfaces `useSession` and guards server calls.
- `QueryClientProvider` – React Query client created per session; responsible for caching, dedupe, refetch intervals.

### 2.2 Auth utilities
- `src/lib/server-session.ts` – `requireUser`, `getUser`, etc. Used inside server components/API handlers to enforce auth.
- `src/lib/auth.ts` – NextAuth configuration (email provider, callbacks).

### 2.3 Database access
- `src/lib/prisma.ts` – reuses Prisma client across hot reloads.
- **Prisma schema** defines core models: `User`, `Asset`, `Liability`, `CashflowTxn`, `MacroGoal`, `StartEvent`, `StudySession`, `CashSnapshot`, `RoutineExperiment`, `Reminder`, `Idea`, `Action`, `Account`, `Session`. Cascading deletes maintain referential integrity.

### 2.4 Utility libraries
- `src/lib/date.ts` – date formatting helpers.
- `src/lib/finance.ts` – central place for finance queries, serialization, KPI math.

---

## 3. Feature Modules

### 3.1 Finance Module
**Entry point**: `src/app/(dashboard)/finance/page.tsx`
- Guards with `requireUser()` → fetches initial data via `getFinanceInitialData(user.id)`.
- Renders `<FinanceDashboard>` with hydrated assets, liabilities, cashflow, summary totals.

**Client component**: `src/components/finance/finance-dashboard.tsx`
- Maintains form state for assets, liabilities, cashflow.
- React Query query keys: `['finance','assets']`, `['finance','liabilities']`, `['finance','cashflow']`, `['finance','summary']`.
- Mutations invalidate relevant keys ensuring KPIs stay accurate.
- UI surfaces: KPIs, tables, modal dialogs.

**API routes** (per BFF pattern):
- `src/app/api/finance/assets/route.ts` (GET list, POST create).
- `src/app/api/finance/assets/[id]/route.ts` (PATCH, DELETE).
- Equivalent structure for `liabilities` and `cashflow`.
- All routes: call `requireUser`, validate payload, use Prisma for CRUD, return serialized records.

**Server lib**: `src/lib/finance.ts`
- `getAssets`, `getLiabilities`, `getCashflow` (ordered queries).
- `computeFinanceSummary` calculates net worth, runway, DSCR, debt utilization by combining assets, liabilities, and recent cashflow (30-day window).
- `getFinanceInitialData` orchestrates parallel fetch + serialization for server component hydration.

**Data relationships**:
```
User ──< Asset
     └─< Liability
     └─< CashflowTxn
     └─< CashSnapshot (for cash-on-hand)
```
- `CashflowTxn.direction` enum ensures inflow/outflow semantics.
- Cash snapshots act as truth for runway; fallback to liquid assets if missing.

### 3.2 Metrics Dashboard
**Page**: `src/app/(dashboard)/dashboard/metrics/page.tsx`
- Server loads initial Today metrics (starts, study minutes, cash) and Macro goals.
- Client component `MetricsDashboard` (in `src/components/metrics-dashboard.tsx`) handles charts via Recharts.
- `TodayMetrics` uses React Query to poll `/api/metrics/today` with `refetchInterval` 60s.
- Macro goals saved through `/api/macro-goal/[id]` PATCH (mutation invalidates `['metrics','trends']`).

**Relevant data**:
- `StartEvent`, `StudySession`, `CashSnapshot`, `MacroGoal` models.
- Charts rely on API aggregator `src/app/api/metrics/trends/route.ts` (not shown here but provides consolidated JSON).

### 3.3 Habits / Experiments / Journal (skeleton)
- Routes exist under `src/app/(dashboard)/(experiments|journal|reminders|settings)`.
- Data models already defined (e.g., `RoutineExperiment`, `Reminder`). Implementation pending per roadmap.

---

## 4. API contract overview

| Route | Method | Purpose | Auth |
| --- | --- | --- | --- |
| `/api/finance/assets` | GET | list user assets | Required |
| `/api/finance/assets` | POST | create asset | Required |
| `/api/finance/assets/[id]` | PATCH/DELETE | mutate asset | Required |
| `/api/finance/liabilities` | GET/POST | manage liabilities | Required |
| `/api/finance/liabilities/[id]` | PATCH/DELETE | mutate liability | Required |
| `/api/finance/cashflow` | GET/POST | manage cashflow | Required |
| `/api/finance/cashflow/[id]` | PATCH/DELETE | mutate cashflow | Required |
| `/api/finance/summary` | GET | recompute KPIs | Required |
| `/api/metrics/today` | GET | dashboard summary (starts/study/cash) | Required |
| `/api/metrics/trends` | GET | charts & macro goals | Required |
| `/api/macro-goal/[id]` | PATCH | update macro goal notes | Required |
| Auth routes | (NextAuth) | login/logout | Public entry point |

_All finance endpoints rely on `requireUser()` to ensure per-user tenancy. Always include `userId` in Prisma `where` clauses to avoid data leakage._

---

## 5. React Query Guidance
- **Key naming**: Namespace by domain (e.g., `['finance','assets']`). Avoid collisions when adding new modules.
- **Invalidation**: Keep helper functions (e.g., `invalidateAssets`) near mutation definitions; each mutation must invalidate summary totals.
- **Hydration pattern**: Server components pass initial data; client component uses `initialData` or `placeholderData` for React Query to prevent flashes.
- **Error handling**: Mutations set local error state (string). Extend with toast notifications per roadmap.

---

## 6. Failure Domains & Debugging

| Symptom | Likely area | Checks |
| --- | --- | --- |
| 401/redirect loops | Auth session misconfigured | Inspect NextAuth callbacks, magic link email provider env vars |
| Finance tables not updating | React Query cache not invalidated | Confirm mutation `onSuccess` invalidates relevant keys |
| Runway/DSCR `null` | Missing cash snapshots or liabilities w/ payments | Recalculate via `/api/finance/summary` or check Prisma data |
| Charts blank | `/api/metrics/trends` failure | Check server logs, Prisma queries for associated models |
| Prisma errors | Migrations out of sync | `npx prisma migrate status`, ensure DB seeded |

Logging improvements (per roadmap) should forward API errors to a central sink (Sentry) and show toasts for users.

---

## 7. Planned Integrations Snapshot
- **Google Calendar** (P0 roadmap)
  - OAuth tokens stored in `Account` table columns (`access_token`, `refresh_token`).
  - Sync workers will likely live under `/api/integrations/calendar/*` with background job (Next.js Route Handlers + cron or external worker).
  - Event mapping: tasks/habits/finance reminders push to Calendar; events pulled into dashboard daily planner.
- **Plaid** (optional) will extend `Asset`/`CashflowTxn` via webhook ingestion and `plaidItem` tables (to be added).

---

## 8. Testing & Quality Hooks
- **Current**: Manual verification + seed-based data.
- **Needed**: Jest/ Vitest unit tests for `computeFinanceSummary`, API integration tests via Next.js `app-router` testing utilities, Cypress/Playwright for key flows (login, finance CRUD, metrics view).

---

## 9. Filemap Cheat-Sheet
```
src/
├─ app/
│  ├─ (dashboard)/
│  │  ├─ finance/page.tsx            ← finance entry
│  │  ├─ dashboard/metrics/page.tsx  ← metrics entry
│  │  ├─ … (stubs for journal, experiments, reminders, settings)
│  ├─ api/
│  │  ├─ finance/{assets,liabilities,cashflow}/route.ts
│  │  └─ … summary + metrics endpoints
│  ├─ layout.tsx / globals.css
├─ components/
│  ├─ finance/finance-dashboard.tsx
│  ├─ metrics-dashboard.tsx
│  ├─ today-metrics.tsx
│  ├─ providers.tsx
│  └─ … shared UI (metric cards, etc.)
├─ lib/
│  ├─ finance.ts
│  ├─ prisma.ts
│  ├─ auth.ts / server-session.ts
│  └─ date.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
└─ docs/
   ├─ roadmap.md
   └─ architecture.md (this file)
```

---

## 10. Maintenance Checklist
1. Keep Prisma schema coherent with roadmap (run `migrate dev` after edits).
2. Update this document when modules or data flows change.
3. Coordinate logging/error handling across API handlers.
4. Before introducing new modules (tasks, habits), define:
   - Prisma model(s)
   - API surface
   - React Query keys + invalidation strategy
   - UI composition (server vs client components)
5. For integrations (calendar, Plaid), draft separate diagrams covering sync jobs, rate limiting, and token refresh flows.

---

_Questions or inconsistencies? Start with this doc, then follow references back into the code. If the flow isn’t captured here, update the doc as part of the change._
