# UX Merge Plan: Bringing Project 2 Flows into Project 3

> Goal: Keep project 3’s stronger architecture, data flows, and charts, while adopting the best UX patterns and flows from project 2.

This document is a **spec for your coder**. It does **not** change any existing code; it only describes what to build in project 3 (`dashboardgpt`).

---

## 1. High-Level Direction

- **Base to keep:**
  - Project 3’s architecture: Next.js App Router, `(dashboard)` segment, React Query patterns, finance module, metrics APIs.
  - Existing charts and metrics flows (`/api/metrics/today`, `/api/metrics/trends`, `MetricsDashboard`, `TodayMetrics`).
- **UX to import from project 2:**
  - **Context-aware pages**: each page owns both display and data entry (no separate generic “log data” page).
  - **Dashboard UX**: quick starts, today panel, quick-add interactions.
  - **Ideas → Action Journal** with latency and color-coded status.
  - **Tasks Kanban with WIP limit** and simple drag-and-drop.
  - **Finance KPIs UX** (clear labels, color semantics, inline explanations).

We will:
- Use **project 3 routes + architecture**.
- Recreate **project 2’s flows** and UX affordances on top of that.

---

## 2. Navigation & Page Map

Target (in project 3) is a clear set of main destinations mirroring project 2’s mental model:

- `/dashboard` (today panel)
- `/dashboard/metrics` (charts & execution metrics)
- `/dashboard/ideas` (idea → action journal)
- `/dashboard/tasks` (Kanban with WIP limits)
- `/dashboard/finance` (finance KPIs & tables)
- `/dashboard/experiments` (routine experiments board – can stay closer to project 3’s plan)
- `/dashboard/journal` (reviews / reflections)
- `/dashboard/settings` (macro goals, preferences, seeds)

**Action items (coder):**
- [ ] In `(dashboard)` segment, ensure you have or add pages matching the above structure.
  - You already have `dashboard`, `dashboard/metrics`, `finance`, `experiments`, `journal`, `reminders`, `settings` routes.
  - Consider aligning path names and sidebar labels to match project 2’s wording (Dashboard, Ideas, Tasks, Finance, Metrics, Reviews, Settings) to reduce cognitive load.

---

## 3. Dashboard UX: Today Panel + Quick Starts

### 3.1 Desired UX (from project 2)

On the dashboard page, the user should see:
- **Quick Start buttons** (10s, 1m, 10m) front and center.
- **Today’s metrics**: starts count, study minutes, cash on hand / key KPIs.
- **Quick-add controls** for:
  - New idea
  - Study session
  - Cash snapshot
- Inline **macro goals** display for context.

### 3.2 Mapping to project 3

Relevant pieces in project 3:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/start-controls.tsx`
- `src/components/today-metrics.tsx`
- `src/components/quick-add.tsx` (if present; if not, recreate pattern from project 2)
- Metrics APIs: `/api/metrics/today`, `/api/metrics/trends`

### 3.3 Implementation notes

- **Layout:**
  - Use a **two-column layout** similar to project 2:
    - Left: Quick start controls + quick-add blocks.
    - Right: Today metrics + maybe a compact chart or “Execution index” summary.
- **Quick starts:**
  - Keep project 3’s `start-controls` logic (countdown, completion dialog), but:
    - Expose **10s / 1m / 10m buttons** clearly, like project 2.
    - On completion, refresh Today metrics via React Query invalidation.
- **Today metrics panel:**
  - Reuse `TodayMetrics` but style to match project 2’s “cards” look:
    - Cards for Starts Today, Study Minutes, Cash on Hand.
    - Use **color semantics** (green/yellow/red) for thresholds where applicable.
- **Quick add:**
  - Implement a compact **Quick Add strip** under the metrics:
    - New idea (title + optional macro goal).
    - Study session (duration, topic).
    - Cash snapshot (amount, account).
  - Each quick add posts to existing APIs (`/api/idea`, `/api/study` equivalent, `/api/cash`/`/api/finance/cashflow`/`CashSnapshot` depending on current design) and triggers React Query invalidations.

---

## 4. Ideas → Action Journal

### 4.1 Desired UX (from project 2)

From project 2’s Ideas page:
- Table of **ideas with latency** from created to completed action.
- Columns:
  - Title, description
  - Created date
  - Linked macro goal (colored pill)
  - Status (pending / done)
  - **Latency badge** with color:
    - Green ≤ 3 days
    - Yellow ≤ 7 days
    - Red > 7 days
- One-click **“Mark Action Complete”** button that:
  - Creates an `Action` record.
  - Computes latency.
  - Updates the table in place.

### 4.2 Mapping to project 3

Project 3 already has:
- Prisma models: `Idea`, `Action`, `MacroGoal`.
- API route: `src/app/api/idea/route.ts` and `src/app/api/action/route.ts`.

You likely **don’t yet have** a full Ideas UI page. We want one under:
- `src/app/(dashboard)/dashboard/ideas/page.tsx` **or** `src/app/(dashboard)/ideas/page.tsx` (pick one pattern and stay consistent).

### 4.3 Implementation notes

- **Server component page**:
  - Use `requireUser()` to load **Ideas with Actions and MacroGoals**.
  - Compute latency days on the server side for each idea with at least one action.
  - Pass to a client component `IdeasJournal` for interactivity.
- **Client component (journal table)**:
  - Table like in project 2: rows of ideas, color-coded latency badges.
  - Include a **“Mark Action Complete”** button per row.
  - On click:
    - Call `/api/action` with `ideaId` and optional description.
    - On success, invalidate `['ideas','list']` query and show a toast.
- **Latency color semantics:** reuse project 2’s mapping exactly:
  - ≤3 days: green; ≤7: yellow; >7: red.

---

## 5. Tasks Kanban with WIP Limits

### 5.1 Desired UX (from project 2)

Project 2 Tasks page:
- 4 columns: **Backlog / Ready / Doing / Done**.
- Drag-and-drop tasks between columns.
- **WIP limit of 3** in Doing column:
  - If user tries to move a 4th, show a **warning toast** and block.
- Task properties: title, description, estimate (minutes), linked macro goal.

### 5.2 Mapping to project 3

Today, project 3’s roadmap covers tasks but doesn’t fully implement them.

Target route:
- `src/app/(dashboard)/dashboard/tasks/page.tsx`.

You’ll need:
- Prisma model(s) for tasks (if not already defined).
- API routes under `/app/api/tasks` (or `/app/api/projects/tasks` depending on hierarchy).
- React Query hooks & query keys (`['tasks','board']`).

### 5.3 Implementation notes

- **Data model:**
  - Reuse project 2’s `Task` model semantics; ensure fields exist for:
    - `status` enum or string: `backlog`, `ready`, `doing`, `done`.
    - `estimateMinutes`.
    - `macroGoalId` (optional).
- **Page + client component:**
  - Server component loads tasks by `status` into 4 lists.
  - Client `TasksBoard` renders 4 columns, using HTML5 drag-and-drop (like project 2) or a library if you prefer.
- **WIP limit logic:**
  - On drop into `Doing`, check how many tasks are already `Doing`.
  - If >= 3, **prevent** the change and show a destructive/warning toast.
- **React Query integration:**
  - `useQuery(['tasks','board'], ...)` for initial load.
  - Mutations for `updateTaskStatus`, `createTask`, `deleteTask` that invalidate `['tasks','board']`.

---

## 6. Finance UX: Apply Project 2’s Clarity on Top of Project 3’s Engine

### 6.1 Desired UX (from project 2)

Project 2 Finance page:
- KPIs with clear labeling and **color-coded thresholds**:
  - Net Worth
  - Liquid Net
  - Runway
  - DSCR
  - Credit Card Utilization
- Panels for **Assets** and **Liabilities** with totals.
- Inline explanations of each KPI and what good/bad values look like.

### 6.2 Mapping to project 3

You already have in project 3:
- Finance APIs: `/api/finance/assets`, `/api/finance/liabilities`, `/api/finance/cashflow`, `/api/finance/budgets`, `/api/finance/summary`.
- Server lib: `src/lib/finance.ts` with `computeFinanceSummary` and query helpers.
- Page: `src/app/(dashboard)/finance/page.tsx`.
- Client component: `src/components/finance/finance-dashboard.tsx`.

### 6.3 Implementation notes

- **KPI header section:**
  - Model it after project 2’s `FinanceClient` UI:
    - Large, easily scannable cards for each KPI.
    - Use **consistent colors**:
      - Green: healthy.
      - Yellow: warning.
      - Red: danger.
    - Add short one-line explanation under each KPI label.
- **Budgets integration (P0 log):**
  - Surface monthly/quarterly budgets in a panel below KPIs.
  - Include variance metrics (already implemented per `progress.md`); ensure UX makes variance obvious.
- **Copy:**
  - Borrow explanation text from project 2’s `WHAT_WE_BUILT.md` Finance section for DSCR, utilization, runway.

---

## 7. Metrics & Charts: Keep Project 3, Add Signals from Project 2

### 7.1 Desired UX

From project 2:
- Charts for:
  - Starts per day.
  - Study minutes per week.
  - Idea→Action latency trend.
  - Cash on hand.
- “Execution Index” composite metric (focus minutes, starts, throughput, latency).

From project 3:
- Strong metrics infra:
  - `/api/metrics/today` & `/api/metrics/trends`.
  - `MetricsDashboard` component with Recharts.

### 7.2 Implementation notes

- **Extend `metrics/trends` API** to include:
  - Latency median per week.
  - Execution Index calculation (mirroring project 2’s formula).
- **Update `MetricsDashboard`:**
  - Add charts for latency trend and Execution Index.
  - Use consistent color semantics from project 2 (green/yellow/red bands or reference lines where helpful).

---

## 8. Reviews / Journal UX

### 8.1 Desired UX (from project 2)

Reviews page:
- Daily/weekly scope toggle.
- Form at the top for **Wins, Misses, Insights, Next Actions/Foci**.
- List of past reviews below.

### 8.2 Mapping to project 3

Project 3 has a `journal` route stub; we want to:
- Make `journal` functionally equivalent to project 2’s Reviews page.

Implementation sketch:
- Server page loads Review-like entries (model name in project 3 might differ; align with project 2’s `ReviewEntry`).
- Client form at top with scope toggle and textareas.
- On submit, POST to an API route (e.g., `/api/journal` or `/api/review`), then invalidate `['journal','entries']`.

---

## 9. Interaction Polish & Shortcuts

From project 2’s UX and project 3’s README:
- Keyboard shortcuts: `S` (start), `M` (start 1m), `N` (new idea), `J` (journal), `D` (dashboard).

Implementation notes:
- Ensure the shortcuts are wired globally in project 3’s layout or a provider.
- When pressing:
  - `S` / `M`: open `start-controls` with correct pre-selected duration.
  - `N`: focus the idea quick-add input on dashboard or ideas page.
  - `J`: navigate to journal.
  - `D`: navigate to dashboard.

---

## 10. Suggested Implementation Phases

To make this tractable for your coder, here’s an order of work:

1. **Phase 1 – Dashboard parity**
   - Align `/dashboard` layout to project 2’s Today panel.
   - Wire quick starts + Today metrics + quick adds.

2. **Phase 2 – Ideas Journal**
   - Implement ideas page with latency + color coding + mark-complete flows.

3. **Phase 3 – Tasks Board**
   - Implement Kanban + WIP limits.

4. **Phase 4 – Finance UX polish**
   - Apply project 2’s KPI card designs and copy to project 3’s finance engine.

5. **Phase 5 – Metrics Extensions**
   - Extend metrics API for latency + Execution Index and add charts.

6. **Phase 6 – Journal / Reviews**
   - Flesh out the journal page to match project 2’s Reviews flows.

7. **Phase 7 – Shortcuts & micro-polish**
   - Keyboard shortcuts, toasts, consistent color semantics.

Each phase is shippable and keeps project 3’s architecture while moving UX toward project 2’s strengths.


-cody
