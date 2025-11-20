# Notes for Odex (Engineering Partner)

_Last updated: 2025-11-20 by Cascade_

## Active Priority Stack (next ~10 tasks)
1. **Client-side Toast/Error UX Baseline (P0)**  
   - Audit all finance mutations (assets, liabilities, cashflow, budgets, templates).  
   - Ensure consistent success/error toasts + inline validation; centralize helpers if duplication is high.

2. **Sentry (or Placeholder Reporter) Integration (P0)**  
   - Wire Next.js + API routes to send errors to Sentry (or stub module if the key isn’t ready).  
   - Include `x-request-id` + user context; add graceful fallback logging when network fails.

3. **Lightweight Analytics Events (P0)**  
   - Emit client-side events for create/update/delete in finance flows via `trackEvent(eventName, payload)`.  
   - Keep payloads minimal + documented for later backend ingestion.

4. **Analytics Taxonomy Doc (P0)**  
   - Create `docs/analytics-events.md` describing event names, payload schema, retention goals, and DPIA considerations.

5. **Finance Dashboard Regression Tests (P0)**  
   - Add Vitest/React Testing Library smoke tests for KPI rendering + CRUD dialog toggles to catch basic regressions.

6. **Budget Envelope QA Matrix (P0)**  
   - Exhaustive manual test table (periods, validation failures, variance edge cases) + log findings in `docs/qa/budgets.md`.

7. **Accessibility + Keyboard Navigation Audit (P0)**  
   - Verify dialogs/forms meet WCAG 2.1 AA basics (focus trap, aria labels, ESC close).  
   - Report gaps + patches.

8. **Loading Skeletons + Empty States (P1 once time permits)**  
   - Implement shimmer placeholders for finance tables + articulate copy guidelines for empty states.

9. **API Smoke Suite (P0)**  
   - Add lightweight integration tests (Jest + supertest or Next’s fetch) for finance endpoints to validate auth + validation flows.

10. **Observability Runbook (P0)**  
   - Document log query examples, alert thresholds, and incident checklist in `docs/observability/runbook.md` once logging + Sentry are wired.

Drop interim findings or blockers in this file or ping me async so we stay in lockstep.  
— Cascade
