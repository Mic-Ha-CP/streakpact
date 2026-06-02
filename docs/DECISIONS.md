# Decisions log

All decisions below are LOCKED. Do not change without explicit user approval.

## Task system
- Each user sets 1-3 tasks per month
- Task types: "count" (daily checkbox) | "timer" (log minutes, weekly total)
- Count: weekly target = number of days (e.g. early rise >= 6 days)
- Timer: weekly target = total minutes (e.g. coding >= 120 min)
- No daily targets, only weekly totals
- New-month setup defaults to the previous month's tasks, pre-filled as editable
  drafts (title/type/target/unit); user can modify, remove, or add. If the previous
  month had no tasks, start blank. Tasks saved unchanged are marked carried_over.
- One edit allowed per month after initial setup (editCount tracks this)
- Task deletion is always allowed, even after the edit lock. The edit lock only
  limits modifying task *properties*; deleting a task (and accepting the loss of its
  logged data) is always the user's choice.
  - **Safety (added 2026-06-03):** deleting requires a confirmation dialog that states
    how many check-in records will be cascade-deleted (`daily_logs` FK is
    `on delete cascade`). Prevents a misclick from silently wiping a month of logs while
    keeping deletion freely available.
- ±5% tolerance: DEFERRED (not in MVP)

## Weekly settlement
- ALL tasks must pass for week to succeed
- Count pass: days_completed >= target
- Timer pass: total_minutes >= target
- Individual: each user judged independently
- Week starts Monday, ends Sunday

## Monthly settlement — THREE states
- 成功 (success): >= 3 weeks passed → triggers monthly reward
- 失败 (failure): <= 1 week passed → triggers monthly penalty
- 无事发生 (neutral): 2 weeks passed → nothing happens

## Settlement execution (added 2026-06-03)
- **Trigger: one-click "结算" button** on the 本月战况 page — not fully automatic, not a
  confirm dialog. Has a ritual feel, is controllable, and never writes silently on page load.
- A week is settleable only after it ends (Sunday passed); a month only after all its weeks end.
- Each user settles **their own** side (RLS allows writing only own rows). Weekly results are
  individual; the monthly result is the **team-combined** value (see below) but each user writes
  their own monthly snapshot + a ledger entry from their own monthly plan.
- **Monthly team rule (three states):** combine each member's individual month result —
  - team **success** ⟺ BOTH succeed → shared monthly reward
  - team **failure** ⟺ EITHER fails → shared monthly penalty (a partner's failure drags both down)
  - team **neutral** otherwise → nothing
  (implemented as `combineTeamMonth` in calc.ts; null if a member has no tasks = not settleable.)
- On settle: if a matching reward/penalty plan exists, a `reward_ledger` entry is created
  (success→reward, fail→penalty); if no plan text is set, the settlement is still recorded but
  no ledger entry is made.
- **Idempotent:** the settlement-snapshot row is the guard (a settled week/month leaves the
  pending list); the ledger insert also checks (user_id, source) first, so re-settling never
  duplicates. Optional DB hardening: `unique (user_id, source)` on reward_ledger.
- **Snapshot, not live:** once settled, the result is locked. Backfilling (补签) a past date in
  an already-settled week/month does NOT retroactively change the snapshot or ledger (MVP choice).
- **Un-settle (fault tolerance, added 2026-06-03):** a settled week/month can be undone via
  "撤销结算" — deletes the settlement snapshot AND the ledger entry it generated, returning the
  period to 待结算 so it can be re-settled (e.g. after a backfill or a wrong reward plan). This
  is the escape hatch for settlement mistakes. Requires DELETE RLS policies (migrations/003).

## Rewards & penalties
- Set per month: weekly (individual) + monthly (team) plans
- Weekly: each person has own reward/penalty, judged individually
- Monthly: team-based (both users' results matter for shared consequence)
- After settlement, earned items written to Reward Ledger
- Ledger statuses: pending | in_progress | used | completed | forfeited
- 补签券 (make-up ticket): tracked as text in ledger only, no automation in MVP

## Daily logging
- Past dates: freely allowed, no restrictions on backdating
- Count tasks: tap to mark done, tap again to undo
- Timer tasks: enter minutes → Confirm/Cancel buttons → appended to per-entry log list → each entry is deletable (no editing — delete and re-enter)
- Multiple timer entries per task per day allowed (e.g. 30min morning + 60min evening)
- Notes are independent of check-in status: a user can write a note on any day,
  whether or not they checked in (failed/empty days may also need a memo).
  - Stored as a dedicated daily_logs row with value=0 (one per task+date), separate
    from the check-in row (value=1) and timer-entry rows (value=minutes).
  - Un-checking a count task must NOT delete the note — the note row is independent
    and is left untouched. Clearing the note text deletes the note row.

## Calendar
- Week starts Monday
- Week label format: "YYYY-M月 W1" (e.g. "2026-6月 W1")
- W1 starts on first Monday on or after the 1st of month

## Auth
- Supabase Auth with email/password
- 2 fixed accounts created manually in Supabase dashboard
- No registration flow, no invite system
- Session persistence: stay logged in across browser sessions
  (Supabase client `persistSession: true` + `autoRefreshToken: true`)

## Deployment
- Vercel (frontend) + Supabase (auth + DB)
- PWA via vite-plugin-pwa
- Cost: $0

## Public repo considerations
- No real personal data in committed code
- Seed data in code uses generic placeholders only
- Real data lives exclusively in Supabase
