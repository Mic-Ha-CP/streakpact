# Identity & Cosmetics — the next major arc

**Status: RECORDED, NOT DESIGNED.** Nothing here is decided or committed. This document exists so
the arc can be *grilled* from a written starting point instead of re-derived from memory. Every
section below ends with the questions that have to survive that grilling.

Written 2026-09-04, out of the first-challenge economy review. Companion docs:
`PERIODS_AND_GAMIFY.md` (D1–D13, the rules), `THEME_DECORATIONS.md` (the decoration layer and the
deluxe pricing model), `../ROADMAP.md` (what shipped, what is deferred).

---

## 1. The finding that drives the whole arc

After one complete challenge and a fully stocked shop, the sales record is:

| item | kind | price | times bought |
|---|---|---|---|
| 主题 · 樱粉 | theme | 300 | **2** (one each) |
| 称号 ×3 | title | 50 / 65 / 80 | **0** |
| 奶茶券 | redemption | 120 | **0** |
| 外卖券 | redemption | 400 | **0** |
| 大额兑换 | redemption | 1200 | **0** |

Two purchases, ever, both of the same item — and it is the item that **changes what you look at**.
Meanwhile CP finished on 851 coins and JX on 577, with everything unowned in the catalog costing 715
in total. Coins are not scarce. Desire is.

The titles are the sharp end of it. They are the cheapest things in the shop (50–80, i.e. two or
three days of ordinary effort) and nobody has bought one in a month. Price is therefore not the
variable. **A title is invisible**: it renders as one pill in your own header, on your own screen.
You buy it, and then nothing in the world is different — not for you after the first glance, and not
for the other person at all.

> **The load-bearing claim of this arc: virtual goods need a stage.** A cosmetic is worth something
> only where it is *seen* — by you, repeatedly, and by the one other person who is in this with you.
> StreakPact has no such surface today. Build the stage first; the goods on it can be cheap.

This also reframes the sink problem. The pending question was "what do we sell to absorb the coins?"
The better question is "**what is worth owning?**" — and the answer so far, from real behaviour, is
*things that change the surface you stare at every day*.

### The 签到 data point (unresolved, worth carrying into the grilling)

CP checked in on **34 days**; JX on **9**. Same challenge, same window. The 打卡 numbers are not
lopsided in anything like the same way (521 vs 372 coins) — so this is not "JX did less", it is
**JX does not use 签到**. That is ~125 coins per challenge of the faucet sitting idle on one side,
and more importantly a daily-open ritual that only half the pair has.

Whether the profile arc should try to fix that is a real question, not a rhetorical one. A
profile-visible streak *would* give 签到 a stage (see §4, "N-day 签到 streak"). But building a
visible incentive to make one person adopt a habit the other person likes is a design choice with a
social edge to it, and it should be argued explicitly rather than smuggled in as an achievement.
**Ask during grilling: is dormant 签到 a problem to solve, or just a difference in how two people
use the app?**

---

## 2. Profile page — the stage itself

A per-user page, **visible to the partner**. This is the prerequisite for everything else in this
document: without it, titles, achievements, frames and levels are all invisible again.

What it plausibly holds (information architecture is exactly what the grilling is for — this is a
list of candidates, not a layout):

- equipped **title(s)** — see §3 for slots;
- equipped **theme** — note this one is odd: a theme is *yours*, rendered on *your* device. The
  partner cannot see your skin. Either the profile shows it as a stated fact ("JX 正在用 樱粉"), or
  themes stay outside the profile entirely. **Open question.**
- **achievements** earned (§4);
- **challenge history stats** — challenges completed, team wins, deposits released vs executed. Much
  of this is already computed by `useChallengeHistory`;
- **streaks** — current and longest 签到 streak, and possibly a 打卡 equivalent;
- **avatar + frame** (§5).

Questions for the grilling:
- Is this a **third tab**, or does it live under Account? (Account is currently the junk drawer:
  title/theme management moved there in the P3 smoke-test round.)
- Is the partner's profile reachable **by tapping their name anywhere**, or only from one place?
- Does the profile show *live* data or *settled* data? (`ChallengeHistory` deliberately shows the
  settled snapshot; a profile showing live-recomputed stats would disagree with it. Pick one rule
  and apply it everywhere.)
- **Two users.** Every "social" feature here has an audience of exactly one. That is a constraint,
  not a limitation to design around: it means the profile can be dense and personal rather than
  generic, and it means *nothing* needs a feed, a ranking, or a share button.

---

## 3. Title display slots

Today: one title, self-only, invisible. The proposal turns titles into a **loadout**:

- **1 slot by default.** Extra slots are **purchasable** — a virtual sink that makes every *existing*
  unsold title retroactively more interesting, because the constraint (which one do I wear?) is what
  gives a title meaning at all.
- Titles remain **own-once** (D12). Slots are the repeatable-ish sink; titles are the collection.

Questions:
- How many slots can be bought — 2? 3? unbounded? An unbounded slot count destroys the constraint
  that makes the loadout interesting.
- Do slots escalate in price (100 / 300 / 900) as classic collection sinks do?
- Where do multiple titles actually **render**? The header pill fits one. If slot 2 has nowhere to
  appear, this whole section is invisible again and should not be built.
- Does the partner see your titles **passively** (on their own screens, next to your name) or only
  by visiting your profile? Passive is far more valuable and far more invasive of the layout.

---

## 4. Achievements — earned, never bought

**The rule is the design.** An achievement that can be purchased is worthless; that is exactly the
tension flagged (and left open) when 纪念章 was proposed as a shop item, and it is resolved here by
moving commemoratives out of the shop entirely. Achievements are **not a coin sink** and must not be
justified as one.

Candidates, most of them derivable from tables that already exist:

| achievement | derived from | notes |
|---|---|---|
| per-challenge commemorative (e.g.「2026-09 · 通关」) | `challenge_members.result` + span | one per successful challenge; the honest form of 纪念章 |
| first win | first `result='success'` with a team success | one-time |
| N-day 签到 streak | `checkins` | see the §1 caveat before building this |
| total timer minutes milestone | `daily_logs` (timer tasks) | 10h / 50h / 100h |
| perfect challenge (every task at target, no 补签) | `daily_logs.backfilled` | flirts with punishing 补签, which D8 deliberately made cheap-but-not-free — **argue this one** |

Questions:
- **Stored or derived?** Derived costs nothing and self-corrects (the coin economy already works this
  way, deliberately). But a derived achievement can *un-earn* itself if data is edited or a
  settlement is undone. Is that acceptable, or do achievements need to be snapshotted the way
  `challenge_members.result` is?
- Do achievements grant coins? (If yes, they are a faucet, and the economy math in ROADMAP changes.)
- How many is too many? Two users will exhaust a fixed list quickly, and an exhausted achievement
  list is deader than no list.

---

## 5. Avatar + frames

**Frames** are the classic tiered sink: a cheap set, a mid set, one or two expensive ones, all
purely visual, all repeatable in the sense that there is always another one to want. They are the
single best-fitting sink in this document *provided* the profile page exists to show them.

**Avatars are the open question**, and it is the same constraint that blocks Sakura v2.5:

- **Upload** (Supabase Storage) — real work: a bucket, RLS on it, image resizing, a crop UI. But it
  needs no art from anyone.
- **Preset set** — needs someone to *draw* the presets. No generative AI (standing constraint), which
  means CP's own art, which means this is gated on the same bottleneck as v2.5's petals.

Frames sidestep the bottleneck entirely — a frame is CSS (a ring, a gradient border, a corner
ornament), not an illustration. **Frames can therefore ship before avatars**, on top of an initials
chip.

Question: does a frame around a plain initials chip (CP / JX, as rendered today) read as a reward, or
does it need a real avatar underneath to feel like one?

---

## 6. Level

Derivable from cumulative activity (coins ever earned, days logged, challenges completed). Cheap to
compute, and it looks like the obvious next thing.

**Flag: "what does a level DO?" must be answered before any of it is built.** A number that only goes
up and gates nothing is a hollow number, and both users will see through it inside a week. Possible
answers, none chosen:

- it **gates** cosmetics (level 5 unlocks the level-5 frame) — makes the shop a progression instead
  of a menu, but adds a second currency-like axis on top of coins;
- it is **purely a title** (level 12 = a name, not a number);
- it **replaces** nothing and is cut.

The honest default is **cut it** unless the grilling produces a real answer. It is the section of
this document most likely to be built because it is easy rather than because it is wanted.

---

## 7. More color themes (cheap — the contract already exists)

Each is **one color card + one light/dark block**, no new machinery. The theme contract in
`src/index.css` and the tuner in `docs/design/*-colorcard.html` make these near-mechanical:

- **清新绿**
- **冰雪蓝**
- **布丁** (淡黄 + 棕)

Two lessons from sakura and 橙白 carry into all of them:
1. `--jx` / `--jx-soft` are **not optional** (contract §4) — a cold gray on a warm ground reads as a
   foreign object. Every card must expose them.
2. Whether the semantics go monochrome is a **per-theme call decided by hue geometry**, not taste:
   sakura could (pink 340 vs danger 12 = 32° apart), 橙白 could not (orange 24 vs red would collide).

Themes are the only category with proven demand. Given the finding in §1, **the cheapest credible
restock is simply more themes** — and that is worth weighing against every more ambitious idea in
this document.

---

## 8. Style themes (expensive — the contract must grow first)

**黑白像素**, **黑客终端**. These are not palettes. They need the theme contract to expand from
"theme = a set of colors" to **"theme = a full skin"**:

- **typography** — font family and weight per theme (pixel needs a bitmap face; terminal needs a
  mono face). Today the font is fixed globally in `index.css`.
- **radius** — pixel themes have *no* rounded corners; the app is built on `rounded-2xl`/`3xl`
  everywhere.
- **borders** — hard 1px/2px versus today's soft `border-border/60`.
- **motion** — a terminal blinks; a pixel UI snaps rather than eases.
- probably **shadow** and **spacing** as well.

That is a genuine contract extension touching every component, and it is the natural home of the
**deluxe tier** in `THEME_DECORATIONS.md`'s pricing model. **Recorded and deferred** — the scope note
above is the deliverable for now, not the work.

---

## 9. Phasing sketch (not a commitment)

1. **Profile page + title slots** — the stage, and the first thing that makes existing unsold goods
   worth owning. Nothing else in this document pays off before this exists.
2. **Achievements** — mostly derived from tables that already exist; needs the profile to be visible.
3. **Frames** (then avatars, if the upload-vs-presets question resolves) — the tiered sink.
4. **Style themes** — only after the contract extension in §8 is itself designed.

Colour themes (§7) sit outside this ladder: they are independently cheap and can land at any point,
including before step 1.

---

## 10. What this arc must NOT do

- Do not add **tool items** (D12: permanently excluded). Cosmetics only.
- Do not make achievements **buyable**, and do not justify them as a coin sink.
- Do not build a **level** that gates nothing (§6).
- Do not build **anything invisible to the partner** and expect it to be wanted — that is the exact
  mistake the titles already made, and repeating it with frames or achievements would be worse
  because they cost more to build.
