# Roadmap

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
- [ ] Test add-to-home-screen on mobile (needs HTTPS — verify on Vercel/preview)
- [ ] Replace placeholder logo.svg with real branding (optional)

## Phase 5: Deploy
- [ ] Connect repo to Vercel
- [ ] Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Deploy and verify
- [ ] Connect custom domain (optional)

## Phase 6: Data migration (optional)
- [ ] Script to import Google Sheet history into Supabase
- [ ] Import daily_logs (Dec 2025 – present)
- [ ] Import weekly/monthly settlements
- [ ] Import reward_ledger entries

## Phase 7: User profile features
- [ ] Settings page
- [ ] Change display name
- [ ] Upload avatar (Supabase Storage)
- [ ] In-app password reset

## Phase 8: Data polish
- [ ] Import Google Sheet history into Supabase
- [ ] Verify imported data integrity

## Future (not scheduled)
- ±5% tolerance on timer tasks
- 补签券 automation (redeem → auto-pass a failed task)
- Push notifications (PWA web push)
- Monthly task template library
- Dark mode toggle
