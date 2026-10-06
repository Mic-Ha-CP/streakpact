# Dev notes

## ▶ NEXT SESSION STARTS HERE (parked 2026-09-27)

**The one build queued up: the D14 extension request/confirm UI.** Plan is written and
approved-in-principle; **nothing has been built**. Read, in this order:
1. `docs/design/PERIODS_AND_GAMIFY.md` → **D14 ⑪** — the full implementation plan
   (schema 008, hooks, UI, gating, tests, walkthrough). **⑪a is the crux**: it is the one
   part that does NOT simply copy D11, and getting it wrong means a confirmed extension
   silently fails to move the end date until the initiator next opens the app.
2. `docs/PROJECT_RIGOR.md` §3b — what may touch prod. Build and test the flow **locally**;
   do not repeat the manual `UPDATE`.
3. This file's "Local dev on a PROD DATA COPY" section — `npm run db:load` gives you the real
   data. Use a **local-only** test challenge for the request flow (the prod copy's current
   challenge already has `extended_days = 7` and should read "already extended").

**State of the world right now:**
- Prod is live on migrations **001→007**. Current challenge `5bab075d` runs
  **2026-08-31 → 2026-10-04** (extended +7 by hand, the logged exception); **neither side has
  settled**. When both settle, the next period can start Monday **2026-10-05**.
- Working tree clean, CI green, everything pushed.

**Also open, not queued:**
- **橙白 theme** — awaiting your tuning pass on `docs/design/orange-white-colorcard.html`,
  then the `index.css` block + one `shop_items` row (300, kind `theme`). Do not touch it before
  the tuning pass.
- **`docs/design/IDENTITY_AND_COSMETICS.md`** — written, unstarted, to be grilled before any build.
- **`docs/design/MULTI_MEMBER.md`** (2026-10-06) — audit + open questions for 1–3-member /
  invite / concurrent challenges. **Design only, gated on a confirmed third user.** If that
  happens it goes BEFORE the identity arc. ⚠ Until its RLS step ships, **do not create a third
  account** — everything is read-all.

## Where we are (updated 2026-09-27)

Production: **https://streakpact.vercel.app** (auto-deploys on push to `main`; CI = lint → typecheck
→ test). Prod DB is on migrations **001→007** + the D11 catch-up. The app now runs the
**challenge model** (Periods & Gamify) — the old month/week model is history-only (≤ 2026-06).

### Done — the Periods & Gamify arc is complete and live
- **P1 · Challenge core loop** — opt-in 4-week Monday-aligned challenges, single-layer total-target
  settlement, both-sides gate, deposit 记账, 中途修改 (D7), auto-void (D9), free pre-start edit (D10),
  consensual 中止 (D11).
- **P2 · Coins + 签到** — derived coin balance (earnings are a pure function of the data; `coin_ledger`
  holds only spends/adjustments), daily 签到 + streak, 补签到 −20, coin section on the Ledger.
- **P3 · Shop — LIVE ON PROD** — `shop_items` + `shop_redemptions` (006 + catalog applied
  2026-08-19). Buy → coin spend; 现实兑换 items write a **pending** `reward_ledger` row (buyer marks
  it used); 称号 / 主题 activate on purchase. Catalog **shelved by kind** (现实兑换 / 称号 / 主题).
  Virtual-item management (佩戴 / 切换 / 卸下) lives on **Account**.
- **金币规则说明 page** (`/coin-rules`) — earning rates, timer tiers, price list, ×10 exchange rule,
  failure outcome, no-expiry/no-refund. Doubles as JX's informed-consent doc.
- **Timer earning = 3-tier formula** (D12): ≤60 min → 1c/5min (max 12) · ≤120 → 1c/10min (max 6) ·
  ≤180 → 1c/15min (max 4); **cap 22 per task per day — NOT a daily total.** 13 boundary tests locked.
- **Sakura v2 theme** — full theme contract: **brand + surfaces + semantics + identity**. A theme is
  one light block + one dark block in `src/index.css` (contract documented there). Deliberate
  monochrome scheme (success is pink-family; state rides on ✓/✗ + numbers). Contrast-checked equal or
  better than the teal default on every measured pair.
- **D13 grace-window start (2026-09-02)** — initiating Mon–Wed can start THIS week (start_date =
  this week's Monday, backdated ≤2 days); missed days covered by the free task 补签. Introduces the
  **组建期 / setup window**: ONE constant (`SETUP_WINDOW_DAYS = 3`, anchored on `created_at`) drives
  BOTH the partner's join deadline (auto-void, re-anchored from `start_date`) AND a free-edit window
  for both members. Free edits = `(not started) OR (within setup window)` — a superset of D10.
  Dev-only `?today=YYYY-MM-DD` override exists for testing date-dependent flows.
- **Theme-aware browser chrome** — `<meta theme-color>` follows the resolved `--primary` (so it
  tracks theme *and* light/dark), tab favicon swaps per theme. Manifest icons stay theme-neutral by
  design (OS snapshots them at install; see the section below).

### Milestone — FIRST REAL SETTLEMENT COMPLETED (2026-08-31) ✅
The core loop has now run end-to-end on real data:
- **Both sides passed → team success.** CP and JX each settled 2026-08-31; both `result='success'`.
- **Deposits released, NOT executed** (250 MYR each) — correct per D4: a deposit is a *declaration*;
  on success it simply lifts. No penalty rows were written.
- **+500 通关 each** granted (derived from `result='success'`, no hook).
- **`team_reward` was left blank** (it is optional) and the settlement handled that cleanly —
  **verified in prod: zero `reward_ledger` rows** for that challenge's source — nothing phantom or
  empty was written. The coverage gap that verification exposed is now **closed** (2026-09-04): the
  decision is the pure `warrantedLedger()` in `src/data/challenge.ts` with all four branches tested,
  since the filled-reward and failure→penalty paths had never executed anywhere.

### In use — challenge 2 running
- **2026-08-31 → 2026-09-27** (started the same Monday settlement opened — zero gap, the good case).
- D13 grace-window start is live, so a future challenge can also begin on the *current* week's Monday.

### Post-settlement polish (2026-09-04)
- **Victory is acknowledged.** A win used to be silent about the deposit — it simply stopped being
  rendered. The both-settled strip now says **+500** and「押注已解除 · <押注> 未执行」outright;
  往期挑战 remains the durable record.
- **`team_reward` is collapsed** into an optional disclosure in the create form (closed unless one is
  set), placeholder「想不到就留空 —— 通关本身已有 +500 和押注解除」. It is optional in the schema but
  was reading as required and stalling initiation.
- **Shop restock reviewed → one addition only: a new theme「橙白」** (300). Four other proposals were
  rejected; reasons are in ROADMAP's deferred index. The reason underneath them all: in a month of
  real use **only the theme ever sold** (2 purchases, both 樱粉) — titles at 50–80 coins went
  untouched because they are *invisible*, not because they are expensive.
- **Next arc recorded, not started: `docs/design/IDENTITY_AND_COSMETICS.md`** — profile page, title
  slots, earned achievements, frames/avatars, more themes, style themes. To be grilled before any of
  it is built.

### Consensual extension (D14) — schema LIVE, UI not built (2026-09-27)
Real-life disruption (new job / travel / illness) left one side short on a timer task in the
**2026-08-31 challenge**; both agreed to +1 week. `challenges.extended_days` (migration 007,
CHECK: non-negative multiple of 7) is live on prod and **every end-date consumer honours it** —
the end date is derived (`start_date + weeks*7 + extended_days - 1`), never stored. `weeks`
stays the original agreement so history cannot lie about what was signed up for.
- **Current challenge now runs 2026-08-31 → 2026-10-04.** Applied by a one-off manual UPDATE
  (see the prod-write rule above — logged as an exception, not a precedent).
- `midEditOpen` deliberately ignores the extension: half of an extended run is 17 days, so
  honouring it would reopen a closed edit window and let someone extend to lower their target.
  A test asserts the function's arity so this cannot be quietly undone.
- **The D14 request/confirm UI does not exist yet** — that is the next build.

### 往期挑战 "5 weeks" report (2026-09-27) — investigated, NOT a bug
Reported as the 08-03 challenge showing 5 weeks. Prod data is correct (only the 08-31 row has
`extended_days = 7`; all three 08-03 rows are 0/4 weeks), the deployed bundle's logic is
correct, and a local repro of the identical 4-row shape renders **4 周** on all three. The 3
entries are **1 settled + 2 cancelled**, as expected.
**What was fixed anyway:** the dashboard and the history view each had their *own* copy of the
"which challenge is current" rule, and history defines "past" as "everything except current" —
so any drift would leak the current (extended) challenge into 往期挑战 and show *its* week
count there. That is the only mechanism that produces the reported symptom, so the rule is now
one shared `currentChallengeOf()` in `src/data/challenge.ts`, with tests locking the real prod
shape (three rows share a start_date; **two rows are `status='active'`** because a settled
challenge keeps that status by design).

### Next options — no commitments, pick when the time comes
- **主题「橙白」** — color card ready (`docs/design/orange-white-colorcard.html`), awaiting the
  owner's tuning pass; then the `index.css` block + one `shop_items` row (300, kind `theme`).
- **More shop items** — the catalog is data, not code: add rows to `shop_items` (prod SQL Editor). New
  称号 need only a `payload`; a new 主题 needs a variable block in `index.css` first. But see the
  restock review before adding more: cheap items are not the constraint.
- **Sakura v2.5 decorations** — petals + hand-drawn accents; **pending CP's art** (the petals half
  needs no assets and could ship alone). See `docs/design/THEME_DECORATIONS.md`.
- ~~**Challenge history view**~~ — ✅ BUILT 2026-09-02 (往期挑战 on the home page) now that real
  settled history exists.
- **GSheet history import** (Phase 8) — pre-cutover months only.
- **Timer feature** (count-up / countdown) — also the missing carrier for themed functional
  components (see THEME_DECORATIONS §c).

### How settlement works (Phase 6) — ⚠ LEGACY (months ≤ 2026-06 only)
> Superseded by the challenge model: there is **no weekly/monthly settle** anymore, just one
> end-of-challenge settlement with a both-sides gate. Kept because the legacy month board (≤ 2026-06)
> still behaves exactly as described below.
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

**D11 catch-up (2026-08-14):** prod's applied `004` predated the Round-3 D11 edit, so
`challenge_members.abort_requested_at` + the `'aborted'` status were missing → abort broken on prod.
Paste-ready catch-up SQL was handed off separately (idempotent: `add column if not exists` +
drop/re-create `challenges_status_chk`). Apply before relying on 中止/abort in prod.

**P3 shop (2026-08-14): run `006_shop.sql`** in the SQL Editor after 004/005. Additive: adds
`shop_items` + `shop_redemptions` + RLS + indexes; **does NOT seed a catalog on prod** (the catalog
INSERTs live in `seed.sql`, local-only). After applying 006, seed the prod catalog by hand (the 6 v1
items per DECISIONS.md D12) via the SQL Editor — or the shop shows an empty catalog. `coin_ledger`
already allows `reason='shop'` (from 005), so no change there.

**✅ PROD FULLY LIVE (2026-08-19):** `006_shop.sql` + the 7-item catalog + the D11 catch-up SQL
(`abort_requested_at` + `'aborted'` status) are all applied on prod. Prod = full **P1 + P2 + P3**.
JX's deposit-declaration text had a typo, corrected **directly in the DB** (agreed one-off typo-fix
path — challenge_members is user-owned data, no code/migration involved).

### What may touch prod (RULE — added 2026-09-27)
**Prod receives only reviewed migrations and genuinely necessary data fixes.**
**Feature behaviour is never enabled by editing prod data** — a flow is built and exercised
through the UI locally first. A hand-written `UPDATE` that makes a feature *look* like it
works leaves the real code path unexercised and turns prod into the test environment.

Necessary data fix = correcting **wrong or missing data** (a typo; a value the UI cannot yet
express and a user legitimately needs). Still: keyed to an explicit id, guarded so a re-run is
a no-op, inside a transaction, with a verification `SELECT` before `COMMIT`.
**Reads against prod are unrestricted** — it is writes that are constrained.

Test: *would this still be needed if the feature were finished?* Yes → data fix. No → build it.

**Exceptions on record (not precedents):**
- **2026-09-27 · `challenges.extended_days = 7`** — the pair had agreed a one-week extension,
  the deadline was that day, migration 007 existed but the **D14 request/confirm UI did not**.
  Applied by hand. The correct end state is the D14 flow; once built, this `UPDATE` never needs
  writing again. See `docs/design/PERIODS_AND_GAMIFY.md` D14 ⑩.
- **2026-08-19 · JX's deposit text typo** — corrected directly in the DB; wrong data, no UI
  for it. Fits "necessary data fix" rather than being an exception at all.

See `docs/PROJECT_RIGOR.md` §3b for the same rule in the rigor profile.

### Shop (P3) smoke test — local
1. Login CP. 首页/账本 → 金币余额 visible; open 商城 (nav).
2. Buy a **现实兑换** item (e.g. 奶茶券 120) → balance −120; a **pending** row appears in 账本
   (奖惩账本, type 奖励) → mark it **已使用** there.
3. Buy a **虚拟** item: a 称号 → activates (equipped) → shows on the header pill (CP · 称号).
   Buy the **Theme** → skin applies immediately; switch/unequip from 商城「我的」.
4. Buy the **大额** item twice (repeatable) → two spends, two pending ledger rows.
5. Balance never goes negative (buy blocked when balance < price). Open 金币规则说明 (linked from
   商城 + 账本) → renders earning rates + timer tiers + price list.
6. Switch to JX → same catalog/prices (D3); JX's own balance/owned items independent.

### Backups (free tier has NO scheduled backups — do this manually after each challenge ends)
Dumps prod's `public` schema (all app data) to a timestamped file **outside the repo**. The dump holds
**real data — NEVER commit it** (the `streakpact-backups` dir lives outside the repo for that reason).
Prereq: the local Supabase stack running (`supabase start`) so the `supabase_db_*` container (with
`pg_dump`) exists. From the repo root, in Git Bash:

```bash
DB=$(docker ps --format '{{.Names}}' | grep supabase_db | head -1)
DBURL=$(grep '^DATABASE_URL=' .env | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//' | tr -d '\r')
mkdir -p /c/Users/Admin/Documents/Self_Learning/streakpact-backups
docker exec -e PGCONN="$DBURL" "$DB" sh -c 'pg_dump "$PGCONN" --schema=public --no-owner --no-privileges' \
  > "/c/Users/Admin/Documents/Self_Learning/streakpact-backups/streakpact-prod-public-$(date +%Y%m%d-%H%M%S).sql"
```

- `DATABASE_URL` (in `.env`, git-ignored) is the direct 5432 connection — pg_dump needs a session
  connection, not the transaction pooler (6543).
- Auth accounts (CP/JX in `auth.users`) are Supabase-managed and not in this dump; they persist unless
  the project is deleted, so the `public` data + the two accounts fully reconstruct state.
- **Restore** (recovery): the dump is plain SQL (CREATE TABLE + COPY). Restore into a fresh/empty
  project's `public` schema with `psql "$DBURL" < <backup-file>`. Test on a scratch DB before ever
  running it against a live one.

### Local dev on a PROD DATA COPY (added 2026-09-27)
Reproduce bugs and exercise features against real data, locally. **Prod is only ever read**
(`pg_dump`); nothing in this flow writes to it.

```bash
npm run db:snapshot   # dump prod's public schema → ../../streakpact-backups (REAL DATA)
npm run db:load       # load the newest dump into the LOCAL stack
npm run db:reset      # back to the clean migrations + seed fixture
```
`npm run db:load <path>` loads a specific dump instead of the newest. Both scripts need the
local stack up (`npx supabase start`) — `pg_dump`/`psql` run inside its container, since the
Windows host has no postgres client.

**Where dumps live:** `C:/Users/Admin/Documents/Self_Learning/streakpact-backups`
(override with `STREAKPACT_BACKUPS`). **Outside the repo, on purpose** — they contain real
data. `.gitignore` also blocks `*prod-public-*.sql` and `streakpact-backups/` so a stray copy
inside the repo still cannot be committed, and the loader refuses a dump that sits in the repo.

**Auth — the one real decision.** The dump is `public`-only, so real `profiles.id` values
arrive with no `auth.users` to hang off (`profiles.id` IS `auth.users.id`). Two options were
possible: remap prod UUIDs to the seed's `1111…`/`2222…`, or keep the prod UUIDs and mint
local accounts carrying them. **The loader does the latter.** Remapping would mean rewriting
the user id across every table referencing profiles (tasks, daily_logs, challenge_members,
challenges.initiator, reward_ledger, coin_ledger, checkin_days, shop_redemptions,
settlements) — miss one FK and the copy is wrong in a way that still looks fine. Keeping the
ids means **a row id you read in prod is the same id you read locally**, which is the point of
having a copy.

Log in locally as **cp@test.local / jx@test.local**, password **test1234** — synthetic
credentials minted by the loader. No real email or password hash is ever copied into the
local stack.

**Two things the loader must do that are easy to miss** (both are handled, noted so nobody
"simplifies" them away):
- the dump is `--no-privileges`, so after loading it re-grants `anon`/`authenticated` on the
  new tables; without that every request 401s behind an apparently healthy stack (RLS still
  applies normally on top);
- `drop schema public cascade` takes `handle_new_user` **and its trigger on `auth.users`**
  with it, so the trigger is recreated afterwards.

Verified 2026-09-27 end to end: 4 challenges / 20 tasks / 341 daily_logs loaded, both accounts
authenticate, and PostgREST returns the real rows through RLS.

## Theme-aware browser chrome (P3, 2026-08-19)
`ThemeChrome` (mounted at the app root, `src/components/ThemeChrome.tsx`) owns runtime chrome:
- Applies the equipped theme's `[data-skin]` to `<html>` (moved here from AppShell so every page,
  incl. login-adjacent, reskins).
- Sets `<meta name="theme-color">` to the **resolved `--primary`** (read live from the CSS var), so
  the mobile address bar / PWA title bar follows teal-default vs sakura AND light/dark. Reading the
  var means it auto-follows any future theme (incl. sakura v2) with no per-theme code. `index.html`
  ships a pre-paint default + a dark fallback so the bar doesn't flash on load.
- Swaps the tab **favicon** per theme (`/logo.svg` teal ↔ `/logo-sakura.svg` pink).
- **Manifest icons stay theme-NEUTRAL by design — do NOT revisit.** An installed PWA's icons are
  snapshotted by the OS at install time and cannot follow runtime theme switches (platform
  limitation, all platforms). Only the live tab favicon + theme-color are themeable at runtime.

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
