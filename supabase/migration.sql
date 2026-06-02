-- StreakPact — initial schema migration
-- Generated from docs/SUPABASE_SCHEMA.md
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run once on a fresh project. Creates tables, constraints, the
-- profile-on-signup trigger, Row Level Security policies, and indexes.
--
-- Notes:
--   * `value NOT NULL` on daily_logs: 1 for a count check-in, minutes for a timer
--     entry. The "one count check-in per day" rule is enforced in app code, not by a
--     DB constraint (timer tasks legitimately have many rows per day, and a partial
--     unique index cannot reference tasks.type in PostgreSQL).
--   * daily_logs has no UPDATE policy by design — undo = delete, edit = delete + insert.
--   * reward_plans uniqueness uses NULLS NOT DISTINCT (PostgreSQL 15+, Supabase default)
--     so a user has at most one monthly plan (week_number IS NULL) per month.

begin;

-- =====================================================================
-- profiles
-- =====================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row whenever an auth user is created.
-- display_name is taken from the user's metadata key "display_name"
-- (set this when creating each account), falling back to the email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- tasks
-- =====================================================================
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  year_month   text not null,                       -- "2026-06"
  title        text not null,
  type         text not null,                       -- 'count' | 'timer'
  target_value integer not null,                    -- weekly target (days or minutes)
  unit         text not null,                       -- 'times' | 'minutes'
  carried_over boolean not null default false,
  edit_count   integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint tasks_type_chk       check (type in ('count', 'timer')),
  constraint tasks_unit_chk       check (unit in ('times', 'minutes')),
  constraint tasks_edit_count_chk check (edit_count >= 0 and edit_count <= 1)
);

-- =====================================================================
-- daily_logs
-- =====================================================================
create table public.daily_logs (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  log_date   date not null,
  value      numeric not null,                      -- 1 for count, minutes for timer
  notes      text,
  backfilled boolean not null default false,        -- 补签 (logged for a past date)
  created_at timestamptz not null default now()     -- also orders same-day timer entries
);

-- =====================================================================
-- weekly_settlements
-- =====================================================================
create table public.weekly_settlements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  year_month  text not null,
  week_number integer not null,                     -- 1-5
  week_start  date not null,                         -- always a Monday
  is_success  boolean not null,
  settled_at  timestamptz not null default now(),
  constraint weekly_settlements_unique unique (user_id, year_month, week_number),
  constraint weekly_settlements_week_chk check (week_number >= 1 and week_number <= 5)
);

-- =====================================================================
-- monthly_settlements
-- =====================================================================
create table public.monthly_settlements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  year_month    text not null,
  weeks_success integer not null,                   -- 0-5
  result        text not null,                       -- 'success' | 'failure' | 'neutral'
  settled_at    timestamptz not null default now(),
  constraint monthly_settlements_unique unique (user_id, year_month),
  constraint monthly_settlements_result_chk check (result in ('success', 'failure', 'neutral'))
);

-- =====================================================================
-- reward_plans
-- =====================================================================
create table public.reward_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  year_month      text not null,
  week_number     integer,                          -- NULL = monthly plan, 1-5 = weekly
  success_reward  text,
  failure_penalty text,
  created_at      timestamptz not null default now(),
  constraint reward_plans_week_chk
    check (week_number is null or (week_number >= 1 and week_number <= 5)),
  constraint reward_plans_unique
    unique nulls not distinct (user_id, year_month, week_number)
);

-- =====================================================================
-- reward_ledger
-- =====================================================================
create table public.reward_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          text not null,                      -- 'reward' | 'penalty'
  content       text not null,
  source        text not null,                      -- "2026-04 W2" or "2026-04 月"
  status        text not null default 'pending',
  used_progress text,                                -- e.g. "141/888"
  expiry_date   date,
  notes         text,
  created_at    timestamptz not null default now(),
  constraint reward_ledger_type_chk check (type in ('reward', 'penalty')),
  constraint reward_ledger_status_chk
    check (status in ('pending', 'in_progress', 'used', 'completed', 'forfeited')),
  -- A settlement scope yields at most one ledger entry per user (success→reward or
  -- fail→penalty). This makes settle actions idempotent and dedupes historical imports.
  -- App code also guards on (user_id, source) before inserting, so this is hardening.
  constraint reward_ledger_user_source_uniq unique (user_id, source)
);

-- =====================================================================
-- Row Level Security
-- Everyone authenticated can READ all rows (both users see each other).
-- Writes are restricted to the owner (auth.uid() = user_id), except profiles
-- (own row by id). daily_logs has no UPDATE policy by design.
-- =====================================================================

-- profiles ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- tasks ---------------------------------------------------------------
alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select to authenticated using (true);

create policy tasks_insert_own on public.tasks
  for insert to authenticated with check (auth.uid() = user_id);

create policy tasks_update_own on public.tasks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy tasks_delete_own on public.tasks
  for delete to authenticated using (auth.uid() = user_id);

-- daily_logs ----------------------------------------------------------
alter table public.daily_logs enable row level security;

create policy daily_logs_select on public.daily_logs
  for select to authenticated using (true);

create policy daily_logs_insert_own on public.daily_logs
  for insert to authenticated with check (auth.uid() = user_id);

create policy daily_logs_delete_own on public.daily_logs
  for delete to authenticated using (auth.uid() = user_id);

-- weekly_settlements --------------------------------------------------
alter table public.weekly_settlements enable row level security;

create policy weekly_settlements_select on public.weekly_settlements
  for select to authenticated using (true);

create policy weekly_settlements_insert_own on public.weekly_settlements
  for insert to authenticated with check (auth.uid() = user_id);

create policy weekly_settlements_update_own on public.weekly_settlements
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy weekly_settlements_delete_own on public.weekly_settlements
  for delete to authenticated using (auth.uid() = user_id);

-- monthly_settlements -------------------------------------------------
alter table public.monthly_settlements enable row level security;

create policy monthly_settlements_select on public.monthly_settlements
  for select to authenticated using (true);

create policy monthly_settlements_insert_own on public.monthly_settlements
  for insert to authenticated with check (auth.uid() = user_id);

create policy monthly_settlements_update_own on public.monthly_settlements
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy monthly_settlements_delete_own on public.monthly_settlements
  for delete to authenticated using (auth.uid() = user_id);

-- reward_plans --------------------------------------------------------
alter table public.reward_plans enable row level security;

create policy reward_plans_select on public.reward_plans
  for select to authenticated using (true);

create policy reward_plans_insert_own on public.reward_plans
  for insert to authenticated with check (auth.uid() = user_id);

create policy reward_plans_update_own on public.reward_plans
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reward_ledger -------------------------------------------------------
alter table public.reward_ledger enable row level security;

create policy reward_ledger_select on public.reward_ledger
  for select to authenticated using (true);

create policy reward_ledger_insert_own on public.reward_ledger
  for insert to authenticated with check (auth.uid() = user_id);

create policy reward_ledger_update_own on public.reward_ledger
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy reward_ledger_delete_own on public.reward_ledger
  for delete to authenticated using (auth.uid() = user_id);

-- =====================================================================
-- Indexes (cheap, helpful even at 2 users)
-- =====================================================================
create index idx_daily_logs_task_date on public.daily_logs (task_id, log_date);
create index idx_tasks_user_month     on public.tasks (user_id, year_month);
create index idx_weekly_user_month    on public.weekly_settlements (user_id, year_month);
create index idx_ledger_user_status   on public.reward_ledger (user_id, status);

commit;
