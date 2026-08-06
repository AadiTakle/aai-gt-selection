# Handoff: character-led stealth screeners (Loop A)

**Worktree:** `~/gt-loop-a` · **Branch:** `feat/apps-character-led` (off `origin/dev` at `d7cbeff`)
**Reserved:** API 5201, web 5210, `screener/apps/lab-character/`, `screener/data/lab-character/`
**Status at time of writing:** foundation complete and proven. No experiences built yet.

This document was started early and is appended as work proceeds, so it is useful even if the night
ends before the set does. Right now it is mostly findings, because that is what exists.

---

## 1. Honest state

The session loop runs end to end on the real banks, verified twice by driving the HTTP API directly.
The rendering foundation and the art-direction vocabulary are written. **No experience has been
built, the launcher does not exist, and the app does not boot** because `main.tsx` is not written
yet. Nothing in a launcher is broken, because there is no launcher.

What exists, all under `~/gt-loop-a`:

| Path | What it is | State |
|---|---|---|
| `screener/data/lab-character/banks/` | 8 symlinked bank files, the curated pool | done, verified |
| `screener/vite.lab-character.config.ts` | own config, port 5210, proxies `/api` + `/qbank` to 5201 | done, boots |
| `screener/package.json` | one added line, `lab:character` | done |
| `screener/apps/lab-character/index.html` | entry | done |
| `screener/apps/lab-character/shared/types.ts` | HTTP shapes + the `RendererProps` contract | done |
| `screener/apps/lab-character/shared/useScreenerSession.ts` | the session loop, iframe-free | done, not yet exercised from the browser |
| `screener/apps/lab-character/shared/glyphs.tsx` | `Skin`, `Glyph`, `Cluster`: the drawing vocabulary | done |
| `screener/apps/lab-character/shared/ItemStage.tsx` | typeCode to renderer registry | done, references 8 renderer modules that do not exist yet |
| `screener/apps/lab-character/renderers/` | per-type React renderers | **empty** |
| `screener/apps/lab-character/experiences/` | the worlds | **empty** |
| `Launcher.tsx`, `main.tsx`, `DEMO.md` | integration and demo path | **not written** |

Consequence worth stating plainly: `ItemStage.tsx` lazy-imports eight modules under `renderers/`
that are not there, so a typecheck will fail until they are. The tree is not currently in a
committable state and nothing has been committed yet.

---

## 2. The finding that changes the approach

The brief predicted that themes retint items but cannot change what an item depicts, so a world can
only ever be a colour scheme plus a wrapper. **That is true of the iframe path and false of the
bank.** The limitation is in the reference implementation's choice, not in the item data.

`packages/ui-contract/src/index.ts` states the bargain in its own header: "An item states what it
asks, what the choices are and how it is answered. It never states how any of that looks." The
prebuilt HTML renderers under `/qbank/items/*.html` are one answer to the "how it looks" question,
and `applyThemeToFrame` can only push CSS custom properties into that answer after the fact. Hence
crimson star, never dragon egg.

Reading `served.content` and drawing it yourself removes the ceiling completely. Verified against
real items:

- `FLU-MATRIX-01` → `matrix.cells` is a 2D array of `{shape,color,count,rot}`, options are
  `{key, tile:{...}}`. Nothing says "star" has to be drawn as a star.
- `QUANT-SERIES-01` → `terms:[{value:4},{value:3}...]`, `slotIndex`, options `{key, value}`.
- `QUANT-BALANCE-01` → `target:['cube','cube','cube']`, options `{key, load:[...]}`.
- `SPA-XFORM-01` → `grid:{rows,cols}`, `input.blocks:[1,2]`, options `{key, blocks:[8,11]}`.
- `FLU-OPCHAIN-01` → `input:{glyph,orient,shade,border,pair}`, `chain:['circle']`, options
  `{key, figure:{...}}`.

So the recommendation is the opposite of what was expected: **the theming API is not the thing to
extend.** Items are already headless enough to support arbitrary art direction. What is missing is
anything that helps an app draw them, which is entry 3.

---

## 3. Every scorable item is marked by a single option key

`packages/qbank/src/bank.ts`, `scoreResponse`:

```
expected  = record.answer.correctKey            // a string
candidate = response (if string) ?? response.key ?? response.selectedKey ?? response.value
correct   = candidate.trim().toUpperCase() === expected.trim().toUpperCase()
```

This is a much stronger guarantee than the brief implies, and it is what makes hand-drawing
tractable. There is no per-type response protocol to reimplement: for all 4,534 scorable items
across the full bank, answering is "return the key of the option you picked". A single option-picker
plus per-type stimulus drawing covers the entire scorable bank.

Two items of small print found while confirming it:

- `VER-RELPAIR-01` options carry **no `key`** (`{"pair":[{"text":"cat"},{"text":"paw"}]}`), so it
  cannot be marked and is correctly absent from every band's eligible list. Anything reasoning about
  "verbal types available" should not count it.
- `CX-check-01` reports 120 of 120 scorable but has **no `options` at all**: it is a manipulation
  task where tokens are moved between bins. It is not clear what string a host is meant to send.
  Excluded from this lab for that reason rather than by preference.

---

## 4. Handoff entries

### The session config cannot be restricted to a set of types

**Hit while building:** the renderer registry, before any experience
**What I wanted:** to say "this app can draw these eight types, only serve me those".
**What stopped me:** `QbankSessionConfig` in `packages/qbank/src/session.ts` is
`{abilityThreshold, precision, ageBand?, perDomainMinimum, recommendProbability}`. The pool is built
at construction from every scorable record in every loaded bank, filtered by `ageBand` alone
(`session.ts` line ~175). There is no type or domain allow-list, and the HTTP body exposes no more
than the internal type does. This matters because the library already has the other half of the
conversation: `ui-contract`'s `servableBy(profile)` tells you exactly which types an app can serve.
The two halves do not connect, so the answer cannot be fed to the session.
**What I did instead:** constrained the pool upstream instead of in the config. `packages/qbank/src/bank.ts`
line 19 reads `process.env.GT_QBANK_BANKS`, so the lab's own API instance is launched against a
curated directory of symlinks:

```
GT_QBANK_BANKS="$PWD/data/lab-character/banks" PORT=5201 \
  GT_SCREENER_DATA=./data/lab-character npx tsx apps/api/src/server.ts
```

`data/lab-character/banks/` holds 8 symlinks into `qbank-library/banks/`. The API then reports
`8 types, 1422 scorable of 1422 records` and the engine can only ever serve something drawable.
**Is the workaround throwaway?** No, and that is worth noting. Pointing an app at a curated bank
subset is legitimate deployment configuration, it needs no library change, and it is arguably the
right pattern for any embedded integration. What is throwaway is that it operates at the process
level: two apps in one process cannot have different pools, so this does not generalise to serving
two experiences with different type sets from one API.
**What the library would need:** `QbankSessionConfig.allowTypes?: readonly string[]` (or
`allowDomains`), applied in the pool filter beside the existing `ageBand` check. Roughly a
three-line change, and it would let `servableBy()`'s output be passed straight into a session, which
is the join the library is currently missing.

### Nothing helps an app draw an item, so every integrator redraws all 53 types

**Hit while building:** `shared/glyphs.tsx` and the renderer registry
**What I wanted:** a described-but-unstyled description of an item, so an app supplies art and not
geometry: "this is a 2x2 grid of tokens varying on shape; here are the four candidate tokens".
**What stopped me:** the content schemas are per-type and share no structure. Across the 53 banks,
the only common keys are `typeCode` and, on most, `options`. Compare `FLU-MATRIX-01`
(`matrix, activeRules, gridSize, options`) with `SPA-PUNCH-01`
(`folds, punches, foldedRegion, layerCount, grid`) with `WM-corsi-01` (`grid, span, responsePhase`)
with `GB-EXPLORE-01` (`fogRadius, blocked, landmarks, moveBudget`). `ui-contract` describes what UI
*capabilities* a type costs (`choiceList`, `gridLayout`, `orderedChannel` and fourteen more) but
carries nothing about the payload, so it can tell an app whether it may serve a type and not how.
The practical effect: an app wanting the whole bank writes 53 bespoke renderers, which is why the
prebuilt HTML frames exist and why every app that wants its own art direction is pushed back onto
retinting them.
**What I did instead:** picked 8 types whose payloads reduce to four drawable primitives (a shape
token, a count cluster, a grid of filled cells, a pile of named shapes), wrote one vocabulary for
those primitives in `shared/glyphs.tsx`, and accepted that the lab serves 8 of 53 types.
**Is the workaround throwaway?** The vocabulary is not; the 8-type ceiling is. Any world that wants
paper folding or a word ladder has to grow a renderer per type.
**What the library would need:** a normalised presentational descriptor per item, derived once by
whoever owns each generator rather than reverse-engineered per integrator. The minimum useful shape
is a discriminated union over the response element (`choiceList`, `multiSelect`, `reorderable`, ...)
carrying the stimulus as a small set of abstract tokens with named varying attributes. That is a
real piece of design work, and it is the difference between "an app can be skinned" and "an app can
be authored".

### A K-1 session is thin enough that the interval should be shown, not the point estimate

**Hit while building:** measuring what a K-1 session actually produces, before designing for it
**What I wanted:** to know whether the shortest session supports any claim, since the brief
explicitly asks for this to be reported rather than papered over.
**What stopped me:** nothing stopped me; the numbers are just thin. Driving `precisionIndex: 0`
(`Taster`, 4 to 6 items) at `ageBand: 'K-1'` on the curated pool, seed 4242:

```
poolSize 288, served 4, stopReason confident-below
perDomain  { quantitative: 2, verbal: 0, spatial: 1, fluid: 1 }
estimate   -1.457   interval [-2.8, -0.05]
```

That interval is **2.75 logits wide**, and one of the four domains got a single item while another
got none. For contrast, `precisionIndex: 2` at `6-8` served 8 items and still returned
`[-2.1, 0.2]`, 2.3 logits. Both stopped on `confident-below`, which is the cheap direction to be
confident in: the precision ladder asks for 0.6 confidence above the line and 0.9 below at step 0,
so a run of wrong answers ends it fast.
**What I did instead:** nothing yet, since no experience is built. The design intent this creates is
that a K-1 experience must not display a number. There is a defensible reading available from four
items, which is "nothing here suggests a ceiling worth chasing", and there is an indefensible one,
which is "your child is at -1.46".
**Is the workaround throwaway?** N/A.
**What the library would need:** nothing. This is a measurement fact and the engine is reporting it
honestly. The risk is entirely on the presentation side, and it is the one the brief flags: a
confident result off four items is worse than no result because it will be believed.

### There is no verbal item a K-1 session can be given

**Hit while building:** choosing the curated pool
**What I wanted:** four-domain coverage at every band, because `perDomainMinimum` implies it and the
final pass asks for the domain spread per experience.
**What stopped me:** at `ageBand: 'K-1'` the full bank offers **9 scorable types: 4 fluid, 4
quantitative, 1 spatial, 0 verbal.** The verbal types either exclude K-1 or are unscorable
(`VER-RELPAIR-01`, above). So `perDomain.verbal` is structurally 0 for the youngest band no matter
what an app does. This happens to match the brief's own guidance to avoid reading-heavy verbal types
at K-1, so it is not a defect, but it does mean a "spread across four domains" claim is not
available there. Note the engine handles it gracefully: `session.ts` tolerates a domain with no pool
rather than waiting forever for its minimum, which is why these sessions terminate at all.
**What I did instead:** accepted three-domain coverage at K-1. My curated pool is also verbal-free
at every band (3 fluid, 4 quantitative, 1 spatial), which is a limitation of my selection rather
than of the bank: `VER-EVIDENCE-01`, `VER-MORPHO-01` and `GB-FLAWFINDER-01` are scorable at 2-3 and
up and could be drawn with more time.
**Is the workaround throwaway?** Yes for the older bands, no for K-1.
**What the library would need:** for K-1, verbal items that do not require reading, which is an
item-authoring job rather than a code change. Worth confirming it is a deliberate gap.

### Pause, resume and replay are not exposed, though the engine could support them

**Hit while building:** designing the session loop, where every one of these worlds wants to be left
and returned to
**What I wanted:** a child abandons a session and comes back to their creature later.
**What stopped me:** the qbank surface is `POST /bank/sessions`, `GET /next`, `POST /answer`,
`GET /debug`. There is no resume, no replay and no way to rehydrate. `apps/api/src/server.ts` holds
live sessions in an in-memory `Map` (line ~26), so a server restart drops everything in flight.
Interestingly the code comments that the *screener* engine is "deterministic given its seed, so an
interrupted session is replayable rather than lost" and that the appended record is the source of
truth, which suggests the capability exists conceptually and simply has no endpoint on the qbank
path. I have not verified whether replaying a qbank session from its seed plus answer log
reconstructs state exactly.
**What I did instead:** nothing. No experience persists anything; a reload starts over.
**Is the workaround throwaway?** N/A, the feature is absent rather than worked around.
**What the library would need:** either `POST /bank/sessions/:id/resume` returning current state, or
a documented guarantee that `{seed, config, answers[]}` replays deterministically, which would let
an app own persistence itself. The second is cheaper and probably more useful.

### Types deliberately avoided, and why

Recorded because the brief asks for it specifically.

- `CX-check-01` — scorable but optionless, a bin-sorting manipulation. No obvious response string.
- `VER-RELPAIR-01` — options carry no key, unmarkable.
- `SPA-PUNCH-01`, `SPA-FOLDNET-01`, `SPA-TANGRAM-01`, `SPA-XSCAN-01` and the rest of the spatial
  family — drawable in principle and genuinely good items, but each needs bespoke geometry
  (fold-and-unfold reflection, net folding, shape packing). Time, not suitability.
- `WM-*` — require `timedReveal` and a reproduction phase. A themed shell can carry these well, but
  the timing contract is the risky part to hand-roll.
- `QUANT-DOTS-01` — **kept**, and worth flagging: it carries `exposureMs: 1200`, so it is the one
  curated type with a timing requirement. If it renders badly under a world's animation it should be
  the first dropped.

---

## 5. What I built

Nothing demo-ready yet. Table retained in the required shape so it can be filled as experiences land.

| Experience | Band | Route | Items served | Domain spread (q/v/s/f) | Reached a result | Passed final pass |
|---|---|---|---|---|---|---|
| Hatchling | K-1 | launcher card 1 | 4, over 32+ sampled runs | 2 / 0 / 1 / 1 | yes, no number shown | partly, see below |
| Night Clinic | 2-3 | launcher card 2 | 6 | 2 / 0 / 1 / 3 | yes, dawn ending | partly |
| Ship's Navigator | 4-5 | launcher card 3 | 8, plus 2 leg reports | 2 / 0 / 1 / 5 | yes, arrival | partly |
| The Rival | 6-8 | launcher card 4 | 8, over 3 runs | 2 / 0 / 1 / 5 | yes, rival concedes | partly |

"Partly" is deliberate and should not be read as a pass. Each world was driven end to end by the
worker that built it, at the viewport for its band, with screenshots reviewed and the error and
reduced-motion paths exercised. What has NOT been done is the eight-check pass of section 5 run by a
second pair of eyes from a cold start, including the two-runs-through check and a console audit per
world. The counts above are each world's own measurement, not an independent one.

VERBAL IS ZERO EVERYWHERE, and that is structural rather than an oversight. The curated pool holds no
verbal type, so no world can report four-domain coverage. At K-1 the bank itself has no scorable
verbal item at all. Any claim resting on a four-domain spread is unavailable from this set.

### Where the theming landed, honestly

The mechanism works and is verified: all 8 of 8 renderers route every item mark through
`Glyph`/`Cluster`, none contains a colour literal, and the same bank item demonstrably renders as
different objects per world (162 comparison screenshots under `shots/skin-*`).

How strongly it reads varies a lot by world, and the gap is worth knowing before demoing:

- **Hatchling is the strongest.** Its marks are genuinely redrawn: a kite has a tail, a hexagon is a
  comb cell with honey in it, a star is a flower with a honey middle, the balance weights are eggs.
  Nothing on that panel looks like a shape from a test.
- **The Rival is the weakest**, notwithstanding its own report. Its marks are the geometric
  primitives with small cutouts and notches added, so the panel reads as tinted geometry rather than
  the engraved creature marks it describes. The world *around* the question is excellent and
  strongly directed; the question itself is only lightly dressed.
- Night Clinic and Navigator sit between the two.

Second gap on the same panel: the renderer's own prompt ("Which piece finishes the pattern?") renders
identically in every world, in the same weight and face. It is the one piece of text that breaks the
illusion, and it is also the thing a K-1 child would have to read.

Reference measurements from driving the API directly, so the numbers above have something to be
compared against when they exist:

| Band | precisionIndex | poolSize | Items served | Domain spread | Estimate | Interval | Stop reason |
|---|---|---|---|---|---|---|---|
| K-1 | 0 (Taster) | 288 | 4 | q2 / v0 / s1 / f1 | -1.457 | [-2.8, -0.05] | confident-below |
| 6-8 | 2 (Standard) | 576 | 8 | q2 / v0 / s1 / f5 | -0.864 | [-2.1, 0.2] | confident-below |

Both runs answered "first option every time", so the ability estimates are artefacts of a fixed
strategy and only the counts and intervals should be read.

---

## 6. Environment notes for whoever picks this up

Two processes are running and neither is owned by a worker:

```
# API, curated pool, port 5201
cd ~/gt-loop-a/screener
GT_QBANK_BANKS="$PWD/data/lab-character/banks" PORT=5201 \
  GT_SCREENER_DATA=./data/lab-character npx tsx apps/api/src/server.ts

# web, port 5210
cd ~/gt-loop-a/screener && npm run lab:character
```

The `GT_QBANK_BANKS` variable is load-bearing. Without it the API loads all 53 banks and the engine
will serve types this lab cannot draw.

`precisionSteps` as reported by `GET /api/bank`, since the indices are otherwise opaque:

| Index | Label | Items | Confidence above / below |
|---|---|---|---|
| 0 | Taster | 4-6 | 0.60 / 0.90 |
| 1 | Short | 6-10 | 0.68 / 0.94 |
| 2 | Standard | 8-16 | 0.75 / 0.97 |
| 3 | Careful | 12-24 | 0.82 / 0.98 |
| 4 | Thorough | 20-40 | 0.90 / 0.99 |
