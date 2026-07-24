# Category Map — Recategorization + Rebuild (RES-013)

Authoritative keep/cut/merge decisions and per-type change-specs for the
question-type recategorization. This file drives Phase-1 pruning and the
Phase-2 build fleet. Serves **R5, R11, H1, H4, H10**; reflects decision
**D-015** (Timeback-fit target, fully automated classification, snappy/adaptive)
and **D-016**. Born-synthetic research artifact under work-item **RES-013**.

> Precedence note: where this file and the plan
> (`question-type_recategorization_rebuild`) agree, this file is the working
> build spec. It cannot override the charter, PRD, or a ratified decision.

## 1. Four testable domains (the only `areas`)

`build_types.py` `AREAS` collapses from seven to **four**:

| domain key | prefix | what it measures |
|---|---|---|
| `fluid_reasoning` | `FLU` (+ folded `CX` creativity) | novel rule induction, relational/analogical/deductive reasoning, figural/creative divergent reasoning |
| `verbal` | `VER` (+ folded `GB`/`WM`/`CX`) | language reasoning, semantic relations, comprehension/evidence, reasoning-in-context |
| `quantitative` | `QUANT` (**greenfield**) | number sense, pattern/series, proportional & functional reasoning, systems — no knowledge barrier |
| `spatial` | `SPA` (+ folded `GB`/`WM`) | mental rotation, folding, cross-section, perspective, path-planning, **and dedicated visuospatial working-memory games** |

### Cross-cutting signals (NOT domains)

- **Working memory** — no longer an area. Dedicated WM games move **under
  `spatial`** (they are visuospatial span/updating tasks). WM load remains a
  *measured signal* (`M-WM-*`/updating measures) inside many types.
- **Processing speed** — no longer an area. **Pending `PS_GAMEBASED_WARRANT.md`.**
  Speed is a cross-cutting, engagement-gated efficiency signal
  (`M-RT`/`M-COMBO`/`M-SPEEDACC` behind `M-ENGAGE`), not a construct. If the
  warrant keeps a minimal probe it is folded into a domain with hotkeys.
- **Game-based** — a *delivery layer*, not a category. Every kept `GB-*` type
  folds into the domain of the construct it actually measures.
- **Creativity / curiosity** (`CX-*`) — folds into `fluid_reasoning` (figural /
  divergent) or `verbal` (question-asking / reasoning-in-context). Human-judged
  and self-report `CX` types are cut (see metric redesign).

## 2. Keep / cut summary

Base: **251** types. **Keep 54** existing types (+ greenfield quant + optional
young-verbal + optional PS). Everything else is **cut** (spec + demo deleted).

| domain | kept existing | source prefixes |
|---|---|---|
| fluid_reasoning | 15 | 11 FLU + 4 CX |
| verbal | 16 | 9 VER + 4 GB + 1 WM + 2 CX |
| spatial | 23 | 13 SPA + 3 GB + 7 WM/GB-WM |
| quantitative | 0 kept → **greenfield rebuild** | — |
| processing_speed | 0 → pending warrant | — |
| **total kept** | **54** | + new quant/verbal/PS |

## 3. KEEP list with target domain + change-spec

### 3.1 Fluid / Nonverbal (`fluid_reasoning`, 15)

Cross-type demo rule: **unique symbols/colors/patterns; exactly one unambiguous
correct answer** (not all the same circle/square/diamond/star).

| type_id | name | change-spec |
|---|---|---|
| `FLU-ANALOGY-01` | Shape Morph | Keep; **escalate difficulty as it goes** (more co-transforms, subtler morph rules). |
| `FLU-GRIDCOPY-01` | Copy the Change | **Keep as-is** (flagged "incredible"). Only add telemetry panel parity + difficulty spectrum. |
| `FLU-CARPET-01` | Pattern Carpet | Keep; add difficulty spectrum + escalation. |
| `FLU-MATRIX-01` | Machine Matrix | Keep (the "proven matrix"); reference model for figural matrices. |
| `FLU-MATRIXBUILD-01` | Build the Tile | Keep; **innovate further** (construct the missing tile from parts, more rule dims). |
| `FLU-STACK-01` | Stack the Panel | Keep; **harder overlays** (more layers, transparency/XOR combine). |
| `FLU-VENN-01` | Double Match | Keep; **fewer elements** (reduce clutter; sharpen the 2-attribute intersection). |
| `FLU-CONCEPT-01` | Mystery Gate | **Clearer buttons; combination gating rule for harder levels; capture reasoning-process signal** (planful/random/grounded → `M-PLANFUL`). |
| `FLU-ODDPAIR-01` | Odd Pair Out | **Add a difficulty spectrum** (adaptivity gate before approval). |
| `FLU-LADDER-01` | Ranking Ladder | **Add a difficulty spectrum** (adaptivity gate before approval). |
| `FLU-DEDUCE-01` | Clue Detective | **Tighten vague clues** (one unambiguous deduction path). |
| `CX-achieve-02` | Investigation Station | Fold→fluid. **Add animations + video-style demo, physics-sim intuition** (hypothesis-testing reasoning). |
| `CX-figural-01` | Squiggle Studio | Fold→fluid. **Rework: one squiggle + list of valid interpretations; score by choice + order** (auto originality/flexibility). |
| `CX-check-01` | Check It Twice | Fold→fluid. **Rework: abstract open-ended categorization, no pictures, submit-when-best** (systematic verification). |
| `CX-diverge-01` | Brainstorm Blaster | Fold→fluid. **Drop tap; keep type-field; automate metrics** (fluency/flexibility/originality via response bank). |

### 3.2 Verbal (`verbal`, 16 + young-verbal)

| type_id | name | change-spec |
|---|---|---|
| `VER-CLOZE-01` | Fill the Gap | Keep; **SAT-style at high difficulty** (nuanced connotation/logic gaps). |
| `VER-EVIDENCE-01` | Proof Hunt | **Rework to SAT passage + evidence; reuse passages** across items. |
| `VER-POLYSEME-01` | Two Meanings | Keep; define concrete difficulty levers (rarer senses, subtler bridges). |
| `VER-RELPAIR-01` | Relation Match | Keep; define adaptability ceilings (abstract relations). |
| `VER-WORDTRAIN-01` | Word Train | Keep (**younger only**). |
| `VER-SEQUENCE-01` | Story Order | Keep; **vaguer at higher difficulty** (fewer explicit cohesion cues). |
| `VER-SENSE-01` | Sentence Sense | **Rework to open-ended "how many valid sentences from this word bank"** with a constrained finite word-grammar auto-check (feasibility-scoped). |
| `VER-SORTBOT-01` | Sorting Robot | **Rework to words + test-and-see accept/reject mechanic** (induce the hidden category rule). |
| `VER-BUILDIT-01` | Build-It Buddy | **Rework to logic-grid word riddles** (negatives, contradictions, "impossible" option). |
| `GB-WORDFORGE-01` | Word Forge | Fold→verbal. Keep mechanic; wire automated telemetry. |
| `GB-WORDLADDER-01` | Letter Climb | Fold→verbal. Keep; difficulty spectrum. |
| `GB-DEBATE-01` | Claim Duel | Fold→verbal. **Clearer support-vs-counter + interface.** |
| `GB-FLAWFINDER-01` | Fib Finder | Fold→verbal. **Strict item-quality filter** (unambiguous flaw). |
| `WM-bubble-01` | Bubble Pop Memory | Fold→verbal. **Rework to Human-Benchmark seen/not-seen with words** (verbal recognition memory). |
| `CX-curious-02` | Question Quest | Fold→verbal. **Ask-questions + new emoji→words association variant.** |
| `CX-sjt-01` | What Would You Do? | Fold→verbal as **reasoning-in-context** (auto-scored best-move, no human judge). |
| **NEW** young-verbal | (1–2 new) | **Add 1–2 new image/word-association types** so verbal has ≥3 at K-1 and 2-3. |

### 3.3 Spatial (`spatial`, 23) — heavy 3D reworks

3D via **inlined WebGL / a lightweight vendored three.js** so demos stay
self-contained double-click HTML. Add clear controls/hotkeys.

| type_id | name | change-spec |
|---|---|---|
| `SPA-HIDDENCUBE-01` | X-Ray Cubes | **Keep.** Telemetry parity + difficulty spectrum. |
| `SPA-ROLL-01` | Rolling Cube | **Final-face-only; show-then-hide faces; step-through roll; highlight the asked face.** 3D. |
| `SPA-PICKFOLD-01` | Which Fold Made It? | **Multi-fold sequences; side-demo feeds metrics.** 3D. |
| `SPA-PUNCH-01` | Fold & Punch | **Multi-fold; animate folds; no back-stepping.** 3D. |
| `SPA-XPLANE-01` | Place the Slice | **Simplify to slice-plane + object.** 3D. |
| `SPA-XSCAN-01` | Scan Stacker | **Smooth cross-section slider + options; angled/abstract at high difficulty.** 3D. |
| `SPA-TANGRAM-01` | Shape-Fill Form Board | **Red-herring pieces, then 3D.** |
| `SPA-SCENE-01` | What the Robot Sees | **3D fixed POV + robot in scene.** |
| `SPA-VIEW-01` | What Do They See | **3D reversal** (pick the viewer given the view). |
| `SPA-SHADOW-01` | Shadow Play | **Fixed-perspective 3D** (predict the cast shadow). |
| `SPA-MAZE-01` | Plan-the-Path | **Multiple paths so it tests, not just solves** (optimal-path selection). |
| `SPA-FOLDNET-01` | Fold-the-Net | **Rework into a testable 3D net→solid choice** (or merge into a 3D X-Ray variant). |
| `SPA-PIPES-01` | Path Connect | Keep as the **single connection-planning type**; dedupe other path/pipe variants. |
| `GB-PATHFORGE-01` | Path Forge | Fold→spatial. **Rotation buttons** (orient the path). |
| `GB-ROBOPATH-01` | Path Coder | Fold→spatial. **Brilliant intro-coding style** (sequence commands). |
| `GB-SHAPEFIT-01` | Shape Smith | Fold→spatial. **Drag-drop; multiple pieces.** |
| `WM-corsi-01` | Firefly Trail | Fold→spatial (WM signal). Corsi spatial span. |
| `WM-gridflash-01` | Star Grid | Fold→spatial. Simultaneous visuospatial span / change detection. |
| `WM-bind-01` | Home Again | Fold→spatial. Object-location binding. |
| `GB-EXPLORE-01` | Explorer's Map | Fold→spatial. **Box positions + shortest-way-home; arrow controls; no glow; absorb `GB-MAZE-01` Gem Trail as a harder mode.** |
| `GB-FILTER-01` | Star Filter | Fold→spatial. **Human-Benchmark ramp** (visual span with distractors). |
| `GB-TRACK-01` | Firefly Jars | Fold→spatial. **Speed/count/switch adaptivity** (multiple-object tracking). |
| `WM-gate-01` | Gatekeeper | Fold→spatial. **Order or count, Mario-Party style** (running span/updating). |

### 3.4 Quantitative (`quantitative`) — GREENFIELD

All 25 current `QUANT-*` and quant `GB-*` types are **cut** ("no good ones").
Design NEW adaptive, no-knowledge-barrier types; **≥3 per age band**. Families:

- number-pattern / series
- interactive graph reasoning (one type spanning algebra→calculus concepts)
- systems via balance / mobile
- function machines (input→output rule induction)
- number-line / magnitude
- proportional reasoning

Marked evolving pending the director conversation. See `SPECS_QUANT.md`
(design notes) — built in the quant-specs wave.

## 4. CUT list (spec + demo deleted)

**Fluid cut (11):** `FLU-CLUB-01`, `FLU-COPYCAT-01` (broken, dup of Shape Morph),
`FLU-CORNERS-01` (merge intent→Matrix/Build-the-Tile), `FLU-FAMILYSORT-01`,
`FLU-INOUT-01`, `FLU-LATIN-01`, `FLU-MATRIXFLAW-01`, `FLU-MORPHMAKE-01`,
`FLU-ODDBALL-01`, `FLU-PAIRUP-01`, `FLU-RULEGATE-01`, `FLU-RULEPICK-01`,
`FLU-SERIES-01`, `FLU-SERIESORDER-01`, `FLU-TWINODD-01`.

**Verbal cut:** `VER-CHAIN-01`, `VER-CLASSIFY-01`, `VER-DIRECTIONS-01`,
`VER-FINISH-01`, `VER-OPPOSITE-01`, `VER-PICANALOGY-01`, `VER-REALSILLY-01`,
`VER-RECVOCAB-01`, `VER-RIDDLE-01`, `VER-SHADES-01`, `VER-SILLY-01`,
`VER-SIMON-01`, `VER-STORYQUEST-01`, `VER-UMBRELLA-01`, `VER-WORDLINK-01`,
`VER-WORDPAIRS-01`, `VER-WORDWEB-01`, `VER-ZOOMIN-01`.

**Quantitative cut (all 25):** every `QUANT-*` (greenfield replaces them).

**Spatial cut:** `SPA-BDSPEED-01`, `SPA-BLOCKS-01`, `SPA-BOTPATH-01`,
`SPA-BUILD-01`, `SPA-CROSS-01`, `SPA-FOLDOVER-01`, `SPA-FOLDSILH-01`,
`SPA-GAZE-01`, `SPA-HIDESEE-01`, `SPA-KOHS-01`, `SPA-MARBLE-01`,
`SPA-MIRRORFOLD-01`, `SPA-PIECE-01`, `SPA-ROADMAP-01`, `SPA-ROTATE-01`,
`SPA-ROTMAP-01`, `SPA-ROTPAIR-01`, `SPA-SNAPVIEW-01`, `SPA-VIEWS-01`.

**Working-memory cut (all except the 4 folded→spatial/verbal keepers):** every
`WM-*` except `WM-corsi-01`, `WM-gridflash-01`, `WM-bind-01`, `WM-gate-01`
(→spatial) and `WM-bubble-01` (→verbal). Includes cut of `WM-cardswitch-01`
Rule Swap ("better DCCS exist").

**Processing-speed:** all `PS-*` cut now, **pending warrant**. If the warrant
recommends keep-minimal, restore `PS-BLINK-06`, `PS-DEADLINE-01`,
`PS-DECODE-03`, `PS-DIFFSPOT-01` from git and add hotkeys.

**Game-based cut (not folded):** every `GB-*` except the 7 folded keepers
(`GB-WORDFORGE-01`, `GB-WORDLADDER-01`, `GB-DEBATE-01`, `GB-FLAWFINDER-01`
→verbal; `GB-PATHFORGE-01`, `GB-ROBOPATH-01`, `GB-SHAPEFIT-01`,
`GB-EXPLORE-01`, `GB-FILTER-01`, `GB-TRACK-01` →spatial). `GB-MAZE-01`
absorbed into `GB-EXPLORE-01`.

**Complementary/creativity cut (all except the 6 folded keepers):** every
`CX-*` except `CX-achieve-02`, `CX-figural-01`, `CX-check-01`, `CX-diverge-01`
(→fluid), `CX-curious-02`, `CX-sjt-01` (→verbal). All human-judged/self-report
`CX` types (`CX-report-01`, `CX-persist-01`, `CX-delay-01`, `CX-effort-01`,
`CX-diligence-01`, `CX-freeplay-01`, etc.) are cut per the automated-only
metric redesign.

## 5. Phase-2 cross-type build requirements

Every rebuilt demo must:

1. Stay a **self-contained single-file** `demos/<type_id>.html` (double-click).
2. Show the wordless **<10s self-teach** demo + one unscored warm-up.
3. Add a **difficulty spectrum + escalation** (adaptivity: escalate to ceiling).
4. Include an **automated live telemetry panel** logging the type's
   measurements (per the redesigned `measurements.json`) — **no human judge**.
5. Fluid/nonverbal items: **unique symbols/colors**, one unambiguous answer.
6. 3D spatial: inlined WebGL / vendored minimal three.js; clear controls + hotkeys.
7. Speed demos (if PS survives): **hotkeys** for every response.
8. Re-tag `topics_techniques_covered` to the type's **full content range** so
   coverage re-baselines against `TOPICS_BY_AREA.md`.
