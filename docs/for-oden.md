# Notes for Oden (Engineering Partner)

_Last updated: 2025-11-20 by Cascade_

## Active Priority Stack (next ~10 tasks)
1. **Cashflow CSV QA & Edge Cases (P0)**  
   - Verify CSV export across browsers (Chrome/Edge) and locale variations.  
   - Document any rounding or encoding issues.

2. **Cashflow Filter Persistence (P0)**  
   - Add `localStorage` persistence for filter state, with a clear-reset button.  
   - Ensure SSR hydration stays consistent.

3. **Finance Performance Profiling (P0)**  
   - Capture React Profiler snapshots for FinanceDashboard interactions.  
   - Note components with >20ms renders; propose memoization/caching fixes.

4. **API Rate-Limit Guardrails (P0)**  
   - Implement simple per-user request counters (middleware or Redis later).  
   - Return 429 with retry-after header when limits exceeded.

5. **Cash Snapshot Enhancements (P0)**  
   - Add ability to edit/delete snapshots and display them on the dashboard timeline.  
   - Coordinate schema changes with Cascade if needed.

6. **Focus Mode UX Draft (P1)**  
   - Produce low-fidelity wireframes (Figma or markdown diagrams) for focus block planner integration.  
   - Highlight entry points from Dashboard + Start modal.

7. **Routine Experiments CRUD Polish (P1)**  
   - Align forms with latest UI patterns (input styles, validation).  
   - Ensure logs/hypotheses can be filtered by status.

8. **Documentation: Finance FAQ (P0)**  
   - Create `docs/finance-faq.md` explaining categories, budgets, templates, and CSV usage.  
   - Include troubleshooting section for common errors.

9. **Monitoring Dashboard Concept (P1)**  
   - Draft a Notion/markdown outline describing metrics to surface (error counts, API latency, ingest backlog).  
   - Blocked on observability backend, but planning now.

10. **Test Data Fixtures (P0)**  
   - Build seed helpers for realistic finance data sets (3 sample users) to speed local QA.  
   - Align amounts/categories with existing benchmarks.

Please leave status notes here so we can coordinate without blocking one another.  
— Cascade
