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

### Phase B — lock, un-settle, monthly review, both-sides (⚠ SUPERSEDED by 单层 — 2026-07-28)
> **Settlement structure is now decided = 单层 (single-layer challenge)** — see the Periods & Gamify
> plan below and `docs/design/PERIODS_AND_GAMIFY.md` D2. There is **no weekly settle and no monthly
> settle** in the new model, so most of this phase is obsolete. The salvageable ideas (un-settle as
> fault tolerance, the both-sides team gate, a completion banner) are **re-homed to challenge
> settlement in P1** below. Kept here (not deleted) as the record of why. Legacy months already settled
> the old way are **preserved as history** (see the migration note in P1).
- [x] ✅ **PREREQUISITE CLEARED (2026-07-02):** `003_settlement_delete_policies.sql` DELETE policies
      confirmed applied on the LIVE DB via `pg_policies` (`weekly_settlements_delete_own`,
      `monthly_settlements_delete_own`, `reward_ledger_delete_own`). Un-settle is unblocked.
      **← still relevant:** challenge un-settle reuses `reward_ledger_delete_own`; the new
      `challenge_settlements` table gets its own DELETE policy in the same spirit.
- ✗ ~~Week-level **check-in lock**~~ — **OBSOLETE under 单层** (no weekly settle). Any lock now happens
      once at challenge end, not per week (P1).
- → ~~**Un-settle wiring** (weekly)~~ — **RE-HOMED (P1):** un-settle applies to the single challenge
      settlement instead of per-week; reuses the 撤销结算 pattern + DELETE policies.
- ✗ ~~**Monthly review gate**~~ — **OBSOLETE under 单层** (no monthly settle). The equivalent is the
      single end-of-challenge settlement/review (P1).
- → ~~**Both-sides monthly team settlement**~~ — **RE-HOMED (P1):** team reward/penalty still writes
      only after BOTH finish, but at the **challenge** level; the lazy-reconcile + `(user_id, source)`
      idempotency idea carries over.
- → ~~**Home banner** on monthly team settlement~~ — **RE-HOMED (P1):** banner fires on **challenge**
      completion.
- ✗ ~~**`settleMonth` rework**~~ — **OBSOLETE under 单层:** replaced by a single `settleChallenge`
      (total-target, team-combined). `settleWeek`/`settleMonth` + `weekly_settlements`/
      `monthly_settlements` retire for new challenges (kept for legacy months as history).

## Product redesign: Periods & Gamify — DECIDED, building (2026-07-28)
Design **finalized** (JX feedback merged) — full spec + decision record **D1–D8** in
**`docs/design/PERIODS_AND_GAMIFY.md`**. This **supersedes the old monthly-default model**: check-in
is now an opt-in **4-week challenge** (Monday-aligned, starts next Monday) with **single-layer**
total-target settlement — no weekly/monthly settle (see Phase B "SUPERSEDED" above). Plan below is
for **owner sign-off before code**.

**Schema delta (P1 — migration `004_challenges.sql`).** New tables:
- `challenges` — one shared period: `start_date` (Monday, enforced by an isodow CHECK), `weeks` (4),
  `initiator`, `mode` (solo/duo, only duo now), optional `team_reward` (D3 add-on — shared success
  reward, lands in `reward_ledger` on a team win), `status` (active/cancelled). "ended"/"settled" are
  DERIVED (dates + member rows), not stored.
- `challenge_members` — **one row per user per challenge** (replaces weekly_settlements +
  monthly_settlements). Holds that user's deposit declaration (`deposit_stake` + `deposit_execution`),
  their `result`/`settled_at` (NULL = unsettled), and `edited_at` (NULL = the D7 edit unused). Team
  result is derived once both rows have a `result`.
- `tasks` gains an additive **`challenge_id`** + a XOR CHECK: a task is EITHER month-scoped
  (`year_month`) OR challenge-scoped (`challenge_id`), never both — so month pages and challenge views
  stay disjoint. For a challenge task, `target_value` is the **total** target (fault tolerance folded
  in), not weekly.

**Reused as-is:** `daily_logs`, `reward_ledger` (challenge rewards/penalties + its 003 DELETE policy +
`(user_id, source)` idempotency), `profiles`. `tasks` reused **+ the additive `challenge_id`** above.
**Retiring for new challenges (kept for legacy history):** `weekly_settlements`, `monthly_settlements`,
weekly rows in `reward_plans`.
**Migration:** additive only — new tables alongside existing; June's settled weeks/months + existing
ledger entries stay untouched as history. No backfill of challenges for past months.
**P2/P3 tables (`coin_ledger`, `checkin_days`, `shop_items`, `shop_redemptions`) are NOT created in
P1** — deferred until coin values are calibrated from the first real challenge.

### P1 — Challenge core loop (发起 + 单层结算 + 押注记账)  · D1 D2 D4 D7 — ✅ BUILT (pending migration run + smoke test)
- [x] `challenges` + `challenge_members` tables + RLS + `004_challenges.sql`. New-challenge init from
      next Monday (fixed 4 weeks), initiator + mode + optional `team_reward`, per-task total target,
      per-user deposit declaration. Pure logic in `src/data/challenge.ts` (+ unit tests).
- [x] Dashboard (`ChallengeHome`): dormant **empty-state** when no active challenge; active view shows
      **total-target progress** + a **weekly pace reference line** (display only, no settle). Pace uses
      **challenge-relative weeks** (`start_date + 7k`, via `paceExpected`) — NOT month-anchored
      `getWeeksInMonth`; `weeklyProgress`'s range-summation idea is reused as `totalProgress`. New
      `challengeStatusForUser`/`combineTeamChallenge`; legacy `weekStatusForUser`/`monthStatus`/
      `combineTeamMonth` are untouched (legacy months only). Includes challenge check-in + 补签 (date
      picker across the span).
- [x] **End-of-challenge single settlement:** total-target pass/fail, **team-combined** (both pass →
      reward; either fails → both penalty), **both-sides gate** (ledger writes only after both settle;
      等待对方结算 state; first-settler's row written by lazy `reconcile`), **un-settle** (reuses the 003
      DELETE policies), **completion banner**. (Re-homes the salvageable Phase B ideas.)
- [x] **Deposit 记账 (D4):** success → stake released (coin grant is a P2 hook — P1 is coin-free); team
      failure → auto-writes a "待执行" penalty row to `reward_ledger` from each side's own
      `deposit_execution` (existing execution flow). 真钱托管版 = never.
- [x] **中途修改 (D7):** once per challenge (`edited_at`), first-half only (wk 1–2, `editWindowOpen`),
      edit-all-tasks-at-once (delete needs confirm, raise/lower target, keep ≥1 task). Replaces
      `edit_count` for challenge tasks. **Client-enforced** (trust-based per PROJECT_RIGOR — RLS guards
      ownership, not the time window).

### P2 — Coins + 签到 + 补签扣币  · D5 D6 D8 — ✅ BUILT (local-verified; pending prod apply + smoke test)
- [x] `coin_ledger` + `checkin_days` tables + RLS (`005_coins_checkins.sql`). **Derived model:** balance
      = `earnedCoins(...)` + Σ coin_ledger.amount; `coin_ledger` holds only **spends** (earnings are a
      pure fn of the data, so undo/backfill/un-settle auto-correct). Pure math in `src/data/coins.ts`
      (+ tests); all tunable values in `src/data/coinRules.ts`.
- [x] **Coin grants (D5 start values):** 签到 5/day · count check-in 10/each · timer `floor(min/10)*2`
      (**cap 60 min/task/day** → ≤12/task/day) · challenge success 500 (**derived from
      `result='success'` — no settleChallenge hook**) · fail 0. Scoped to challenge tasks + 签到 + wins
      (legacy months earn 0). Two-user trust, **no anti-cheat**.
- [x] **签到 (D8):** independent daily 签到 (dashboard strip), no penalty for breaks, backfillable.
      签到补签 spends **20 coins** (D6, blocked if balance < 20 — direct deduction, no coupon item).
      打卡补签 stays **free**. Coin **section on Ledger** (balance · earnings by 签到/打卡/通关 · spends),
      kept separate from reward rows.

### P1 follow-ups landed this pass (A + B)
- [x] **D9 auto-void** + **D10 free pre-start edit** (`autoVoidDue` / `preStartEditable` / `midEditOpen`).
- [x] **CheckIn page is challenge-aware** (challenge-relative W1–W4, span-bounded date picker, 补签,
      notes) — replaces the month-based CheckIn going forward.
- [x] `RewardGapBanner` removed; **历史月度 board gated to ≤ 2026-06** (see P1.5). Calendar debt tracked.
- **Local dev env** (Supabase CLI + Docker) set up — see docs/NOTES.md. Migrations 001→005 replay via
  `db reset`; seed users cp@/jx@test.local. All P1/P2 verified locally before this handoff.

### P3 — Shop  · D3 / D12 — ✅ BUILT (local-verified; pending prod apply + smoke test)
Pricing + timer formula finalized in the 2026-08-14 grilling → **DECISIONS.md D12** (this is the
source of truth for prices/tiers/lifecycle). Migration `006_shop.sql`.
- [x] `shop_items` (**unified catalog + unified price**, generic + personal mixed) + `shop_redemptions`
      (+ RLS + indexes). Seeded v1 catalog. `coin_ledger.reason` already allows `'shop'` (no delta).
- [x] **Buy flow (D12):** spend via `coin_ledger` (negative, reason `'shop'`); **现实兑换** items
      (奶茶 120 / 外卖 400 / 大额 1200, 大额 repeatable) write a `reward_ledger` pending entry (buyer
      self-marks used — reuses the existing Ledger status machine); **虚拟** items (称号 50–80 / Theme
      300) activate immediately. Non-atomic writes tied by a shared `source` token `shop:<id>`.
- [x] **Virtual ownership** derived from `shop_redemptions` + `equipped` flag (one active 称号 + one
      active theme; equip clears same-kind siblings in code). Item fields snapshotted onto each
      redemption (D12 "value changes affect future only"). Shop page manages equip/switch.
- [x] **Timer earning reworked (D12):** table-driven 3-tier (≤60 /5 max12, ≤120 /10 max6, ≤180 /15
      max4), ceil-per-block, **per-task-per-day cap 22** (NOT a daily total — two maxed timer tasks =
      44). Replaces the flat 2c/10min + 60-cap. 13 boundary unit tests locked.
- [x] **Rules page (金币规则说明):** earning rates + timer tiers + price list + exchange rule (×10) +
      failure outcome + no-expiry/no-refund. Linked from Shop + Ledger. Doubles as JX's consent doc.
- [x] **补签(签到) stays the 周历 flow** (contextual date-picker, not a shop button) — listed on the
      rules page only. **打卡补签** stays free.
- [x] **Fix (pre-flight orphan flag):** `useCoins` task/win earning now **scoped to non-cancelled /
      non-aborted challenges** — cancelled-challenge orphan tasks can no longer leak coins.
      **Verified (g):** 打卡 earning is structurally challenge-gated (challenge tasks only); 签到 stays
      year-round by design.

### Sakura v2 — ✅ SHIPPED 2026-08-19
Owner-tuned in `docs/design/sakura-v2-colorcard.html` (interactive tuner, kept as the theme-authoring
tool), written as the final `:root[data-skin="sakura"]` + `.dark` blocks in `src/index.css`. Delivers
all three v2 recommendations below: surfaces → warm cream / warm-black (brand pink shrunk to CTA /
active / small accents), semantic colors themed, dark independently tuned. **The theme contract was
upgraded** from "brand token block" to **brand + surfaces + semantics** (documented in `index.css`).
**Sakura is a deliberate MONOCHROME scheme — `--success` is pink-family, not green**; state semantics
ride on icons (✓/✗) + numbers, with `--danger` separable at hue 12. That is a per-theme semantic
choice and part of the contract — do not "fix" it back to green. Contrast-checked against the shipped
teal default: sakura v2 is **equal or better on every measured pair in both modes**.

### Sakura v2.5 — petals + hand-drawn accents (deferred — pending CP's art assets)
The **decoration layer** above the color layer. Full investigation in
**`docs/design/THEME_DECORATIONS.md`** (reference: Flat Tomato). Summary:
- **Ambient petals** — pure CSS, <100 lines, no library. MUST honor `prefers-reduced-motion` (off,
  not slower) and appear only on low-interaction surfaces (dashboard yes; check-in / form inputs no).
  MID-HIGH value, no external dependency → the natural first step.
- **Static illustrations** (sakura sprigs, corner motifs) — trivial technically (`background-image`
  on the existing `[data-skin]` hook), **asset-bound**: CP draws them or we license real art —
  **no generative AI**, per our ethics stance. HIGH value (dev × art crossover).
- **Themed functional components** (clock-face style) — **blocked**: no carrier until the in-app
  timer feature exists (see Future → "Expanded timer check-in"). Do not build before then.
- **Tiering hook:** decoration completeness prices the premium tier — bare color theme **300** vs
  full theme (art + effects) **~500**, per the D12 grill note. Tiers track real art cost, not
  invented scarcity.

### Premium theme design spec — the v2 recommendations (recorded 2026-08-14; v2 delivered them)
The **token architecture** is the real deliverable of the P3 theme work: a theme = one light block +
one dark block redefining the brand token set (`src/index.css`, contract documented there), so a new
theme is a single reviewed variable block — the foundation the future ~500 premium tier needs. The
shipped **sakura is v1**: a correct, complete *hue swap*, not yet a designed skin. Visual refinement is
deferred to the premium tier. Priority recommendations for v2 / premium authoring:
1. **降低大面积色块的主题参与度。** 页面底、信息卡片底改暖中性(sakura:奶油白底 / 纯白卡),brand 粉
   收缩到 CTA、active、小 accent。这一条做完,"刷漆感"消失一大半。(即让主题块覆盖 `--background` /
   `--card` 等 surface token,把品牌色留给按钮 / 高亮,而非铺满整页。)
2. **给语义色加主题变体。** sakura 下:success → sage 绿,danger → 橘红。主题契约从"brand token 块"
   升级为"brand + 语义微调块"(每个主题额外重定义 `--success*` / `--danger*` 等语义色)。
3. **Dark mode 独立调色。** 暖黑底 + 降饱和粉,不是 light 版的反色 —— dark 块单独手调(暖色调背景 +
   降低饱和度的粉),而非机械提亮。配 WCAG AA 对比度检查纳入主题创作流程。

## Challenge history view (deferred — post-first-challenge)
- [ ] After a challenge settles it disappears — no way to look back at it (goals, completion, both
      sides' results). Only its **ledger entries** remain visible. Add a **challenge history list** (past
      challenges with their tasks/targets, per-side result, team verdict, dates) once real challenge
      history exists. Data is all there (`challenges` + `challenge_members` + challenge `tasks`); this is
      a read-only view. Build post-first-challenge.

## P1.5 — legacy-cleanup debt (not blocking)
- [x] **Home 历史月度 board** gated to months **≤ 2026-06** (last real old-model month); July 2026+
      never appears. `RewardGapBanner` (incl. the "已经第 N 周" nag) removed from Index + Rewards.
- [x] **Nav retired 任务设置 (Setup) + 奖惩 (Rewards)** — tasks are defined at challenge create/join,
      stakes/team-reward live on the challenge card. Routes remain (URL-only) for legacy access.
- [x] **Calendar → 签到 calendar (redesigned).** Compact month grid, circular day markers (signed =
      light fill + darker border), month nav, header **连续签到 X 天 · 累计 Y 天**; tap an unsigned
      **past** day → **补签 (-20)** activates (future/signed not selectable), today unsigned → **free
      签到**. It's the **single 签到 / 补签 entry point** (the Ledger 补签到 picker was removed). Legacy
      month view moved into a **collapsed disclosure** (≤ 2026-06). Replaces the month-anchored layer.
- [ ] **(optional) per-task 打卡 status overlay** on the 签到 calendar — show which days had check-ins,
      not just 签到. Deferred; the 签到 calendar covers the daily-open loop.

### Round 2 fixes landed this pass
- [x] **Stakes surfaced + editable pre-start:** both sides' deposit declarations + team reward shown on
      the challenge card; editable (with tasks) via the free pre-start edit, locked after start (D10).
- [x] **Deposit required** on create/join (+ pre-start edit); team reward stays optional.
- [x] **Timer target 分钟/小时 toggle** (小时 ×60 on save; storage/math stay minutes).
- [x] **连续签到 streak** next to the coin balance (`checkinStreak`, unit-tested).
- [x] **Seed fixtures:** an in-progress challenge (data for pace/calendar/coins) + an ended-unsettled
      challenge (both pass → settle-testable without manual SQL); 2026-06 legacy fixture kept.

### Round 3 fixes landed this pass
- [x] **D11 cancel / abort:** pre-start = initiator unilateral cancel; **post-start = consensual 中止**
      (per-member `abort_requested_at`; both set → aborted; initiator lazy-writes `status='aborted'`).
      Closes the mid-challenge "one-click dodge the stakes" escape hatch. (`004` gained the column +
      the `'aborted'` status — re-apply `004` to prod.)
- [x] **Calendar → 签到 calendar** + legacy view collapsed; **Ledger 补签到 picker removed** (single
      entry point on the calendar). See P1.5.

### Round 4 fixes landed this pass
- [x] **Coin refresh bug:** settle/un-settle now invalidate `coins_wins` → the +500 (and its removal on
      撤销) update immediately, not on tab-switch.
- [x] **No orphaned unsettled challenge:** a new challenge can only be started from the both-settled
      completion view (**开启下一期挑战**) — never while one is ended-unsettled, so the unsettled one is
      always the current view. Aborted challenges leave the active set and don't block. Seed simplified
      to a single ended-unsettled challenge (the two-active seed was itself the orphan).
- [x] **撤销结算 no time limit** made explicit in the design doc (D2).

### Rule interaction: challenge-to-challenge timing (surfaced 2026-07-31 — intentional, do NOT "fix")
A challenge ends Sunday; settlement opens Monday; a new challenge must start on a **Monday** with both
sides settled. So **zero gap happens only if both settle on that first Monday.** Settle on Tuesday and the
earliest next start is the *following* Monday — an accidental **~6-day dead zone**. Deliberately **not**
changed (Monday alignment + both-settled rule both stay). Instead the gap is made **visible**: the
ended / waiting / settled views and the dormant empty state all show the concrete earliest start date
(`nextMondayOnOrAfter(today)`), and the 开启下一期 CTA sits on the settled view. A rest week is now an
informed choice, not a surprise. Future-me: this is by design — don't collapse the Monday alignment.

### Timezone (D9 grace day, 2026-07-31)
"today" is device-local everywhere (`todayISO`). Check-in / 签到 / streak use each user's local date =
fair (intended). Shared boundaries are protected by span-bounded 补签 (end) or are per-user (mid-edit),
except **auto-void**, which now has a **grace day** (`daysBetween(start, today) >= 1`) so a timezone-behind
partner keeps their start day; residual ≤~7h edge accepted (see design doc D9). No timezone storage.

> **Note:** the two sections below (**Rewards history view**, **Ledger polish**) predate this redesign;
> revisit their assumptions (they reference weekly/monthly `reward_plans`) once P1 lands.

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
