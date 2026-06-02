-- StreakPact — incremental migration 003
-- Adds DELETE (own-row) RLS policies needed for "撤销结算" (un-settle).
--
-- Run this ONCE in the Supabase SQL Editor on the existing live database
-- (these policies are also baked into migration.sql for fresh installs).
--
-- Un-settling a week/month deletes the settlement snapshot AND the ledger entry it
-- generated, so the period returns to "待结算" and can be re-settled. The original
-- schema only had SELECT/INSERT/UPDATE policies on these tables, so DELETE was blocked.
--
-- Required for the un-settle feature to work.

create policy weekly_settlements_delete_own on public.weekly_settlements
  for delete to authenticated using (auth.uid() = user_id);

create policy monthly_settlements_delete_own on public.monthly_settlements
  for delete to authenticated using (auth.uid() = user_id);

create policy reward_ledger_delete_own on public.reward_ledger
  for delete to authenticated using (auth.uid() = user_id);
