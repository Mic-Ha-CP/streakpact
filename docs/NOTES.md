# Dev notes

## Where we are (auto-generated 2026-06-02)

Production: **https://streakpact.vercel.app** (auto-deploys on push to `main`).

### Done
- Phase 1: Lovable UI prototype
- Phase 2: Supabase setup (tables, RLS, auth, profiles)
- Phase 3: Zustand → Supabase migration
- UX pass: independent notes, EditableText, toasts, new-month carry-over, session
- Phase 4: PWA (vite-plugin-pwa, placeholder icons from public/logo.svg)
- Phase 5: Deployed to Vercel (HTTPS verified; RLS blocks anon reads)
- Phase 6: Settlement + ledger automation (one-click settle → ledger; team-combined month)

### Ready to do next (re-ranked 2026-06-03 — see ROADMAP)
- Log UI/UX issues into ### Open section below
- Phase 7: in-app password reset (most useful profile piece; needs Auth Site URL set)
- Phase 8: migrate historical Google Sheet check-ins (later, maybe)
- Phase 9: profile features (display name, avatar)
- Phase 10 (exploratory): multi-tenant / groups
- Optional: real PWA branding (replace public/logo.svg); custom domain

### How settlement works (Phase 6)
- 本月战况 page shows a "待结算" section on your *own* panel once a week ends (Sunday passed)
  or the whole month ends. Click to settle: it reads your reward/penalty plan and writes a
  reward_ledger entry, then locks a settlement snapshot (🔒 已结算 marker).
- Undo ("撤销结算") is on the 打卡 (CheckIn) page (own data, viewed month) — not the dashboard.
- Weekly = judged individually. Monthly = team: both succeed → shared reward; either fails →
  both get the penalty; else nothing. Each person settles their own side.
- Settling is a snapshot — backfilling a past date after settling won't change it. To fix a
  wrong settlement, use "撤销结算" (undo) — it lives on the **打卡 (CheckIn)** page (for the
  viewed month), deliberately off the dashboard — then settle again on 本月战况.
- Deleting a task asks for confirmation and shows how many check-in records will be lost
  (the FK cascade-deletes its daily_logs).
- **Migrations to run in the SQL Editor:** `002_ledger_unique.sql` (optional, dedup) and
  `003_settlement_delete_policies.sql` (**required for 撤销结算** — adds DELETE policies).

### Open decisions / known gaps
- "today"/week boundaries use the device's local timezone — both users should be in the
  same TZ for consistent day/week cutoffs.
- No in-app password reset yet — reset via the Supabase dashboard if needed.
- Count unit label: currently 次/周, flag if 天/周 is preferred
- Notes are independent of check-in (value=0 rows); supported on any day.

### Smoke test checklist
1. npm run dev
2. Login as CP
3. Setup: add task (free) → edit once (locks) → 2nd edit blocked → JX card read-only
4. Check-in: toggle count, add/delete timer entry, add note → switch to JX → read-only
5. Rewards: set reward/penalty → JX read-only
6. Index + Calendar: progress reflects check-ins
7. Ledger: own rows editable, other's not
8. Sign out → redirected to /login

## Lovable quirks
- Zustand persist caches old seed data in localStorage. 
  Bump `version` in persist config to force reset, or 
  manually delete `streakpact-store` key in DevTools.
- Lovable reconnection after repo rename: 
  rename on GitHub first → disconnect in Lovable → reconnect.

## Supabase notes
(add as you go)

## Bugs / issues
(add as you go)

## Ideas (not committed)
(dump ideas here, not in ROADMAP)

## UI/UX feedback (active)

Items I notice during testing.
Fixed items move to "Resolved" below.

### Open
<!-- append new items here, newest at bottom -->

### Resolved
<!-- move fixed items here with date + how it was fixed -->
- 2026-06-04 — Dark mode added (night/mobile use). next-themes ThemeProvider (default =
  system, choice persisted in localStorage under `theme`); a Sun/Moon toggle in the AppShell
  header (ThemeToggle.tsx); an inline no-FOUC script in index.html applies the theme before
  first paint. The `.dark` palette already existed in index.css — filled the gaps it was
  missing (`--success-soft`/`--danger-soft`/`--secondary-soft`/`--accent-soft` dark tints +
  a dark `--gradient-canvas` for the Login background). All page/component colors are
  token-based, so they flip automatically.
- 2026-06-04 — Repo open-source tidy: real README, git history audited clean, dead scaffold
  removed (App.css, example.test.ts, placeholder.svg). See ROADMAP "Repo hardening".
- 2026-06-03 — Deleting a task silently cascade-deleted all its check-ins with no confirm.
  Fixed: delete now opens a confirmation dialog showing the record count that will be lost
  (Setup.tsx). Deletion stays freely allowed (DECISIONS unchanged) — just guarded.
- 2026-06-03 — A wrong/premature settlement couldn't be fixed in-app (snapshot was locked).
  Fixed: "撤销结算" deletes the snapshot + its generated ledger entry so the week/month can be
  re-settled (useSettlements unsettleWeek/unsettleMonth, Index.tsx; needs migrations/003).
- 2026-06-03 — Settlements/ledger were NOT automated (账本 never populated). Fixed: Phase 6 —
  one-click settle on 本月战况 generates reward_ledger entries from the reward plan and persists
  weekly/monthly snapshots. Monthly uses the team-combined result (combineTeamMonth). Idempotent
  via snapshot guard + (user_id, source) check. (calc.ts, useSettlements.ts, Index.tsx)
- 2026-06-02 — Notes were tied to check-in status. Fixed: notes are now an independent
  daily_logs row (value=0), so they survive un-checking a count task and can exist on
  any day (incl. failed/empty). (useLogs setNote/toggleCount, calc, CheckIn)
- 2026-06-02 — Notes/rewards saved on blur with no clear edit boundary. Fixed: new
  `EditableText` component — display mode by default, tap to edit, Save/Cancel; used for
  CheckIn notes and Rewards reward/penalty fields.
- 2026-06-02 — Toast UX: black circle X sat in the top-left. Fixed: removed the unused
  shadcn `<Toaster/>`; Sonner now shows a plain green ✓ for success, thin red border on
  errors and gray on info (sonner.tsx + index.css).
- 2026-06-02 — Toast close X was floating half-outside the card on the right (looked like
  a stray black circle). Fixed: moved it inside the card at the top-right, transparent
  background, subtle hover (index.css).
- 2026-06-02 — New-month Setup started blank. Fixed: when the current month has no tasks,
  Setup auto-fills editable drafts from last month's tasks (carried_over), modifiable/removable.
- 2026-06-02 — Confirmed task deletion is allowed even after the edit lock (delete button
  is not gated by editCount); documented in DECISIONS.md.
- 2026-06-02 — Verified session persistence (Supabase persistSession + autoRefreshToken
  are enabled in src/lib/supabase.ts).
