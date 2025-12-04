# Structure Is Grace – Architecture & Interconnections

_Last updated: 2025-12-03_

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
- **Prisma schema** defines core models: `User`, `Asset`, `Liability`, `CashflowTxn`, `MacroGoal`, `StartEvent`, `StudySession`, `CashSnapshot`, `RoutineExperiment`, `Reminder`, `Idea`, `Action`, `Account`, `Session`, `Task`, `Project`, `Habit`, `HabitCompletion`, `CalendarSync`, `CalendarEvent`. Cascading deletes maintain referential integrity.

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

### 3.3 Tasks & Project Management Module ✅ COMPLETE
**Entry point**: `src/app/(dashboard)/tasks/page.tsx`, `src/app/(dashboard)/projects/page.tsx`
- Three-level hierarchy: `MacroGoal → Project → Task`
- Task priority scoring: impact × effort matrix (Eisenhower)
- Views: Kanban (by status), List (checkbox), Priority Matrix (2×2 quadrants)
- Quick capture modal for rapid task entry

**API routes**:
- `src/app/api/tasks/route.ts` (GET list with filters, POST create)
- `src/app/api/tasks/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/tasks/priorities/route.ts` (GET priority matrix analysis)
- `src/app/api/projects/route.ts` (GET with stats, POST)
- `src/app/api/projects/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/projects/[id]/progress/route.ts` (GET velocity & completion forecasts)

**Key features**:
- Filtering: status, priority, project, tags
- Progress tracking: completion %, velocity (tasks/day)
- Deadline prediction based on historical velocity
- Automatic timestamp tracking (completedAt on status change)

### 3.4 Habits Tracking Module ✅ COMPLETE
**Entry point**: `src/app/(dashboard)/habits/page.tsx`
- Daily/weekly/monthly cadence support
- Streak calculation (current & longest)
- GitHub-style heatmap visualization (12 weeks)
- Completion rate analytics

**API routes**:
- `src/app/api/habits/route.ts` (GET, POST)
- `src/app/api/habits/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/habits/[id]/completions/route.ts` (POST toggle on/off, GET history)
- `src/app/api/habits/[id]/streak/route.ts` (GET current & longest streaks)

**Components**:
- `HabitTracker`: Main dashboard with quick "Log Today" buttons
- `HabitHeatmap`: 12-week visualization with hover tooltips
- `StreakDisplay`: Fire emoji for current, star for best
- `HabitForm`: Icon picker, color picker, cadence selector

**Streak logic**:
- Daily: consecutive days with completions
- Weekly: consecutive weeks with ≥1 completion
- Monthly: consecutive months with ≥1 completion

### 3.5 Google Calendar Integration ✅ COMPLETE
**Entry point**: `src/app/(dashboard)/calendar/page.tsx`
- OAuth 2.0 flow with Google Calendar API
- Automatic token refresh via NextAuth callbacks
- Two-way sync: pull Google events, push focus blocks/habits/reminders
- Smart scheduling: suggest available time slots based on calendar

**Auth configuration** (`src/lib/auth.ts`):
- Google OAuth provider with calendar scopes
- Refresh token rotation in JWT callback
- Access token stored in database Account table
- Session includes access token for API calls

**Sync service** (`src/lib/calendar/google-sync.ts`):
- `GoogleCalendarSync` class handles all Google Calendar operations
- Incremental sync using sync tokens (reduces API calls)
- Event upsert pattern (idempotent sync)
- Available slot detection for smart scheduling
- Support for multiple calendars per user

**API routes**:
- `src/app/api/calendar/sync/route.ts` (POST trigger sync, GET sync status)
- `src/app/api/calendar/events/route.ts` (GET filtered events, POST create)
- `src/app/api/calendar/available-slots/route.ts` (GET free time slots)

**Components**:
- `CalendarView`: Month/week/day views with drag-and-drop support
- `SyncSettings`: Enable/disable syncs, manual sync trigger
- Event linking: attach tasks/habits to calendar events

**Data flow**:
1. User authenticates with Google OAuth
2. Access/refresh tokens stored in Account table
3. Background sync every 15 minutes (via sync tokens)
4. Events stored locally in CalendarEvent table
5. UI displays merged local + synced events
6. User creates event → pushed to Google → synced back

### 3.6 Auth Hardening & Session Management ✅ COMPLETE
**Refresh token rotation** (`src/lib/auth.ts`):
- JWT callback intercepts token expiration
- Automatic refresh using Google's token endpoint
- Database update with new tokens (security best practice)
- Error state flagged in session on refresh failure

**Session management** (`src/components/settings/session-management.tsx`):
- List all active sessions per user
- Individual session termination
- "Sign out all other devices" bulk action
- Session expiry display

**API routes**:
- `src/app/api/auth/sessions/route.ts` (GET list, DELETE single or all)
- `src/app/api/user/profile/route.ts` (GET, PATCH user settings)

**Profile settings** (`src/app/(dashboard)/settings/page.tsx`):
- Timezone selection (affects date display)
- Currency preference (affects financial formatting)
- Default start duration (minutes)
- Account info display (ID, member since)

**Notification center** (`src/components/notifications/notification-center.tsx`):
- Task reminders (due dates)
- Finance alerts (budget overages)
- Habit milestones (streak achievements)
- System notifications
- Unread count badge
- Filter: all/unread
- Mark as read/mark all as read

### 3.7 Experiments / Journal (existing)
- Routes exist under `src/app/(dashboard)/(experiments|journal|reminders)`.
- Data models defined (e.g., `RoutineExperiment`, `Reminder`, `Idea`, `Action`).

---

## 4. API contract overview

| Route | Method | Purpose | Auth |
| --- | --- | --- | --- |
| **Finance** ||||
| `/api/finance/assets` | GET/POST | manage assets | Required |
| `/api/finance/assets/[id]` | PATCH/DELETE | mutate asset | Required |
| `/api/finance/liabilities` | GET/POST | manage liabilities | Required |
| `/api/finance/liabilities/[id]` | PATCH/DELETE | mutate liability | Required |
| `/api/finance/cashflow` | GET/POST | manage cashflow | Required |
| `/api/finance/cashflow/[id]` | PATCH/DELETE | mutate cashflow | Required |
| `/api/finance/summary` | GET | recompute KPIs | Required |
| **Tasks & Projects** ||||
| `/api/tasks` | GET/POST | list/create tasks | Required |
| `/api/tasks/[id]` | GET/PATCH/DELETE | task CRUD | Required |
| `/api/tasks/priorities` | GET | priority matrix analysis | Required |
| `/api/projects` | GET/POST | list/create projects | Required |
| `/api/projects/[id]` | GET/PATCH/DELETE | project CRUD | Required |
| `/api/projects/[id]/progress` | GET | velocity & forecasts | Required |
| **Habits** ||||
| `/api/habits` | GET/POST | list/create habits | Required |
| `/api/habits/[id]` | GET/PATCH/DELETE | habit CRUD | Required |
| `/api/habits/[id]/completions` | POST/GET | toggle/list completions | Required |
| `/api/habits/[id]/streak` | GET | streak analytics | Required |
| **Calendar** ||||
| `/api/calendar/sync` | POST/GET | trigger/status sync | Required |
| `/api/calendar/events` | GET/POST | list/create events | Required |
| `/api/calendar/available-slots` | GET | smart scheduling | Required |
| **Auth & Settings** ||||
| `/api/auth/sessions` | GET/DELETE | session management | Required |
| `/api/user/profile` | GET/PATCH | user settings | Required |
| **Metrics** ||||
| `/api/metrics/today` | GET | dashboard summary | Required |
| `/api/metrics/trends` | GET | charts & macro goals | Required |
| `/api/macro-goal/[id]` | PATCH | update macro goal | Required |
| Auth routes | (NextAuth) | login/logout (Google OAuth + Email) | Public entry |

_All endpoints rely on `requireUser()` or `auth()` to ensure per-user tenancy. Always include `userId` in Prisma `where` clauses to avoid data leakage._

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

## 7. Integration Status
- **Google Calendar** ✅ COMPLETE
  - OAuth tokens stored in `Account` table (`access_token`, `refresh_token`, `expires_at`).
  - Automatic token refresh in NextAuth JWT callback.
  - Sync service: `src/lib/calendar/google-sync.ts`
  - Background sync every 15 minutes using incremental sync tokens.
  - Event mapping: tasks/habits linked to calendar events via `linkedTaskId`/`linkedHabitId`.
  - Two-way sync: pull Google events → local DB, push focus blocks/habits → Google Calendar.
  - Smart scheduling: available time slot detection based on existing events.
- **Plaid** (future) will extend `Asset`/`CashflowTxn` via webhook ingestion and `plaidItem` tables.

---

## 8. Testing & Quality Hooks
- **Unit tests** (Vitest): Finance module (`src/lib/__tests__/finance.test.ts`) – 80%+ coverage
- **API tests** (Vitest): Tasks, Projects, Habits (`src/app/api/__tests__/`)
- **E2E tests** (Playwright): Auth flow, tasks management, calendar integration, settings (`tests/e2e/`)
- **Test utilities**:
  - `src/__tests__/utils/mockPrisma.ts` – Prisma client mocking
  - `src/__tests__/utils/mockAuth.ts` – NextAuth session mocking
- **Coverage target**: 80%+ maintained across all modules
- **CI/CD**: Tests run via `npm test` (unit), `npm run test:e2e` (E2E)

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
