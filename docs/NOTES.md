# Dev notes

## Where we are (auto-generated 2026-06-01)

### Done
- Phase 1: Lovable UI prototype
- Phase 2: Supabase setup (tables, RLS, auth, profiles)
- Phase 3: Zustand → Supabase migration (committed + pushed)

### Ready to do next
- Smoke test the full auth flow locally (npm run dev)
- Log UI/UX issues into ### Open section below
- Phase 4: PWA (vite-plugin-pwa)
- Phase 5: Deploy to Vercel

### Open decisions
- useSettlements is built but not wired — no auto-settle trigger or auto-ledger generation yet
- Count unit label: currently 次/周, flag if 天/周 is preferred
- Notes on unchecked count days: not supported (by design, matches Sheet behavior)

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
