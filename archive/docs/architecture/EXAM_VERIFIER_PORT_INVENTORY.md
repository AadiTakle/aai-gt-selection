# Porting the per-type answer verifiers to plpgsql — inventory

What each of the 31 per-type verifiers in `apps/web/src/lib/exam/verifiers/` reads, what it
compares, what it emits, and what porting it to plpgsql will cost. This is the planning
document for the remaining work after D-027's foundation landed; it is an inventory, not a
specification, and nothing in it changes what any verifier decides.

Companions: decision **D-027** (`docs/governance/DECISION_LOG.md`), evidence **E-081**
(`docs/research/ASSUMPTIONS_AND_EVIDENCE.md`), the migration
`supabase/migrations/20260725170000_exam_verify_plpgsql.sql`, and the differential harness
`pnpm exam:verify:diff`.

Born-synthetic throughout (`synthetic_only = true`, `validated = false`).

## 1. Where the port stands

| | count |
|---|---|
| Per-type verifiers in the app tier | 31 |
| …of which served (`CX-achieve-02` is blocked by `qa/NOT_SERVABLE.json`) | 30 |
| Ported to plpgsql and agreeing with the app tier | **4** |
| Remaining | 27 (26 served + the blocked one) |
| Generic verifiers (`verifyKeyed`, `verifyPlacementTolerance`, `verifyConstructedValue`) | 3 of 3 ported |

Measured by `pnpm exam:verify:diff` over 63 served types × 12 bank items × 3 responses
(correct / wrong / skipped) = 2,268 cases:

| database verifier | cases agreeing with the app tier |
|---|---|
| `app.exam_score_response` (demoted, what shipped before D-027) | 1,659 / 2,268 |
| `app.exam_verify_response` (D-027) | **1,989 / 2,268** |

Every remaining disagreement is an unported per-type verifier. All 33 generic-verifier types
and all 4 ported types agree on every case, including the metric maps.

## 2. How to read the difficulty rating

- **easy** — one comparison over one or two fields; a single plpgsql function under ~40 lines.
- **moderate** — a replay, a set comparison, or a small induction; array or `jsonb` looping,
  but no search and no floating-point geometry.
- **awkward** — a search over a generated space, a graph traversal, floating-point geometry,
  or an input the database does not currently hold.

The four already ported are marked ✅. Each was picked as the awkward shape in its domain, so
the ratings below are calibrated against work that has actually been done rather than
guessed at.

## 3. fluid_reasoning (4 verifiers, 1 ported)

| type | reads | comparison | metrics | port |
|---|---|---|---|---|
| ✅ **FLU-CONCEPT-01** | `content.varyDims`, `content.gateOracle[].figure/.accepts`, `content.probes[].key/.figure`; `answer.correctKey` (fallback) | enumerate every conjunctive rule of arity 1..min(3, dims−1) with one atom per dimension, keep those reproducing the whole oracle, require them to agree on all probes; that string is the key | `M-POLY`, `M-HYP` | **awkward — done.** ~230 lines: recursive combination generation unrolls into three bounded loops, and `M-HYP` needs sequential state (the viable set shrinks test by test). |
| ✅ **CX-check-01** | `content.bins[].key/.pattern`, `content.tokens[].id/.text/.bin`; `answer.trueBin` (fallback) | canonicalise each tile's text to a repetition signature (`NGG` → `ABB`), take the one bin whose pattern is that signature, require every tile to end there | `M-POLY`, `M-ERRTYPE` | **moderate — done.** `app.exam_verify_check_twice`. The signature is a per-character first-occurrence relabelling — a small character loop with a seen-map. Everything else is map lookups. `M-ERRTYPE` needs a second pass over `tokens[].bin` to count planted slips. |
| ✅ **FLU-MATRIXBUILD-01** | `content.gridSize`, `content.constructedAttributes[]`, `content.matrix.cells[][]`, `content.matrix.blank.row/.col`; `answer.canonical` (fallback) | per attribute, induce the blank cell from the visible cells under five rules (constant row, constant column, Latin-square gap, constant arithmetic delta, row sum / row difference), require a unique prediction, compare normalised | `M-POLY`, `M-RULEID` (full credit only) | **moderate — done.** `app.exam_verify_matrix_build`. Five independent inductions over an n×n grid, all array work. The `count` attribute normalises through `parseInt`, ported as `app.exam_vmatrix_parseint`. JavaScript maps an unreadable numeric cell to `NaN`, which is *not* equal to itself; Postgres considers `NaN` equal to itself, so the port carries SQL NULL in that slot instead and the arithmetic rules cannot fire on a cell they could not read. |
| ✅ **FLU-GRIDCOPY-01** | `content.probeInput`, `content.examples[].input/.output`, `content.paletteSize`; `answer.targetGrid` (fallback) | build the op-grammar program space (8 shifts + 3 reflections/rotations + every recolour pair + every colour-shift, then **every ordered pair** of those), keep programs consistent with all worked examples, require one predicted probe output, then exact grid equality | `M-POLY` | **awkward — done.** The space is \|single\|²: 29 singles at the bank's largest palette, so 870 programs, each of which the TypeScript re-runs from the original grid over every example. The port enumerates the same space and prunes nothing; the one change is that each two-op program's first stage is computed once per outer op instead of once per pair, which halves the work (1.27s vs 2.61s over the whole 120-item bank) and cannot change a result, because the ops are pure functions of the grid. `app.exam_vgridcopy_target_unpruned` is the un-memoised transcription and the two agree on all 120 bank items and on every palette size in `supabase/tests/124_exam_verify_awkward_batch.test.sql`. |

`CX-achieve-02` also has a verifier and is counted in the 31, but is **blocked from serving**
by `research/exam-question-types/qa/NOT_SERVABLE.json` (E-076: `content.apparatus` ships the
closed-form outcome model, so the key is recoverable with zero trials). Domain
`fluid_reasoning`. It reads `content.factors[].levels[].value`, `content.apparatus.base/
.weights/.interaction`, `content.conclusion.options[].key/.setting/.askFactorPick`,
`content.scenario.direction`; it evaluates the apparatus over every conclusion option and
takes the extremum, plus the widest-weight-span factor at depth 2; emits `M-POLY`. Rated
**moderate**, but **do not port it until the leak is resolved** — porting it would create a
second implementation of exactly the exploit, and it can never be reached from a session while
the block stands.

## 4. verbal (7 verifiers, 1 ported)

| type | reads | comparison | metrics | port |
|---|---|---|---|---|
| ✅ **VER-EVIDENCE-01** | `provenance.derivation.premise/.conclusion/.sentenceFacts/.optionClaims`, `provenance.levers.depthRank`, `scoring.creditWeights.answer/.evidence`; `answer.correctKey` (`"B+s1"`, fallback) | re-derive both halves independently — the one sentence whose facts assert the premise, the one option whose claim is the conclusion — then weight them by the item's own credit weights | `M-POLY`, `M-INFDEPTH` (full credit only) | **awkward — done.** ~90 lines. The compound key is the easy part; what made it awkward is that it is the only verifier reading `provenance`, and it is the one that proved the database already holds that input. |
| ✅ **CX-curious-02** | `content.gapOptions[].id`; `answer.evidenceModel.gapOptions[].id/.support`, `answer.correctKey` (fallback) | the single gap option whose evidence support is `unknown`; string equality on `response.gapKey` | none | **easy — done.** ~45 lines. Emits no metrics in either direction, which is itself the contract: the questions the child asks are counted elsewhere and are never right or wrong. |
| ✅ **GB-DEBATE-01** | `answer.correctKey.support/.rebut` (an **object**, not a scalar) | both decisions must land; one of two is partial progress | `M-PROG` | **easy — done.** ~30 lines, the shortest of the 31. The only reason it needs a per-type verifier at all is that `correctKey` is an object, which the generic keyed verifier cannot read. |
| ✅ **VER-SENSE-01** | `content.cards[].text`, `provenance.derivation.trueOrder[]`; `answer.correctKey` (`"2,0,1"`, fallback) | map the derivation's true word order back to card indices, require a strict permutation match | `M-POLY` (adjacent-pair credit) | **moderate — done.** `app.exam_verify_sense`. The order comparison is trivial; `M-POLY` is the proportion of the target's adjacent pairs the child reproduced consecutively, which needs an index-of lookup per pair. Second reader of `provenance`. |
| ✅ **WM-bubble-01** | `content.n`, `content.channels[].id/.stream[]`, `content.streamLength`; response `pops[]`, `stepsShown` | n-back targets re-derived from the stream (`stream[i] === stream[i−n]`), scored only over steps actually shown, full credit needs the whole stream administered | `M-POLY`, `M-DPRIME`, `M-FALSEALARM` | **moderate — done.** ~120 lines. Two nested loops over channels and steps plus a `channel:step` pop set, and the SDT channels stay on separate metric ids. The step counter is `double precision`, not an integer, because the TypeScript loop indexes the stream with whatever `content.n` holds. Reproduces §8 item 2 as written. |
| ✅ **GB-WORDFORGE-01** | `answer.validWords[].word/.band`, `answer.referenceTarget`; response `submissions[]` | credit each distinct submission present in the enumerated valid-word set (case-insensitive); full credit is a **threshold** (`>= referenceTarget`), not "produced one word" | `M-IDEAFLU`, `M-VOCABLVL`, `M-EFF` | **moderate — done.** `app.exam_verify_wordforge`. Set membership with upper-casing; the whole valid-word set is already in `answer`, so no lexicon is needed. Carries §8.3's fail-closed behaviour on a missing `referenceTarget` unchanged, pinned by `supabase/tests/124`. |
| ✅ **GB-WORDLADDER-01** | `content.start`, `content.goal`, `content.wordLength`, `content.stepLimit`; `answer.optimalRungs`; **and a 4,091-word child lexicon, now `app.exam_lexicon`** | the ladder must start at `start`, end at `goal`, change exactly one letter per rung, and every rung must be a real lexicon word | `M-VOCABLVL`, `M-EFF` | **awkward — done, after the input moved into the database.** The verifier itself is short; what blocked it was the lexicon, which is now a server-only table seeded by migration under D-027's authority (§6, evidence E-092). A missing or empty lexicon fails closed, as `childLexicon()` returning null does. |

## 5. spatial (18 verifiers, 1 ported) and quantitative (1 verifier, 1 ported)

`quantitative` has exactly one per-type verifier, so QUANT-MIX-01 is that domain's hardest by
construction.

| type | domain | reads | comparison | metrics | port |
|---|---|---|---|---|---|
| ✅ **QUANT-MIX-01** | quantitative | `content.targetBowl.A/.B`, `content.workBowl`, `content.constraint.kind/.row/.total`, `content.limits.maxPerIngredient`; response `counts.A/.B` | `counts.A * targetBowl.B = counts.B * targetBowl.A` with both counts > 0, AND the served constraint holds (`given_row`: the locked row still equals the served amount; `fixed_total`: the counts sum to capacity) | `M-PAE` | **moderate — done.** ~70 lines. The care is in the early returns: several failure paths emit no metrics at all, and the harness compares the metric map, not just the boolean. |
| ✅ **SPA-XPLANE-01** | spatial | `content.solid.verts/.faces`, `content.planeModel.*`, `content.controls.tilt/.twist/.startPlane`; `answer.targetSignature`, `answer.vertexCount`, `answer.shapeToleranceRms`; response `plane.h/.t/.w` | derive the plane from the dials, clip every face, chain the cut segments into a loop, project into the plane's right-handed frame, compare by cyclic-shift-minimised Procrustes RMS | `M-POLY` (raw distance), `M-MIRRORFA` | **awkward — done.** ~330 lines and the single hardest of the 31. See §7 on float parity. |
| ✅ **SPA-VIEW-01** | spatial | `content.optionKind`; `answer.correctHeadingDeg`, `answer.toleranceDeg`, `answer.correctKey`, `answer.mirrorFoilKey` | two shells in one bank, decided per item: a keyed viewpoint pick, or a **circular** heading comparison (`wrap180`) within tolerance | `M-VIEWANG`, `M-MIRRORFA` | **easy — done.** ~50 lines. The circular fold routes its remainder through `numeric`, because Postgres has no `%` for `double precision` and the obvious `x − 360·trunc(x/360)` misfolds an argument within one ulp of a multiple of 360. |
| ✅ **SPA-HIDDENCUBE-01** | spatial | `content.stack.rows/.cols/.maxHeight/.layers[][]`, `content.view.canonicalYawDeg`; `answer.correctCount` / `answer.correctKey` | recount the distinct in-bounds occupied cells and compare to `response.count` | `M-VIEWANG` | **easy — done.** ~90 lines. The popcount is the easy half; the care is that `M-VIEWANG` is emitted even when the count itself cannot be graded, and that the second fallback is JavaScript `Number(answer.correctKey)`, not a plain cast. |
| ✅ **GB-FILTER-01** | spatial | `content.grid.R/.C`, `content.cue.color/.shape/.mode`, `content.items[].r/.c/.color/.shape` | re-apply the cue to the displayed array (colour, or colour AND shape on a conjunction level); the selected set must equal the target set exactly | `M-FALSEALARM`, `M-PROG`, `M-EFF` | **easy — done.** ~110 lines. One filter and two set sizes, but `M-FALSEALARM` is emitted on a zero-target board while `M-PROG` and `M-EFF` are not, and an unreadable `selectedCells` emits nothing at all. |
| ✅ **GB-TRACK-01** | spatial | `content.jarCount`, `content.motion.phases[].swaps[]`, `content.initialTargets[]`; `answer.cost.taps` | apply each phase's swaps as one **simultaneous** permutation, invert to slots, compare the sorted selected set | `M-PROG` (set overlap), `M-EFF` | **moderate — done.** `app.exam_verify_track`. The simultaneity matters: the swaps in one phase must be applied against a snapshot, not sequentially. No bank item currently has two swaps sharing a slot in one phase, so the harness cannot tell the two readings apart; `supabase/tests/124` carries a fixture that can. |
| ✅ **WM-corsi-01** | spatial | `content.presentation.schedule[].onsetMs/.cell`, `content.mode`; `answer.expectedSequence` (fallback) | replay the flash schedule in onset order, reverse it on a backward trial, then **strictly positional** credit; full credit also needs equal length | `M-POLY`, `M-PROG` | **moderate — done.** ~80 lines. The sort must be STABLE — `Array#sort` is, and a bare `order by onsetMs` is not — so the port breaks ties on the schedule's own index. |
| ✅ **WM-bind-01** | spatial | `content.presentation.schedule[].onsetMs/.creatureId/.cell`; `answer.bindings` (fallback) | replay into a creature → house map (a later showing legitimately overwrites), then **order-free** credit per creature | `M-POLY` | **moderate — done.** ~95 lines. Same stable replay as corsi with map semantics instead of positional; a `jsonb` object gives the overwrite and the key-uniqueness for free. |
| ✅ **WM-gridflash-01** | spatial | `content.presentation.array[].cell/.hue`, `content.responsePhase.mode/.probe.cell/.hue`, `content.grid.cellCount`; `answer.correctKey`, `answer.expectedCells` | two shells: re-derive SAME/CHANGED from the probed cell's flashed hue, or compare the selected cell set to the flashed set | `M-DPRIME`, `M-FALSEALARM`, `M-POLY` | **moderate — done.** ~150 lines. The branch that matters is which SDT channel is emitted, and the port keeps them apart: a miss reports `M-DPRIME` alone and a false alarm `M-FALSEALARM` alone, pinned by assertions 31–32 of pgTAP test 130. |
| ✅ **WM-gate-01** | spatial | `content.shell`, `content.palette[].key/.family`, `content.presentation.events[]`, `content.presentation.probes[].afterEventIndex/.probeIndex/.k`, `content.responsePhase.probePlan[].askedFamilies`; `answer.probes` (fallback) | replay the parade event by event and answer every checkpoint from scratch under one of three shells (last-k keys, most-recent-of-each-asked-family, running total); every checkpoint scored positionally and summed | `M-POLY`, `M-UPDATECOST` | **awkward — done.** Three shells in one verifier, a checkpoint schedule interleaved with the event stream, and `M-UPDATECOST` is an **OLS slope** of per-checkpoint score on that checkpoint's k — omitted, not zeroed, when k does not vary. The slope can be negative, so `app.exam_vround4` does the rounding. `history.slice(-k)` had to be ported under ECMAScript's own rules rather than as "the last k": a k of 0 takes the whole history. |
| ✅ **SPA-SCENE-01** | spatial | `content.scene.objects[].id/.x/.y`, `content.scene.robot.x/.y`, `content.question.requireNearest`; `answer.correctOrder` (fallback) | sort objects left-to-right as seen from the robot by a cross-product comparator, require an exact order match (plus the nearest card when asked) | `M-POLY` (concordant pairs), `M-MIRRORFA` | **moderate — done.** `app.exam_verify_scene`. `order by` cannot express a comparator, so the port is a stable insertion sort (`app.exam_vscene_order`) applying the same cross product — stability matters because JavaScript's `Array.prototype.sort` is specified stable. The pair-concordance metric is an O(n²) double loop. |
| ✅ **SPA-MAZE-01** | spatial | `content.start`, `content.goal`, `content.openEdges[]` (pre-serialised strings), `content.gems[]`; `answer.optimalLength` | the submitted route must be a legal walk — 4-adjacent, through an open edge — from start to goal visiting every gem | `M-EFF` | **moderate — done.** `app.exam_verify_maze`. No search: the child submits the path and the server replays it. The edge key is rebuilt in the same canonical order through `app.exam_vjsstring`, so a float coordinate stringifies the way JavaScript would. Note this file's `efficiency`/`clamp01` is **not** the one `quantitative.ts` uses; both are ported separately. |
| ✅ **GB-ROBOPATH-01** | spatial | `content.grid`, `content.start.r/.c/.h`, `content.door`, `content.walls[]`, `content.keys[]`, `content.instructionSet.repeat.maxReps`, `content.limits.maxProgramTokens`; `answer.cost.actions` | expand the submitted turtle program and RUN it; a bump on a wall or edge aborts; must step on every key and stop on the door | `M-EFF` | **moderate — done.** `app.exam_verify_robopath`. A straight interpreter loop over three commands. The care is in the asymmetry the harness checks: a bump returns a verdict with *no* metrics, a completed run carries `M-EFF`. |
| ✅ **GB-EXPLORE-01** | spatial | `content.grid`, `content.home`, `content.blocked[]`, `content.landmarks[].id/.r/.c`; `answer.optimalTotalMoves` | replay `response.actions` step by step (each 4-adjacent, in bounds, unblocked); must stand on every landmark and finish at home | `M-EFF`, `M-VIEWANG` | **moderate — done.** `app.exam_verify_explore`. `M-VIEWANG` needs `atan2` per pointing and a circular mean-error; see the note in §7 about `atan2` parity. JavaScript's `%` on doubles is `fmod`, which Postgres has no float8 operator for, so the port writes it out as `x - trunc(x / y) * y`; every argument lands in a range where that subtraction is exact. Carries §8.4's client-reported move count in the fallback branch unchanged, pinned by `supabase/tests/124`. |
| ✅ **SPA-PIPES-01** | spatial | `content.grid.R/.C`, `content.tiles[].r/.c/.dirs[]`, `content.start`, `content.goal`, `content.gems[]`; `answer.optimalRot` | every submitted tile must be a genuine rotation of the served tile, then flood-fill over matching arms from car to flag through every gem | `M-EFF` | **moderate — done.** Uses the shared `app.exam_vgrid_bfs_reach`, a multi-source flood over a 4-connected grid driven by a caller-supplied per-edge passability array; the pipe rule is "both cells present the arm facing the other". The §8.5 W/E port bug is reproduced, and pinned by an assertion so neither side can be quietly fixed alone. |
| ✅ **GB-PATHFORGE-01** | spatial | `content.grid`, `content.start`, `content.goal`, `content.blocked[]`, `content.coins[]`, `content.tileBudget`; `answer.optimalTiles` | reject illegal boards (tile on a wall, on a port, stacked), then flood from the hut through matching arms; must reach the flag over every coin | `M-EFF` | **moderate — done.** The same `app.exam_vgrid_bfs_reach` with an extra legality pass and omnidirectional ports. Its hut may sit off the board and the TypeScript still spreads from it, which is why the helper takes a seed MASK rather than a single start cell. |
| ✅ **SPA-PUNCH-01** | spatial | `content.grid.n`, `content.folds[].op`, `content.punches[].x/.y` | replay the folds recording each crease, then walk the creases backwards mirroring every point found so far; the marked set must equal the resulting hole set exactly | `M-POLY` (Jaccard), `M-MIRRORFA` | **awkward — done.** Six crease cases including two oblique ones, and the additions of each crease are collected against a snapshot of the point set and merged afterwards, as the TypeScript does. |
| ✅ **SPA-TANGRAM-01** | spatial | `content.target.cells[]` (3-tuples), `content.tray[].id/.offsets[]`; `answer.optimalPlacements` | every placement must be a rotation of its tray shape, inside the outline, non-overlapping, and together they must cover every target cell | `M-POLY`, `M-EFF` | **awkward — done.** The trap is that this type keys cells two different ways and they must not be confused: a *shape* signature is normalised to its own minimum corner (right for comparing a piece against its tray shape) while a *cell* key is the raw coordinate triple (right for locating it on the board). Using the normalised form for both makes every placement miss the outline, which the harness caught as `M-POLY = 0`. |
| ✅ **GB-SHAPEFIT-01** | spatial | `content.target.cells[]`, `content.tray[].id/.cells[]`, `content.instructionSet.ops[]`; `answer.cost.moves` | exact cover: each placement must be a tray piece in an orientation the item's own op set can reach (rotate and/or flip), no reuse, no overlap, full coverage | `M-EFF` | **awkward — done.** Same orientation-closure machinery as TANGRAM plus mirroring, and ported alongside it. The two differ in one way that had to be preserved: TANGRAM accumulates illegality in a flag and still returns its metrics, whereas SHAPEFIT returns `{correct:false}` with none. |

## 6. The one input the database did not have — resolved

**GB-WORDLADDER-01 could not be ported as written.** Its verifier decides whether a rung is a
real word by reading `research/exam-question-types/generators/lexicon-child-en.mjs` off disk
and regex-parsing the JavaScript source into a 4,091-entry word → vocabulary-band map. That
file is not a bank field: it is not in `content`, not in `answer`, not in `scoring`, not in
`provenance`, and therefore not in `app.exam_item`. Everything else in the 31 is reachable —
`api.exam_register_item` already carries `content`, the whole `answer` block, `scoring` and
`provenance` into the row, which VER-EVIDENCE-01's port proves by using `provenance`.

Nor is it derivable from the item, which was worth checking before accepting a schema change:
`answer` holds one optimal ladder (`optimalPath`) and a count of equally short ones
(`shortestLadderCount`), never the words some *other* legal ladder may step through — and a
longer legal ladder is explicitly correct for partial credit, so those words matter.

Three options were open, and they were not equivalent:

1. **Load the lexicon into a server-only table** (`app.exam_lexicon(word, band)`, ~4k rows,
   revoked from every client role like `exam_item.answer_key`). Faithful, and the lexicon
   stays as unreachable from a browser as it is today. Costs a data-loading step that must be
   re-run when the lexicon changes, which is the same objection
   `20260725160000_exam_item_registration.sql` raised against bulk-loading the banks.
2. **Enumerate the legal ladder words into `answer`** at generation time, the way
   GB-WORDFORGE-01 already ships `answer.validWords`. Self-contained per item and needs no new
   table — but it is a bank regeneration, which is out of scope here and touches
   `research/`, and it enlarges every item.
3. **Leave GB-WORDLADDER-01 on the app tier** and accept one type where the database is not
   the authority. Cheapest, and the least honest: it reopens exactly the split D-027 closes.

**The owner chose (1)**, under D-027's existing authority rather than as a new decision: (3)
reopens the split D-027 closes and (2) is a bank regeneration. It landed in
`supabase/migrations/20260725183000_exam_verify_awkward_batch.sql` §8 and is recorded as
evidence **E-092**.

What the table costs, and what pays for it:

- **Posture.** `app.exam_lexicon` sits in the `app` schema no client role holds USAGE on, with
  every privilege revoked from public, anon, authenticated and service_role, SELECT granted
  only to `api_executor`, and row-level security enabled *and forced* behind one
  `api_executor` read policy — so a future blanket grant cannot open it. No word or band
  appears in any `api.*` return value. `supabase/tests/124_exam_verify_awkward_batch.test.sql`
  asserts all of that, including a runtime 42501 for anon and authenticated, and asserts the
  table is non-empty so none of it can pass vacuously.
- **Drift**, which is the real objection to a second copy, is guarded twice. The migration
  recomputes the source module's own `lexiconHash()` — sha1 over `WORD:BAND` in word order,
  first 16 digits — over the rows it inserted and refuses to apply unless it is
  `428d7d7227fbf5cd`, which is also the hash every GB-WORDLADDER-01 bank item records in
  `answer.equivalence.lexiconHash`; and
  `apps/web/src/lib/exam/verifiers/lexicon-parity.test.ts` re-parses the source file with the
  app tier's own reader and compares it entry for entry against the migration's seed. Editing
  the source without re-seeding fails the unit suite rather than splitting the two tiers
  quietly. Neither guard prevents someone from changing both together, which is the point:
  they make the second copy visible, not immutable.

**CX-achieve-02 remains the only unported verifier**, and deliberately: it is blocked from
serving by E-076 and porting it would create a second implementation of the exploit.

## 7. Float parity, and what the harness actually asserts

Both sides compute in IEEE-754 binary64 (`double precision` is the same format as a JavaScript
`number`) and the ports apply the operations in the same order, so most results are
bit-identical. Three primitives are not guaranteed to be:

- `Math.hypot` scales its arguments to avoid overflow; the port uses `sqrt(x*x + y*y + z*z)`.
- `Math.atan2` and `**` may round differently from Postgres's `atan2` and multiplication.

These feed continuous metrics (`M-POLY` on SPA-XPLANE-01 carries a raw shape distance;
`M-VIEWANG` on GB-EXPLORE-01 a mean angular error), never a boolean directly, and they are
orders of magnitude below the items' own tolerances. The harness therefore compares `correct`
**exactly** and float metrics to 1e-9, and says so. On the 12 real SPA-XPLANE-01 bank items
sampled, no metric differed by more than that tolerance.

## 8. Reported, not fixed

Things found while reading the 31 that look wrong. **None of them were changed**: each is a
scoring-semantics question for the owner, and D-027 explicitly does not renegotiate a verdict.

1. **`M-POLY` carries opposite directions across types.** Almost everywhere it is a 0..1
   proportion where higher is better. On SPA-XPLANE-01 it is a raw shape distance where
   *lower* is better and the range is unbounded. `packages/exam-scoring` positions a child
   within an accuracy bracket using metrics, so one metric id meaning two opposite things is
   a live hazard, not a cosmetic one. The port reproduces it faithfully.
2. **`verifyBubble` makes a zero-target n-back block unpassable.** `correct` requires
   `targets > 0`, so a legitimate stream that happens to contain no n-back repeat scores the
   child wrong no matter what they do. Probably unreachable given how the banks are generated,
   but it is a correctness rule, not a guard.
3. **`verifyWordforge` scores every child wrong when `answer.referenceTarget` is absent.**
   `correct: target !== null && credited.size >= target` fails closed on a missing threshold
   rather than falling back to "produced at least one valid word".
4. **`verifyExplore` trusts a client-reported number in its fallback branch.** When
   `response.actions` is absent it takes the move count from `response.cost.actual`, which the
   renderer computed. That feeds `M-EFF` only, not correctness, but it contradicts the rule
   stated at the top of the same file ("never by trusting a count, flag or digest the client
   computed for itself").
5. **`verifyPipes` hardcodes the port directions** (`start` must expose a `W` arm, `goal` an
   `E` arm). Correct for every current bank item; it would silently fail correct children if a
   future item placed the car or flag elsewhere.

## 9. Suggested split for the remaining 27

Grouped so that workers who share machinery share a branch, and ordered by what unblocks the
most coverage per unit of risk.

| batch | types | why together |
|---|---|---|
| A — easy keyed shapes | CX-curious-02, GB-DEBATE-01, SPA-VIEW-01, SPA-HIDDENCUBE-01, GB-FILTER-01 | five short verifiers, no shared machinery, safe to do in one pass |
| B — schedule replay | WM-corsi-01, WM-bind-01, WM-gridflash-01, WM-gate-01, WM-bubble-01 | all replay a presentation schedule and all emit SDT or polytomous metrics; one shared set of helpers |
| C — grid walks and floods | SPA-MAZE-01, GB-ROBOPATH-01, GB-EXPLORE-01, SPA-PIPES-01, GB-PATHFORGE-01, GB-TRACK-01 | one BFS/queue helper and one cell-key helper serve all six |
| D — shape covers | SPA-TANGRAM-01, GB-SHAPEFIT-01, SPA-PUNCH-01 | shape normalisation and orientation closure are the same problem twice, and PUNCH's reverse unfold is the same order-sensitive care |
| E — inductions | FLU-MATRIXBUILD-01, CX-check-01, VER-SENSE-01, SPA-SCENE-01, GB-WORDFORGE-01 | each re-derives an expected answer from the stimulus; independent of each other |
| F — needs a decision first | GB-WORDLADDER-01 (§6), CX-achieve-02 (blocked, do not port) | do not start these without the owner |
| G — the expensive one | FLU-GRIDCOPY-01 | program-space search; give it its own branch and its own performance budget |

Every batch's definition of done is the same: the new `app.exam_verify_*` function, one row in
`app.exam_verifier_registry` in the batch's own additive migration, and `pnpm exam:verify:diff`
showing the type move from PENDING to `ok` with `BOTH-OK` greater than zero.

## 10. Reconciliation after the question-type review (2026-07-29)

Everything above predates the reviewer pass in `docs/product/QUESTION_IMPROVEMENT_PLAN.md`, which
retired 15 wired types and changed the scoring contract of four survivors. Two consequences for the
port, both measured with `pnpm exam:verify:diff` against a freshly reset local database:

**Retired types are gone from both tiers.** Eight of them had a plpgsql verifier and a registry row;
`supabase/migrations/20260729190000_exam_verify_retire_types.sql` deletes the rows and drops the
functions, leaving 22 registry rows. The batches in §9 above still name retired types
(`CX-curious-02`, `GB-DEBATE-01`, `GB-FILTER-01`, `GB-SHAPEFIT-01`, `WM-gate-01`,
`WM-gridflash-01`, `FLU-MATRIXBUILD-01`, `GB-PATHFORGE-01`) — those entries are dead and the batches
shrink accordingly. §9 is left as written because it is the record of how the work was planned.

**Four already-ported verifiers now disagree with the app tier, and this is new.** Before the review
every disagreement was an *unported* verifier; these four are ported and diverged because the review
changed the app-tier rule and the plpgsql side was not changed with it:

| type | why the two tiers now disagree |
|---|---|
| `GB-WORDFORGE-01` | the app tier now penalises a declared non-word and emits `M-ERRTYPE`; the port emits neither |
| `GB-WORDLADDER-01` | free-text entry changed how `M-VOCABLVL` is derived |
| `SPA-PIPES-01` | the app tier now handles multiple endpoints and T-branches; the port assumes one endpoint |
| `SPA-SCENE-01` | the app tier now models walls and windows; the port has no occlusion model |

Whole run after the review: **1,656 / 1,728 cases agree across all 48 served types** — generic
verifiers 864/864, ported per-type 744/792. `VER-SEQUENCE-01` is PENDING: the drag-and-drop rewrite
accepts orderings the database's keyed default rejects.

This matters beyond tidiness, because per D-029 the database verifies each raw answer against the
key it holds when persistence is enabled. The child's score still comes from the app tier and
`@gt-selection/exam-scoring` output is stored verbatim, so no child is mis-scored by this — but the
persisted per-response trace disagrees with it for those four types, which corrupts the trace as a
research and audit record. Re-porting them is the fix; `SPA-SCENE-01`'s visibility model is
"awkward" by the §6 rating and should be budgeted as such.
