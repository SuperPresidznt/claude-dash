# Structure Is Grace – Progress Log

> Snapshot of roadmap execution milestones and QA notes.

## 2025-11-20 — Cody
- **Budget Envelopes (P0)** — Cody – Prisma schema + manual SQL applied, finance utilities extended, `/api/finance/budgets` CRUD built, and FinanceDashboard UI now supports create/edit/delete with variance metrics.
- **Environment readiness** — Cody – Postgres seeded via `npx prisma db seed`; dev server verified locally (Next.js @ http://localhost:800).
- **Next up** — Cody – Continue P0 roadmap (e.g., cashflow enhancements, observability) plus doc/QA updates as features land.
- **Cashflow templates (P0)** — Cody – Added Prisma model & table, `/api/finance/cashflow/templates` CRUD routes, React Query integration, FinanceDashboard table/dialog, and “apply to cashflow form” action for quick logging.
- **Analysis checkpoint – Odex (2025-11-20)** — Cody – Reviewed Cody master plan + original roadmap; ready to execute P0 observability tasks next.
- **Cashflow filters + CSV (P0)** — Cody – Added client-side filters (direction/category/date/search) with reset + count indicators and downloadable CSV export reflecting the filtered list.
- **Observability baseline – Odex (2025-11-20)** — Odex – Implemented finance toast/error UX helpers, added analytics event tracker, integrated Sentry SDK (client/server + logger breadcrumbs) and npm deps to unblock Cody’s P0 observability track.

## 2025-11-20 — Oden
- **Onboarding & scope sync** — Oden – Signed on as third coder, confirmed we are executing against the original roadmap and reviewed existing docs/code structure to align with Cody's plan.
- **Current focus** — Oden – Performing deep project analysis (dashboard, finance engine, React Query patterns, Prisma schema) while awaiting next implementation tasks from Cody/you; ready to log all upcoming notes under my name.
- **Cashflow CSV QA (P0)** — Oden – Audited `exportCashflowCsv` in `src/components/finance/finance-dashboard.tsx` and noted two edge cases to address: dates are serialized via `toISOString()` which can shift a transaction by one day for users outside UTC, and downloads use `\n` line endings which causes Excel-on-Windows to show the entire file on one line; recommend swapping to locale-preserving date strings (or server-provided ISO dates) and CRLF joins before broader QA.
- **Cashflow filter persistence (P0)** — Oden – Added `localStorage` hydration + syncing with guards (no SSR mismatch) plus an explicit "Clear filters" control so state survives refresh and can be reset quickly (`src/components/finance/finance-dashboard.tsx`). Manual code review only; no browser QA yet.
- **Finance render profiling (P0)** — Oden – Unable to capture React Profiler traces without a browser session, so performed a code-level audit instead: identified hot paths like repeated `Intl.NumberFormat` construction in `centsToCurrency` and `new Date(...).toLocaleDateString()` work inside table rows (`src/components/finance/finance-dashboard.tsx`). Recommended memoizing currency/percent formatters, precomputing timestamps when data is fetched, and splitting the monolith component into memoized subcomponents (AssetsTable, CashflowPanel, etc.) so form state changes stop re-rendering all charts.
- **API rate-limit guardrails (P0)** — Oden – Added middleware-scoped sliding window limiter for `/api/**` routes (120 req/min per user/IP) with `Retry-After` + `X-RateLimit-*` headers so clients can back off gracefully (`src/middleware.ts`). Map-backed store is in-memory stub; call out that we'll swap to Redis when infra lands.

## 2025-12-03 — Life Dashboard Architect
- **Tasks, Projects, Habits Implementation (P0)** — Complete end-to-end implementation of productivity features:
  - Created Prisma migration for Tasks, Projects, Habits, and Calendar models with full schema definitions
  - Built API routes: `/api/tasks`, `/api/projects`, `/api/habits` with CRUD operations, filtering, and statistics
  - Tasks UI: TaskBoard with Kanban/List/Priority Matrix views, TaskForm, PriorityMatrix (Eisenhower), QuickCapture modal
  - Projects UI: ProjectBoard with status columns, ProjectForm, ProgressCharts with analytics dashboard
  - Habits UI: HabitTracker with active/inactive management, HabitForm with customization, HabitHeatmap (12-week visualization), StreakDisplay
  - Added navigation routes: `/tasks`, `/projects`, `/habits` with sidebar integration
  - Created comprehensive API tests for all routes with mocked Prisma client
  - API client utilities in `src/lib/api/` for type-safe frontend integration
  - React Query integration with optimistic updates and cache invalidation
- **Features Delivered**:
  - Task management: Priority scoring (effort × impact), tags, project linking, status tracking
  - Project tracking: Progress calculation, macro goal linking, analytics, overdue detection
  - Habit tracking: Daily/weekly/monthly cadence, streak calculation, completion heatmaps, icon/color customization
  - All components use shadcn-style design system with Tailwind CSS
  - Full TypeScript type safety across API and UI layers
