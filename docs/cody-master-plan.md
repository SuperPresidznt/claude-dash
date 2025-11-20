# Cody Master Plan for Project 3

> Goal: Turn project 3 into the long-term "Structure Is Grace" OS using Claudia's architecture as the north star and Cody's concrete, phased build plan.
>
> Scope: Product, architecture, UX, data, integrations, and intelligence.

This is a **planning document only**. It does **not** change any code. Treat each phase as a set of tickets for your coder.

---

## 0. Core Principles

- **Claudia is the north star**
  - Use `docs/roadmap.md` and `docs/architecture.md` as the system-of-record for vision, modules, and technical constraints.
- **Cody is the playbook**
  - Use this file + `cody-ux-merge-plan.md` + `ux-merge-from-project-2.md` as execution guides.
- **Ship usable slices**
  - Every phase must improve the real daily workflow, not just infra.
- **One responsibility per layer**
  - Data access & math in `src/lib/**`.
  - HTTP contracts in `/app/api/**`.
  - State & UX in components with React Query.
  - No business logic leaks into random components.

---

## Phase 0 – Foundations & Observability (Claudia P0)

**Objective:** Make project 3 safe to extend. Auth stable, errors visible, logs useful.

**Focus areas:**

1. **Auth & session hardening**
   - Use NextAuth v5 + `@auth/prisma-adapter` per best practices.
   - Ensure all `(dashboard)` routes call `requireUser()` on the server.
   - Clean redirect behavior for unauthenticated users (no loops).

2. **API error handling & logging**
   - Standardize API handler pattern for `/app/api/**`:
     - `requireUser()` → validate input → Prisma call → return JSON → catch/serialize errors.
   - Add structured logging around finance and metrics APIs (at minimum, log route, userId, error summary).

3. **UX signals**
   - All critical mutations (auth, finance, ideas, tasks, metrics writes) must:
     - Show success toast.
     - Show error toast with useful message.
   - No silent failures.

4. **Minimal analytics**
   - Add a simple event logging mechanism for:
     - Login / logout.
     - Starts, ideas created, tasks status changes, finance edits.

**Exit criteria:** You can trust auth, see why an API call failed, and a user always gets feedback when something breaks.

---

## Phase 1 – Daily Loop UX (Dashboard, Ideas, Tasks, Journal)

**Objective:** Make project 3 feel as smooth and motivating as project 2 for the core day-to-day loop.

Use `ux-merge-from-project-2.md` for detailed UX; this section is the system-level framing.

1. **Dashboard (`/dashboard`)**
   - Today panel with:
     - Quick Start buttons (10s, 1m, 10m) using `start-controls`.
     - Today metrics cards (starts, study minutes, cash) backed by `/api/metrics/today`.
     - Quick-add strip: new idea, study session, cash snapshot.
   - React Query:
     - Query keys: `['metrics','today']`, `['ideas','summary']`, etc.
     - Mutations invalidate the right keys.

2. **Ideas → Action journal**
   - Dedicated page under `(dashboard)`.
   - Data:
     - Prisma models: `Idea`, `Action`, `MacroGoal`.
     - Server page loads ideas + actions + macro goals.
   - UX:
     - Table with latency calculation and green/yellow/red badges.
     - One-click "Mark Action Complete" per idea, using `/api/action`.

3. **Tasks Kanban with WIP limit**
   - Route: `.../dashboard/tasks` (or equivalent, stay consistent).
   - Data:
     - `Task` model with `status` (`backlog`, `ready`, `doing`, `done`), estimate, macroGoalId.
   - UX:
     - 4 columns (Backlog/Ready/Doing/Done).
     - Drag and drop.
     - WIP limit: max 3 in Doing; attempts to move a 4th show a blocking warning toast.

4. **Journal / reviews**
   - Route: `.../dashboard/journal`.
   - Data:
     - Model similar to project 2’s `ReviewEntry` (scope, date, wins, misses, insights, nextActions).
   - UX:
     - Daily/weekly toggle.
     - Form at top, list of entries below.

**Exit criteria:** A user can live in project 3 for their daily rhythm (starts, ideas, tasks, quick journaling) and not miss project 2’s UX.

---

## Phase 2 – Finance Suite Deepening

**Objective:** Turn project 3’s finance module into a serious personal finance cockpit.

Leverage existing pieces: `src/lib/finance.ts`, Prisma models, `/api/finance/**`, `FinanceDashboard`.

1. **KPI header (project-2-style UX, project-3 engine)**
   - KPIs: Net Worth, Liquid Net, Runway, DSCR, Credit Utilization.
   - Color semantics: green/yellow/red thresholds.
   - Short explanations under each metric (borrow from project 2 docs).

2. **Budget envelopes (P0 in progress)**
   - Complete CRUD for `/api/finance/budgets` (already partially implemented).
   - UI:
     - List of budgets by category/period.
     - Variance metric (actual vs budget) with color-coded status.

3. **Cashflow enhancements**
   - Filters: date range, category, income vs expense.
   - CSV export for cashflow.
   - Simple recurring templates: mark a transaction as recurring and auto-suggest next instances.

**Exit criteria:** Finance page answers: "What’s my net position? How long is my runway? Where is my money going? Am I on budget?"

---

## Phase 3 – Metrics & Insights

**Objective:** Make the metrics dashboard the brain that reads everything else.

1. **Extend `/api/metrics/trends`**
   - Include:
     - Starts per day.
     - Study minutes trend.
     - Idea→Action latency medians.
     - Execution Index (using project 2’s formula: weighted combination of focus minutes, starts, throughput, latency).

2. **Upgrade `MetricsDashboard`**
   - Charts for:
     - Starts trend (bar chart).
     - Study minutes (line chart).
     - Latency (line or area with colored zones).
     - Execution Index (line chart with target band).
   - Today metrics polling using React Query `refetchInterval`.

3. **Macro goal hooks**
   - Allow metrics views filtered or annotated by macro goal.

**Exit criteria:** A user can open metrics and see not just numbers, but clear patterns about execution speed, focus, and finance.

---

## Phase 4 – Goals, Projects, Tasks Hierarchy

**Objective:** Move from flat tasks to a structured Goals → Projects → Tasks model that rolls up progress.

1. **Prisma model alignment**
   - Ensure schema has:
     - `MacroGoal` (existing).
     - `Project` linked to `MacroGoal`.
     - `Task` linked to `Project` (and optionally directly to `MacroGoal`).

2. **UX: Projects & tasks**
   - Projects list grouped under macro goals.
   - Task board:
     - In addition to Kanban view, add a list/priority view with sorting by impact × effort.

3. **Progress rollup**
   - Derived metrics:
     - Progress % per project (tasks closed / total weighted by estimate).
     - Macro goal summary from child projects.

**Exit criteria:** Tasks aren’t just a board; they are explicitly tied to goals and projects with visible progress.

---

## Phase 5 – Integrations (Calendar, Banks, Wellbeing)

**Objective:** Connect the outside world once the core OS is stable.

1. **Google Calendar (P0)**
   - OAuth + encrypted token storage via NextAuth + `Account` table.
   - Two-way sync:
     - Pull events for agenda/conflict detection.
     - Push focus blocks, bill reminders, habit sessions.

2. **Bank / Plaid (optional, P2)**
   - Extend finance schema for Plaid items & accounts.
   - Webhook routes for transaction ingestion.
   - Map imported transactions into `CashflowTxn` with categories.

3. **Wellbeing data (P1)**
   - Minimal check-in model (sleep, mood, energy).
   - Simple entry UI.
   - Hook into metrics for correlation views.

**Exit criteria:** Calendar and (optionally) banks stop being separate universes; they reinforce the dashboard instead.

---

## Phase 6 – Automation, Intelligence, Social

**Objective:** Make the system proactive instead of just reflective.

1. **Rules engine**
   - Simple rule definitions stored in DB:
     - Example: If runway < 3 months → send alert.
     - If habit streak < X days → schedule a review.
   - Worker or scheduled job to evaluate rules and enqueue notifications.

2. **AI copilot**
   - Weekly summary generation combining:
     - Finance changes, tasks done, habits, metrics.
   - Priority suggestions for the coming week.
   - Natural-language capture for:
     - "Log $45 groceries yesterday." → cashflow entry.
     - "Add idea: ..." → idea.

3. **Accountability & sharing**
   - Read-only shared dashboards for partner/coach.
   - Weekly email summaries.

**Exit criteria:** The app nudges the user with insights and suggestions instead of waiting to be polled.

---

## Cross-Cutting Rules for All Phases

- **React Query discipline**
  - Namespaced keys per domain (`['finance','assets']`, `['tasks','board']`, `['metrics','trends']`, etc.).
  - Every mutation must specify which keys it invalidates.

- **API handler consistency**
  - `requireUser()` at the top.
  - Validate inputs (Zod or equivalent).
  - Typed, predictable JSON responses.

- **Prisma hygiene**
  - Use migrations; avoid manual schema drift.
  - `prisma/seed.ts` contains good demo data for QA and demos.

- **Docs stay honest**
  - When flows or data contracts change, update:
    - `docs/architecture.md` (Claudia level).
    - Cody docs (`cody-master-plan.md`, `cody-ux-merge-plan.md`, `ux-merge-from-project-2.md`) if the execution path changes.

---

## How to Use Cody vs Claudia

- **Claudia**: sets the destination and constraints (what the OS is and how it should behave at a system level).
- **Cody**: gives you the order and concrete slices to build next.

Turn each phase here into tickets, and refer back to Claudia’s docs to ensure architectural and quality expectations are met.


-cody
