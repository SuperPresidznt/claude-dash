# Structure Is Grace

Structure Is Grace is a dark-mode-first personal operations cockpit built with Next.js 14, TypeScript, Prisma, Tailwind CSS, and PostgreSQL. It captures micro-starts, ideas, study sessions, cash snapshots, routine experiments, reminders, and macro goals—all optimized for keyboard-driven flow.

## New Features (December 2025)

We've implemented 6 major P0 features to enhance productivity and life tracking:

1. **Focus Block Planner** - Timeboxing system for deep work sessions
2. **Pomodoro Timer** - Productivity timer with calendar sync
3. **Reflection Journal** - AM/PM journaling with sentiment analysis
4. **OKR Module** - Quarterly objectives and key results tracking
5. **Review Wizard** - Automated weekly/monthly review generation
6. **Calendar Event Enrichment** - Link calendar events with app data

See [docs/P0-FEATURES.md](./docs/P0-FEATURES.md) for detailed documentation.

## Tech stack

- Next.js 14 (App Router) + React 18
- TypeScript
- Tailwind CSS
- Prisma ORM with PostgreSQL
- NextAuth.js (magic-link email auth)
- React Query + Recharts for realtime data + charts

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env.local` and update values (PostgreSQL connection, SMTP credentials, auth secret, etc.).

   ```bash
   cp .env.example .env.local
   ```

3. **Generate Prisma client & run migrations**

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Seed baseline data**

   ```bash
   npm run prisma:seed
   ```

   This seeds the four macro goals, a sample reminder, and a sample routine experiment for the email defined in `SEED_USER_EMAIL`.

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app lives at http://localhost:3000. Sign in using the magic-link flow (the email content is logged via your SMTP provider).

## Architecture notes

- All authenticated routes are protected via NextAuth middleware.
- API routes live under `/app/api` and provide JSON endpoints for each domain entity.
- Keyboard shortcuts: `S` (start 10s), `M` (start 1m), `N` (new idea), `J` (journal), `D` (dashboard).
- Metrics dashboard aggregates the last 30 days, including latency medians and cash deltas.
- Reminder test-fire triggers both a StartEvent and a browser notification (after permission).

## Scripts

- `npm run dev` – start Next.js dev server
- `npm run build` – production build
- `npm run start` – start production server
- `npm run lint` – run ESLint
- `npm run prisma:migrate` – run Prisma migrations
- `npm run prisma:seed` – run the seed script

## Customization walkthrough

1. **Macro goals** – Update titles/targets on the Settings screen or edit the default seeds in `prisma/seed.ts`.
2. **Reminders** – Adjust schedules and toggle active states in the Reminders view. Test-fire to trigger a micro-start + notification.
3. **Metrics** – Charts pull from `/api/metrics/trends`; tweak aggregation logic in `src/app/api/metrics/trends/route.ts`.
4. **Start behavior** – Modify the countdown and completion dialog in `src/components/start-controls.tsx`.

Happy structuring!
