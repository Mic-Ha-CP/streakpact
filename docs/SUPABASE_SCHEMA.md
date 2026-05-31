# Supabase schema

## Auth setup
Use Supabase Auth with email/password.
Create 2 accounts manually in Supabase dashboard.
Store display_name in profiles table linked to auth.users.

## Tables

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK, FK → auth.users(id) | on delete cascade |
| display_name | text not null | "CP" or "JX" |
| created_at | timestamptz | default now() |

Trigger: auto-create profile row when auth.users row is created.

### tasks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → profiles(id) | not null |
| year_month | text not null | format "2026-06" |
| title | text not null | e.g. "编程", "早起" |
| type | text not null | "count" or "timer" |
| target_value | integer not null | weekly target: 6 (days, count) or 120 (minutes, timer) |
| unit | text not null | canonical value: "times" (count) or "minutes" (timer) |
| carried_over | boolean | default false; set true when a task is cloned from the prior month |
| edit_count | integer | default 0, max 1 enforced in app |
| created_at | timestamptz | default now() |

Constraints:
- CHECK (type IN ('count', 'timer'))
- CHECK (unit IN ('times', 'minutes'))
- CHECK (edit_count >= 0 AND edit_count <= 1)

Note on `unit`: the DB stores only the canonical values `times`/`minutes`. The UI
displays localized labels (天/次 for count → `times`, 分钟 for timer → `minutes`).
Hours (小时) are intentionally not supported — timer progress is always summed in
minutes, so an hours-based target would mismatch the logged minutes.

### daily_logs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| task_id | uuid FK → tasks(id) | on delete cascade |
| user_id | uuid FK → profiles(id) | not null |
| log_date | date not null | |
| value | numeric not null | 1 for a count check-in, minutes for a timer entry |
| notes | text | nullable; the optional per-day note lives on the check-in row |
| backfilled | boolean | default false; true when logged for a past date (补签) |
| created_at | timestamptz | default now() | doubles as the ordering key for multiple same-day timer entries |

Data model (decided): **one row per check-in event, deleted to undo** — no in-place
UPDATEs on `daily_logs` (consistent with the RLS rule below).
- Count: at most one row per (task, date) with `value = 1`. Tapping to undo **deletes**
  the row (and its note). There is no `done` boolean.
- Timer: multiple rows per (task, date), each with `value = minutes`. Each entry is
  deletable; editing = delete + re-enter. The per-day note is stored on one of the rows.

Constraints:
- Count tasks: one check-in per day — **enforced in application code**, not by a DB
  constraint. A plain `UNIQUE (task_id, log_date)` cannot be used because timer tasks
  legitimately have multiple rows per day, and a partial unique index predicate cannot
  reference another table (`tasks.type`) in PostgreSQL, so the subquery form is invalid.
- Timer tasks: no unique constraint — multiple entries per day allowed.

### weekly_settlements
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → profiles(id) | not null |
| year_month | text not null | |
| week_number | integer not null | 1-5 |
| week_start | date not null | always a Monday |
| is_success | boolean not null | |
| settled_at | timestamptz | default now() |

Constraints:
- UNIQUE (user_id, year_month, week_number)
- CHECK (week_number >= 1 AND week_number <= 5)

### monthly_settlements
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → profiles(id) | not null |
| year_month | text not null | |
| weeks_success | integer not null | 0-5 |
| result | text not null | "success" / "failure" / "neutral" |
| settled_at | timestamptz | default now() |

Constraints:
- UNIQUE (user_id, year_month)
- CHECK (result IN ('success', 'failure', 'neutral'))

### reward_plans
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → profiles(id) | not null |
| year_month | text not null | |
| week_number | integer | NULL = monthly plan, 1-5 = weekly |
| success_reward | text | |
| failure_penalty | text | |
| created_at | timestamptz | default now() |

Constraints:
- UNIQUE (user_id, year_month, week_number) — with NULLS NOT DISTINCT for monthly

### reward_ledger
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → profiles(id) | not null |
| type | text not null | "reward" or "penalty" |
| content | text not null | description of the reward/penalty |
| source | text not null | "2026-04 W2" or "2026-04 月" |
| status | text not null | default "pending" |
| used_progress | text | nullable, e.g. "141/888" |
| expiry_date | date | nullable |
| notes | text | nullable |
| created_at | timestamptz | default now() |

Constraints:
- CHECK (type IN ('reward', 'penalty'))
- CHECK (status IN ('pending', 'in_progress', 'used', 'completed', 'forfeited'))

Note: the app's `expiry` field maps to `expiry_date`. The app's separate `remarks`
field is being dropped — free-text goes in `notes`, and quantitative progress (e.g.
"141/888") goes in `used_progress`.

## RLS policies

Enable RLS on ALL tables.

### profiles
- SELECT: any authenticated user can read all rows (both users see each other)
- UPDATE: auth.uid() = id (own row only)

### tasks
- SELECT: any authenticated user can read all
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id
- DELETE: auth.uid() = user_id

### daily_logs
- SELECT: any authenticated user can read all
- INSERT: auth.uid() = user_id
- DELETE: auth.uid() = user_id
- UPDATE: not allowed (delete + re-insert pattern)

### weekly_settlements
- SELECT: any authenticated user can read all
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id

### monthly_settlements
- SELECT: any authenticated user can read all
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id

### reward_plans
- SELECT: any authenticated user can read all
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id

### reward_ledger
- SELECT: any authenticated user can read all
- INSERT: auth.uid() = user_id
- UPDATE: auth.uid() = user_id

## Indexes (performance, optional for 2 users)
- daily_logs: (task_id, log_date)
- tasks: (user_id, year_month)
- weekly_settlements: (user_id, year_month)
- reward_ledger: (user_id, status)
