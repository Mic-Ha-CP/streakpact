# Decisions log

All decisions below are LOCKED. Do not change without explicit user approval.

## Task system
- Each user sets 1-3 tasks per month
- Task types: "count" (daily checkbox) | "timer" (log minutes, weekly total)
- Count: weekly target = number of days (e.g. early rise >= 6 days)
- Timer: weekly target = total minutes (e.g. coding >= 120 min)
- No daily targets, only weekly totals
- Tasks can be carried over or reset each month
- One edit allowed per month after initial setup (editCount tracks this)
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
- Optional notes field per day

## Calendar
- Week starts Monday
- Week label format: "YYYY-M月 W1" (e.g. "2026-6月 W1")
- W1 starts on first Monday on or after the 1st of month

## Auth
- Supabase Auth with email/password
- 2 fixed accounts created manually in Supabase dashboard
- No registration flow, no invite system

## Deployment
- Vercel (frontend) + Supabase (auth + DB)
- PWA via vite-plugin-pwa
- Cost: $0

## Public repo considerations
- No real personal data in committed code
- Seed data in code uses generic placeholders only
- Real data lives exclusively in Supabase
