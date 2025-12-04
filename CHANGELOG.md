# Changelog

All notable changes to Structure Is Grace will be documented in this file.

## [Unreleased] - 2025-12-04

### Added

#### Focus Block Planner
- Create and manage focus blocks for timeboxing deep work
- Link focus blocks to tasks
- Track actual vs planned time
- Visual timeline of daily focus blocks
- Start/complete block tracking
- API endpoints: GET/POST `/api/focus-blocks`, GET/PATCH/DELETE `/api/focus-blocks/[id]`
- React Query hooks: `useFocusBlocks`, `useCreateFocusBlock`, `useUpdateFocusBlock`, `useDeleteFocusBlock`
- UI component: `<FocusBlockPlanner />` at `/focus`

#### Pomodoro Timer
- Full-featured pomodoro timer (25min work, 5min break)
- Link sessions to tasks and focus blocks
- Automatic session logging to database
- Daily session statistics
- Integration with metrics dashboard
- Timer states: work, short_break, long_break
- API endpoints: GET/POST `/api/pomodoro`, GET/PATCH/DELETE `/api/pomodoro/[id]`
- React Query hooks: `usePomodoroSessions`, `useCreatePomodoro`, `useCompletePomodoro`
- UI component: `<PomodoroTimer />` integrated in `/focus` page

#### Reflection Journal
- Three journal types: AM, PM, Reflection
- Customizable reflection prompts
- Automatic sentiment analysis using keyword-based algorithm
- Sentiment scoring (-1.0 to 1.0) and labeling (positive/neutral/negative)
- Tag support for categorization
- Date-based browsing (week/month filters)
- Sentiment trends feed into metrics dashboard
- API endpoints: GET/POST `/api/journal`, GET/PATCH/DELETE `/api/journal/[id]`
- React Query hooks: `useJournalEntries`, `useCreateJournalEntry`, `useUpdateJournalEntry`
- UI component: `<JournalEntryForm />` at `/journal-app`

#### OKR Module (Objectives and Key Results)
- Create quarterly objectives with multiple key results
- Link objectives to projects and macro goals
- Confidence ratings (0-100%) for objectives and key results
- Progress tracking per key result
- Overall objective progress calculation
- Status management (active, completed, cancelled)
- Visual progress bars with color coding
- API endpoints:
  - Objectives: GET/POST `/api/okrs/objectives`, GET/PATCH/DELETE `/api/okrs/objectives/[id]`
  - Key Results: GET/POST `/api/okrs/key-results`, GET/PATCH/DELETE `/api/okrs/key-results/[id]`
- React Query hooks: `useObjectives`, `useCreateObjective`, `useUpdateObjective`, `useCreateKeyResult`, `useUpdateKeyResult`
- UI component: `<OKRBoard />` at `/okrs`

#### Review Wizard
- Automated weekly/monthly review generation
- Aggregates data from all modules:
  - Finance summary (income, expenses, net cashflow)
  - Task completion statistics
  - Habit adherence rates
  - Journal sentiment trends
  - Pomodoro session statistics
- Add personal highlights, lowlights, and action items
- Review history with searchable past reviews
- Multi-step wizard UI for guided reflection
- API endpoints: GET/POST `/api/reviews`, GET/PATCH/DELETE `/api/reviews/[id]`, POST `/api/reviews/generate`
- React Query hooks: `useReviews`, `useCreateReview`, `useGenerateReview`, `useUpdateReview`
- UI component: `<ReviewWizard />` at `/reviews`

#### Calendar Event Enrichment
- Enhance calendar events with contextual app data
- Link events to tasks, projects, habits
- Attach financial context (bill due dates, liabilities)
- Link focus blocks and pomodoro sessions
- Enriched data stored in calendar event records
- API endpoint: POST `/api/calendar/enrich`
- Extended CalendarEvent model with enrichment fields

### Changed
- Updated navigation to include new pages: Focus, Journal, OKRs, Reviews
- Extended Prisma schema with 6 new models: FocusBlock, PomodoroSession, JournalEntry, Objective, KeyResult, Review
- Added new database enums: PomodoroType, JournalType, ObjectiveStatus, ReviewType
- Enhanced CalendarEvent model with enrichment capabilities

### Technical Details
- **Database**: Added 6 new tables with proper indexes and relations
- **API Routes**: 24 new API endpoints with full CRUD support
- **Frontend**: 5 new page routes and major UI components
- **Testing**: Comprehensive unit tests for all new API endpoints
- **Type Safety**: Full TypeScript coverage with Prisma-generated types
- **Documentation**: Complete feature documentation in `docs/P0-FEATURES.md`

### Developer Experience
- New React Query API client libraries for all features
- Consistent error handling across all endpoints
- Proper authentication and authorization checks
- Optimistic UI updates with React Query
- Accessible UI components following best practices

---

## [0.1.0] - 2025-11-20

### Added
- Initial project setup with Next.js 14, TypeScript, Prisma, Tailwind CSS
- Magic-link email authentication with NextAuth.js
- Task management with Kanban board and priority matrix
- Project tracking with progress charts
- Habit tracker with streak display and heatmap
- Personal finance module:
  - Cashflow tracking (income/expenses)
  - Budget envelopes with variance charts
  - Assets and liabilities management
  - Recurring transaction templates
  - CSV export functionality
- Calendar integration with Google Calendar OAuth
- Macro goals and ideas tracking
- Routine experiments board
- Reminder system with cron-based scheduling
- Metrics dashboard with daily stats and trends
- Dark mode UI with Tailwind CSS
- Keyboard shortcuts for navigation
- Toast notification system
- Sentry error tracking integration

### Infrastructure
- PostgreSQL database with Prisma ORM
- React Query for server state management
- Recharts for data visualization
- Vitest for unit testing
- Playwright for E2E testing
- ESLint and TypeScript for code quality

---

## Contributing

When adding new features:
1. Update this CHANGELOG.md with details
2. Add tests for new functionality
3. Update relevant documentation
4. Ensure TypeScript compilation passes
5. Run linter and fix any issues

## Version Format

We follow [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality additions
- PATCH version for backwards-compatible bug fixes
