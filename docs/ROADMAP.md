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
6. **Phase 7 — In-app password reset** (still the next *feature*).
7. **Phase 8 — Historical data import** (later, maybe).
8. **Phase 9 — Profile features** (display name, avatar — nice-to-have).
9. **Phase 10 — Multi-tenant / groups** (exploratory, may never land; would be a v2).

## Repo hardening / open-source readiness
- [x] **Git history audited (2026-06-04):** scanned all commits + tracked files. No real emails
      (authors are `*.users.noreply.github.com` / bot accounts), only CP/JX initials (intentional),
      no secrets / anon key / Supabase URL / connection string (`.env` is git-ignored). Clean.
- [x] Replace the Lovable stub README with a real one (features, stack, local setup, deploy).
- [x] Remove dead scaffold files: `src/App.css`, `src/test/example.test.ts`, `public/placeholder.svg`.
- [ ] Optional tidy (low value, flagged not done): dual bun lockfiles (`bun.lock` + `bun.lockb`)
      alongside `package-lock.json` — pick one package manager; the dead shadcn toast chain
      (`hooks/use-toast.ts`, `ui/toaster.tsx`, `ui/use-toast.ts`) is unused now that only Sonner is mounted.
- [ ] Add a LICENSE file before publishing (choice is the owner's — e.g. MIT).

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
- [ ] **Manual:** run `supabase/migrations/002_ledger_unique.sql` (optional) and
      `supabase/migrations/003_settlement_delete_policies.sql` (**required** for un-settle) in the SQL Editor
- Settling after a week/month is over is a snapshot; backfilling a settled period does NOT auto re-settle
  (use 撤销结算 then settle again).

## Phase 7: In-app password reset
- [ ] Set Supabase Auth Site URL to the Vercel domain (prerequisite)
- [ ] "Forgot password" → email reset link flow
- [ ] Change-password form for a signed-in user

## Phase 8: Historical data import (later — maybe)
(Merges the old duplicate "data migration" phase.) See memory: import only dates *before*
the live-usage cutover (2026-06-02), additive, no month overlap.
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
- Push notifications (PWA web push)
- Monthly task template library
