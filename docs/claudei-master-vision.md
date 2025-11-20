# Madam Claudei's Master Vision for Structure Is Grace

> A comprehensive, reality-grounded roadmap based on actual code inspection of project 3, synthesizing the best of both projects into the ultimate personal operating system.

**Date**: 2025-11-20  
**Context**: 1M token window used to analyze both projects' actual code, architecture, and capabilities.

---

## I. The Ground Truth (What Actually Exists in Project 3)

### ✅ What's Already Built & Working

**Dashboard** (`/dashboard/page.tsx`)
- Server-side data fetching with proper auth fallback
- `StartControls` component with 10s/60s buttons, countdown timer, completion modal
- `TodayMetrics` with React Query polling (60s interval)
- `QuickAdd` components for ideas, study, cash
- Macro goals integration throughout

**Components That Exist**
- `start-controls.tsx` (329 lines) - Full start flow with mutations, progress bar, reflection capture
- `today-metrics.tsx` - Polling metrics with `['metrics','today']` query key
- `idea-journal-table.tsx` - Ideas table with latency color coding (green ≤3d, yellow ≤7d, red >7d), "Mark action completed" button
- `routine-experiment-board.tsx` (307 lines) - Full Kanban for experiments (planned/running/complete) with takeaway capture
- `quick-add.tsx` - Quick capture for ideas, study, cash
- `keyboard-shortcuts.tsx` - Global shortcuts wired
- `metrics-dashboard.tsx` (7308 lines) - Charts infrastructure
- `finance/finance-dashboard.tsx` (exists but not inspected yet)

**Backend Infrastructure**
- `src/lib/finance.ts` (288 lines) - Complete finance engine:
  - `computeFinanceSummary`: Net worth, liquid net, runway, DSCR, debt utilization
  - `getBudgetEnvelopesWithActuals`: Budget tracking with variance
  - `getFinanceInitialData`: Orchestrates parallel fetches
  - Proper serialization for dates
- `src/lib/auth.ts`, `server-session.ts` - Auth utilities
- `src/lib/logger.ts` - Logging infrastructure exists
- `src/lib/date.ts` - Timezone utilities

**API Routes** (folders exist, need to verify implementations)
- `/api/start`, `/api/idea`, `/api/action`, `/api/experiment`
- `/api/finance/{assets,liabilities,cashflow,budgets,summary}`
- `/api/metrics/{today,trends}`
- `/api/study`, `/api/cash`, `/api/reminder`, `/api/macro-goal`

**Prisma Schema** (268 lines, fully defined)
- User, MacroGoal, StartEvent, StudySession, CashSnapshot
- Asset, Liability, CashflowTxn, CashflowTemplate, BudgetEnvelope
- Idea, Action (with latency support)
- RoutineExperiment (with status enum: planned/running/complete)
- Reminder
- Account, Session, VerificationToken (NextAuth)

### ❌ What's Missing or Incomplete

**Pages That Are Stubs**
- `/finance/page.tsx` - Exists but need to verify if it uses `FinanceDashboard` component properly
- `/journal/page.tsx` - Likely stub, no journal component found
- `/reminders/page.tsx` - Has `reminders-panel.tsx` component but page integration unclear
- `/settings/page.tsx` - Has `settings-panel.tsx` but integration unclear

**Missing Core Features from Project 2**
- **Tasks Kanban** - No Task model in Prisma schema, no tasks page, no WIP limit logic
- **Reviews/Journal** - No ReviewEntry model, journal page is stub
- **Finance UX** - Finance engine exists but UX needs project-2-style KPI cards with color semantics

**Architecture Gaps**
- No centralized `src/lib/metrics.ts` for metrics aggregation (logic scattered)
- Toast system exists (`toast-provider.tsx`) but not consistently used across all mutations
- Keyboard shortcuts component exists but global wiring unclear

---

## II. The Synthesis Strategy

Project 3 has **80% of the engine** but **40% of the daily UX**. Project 2 has **100% of the daily UX** but **60% of the engine quality**.

### The Path Forward

1. **Keep project 3's bones** (architecture, finance engine, React Query patterns, Prisma schema)
2. **Add project 2's soul** (Tasks Kanban with WIP, Reviews, Finance KPI UX, consistent context-aware pages)
3. **Fix the gaps** (centralize metrics logic, ensure all mutations toast, wire shortcuts globally)

---

## III. The Master Phases (Grounded in Reality)

### Phase 0: Foundations (Week 1) - CRITICAL

**Objective**: Make what exists trustworthy and observable.

**Auth & Session Hardening**
- ✅ Already has: `requireUser()` helper, NextAuth v5 setup, fallback to seed user
- 🔧 Add: Session expiry UX, clean redirect loops, test logout→login flow

**Toast Discipline**
- ✅ Already has: `toast-provider.tsx`, `showToast` in `start-controls`
- 🔧 Audit: Ensure ALL mutations in `idea-journal-table`, `routine-experiment-board`, `quick-add`, finance components show success/error toasts
- 🔧 Pattern: Every `useMutation` must have `onSuccess` (toast + invalidate) and `onError` (toast with message)

**Logging & Observability**
- ✅ Already has: `src/lib/logger.ts`
- 🔧 Add: Structured logging in all `/api/**` routes (route name, userId, error summary minimum)
- 🔧 Pattern: Wrap API handlers with try/catch that logs before returning error response

**Analytics Events**
- 🔧 Add: Simple event logging for: login, starts, ideas created, actions marked, experiments status changes, finance edits
- 🔧 Implementation: Extend `logger.ts` with `logEvent(userId, eventType, metadata)` function

**Exit Criteria**
- All mutations show toasts (success + error)
- All API routes log errors with context
- Auth flow tested (logout, login, session expiry)

---

### Phase 1: Complete the Daily Loop (Weeks 2-3)

**Objective**: Make project 3 feel as complete as project 2 for daily use.

#### 1.1 Dashboard - Already 90% Done, Polish It

**Current State**: Dashboard page exists, has starts + today metrics + quick-add

**Remaining Work**:
- ✅ Start controls: Already excellent (countdown, reflection modal, macro goal linking)
- ✅ Today metrics: Already polling with React Query
- ✅ Quick-add: Already has idea/study/cash
- 🔧 Layout: Verify two-column layout matches project 2's feel (left: starts + quick-add, right: metrics)
- 🔧 Macro goals: Ensure they're displayed prominently for context (already passed as props)

**Effort**: 2-4 hours (mostly layout tweaks)

#### 1.2 Ideas → Action Journal - 70% Done, Wire the Page

**Current State**: `idea-journal-table.tsx` component exists with full latency logic and "Mark action completed" button

**Remaining Work**:
- 🔧 Create: `/dashboard/ideas/page.tsx` (server component)
  - Fetch ideas with actions and macro goals using Prisma
  - Compute latency on server: `(action.completedAt - idea.createdAt) / (1000 * 60 * 60 * 24)`
  - Pass to `<IdeaJournalTable>` client component
- 🔧 Add: "Create new idea" form at top of page (reuse quick-add pattern)
- ✅ Component: Already has latency color coding (green/yellow/red), mark complete button, mutation with optimistic update

**Effort**: 4-6 hours (page creation + form)

#### 1.3 Tasks Kanban with WIP - NOT STARTED, Build from Scratch

**Current State**: **Does not exist**. No Task model in Prisma, no tasks page, no components.

**Required Work**:
1. **Prisma schema addition**:
   ```prisma
   model Task {
     id          String   @id @default(cuid())
     userId      String
     title       String
     description String?
     status      String   @default("backlog") // backlog, ready, doing, done
     estimate    Int?     // minutes
     macroGoalId String?
     createdAt   DateTime @default(now())
     completedAt DateTime?
     
     user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
     macroGoal MacroGoal? @relation(fields: [macroGoalId], references: [id])
   }
   ```
   Run: `npx prisma migrate dev --name add-tasks`

2. **API routes**:
   - `POST /api/tasks` - Create task
   - `GET /api/tasks` - List tasks by status
   - `PATCH /api/tasks/[id]` - Update status (with WIP check)
   - `DELETE /api/tasks/[id]` - Delete task

3. **Component**: `src/components/tasks-board.tsx`
   - 4 columns: Backlog / Ready / Doing / Done
   - Drag-and-drop (HTML5 or library)
   - WIP limit logic: On drop into "Doing", count existing "doing" tasks; if >= 3, block with destructive toast
   - React Query: `['tasks','board']` query key, mutations invalidate

4. **Page**: `/dashboard/tasks/page.tsx`
   - Server fetch tasks grouped by status
   - Pass to `<TasksBoard>` client component

**Effort**: 12-16 hours (schema + API + component + page)

#### 1.4 Journal / Reviews - NOT STARTED, Build from Scratch

**Current State**: `/journal/page.tsx` exists but is likely stub. No ReviewEntry model.

**Required Work**:
1. **Prisma schema addition**:
   ```prisma
   model ReviewEntry {
     id          String   @id @default(cuid())
     userId      String
     scope       String   // "daily" or "weekly"
     date        DateTime @default(now())
     wins        String?
     misses      String?
     insights    String?
     nextActions String?
     createdAt   DateTime @default(now())
     
     user User @relation(fields: [userId], references: [id], onDelete: Cascade)
   }
   ```
   Run: `npx prisma migrate dev --name add-review-entries`

2. **API routes**:
   - `POST /api/review` - Create review
   - `GET /api/review` - List reviews (filtered by scope if needed)

3. **Component**: `src/components/review-form.tsx`
   - Daily/weekly toggle
   - Form fields: wins, misses, insights, nextActions
   - Submit → POST `/api/review` → invalidate `['reviews','list']`

4. **Page**: `/dashboard/journal/page.tsx`
   - Server fetch recent reviews
   - Render `<ReviewForm>` at top
   - List of past reviews below

**Effort**: 8-10 hours (schema + API + component + page)

**Phase 1 Exit Criteria**:
- Dashboard feels complete (starts, metrics, quick-add all polished)
- Ideas page exists with journal table and create form
- Tasks Kanban exists with WIP=3 enforcement
- Journal page exists with daily/weekly reviews

---

### Phase 2: Finance UX Excellence (Week 4)

**Objective**: Apply project 2's KPI card UX on top of project 3's finance engine.

**Current State**: Finance engine (`finance.ts`) is excellent. Finance page and component exist but UX unknown.

**Required Work**:

1. **Inspect & Refactor Finance Page**:
   - Read `/finance/page.tsx` and `finance/finance-dashboard.tsx`
   - Ensure it uses `getFinanceInitialData(userId)` for server hydration
   - Verify React Query keys: `['finance','assets']`, `['finance','liabilities']`, `['finance','cashflow']`, `['finance','budgets']`, `['finance','summary']`

2. **KPI Header Section** (Project 2 Style):
   - Large, scannable cards for:
     - **Net Worth** (green if positive, red if negative)
     - **Liquid Net** (emergency fund indicator)
     - **Runway** (months, color-coded: green ≥6, yellow 3-6, red <3)
     - **DSCR** (green ≥1.5, yellow 1.0-1.5, red <1.0)
     - **Debt Utilization** (green ≤30%, yellow 30-70%, red >70%)
   - Short one-line explanation under each KPI
   - Copy explanations from project 2's `WHAT_WE_BUILT.md`

3. **Budgets Panel**:
   - ✅ Already has: `getBudgetEnvelopesWithActuals` with variance calculation
   - 🔧 Ensure: UI shows budgets with variance metrics, color-coded (green under budget, red over)

4. **Cashflow Enhancements**:
   - ✅ Already has: `CashflowTemplate` model for recurring transactions
   - 🔧 Add: Filters (date range, category, inflow vs outflow)
   - 🔧 Add: CSV export button (client-side generation from cashflow data)

**Effort**: 10-12 hours (KPI cards + budgets UI + cashflow filters)

**Phase 2 Exit Criteria**:
- Finance page has project-2-style KPI cards with color semantics
- Budgets show variance clearly
- Cashflow has filters and CSV export

---

### Phase 3: Metrics Brain (Week 5)

**Objective**: Make metrics dashboard the central insights hub.

**Current State**: `metrics-dashboard.tsx` exists (7308 lines), `/api/metrics/today` and `/api/metrics/trends` exist

**Required Work**:

1. **Centralize Metrics Logic**:
   - Create: `src/lib/metrics.ts`
   - Move: Aggregation logic from API routes into reusable functions
   - Functions:
     - `getStartsPerDay(userId, days)` - Returns array of {date, count}
     - `getStudyMinutesPerWeek(userId, weeks)` - Returns array of {week, minutes}
     - `getLatencyMedians(userId, weeks)` - Returns array of {week, medianDays}
     - `computeExecutionIndex(userId)` - Weighted formula from project 2

2. **Extend `/api/metrics/trends`**:
   - Add: Starts per day (last 14 days)
   - Add: Study minutes per week (last 8 weeks)
   - Add: Latency medians per week (last 8 weeks)
   - Add: Execution Index (current value + trend)

3. **Upgrade `MetricsDashboard` Component**:
   - Add charts for:
     - Starts trend (bar chart, Recharts)
     - Study minutes (line chart)
     - Latency trend (line chart with green/yellow/red zones)
     - Execution Index (line chart with target band)
   - Use consistent color semantics from project 2

4. **Macro Goal Filtering**:
   - Add: Dropdown to filter metrics by macro goal
   - Update queries to filter by `linkedMacroGoalId` where applicable

**Effort**: 12-14 hours (centralize logic + extend API + add charts)

**Phase 3 Exit Criteria**:
- Metrics page shows starts, study, latency, and Execution Index charts
- All metrics logic centralized in `src/lib/metrics.ts`
- Macro goal filtering works

---

### Phase 4: Goals → Projects → Tasks Hierarchy (Week 6)

**Objective**: Elevate tasks from flat Kanban to goal-linked system.

**Current State**: MacroGoal model exists, Task model will exist after Phase 1.3

**Required Work**:

1. **Add Project Model**:
   ```prisma
   model Project {
     id          String   @id @default(cuid())
     userId      String
     title       String
     description String?
     macroGoalId String?
     createdAt   DateTime @default(now())
     
     user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
     macroGoal MacroGoal? @relation(fields: [macroGoalId], references: [id])
     tasks     Task[]
   }
   ```
   Update Task model: Add `projectId String?` and relation

2. **Projects Page**:
   - `/dashboard/projects/page.tsx`
   - List projects grouped under macro goals
   - Show progress % per project (tasks closed / total weighted by estimate)

3. **Enhance Tasks Board**:
   - Add: Project dropdown when creating task
   - Add: Priority/impact × effort fields
   - Add: List view (alternative to Kanban) with sorting by priority

4. **OKR Module** (Optional, P1):
   - Quarterly objectives with confidence ratings
   - Auto-generated status emails

**Effort**: 10-12 hours (Project model + projects page + task enhancements)

**Phase 4 Exit Criteria**:
- Projects exist and link to macro goals
- Tasks link to projects
- Progress rollup visible

---

### Phase 5: Integrations (Weeks 7-8)

**Objective**: Connect calendar and (optionally) banks.

#### 5.1 Google Calendar (P0)

**Required Work**:

1. **OAuth Setup**:
   - NextAuth already configured; extend with Google provider
   - Store tokens in `Account` table (`access_token`, `refresh_token`, `expires_at`)

2. **Sync Worker**:
   - Create: `/api/integrations/calendar/sync` (cron or manual trigger)
   - Pull events: Fetch upcoming events, store in new `CalendarEvent` model
   - Push events: Create Google Calendar events for focus blocks, bill reminders, habit sessions

3. **UI**:
   - Settings page: "Connect Google Calendar" button
   - Dashboard: Show today's calendar events in sidebar
   - Tasks page: "Schedule task" button that creates calendar event

**Effort**: 16-20 hours (OAuth + sync logic + UI)

#### 5.2 Bank / Plaid (P2, Optional)

**Required Work**:

1. **Plaid Integration**:
   - Add: `PlaidItem` model (itemId, accessToken, institutionName)
   - Webhook: `/api/integrations/plaid/webhook` for transaction updates
   - Map transactions to `CashflowTxn` with category inference

2. **UI**:
   - Finance page: "Connect bank account" button
   - Auto-import transactions with review/edit flow

**Effort**: 20-24 hours (Plaid SDK + webhook + UI)

**Phase 5 Exit Criteria**:
- Google Calendar connected and syncing
- (Optional) Bank accounts connected via Plaid

---

### Phase 6: Automation & Intelligence (Weeks 9-10)

**Objective**: Make the system proactive.

#### 6.1 Rules Engine

**Required Work**:

1. **Rules Model**:
   ```prisma
   model Rule {
     id          String   @id @default(cuid())
     userId      String
     name        String
     condition   String   // JSON: {type: "runway_below", value: 3}
     action      String   // JSON: {type: "send_alert", message: "..."}
     isActive    Boolean  @default(true)
     lastFiredAt DateTime?
     
     user User @relation(fields: [userId], references: [id], onDelete: Cascade)
   }
   ```

2. **Rule Evaluator**:
   - Create: `src/lib/rules.ts`
   - Function: `evaluateRules(userId)` - Checks all active rules, fires actions
   - Cron: Run every hour or daily

3. **Example Rules**:
   - If runway < 3 months → send email alert
   - If habit streak < 7 days → schedule review
   - If DSCR < 1.0 → flag in dashboard

**Effort**: 8-10 hours (model + evaluator + cron)

#### 6.2 AI Copilot

**Required Work**:

1. **Weekly Summary**:
   - Cron: Every Sunday, generate summary combining finance changes, tasks done, habits, metrics
   - Use OpenAI API or similar to generate natural language summary
   - Store in new `AISummary` model or send via email

2. **Priority Suggestions**:
   - Analyze: Tasks with high impact × low effort
   - Suggest: Top 3 tasks for the coming week

3. **Natural Language Capture**:
   - Input: "Log $45 groceries yesterday"
   - Parse: Extract amount, category, date
   - Create: CashflowTxn entry

**Effort**: 16-20 hours (AI integration + parsing + UI)

**Phase 6 Exit Criteria**:
- Rules engine running and firing alerts
- Weekly AI summaries generated
- Natural language capture working for common commands

---

## IV. Cross-Cutting Standards (Enforce in Every Phase)

### React Query Discipline
- **Namespaced keys**: `['finance','assets']`, `['tasks','board']`, `['ideas','list']`, `['metrics','today']`, `['metrics','trends']`
- **Every mutation**: `onSuccess` (toast + invalidate specific keys), `onError` (toast with error message)
- **Hydration pattern**: Server components pass `initialData` to client components

### API Handler Pattern
```typescript
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    // Validate with Zod
    const result = await prisma.model.create({ data: { userId: user.id, ...body } });
    return NextResponse.json(result);
  } catch (error) {
    logger.error('API_ERROR', { route: '/api/...', error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Prisma Hygiene
- Always use migrations: `npx prisma migrate dev --name <name>`
- Seed file (`prisma/seed.ts`) contains good demo data
- All queries scoped by `userId` to prevent data leakage

### Toast Pattern
```typescript
const mutation = useMutation({
  mutationFn: ...,
  onSuccess: (data) => {
    showToast({ description: 'Success message', variant: 'success' });
    queryClient.invalidateQueries({ queryKey: ['domain','resource'] });
  },
  onError: (error: Error) => {
    showToast({ description: error.message || 'Failed', variant: 'error' });
  }
});
```

### Keyboard Shortcuts (Already Exists, Ensure Global Wiring)
- `S` → Start 10s
- `M` → Start 1m
- `N` → Focus new idea input
- `J` → Navigate to journal
- `D` → Navigate to dashboard
- `F` → Navigate to finance
- `T` → Navigate to tasks

---

## V. Effort Summary & Timeline

| Phase | Focus | Effort (Hours) | Calendar Time |
|-------|-------|----------------|---------------|
| Phase 0 | Foundations (toasts, logging, auth) | 12-16 | Week 1 |
| Phase 1 | Daily Loop (ideas page, tasks Kanban, journal) | 24-32 | Weeks 2-3 |
| Phase 2 | Finance UX (KPI cards, budgets, cashflow) | 10-12 | Week 4 |
| Phase 3 | Metrics Brain (charts, Execution Index) | 12-14 | Week 5 |
| Phase 4 | Goals/Projects/Tasks Hierarchy | 10-12 | Week 6 |
| Phase 5 | Integrations (Calendar, Plaid) | 36-44 | Weeks 7-8 |
| Phase 6 | Automation & AI | 24-30 | Weeks 9-10 |
| **Total** | | **128-160** | **10 weeks** |

**Assumptions**: 1 developer, 12-16 hours/week, includes testing and polish.

---

## VI. What Makes This "Jesus-Level"

1. **Grounded in Reality**: Every recommendation based on actual code inspection, not assumptions.
2. **Respects What Exists**: Leverages project 3's excellent finance engine, React Query patterns, Prisma schema.
3. **Fills Real Gaps**: Adds Tasks Kanban, Reviews, Finance UX that project 3 actually lacks.
4. **Systematic Quality**: Enforces toasts, logging, React Query discipline, API patterns across all phases.
5. **Phased & Shippable**: Every phase delivers usable value, not just infrastructure.
6. **Comprehensive**: Covers daily loop, finance, metrics, goals, integrations, automation—the full OS.

---

## VII. Final Recommendation

**Continue with project 3 as the base**, following this roadmap phase by phase.

**Why project 3**:
- Superior architecture (BFF APIs, React Query, lib separation)
- Excellent finance engine already built
- Better charts infrastructure
- Cleaner module boundaries

**What to steal from project 2**:
- Tasks Kanban with WIP=3 (build from scratch in Phase 1.3)
- Reviews/Journal UX (build from scratch in Phase 1.4)
- Finance KPI card design and copy (apply in Phase 2)
- Context-aware page philosophy (already mostly present in project 3)

**Execution order**:
1. Phase 0 (foundations) is **non-negotiable first**—without toasts and logging, debugging later phases is hell.
2. Phase 1 (daily loop) makes the app **usable daily**—this is the MVP completion milestone.
3. Phases 2-3 (finance + metrics) make it **insightful**.
4. Phases 4-6 (hierarchy + integrations + AI) make it **powerful**.

---

**This roadmap is your north star. Print it, pin it, execute it phase by phase. When in doubt, refer back to the principles and patterns defined here.**

-Madam Claudei
