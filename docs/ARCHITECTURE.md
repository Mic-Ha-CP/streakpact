# Architecture

## Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  React SPA  │────▶│   Supabase   │────▶│  PostgreSQL  │
│  (Vercel)   │     │   Client SDK │     │  (Supabase)  │
│             │◀────│   + Auth     │◀────│  + RLS       │
└─────────────┘     └──────────────┘     └──────────────┘
      PWA                                   
```

No custom backend. The React app talks directly to Supabase.
RLS policies enforce access control at the database level.

## Data flow

### Check-in flow
1. User opens Check-in page → fetch tasks for current month from `tasks` table
2. User taps checkbox (count) or enters minutes (timer) → insert row into `daily_logs`
3. UI updates optimistically, then confirms with Supabase response

### Weekly settlement flow (one-click, client-side computed)
Status is computed live for display anytime (calc.ts `weekStatusForUser`). *Settling* is an
explicit action that snapshots the result + writes the ledger (see DECISIONS "Settlement execution").
1. A week ends (Sunday passed) → 本月战况 shows "结算 Wn" on the current user's panel
2. Client computes pass/fail for that user (count: distinct check-in days; timer: SUM minutes)
3. On click (`useSettlements.settleWeek`): if a weekly `reward_plans` entry exists, insert a
   `reward_ledger` row (success→reward / fail→penalty); then upsert the `weekly_settlements` snapshot
4. Idempotent: snapshot guard + (user_id, source) existence check before the ledger insert

### Monthly settlement flow (team-combined)
1. After all weeks in the month have ended → "结算本月" appears on the current user's panel
2. Client computes each member's individual result (calc.ts `monthStatus`: ≥3 success / ≤1 failure / else neutral)
3. `combineTeamMonth`: both success → team success; either failure → team failure; else neutral
4. On click (`useSettlements.settleMonth`): writes the current user's `monthly_settlements` row
   (`result` = team result, `weeks_success` = own count) + a `reward_ledger` entry from the user's
   own monthly `reward_plans`. Each user settles their own side; both compute the same team result.

### Reward ledger flow
1. Settlement creates ledger entries with status "pending"
2. Users manually update status (pending → in_progress → used/completed)
3. Penalties: pending → completed (when served) or forfeited
4. Rewards with expiry: pending → forfeited (manual, not automated)

## File structure (target)

```
src/
├── lib/
│   ├── supabase.ts        — Supabase client init
│   └── database.types.ts  — Auto-generated types
├── hooks/
│   ├── useAuth.ts         — Auth state + login/logout
│   ├── useTasks.ts        — CRUD for tasks
│   ├── useLogs.ts         — CRUD for daily_logs
│   ├── useSettlements.ts  — Read/write settlements
│   ├── useRewardPlans.ts  — CRUD for reward_plans
│   └── useLedger.ts       — CRUD for reward_ledger
├── pages/
│   ├── Login.tsx
│   ├── Index.tsx          — Home dashboard
│   ├── CheckIn.tsx        — Daily check-in
│   ├── Calendar.tsx       — Monthly calendar view
│   ├── Rewards.tsx        — Reward/penalty plans
│   ├── Ledger.tsx         — Reward ledger history
│   └── Setup.tsx          — Monthly task setup
├── components/
│   ├── ui/                — shadcn/ui components
│   └── ...                — App-specific components
├── data/
│   ├── calc.ts            — Week/month calculation logic
│   └── types.ts           — App-level type definitions
└── App.tsx
```

## Key technical decisions
- No Zustand in final version — replaced by Supabase queries + React hooks
- No real-time subscriptions needed (2 users, not concurrent editing)
- Settlement computed on page load, not via cron/edge functions
- PWA service worker caches static assets; data always fetched fresh

## Field name mapping (app ↔ DB)
The app uses camelCase and identifies users by display name ("CP"/"JX"); the DB uses
snake_case and uuid foreign keys. Hooks translate at the boundary:
- `userId` ("CP"/"JX") ↔ `user_id` (uuid), resolved via `profiles.display_name`
- `month` ↔ `year_month`, `target` ↔ `target_value`, `expiry` ↔ `expiry_date`
- RewardPlan `scope` "W1".."W5"/"MONTH" ↔ `week_number` 1-5 / NULL
- The client `MonthResult` value `'failure'` matches `monthly_settlements.result`
- Count check-in: app stores no `done` flag — presence of a row means done, deleting
  it means undone (see daily_logs model in SUPABASE_SCHEMA.md)

## Write access under RLS (important for Phase 3)
RLS restricts INSERT/UPDATE/DELETE to rows where `auth.uid() = user_id`. The current
Lovable UI lets the logged-in user act as *either* person (the CP/JX switchers on
Check-in / Rewards and both task cards on Setup). Once on Supabase, writes to the other
person's rows will be **rejected by the database**. Phase 3 must make the other person's
data read-only in the UI (everyone can still *read* both, per the SELECT policies).
