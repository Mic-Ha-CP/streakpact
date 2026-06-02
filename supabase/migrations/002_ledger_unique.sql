-- StreakPact — incremental migration 002
-- Adds a (user_id, source) unique constraint to reward_ledger.
--
-- Run this ONCE in the Supabase SQL Editor on the existing live database
-- (the constraint is already baked into migration.sql for fresh installs).
--
-- Purpose: a settlement scope ("2026-05 W2" / "2026-05 月") produces at most one
-- ledger entry per user (success→reward OR fail→penalty). The app guards on
-- (user_id, source) before inserting, so this constraint is belt-and-suspenders
-- hardening against double-clicks/races and dedupes the Phase 8 historical import.
--
-- Optional but recommended. Settling works without it (app-level guard handles
-- idempotency); this just enforces it at the DB level too.
--
-- If duplicate (user_id, source) rows already exist, this will fail — dedupe first.

alter table public.reward_ledger
  add constraint reward_ledger_user_source_uniq unique (user_id, source);
