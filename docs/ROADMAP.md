# Roadmap

## Priority (re-ranked 2026-06-04)
Phase 6 is done & pushed (app is live with settlement). Re-ranked to pull the personal-use
UX + open-source housekeeping items ahead of password reset:
1. ✅ **Git/repo safety audit** — done 2026-06-04: history is clean (no real emails, names, keys,
   or Supabase URL in any tracked file or commit; authors are all noreply). Safe to open-source;
   no history rewrite needed. See "Repo hardening" below.
2. **README + repo tidy** — real README written; dead scaffold removed (App.css, example.test.ts,
   placeholder.svg). Remaining tidy items tracked below.
3. ✅ **Dark mode** — done 2026-06-04: next-themes ThemeProvider (`attribute="class"`,
   default = system, persisted), a header toggle (`ThemeToggle.tsx`), a no-FOUC inline
   script in index.html, and the missing dark `-soft`/canvas-gradient tokens filled in.
4. **PWA polish** — real "S" logo in place (public/logo.svg → icons regenerate at build),
   stale Lovable og/twitter image links fixed, dark mobile theme-color added. Only a final
   on-device "add to home screen" check remains (manual).
5. **Login: remember email** — done 2026-06-04: a "记住邮箱" checkbox pre-fills + offers
   previously-used emails (localStorage, never passwords). Session itself was already persisted.
6. ✅ **Phase 7 — In-app password reset** — done 2026-06-05 (forgot-password email flow,
   `/reset-password` page, `/account` change-password, branded email template). **Pending the
   manual Supabase dashboard config** (Site URL + Redirect URLs) before it works end-to-end.
7. **Phase 8 — Historical data import** (later, maybe).
8. **Phase 9 — Profile features** (display name, avatar — nice-to-have).
9. **Phase 10 — Multi-tenant / groups** (exploratory, may never land; would be a v2).

## Repo hardening / open-source readiness
- [x] **Git history audited (2026-06-04):** scanned all commits + tracked files. No real emails
      (authors are `*.users.noreply.github.com` / bot accounts), only CP/JX initials (intentional),
      no secrets / anon key / Supabase URL / connection string (`.env` is git-ignored). Clean.
- [x] Replace the Lovable stub README with a real one (features, stack, local setup, deploy).
- [x] Remove dead scaffold files: `src/App.css`, `src/test/example.test.ts`, `public/placeholder.svg`.
- [x] Repo tidy (2026-06-05): removed the bun lockfiles (`bun.lock` + `bun.lockb`) to standardize
      on npm (`package-lock.json`), and deleted the dead shadcn toast chain
      (`hooks/use-toast.ts`, `ui/toaster.tsx`, `ui/use-toast.ts` — only Sonner is mounted).
- [ ] Add a LICENSE file (deferred — repo is staying **private** for now; choice is the owner's,
      e.g. MIT). Only needed if/when a public version is published.

### Public vs private (decided 2026-06-05)
Repo stays **private** for now. The live demo is a login wall (no showcase value, small extra
exposure), and CP/JX initials live in the UI/docs/CLAUDE.md. When a portfolio page exists, decide
between: (A) a **sanitized public mirror** — genericize CP/JX → P1/P2, screenshots instead of the
live link, split docs into private (gitignored) vs public — squashed into a fresh repo rather than
rewriting history; or (B) keep private and showcase via screenshots + an architecture write-up only.
Git history was audited clean (no secrets/emails; only CP/JX initials), so no rewrite is needed.

## Phase 1: Lovable UI polish ✅ COMPLETE
- [x] Initial Lovable prototype
- [x] Generic mock data (no personal info in code)
- [x] Timer confirm/cancel/delete flow
- [x] Task edit limit (editCount)
- [x] Apply Clean Minimal design system (teal + white)
- [x] Monthly 3-state settlement display (success/failure/neutral)
- [x] Reward ledger 5 statuses
- [x] Week starts Monday fix
- [x] Toast position → bottom-right with close button
- [x] Responsive width scaling for desktop

## Phase 2: Supabase setup
- [ ] Create Supabase project
- [ ] Create tables per SUPABASE_SCHEMA.md
- [ ] Enable RLS + create policies
- [ ] Create 2 auth accounts (CP + JX)
- [ ] Generate TypeScript types (`supabase gen types typescript`)
- [ ] Test basic CRUD from Supabase dashboard

**⚠ STOP: requires user to do manual Supabase dashboard steps.**
**Claude Code should output clear instructions for what to create/click.**

## Phase 3: Supabase integration (Claude Code / Cursor)
- [x] Install @supabase/supabase-js
- [x] Create src/lib/supabase.ts with client init
- [x] Add database.types.ts (hand-written to match migration; regen via `supabase gen types` later)
- [x] Build custom hooks:
  - [x] useAuth (login, logout, session)
  - [x] useTasks (CRUD + month filter)
  - [x] useLogs (insert, delete, fetch by task+week)
  - [x] useSettlements (compute + upsert weekly/monthly) — built; not yet wired to a UI trigger
  - [x] useRewardPlans (CRUD)
  - [x] useLedger (CRUD + filter)
- [x] Replace Zustand store calls in every page component
- [x] Remove Zustand + zustand persist dependencies
- [x] Auth guard: redirect to Login if no session
- [x] Make the *other* user's data read-only in the UI (RLS blocks cross-user writes):
      CheckIn / Rewards person switchers + Setup's second card. All edit/delete/add
      controls must be hidden or disabled when viewing the other user (don't render
      buttons that would fail RLS); reads of both users stay allowed.
- [x] Fix editCount: creating a task must NOT consume the edit; only subsequent
      modifications increment editCount (matches DECISIONS "one edit after setup")
- [x] Test full flow: login → set tasks → check in → view progress  *(smoke-tested 2026-06-02; UX feedback addressed in follow-up pass — see NOTES.md Resolved)*

## Phase 4: PWA
- [x] Install vite-plugin-pwa (+ @vite-pwa/assets-generator)
- [x] Configure manifest (name, icons, theme-color: teal #0D9488, standalone)
- [x] Configure service worker (autoUpdate, precache app shell; Supabase stays network-only)
- [x] Create app icons (192/512 + maskable + apple-touch + favicon) — placeholder from public/logo.svg
- [x] Test add-to-home-screen on mobile (live over HTTPS at streakpact.vercel.app; manifest + SW verified — do a final tap-to-install on a phone)
- [x] Replace placeholder logo.svg with real branding — teal "S" mark (2026-06-04);
      icons regenerate from it at build. Stale Lovable og/twitter image links fixed in index.html.

## Phase 5: Deploy ✅ LIVE — https://streakpact.vercel.app
- [x] Connect repo to Vercel (auto-deploys on push to main)
- [x] Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [x] vercel.json: SPA rewrite + sw.js no-cache
- [x] Deploy and verify (200s, manifest, SW, SPA deep-link rewrite, RLS blocks anon reads)
- [ ] Set Supabase Auth Site URL to the Vercel domain (needed once password reset lands)
- [ ] Connect custom domain (optional)

## Phase 6: Settlement + ledger automation
Closes the core loop — until now weekly/monthly status was computed live for display only,
never persisted, and the reward ledger never populated on its own.
- [x] `combineTeamMonth` team-result rule (calc.ts) + unit tests
- [x] Extend `useSettlements`: pending weeks, month settleable, one-click `settleWeek`/`settleMonth`
- [x] One-click settle UI on the 本月战况 page (own panel only; 已结算 markers; team preview)
- [x] Weekly = individual; monthly = team-combined (both succeed → reward; either fails → both penalty)
- [x] Idempotent: settlement-snapshot guard + (user_id, source) existence check before ledger insert
- [x] Un-settle ("撤销结算"): delete snapshot + generated ledger entry → re-settleable (fault tolerance)
- [x] Task-delete safety: confirm dialog showing how many logs will be cascade-deleted
- [x] Comprehensive unit tests: combineTeamMonth, weekStatusForUser, monthStatus (4-week & 5-week months)
- [x] **Manual — `003_settlement_delete_policies.sql` applied & verified live 2026-07-02** (DELETE
      policies, required for un-settle). `002_ledger_unique.sql` (optional dedup) not required — the app
      guards idempotency in code via the `(user_id, source)` check; apply only if wanted.
- Settling after a week/month is over is a snapshot; backfilling a settled period does NOT auto re-settle
  (use 撤销结算 then settle again).

## Settlement flow rework — past-period settling, lock, review (Phase A ✅ / Phase B pending)
The Phase 6 settle UI was pinned to the current month (no way to settle a *past* month → June's
ledger sat empty), and monthly settle used a loose one-sided model. Reworking in two phases.
State machine per period: UNSETTLED (preview anytime, data editable, 补签 allowed) → SETTLED+LOCKED
(check-ins locked, ledger written, only ledger status editable; 撤销结算 to edit, no time limit).
Lock granularity follows the **week**. No schema change — every state is row-presence-derived.

### Phase A — settle past periods + preview (✅ DONE 2026-07-02)
- [x] `monthOfWeek`-based month navigation on 本月战况 (prev/next, capped at current; 历史 pill;
      reads `?month=`), so any past month is reachable. Past-month view hides 今日打卡 / 本周进度.
- [x] `pendingWeekLabels(month, settled, today)` pure helper (calc.ts) + unit tests — ended-but-
      unsettled weeks, for the current OR any past month.
- [x] Ledger **未结算 entry-point banner** (`useUnsettledPeriods`) → links to `/?month=<oldest>`.
- [x] **Preview-before-settle** dialog (`useSettlements.previewWeek`) — shows the result + exactly
      what will land in the ledger, before committing.
- [x] Week-level settle → ledger write reachable for past months (reuses the tested `settleWeek`).
- **Weekly only.** The monthly settle button is hidden everywhere (past + current): the old
  `settleMonth` writes the team ledger prematurely (one-sided, no both-sides gate), so settling a
  month now would create rows that go inconsistent once Phase B changes the model. Deferred.

### Phase B — lock, un-settle, monthly review, both-sides (PENDING)
- [x] ✅ **PREREQUISITE CLEARED (2026-07-02):** `003_settlement_delete_policies.sql` DELETE policies
      confirmed applied on the LIVE DB via `pg_policies` (`weekly_settlements_delete_own`,
      `monthly_settlements_delete_own`, `reward_ledger_delete_own`). Un-settle is unblocked.
- [ ] Week-level **check-in lock**: once a week is settled, lock its check-in edits (client-side,
      trust-based per docs/PROJECT_RIGOR.md); edit path = 撤销结算 → edit → re-settle.
- [ ] **Un-settle wiring** in the new flow (no time limit — deliberate, trust-based, 2 users).
- [ ] **Monthly review gate**: settling the last unsettled week of a month (one-by-one, or a
      "settle all remaining weeks of this month" action scoped to ONE month) triggers a review —
      week-success count, monthly reward/penalty preview, 补签 reminders, explicit confirm.
- [ ] **Both-sides monthly team settlement**: the team reward/penalty writes to the ledger only after
      BOTH users finish their monthly settlement; show 等待对方结算 when one side is done. (RLS: each
      user writes only their own ledger row → first-settler's row is reconciled lazily when both are
      done, guarded by the existing `(user_id, source)` check.)
- [ ] **Home banner** when the team monthly settlement completes ("你们的 [month] 已结算，点击查看结果").
- [ ] **`settleMonth` rework** + decide `monthly_settlements.result` = per-user **individual** (derive
      the team result when both rows exist) vs. the current **team**-in-`result`. No new columns
      expected (presence-derived); revisit only if the review flow needs more.

## Product redesign: Periods & Gamify (design phase)
Sequenced **after Phase B**. Status: **awaiting JX feedback** — design only, no code yet.
**Gating question: settlement structure — 双层 (keep weekly + monthly settle, two sets of 奖惩) vs
单层 (period = one indivisible challenge judged on a total target only; no weekly settle, no weekly
奖惩).** This decision gates everything else. **If 单层 is chosen, Phase B scope shrinks
significantly** — much of the weekly settle / lock / both-sides-gate work becomes unnecessary, so
don't over-invest in that Phase B tail until the structure is decided with JX.
- [ ] See **`docs/design/PERIODS_AND_GAMIFY.md`** — reframes check-in from an implicit monthly
      default to an opt-in **Period** model (fixes the "app always waiting on you" pressure that
      Google Sheets never had), plus proposed **coins + item shop**, a far-off **deposit/anti-charity
      stake** (StickK-style), and an optional daily **check-in** feature. Nothing is built until the
      open questions at the end of that doc are settled with JX.

## Rewards history view (deferred — after Phase B)
- [ ] **Month-switcher on the Rewards page** — add the same month switcher Setup uses
      (`shiftMonth`; see "Past-month task config" above) so past months' reward/penalty **plans**
      become viewable **read-only**. The data already exists in `reward_plans` keyed by `year_month`;
      today only the current month's plan is shown, so past plans can't be referenced. **Low effort**
      (`useRewardPlans` is already month-queried), **medium value**. Read-only for past months; the
      current month stays editable as it is today.

## Ledger polish (deferred — low priority, not blocking)
From the 2026-07-02 Ledger field-editability check. Editable today: **status** (both layouts),
**notes** (desktop only). Display-only / never set by the app: **used_progress**, **expiry_date**.
- [ ] **Ledger entry editing: allow setting/editing `expiry_date` (截止日期)** on ledger entries —
      real need from source data (time-limited rewards like spending allowances, 补签券 validity).
      Low priority, not blocking. **UI-only change**: `useLedger.updateEntry` / `LedgerPatch` and the
      `reward_ledger` UPDATE RLS already support it; just add a date-picker in the 截止 cell for own
      rows. (Today `expiry_date` only gets a value via a historical import writing straight to the DB.)
- [ ] **Make `used_progress` editable** too (e.g. "141/888") — same story: hook + DB already support
      it, no UI wires it; add an input (+ a desktop column). Display-only currently.
- [ ] Minor: notes are editable on **desktop only** — add a notes editor to the mobile card too.

## Phase 7: In-app password reset
- [x] "Forgot password" → email reset link flow (2026-06-05): "忘记密码？" on Login sends
      `resetPasswordForEmail` (redirectTo `/reset-password`); the public `ResetPassword` page
      consumes the recovery session (detectSessionInUrl) and sets a new password via `updateUser`.
- [x] Change-password form for a signed-in user (2026-06-05): new `/account` page (reached by
      tapping the user pill in the header) — shows email + a 修改密码 form.
- [x] Branded reset email template (teal) — `supabase/templates/recovery.html` (repo source copy).
- [ ] **MANUAL (user, in Supabase dashboard) — required before the flow works:**
      Authentication → URL Configuration → set **Site URL** = `https://streakpact.vercel.app`,
      and add `https://streakpact.vercel.app/reset-password` (+ `http://localhost:8080/reset-password`
      for local) to **Redirect URLs**. Optionally paste `supabase/templates/recovery.html` into
      Authentication → Email Templates → Reset Password.
      Note: Supabase's built-in email sender is rate-limited (fine for 2 users); configure custom
      SMTP only if that ever becomes a problem.
- [ ] **PENDING (2026-06-05): reset email not delivered.** Tested live — the reset email never
      arrives. Cause: Supabase's **built-in email service is rate-limited and documented as
      not-for-production** (very low hourly cap, easily exhausted/blocked). Fix = configure a
      **custom SMTP** in Auth → SMTP Settings (e.g. Resend / SendGrid / Postmark free tier), then
      the recovery flow works as built. The in-app code is done; this is purely email delivery.
      Workaround until then: change password from `/account` while signed in, or reset via the
      Supabase dashboard. Low urgency (2 users, both usually stay signed in).

## Past-month task config (the "task 4" item — DONE 2026-06-05)
Previously Setup was hardwired to the current month, so a month never set up (e.g. May, viewed in
June) had no tasks to check in against. Resolved:
- [x] **UI: Setup has a month switcher** (`shiftMonth`) — page back to any past month and add/edit
      tasks there; future is capped at the current month. Past months are **unlocked** (free edit,
      no "1 edit/month" lock — you're reconstructing history, not gaming live stakes); the current
      month keeps the lock. Auto-prefill from last month only fires on the current month. Cards are
      keyed by month so drafts reset on switch. Once a past month has tasks, the whole chain opens:
      backfill check-ins (打卡), then settle it (本月战况), all of which were already month-aware.
- [ ] Bulk historical import is still better via SQL for many months — see Phase 8 / "SQL as a
      fallback" below. Settlements/奖惩 for a bulk import are written by the import (manually or by a
      script mirroring `calc.ts`), not produced by the live in-app "settle" click.

## Personal-use UX round 2 (2026-06-11)
Three pieces of CP feedback, all client-side, no schema change:
- [x] **Weekday on the date selector** (打卡): the date header shows `YYYY-MM-DD · 周X` so backfilling
      a past day no longer hides which weekday it is (`weekdayCN` in dates.ts, CheckIn.tsx).
- [x] **本周一览 table** (打卡): a read-only week grid below the date selector — days as rows
      (Mon–Sun of the selected date's week), tasks as columns, cells ✓ / minutes / — / ·, today
      highlighted. Tap a past/today row to jump the day view to it; editing stays in the day cards
      (`WeekTable.tsx`, `startOfWeekISO`). Decided days-as-rows over sheet-style days-as-columns for
      phone width. Caveat: logs load per month, so a week spilling into the next month shows those
      days as "·" (not loaded) rather than a false "—".
- [x] **Reward-gap reminder banner** (仪表盘 + 奖惩页): from week 2+, if my reward/penalty plan has
      gaps (any existing week scope or the month missing a reward or penalty), a banner links to
      /rewards (`RewardGapBanner.tsx`). In-app only (no backend/push) — see Future "Push
      notifications" for the true OS-push phase. "Incomplete" default = any existing week/month scope
      missing a reward OR penalty, nagging once today ≥ W2 (tweakable).

## Phase 8: Historical data import (later — maybe)
(Merges the old duplicate "data migration" phase.) See memory: import only dates *before*
the live-usage cutover (2026-06-02), additive, no month overlap.
**SQL as a fallback:** because there are only 2 users, direct SQL writes (via the admin
`DATABASE_URL` / service role, which bypasses RLS) are an acceptable last-resort escape hatch for
fixing or backfilling anything the UI can't — not recommended for routine use, but a valid safety net.
- [ ] Script to import Google Sheet history into Supabase (bulk via DATABASE_URL / service role)
- [ ] Import daily_logs (Dec 2025 – cutover) using the value=1 / minutes / value=0 row model
- [ ] Import weekly/monthly settlements + reward_ledger entries (dedupe on user_id, source)
- [ ] Verify imported data integrity

## Phase 9: User profile features (nice-to-have)
- [ ] Settings page
- [ ] Change display name
- [ ] Upload avatar (Supabase Storage)

## Phase 10: Multi-tenant / groups (exploratory — may never land; a v2)
Goal: open the app to more users in isolated groups (different groups can't see each other).
**Feasible on Supabase; capacity/cost is NOT the blocker** (free tier: 500 MB DB + 50k MAU
comfortably holds dozens–hundreds of low-activity users; Pro $25/mo scales further). The cost
is engineering, not infra:
- [ ] `groups` + `group_members(group_id, user_id, role)`; add `group_id` to the business tables
- [ ] **RLS rewrite (the big one):** SELECT is currently `using (true)` (everyone sees everything).
      Group isolation = every policy checks `group_id ∈ my groups` (via an `is_group_member()` helper).
      Supabase RLS supports this cleanly — this is what makes groups invisible to each other.
- [ ] Registration + invite flow (currently *none* — DECISIONS locks "no registration/invite"; revisit)
- [ ] De-hardcode the 2-user assumption (`UserId = "CP"|"JX"`, PersonChip, cp/jx theme, fixed panels)
- [ ] Redefine team/monthly settlement for N members (all? majority?)
- Note: open-sourcing the *code* for others to self-host their own 2-person instance is already safe
  today (no real data in the repo). A single shared multi-tenant deployment is this whole phase.

## Future (not scheduled)
- ±5% tolerance on timer tasks
- 补签券 automation (redeem → auto-pass a failed task)
- **Push notifications — true OS push** (PWA web push). In-app reminder *banner* shipped 2026-06-11
  (`RewardGapBanner` — nags from week 2 when the reward/penalty plan has gaps). True push (alerting
  when the app is **closed**) is a separate phase: needs a `push_subscriptions` table + a Supabase
  **Edge Function** + `pg_cron` schedule + VAPID keys, and on iOS only works once the PWA is
  installed to the home screen (16.4+). Do only if the banner proves insufficient.
- Monthly task template library

### Next-step candidates (raised by CP 2026-06-05)
**Direction decided 2026-06-12:** multi-language **deferred** (see "Multi-language / i18n" below);
product features next, in this order — (1) `/account` collapse **[immediate]**, then (2) ONE medium
feature: **timer count-up/countdown** OR **history + stats** (the latter needs a design pass first).
Gamification stays far-off. (CP is continuing #1 in Cursor; pick up the medium feature when back.)
- **/account: collapse the change-password form. — NEXT UP.** Don't show the full password inputs
  up front; start collapsed behind a "修改密码" button/option, expand (inline or a dialog) only when
  the user opts in. The existing form + validation in `src/pages/Account.tsx` stays — just gate it
  behind the toggle. Small UX tweak — also tracked in NOTES "Open".
- **History + year/month browsing with stats.** A view to see past months and pick year/month,
  ideally with summary stats (streaks, totals, success rate). Needs design — research check-in /
  habit apps and stats-heavy apps first before building. (Setup/CheckIn already switch months;
  this is the richer *overview/stats* layer on top.)
- **Expanded timer check-in: count-up & countdown.** Beyond logging minutes, an in-app stopwatch
  (正计时) and countdown (倒计时) for timer tasks.
- **Gamification (far off): cumulative time → coins → skins/themes.** Pomodoro-app style — earn
  coins from accumulated study/timer minutes, spend them on skins/themes. Long-term, brainstorm
  in NOTES "Ideas" before any commitment.

### Multi-language / i18n (deferred 2026-06-12 — design captured)
Considered, then deferred: both users read Chinese, so UI-English value is mainly sharing with an
English friend / portfolio — and an English **manual/FAQ doc** would meet the "friend can understand
it" need far cheaper than full UI i18n. When/if we do it, the shape is **wide but shallow** — no
DB/schema/logic/RLS change; user-entered content (task titles, reward/penalty text, notes) is never
translated:
- **Library:** `react-i18next` (interpolation `{{count}}`, English plurals, lazy-load) — or a
  zero-dep custom dict + context (fine for Chinese; English plurals/interpolation get fiddly).
- `src/locales/zh.json` / `en.json` with semantic keys; extract every hardcoded JSX string → `t(...)`.
- A `LanguageToggle` + language provider persisted in localStorage — **mirror the existing
  `ThemeToggle.tsx` + next-themes pattern** (header toggle, no-FOUC).
- **App-specific touch points:** interpolated toasts (`已添加 X 分钟`, `已经第 X 周了`, settle
  messages); English plurals (week/weeks, time(s)); **dates** — `weekdayCN` (周一…) → locale-aware
  (`Intl.DateTimeFormat`); `YYYY-MM-DD` is locale-neutral. CP/JX + numbers stay untranslated.
- Migratable **incrementally** (a missing key falls back to the default locale) — no big-bang; just
  watch for missed strings.

## Ops / known issues
- **Supabase free tier auto-pauses after ~7 days of inactivity.** When paused the app can't reach the
  DB until it's restored — restore from the Supabase dashboard (Project → Resume); **data persists**
  across the pause. Optional mitigation: a **keep-alive ping** (a scheduled GitHub Action hitting a
  trivial query on a cron) to keep the project warm. **Deferred** — only worth it if the pause proves
  disruptive in practice.
