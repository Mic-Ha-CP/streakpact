-- StreakPact — incremental migration 004
-- Periods & Gamify P1: opt-in 4-week challenges with single-layer (总量目标)
-- settlement. See docs/design/PERIODS_AND_GAMIFY.md (D1/D2/D4/D7).
--
-- Adds `challenges` + `challenge_members`, and extends `tasks` so a task belongs
-- EITHER to a calendar month (legacy) OR to a challenge (new) — never both. Adds the
-- RLS policies + indexes for the new tables.
--
-- Run this ONCE in the Supabase SQL Editor on the existing live database.
-- (The same block is folded into supabase/migration.sql for fresh installs.)
--
-- Legacy weekly_settlements / monthly_settlements / reward_plans are UNTOUCHED —
-- existing history stays exactly as it is. reward_ledger (+ its 003 DELETE policy and
-- its unique (user_id, source)) is reused for challenge rewards/penalties.
--
-- No explicit begin/commit: the CLI migration runner wraps each file in its own
-- transaction, and the Supabase SQL Editor runs a pasted script atomically too.

-- =====================================================================
-- challenges
-- One shared period. `mode` duo = both users (solo reserved for later). start_date is
-- a Monday; the challenge runs `weeks` Mon–Sun weeks from it. `status` is 'active'
-- until cancelled — "ended" and "settled" are DERIVED (dates + member rows), not
-- stored, so un-settle stays a pure row delete.
-- =====================================================================
create table public.challenges (
  id          uuid primary key default gen_random_uuid(),
  start_date  date not null,
  weeks       integer not null default 4,
  initiator   uuid not null references public.profiles (id) on delete cascade,
  mode        text not null default 'duo',
  team_reward text,                                   -- optional shared success reward (D3)
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  constraint challenges_weeks_chk  check (weeks >= 1),
  constraint challenges_mode_chk   check (mode in ('solo', 'duo')),
  -- 'cancelled' = pre-start unilateral cancel (initiator); 'aborted' = post-start
  -- consensual dissolution (both sides agreed via challenge_members.abort_requested_at).
  constraint challenges_status_chk check (status in ('active', 'cancelled', 'aborted')),
  constraint challenges_monday_chk check (extract(isodow from start_date) = 1)
);

-- =====================================================================
-- challenge_members
-- One row per user per challenge (created when that user joins). Holds their deposit
-- declaration (押注: what's staked + how failure is executed, D4) and their settlement
-- result. result/settled_at NULL = not yet settled; edited_at NULL = the one
-- mid-challenge edit (D7) is still unused. The team result is derived once BOTH
-- members have a result.
-- =====================================================================
create table public.challenge_members (
  id                uuid primary key default gen_random_uuid(),
  challenge_id      uuid not null references public.challenges (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  deposit_stake     text,
  deposit_execution text,
  result            text,                              -- 'success' | 'failure' | NULL
  settled_at        timestamptz,
  edited_at         timestamptz,
  abort_requested_at timestamptz,                      -- D11: this side's abort request/confirm
  created_at        timestamptz not null default now(),
  constraint challenge_members_result_chk
    check (result is null or result in ('success', 'failure')),
  constraint challenge_members_unique unique (challenge_id, user_id)
);

-- =====================================================================
-- tasks: a task now belongs EITHER to a month (legacy, year_month set) OR to a
-- challenge (challenge_id set) — never both, never neither. This keeps month-based
-- queries (.eq year_month) and challenge queries (.eq challenge_id) cleanly disjoint,
-- so existing month pages never pick up challenge tasks and vice-versa.
-- (For challenge tasks, target_value is the TOTAL target over the whole challenge —
-- fault tolerance is baked into that number — not a weekly target.)
-- =====================================================================
alter table public.tasks alter column year_month drop not null;
alter table public.tasks add column challenge_id uuid references public.challenges (id) on delete cascade;
alter table public.tasks add constraint tasks_scope_chk
  check ((year_month is not null) <> (challenge_id is not null));

-- =====================================================================
-- Row Level Security — same shape as the rest (read-all, write-own). challenges are
-- written by their initiator; member rows by their owner.
-- =====================================================================
alter table public.challenges enable row level security;

create policy challenges_select on public.challenges
  for select to authenticated using (true);
create policy challenges_insert_initiator on public.challenges
  for insert to authenticated with check (auth.uid() = initiator);
create policy challenges_update_initiator on public.challenges
  for update to authenticated using (auth.uid() = initiator) with check (auth.uid() = initiator);
create policy challenges_delete_initiator on public.challenges
  for delete to authenticated using (auth.uid() = initiator);

alter table public.challenge_members enable row level security;

create policy challenge_members_select on public.challenge_members
  for select to authenticated using (true);
create policy challenge_members_insert_own on public.challenge_members
  for insert to authenticated with check (auth.uid() = user_id);
create policy challenge_members_update_own on public.challenge_members
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy challenge_members_delete_own on public.challenge_members
  for delete to authenticated using (auth.uid() = user_id);

-- =====================================================================
-- Indexes
-- =====================================================================
create index idx_challenges_status     on public.challenges (status);
create index idx_challenge_members_cid on public.challenge_members (challenge_id);
create index idx_tasks_challenge       on public.tasks (challenge_id);
