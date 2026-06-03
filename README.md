# StreakPact

A two-person accountability check-in app — a small PWA that replaces a shared
Google Sheet for tracking monthly habits, weekly/monthly settlement, and a
reward/penalty ledger between two people.

Built for two fixed users, but the code is generic (no real data in the repo) —
fork it and point it at your own Supabase project to run your own two-person pact.

**Live:** https://streakpact.vercel.app

## What it does

- **Tasks** — each person sets 1–3 monthly tasks, either `count` (daily checkbox,
  weekly target = number of days) or `timer` (log minutes, weekly target = total).
- **Check-in** — tap to mark a count task done, log timer minutes, or leave a note
  (notes are independent of check-in status and work on any day, including past dates).
- **Weekly settlement** — a week succeeds only if *all* of your tasks hit target.
  Judged per person. Week starts Monday.
- **Monthly settlement** — three states by weeks passed: ≥3 = success, ≤1 = failure,
  2 = neutral. The monthly result is **team-combined**: both succeed → shared reward;
  either fails → both take the penalty; otherwise nothing.
- **One-click settle → ledger** — once a week or month has ended, settle it from the
  dashboard. If a matching reward/penalty plan is set, a ledger entry is written.
  Settlement is a snapshot (idempotent); a wrong one can be undone from the check-in page.
- **PWA** — installable, works as a standalone app on mobile.

## Stack

- **Frontend:** React 18 + Vite + TypeScript (strict), Tailwind + shadcn/ui
- **Data:** [TanStack Query](https://tanstack.com/query) over the Supabase JS client
- **Backend:** Supabase (Auth + PostgreSQL + Row Level Security) — no separate API server
- **PWA:** vite-plugin-pwa
- **Hosting:** Vercel (frontend) + Supabase (auth/DB) — runs on free tiers
- **Tests:** Vitest

## Project structure

```
src/
  pages/        Index (dashboard) · CheckIn · Calendar · Rewards · Ledger · Setup · Login
  components/   AppShell, nav, and small presentational pieces (+ ui/ = shadcn)
  hooks/        useAuth, useTasks, useLogs, useRewardPlans, useLedger, useSettlements, useProfiles
  data/         models.ts (domain types) · calc.ts (week/month settlement logic) + tests
  lib/          supabase.ts (client) · database.types.ts · dates.ts (Monday-based week math)
supabase/
  migration.sql            canonical full schema (tables + RLS + seed) for a fresh project
  migrations/00x_*.sql      incremental migrations to apply to an existing database
docs/           DECISIONS · ARCHITECTURE · SUPABASE_SCHEMA · ROADMAP · NOTES
```

## Run it locally

Requires Node 18+ and a Supabase project.

```bash
npm install
cp .env.example .env      # then fill in your project's values
npm run dev               # http://localhost:5173
```

Environment variables (`.env`, git-ignored):

| Var | Purpose |
|-----|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (used by the app) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (used by the app; RLS does the protecting) |
| `DATABASE_URL` | Admin/dev only — migrations & debug queries. **Not used by the app at runtime.** Never commit it. |

### Supabase setup

1. Create a Supabase project.
2. Run `supabase/migration.sql` in the SQL Editor — creates the tables, RLS policies,
   and seed rows.
3. Apply any newer files in `supabase/migrations/` in order (e.g. `003_*` adds the
   DELETE policies that un-settle needs).
4. Create the two auth accounts (email/password) in the Supabase dashboard — there is
   no in-app registration by design.

See `docs/SUPABASE_SCHEMA.md` for the full schema and RLS reference.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run preview    # preview the build
npm test           # run the test suite once (vitest)
npm run test:watch # watch mode
npm run lint       # eslint
```

## Deployment

Auto-deploys to Vercel on push to `main`. Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in the Vercel project env. `vercel.json` handles the SPA
rewrite and keeps `sw.js` un-cached so PWA updates land.

## Design notes

This is intentionally a small app for two people — no roles, teams, invite flow, or
SSR. Design decisions (and the things deliberately *not* built) are recorded in
`docs/DECISIONS.md`; the phased plan and ideas live in `docs/ROADMAP.md`.

No real personal data lives in the repo — seed data uses generic placeholders and all
real data lives only in Supabase.
