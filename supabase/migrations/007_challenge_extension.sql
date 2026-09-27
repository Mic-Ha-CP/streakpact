-- =====================================================================
-- 007_challenge_extension — consensual extension (延期), D14 draft
--
-- The challenge end date is DERIVED, never stored: end = start_date + weeks*7 - 1.
-- This column is the one additive input to that derivation, so extending a challenge
-- does not rewrite `weeks` (which would make history lie: an extended 4-week challenge
-- must not become indistinguishable from one that was always 5 weeks).
--
-- WHY A MULTIPLE OF 7: start_date is constrained to a Monday, so every span end is a
-- Sunday and the whole model (challengeWeeks, the 第 N 周 badge, Mon–Sun pace weeks)
-- assumes whole weeks. A 3-day extension would leave a partial trailing week. D14 fixes
-- an extension at +7 days, and this CHECK encodes that invariant rather than trusting
-- the caller.
--
-- Additive and idempotent: existing rows take the default 0 and are unaffected. App code
-- reads it as `row.extended_days ?? 0`, so the deploy is safe in BOTH orders — code
-- shipped before this migration simply sees 0 (today's behaviour), not NaN.
--
-- The 2026-09 extension itself is applied manually (same trust-based path as the
-- deposit-typo fix); there is no in-app request/confirm flow yet — see D14.
-- =====================================================================

alter table public.challenges
  add column if not exists extended_days integer not null default 0;

alter table public.challenges
  drop constraint if exists challenges_extended_days_chk;
alter table public.challenges
  add constraint challenges_extended_days_chk
  check (extended_days >= 0 and extended_days % 7 = 0);

comment on column public.challenges.extended_days is
  'Consensual extension in days (D14). Always a non-negative multiple of 7. The end date is derived: start_date + weeks*7 + extended_days - 1.';
