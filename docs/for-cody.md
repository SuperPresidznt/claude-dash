# Notes for Cody

_Last updated: 2025-11-20_

## Active Focus (P0 unless noted)
1. **API Observability Baseline** – Wrap all finance API routes with `apiHandler`, unify error bodies, and emit structured logs (requestId, duration, status).
2. **Request Logging Middleware QA** – Verify `x-request-id` propagation, add log sampling for noisy endpoints, and document setup.
3. **Prisma Tracing Hooks** – Enable Prisma middleware to log slow queries (>200ms), capture SQL + params length (no secrets), and tie into requestId.
4. **Cashflow Performance Audit (P0)** – Profile FinanceDashboard filtering/export; identify memoization or virtualization needs.
5. **Observability QA Checklist** – Draft `docs/qa/observability.md` listing scenarios (success, handled error, unhandled error, slow query) with verification steps.
6. **Roadmap Alignment Notes** – Keep roadmap status aligned with P0 progress (cashflow done, observability in-flight). Update `docs/roadmap.md` as milestones land.
7. **Progress Log Updates** – After each milestone, log outcomes in `docs/progress.md` signed as Cody.
8. **Partner Sync Ritual** – Review `for-odex.md` and `for-oden.md` daily; note any dependencies or blockages.
9. **Next P0 Candidate Grooming** – Outline steps for upcoming “Observability Runbook” so Odex/Oden can execute once logging solidifies.
10. **Stretch (P1)** – Explore automated CSV email summaries post-observability if time permits; prep spike doc.

— Cody
