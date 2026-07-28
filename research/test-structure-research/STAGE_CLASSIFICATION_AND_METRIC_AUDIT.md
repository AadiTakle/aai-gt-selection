# Stage-1 (Standing) vs Stage-2 (Learning-Rate): Type Classification + Metric-Audit Map

**Status:** Design analysis for the two-regime ("two-stage") screener demo. Grounded in the *real* question bank (`research/exam-question-types/`) and its metric framework — **not** a ratified requirement. Born-synthetic (D-006, R9, RES-013); serves the R11 screener design and reflects D-015 (Timeback-fit target) / D-016. Claim labels: **[V]** verified in the cited framework/literature, **[I]** reasoned inference, **[A]** open assumption to validate.

## 0. Why the current demo split is wrong (the correction)
The `feat/exam-two-stage-demo` prototype splits by **render kind** — `single-select` → Stage 1, `embedded-demo` → Stage 2 — and uses **invented placeholder items** (`FLU-STAND-L02`, …), not the real bank. That's an implementation proxy, not a measurement decision. The right split is by **what each type actually measures**, which the bank already encodes per type in two fields:

- `measurements`: the metric IDs the type collects (from `measurements.json` / `MEASUREMENTS.md`).
- `adaptive.works_well`: `high` = a clean difficulty ladder that escalates to a ceiling; `low` = an open/divergent task with no single right-answer ladder.

## 1. The organizing principle (already in `METRIC_FRAMEWORK.md`)
The framework's rollup (§5) already produces **two separate outputs**, and they line up exactly with your two stages:

| Stage | Question it answers | Primary output | Workhorse metric |
|---|---|---|---|
| **Stage 1 — STANDING** | "What can the child already do?" (accuracy at their edge) | per-domain **IRT θ** → gifted-tail classifier | **`M-DIFFREACH`** (escalate to ceiling) + `M-ACC` |
| **Stage 2 — LEARNING-RATE / EFFORT** | "How fast do they climb a *novel* ladder, and how do they work?" | **Timeback-fit index** (kept *distinct* from θ) | **`M-LEARNRATE`** (within-session growth) + process/effort |

**Key design fact [V]:** the framework explicitly keeps the Timeback-fit index *separate* from the ability θ and warns it is a *screening hypothesis, not a will-benefit claim*. That separation is the backbone of both the stage split and the audit (§4): a Stage-2 signal must **never** silently inflate the Stage-1 ability score.

## 2. Type classification (all 54 kept types + greenfield quant)

Legend: **S1** = Standing/accuracy (feeds θ) · **S2** = Learning-rate/effort (feeds Timeback-fit) · **DUAL** = has both a clean key/ceiling *and* rich process/growth telemetry, so it can seed either stage by configuration.

### 2.1 Fluid reasoning (15)
| type | ww | stage | why (the signal) |
|---|---|---|---|
| `FLU-MATRIX-01` Machine Matrix | high | **S1** | M-ACC + **M-DIFFREACH** + M-ERRTYPE; the proven figural-matrix ceiling probe |
| `FLU-CARPET-01` Pattern Carpet | high | **S1** | M-ACC + **M-DIFFREACH** + M-CONSIST (series induction) |
| `FLU-STACK-01` Stack the Panel | high | **S1** | M-ACC + M-RULEID + **M-DIFFREACH** (logical-combination ceiling) |
| `FLU-ANALOGY-01` Shape Morph | high | **S1** | M-ACC + M-ERRTYPE + M-CONF (keyed analogy) |
| `FLU-ODDPAIR-01` Odd Pair Out | high | **S1** | M-ACC + M-RULEID + M-CONF (relation-of-relations) |
| `FLU-VENN-01` Double Match | high | **S1** | M-ACC + M-RULEID (conjunctive classification) |
| `FLU-MATRIXBUILD-01` Build the Tile | high | **DUAL** | keyed **+ M-POLY/M-PATH/M-RULEID** (constructed → per-attribute + strategy) |
| `FLU-GRIDCOPY-01` Copy the Change | high | **DUAL** | keyed **+ M-POLY/M-PATH/M-EFF/M-PROG** (constructed transform, convergence curve) |
| `FLU-DEDUCE-01` Clue Detective | high | **DUAL** | keyed **+ M-POLY/M-PATH/M-EFF** (deduction process) |
| `FLU-LADDER-01` Ranking Ladder | high | **DUAL** | **M-DIFFREACH** + **M-HYP/M-RULEID** (transitive integration ceiling + search efficiency) |
| `FLU-CONCEPT-01` Mystery Gate | high | **S2** | **M-HYP/M-EXPLORE/M-EFF/M-PROG/M-PATH** — active rule *discovery* = learning-rate-adjacent |
| `CX-achieve-02` Investigation Station | med | **S2** | **M-LEARNRATE** + M-PLANFUL/M-HYP/M-EXPLORE/M-PROG (investigation) |
| `CX-diverge-01` Brainstorm Blaster | low | **S2** | **M-IDEAFLU/M-FLEX/M-ORIG/M-ELAB** (divergent creativity — no key) |
| `CX-figural-01` Squiggle Studio | low | **S2** | **M-IDEAFLU/M-ORIG/M-ELAB** (figural creativity — no key) |
| `CX-check-01` Check It Twice | med | **S2** | **M-PERSIST/M-REV** (behavioral conscientiousness/effort, not ability) |

### 2.2 Verbal (16)
| type | ww | stage | why |
|---|---|---|---|
| `VER-CLOZE-01` Fill the Gap | high | **S1** | M-ACC + **M-DIFFREACH** + M-VOCABLVL/M-INFDEPTH |
| `VER-POLYSEME-01` Two Meanings | high | **S1** | **M-DIFFREACH** + M-INFDEPTH + M-LURETYPE + M-VOCABLVL |
| `VER-RELPAIR-01` Relation Match | high | **S1** | **M-DIFFREACH** + M-LURETYPE (verbal analogy) |
| `VER-WORDTRAIN-01` Word Train | high | **S1** | **M-DIFFREACH** + M-VOCABLVL (younger vocab ceiling) |
| `WM-bubble-01` Bubble Pop (n-back) | high | **S1** | **M-DIFFREACH** + M-SPAN/M-DPRIME (verbal WM capacity) |
| `VER-EVIDENCE-01` Proof Hunt | high | **DUAL** | keyed **+ M-POLY/M-INFDEPTH/M-PATH** (evidence-search process) |
| `VER-SENSE-01` Sentence Sense | high | **DUAL** | **M-POLY/M-PATH** (open sentence construction) |
| `VER-SEQUENCE-01` Story Order | high | **DUAL** | **M-POLY/M-PATH/M-EFF** (ordering process) |
| `VER-BUILDIT-01` Build-It Buddy | high | **DUAL** | **M-DIFFREACH** + M-POLY/M-PATH/M-ORALSPAN (logic grid) |
| `GB-DEBATE-01` Claim Duel | high | **DUAL** | M-POLY/M-INFDEPTH/M-PATH |
| `GB-FLAWFINDER-01` Fib Finder | high | **DUAL** | M-INFDEPTH/M-POLY + M-HINT |
| `VER-SORTBOT-01` Sorting Robot | high | **S2** | **M-HYP/M-EXPLORE/M-HINT** — hidden-category *induction* (has M-DIFFREACH → dual-capable) |
| `CX-curious-02` Question Quest | med | **S2** | **M-QUERY** + M-IDEAFLU/M-FLEX/M-ORIG (curiosity/divergent) |
| `CX-sjt-01` What Would You Do? | med | **S2** | M-POLY/M-PATH/M-EXPLORE (reasoning-in-context, no ceiling) |
| `GB-WORDFORGE-01` Word Forge | high | **S2** | **M-IDEAFLU/M-FLEX** + M-VOCABLVL (generative; dual-capable) |
| `GB-WORDLADDER-01` Letter Climb | high | **S2** | **M-EFF/M-PATH/M-PERSIST** (path/effort; dual-capable) |

### 2.3 Spatial (23)
| type | ww | stage | why |
|---|---|---|---|
| `SPA-HIDDENCUBE-01` X-Ray Cubes | high | **S1** | M-ACC + **M-DIFFREACH** (hidden-face count) |
| `SPA-ROLL-01` Rolling Cube | high | **S1** | keyed transform + **M-DIFFREACH** (mild M-PATH/M-PROG) |
| `SPA-FOLDNET-01` Fold-the-Net | high | **S1** | keyed + **M-DIFFREACH** |
| `SPA-PICKFOLD-01` Which Fold Made It? | high | **S1** | keyed + **M-DIFFREACH** + M-HINT |
| `SPA-PUNCH-01` Fold & Punch | high | **S1** | M-POLY + **M-DIFFREACH** |
| `SPA-SHADOW-01` Shadow Play | high | **S1** | keyed + M-CONF + **M-DIFFREACH** |
| `SPA-VIEW-01` What Do They See | med | **S1** | keyed + M-VIEWANG + **M-DIFFREACH** |
| `SPA-SCENE-01` What the Robot Sees | med | **S1** | M-POLY + **M-DIFFREACH** |
| `SPA-XSCAN-01` Scan Stacker | med | **S1** | M-POLY + **M-DIFFREACH** (cross-section) |
| `SPA-XPLANE-01` Place the Slice | med | **DUAL** | M-POLY/**M-PATH/M-EFF** + M-DIFFREACH |
| `SPA-MAZE-01` Plan-the-Path | high | **DUAL** | **M-EFF/M-PATH/M-POLY** + M-DIFFREACH (optimal-path planning) |
| `SPA-PIPES-01` Path Connect | high | **DUAL** | **M-POLY/M-PATH/M-EFF/M-EXPLORE** + M-DIFFREACH |
| `SPA-TANGRAM-01` Shape-Fill Form Board | high | **DUAL** | **M-POLY/M-PATH/M-EFF/M-PROG** + M-DIFFREACH (construction) |
| `GB-EXPLORE-01` Explorer's Map | high | **DUAL** | M-VIEWANG/**M-EXPLORE/M-PATH/M-EFF** + M-DIFFREACH (navigation) |
| `GB-PATHFORGE-01` Path Forge | high | **S2** | **M-EFF/M-PATH/M-EXPLORE/M-PROG/M-PERSIST** (no ceiling; planning/effort) |
| `GB-ROBOPATH-01` Path Coder | high | **S2** | **M-EFF/M-PATH/M-EXPLORE/M-PROG/M-PERSIST** (sequence-planning) |
| `GB-SHAPEFIT-01` Shape Smith | high | **S2** | **M-EFF/M-PATH/M-EXPLORE/M-PROG/M-PERSIST** (construction) |
| `WM-corsi-01` Firefly Trail | high | **S1** | **M-SPAN/M-DIFFREACH/M-MANIPCOST** (spatial span capacity) |
| `WM-bind-01` Home Again | high | **S1** | **M-SPAN/M-DIFFREACH** (object-location binding) |
| `WM-gridflash-01` Star Grid | high | **S1** | **M-SPAN/M-DPRIME/M-DIFFREACH** (simultaneous span) |
| `WM-gate-01` Gatekeeper | high | **S1** | **M-UPDATECOST/M-POLY** (running-span updating capacity) |
| `GB-FILTER-01` Star Filter | high | **S1** | **M-DPRIME/M-UPDATECOST/M-SPAN** (filtered span; engagement-heavy) |
| `GB-TRACK-01` Firefly Jars | high | **S1** | **M-DPRIME/M-UPDATECOST/M-SPAN** (multiple-object tracking) |

### 2.4 Quantitative (12, greenfield) — *the learning-rate engine*
**Finding [V, from the specs]:** the greenfield quant types were built **learning-rate-native** — **every one except the ANS-acuity type declares `M-LEARNRATE`** alongside `M-DIFFREACH`. So quant is the domain that most naturally serves *both* stages (a keyed rule-induction ceiling **and** a within-session growth slope).

| type | ww | stage | why |
|---|---|---|---|
| `QUANT-DOTS-01` More or Fewer | high | **S1** | **M-WEBER** + M-SPEEDACC + M-DIFFREACH (ANS acuity; the one non-learning-rate quant) |
| `QUANT-SERIES-01` Pattern Steps | high | **DUAL** | M-RULEID + **M-DIFFREACH + M-LEARNRATE** (number series) |
| `QUANT-MATRIX-01` Number Web | high | **DUAL** | M-RULEID + **M-DIFFREACH + M-LEARNRATE** |
| `QUANT-FUNC-01` Machine Rule | high | **DUAL** | M-RULEID + **M-DIFFREACH + M-LEARNRATE** (function induction) |
| `QUANT-NUMLINE-01` Number Line Jump | high | **DUAL** | **M-PAE** + M-CONSIST + M-DIFFREACH + **M-LEARNRATE** |
| `QUANT-EQUAL-01` Make It Equal | high | **DUAL** | **M-EQREL** (relational-= signature) + M-DIFFREACH + **M-LEARNRATE** |
| `QUANT-BALANCE-01` Balance Lab | high | **DUAL→S2** | **M-POLY/M-PATH/M-PLANFUL** + M-DIFFREACH + **M-LEARNRATE** (systems) |
| `QUANT-MOBILE-01` Hanging Mobile | high | **DUAL→S2** | **M-POLY/M-PATH/M-PLANFUL/M-PROG** + **M-LEARNRATE** |
| `QUANT-GRAPH-01` Story Graph | high | **DUAL→S2** | **M-POLY/M-PATH/M-PLANFUL** + **M-LEARNRATE** |
| `QUANT-MIX-01` Fair Share | high | **DUAL→S2** | **M-PROPSTRAT** + M-POLY/M-PATH/M-PLANFUL + **M-LEARNRATE** |
| `QUANT-BUILD-01` Biggest Number | high | **DUAL→S2** | **M-PATH/M-EFF/M-PLANFUL** + **M-LEARNRATE** |
| `QUANT-WORD-01` Story Model | high | **DUAL→S2** | **M-POLY/M-PATH/M-PROG/M-PLANFUL** + **M-LEARNRATE** |

### 2.5 Summary counts
- **Pure S1 (standing / ceiling):** ~24 types — the figural matrices/series/analogies, verbal reasoning/vocab, spatial transforms, WM-span capacity, ANS acuity. These *bracket* θ.
- **DUAL (bridge):** ~19 types — constructed-response, deduction, planning, and *all* the rule-induction quant. Usable in either stage by configuration.
- **Pure S2 (learning-rate / process / creativity / effort):** ~11 types — rule *discovery* (Mystery Gate, Sorting Robot), creativity (Brainstorm, Squiggle, Question Quest), open planning/effort (Path Forge/Coder/Smith, Word Forge/Ladder), investigation (Investigation Station), conscientiousness (Check It Twice).

**Design consequence [I]:** Stage 1 should draw from the **pure-S1 + the keyed side of DUAL** types (clean ceilings, fast to bracket). Stage 2 should draw from **pure-S2 + the process/growth side of DUAL** — and the **quant DUAL types are the best learning-rate vehicle** because they combine a novel rule ladder (for `M-LEARNRATE`) with a legible key.

---

## 3. What each stage tracks + how it becomes a score

### 3.1 Stage 1 (Standing) → per-domain θ
| metric | what it captures | how it feeds the score |
|---|---|---|
| `M-ACC` | per-item correct/incorrect | base IRT signal → θ |
| `M-DIFFREACH` | max difficulty solved under escalation | the tail ceiling → θ + classifier |
| `M-RULEID` | # co-acting rules bound at once | relational-complexity resolution of θ |
| `M-ERRTYPE` / `M-LURETYPE` | near-miss vs random error / lure class | sub-cut placement (latent ability just below the cut) |
| `M-CONSIST` | parallel-form reliability | shrinks conditional SE at the cut → triggers more items |
| `M-POLY` | partial credit on rich items | extra tail info from one item |
| domain companions `M-VOCABLVL`,`M-INFDEPTH`,`M-PAE`,`M-WEBER`,`M-SPAN`,`M-MANIPCOST`,`M-VIEWANG`,`M-DPRIME` | fine-grained continuous ceilings per domain | sharpen θ where dichotomous accuracy would floor/ceiling |
| `M-RTFIRST`/`M-RT` (gated) | reflective encoding / latency | validity + consistency adjunct (never a primary score) |

### 3.2 Stage 2 (Learning-rate / effort) → Timeback-fit index (kept separate from θ)
| metric | what it captures | how it feeds the score |
|---|---|---|
| **`M-LEARNRATE`** | within-session growth slope / trials-to-mastery on a *novel* type | **the Timeback-fit core** |
| `M-PLANFUL` | systematic vs random pre-commit behavior | process-quality component |
| `M-HYP` | hypothesis-search efficiency (info-gain per action) | rule-discovery quality |
| `M-EFF` | moves/time vs optimal | economy of solving |
| `M-PROG` | progress trajectory (fast-to-plateau vs steady) | shape of the learning curve |
| `M-PATH` | full action sequence | the raw trace all trace-derived metrics are computed from |
| `M-IDEAFLU`/`M-FLEX`/`M-ORIG`/`M-ELAB` | divergent-thinking indices | creativity axis |
| `M-PERSIST`/`M-RESUME` | time-on-hard / post-failure re-engagement | task commitment |
| `M-QUERY`/`M-UNCERT`/`M-CHOICE` | question-asking / uncertainty preference / free-choice | curiosity & intrinsic motivation |

### 3.3 Cross-cutting gate (applies to BOTH stages — audit these first)
| metric | role |
|---|---|
| `M-ENGAGE` | on-task/idle/blur — gates every other signal |
| `M-RAPIDGUESS` | per-response effort-validity flag — effort-invalid responses are **dropped** from θ and speed |
| `M-DRIFT` | within-session fatigue slope — discounts late low-effort items |
| `M-RTVAR`/`M-LAPSE` | consistency (worst-performance rule) — count even when raw speed doesn't |
| `M-SPEEDACC`/`M-COMBO`/`M-FALSEALARM` | speed credited **only** behind the engagement gate |

---

## 4. Audit design (the ask: "tracked well + used correctly to determine score")

Every metric gets **two** audit questions:

- **Q1 — Tracking fidelity:** is the raw signal captured faithfully from the interaction log?
- **Q2 — Scoring usage:** is it fed into the score in the right place, with the right gate/weight, and in the right stage?

Split the registry the way **D-022** already proposes — **observed** vs **trace-derived** — because they need different audits:

### 4.1 Observed metrics (directly logged): audit by deterministic replay
`M-ACC`, `M-RT`, `M-RTFIRST`, `M-REV`, `M-SPAN`, `M-DPRIME`, `M-ENGAGE`, raw `M-PATH` events.
- **Q1 audit:** re-derive each from the raw event log and compare to the stored value. **This already exists and passed:** Gen-B's 30 plpgsql per-type verifiers + the cross-tier differential (2268/2268 agreement) re-derive `M-ACC`/correctness server-side; the `cat-engine` deterministic replay + fingerprint reproduce the scored result bit-for-bit (R7).
- **Q2 audit:** confirm `M-ACC` from an **effort-invalid** response (failed `M-RAPIDGUESS`/`M-ENGAGE`) is **excluded** from θ; confirm speed (`M-RT`) is credited only when the gate passes.

### 4.2 Trace-derived metrics (computed from the log): audit by recomputation
`M-LEARNRATE`, `M-HYP`, `M-PLANFUL`, `M-EFF`, `M-PROG`, `M-DIFFREACH`, `M-RULEID`, `M-ERRTYPE`, creativity indices.
- **Q1 audit:** recompute the statistic from the stored `M-PATH`/trajectory with an independent implementation and diff. E.g. `M-LEARNRATE` — recompute the slope over the ≥8 escalating trials and check it used a **novel** type and a monotonic escalation; `M-DIFFREACH` — verify an item at the reported max difficulty was actually *solved*, not just *served*; `M-HYP` — recompute info-gain per action from the placement log; `M-ERRTYPE` — re-tag the chosen distractor against the lure key.
- **Q2 audit:** the **construct-separation check** — verify `M-LEARNRATE` (and other Stage-2 signals) feed **only** the Timeback-fit index and **not** θ. This is the single most important usage audit: the framework's whole defensibility rests on standing ≠ learning-rate.

### 4.3 The five concrete audits to build (per stage)
1. **Replay audit (both):** re-run the full session log through the scorer; assert the recomputed θ, Timeback-fit index, and decision match the stored ones bit-for-bit (leverages `cat-engine` replay + Gen-B verifiers).
2. **Gate audit (both):** inject effort-invalid responses; assert they're dropped from θ and earn no speed credit; assert `M-DRIFT` discounts late items.
3. **Ceiling audit (Stage 1):** assert `M-DIFFREACH` = highest **solved** difficulty and that escalation stopped on a real fail-band, not an item cap masquerading as a ceiling.
4. **Learning-rate audit (Stage 2):** assert `M-LEARNRATE` is computed on a **novel** type over ≥8 escalating trials, is separated from θ, and is labelled a *hypothesis* (not a will-benefit claim).
5. **Population audit (both):** run the `scripts/validation-harness` (feat/exam-validation-harness) for per-stage reliability, DIF/fairness, classification accuracy/consistency, and false-negative rate — the *usage-at-scale* check that the score is defensible, not just internally consistent.

### 4.4 Where each audit already has tooling
| audit | existing hook |
|---|---|
| per-item correctness re-derivation | Gen-B `app.exam_verify_response` + 30 plpgsql verifiers (verified 465/465, 2268/2268) |
| decision-level deterministic replay | `@gt-selection/cat-engine` `verifyReplay`/`fingerprint` (R7, D-019 Lambda) |
| observed-vs-trace registry split | D-022 (per-item observed vs trace-derived metric registry) |
| population psychometrics | `scripts/validation-harness` (reliability, DIF, classification accuracy/consistency) |
| **gaps to build** | the **construct-separation** assertion (§4.2 Q2), the **ceiling-is-solved** assertion (§4.3.3), and the **learning-rate-provenance** assertion (§4.3.4) — none of these has an automated check yet |

---

## 5. What this changes in the demo
1. **Route by classification, not render kind.** Phase 1 draws from **pure-S1 + keyed-DUAL** types; Phase 2 draws from **pure-S2 + growth-DUAL** types (ideally the **quant learning-rate** types) placed at desirable difficulty near the Phase-1 θ.
2. **Use the real bank's type codes + declared metrics**, not invented `*-STAND-*`/`*-EFFORT-*` placeholders.
3. **Surface the two outputs separately** in the summary — a per-domain **standing (θ)** panel and a distinct **Timeback-fit (learning-rate)** panel — mirroring the framework's separation, which also makes the construct-separation audit legible to a stakeholder.

## 6. Open assumptions to validate [A]
- That within-session `M-LEARNRATE` slope predicts real platform acceleration (flagged in the framework as a hypothesis, **not** a will-benefit claim).
- That the creativity proxies (`M-ORIG`/`M-FLEX`) are trustworthy without per-prompt norm banks (feasibility flag in the framework).
- Ordinal design rungs are **not** calibrated IRT difficulty; θ and `M-DIFFREACH` are only as good as the (currently synthetic, `validated=false`) item parameters — the population audit (§4.3.5) is what would earn the right to trust them.
