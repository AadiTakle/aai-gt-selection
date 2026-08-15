# Exam Validation & Psychometrics Harness (SYNTHETIC-ONLY)

A **structure-agnostic** analysis pipeline that evaluates the measurement
properties of *any* cognitive test from a per-student score table. It makes **no
assumption** about how the test was administered (adaptive, two-stage,
fixed-form, item-count, scoring rule) — it consumes columns.

> **HARD CONSTRAINT — BORN-SYNTHETIC ONLY.** Every dataset here is synthetic and
> tagged `synthetic_only=true`, `validated=false` (D-006, R9). The loader
> **fails closed**: it refuses to run on any dataset whose manifest does not
> prove it is born-synthetic. No real or live student data is used anywhere.

Zero third-party dependencies — pure Python 3 standard library (no
numpy / scipy / pandas). It runs anywhere `python3` is installed.

## What it computes

| # | Analysis | Serves |
|---|---|---|
| 3 | **Concurrent validity** — Pearson (+ Fisher-z CI) and Spearman among measures | R5, H1 |
| 4 | **Classification agreement** at a configurable cut — agreement, Cohen's kappa, phi, sensitivity/specificity vs a reference measure | R5, R7 |
| 5 | **Reliability** — Cronbach's alpha, split-half (Spearman-Brown), SEM, near-cut decision consistency, item statistics | R5, R6 |
| 6 | **Ceiling / floor** — distribution, `% perfect`, top-band compression, gifted-tail precision | R6 |
| 7 | **Incremental validity** — nested ΔR² F-test: does a secondary signal add predictive value over the primary? | H1, R5 |
| 8 | **DIF / measurement invariance** — Mantel-Haenszel (common odds ratio, ETS Δ A/B/C) + logistic regression (uniform / nonuniform), two-stage purified | H7, H2 |
| 9 | **Subgroup equity funnel** — selection rates and adverse-impact (4/5ths) ratios at the cut | H7, EV-11 |
| 10 | **Differential prediction** — does subgroup add predictive value beyond the score (Cleary-model predictive bias)? | R5, H7 |

The pipeline emits a **validation report** in Markdown *and* self-contained HTML,
plus a machine-readable `*.results.json`.

## Quick start

```bash
cd scripts/validation-harness

# generate synthetic data + validate + report, in one command
python3 run_harness.py

# outputs land in ./out/ (the repo-root .gitignore ignores every out/ dir):
#   synthetic_scores.csv              (born-synthetic dataset)
#   synthetic_scores.manifest.json    (synthetic tags, seed, SHA-256, ground truth)
#   validation_report.md / .html      (the report)
#   validation_report.results.json    (machine-readable)
```

A committed snapshot of a default run is kept in [`sample-report/`](./sample-report/)
(report + manifest) as acceptance evidence, so you can read it without running.

Other entry points:

```bash
# just generate the born-synthetic dataset (+ manifest)
python3 generate_synthetic.py --seed 20260727 --n 600

# validate an EXISTING dataset (guard enforced); same entry a future
# real-data adapter would call with the identical schema
python3 validate.py --data out/synthetic_scores.csv

# override any config knob
python3 run_harness.py --config config.example.json
```

Run the tests:

```bash
python3 -m unittest discover -s tests -t .
```

## Dataset schema (the reusable contract)

The harness reads a plain CSV. The synthetic generator emits this schema; a
future authorized real-data adapter would emit the **same** schema so no
analysis code changes.

| column | type | meaning |
|---|---|---|
| `student_id` | str | synthetic identifier |
| `grade` | int | grade band |
| `cogat_sas` | int | existing ability screen (CogAT standard age score) |
| `map_rit` | int | existing achievement measure (MAP RIT) |
| `nt_01 … nt_NN` | 0/1 | item responses for the new test (any count) |
| `newtest_total` | int | new-test total/scaled score |
| `criterion_eoy` | float | downstream criterion outcome (for incremental validity) |
| `subgroup_demo` | str | reference/focal grouping for DIF |
| `ell_status`, `ses_band` | str | equity-funnel subgroups (guardrails, **not** capability) |

Everything is referenced by **column name** in `harness/config.py`, so pointing
the harness at a different test only changes config, not code:

- **Different item count / scoring:** the item-level analyses use whatever
  `nt_*` columns exist; total/score is just a column.
- **Different cut:** cuts are `{"type":"percentile","value":90}` or
  `{"type":"absolute","value":X}` per measure.
- **No item responses:** reliability + item DIF degrade gracefully; concurrent
  validity, agreement, ceiling/floor, incremental validity, the equity funnel,
  and differential prediction still run.

## Pointing at REAL data later (post-consent) — deliberately gated

The harness is **born-synthetic-only right now, by design**. Real student data
requires the privacy/consent/legal approvals tracked in `B-06` and a **formal
authorized decision** to relax the guard. The pieces already in place:

1. The **schema** above is the stable contract for a future real-data adapter.
2. The **guard** (`harness/dataio.assert_born_synthetic`) is the single, explicit
   place where born-synthetic enforcement lives. Enabling real data must be a
   deliberate, reviewed change under an approved live-data decision — never an
   accident. Until then, any non-synthetic manifest is refused (exit code 2).

## Configuration knobs worth knowing

In `harness/config.py` (override via `--config`):

- `generation.incremental_signal` — weight of the capability the new test taps
  beyond CogAT. **Set to `0.0`** to produce a valid **NULL** (the new test adds
  no incremental value) — null results are reportable (R7, charter).
- `generation.impact_delta` — a *statistical stress-test* knob that shifts focal
  ability. **Default `0.0`** (a fair test). It does **not** encode any claim that
  a real group differs in ability; it exists only to confirm MH correctly
  conditions on ability.
- `generation.dif.*` — injected item bias so the DIF machinery has a known
  signal to recover (audit only; the analysis never reads the ground truth).

## Claim boundaries (read before quoting any number)

- All data is **synthetic**; `validated=false`. **No number here is a live,
  GT-specific, or causal claim.**
- Concurrent correlation and classification agreement measure *convergence with
  existing measures*, **not truth and not program impact** (E-066, E-070).
- Incremental / differential-prediction results use a **synthetic criterion**;
  they demonstrate the *method*, not real predictive validity.
- A DIF flag targets an item for **review**; it is not proof of bias or grounds
  for removal.
- Predictive validity is not program impact; access, reliability, outcome
  change, and causal impact are separate milestones (R10).

See `TRACEABILITY.md` for the full requirement/evidence/scope handoff.
