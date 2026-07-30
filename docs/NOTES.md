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
- Settlement **Phase A** (2026-07-02): settle **past** months/weeks (本月战况 month-nav + Ledger
  未结算 banner) + preview-before-settle + week-level settle → ledger. **Weekly only** (monthly = Phase B).

### Ready to do next (re-ranked 2026-06-03 — see ROADMAP)
- **Settlement Phase B (NEXT):** week-level check-in lock · un-settle wiring · monthly review gate ·
  both-sides monthly team settlement + 等待对方结算 · home "both settled" banner · `settleMonth` rework
  (+ decide `monthly_settlements.result` individual-vs-team). See ROADMAP "Settlement flow rework".
- ✅ **Phase B un-settle prerequisite CLEARED (2026-07-02):** `migrations/003` DELETE policies confirmed
  on the LIVE DB — `pg_policies` shows `weekly_settlements_delete_own`, `monthly_settlements_delete_own`,
  `reward_ledger_delete_own` (+ tasks / daily_logs). Un-settle is unblocked for Phase B.
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
- In-app password reset shipped 2026-06-05 (Phase 7) but needs the Supabase dashboard config
  (Auth Site URL + Redirect URLs) to actually work — see ROADMAP Phase 7 "MANUAL".
- ⚠ Reset email not delivered (tested 2026-06-05): Supabase's built-in email is rate-limited /
  not-for-production. Needs custom SMTP to deliver. PENDING — see ROADMAP Phase 7. Meanwhile use
  /account (signed-in) or the dashboard to change a password.
- (Resolved 2026-06-05) Past-month task config: Setup now has a month switcher — see Resolved below.
  Settlements are manual + un-settle-able, so no auto-lock risk.
- Count unit label: currently 次/周, flag if 天/周 is preferred
- Notes are independent of check-in (value=0 rows); supported on any day.
- Ledger field editability (audited 2026-07-02): editable = **status** (both layouts) + **notes**
  (desktop only). Display-only / never set by the app = **used_progress**, **expiry_date**
  (expiry_date only lands via a historical import). Making expiry_date + used_progress editable is
  UI-only (hook `updateEntry`/`LedgerPatch` + `reward_ledger` UPDATE RLS already support it) —
  deferred, see ROADMAP "Ledger polish".

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

### Local dev (Supabase CLI + Docker)
Full local stack so migrations + backend changes are verified locally before any prod apply.
Requires Docker Desktop running.

- **Start / stop:** `supabase start` (first run pulls images), `supabase stop`. `supabase status`
  shows URLs/keys; `supabase status -o env` prints them env-formatted.
- **Rebuild from scratch:** `supabase db reset` — replays `supabase/migrations/` in order
  (`001_init` → `002_ledger_unique` → `003_settlement_delete_policies` → `004_challenges` →
  `005_coins_checkins`) then runs `supabase/seed.sql`.
- **Migrations are the canonical chain.** `001_init.sql` is the original base; each later file layers
  on. `supabase/migration.sql` is kept only as the README's manual (SQL Editor) full-rebuild path and
  points here as canonical. CLI migration files carry **no `begin/commit`** (the runner wraps each).
- **Seed** (`supabase/seed.sql`, local only): users `cp@test.local` / `jx@test.local`, password
  `test1234` (security irrelevant — local), + a tiny 2026-06 legacy fixture. The `handle_new_user`
  trigger auto-creates the CP/JX profiles.
- **Env / the prod↔local swap:** `.env.local` (git-ignored) points at the local stack and, because
  Vite prioritises `.env.local` over `.env`, `npm run dev` uses local by default. To run against
  **prod**, rename `.env.local` (e.g. `.env.local.off`) so `.env` (prod values) takes over. **Never
  put prod values in `.env.local`, never point migrations/reset at prod.** Prod SQL Editor is only for
  the final `004`+`005` apply.
- Local keys are the shared Supabase demo values (same on every machine) — not secrets.

### Applying to prod (when handed off)
Run `004_challenges.sql` then `005_coins_checkins.sql` in the Supabase SQL Editor (in order). Both are
additive; existing data is untouched. `002_ledger_unique` is optional and may already be skipped on
prod — the app guards `(user_id, source)` in code regardless.

## Bugs / issues
(add as you go)

## Ideas (not committed)
(dump ideas here, not in ROADMAP)
- (2026-06-05, CP) **Stats / history overview**: browse past months by year/month with summary
  stats (streaks, totals, success rate, maybe charts). Design first — look at habit/check-in apps
  and stats-heavy apps for layout patterns before building.
- (2026-06-05, CP) **Timer modes**: in-app count-up stopwatch (正计时) + countdown (倒计时) for
  timer tasks, not just manual minute entry.
- (2026-06-05, CP) **Gamification (far off)**: accumulate coins from total study/timer minutes
  (Pomodoro-app style), spend on skins/themes. Needs a coin economy + cosmetics system — long-term.
- (2026-06-12, CP) **Multi-language / i18n**: deferred for now — design sketch captured in ROADMAP
  "Multi-language / i18n (deferred 2026-06-12)". Cheaper alternative if the goal is just letting an
  English friend understand the app: write an English manual/FAQ doc, leave the UI in Chinese.

## UI/UX feedback (active)

Items I notice during testing.
Fixed items move to "Resolved" below.

### Open
<!-- append new items here, newest at bottom -->
- 2026-06-05 — /account: the 修改密码 form shows its full inputs up front. Should start **collapsed**
  behind an option and expand/pop out only when the user opts to change the password. (CP request.)
  **— NEXT UP (decided 2026-06-12; CP is doing this in Cursor).** Keep the existing form + validation
  in `src/pages/Account.tsx`; just gate it behind a "修改密码" toggle (inline expand or a dialog).

### Resolved
<!-- move fixed items here with date + how it was fixed -->
- 2026-07-02 — Settlement flow **Phase A** (settle past periods + preview). The Phase 6 settle UI was
  pinned to the current accountability month, so once a month rolled over there was no way to settle
  it — June's ledger sat empty. Added: month navigation on 本月战况 (prev/next, capped at current,
  历史 pill, reads `?month=`); a Ledger **未结算** banner (`useUnsettledPeriods`) linking to
  `/?month=<oldest unsettled>`; a **preview-before-settle** dialog (`useSettlements.previewWeek`,
  mirrors `settleWeek` exactly); a `pendingWeekLabels` pure helper (calc.ts) + 6 unit tests; past-month
  view hides 今日打卡/本周进度. **Weekly settlement only** — the monthly button is hidden everywhere
  because the old `settleMonth` writes the team ledger prematurely (one-sided); all monthly work is
  Phase B. No schema change. Next = Phase B (lock, un-settle, monthly review, both-sides) — ⚠ needs
  `migrations/003` applied on the live DB first. See ROADMAP "Settlement flow rework".
- 2026-07-02 — Week→month boundary was wrong on carry-in days. Pages derived the "current month"
  from *today's calendar month* (`today.slice(0,7)` / `currentMonthISO()`). On a carry-in day —
  the start of a calendar month before its first Monday — that disagrees with the accountability
  month. On 2026-07-02 (a Thursday whose week starts Mon 6-29, so ∈ **June W5**) the dashboard /
  check-in loaded **July**: July W1 (not started) was highlighted as "本周", and 本周一览 showed
  Jun 29–Jul 5 with **no W5 label** (and `useLogs("2026-07")` starts Jul 6, so today's own
  check-ins weren't even fetched). Root cause was **not** calc.ts — `getWeeksInMonth` / `dayToWeek`
  were already correct (June = 5 weeks, W5 = Jun 29–Jul 5; July = 4 weeks, W1 = Jul 6). Fix: new
  `monthOfWeek(date)` in dates.ts (= calendar month of the week's Monday) is now the single
  accountability-month source of truth; Index / CheckIn / Calendar / Rewards / RewardGapBanner /
  WeekTable all use it. **Setup deliberately keeps the plain calendar month** (its edit-lock and
  future-cap are per calendar month) — commented in dates.ts so no one "unifies" it. Settlement /
  ledger behavior unchanged (useSettlements is parameterized by the month it's handed). +15 unit
  tests (calc.test + dates.test), incl. Mon-1st no-carry-in, Sun-1st carry-in, and Tue-1st 6-day
  max carry-in. → Supersedes the WeekTable "spill days show as ·" caveat below.
- 2026-06-11 — 打卡日期条加星期: backfilling showed only the ISO date, so you couldn't tell which
  weekday you were filling. Date header now reads `YYYY-MM-DD · 周X` (weekdayCN, dates.ts /
  CheckIn.tsx). Monday-first, matching our "week starts Monday".
- 2026-06-11 — 打卡页「本周一览」表: the page was single-day only — reviewing a week meant clicking
  day by day. Added a read-only week grid (days as rows 周一→周日 × tasks as columns; cells
  ✓ / 分钟 / — / ·; today highlighted). Tap a past/today row to jump the day view to it; editing
  stays in the day cards (timer minutes don't belong in a cell). WeekTable.tsx + startOfWeekISO.
  Chose days-as-rows over sheet-style days-as-columns for phone width. (The original "spill days
  show as ·" caveat was removed 2026-07-02 by the week-boundary fix above — WeekTable now loads by
  `monthOfWeek(selectedDate)`, so all 7 shown days are in the loaded span and spill days render
  real ✓/—.)
- 2026-06-11 — 奖惩缺口提醒横幅: from week 2 onward, if my reward/penalty plan still has gaps (any
  existing week scope or the month missing a reward OR penalty), a banner on 仪表盘 + 奖惩页 links to
  /rewards (RewardGapBanner.tsx). Pure client, no backend/push. True OS push (alert when the app is
  closed) is deferred to a ROADMAP Future phase (Edge Function + cron + VAPID + iOS install).
- 2026-06-05 — Setup 切月配置: added a month switcher to the Setup page so past months can be
  configured in-app (Setup.tsx, shiftMonth in dates.ts). Past months are unlocked (free edit) while
  the current month keeps the 1-edit lock; auto-prefill only on the current month; future capped at
  current; cards keyed by month. Closes the only real容错 gap vs Excel — see ROADMAP "Past-month
  task config".
- 2026-06-05 — Phase 7 in-app password reset: Login「忘记密码？」→ reset email; public
  `/reset-password` page sets a new password from the recovery link; `/account` page (tap the
  header user pill) lets a signed-in user change their password. Branded email template at
  `supabase/templates/recovery.html`. ⚠ Needs Supabase dashboard Site URL + Redirect URLs to work.
- 2026-06-05 — Repo tidy: removed the bun lockfiles (standardize on npm/package-lock.json) and the
  dead shadcn toast chain (hooks/use-toast.ts, ui/toaster.tsx, ui/use-toast.ts — only Sonner is
  mounted). LICENSE deferred (repo staying private). See ROADMAP "Repo hardening" + public/private note.
- 2026-06-05 — Mobile safe-area: in standalone PWA the bottom nav sat under the iPhone home
  indicator and the header under the notch. Fixed with env(safe-area-inset-*) padding in AppShell
  (bottom nav pb, header pt, content pb via calc) — use env(), not hardcoded px (0 on non-notch).
- 2026-06-05 — Theme toggle was 2-state (light/dark) and lost the "follow system" option once
  tapped. Now a tri-state cycle 跟随系统 / 日间 / 夜间 (ThemeToggle.tsx, uses next-themes `system`).
- 2026-06-04 — Login: added a "记住邮箱" checkbox that pre-fills the most-recent email and
  offers previously-used ones via a `<datalist>` dropdown (src/lib/rememberedEmails.ts,
  Login.tsx). Stores emails only, never passwords; guarded for private mode. The session was
  already persisted (Supabase persistSession), so this is purely email convenience.
- 2026-06-04 — PWA branding: replaced the placeholder logo with a teal "S" mark
  (public/logo.svg — icons regenerate at build), fixed the stale lovable.dev og/twitter image
  links in index.html, and added a dark mobile theme-color. Also added `dev-dist` to eslint's
  ignore list (generated PWA dev output was inflating the lint count).
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
