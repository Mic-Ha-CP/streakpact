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

### Ready to do next
- Log UI/UX issues into ### Open section below
- Wire useSettlements + auto-generate reward_ledger entries on settlement (biggest gap)
- Phase 7: profile features (display name, avatar, in-app password reset)
- Phase 8: migrate historical Google Sheet check-ins
- Optional: real PWA branding (replace public/logo.svg); custom domain

### Open decisions / known gaps
- Settlements/ledger are NOT automated: weekly/monthly status is computed live for
  display, but nothing persists settlements or creates reward_ledger entries, and there
  is no "add ledger entry" UI. The 奖惩账本 won't populate on its own yet.
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
