# Claude-Dash Implementation Plan
## Life-Dashboard Architect - Master Execution Plan

**Generated:** 2025-12-03
**Project:** Structure Is Grace (claude-dash)
**Location:** /mnt/d/claude dash/claude-dash

---

## Executive Summary

This document provides a comprehensive assessment of the current codebase state, gap analysis against the roadmap, and a prioritized implementation plan for delivering the P0 features outlined in docs/roadmap.md.

### Current State Assessment

**✅ IMPLEMENTED (Shipped)**
- Next.js 14 App Router with TypeScript
- PostgreSQL + Prisma ORM with comprehensive schema
- NextAuth.js magic-link authentication
- **Personal Finance Suite** (P0 - COMPLETE):
  - Assets, Liabilities, Cashflow tracking
  - Budget envelopes with variance metrics
  - Cashflow templates for recurring transactions
  - CSV export with filters
  - KPI dashboard (net worth, runway, DSCR, debt utilization)
- **Observability Baseline** (P0 - COMPLETE):
  - Sentry integration (client + server)
  - Structured logger with breadcrumbs
  - Toast notification system
  - Analytics event tracking (stub)
  - API rate limiting (120 req/min)
- **Metrics Dashboard**:
  - Today metrics (starts, study minutes, cash)
  - Macro goals tracking
  - Trend charts (Recharts)
- **Supporting Features**:
  - Ideas journal
  - Routine experiments board
  - Reminders system
  - Start events (micro-starts)
  - Study sessions
  - Settings panel

**❌ MISSING (P0 Priorities)**
- **Tasks & Prioritization** - Critical gap
- **Daily Rhythm & Habits** - Partial (has starts/experiments, needs proper habit engine)
- **Goals & Projects Hierarchy** - Partial (has MacroGoal, needs Projects + Tasks linkage)
- **Google Calendar Integration** - Not started
- **Testing Infrastructure** - No test frameworks installed
- **Auth Hardening** - Basic magic-link only, needs refresh tokens + session management
- **Profile Settings** - Basic (timezone, currency), needs notification preferences
- **Notification Center** - Not implemented

---

## Gap Analysis by Priority

### P0 - Critical Foundation Blockers

| Feature | Status | Completion | Blockers | Priority |
|---------|--------|------------|----------|----------|
| Finance Suite | ✅ Shipped | 100% | None | DONE |
| Observability | ✅ Shipped | 90% | Need actual analytics endpoint | DONE |
| **Tasks Module** | ❌ Missing | 0% | Core blocker for workflow | **HIGHEST** |
| **Habits Engine** | 🟡 Partial | 30% | Has starts/experiments, needs streaks + cadence | **HIGH** |
| **Goals Hierarchy** | 🟡 Partial | 40% | Has MacroGoals, needs Projects + Tasks | **HIGH** |
| **Calendar Sync** | ❌ Missing | 0% | OAuth + data model needed | **HIGH** |
| Auth Hardening | 🟡 Partial | 50% | Needs refresh tokens, session expiry UX | MEDIUM |
| Testing | ❌ Missing | 0% | No frameworks installed | **CRITICAL** |
| Profile Settings | 🟡 Partial | 60% | Needs notification channels | LOW |

### P1 - High Leverage Improvements

| Feature | Status | Notes |
|---------|--------|-------|
| Scenario Planning | Not started | Finance runway projections |
| Knowledge Library | Not started | Resource tracking |
| Wellbeing Tracking | Not started | Health metrics |

### P2 - Differentiators

| Feature | Status | Notes |
|---------|--------|-------|
| Social & Accountability | Not started | Partner sharing |
| AI Copilot | Not started | Natural language capture |
| Plaid Integration | Not started | Bank sync |

---

## Recommended Execution Order (P0 Focus)

### Phase 1: Foundation & Testing (Week 1)
**Rationale:** Cannot ship features without tests. Testing infrastructure enables confident iteration.

1. **Set up testing infrastructure**
   - Install Vitest for unit/integration tests
   - Install Playwright for E2E tests
   - Create test utilities (mock Prisma, auth helpers)
   - Add npm scripts: `test`, `test:e2e`, `test:coverage`
   - Goal: 80% coverage on finance module as proof

2. **Document architecture updates**
   - Update docs/architecture.md with recent changes
   - Document toast system, analytics, rate limiting
   - Create testing guide

### Phase 2: Tasks & Prioritization (Week 2)
**Rationale:** Tasks are the foundation for productivity workflows. Blocks Goals/Projects integration.

1. **Database schema**
   ```prisma
   model Task {
     id          String   @id @default(cuid())
     userId      String
     title       String
     description String?
     status      TaskStatus @default(todo)
     priority    TaskPriority?
     effort      Int? // 1-5 scale
     impact      Int? // 1-5 scale
     dueDate     DateTime?
     completedAt DateTime?
     projectId   String?
     tags        String[] // Array of tag strings
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     project Project? @relation(fields: [projectId], references: [id])
   }

   enum TaskStatus { todo, in_progress, blocked, completed, cancelled }
   enum TaskPriority { low, medium, high, urgent }
   ```

2. **API routes**
   - `/api/tasks` - GET list, POST create
   - `/api/tasks/[id]` - GET, PATCH, DELETE
   - `/api/tasks/priorities` - GET sorted by impact × effort
   - Support filtering: status, priority, tags, project

3. **UI components**
   - TaskListView (Kanban + List toggle)
   - TaskForm (create/edit dialog)
   - PriorityMatrix (2×2 grid visualization)
   - TaskCard (with drag-drop support)
   - QuickTaskCapture (modal from keyboard shortcut)

4. **Features**
   - Keyboard shortcuts (T = new task, E = edit, etc.)
   - Auto-sort by priority score
   - Bulk actions (complete multiple, tag multiple)
   - CSV export

### Phase 3: Goals & Projects Hierarchy (Week 3)
**Rationale:** Links Tasks → Projects → Goals. Enables progress roll-up and OKR tracking.

1. **Database schema**
   ```prisma
   model Project {
     id          String   @id @default(cuid())
     userId      String
     name        String
     description String?
     status      ProjectStatus @default(active)
     macroGoalId String?
     targetDate  DateTime?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
     macroGoal MacroGoal? @relation(fields: [macroGoalId], references: [id])
     tasks     Task[]
   }

   enum ProjectStatus { planning, active, paused, completed, cancelled }
   ```

2. **Extend MacroGoal model**
   - Add `projects Project[]` relation
   - Add progress calculation (% tasks complete across projects)

3. **API routes**
   - `/api/projects` - CRUD operations
   - `/api/projects/[id]/progress` - Calculate roll-up metrics
   - `/api/goals/[id]/progress` - Aggregate from projects

4. **UI components**
   - ProjectBoard (with task columns)
   - GoalProgressView (tree visualization)
   - OKR Tracker (confidence ratings)
   - Weekly/Monthly Review Wizard

### Phase 4: Daily Rhythm & Habits (Week 4)
**Rationale:** Builds on existing starts/experiments. Completes daily workflow.

1. **Database schema**
   ```prisma
   model Habit {
     id          String   @id @default(cuid())
     userId      String
     name        String
     description String?
     cadence     HabitCadence @default(daily)
     targetCount Int @default(1) // per cadence period
     isActive    Boolean @default(true)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     user       User          @relation(fields: [userId], references: [id], onDelete: Cascade)
     completions HabitCompletion[]
   }

   model HabitCompletion {
     id        String   @id @default(cuid())
     habitId   String
     userId    String
     date      DateTime @default(now())
     note      String?

     habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)
     user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
   }

   enum HabitCadence { daily, weekly, monthly }
   ```

2. **Features**
   - Streak calculation (consecutive days/weeks)
   - Flexible cadence (daily, 3x/week, etc.)
   - Habit charts (heatmap, line chart)
   - Reminders integration
   - Focus block planner (timeboxing)
   - AM/PM reflection prompts

3. **UI components**
   - HabitTracker (grid view with streaks)
   - FocusBlockPlanner (timeline view)
   - ReflectionJournal (prompts + sentiment)

### Phase 5: Google Calendar Integration (Week 5-6)
**Rationale:** Unifies scheduling across tasks, habits, finance reminders.

1. **Database schema**
   ```prisma
   model CalendarSync {
     id              String   @id @default(cuid())
     userId          String
     provider        String   @default("google")
     calendarId      String
     syncEnabled     Boolean  @default(true)
     lastSyncAt      DateTime?
     nextSyncAt      DateTime?
     syncToken       String?
     createdAt       DateTime @default(now())

     user   User             @relation(fields: [userId], references: [id], onDelete: Cascade)
     events CalendarEvent[]
   }

   model CalendarEvent {
     id            String   @id @default(cuid())
     calendarSyncId String
     userId        String
     externalId    String   // Google event ID
     title         String
     description   String?
     startTime     DateTime
     endTime       DateTime
     isAllDay      Boolean  @default(false)
     linkedTaskId  String?
     linkedHabitId String?
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt

     calendarSync CalendarSync @relation(fields: [calendarSyncId], references: [id], onDelete: Cascade)
     user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
   }
   ```

2. **OAuth implementation**
   - Extend Account model with Google Calendar scopes
   - Token refresh logic
   - Consent flow UI

3. **Sync engine**
   - Pull Google events (incremental sync with tokens)
   - Push focus blocks, task deadlines, habit sessions
   - Conflict detection
   - Background job scheduler (cron or queue)

4. **Features**
   - Smart scheduling (suggest slots for tasks)
   - Event enrichment (attach finance context)
   - Travel buffer detection
   - Notification bridge

### Phase 6: Auth Hardening & Profile (Week 7)
**Rationale:** Security and UX polish for production readiness.

1. **Auth improvements**
   - Refresh token rotation
   - Device list management
   - Session expiry warnings
   - Multi-device logout

2. **Profile settings**
   - Notification channel preferences (email, browser, SMS)
   - Display preferences (dashboard widgets order)
   - Data export/delete (GDPR compliance)

3. **Notification center**
   - Inbox for system messages
   - Finance alerts (low runway, budget exceeded)
   - Task reminders (due soon, overdue)
   - Habit streak warnings

---

## Technical Architecture Decisions

### Backend Choice: Continue with Next.js API Routes
**Rationale:**
- Already established with 27+ API routes
- Tight integration with React Server Components
- Simplified deployment (single codebase)
- TypeScript end-to-end
- No need for separate FastAPI/Express unless hitting scale limits

**Trade-offs:**
- Less suitable for heavy background jobs (use external workers if needed)
- Serverless cold starts in production (mitigate with warming)

### Database: Continue with PostgreSQL + Prisma
**Rationale:**
- Already have comprehensive schema
- Excellent TypeScript support
- Migration system in place
- Suitable for relational data (Goals → Projects → Tasks)

### Testing Strategy
1. **Unit tests (Vitest)**
   - All lib functions (finance.ts, date.ts, etc.)
   - API route handlers (mock Prisma)
   - React hooks (React Testing Library)

2. **Integration tests (Vitest + real DB)**
   - Full API flows (create asset → recalc summary)
   - React Query caching behavior
   - Auth flows

3. **E2E tests (Playwright)**
   - Critical user journeys:
     - Sign in → view dashboard → create task
     - Finance: add transaction → verify KPIs
     - Habits: track habit → check streak
     - Calendar: OAuth → sync events

### State Management
- Continue with React Query for server state
- Add Zustand for complex UI state (task filters, calendar view state)
- No need for Redux (overengineering for this scale)

---

## Delegation Strategy

### Sub-Agents & Responsibilities

1. **DataFetcher Agent**
   - Implement database migrations
   - Create Prisma queries
   - Build API route handlers
   - Write server utilities

2. **UIImplementer Agent**
   - Build React components
   - Implement client-side logic
   - Create forms and validation
   - Style with Tailwind

3. **QAReviewer Agent**
   - Write test suites
   - Run coverage reports
   - Perform code reviews
   - Document testing patterns

4. **DocKeeper Agent**
   - Update architecture.md
   - Maintain roadmap progress
   - Write API documentation
   - Create user guides

5. **Scheduler Agent**
   - Implement background job system
   - Build calendar sync engine
   - Create notification scheduler
   - Handle cron tasks

### Orchestration Pattern

For each feature module:
1. **Master (me)** creates detailed spec with schema, API contract, UI requirements
2. **DataFetcher** implements backend (migration, API, lib functions)
3. **UIImplementer** builds frontend (components, hooks, integration)
4. **QAReviewer** writes tests and validates
5. **DocKeeper** updates documentation
6. **Master** reviews, coordinates fixes, commits

---

## Success Metrics

### Phase 1 (Testing)
- ✅ Test frameworks installed and configured
- ✅ ≥80% coverage on finance module
- ✅ CI/CD pipeline running tests

### Phase 2 (Tasks)
- ✅ Tasks CRUD working
- ✅ Priority scoring implemented
- ✅ Kanban + list views functional
- ✅ E2E test: create → prioritize → complete task

### Phase 3 (Goals/Projects)
- ✅ 3-level hierarchy working (Goal → Project → Task)
- ✅ Progress roll-up accurate
- ✅ OKR tracking functional

### Phase 4 (Habits)
- ✅ Habit tracking with streaks
- ✅ Flexible cadence support
- ✅ Reflection journal integrated

### Phase 5 (Calendar)
- ✅ Google OAuth flow working
- ✅ Events syncing both directions
- ✅ Smart scheduling suggestions

### Phase 6 (Auth/Profile)
- ✅ Refresh tokens implemented
- ✅ Notification center functional
- ✅ GDPR-compliant data export

---

## Risk Mitigation

### Technical Risks
1. **Google Calendar API complexity**
   - Mitigation: Start with read-only sync, add write later
   - Fallback: Manual calendar entry if sync fails

2. **Test infrastructure learning curve**
   - Mitigation: Start with simple unit tests, build up
   - Use community examples/templates

3. **Token budget exhaustion**
   - Mitigation: Delegate to fresh sub-agents frequently
   - Use targeted, minimal context

### Product Risks
1. **Feature creep**
   - Mitigation: Stick to P0 roadmap, defer P1/P2
   - Regular checkpoint reviews

2. **Over-engineering**
   - Mitigation: Ship MVPs, iterate based on usage
   - Avoid premature optimization

---

## Next Immediate Actions

1. ✅ Create this implementation plan (DONE)
2. **Set up testing infrastructure** (Phase 1)
3. **Implement Tasks module** (Phase 2)
4. **Build Goals/Projects hierarchy** (Phase 3)

**Estimated Timeline:** 6-7 weeks for all P0 features
**Token Budget per Phase:** ~5-8k tokens (well under 40k cap)

---

## Questions for Stakeholder

1. **Priority confirmation:** Does the proposed order (Testing → Tasks → Goals → Habits → Calendar → Auth) align with your needs?
2. **Calendar scope:** Should we start with read-only Google Calendar sync, or full two-way from day one?
3. **Testing depth:** What's the minimum acceptable test coverage (80%, 90%)?
4. **Deployment:** Will this run locally only, or do you need production deployment guidance?
5. **Data migration:** Do you have existing data to migrate, or fresh start?

---

**Ready to proceed with Phase 1 (Testing Infrastructure) on your command.**
