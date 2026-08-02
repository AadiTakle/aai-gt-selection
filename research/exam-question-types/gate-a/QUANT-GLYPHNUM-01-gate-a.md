# Gate A evidence — QUANT-GLYPHNUM-01

8 seeds x 400 children per cell = 3200 simulated children per figure. Harness defaults otherwise: 30 trials, lambda ~ N(0.06, 0.03^2), theta0 ~ N(10.5, 3^2),
handover-noise SD 1.5, slope 1.0, target offset +1, estimator floor DEFAULT_GUESSING = 0.2 in
both the readout fit and nextTargetTheta.


## Gate A at a responder guessing floor of 0.2 — a real five-option item

| arm | A1 null lambda-bar | +/- SE of that mean | SEs from zero | A1 | A2 false `above` | A3 | A4 r | A4 mean SE | fitted-lambda SD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| consistent | 0.0094 | 0.0008 | 11.0 | 1/8 pass | 12.9% (8/8 pass) | 8/8 pass | 0.336 | 0.063 | 0.0660 |
| perTrial | 0.0094 | 0.0008 | 11.0 | 1/8 pass | 12.9% (8/8 pass) | 8/8 pass | 0.336 | 0.063 | 0.0660 |

  A3 detail (identical across seeds in kind): fastest simulated learner (λ = 0.15), 100 children: 0 pinned at the pool maximum 19.99 with the bank short of what was asked for; 14 pinned because the projection hit the 20-point scale ceiling (not a bank defect); 0 block(s) ran out of items

## Gate A at a responder guessing floor of 0 — the harness default, no floor

| arm | A1 null lambda-bar | +/- SE of that mean | SEs from zero | A1 | A2 false `above` | A3 | A4 r | A4 mean SE | fitted-lambda SD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| consistent | 0.0027 | 0.0006 | 4.9 | 7/8 pass | 3.4% (8/8 pass) | 8/8 pass | 0.502 | 0.063 | 0.0506 |
| perTrial | 0.0027 | 0.0006 | 4.9 | 7/8 pass | 3.4% (8/8 pass) | 8/8 pass | 0.502 | 0.063 | 0.0506 |

  A3 detail (identical across seeds in kind): fastest simulated learner (λ = 0.15), 100 children: 0 pinned at the pool maximum 19.99 with the bank short of what was asked for; 9 pinned because the projection hit the 20-point scale ceiling (not a bank defect); 0 block(s) ran out of items

## A1 attribution — paired against a bank-free ideal grid

Same seed builds the same simulated children for both pools, so these differences are paired
and much tighter than the columns suggest. A1 asks whether the BANK manufactures a climb; the
grid row is what the estimator manufactures with no bank involved at all.

| quantity, 30 trials | ideal grid | QUANT-GLYPHNUM-01 | FLU-OPCHAIN-01 |
| --- | --- | --- | --- |
| null-cohort lambda-bar | 0.0092 | 0.0093 | 0.0101 |
| paired null-lambda excess of QUANT-GLYPHNUM-01 over the grid | — | 0.0001 +/- 0.0004 (t = 0.35) | — |
| paired null-lambda excess of FLU-OPCHAIN-01 over the grid | — | — | 0.0009 +/- 0.0005 (t = 1.78) |

## A4 and the item-density conjecture

STAGE2_BANK_RECOVERY_MEASUREMENT §5 conjectured, and did not test, that FLU-OPCHAIN-01 falls
behind the ideal grid at 45 and 60 trials because it carries 6 items per 0.5-point rung against
the grid's 12. QUANT-GLYPHNUM-01 is built at 12. Recovery r, mean of eight seeds:

| trials | ideal grid | QUANT-GLYPHNUM-01 (12/rung) | FLU-OPCHAIN-01 (6/rung) |
| --- | --- | --- | --- |
| 30 | 0.339 | 0.336 | 0.341 |
| 45 | 0.548 | 0.552 | 0.523 |
| 60 | 0.712 | 0.706 | 0.659 |

| paired r difference against the grid | 30 | 45 | 60 |
| --- | --- | --- | --- |
| QUANT-GLYPHNUM-01 | -0.003 (t = -0.4) | +0.004 (t = 1.0) | -0.006 (t = -1.8) |
| FLU-OPCHAIN-01 | +0.001 (t = 0.1) | -0.024 (t = -4.5) | -0.052 (t = -6.9) |

NOT GATED. Gate A is a check that the pipeline does not manufacture lambda out of nothing, not
evidence that the block measures learning. Gate B needs ~128 real children (§4.1.3) and no
synthetic run substitutes for them.
