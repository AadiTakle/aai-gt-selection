# Stage 2 per-session re-keying — feasibility measurement
seed: STAGE2_SESSION_KEYING|v1

## Q1  How many options can a session mapping make correct?

| bank | n | options | family | systems | mean reachable | >= k-1 reachable | all reachable | <= 1 reachable | mean modal share | worst |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | 234 | 5 | free | 720 | 4.13 | **78.2%** | 44.9% | 0.0% | 28.9% | 50.0% |
| `FLU-OPCHAIN-01` | 234 | 5 | class | 36 | 2.11 | **4.3%** | 1.7% | 26.1% | 57.5% | 100.0% |
| `SPA-XFORM-01` | 234 | 5 | free | 720 | 4.09 | **100.0%** | 8.5% | 0.0% | 32.1% | 52.2% |
| `SPA-XFORM-01` | 234 | 5 | class | 48 | 2.16 | **4.7%** | 0.0% | 23.5% | 58.7% | 100.0% |
| `QUANT-GLYPHNUM-01` | 468 | 5 | free | 120 | 3.90 | **63.0%** | 32.3% | 0.0% | 36.1% | 82.4% |
| `QUANT-GLYPHNUM-01` | 468 | 5 | class | 12 | 1.61 | **0.2%** | 0.0% | 45.5% | 73.8% | 100.0% |
| `VER-MORPHO-01` | 468 | 4 | free | 720 | 3.99 | **99.4%** | 99.4% | 0.0% | 26.6% | 50.0% |
| `VER-MORPHO-01` | 468 | 4 | class | 36 | 2.46 | **43.4%** | 20.3% | 17.9% | 50.1% | 100.0% |

### Reachable-option histogram (count of items by number of reachable options)

FLU-OPCHAIN-01       free   0:0  1:0  2:23  3:28  4:78  5:105
FLU-OPCHAIN-01       class  0:0  1:61  2:101  3:62  4:6  5:4
SPA-XFORM-01         free   0:0  1:0  2:0  3:0  4:214  5:20
SPA-XFORM-01         class  0:0  1:55  2:98  3:70  4:11  5:0
QUANT-GLYPHNUM-01    free   0:0  1:0  2:25  3:148  4:144  5:151
QUANT-GLYPHNUM-01    class  0:0  1:213  2:227  3:27  4:1  5:0
VER-MORPHO-01        free   0:0  1:0  2:3  3:0  4:465
VER-MORPHO-01        class  0:0  1:84  2:181  3:108  4:95

## Q2  Does the calibrated difficulty survive?

Every one of the four types prices a count of one operator sub-class. A FREE relabelling moves that count; a CLASS-PRESERVING one cannot.

| bank | priced lever | family | mappings that move it | mean drift (lever units) | max |
| --- | --- | --- | --- | --- | --- |
| `FLU-OPCHAIN-01` | `geom` (geometric) | free | **48.3%** | 0.48 | 2.00 |
| `FLU-OPCHAIN-01` | `geom` (geometric) | class | **0.0%** | 0.00 | 0.00 |
| `SPA-XFORM-01` | `turns` (orientation) | free | **50.3%** | 0.53 | 2.00 |
| `SPA-XFORM-01` | `turns` (orientation) | class | **0.0%** | 0.00 | 0.00 |
| `QUANT-GLYPHNUM-01` | `binds` (binding) | free | **21.4%** | 0.24 | 2.00 |
| `QUANT-GLYPHNUM-01` | `binds` (binding) | class | **0.0%** | 0.00 | 0.00 |
| `VER-MORPHO-01` | `scope` (number-scope) | free | **42.9%** | 0.45 | 2.00 |
| `VER-MORPHO-01` | `scope` (number-scope) | class | **0.0%** | 0.00 | 0.00 |

### The same drift in the 1..20 rung the product serves (FLU-OPCHAIN-01)

| family | mean \|Δdifficulty\| | p95 | max | items moved off their 0.5 rung |
| --- | --- | --- | --- | --- |
| free | **0.83** | 2.94 | 5.88 | **48.3%** |
| class | **0.00** | 0.00 | 0.00 | **0.0%** |

## Q3  Do the distractors stay named partial rules? (FLU-OPCHAIN-01)

| family | (item, mapping) pairs | all four still named | mean named of 4 |
| --- | --- | --- | --- |
| free | 4266 | **78.1%** | 3.64 |
| class | 1202 | **78.5%** | 3.61 |

## Q4a  Why the servable share collapses: admissibility falls with depth

| chain depth | items | difficulty span | relabellings on screen | mean reachable options |
| --- | --- | --- | --- | --- |
| 1 | 49 | 1.02 – 5.29 | **78.2%** | 4.69 |
| 2 | 60 | 4.06 – 11.11 | **25.7%** | 4.38 |
| 3 | 58 | 8.06 – 16.52 | **13.5%** | 3.93 |
| 4 | 67 | 12.06 – 19.98 | **13.8%** | 3.67 |

## Q4b  What a session costs, and what it does not fix (FLU-OPCHAIN-01)

| family | systems | bank servable under one draw | 0.5-rungs left short of 5 items | worst key slot | per-item ceiling |
| --- | --- | --- | --- | --- | --- |
| free | 720 | **28.0%** (min 16.2%) | **87.8%** (bank as shipped: 0.0%) | 29.4% | 28.9% |
| class | 36 | **47.0%** (min 29.1%) | **76.2%** (bank as shipped: 0.0%) | 26.9% | 57.5% |

### The remedy for Q2, priced: recompute the rung per session

| | 0.5-rungs short of 5 items | mean served ladder span | serving it determines `geom` |
| --- | --- | --- | --- |
| bank as shipped | 0.0% | 1.02 – 19.98 | n/a (`geom` is fixed) |
| session subset, shipped rung | 87.8% | — | — |
| session subset, recomputed rung | **87.9%** | 1.07 – 17.20 | **45.3%** of served items |

Recomputing removes the drift exactly and does not restore the ladder. It also opens a channel: `difficulty` is served, and on 45.3% of items the served pair (chain length, recomputed difficulty) admits only one `geom` — so the client is told how many of the chain's badges are orientation badges.

### The residual: the same intersection attack, inside one session

| family | channel | sessions where the system is pinned exactly | median trial it happens on | attacker accuracy over the block |
| --- | --- | --- | --- | --- |
| free | onScreen | **0.0%** | — | **48.0%** |
| free | reveal | **100.0%** | **trial 6** | **91.3%** |
| class | onScreen | **2.5%** | **trial 4** | **66.2%** |
| class | reveal | **100.0%** | **trial 7** | **95.2%** |

40 sessions, 30-trial block, seeded. `onScreen` is the published F6 procedure — the client knows only that the machine's output was one of the five figures. `reveal` adds the post-commit reveal a learning block gives by design (§9 U6/U7), which says WHICH figure. Per-session generation stops the result carrying to the next child; it does not stop this child.
