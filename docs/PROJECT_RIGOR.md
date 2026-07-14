# Project Rigor Profile

> Filled in against the actual repo (not from memory). Re-run the self-assessment
> at the "Next review trigger" conditions below.

## Project: StreakPact — two-person accountability check-in PWA (CP + JX)
## Last audited: 2026-07-02
## Next review trigger: **any tier-changing event** —
- it starts taking **money** (paid users / a client), OR
- a **3rd user** is added / it goes **multi-tenant** (Roadmap Phase 10), OR
- it goes **public / open-source** (public signups or a shared deployment).

Until one of those happens, the profile below holds and does not need re-litigating.

---

## 1. Tier

- [x] **Solo Hobby** — *"personal production."* No money, no client, no public
      signups; two known users who are the dev + one friend. It sits a notch above
      pure hobby only because it is **deployed and in daily use** — the template has
      no clean box for that, so: keep the bar low **except** where a silent bug
      corrupts the one thing the app exists to do (track who owes whom).
- [ ] Solo Commercial
- [ ] Small Team (2–5)
- [ ] Mature Product

---

## 2. Risk ratings (Low / Medium / High)

| Row | Rating | Notes |
|---|---|---|
| Business risk (data loss, money, reputation) | **Low** | No money/reputation surface (private, 2 known users). Worst case = a wrong settlement, and it's re-runnable. |
| Data criticality (PII, transactional data) | **Low** | No PII beyond two emails the users own. Check-in data is re-enterable. |
| Availability / uptime expectations | **Low** | No SLA; a down day is backfilled. |
| Team size & handoff | **Low** | Solo dev. Boundary logic is subtle, but docs (DECISIONS / ARCHITECTURE) are unusually strong. |
| Deploy frequency | **Medium** | Push to `main` auto-deploys to Vercel prod with **no gate**. The one genuinely elevated operational factor. |
| Test coverage needed | **Medium** | Concentrated entirely in `calc.ts` / `dates.ts` (week/month boundary + settlement math). Everything else is Low. |
| Secrets & credentials sensitivity | **Low** | Anon key is public-by-design (RLS enforces); `.env` gitignored (`.env.example` tracked); service-role key used manually only. |
| Observability & incident readiness | **Low** | No Sentry — the two users *are* the alerting. Acceptable. |
| Backup & recovery tolerance | **Low** | Recoverable by design (re-enter logs, re-run settlement); untested restore is fine at this tier. |
| Compliance / legal | **Low** | None. |

**Net: LOW tier**, with one localized **Medium** (correctness of the week/month/settlement
math) and one operational note (**every push is prod**). No row is High, so the template's
"if any row is High, treat Medium actions as mandatory" escalation does **not** apply. The two
Mediums are exactly what the two adopted actions below address.

Rule: if any row is High, treat all Medium-tier actions as mandatory too.

---

## 3. Baseline checklist (what's actually true in this repo today)

- [x] Git with a documented rollback path — Vercel keeps prior deployments; roll back = redeploy previous from the dashboard.
- [x] CI runs lint + type check + tests before merge — **added 2026-07-02** (`.github/workflows/ci.yml`, on push + PR to `main`). Build excluded on purpose (Vercel covers it).
- [x] dev / prod separated — local dev vs Vercel prod; PR preview deploys exist if a throwaway URL is ever wanted. (No dedicated staging — deliberately, see §5.)
- [x] Secrets in env vars / platform secret store — **not committed** (`.env` gitignored; Vercel holds the prod env vars).
- [~] DB automated backups — whatever the Supabase plan provides; **not relied on** (data is re-enterable by design). No custom retention policy — deliberate (§5).
- [ ] Backup restore actually tested — **skipped on purpose** (§5); recovery path is "re-enter / re-settle," not "restore."
- [ ] Error reporting + logs + a prod alert — **skipped on purpose** (§5); 2 users are the alerting.
- [ ] One-page runbook — **skipped on purpose** (§5); dev is the only operator.
- [x] Migrations tested before prod — schema is stable; migrations are hand-run in the Supabase SQL editor and tracked in `supabase/migrations/`.
- [x] Least-privilege credentials — app uses the anon key behind RLS; service role is manual last-resort only.

**Gaps found (be specific):** at audit time (2026-07-02), before this session's changes:
- **No CI at all** — the calc/dates regression tests only ran when someone remembered `npm test`; nothing stood between `git push` and live prod. → **Closed** by `.github/workflows/ci.yml`.
- **No typecheck in the pipeline** — `vite build` uses SWC (transpiles, does not type-check) and there was no `tsc` script, so a type error could reach prod. → **Closed** by the `typecheck` script (`tsc -b`, which follows the project references; a plain `tsc --noEmit` would check nothing because root `tsconfig.json` has `"files": []`) wired into CI.

---

## 4. Testing strategy for this project

This is what the coding agent should follow when writing code here.

**Must be automated (breaks silently / corrupts results / erodes trust):**
- **Week ↔ month boundary** — `getWeeksInMonth`, `dayToWeek`, `monthOfWeek`, `startOfWeekISO`
  (carry-in weeks, 1st-is-Mon/Sun/Tue, June→July spillover, year boundary).
- **Weekly pass/fail** — `weekStatusForUser` (count vs timer, note rows `value=0` ignored,
  distinct-day dedup, multi-task ALL-must-pass, pending / in-progress / early-success states).
- **Monthly result** — `monthStatus` (3+/≤1/neutral thresholds, 4-week **and** 5-week months,
  absolute-not-proportional threshold, mid-month = null).
- **Team combination** — `combineTeamMonth` (full truth table incl. nulls).

Current state: **coverage MEETS this baseline.** `src/data/calc.test.ts` and `src/lib/dates.test.ts`
cover all of the above, including the June/July boundary regression and `monthOfWeek` carry-in cases
added with the boundary-bug fix. No required gaps.

**Manual QA is fine (low risk, visual, easy to eyeball):**
- All UI / layout / dark mode / PWA install.
- Auth: login, password reset, change-password (one-time setup, 2 users).
- Supabase CRUD wiring + RLS (verified by *using* the app; RLS blocks cross-user writes structurally).
- Settle button → ledger write (**the math is unit-tested**; the *wiring* is eyeballed, and
  撤销结算 / un-settle is the safety net if a settlement is wrong).
- Toasts, copy, reward-gap banners.

---

## 5. What NOT to add (avoid over-engineering for this tier)

Deliberately considered and **skipped** — do not re-litigate unless the "Next review trigger" fires:
- **Staging environment** — Vercel PR preview URLs already cover the rare "try before prod" case.
- **Sentry / error monitoring / alerting** — the two users are the monitoring and the contacts.
- **Tested backup restore + retention policy** — data is re-enterable and settlements re-runnable by design.
- **E2E / Playwright for auth + CRUD, and React Testing Library component tests** — the
  jsdom / testing-library deps are installed, but the payoff is low vs. the pure `calc` tests.
- **`build` step in CI** — redundant; Vercel already fails the deploy on a broken build.
- **Coverage thresholds, mutation testing, least-privilege re-audit** — secrets/RLS are already handled correctly.
- **One-page runbook / incident contacts** — the dev is the only operator.

### Deferred / optional, low priority (on record, NOT blocking)
Flagged during the audit as *nice-to-have only* — explicitly deferred, do not treat as gaps:
- **Extract week-label ↔ number to a pure helper.** `useSettlements.ts` parses
  `Number(week.slice(1))` and builds ledger-key strings (`` `${month} ${week}` ``, `` `${month} 月` ``) —
  the seam between tested math and persistence. Testing it in isolation needs Supabase mocks (poor
  value for 2 users). If ever wanted, move the parse into `calc.ts` and unit-test that one helper.
- **Direct tests for `weeklyProgress` / `weekIsComplete`.** Currently exercised only *indirectly*
  (through `weekStatusForUser` / `monthStatus`). Fine as-is. Same for `formatWeekLabel`, `todayISO`,
  `currentMonthISO`, `prevMonthISO`, `shiftMonth` — trivial and fail-loud; manual-OK.

---

## 6. CRM sync (manual reminder)

Reflect in Notion CRM when this file changes:
- `Rigor Tier`: Solo Hobby (personal production) — net LOW risk.
- `Last Audited`: 2026-07-02.
- `Open Gaps`: none blocking — CI + typecheck gate added this session; the two flagged items are deferred/optional.
- Link back to this file's repo.
