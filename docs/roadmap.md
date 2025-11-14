# Structure Is Grace – Product Roadmap

_Last updated: 2025-11-12_

## Vision
Structure Is Grace becomes the operating system for life: a single workspace that tracks personal finance, schedules, goals, habits, projects, and wellbeing. The app should surface actionable insights, automate cross-tool workflows (calendar, finance, tasks), and provide resilience through clear documentation and observability.

## Guiding Principles
- **Unified Life Graph** – Finance, calendar, tasks, and health data stay linked by person, goal, and timeframe.
- **Momentum over perfection** – Fast capture, lightweight check-ins, and automation keep progress visible.
- **Transparency & trust** – Strong data handling, encryption, audit trails, and clear error reporting.
- **Extensible architecture** – Modules communicate via typed APIs and shared utilities to simplify future work.

## Priority Legend
- **P0** – Critical for core value / unblocker for later work.
- **P1** – High leverage improvements once P0 solid.
- **P2** – Differentiators and polish.

---

## 1. Foundations & Observability (P0)
| Area | Workstream | Notes |
| --- | --- | --- |
| Product spec | Align current features with original brief; capture gaps | Pre-req for downstream priorities |
| Logging & monitoring | Next.js request logging, Prisma tracing, centralized error handler | Feed into alerts & status page |
| UX signals | Toast system, inline validation, Sentry or similar error tracking | Required before shipping more flows |
| Analytics | Lightweight events (PostHog or self-hosted) for feature usage | Helps prioritize iterations |

## 2. Identity, Accounts & Workspace (P0)
- Harden magic-link authentication (refresh tokens, device list, session expiry UX).
- Roles: solo, shared household/partner; future-proof for coach access (P1).
- Profile settings: currency, locale, time zone, notification channels.
- Notification center for system messages (finance alerts, task reminders).

## 3. Personal Finance Suite (P0 → P1)
| Feature | Description | Priority |
| --- | --- | --- |
| Cashflow enhancements | Filters (category/date), CSV export, recurring transaction templates | P0 |
| Budget envelopes | Monthly/quarterly budgets tied to categories, variance chart | P0 |
| Scenario planning | Runway projections, debt payoff calculators, income sensitivity | P1 |
| Plaid (optional) | Automated bank sync with consent + privacy copy | P2 |

## 4. Daily Rhythm & Habits (P0)
- Integrate “starts” and “study minutes” with habit streaks.
- Focus block planner (timeboxing) + quick capture modal.
- Reflection journal (AM/PM prompts, sentiment analytics feeding metrics).
- Habit engine with flexible cadence, streak charts, and reminders.

## 5. Goals & Projects (P0)
- Macro Goals ← Projects ← Tasks hierarchy with progress roll-up.
- Quarterly OKR module (confidence ratings, automated status email).
- Weekly/Monthly review wizard that pulls finance, task, habit highlights.

## 6. Tasks & Prioritization (P0)
| Item | Details |
| --- | --- |
| Task manager v1 | Kanban + priority list, due dates, effort, tags |
| Inbox capture | Quick entry from web/PWA, converts to task/project |
| Priority scoring | Impact × effort suggestions, auto-sort |
| Focus mode | Pomodoro timer logging sessions to metrics and calendar |

## 7. Google Calendar Integration (P0)
1. **OAuth & Token Handling** – Secure OAuth 2.0 flow, encrypted token storage.
2. **Two-way Sync**
   - Pull Google events to show agenda, detect conflicts.
   - Push focus blocks, finance reminders (e.g., bill due date), habit sessions.
3. **Smart Scheduling** – Suggest slots for tasks/habits based on availability + personal preferences; respect travel buffers.
4. **Event Enrichment** – Attach financial context (e.g., liability payment schedule), progress notes, or task links directly into event descriptions.
5. **Notification bridge** – Allow optional reminder emails/SMS triggered via Calendar notifications.

## 8. Knowledge & Learning (P1)
- Resource library linking saved articles/videos to goals or projects.
- Reading tracker capturing study minutes by source; integrate with Today metrics.
- Flash review queue (spaced repetition) for knowledge reinforcement.

## 9. Wellbeing & Health (P1)
- Daily wellbeing check-ins (sleep, mood, energy), correlated with productivity KPIs.
- Wearable integrations (Apple Health / Google Fit) for steps, workouts, heart rate trends (opt-in).
- Mindful micro-break scheduler tied into calendar sync.

## 10. Social & Accountability (P2)
- Invite accountability partners; share high-level dashboards.
- Auto-generated weekly recap emails for partner review.
- Co-working sessions with shared focus timers, Google Calendar invitations.

## 11. Automation & Intelligence (P2)
- Rules engine (“If runway < 3 months → alert”, “If habit streak drops → schedule review”).
- AI copilot for weekly summaries, priority suggestions, financial anomaly detection.
- Natural language capture (“Log $45 groceries yesterday”) via chat/voice.

## 12. Platform & Documentation (P0)
- **Architecture Document (next deliverable)** mapping flows across API routes, Prisma schema, React Query caches.
- Component library audit; promote reusable primitives in `@/components/ui`.
- Testing strategy: unit + integration (finance math, task workflows), E2E (critical journeys).

---

## Immediate Next Steps
1. Confirm roadmap priorities (especially P0 scope) with stakeholders.
2. Start Google OAuth & calendar sync technical design (data model, API batch jobs, UI surfaces).
3. Produce architecture/interworkings doc (per user request) with diagrams of data flow, module boundaries, cache dependencies, and failure considerations.
4. Establish observability baseline (logging, error tracking, toast UX) before shipping further modules.

## Appendix – Dependencies & Considerations
- **Tech Stack**: Next.js 15, TypeScript, Prisma/PostgreSQL, Tailwind, React Query, Recharts, Worker queues (future for sync jobs).
- **Security**: Use environment-based secrets management, guard multi-tenant queries, apply row-level authorization in Prisma.
- **Data privacy**: GDPR-ready data export/delete endpoints, audit log for critical actions (finance edits, calendar sync).
- **Scalability**: All Prisma queries paginated; background jobs for Plaid sync, calendar reconciliation; caching layer for heavy analytics.

---

Contact: _Core team leads TBD_
