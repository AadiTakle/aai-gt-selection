# Metrics Basis — `@gt-selection/exam-scoring`

Why this package tracks the metrics it does, and how the deterministic scorer
uses them. This documents and justifies the **basic-core metric set** and the
**bracket scorer** built to `EXAM_ADAPTIVE_BUILD_PLAN.md` (§4 metrics, §5
scoring). Measurement IDs cite `research/exam-question-types/MEASUREMENTS.md`
(canonical source `measurements.json`); combination logic follows
`research/exam-question-types/METRIC_FRAMEWORK.md`.

**Born-synthetic only** (`synthetic_only=true`, `validated=false`, per
**RES-013**). Nothing here is a validated psychometric instrument.

## Requirements & decisions served

Inherited from `METRIC_FRAMEWORK.md` (not re-derived here):

- **R5** — defensible capability signal + Timeback-fit standard.
- **R11** — scalable, tunable, fully-automated screener (no human in the loop).
- **H1 / H4** — broader measures; broaden who can demonstrate ability.
- **H10** — minimize gaming / test burden.
- **D-015 / D-016** — Timeback-fit target; adaptive; consistency-over-speed.

This package is the **§5 scoring workstream** only. It does **not** produce an
admit/defer/retry decision, run the adaptive engine, or enforce the engagement
gate. Those are other workstreams / future work.

## Claim labels

Per project guardrails: **Verified** = established in the cited
psychometric/cognitive literature; **Inference** = reasoned design choice;
**Assumption** = open, to be validated. **Predictive validity is not program
impact; the within-session learning-rate signal (M-LEARNRATE) is a *screening
hypothesis*, not a proven counterfactual of who will benefit.**

## Basic-core metric set (BUILD_PLAN §4)

The set below is *tracked AND influences selection/scoring now*. It is the §4
table (the "~16", 20 rows including domain-specific companions). Encoded in
`src/metric-registry.ts` as `BASIC_CORE_METRICS`. `minSamples` comes from the
"How much" column of MEASUREMENTS.md and is consumed by the engine stop rule
(the scorer surfaces coverage but never blocks on it).

| Metric | Scope | minSamples | Influences | Why core (cite) |
|---|---|---|---|---|
| **M-ACC** | all | 8 | select, score | Base IRT signal; per-area accuracy-at-difficulty sets the bracket (MEASUREMENTS M-ACC). |
| **M-DIFFREACH** | all | 6 | select, score | Ceiling via escalation-to-failure; sharpest single tail statistic and the primary within-bracket driver (MEASUREMENTS M-DIFFREACH). *Verified: above-level ceiling probing — Lohman; Embretson & Reise.* |
| **M-RT** | all | 20 | score | Efficiency, credited only behind the engagement gate (MEASUREMENTS M-RT). Default weight **0** (see below). |
| **M-RTFIRST** | all | 15 | score | Planning/encoding latency; gated like M-RT (MEASUREMENTS M-RTFIRST). Default weight **0**. |
| **M-RTVAR** | all | 20 | score, profile | Its **inverse is the consistency signal**; low RT variability tracks g better than peak speed (MEASUREMENTS M-RTVAR). *Verified: worst-performance rule — Coyle; Larson & Alderton.* |
| **M-REV** | all | 8 | score | Few targeted revisions = confidence vs guess-and-check (MEASUREMENTS M-REV). |
| **M-ERRTYPE** | all | 3 | select, score | Near-miss vs random error → sub-cut placement + adaptive update magnitude (MEASUREMENTS M-ERRTYPE). |
| **M-CONSIST** | all | 3 | score (+ stop rule) | Shrinks conditional SE at the cut; drives the engine stop rule (MEASUREMENTS M-CONSIST). |
| **M-LEARNRATE** | all | 8 | score, profile | Timeback-fit core; within-session growth = dynamic-assessment learning potential (MEASUREMENTS M-LEARNRATE). *Verified concept: Vygotsky ZPD; Grigorenko & Sternberg 1998.* **Screening hypothesis, not a will-benefit claim.** |
| **M-PATH** | interactive | 5 | score | Strategy signature; scored where present (MEASUREMENTS M-PATH). |
| **M-EFF** | interactive | 5 | score | Efficiency vs stored optimal; clean tail separator (MEASUREMENTS M-EFF). |
| **M-PLANFUL** | interactive | 3 | score | Systematic vs impulsive pre-commit behavior (MEASUREMENTS M-PLANFUL). *Verified: Sternberg componential; CANTAB search strategy.* |
| **M-ENGAGE** | all | 1 | track | Off-task/idle gate for all signals; **tracked, NOT enforced yet** (MEASUREMENTS M-ENGAGE). |
| **M-RAPIDGUESS** | all | 8 | track | Per-response effort validity; **tracked, NOT enforced yet** (MEASUREMENTS M-RAPIDGUESS). *Verified: response-time effort — Wise & Kong.* |
| **M-RULEID** | fluid_reasoning | 6 | score | Relational-complexity bound (Halford); fluid-only (MEASUREMENTS M-RULEID). |
| **M-VOCABLVL** | verbal | 15 | score | Lexical frequency ceiling; verbal-only (MEASUREMENTS M-VOCABLVL). |
| **M-LURETYPE** | verbal | 10 | score | Distractor lure profile; near-miss lures refine verbal placement (MEASUREMENTS M-LURETYPE). |
| **M-PAE** | quantitative | 10 | score | Continuous number-line placement error; quant-only, lower better (MEASUREMENTS M-PAE). |
| **M-ROTSLOPE** | spatial | 12 | score | Mental-rotation RT slope (Shepard-Metzler); spatial-only, lower better (MEASUREMENTS M-ROTSLOPE). |
| **M-IDEAFLU** | open_ended | 3 | track, select | Auto-counted ideation fluency; participates in coverage/selection, full originality judge deferred (MEASUREMENTS M-IDEAFLU). |

## Everything else is tracked-inert

The remaining **43** measurements in MEASUREMENTS.md are registered as
`TRACKED_INERT_METRICS` (`tier: 'tracked_inert'`, `influences: ['track']`). They
are declared and (eventually) logged, but under the current policy they do
**not** influence selection or scoring. This keeps the full 63-metric registry
present and auditable while the scored set stays deliberately small.

Registry invariant (asserted at load *and* in tests): the union of basic-core +
tracked-inert equals the 63 canonical IDs, each appearing exactly once.

## Numeric encoding conventions (Assumptions)

`ItemResult.metrics` is `Record<MetricId, number>`, so metrics that are
naturally categorical must be encoded numerically. These conventions are open
**Assumptions** to be validated with the item-bank authors:

- **M-ERRTYPE** ∈ [0, 1] = fraction of errors that are *near-miss* (vs random /
  motor). Higher = latent ability just below threshold.
- **M-LURETYPE** ∈ [0, 1] = fraction of errors on *category/near-miss* lures (vs
  surface/random). Higher = finer discrimination.
- **M-VOCABLVL** = ascending difficulty **band index** (higher = rarer
  vocabulary mastered), reference range 1–8.
- **M-RTVAR** = coefficient of variation of RT (reference range 0.05–0.9);
  consistency = `1 − normalize(M-RTVAR)`.
- **M-LEARNRATE** = normalized within-session growth index in [0, 1] (rescaled
  slope). If a raw difficulty-per-trial slope is delivered instead, retune the
  policy `range`.
- **M-PAE** = percent absolute error (0 = perfect), reference range 0–0.5, lower
  better.
- **M-ROTSLOPE** = ms per degree, reference range 0–30, lower better.
- **M-DIFFREACH** = ceiling on the 1–20 scale. If not supplied explicitly, the
  scorer derives it as the hardest *correct* item's difficulty and takes the max
  of the two (so the ceiling is never below the hardest solved item).

## Scorer design (BUILD_PLAN §5)

`scoreExam(items: ScoredItem[], policy = DEFAULT_EXAM_POLICY): ExamScore` is a
**pure, deterministic** function — no clock, randomness, or I/O. Given the
stored trace and a frozen policy id, the score reproduces exactly.

**Per area (fluid / verbal / quantitative / spatial):**

1. **Bracket by accuracy.** Compute (difficulty-weighted) accuracy and map it to
   an ordinal bracket. Each bracket fixes a θ span on the 1–20 scale. Defaults
   line up with the grade-band ramp (K-1≈1–4, 2-3≈4–8, 4-5≈8–12, 6-8≈12–16,
   above-level≈16–20).
2. **Position within bracket.** A weighted **average** of the present
   within-bracket metrics, each normalized to [0, 1] with a direction
   (`higher`/`lower` better). `M-DIFFREACH` dominates; consistency (inverse
   `M-RTVAR`), `M-LEARNRATE`, and `M-ERRTYPE` follow; process (`M-PATH`,
   `M-EFF`, `M-PLANFUL`) and domain metrics contribute where present. Position ∈
   [0, 1] then places θ inside the bracket span. With no weighted metrics, the
   policy `defaultPosition` (0.5) is used.
3. **Composite** = area-weighted mean of per-area θ (renormalized over the areas
   that have data).
4. **Profile** = `{ strengths, relativeWeaknesses, rankedAreas, learningRate,
   consistency }`. Learning rate is the aggregate `M-LEARNRATE`; consistency is
   the aggregate inverse `M-RTVAR`. **No decision label.**

Because adaptive selection targets items near a child's ceiling, "accuracy" here
is *accuracy-at-difficulty* and `M-DIFFREACH` (difficulty reached) does the
heavy lifting of separating the tail. Under a non-adaptive item set the pure
accuracy bracket is a coarser signal — an explicit **Assumption** documented for
the integration merge.

## Default policy (`DEFAULT_EXAM_POLICY`, id `exam-scoring-default-v1`)

Every value is a tunable knob (admin-portal editing is future work).

- **Bracket edges** (accuracy floor → θ span): 0.00→[1,4], 0.35→[4,8],
  0.55→[8,12], 0.70→[12,16], 0.85→[16,20]. `difficultyWeighted: true`.
- **Within-bracket weights:** M-DIFFREACH 0.30, M-RTVAR 0.20 (lower), M-LEARNRATE
  0.20, M-ERRTYPE 0.12, M-CONSIST 0.08, domain metrics 0.06 each, process metrics
  0.04 each, M-REV 0.03 (lower).
- **Speed gated off:** M-RT and M-RTFIRST are wired but weight **0**. Speed is
  evidence *only behind the engagement gate* (M-ENGAGE/M-RAPIDGUESS), which is
  tracked-but-not-enforced for now. Admins can raise these once the gate ships.
- **Area weights:** equal (0.25 each).
- **Profile:** `strengthMargin` 1.0 θ; learn-rate / consistency band cutoffs at
  normalized 0.4 (moderate) and 0.7 (high).

## Out of scope / open items

- **No** admit/defer/retry decision, calibrated-confidence classifier, or
  Timeback-fit *index* composite (kept distinct from ability θ per framework §5).
- Engagement gate is **not enforced**; speed weights are 0 by default.
- Creativity originality banks (M-ORIG) and per-type lexicons are unbuilt.
- Local TS types mirror the BUILD_PLAN contract instead of importing
  `packages/contracts`; reconcile at the `feat/exam-integration` merge.
