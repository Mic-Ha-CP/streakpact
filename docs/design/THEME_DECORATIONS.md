# Theme decoration layer — investigation (no implementation)

**Status:** research only, nothing built. Recorded 2026-08-19, after sakura v2 shipped.
**Question:** beyond recoloring tokens, what else can a theme carry — and which parts are
actually feasible for us?

Sakura v2 established the **color** layer: a theme = one light block + one dark block of CSS
variables (`src/index.css`, contract documented there). That's the mechanism. This doc asks what
the *decoration* layer above it would look like, and what it would cost.

## Reference: Flat Tomato

Flat Tomato (iOS pomodoro app) ships themes as complete visual packages, not palettes. Four
distinguishable layers, roughly in increasing cost:

1. **Monochrome color scheme** — the whole UI commits to one hue family; state is carried by
   shape/icon/number rather than by hue. *(We already do this — sakura v2's success is
   pink-family, not green. See the theme contract note in `index.css`.)*
2. **Static illustration / pattern** — corner motifs, header ornaments, subtle background
   texture that changes per theme.
3. **Ambient effects** — slow, non-interactive motion (drifting particles) tied to the theme.
4. **Themed functional components** — the *functional* UI itself is redrawn per theme (e.g. the
   timer rendered as a themed clock face), not just decorated around.

Layers 1 is done. 2–4 are assessed below.

## Feasibility for StreakPact

### (a) Static illustration assets — sakura sprigs, corner motifs
**Technically trivial. Bottleneck is art, not code.** A themed illustration is a
`background-image` (inline SVG or a `data:`/static asset) attached to the skin selector — the
same `[data-skin]` hook the colors already use, so it needs no new architecture:

```css
:root[data-skin="sakura"] .app-header { background-image: url(/themes/sakura/sprig.svg); }
```

Cost is entirely in **asset production**: each theme needs its own motif set (header, empty
state, maybe card corner), in light- and dark-appropriate variants, at 1×/2× or as SVG.

- **Sourcing (decided constraint):** **CP draws them**, or we source/license real artwork.
  **No generative AI art** — per our ethics stance. This is a deliberate constraint, and it's
  the reason this item is asset-bound rather than schedule-bound.
- **Value: HIGH.** This is the dev × art crossover — the part of the product that can't be
  copied from a component library, and the most portfolio-legible. It's also what makes a
  premium theme feel *drawn* rather than *configured*.
- **Watch:** keep motifs out of dense/functional areas (task rows, number inputs); they belong
  on headers, empty states, and the dashboard's quiet margins. Ship them as SVG where possible
  so one asset covers all densities and can inherit `currentColor` for light/dark variants.

### (b) Ambient particles — falling petals
**Pure CSS, small, but must be well-mannered.** A dozen absolutely-positioned elements with
staggered `animation-delay` on a `translateY` + `rotate` keyframe; roughly **<100 lines**
including the keyframes, no library, no canvas, no JS.

Non-negotiable constraints:
- **`prefers-reduced-motion: reduce` → no animation.** Not "slower" — off. Vestibular-safety
  standard, and cheap to honor.
- **Low-interaction surfaces only.** Dashboard / empty states / the shop: yes. Anywhere the user
  is *entering* something — check-in inputs, the challenge form, timer minutes — **no**: drifting
  motion next to a focused field is a genuine usability cost, not ambience.
- **`pointer-events: none`** and a low `z-index` so it can never intercept a tap.
- Keep to transform/opacity only (compositor-friendly); cap the element count; pause when the
  tab is hidden if it ever shows up on battery profiling.
- **Value: MID-HIGH.** Cheap, delightful, very "premium-tier"-feeling per unit of effort — but
  it decorates rather than differentiates the way (a) does.

### (c) Themed functional components — clock-face style
**Blocked on a carrier, not on difficulty.** Flat Tomato's themed clock works because the timer
*is* the app's central object. We have **no equivalent surface yet**: our timer tasks are a
minutes input plus a log list, not a rendered clock. There is currently nothing to re-skin.

- **Deferred, explicitly linked to the in-app timer feature** (ROADMAP "Future → Expanded timer
  check-in: count-up & countdown"). If/when a real count-up / countdown UI lands, *that* becomes
  the carrier and this item unblocks; a themed timer face would then be the single highest-impact
  decoration we could ship.
- Until then: **do not build.** Re-skinning a text input is not a themed component.

## Tiering hook — decoration completeness sets the price

This gives the premium tier a defensible, non-arbitrary ladder (extends the D12 grill note on
pricing, where a bare theme sits at 300):

| Tier | Contents | Indicative price |
|---|---|---|
| **Color theme** | tokens only (= sakura v2 today) | **300** |
| **Full theme** | tokens + illustration set (a) + ambient effect (b) | **~500** |
| *(later)* | + themed functional component (c) | above 500, once a carrier exists |

The useful property: the tiers map to **real production cost** (art hours), not to invented
scarcity — so the price difference is honest, and the ceiling rises naturally as art lands.

## Recommendation

1. **(b) petals first** — self-contained, no external dependency, immediately demonstrates the
   decoration layer and validates the tier story.
2. **(a) art in parallel, asset-paced** — start with one motif set for sakura; it gates the
   first genuine "full theme".
3. **(c) leave closed** until the timer feature exists.

Tracked in ROADMAP as **"Sakura v2.5 — petals + hand-drawn accents (pending CP's art assets)"**.
