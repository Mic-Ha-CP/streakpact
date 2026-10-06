# Multi-member challenges — audit + open questions

**Status: DESIGN ONLY. Build is gated on a confirmed third user.** Nothing here is decided.
Written 2026-10-06 because a third person *may* join, and the cost of the current two-person
assumptions should be known before anyone says yes — not discovered after.

Possible future being sized: challenges with **1–3 members**, **invite-based**, membership
chosen **per challenge**, and possibly **concurrent challenges** (CP+JX in one, CP+a friend in
another).

Companion docs: `PERIODS_AND_GAMIFY.md` (D1–D14, the rules every one of these would amend),
`IDENTITY_AND_COSMETICS.md` (the profile arc — see §5 on ordering), `../PROJECT_RIGOR.md`.

---

## 0. ⚠ The hazard that exists TODAY, before any build

**Do not create a third account until §1-L5 (RLS) has shipped.** Concretely, if someone were
added to `auth.users` right now:

- **They could read everything.** 13 tables are `for select to authenticated using (true)`
  (L5) — including both members' **deposit declarations** (the personal forfeit text), the
  reward/penalty ledger, every daily log *and its note* (「生病」, 「补签说明」), coin history and
  purchases. Nothing in the UI would show it; the API would just return it.
- **They would be rendered as JX.** `useProfiles` casts `display_name as UserId`
  (`"CP" | "JX"`), and every identity branch is `user === "CP" ? cp : jx` — so any third name
  falls into the JX branch: JX's colour, JX's chip.
- **They would have no tab of their own** on Check-in / Calendar / Rewards, which iterate a
  hardcoded `["CP", "JX"]`.

The first is a privacy problem, the other two are cosmetic. That ordering is why RLS is
**step one** in §4, not a later polish.

---

## 1. Audit — every two-person assumption, by layer

Effort: **S** ≈ under a day · **M** ≈ 1–3 days · **L** ≈ 3+ days. Estimates assume the open
questions in §2 are already answered; most of the real cost is in those answers.

### L1 · Identity & types — **M**
| Where | Assumption |
|---|---|
| `src/data/models.ts:7`, `src/hooks/useAuth.tsx:12` | `type UserId = "CP" \| "JX"` — two identical definitions; identity *is* the display name |
| `src/hooks/useProfiles.ts:30` | `p.display_name as UserId` — an unchecked cast; a third name type-checks and misrenders |
| `src/hooks/useCoins.ts:124,128` | domain objects built with a placeholder `userId: "CP"` (harmless internally, but it only works because the type has two values) |
| `supabase/migrations/001_init.sql` `handle_new_user` | profile name comes from signup metadata — no uniqueness, no slug |

The structural change: identity becomes the **profile id** (uuid) with a display name and a
colour slot *attached*, instead of the name being the identity. Every `UserId` comparison
flows from that, so this is the root of L2–L4.

### L2 · Domain logic (pure, testable) — **M**
| Where | Assumption |
|---|---|
| `src/data/challenge.ts:227` `combineTeamChallenge(a, b)` | the team verdict takes exactly two results |
| `src/hooks/useChallengeHistory.ts:152–155` | `mine[0]`, `mine[1]`, `mine.length === 2` |
| `src/hooks/useChallenge.ts:185`, `useChallengeSettlement.ts:64` | `partnerMember = members.find(m => m.userId !== me)` — "the other one", singular |
| `src/hooks/useChallenge.ts:206` | `aborted = myAbort && partnerAbort` — consent of exactly two (D11) |
| `src/hooks/useChallengeSettlement.ts:71` | `bothSettled = mySettled && partnerSettled` — the both-sides gate (D2) |
| `src/data/challenge.ts:430` `autoVoidDue` | `memberCount < 2` — "a challenge needs a partner" (D9/D13) |
| `useChallengeSettlement` lazy reconcile | the *first* settler writes their ledger row when they next see the *second* settle — assumes one "other" |
| D14 ⑪ (planned, not built) | `bothAgreed = myExt && partnerExt` — would bake in a fourth pair-consent rule |

Good news: `challenge_members` is **already one row per member**, so the schema is N-capable;
only the logic reading it is binary. Most of this layer becomes `every` / `some` over a member
list — mechanical once §2's verdict and consent questions are answered.

### L3 · UI — **L** (largest surface)
| Where | Assumption |
|---|---|
| `ChallengeHome.tsx:255` | `partner = me === "CP" ? "JX" : "CP"` |
| `ChallengeHome.tsx:841`, `Index.tsx:337`, `Setup.tsx:497`, `Rewards.tsx:98`, `ChallengeHistory.tsx:129` | two-column grids: me \| partner |
| `CheckIn.tsx:243`, `Calendar.tsx:188`, `Rewards.tsx:51` | person switch iterates hardcoded `["CP", "JX"]` |
| `Ledger.tsx:121–122` | person filter with two hardcoded options |
| `ChallengeHome.tsx:86` `VictoryAck` | `stakes.length === 2` "same stake" collapse |
| `ChallengeHome.tsx:551` | `members.length < 2` → 「对方尚未加入」 |
| 16 lines across 6 files | copy says **双方 / 对方** ("both sides" / "the other side") |

The settle strip, the abort strip and the (planned) extension banner all phrase consent as
"waiting for *the other person*". With N members they need "waiting for X and Y".

### L4 · Theme contract — **S–M**
- Contract §4 (`src/index.css`) defines exactly two identity slots, `--cp/-soft` and
  `--jx/-soft`, and says **every theme MUST define both** — 17 declarations across the theme
  blocks, 4 Tailwind entries, ~20 class sites in 10 files (`bg-cp`, `text-jx`, …).
- The asymmetry is deliberate and would need restating: **CP tracks the brand** (high salience),
  **JX is the quiet near-neutral** in the theme's own temperature family. With per-user slots
  that rule becomes "*me* = brand, *others* = quiet ramp", or each user owns a slot regardless of
  viewer — a real design choice (§2 Q8), not a rename.
- Every existing and planned theme (teal, 樱粉, 橙白 card) multiplies the cost: each slot added
  is one more light + dark token pair per theme.

### L5 · RLS / privacy — **M, highest risk, must ship first**
Read-all (`using (true)`) on **13 tables**: `profiles`, `challenges`, `challenge_members`,
`tasks`, `daily_logs`, `checkin_days`, `coin_ledger`, `reward_ledger`, `reward_plans`,
`weekly_settlements`, `monthly_settlements`, `shop_items`, `shop_redemptions`.

Correct for two people who share everything by design; **a privacy hole the moment a third
person exists.** Writes are already own-row (good), and `challenges` update is initiator-only.
The rewrite is a membership-scoped visibility rule — likely a `security definer` helper such as
`shares_a_challenge_with(other_user)` used by each select policy — whose exact shape depends on
§2 Q6 (what a co-member may see). `shop_items` stays public (catalog). `profiles` needs at
least name + colour visible to co-members.

Test burden is the real cost here: RLS is the one layer where a mistake is silent and the
current suite (pure functions) cannot catch it. Policy tests against the local stack would be
new infrastructure.

### L6 · One current challenge — **L if concurrency, S otherwise**
| Where | Assumption |
|---|---|
| `src/data/challenge.ts:121` `currentChallengeOf` | **one** current challenge per *app*, not per user or per group |
| `useChallenge.ts:119` `queryKey ["challenge", "current"]` | one cached current |
| `ChallengeHome`, `CheckIn` | render exactly one challenge |
| "previous must be settled before starting the next" | **UI-only**: 开启下一期 appears only on the dormant and both-settled views. Nothing in the DB stops a create — with concurrency, `currentChallengeOf` would simply pick the newest and **hide** the older one |
| `useCoins` | earnings = Σ over all valid challenge tasks — fine per task, but see §2 Q5 |

Membership-per-challenge *without* concurrency is cheap (still one current, it just has N
members). Concurrency is what makes this layer expensive: "current" becomes a list, the home and
check-in pages need a challenge switcher, and every query keyed on "the" challenge changes.

### L7 · Accounts & invites — **S (admin) / M (in-app)**
- Accounts are created **by hand** (seed / SQL); `handle_new_user` derives the profile.
- **`CLAUDE.md` explicitly says "no invite flow"** ("Don't over-engineer auth — no roles, no
  teams, no invite flow"). An invite-based model contradicts a written project rule, so that line
  must be revisited deliberately, not quietly broken.
- Supabase Auth supports invite-by-email, but it lives behind the service role — i.e. a server
  side the project deliberately does not have (`No separate backend API`). An in-app invite
  likely means an Edge Function, which is new infrastructure.

### L8 · Legacy month model — **S (freeze)**
Setup / Rewards / Calendar month view / weekly + monthly settlements are two-user by
construction and history-only (≤ 2026-06). Recommendation: **freeze, do not port** — a third
person has no legacy months. Only their read-all RLS (L5) needs scoping.

### Summary
| Layer | Effort | Order |
|---|---|---|
| L5 RLS | M (+ new test infra) | **1st — before any third account exists** |
| L1 Identity | M | 2nd — everything below keys off it |
| L2 Domain | M | 3rd |
| L4 Theme | S–M | with L3 |
| L3 UI | L | with L4 |
| L7 Accounts | S / M | when the person is real |
| L6 Concurrency | L | **separately decidable** — can be skipped entirely |
| L8 Legacy | S | freeze |

Rough total without concurrency: **~2 weeks of evenings**. With concurrency: roughly double, and
§2 Q5 must be answered first or the coin economy breaks.

---

## 2. Open questions — for a grilling session

1. **Team verdict with N members.** Today: team success iff both pass (D2), and any failure drags
   everyone's deposit into execution. With three: still all-pass? Does a "team" meaningfully
   exist above two, or does a 3-person challenge become three parallel 1-person challenges that
   happen to share dates? (D2's "one fails, both pay" is a strong social mechanic between two
   people who chose each other; it may be unfair between three who didn't all choose each other.)
2. **Consent for abort (D11) and extension (D14): unanimous or majority?** Unanimous preserves
   the current guarantee (nobody's stakes change without their agreement) but gives every member
   a veto. Majority with 3 = 2-of-3 can extend a third person's deadline against their will.
   D14's abuse guard was "the partner who isn't struggling waits a week" — with N, *who* waits?
3. **Auto-void (D9/D13).** "Void if fewer than 2 joined within the 组建期" — keep 2 as the floor,
   or require *all invited* to join? If invites are explicit, an un-joined invitee is a clearer
   signal than a headcount.
4. **Solo mode.** `challenges.mode` was reserved (`'solo' | 'duo'`, only `'duo'` used). A solo
   challenge has no team verdict, no consent, no auto-void — and no social stake. Is a deposit
   with no counter-party still meaningful? If yes, who holds you to it?
5. **Concurrent challenges — the double-coin risk.** Earnings are per task (timer cap 22/task/day
   is deliberately *not* a daily total, D12). If CP logs the same 60-minute run into a CP+JX task
   and a CP+friend task, that is two task-days of coins for one activity. Options: one activity
   = one log that several challenges *reference*; a per-user daily cap across challenges; or
   forbid overlapping task types. Each has real UX cost. **Answer this before concurrency is
   built**, not after.
6. **Visibility boundary.** Can a co-member see only *this challenge's* tasks/logs/deposit? Or
   everything about you — coin balance, purchases, titles, other challenges, 签到 streak? This
   single answer *is* the RLS design (L5) and also decides what a profile page can show (§5).
7. **Invites + account creation.** Manual by CP (fine for one extra person, matches today)?
   In-app invite (contradicts `CLAUDE.md`, needs server-side code)? Who may invite whom into which
   challenge?
8. **Identity.** Dynamic display names + per-user colour slots replacing `--cp/--jx`. Is the
   colour a property of the *person* (CP is always orange) or of the *viewer* (I am always brand,
   everyone else is quiet)? The current contract is secretly both, because there are only two
   people.
9. *(added)* **Settlement order with N.** The lazy-reconcile ledger write assumes "the first
   settler writes when the other one finishes". With three, every member's row waits on the
   *last* settler — confirm that is acceptable, or make settlement batch.
10. *(added)* **The shop and the economy.** D3 says one catalog and one price list for both. With
    more people: same? And does a third person's coin balance appear anywhere others can see?

---

## 3. What does NOT change
- `start_date` is a Monday; weeks, spans, pace, extension math (D13/D14) — all per-challenge and
  already member-count-agnostic.
- Writes are own-row; challenge_members is already one row per member.
- Coins stay derived; `coin_ledger` holds only spends and adjustments.

## 4. Sequencing (if it becomes real)
1. **L5 RLS** — scoped visibility, with policy tests. Ship *before* the third account exists (§0).
2. **L1 identity** — uuid-keyed identity + colour slot; retire the `"CP" | "JX"` type.
3. **L2 + L3 + L4** together — N-ary verdict/consent per §2's answers, member-list UI, theme slots.
4. **L7 accounts** — at minimum a documented manual path; invites only if §2 Q7 says so.
5. **L6 concurrency** — only if wanted, and only after §2 Q5 has an answer.

## 5. Ordering against the Identity & Cosmetics arc
**Multi-member, if it happens, lands BEFORE the identity/profile arc.** The profile page's whole
premise is "partner-visible" — and *who* can see a profile, and *what* of it, is exactly §2 Q6.
Building profiles on today's two-person read-all model and then re-scoping visibility would mean
designing the stage twice. Likewise title slots and frames are rendered "next to your name" for
"the other person" — a phrase that has no single referent once there are three people.

If a third user is confirmed, `IDENTITY_AND_COSMETICS.md` should be re-read after §2 is grilled,
not before.

## 6. Rigor
A third user is an explicit **tier-changing event** in `docs/PROJECT_RIGOR.md` ("a 3rd user is
added"). The ratings it would move: **Data criticality** (deposit text, notes and penalties are
personal commitments now visible to someone who did not co-sign them) and **Business risk**
(trust, not money). Re-run the rigor review as part of step 1, not after launch.
