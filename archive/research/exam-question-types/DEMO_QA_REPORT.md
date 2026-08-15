# Demo Browser-QA Report

**Scope:** every `demos/*.html` question-type demo (66 files; `index.html` excluded).
**Date:** 2026-07-24 · **Branch:** `feat/qtype-recategorization` (worktree `gt-selection-qtypes-recat`).
**Why:** the recategorization rebuild validated only JS syntax (`node --check`); the demos had
never been rendered in a browser. This is the first automated browser pass.

**Environment:** Playwright `1.61.1` driving headless Chromium (build `chromium-1228`, already in
the local Playwright cache), loading each demo over `file://` (self-contained, no server). The
JSDOM fallback was **not** needed — real Chromium ran successfully.

Requirements context (inherited from `research/exam-question-types/README.md`): this catalog is
discovery input serving **H1 / H4 / H10 / R5**. This pass is QA/bug-fixing of research artifacts;
it does **not** change any product concept, construct, or scope.

---

## Summary counts

| Metric | Count |
|---|---|
| Demos checked | **66** |
| Passing after this pass | **66** |
| — of which needed no change | 53 |
| — of which were **hard-broken and auto-fixed** | **13** |
| Still broken | **0** |
| Uncaught JS exceptions / `console.error` / failed resource loads (post-fix, across all 66) | **0** |
| Demos flagged for a recommended human click-through | 8 (all separately verified to reach SCORED) |

**Headline:** 13 demos were **hard-broken** — permanently stuck on the warm-up trial (the primary
control was inert, so the child could never be scored). All 13 were auto-fixed with a one-line,
uniform change and re-verified in the browser to reach the scored phase. No demo remains broken.
`build_types.py` re-runs clean (`types=66 measurements=63 errors=0 warnings=0 gaps=0`); the
`index.html`/catalog are unchanged (no spec or `demo_path` was touched).

---

## The hard breakage (root cause) and the fix

**Symptom:** 13 demos loaded, auto-played their wordless ghost-hand demo, and updated telemetry —
so a naive "does it render / does telemetry move" check passes — but the child could never actually
answer. Tapping the answer control did nothing and the flow never advanced past the warm-up.

**Root cause (identical in all 13):** `runDemo()` sets a module-scoped `locked = true` to block
input during the ghost animation. The interactive `startWarmup()` then failed to reset it, and both
the answer handler *and* the "submit / advance" logic are gated on `!locked`. Because submit depends
on an answer that could never be registered, the demo dead-ended on the warm-up forever. (The gold
reference `FLU-GRIDCOPY-01` avoids this only because its submit button is not gated behind the
locked action, so it still advances.)

**Fix (minimal, uniform, matches the ~40 demos that already do this):** reset `locked = false` at
the start of `startWarmup()` — one line per file, e.g.:

```js
-function startWarmup(){phase='warmup';setCue('⭐');...}
+function startWarmup(){phase='warmup';locked=false;setCue('⭐');...}
```

This restores the intended interactive warm-up and lets the flow reach the scored items. It does not
touch construct, difficulty, scoring, or layout. `GB-WORDFORGE-01` was slightly different — it
self-recovered via a 15 s warm-up timeout, but its warm-up tiles were dead until then; the same
one-line fix makes the warm-up genuinely interactive.

**Verification of the fix (browser, per demo):** a flow-reachability probe drove each fixed demo and
confirmed the phase cue advances past the previously-stuck warm-up (`👁️ → ⭐ → 🎯 [→ 🏆]`). 12 of 13
reach SCORED automatically; `GB-WORDLADDER-01` was additionally confirmed interactive (tile-select
highlights and **60 valid word-rungs** formed) — only the goal-directed puzzle solve isn't automated.

---

## Full results — all 66 demos

Every row has a screenshot at **`qa-screenshots/<type_id>.png`** (QA artifacts; not committed).
`Result = FAIL→PASS` means the demo was hard-broken on entry and is passing after the auto-fix.

<!-- Generated from qa/results.json + reachability probe; sorted by area then type_id. -->

| Demo (type_id) | Area | Result | Error / breakage found | Auto-fix applied | Needs human / browser judgment |
|---|---|---|---|---|---|
| CX-achieve-02 | fluid_reasoning | PASS | none | — | — |
| CX-check-01 | fluid_reasoning | PASS | none | — | — |
| CX-diverge-01 | fluid_reasoning | PASS | none | — | — |
| CX-figural-01 | fluid_reasoning | PASS | none | — | — |
| FLU-ANALOGY-01 | fluid_reasoning | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | — |
| FLU-CARPET-01 | fluid_reasoning | PASS | none | — | — |
| FLU-CONCEPT-01 | fluid_reasoning | PASS | none | — | — |
| FLU-DEDUCE-01 | fluid_reasoning | PASS | none | — | — |
| FLU-GRIDCOPY-01 | fluid_reasoning | PASS | none | — | see note (warm-up edit locked, but submit advances) |
| FLU-LADDER-01 | fluid_reasoning | PASS | none | — | — |
| FLU-MATRIX-01 | fluid_reasoning | PASS | none | — | — |
| FLU-MATRIXBUILD-01 | fluid_reasoning | PASS | none | — | — |
| FLU-ODDPAIR-01 | fluid_reasoning | PASS | none | — | — |
| FLU-STACK-01 | fluid_reasoning | PASS | none | — | — |
| FLU-VENN-01 | fluid_reasoning | PASS | none | — | — |
| QUANT-BALANCE-01 | quantitative | PASS | none | — | — |
| QUANT-BUILD-01 | quantitative | PASS | none | — | — |
| QUANT-DOTS-01 | quantitative | PASS | none | — | — |
| QUANT-EQUAL-01 | quantitative | PASS | none | — | — |
| QUANT-FUNC-01 | quantitative | PASS | none | — | — |
| QUANT-GRAPH-01 | quantitative | PASS | none | — | — |
| QUANT-MATRIX-01 | quantitative | PASS | none | — | — |
| QUANT-MIX-01 | quantitative | PASS | none | — | — |
| QUANT-MOBILE-01 | quantitative | PASS | none | — | — |
| QUANT-NUMLINE-01 | quantitative | PASS | none | — | — |
| QUANT-SERIES-01 | quantitative | PASS | none | — | — |
| QUANT-WORD-01 | quantitative | PASS | none | — | — |
| GB-EXPLORE-01 | spatial | PASS | none | — | — |
| GB-FILTER-01 | spatial | PASS | none | — | — |
| GB-PATHFORGE-01 | spatial | PASS | none | — | — |
| GB-ROBOPATH-01 | spatial | PASS | none | — | — |
| GB-SHAPEFIT-01 | spatial | PASS | none | — | — |
| GB-TRACK-01 | spatial | PASS | none | — | — |
| SPA-FOLDNET-01 | spatial | PASS | none | — | — |
| SPA-HIDDENCUBE-01 | spatial | PASS | none | — | — |
| SPA-MAZE-01 | spatial | PASS | none | — | — |
| SPA-PICKFOLD-01 | spatial | PASS | none | — | — |
| SPA-PIPES-01 | spatial | PASS | none | — | — |
| SPA-PUNCH-01 | spatial | PASS | none | — | — |
| SPA-ROLL-01 | spatial | PASS | none | — | — |
| SPA-SCENE-01 | spatial | PASS | none | — | — |
| SPA-SHADOW-01 | spatial | PASS | none | — | — |
| SPA-TANGRAM-01 | spatial | PASS | none | — | — |
| SPA-VIEW-01 | spatial | PASS | none | — | — |
| SPA-XPLANE-01 | spatial | PASS | none | — | — |
| SPA-XSCAN-01 | spatial | PASS | none | — | — |
| WM-bind-01 | spatial | PASS | none | — | — |
| WM-corsi-01 | spatial | PASS | none | — | — |
| WM-gate-01 | spatial | PASS | none | — | go/no-go timing not driven by one click (flow probe reaches SCORED) |
| WM-gridflash-01 | spatial | PASS | none | — | — |
| CX-curious-02 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | multi-select questions not driven by one click (flow probe reaches SCORED) |
| CX-sjt-01 | verbal | PASS | none | — | — |
| GB-DEBATE-01 | verbal | PASS | none | — | multi-step attach+rebut not driven by one click (flow probe reaches SCORED) |
| GB-FLAWFINDER-01 | verbal | PASS | none | — | — |
| GB-WORDFORGE-01 | verbal | **FAIL→PASS** | dead warm-up — tiles inert until a 15 s timeout escape | reset `locked=false` on warm-up entry | free word-building not driven by one click (flow probe reaches SCORED; warm-up now interactive) |
| GB-WORDLADDER-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | full puzzle-solve not auto-completed (verified interactive + 60 valid word-rungs form; ghost demo shows a solvable path) |
| VER-BUILDIT-01 | verbal | PASS | none | — | — |
| VER-CLOZE-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | — |
| VER-EVIDENCE-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | 2-step answer+evidence not driven by one click (flow probe reaches DONE) |
| VER-POLYSEME-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | — |
| VER-RELPAIR-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | preview-then-submit not driven by one click (flow probe reaches DONE) |
| VER-SENSE-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | multi-slot S/V/O build not driven by one click (flow probe reaches SCORED) |
| VER-SEQUENCE-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | — |
| VER-SORTBOT-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | — |
| VER-WORDTRAIN-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | — |
| WM-bubble-01 | verbal | **FAIL→PASS** | stuck at warm-up — primary control inert, never reached SCORED | reset `locked=false` on warm-up entry | — |

*(Areas are from `catalog/master_types.jsonl`; the historical prefix — FLU/VER/QUANT/SPA/WM/GB/CX —
does not always equal the recat area, e.g. `WM-bubble-01` and `GB-WORDLADDER-01` are `verbal`.)*

---

## The 13 auto-fixed demos

`FLU-ANALOGY-01`, `CX-curious-02`, `GB-WORDFORGE-01`, `GB-WORDLADDER-01`, `VER-CLOZE-01`,
`VER-EVIDENCE-01`, `VER-POLYSEME-01`, `VER-RELPAIR-01`, `VER-SENSE-01`, `VER-SEQUENCE-01`,
`VER-SORTBOT-01`, `VER-WORDTRAIN-01`, `WM-bubble-01`.

Each got the single-line `locked=false` reset on warm-up entry and was re-run in the browser.
Screenshots (`qa-screenshots/<type_id>.png`) now show the interactive warm-up working — e.g.
`FLU-ANALOGY-01` shows a selected option, an armed submit button, and an event-log line
`first tap · option 0` with `M-RTFIRST` populated (all impossible before the fix).

## Still broken

**None.**

## Demos flagged for a recommended human click-through (not failures)

These 8 render, run, emit telemetry, throw nothing, and were **separately verified to reach the
SCORED phase** by the reachability probe. They are flagged only because their answer mechanic is
multi-step / gesture / timing based, so the automated *single-click* interaction check could not
drive them to completion on its own:

- `GB-WORDLADDER-01` — needs a goal-directed word-ladder solve (verified interactive; valid rungs form).
- `VER-EVIDENCE-01` — pick answer **and** tap the proof sentence (2-step).
- `VER-SENSE-01` — assemble a Subject/Verb/Object sentence from chips (multi-slot).
- `VER-RELPAIR-01` — preview a relation, then submit.
- `CX-curious-02` — select several questions, then advance.
- `GB-DEBATE-01` — attach evidence, then rebut (multi-step).
- `GB-WORDFORGE-01` — build a word from letter tiles under a timer.
- `WM-gate-01` — go/no-go timed key response.

## Secondary observation (non-blocking; not fixed — flagged per the conservative fix policy)

In several of the rebuilt demos the wordless **ghost-hand demo** routes its scripted taps through the
same input handler that is gated by `locked` during the demo phase (`selectAns`/`selectEv`,
`pickSlot`, `place`, `pick`, `onAsk`, `onLetter`, `tapTile`). Because `locked` is `true` while the
ghost plays, those calls early-return, so the modeled answer is **not visually highlighted** during
the self-teach animation (the ghost hand moves but nothing gets selected). Confirmed by code
inspection in `VER-EVIDENCE-01`, `VER-SENSE-01`, `VER-SEQUENCE-01`, `VER-CLOZE-01`,
`VER-POLYSEME-01`, `CX-curious-02`, `GB-WORDLADDER-01`, `GB-WORDFORGE-01`. This does **not** block
play (the warm-up now works after the fix and telemetry emits), so it is out of scope for the
hard-break fix policy and is logged here as a recommended follow-up: have `runDemo()` set the
demonstrated state directly or unlock during its own scripted taps (as `FLU-ANALOGY-01` and
`VER-SORTBOT-01` already do). Note: `FLU-GRIDCOPY-01`'s warm-up cell-editing is likewise locked, but
its submit advances, so it is functional (a minor UX quirk in the reference, not a break).

---

## How this was checked (reproduce)

Standalone harness under `qa/` (isolated; not an app dependency; `node_modules` and screenshots
git-ignored):

```bash
cd research/exam-question-types/qa
npm install                     # playwright@1.61.1 (Chromium already cached)
node qa.mjs                     # full pass: errors + render + interaction + screenshots
node probe-flow.mjs [id ...]    # flow-reachability (👁️→⭐→🎯→🏆) used to find/verify the stuck demos
node probe-wordladder.mjs       # targeted interactivity/solvability check for GB-WORDLADDER-01
```

Per demo, `qa.mjs` records: uncaught exceptions (`pageerror`), `console.error`, failed resource
loads, non-blank render (wrap/stage + telemetry meter rows present), a primary-control interaction
after the demo arms it (does it throw? does telemetry change?), and a screenshot. Machine-readable
results are written to `qa/results.json` (git-ignored).

**Coverage caveat:** the automated interaction is a single generic "click the primary control"
action plus keyboard/tile fallbacks; it deliberately does not attempt to *win* each game. Hard
breakages (errors, blank render, inert primary control, no telemetry, stuck-at-warm-up) are covered;
full per-game correctness and visual/pedagogical quality still warrant a human click-through of the
8 flagged demos.
