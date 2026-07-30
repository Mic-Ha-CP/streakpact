-- StreakPact — incremental migration 005
-- Periods & Gamify P2: coins + 签到. See docs/design/PERIODS_AND_GAMIFY.md (D5/D6/D8).
--
-- Design: earned coins are DERIVED (a pure function of check-ins, 签到 days, and
-- challenge wins — see src/data/coins.ts), NEVER materialized, so undo / backfill /
-- un-settle auto-correct. `coin_ledger` therefore holds only SPENDS (and any manual
-- adjustments); balance = earnedCoins(...) + Σ coin_ledger.amount.
--
-- Run ONCE in the Supabase SQL Editor (also folded into supabase/migration.sql).
-- No begin/commit — the CLI + SQL Editor each wrap the file in a transaction.

-- =====================================================================
-- checkin_days — independent daily 签到 (NOT tied to any task). One per user per day.
-- backfilled = a 补签到 (costs 20 coins, recorded as a coin_ledger spend).
-- =====================================================================
create table public.checkin_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  day        date not null,
  backfilled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint checkin_days_unique unique (user_id, day)
);

-- =====================================================================
-- coin_ledger — signed coin movements that are NOT derivable from the data, i.e.
-- spends (negative amount) and manual adjustments. Earnings are computed, not stored.
-- No unique on source: shop buys legitimately repeat; 补签到 is deduped by
-- checkin_days' unique (can't 补签到 the same day twice → no double charge).
-- =====================================================================
create table public.coin_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  amount     integer not null,                    -- negative = spend
  reason     text not null,                       -- '补签到' | 'shop' | 'adjust'
  source     text,                                -- e.g. '补签到 2026-08-05'
  created_at timestamptz not null default now(),
  constraint coin_ledger_reason_chk check (reason in ('补签到', 'shop', 'adjust'))
);

-- =====================================================================
-- RLS — read-all, write-own; delete-own so a 签到 / 补签到 can be undone (refund).
-- =====================================================================
alter table public.checkin_days enable row level security;
create policy checkin_days_select on public.checkin_days
  for select to authenticated using (true);
create policy checkin_days_insert_own on public.checkin_days
  for insert to authenticated with check (auth.uid() = user_id);
create policy checkin_days_delete_own on public.checkin_days
  for delete to authenticated using (auth.uid() = user_id);

alter table public.coin_ledger enable row level security;
create policy coin_ledger_select on public.coin_ledger
  for select to authenticated using (true);
create policy coin_ledger_insert_own on public.coin_ledger
  for insert to authenticated with check (auth.uid() = user_id);
create policy coin_ledger_delete_own on public.coin_ledger
  for delete to authenticated using (auth.uid() = user_id);

create index idx_checkin_days_user on public.checkin_days (user_id, day);
create index idx_coin_ledger_user  on public.coin_ledger (user_id);
