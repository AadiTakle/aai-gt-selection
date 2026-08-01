# VER-MORPHO-01 — Gate A (U5), and the anti-leak and reading-load audits

**Status:** Measurement report for `STAGE2_QUESTION_DESIGN.md` §9.2 unit U5, on the two banks unit
U3 produced. **Gate A is not cleared.** A2 and A3 pass; A1 and A4 fail, and §9.4's stop rule fires.
Per that rule the track stops here: no renderer (U6) and no verifier (U7) were built.

**Requirements served:** R5, R6 (measure growth without a gifted-student ceiling — this is the
readout that requirement rests on), R7 (auditable and falsifiable — every figure below is a
command), R8, R10 (state the boundaries of every conclusion), H1, H6, H10.

**Evidence used:** E-074 (the bank/served-item contract), E-075 and E-076 (answer-key derivability),
E-094 (key-position balance), E-095 (the recovery ladder by block length, which §7 below is measured
against) and E-200 (the guessing-floor defect and the loop attribution, which §4 turns on). **No new
E or D ID is claimed.** §9.3 puts the governance unit (U9) last and once; minting evidence IDs here
would pre-empt it.

**In scope:** Gate A's four checks on `VER-MORPHO-01` in both persistence modes, plus the three U3
audits that are properties of the banks rather than of the estimator — the answer-key leak scan, the
reading demand, and the English-collision screen.
**Out of scope:** any change to the estimator, readout, harness or any other type's artifacts;
difficulty calibration; the renderer, the verifier, and any wiring into the live block; Gate B.

**Claim boundary, before any number.** Everything here is born-synthetic against banks carrying
`validated: false` and `syntheticOnly: true`. No output is evidence about a real child. Clearing
Gate A would not be clearing the gate D-S2-3 made binding (§4.1.5), and Gate A is not cleared here.
Whether this type loads on verbal rather than fluid reasoning is **A-S2-3**, is untested, and §12
says what would test it.

---

## 1. The answer

**Gate A fails on A1 and A4, and the bank is measurably not the cause of either.**

At the four-option responder floor that is exact for this bank, over eight seeds and 3,200 simulated
children per cell:

| check | verdict | observed |
| --- | --- | --- |
| **A1** static-child null | **FAIL** | fitted λ̄ = **0.0166 ± 0.0012**, 14.0 Monte-Carlo SEs from zero, for a cohort that learned nothing |
| **A2** false-positive rate | **PASS** | **18.2%** of static children read `above`, against a 30.9% nominal band rate |
| **A3** no saturation | **PASS** | **0** bank-limited saturations at every standing from 6 to 17, and no block ever exhausted the pool |
| **A4** recovery sanity | **FAIL** | r = **0.287** against E-095's 0.448; mean posterior SE **0.062** against 0.047 |

Both arms return identical figures to four decimal places, for the reason §8 gives.

**The attribution is the point of the report, and it is decisive.** Run the same λ_true = 0 cohort
through the same estimator on an *idealised 0.5-point grid with no bank involved at all*, and it
fits λ̄ = 0.0176 ± 0.0036. Run it on `FLU-OPCHAIN-01` at matched settings and it fits
0.0171 ± 0.0012. Paired over the same eight seeds, this bank minus `FLU-OPCHAIN-01` is
**−0.0005 ± 0.0006 (t = −0.84)** — no difference. Freeze the served difficulty so the fit no longer
chooses what it sees next, and the same misspecified estimator on the same bank returns **0.0019**.

So the manufactured climb is the estimator-plus-targeting-loop property E-200 already isolated with
no bank involved, arriving here unchanged. §9.4's stop rule was written on the premise that an A1
failure indicts the bank — "a bank that manufactures λ from a static child cannot be fixed
downstream". That premise does not hold in this case, exactly as
`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §10 found for `FLU-OPCHAIN-01`. **Whether the stop rule should
fire anyway is the owner's call.** It is flagged here rather than quietly worked around, and the
track was stopped rather than tuned until it passed.

A4 has the same shape. On this bank's actual grid, 30-trial recovery is r = 0.287; on the bank-free
idealised grid at the same floor and the same eight seeds it is **0.288**, and on the wired exemplar
`FLU-MATRIX-01` it is **0.226**. **This bank has arrived at the bank-free bound.** There is no bank
on the other side of it, so the 0.161 shortfall against E-095 is the four-option guessing floor and
the 30-trial block length, neither of which a bank can change.

**What did clear, and is worth having.** A3 passes with zero bank-limited saturation at every
standing tested, which `FLU-OPCHAIN-01` did not manage (1, 7 and 10 bank-limited at standings 13–16
on the older bank per `STAGE2_BANK_RECOVERY_MEASUREMENT.md` §8, against 0 everywhere here). And the
answer-key leak scan in §9 is clean at a materially stronger bound than the first type reached.

---

## 2. What was run, and how to re-run it

```
bash research/exam-question-types/ver-morpho-gate-a-runs.sh [output-dir]   # ~3 minutes
node research/exam-question-types/ver-morpho-gate-a-report.mjs [output-dir]
node research/exam-question-types/generators/VER-MORPHO-01.mjs             # §9, §10 audits
node research/exam-question-types/generators/check-VER-MORPHO-01.mjs       # U4, re-derives §9
```

Every figure comes out of those four commands. The runner contains no measurement logic; it calls
`pnpm exam:block-harness` with existing flags. Two conventions hold throughout.

- **`--guessing 0.25` is the simulated child's floor**, because this bank is 468/468 four-option
  (§3.3's tap-one-of-four, borrowed from `VER-CLOZE-01` / `VER-RELPAIR-01`), so 0.25 is exact for
  it. The estimator is left at the shipped `DEFAULT_GUESSING = 0.2` in both roles, because that is
  the configuration a real administration would run. §5 reports the correctly-specified variant and
  the five-option variant so the cells line up with the published `FLU-OPCHAIN-01` figures.
- **Everything else is the harness default:** 400 children per cell, λ ~ N(0.06, 0.03²),
  θ0 ~ N(10.5, 3²), handover-noise SD 1.5, slope 1.0, target offset +1.

**Eight seeds everywhere it matters.** `STAGE2_BANK_RECOVERY_MEASUREMENT.md` §9 found the harness's
default seed unrepresentative in both directions, with single-seed cells carrying roughly ±0.04 of
noise on `r` — larger than several of the differences reported here.

---

## 3. A1 — the check that earns its keep

λ_true = 0 for every child. Any fitted climb is manufactured by the pipeline.

| pool | null λ̄ | ± SE | SEs from 0 | A1 |
| --- | --- | --- | --- | --- |
| ideal 0.5-point grid, **no bank at all** | 0.0176 | 0.0036 | 4.9 | fails |
| **`VER-MORPHO-01`**, both arms | **0.0166** | **0.0012** | **14.0** | **fails** |
| `FLU-OPCHAIN-01`, matched settings | 0.0171 | 0.0012 | 13.8 | fails |
| `VER-MORPHO-01`, served difficulty **frozen** | 0.0019 | 0.0024 | 0.8 | passes |

| paired contrast, 8 seeds | mean | SE | t | reading |
| --- | --- | --- | --- | --- |
| `VER-MORPHO-01` − `FLU-OPCHAIN-01` | −0.0005 | 0.0006 | −0.84 | no difference |

The frozen-target row is the mechanism, and it is E-200's: the estimator assumes no guessing floor
where the responder has one, reads lucky successes as ability, `nextTargetTheta` aims higher, the
served difficulty climbs across trials, and the fit reads its own walk back as learning. Take the
loop away and the same fit on the same bank returns zero. **Nothing a bank contains can intervene in
that loop**, which is why the two Stage 2 banks and an idealised grid all land within one
Monte-Carlo SE of each other.

**Stopping rather than tuning.** Two knobs would have made A1 pass and both were rejected. Running
the responder at the harness's default `--guessing 0` returns λ̄ = 0.0028 ± 0.0021 and a nominal
PASS, but a floorless responder is a claim that a child who knows nothing scores zero on a
four-option item, which is false. Correcting the estimator to the true 0.25 floor in both roles
improves it to 0.0113 ± 0.0010 and still fails, and is in any case a change to
`packages/exam-scoring`, not to this type.

---

## 4. A2 — would the readout call these non-learners fast?

**18.2%** of the static cohort reads `above`, against a **30.9%** nominal rate. A2 passes.

This is the check to be least pleased about, and the reason is the one
`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §3 sets out: a bank with a tighter posterior converts
`indeterminate` refusals into verdicts, and while the contamination floor is non-zero a share of
those verdicts are wrong. A2 passing here is not evidence that 18.2% of real children would be
misread; it is evidence that the readout does not exceed its own nominal rate on a cohort the
pipeline is already manufacturing a climb for. The honest reading of A1 and A2 together is that
**roughly one static child in five would be called an above-average learner**, and A2's pass
condition simply does not test that.

---

## 5. Comparability — the same bank at other responder floors

| responder floor | null λ̄ | ± SE | false `above` | recovery r | A1 |
| --- | --- | --- | --- | --- | --- |
| **0.25 — four options, exact for this bank** | **0.0166** | 0.0012 | 18.2% | 0.287 | FAIL |
| 0.25, estimator corrected to 0.25 in both roles | 0.0113 | 0.0010 | 13.2% | 0.303 | FAIL |
| 0.20 — five options, exact for `FLU-OPCHAIN-01` | 0.0088 | 0.0010 | 13.0% | 0.332 | FAIL |
| 0.00 — the harness default, 1 seed | 0.0028 | 0.0021 | 4.0% | 0.465 | pass |

The 0.20 row is the one to compare against published figures, and it lands on top of them:
`FLU-OPCHAIN-01`'s measured 8-seed null λ̄ at that floor is 0.0097 and its recovery is 0.332
(`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §3.1, §5); this bank returns 0.0088 and 0.332. **The two
Stage 2 banks are interchangeable as far as the estimator is concerned**, which is the expected
result and is worth having as a number: it means the four-option format, not the morphology, is what
moves the floor from 0.0088 to 0.0166.

---

## 6. A3 — headroom, and the one place this bank beats the first one

§1.1(c) asks for ≥6 scale points of usable headroom above `standing + 1`. A3 separates the two
reasons a child pins at the top of the pool: the **bank** stopping below what the targeting rule
asked for, which is the §1.1(c) defect, and `nextTargetTheta` clamping the projection to the
20-point scale, which no bank can fix. Fastest simulated learner (λ = 0.15), 40 children per cell,
population spread collapsed so `standing` is exactly the swept value.

| standing | bank-limited | scale-limited | blocks exhausted |
| --- | --- | --- | --- |
| 6 | 0 / 40 | 0 / 40 | 0 |
| 8 | 0 / 40 | 0 / 40 | 0 |
| 10 | 0 / 40 | 0 / 40 | 0 |
| 11 | 0 / 40 | 1 / 40 | 0 |
| 12 | 0 / 40 | 2 / 40 | 0 |
| 13 | 0 / 40 | 8 / 40 | 0 |
| 14 | 0 / 40 | 21 / 40 | 0 |
| 15 | 0 / 40 | 36 / 40 | 0 |
| 16 | 0 / 40 | 40 / 40 | 0 |
| 17 | 0 / 40 | 40 / 40 | 0 |

At the realistic population the harness simulates, 13 of 100 fastest learners truncate and **all 13
are scale-limited**; none is bank-limited, and no block ever ran out of items.

**Bank-limited truncation is zero at every standing**, where `FLU-OPCHAIN-01` recorded 1, 7, 10 and
7 at standings 13–16. Two things bought that, and only one of them is a design decision: this bank
carries **twelve items per 0.5-point rung rather than six**, which is the density lever
`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §5 named and did not test; and its top rung happens to sit at
19.99 rather than 19.98, which narrows the [top rung, 20.00) window in which a projection is charged
to the bank. The second is luck and should not be claimed as anything else.

**The ceiling itself is unchanged and is not a bank problem.** From standing 16 the whole fast cohort
truncates, and it truncates against the 20-point scale. §1.1(c) needs the pool to reach
`standing + 7`, which on a bounded [1, 20] scale exists only for standing ≤ 13. Deepening the
composition would not move this: the design already reaches difficulty 19.99 at depth 4, and a depth
5 would land above the scale, not above the ceiling. **The remedy, if one is wanted, is a scale
change or a targeting-rule change.** Neither is in scope here.

---

## 7. A4 — the recovery ladder on this bank's actual grid

Mean over 8 seeds, four-option responder floor.

| trials | recovery r | mean posterior SE | null λ̄ | fitted-λ SD | E-095 r | E-095 SE |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | 0.059 | 0.143 | 0.0102 | 0.0393 | 0.066 | 0.138 |
| 15 | 0.166 | 0.117 | 0.0177 | 0.0732 | 0.183 | 0.101 |
| **30** | **0.287** | **0.062** | **0.0166** | **0.0707** | **0.448** | **0.047** |
| 45 | 0.456 | 0.036 | 0.0135 | 0.0568 | 0.746 | 0.026 |
| 60 | 0.610 | 0.024 | 0.0109 | 0.0453 | 0.862 | 0.017 |

And the pool comparison at 30 trials, same floor, same eight seeds:

| pool | recovery r | mean posterior SE |
| --- | --- | --- |
| ideal 0.5-point grid, no bank | 0.288 | 0.062 |
| **`VER-MORPHO-01`** | **0.287** | **0.062** |
| `FLU-OPCHAIN-01` | 0.278 | 0.062 |
| `FLU-MATRIX-01`, the wired exemplar | 0.226 | 0.070 |

E-095's column was measured against a child with **no** guessing floor, so it is a ceiling rather
than a target for any four-option bank. A4's failure is therefore a statement about the estimator at
30 trials with a realistic floor, not about this grid — the grid is already at the bank-free bound.

**The floor does not fall with block length and the posterior SE does.** From 30 to 60 trials the
manufactured rate goes 0.0166 → 0.0135 → 0.0109 while the posterior SE more than halves,
0.062 → 0.024, so the systematic term roughly doubles as a fraction of the random one. Block length
buys down random error and leaves the systematic error where it is — the same conclusion E-200 and
`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §4 reached from other directions.

**The figure U1's power script needs.** The fitted-λ SD on this bank at 30 trials is **0.0707**, not
the 0.06 §4.1.3 estimates. On that section's own arithmetic (n per arm ≈ 15.7/*g*²) a given
*absolute* λ separation corresponds to a standardised effect smaller by 0.06/0.0707, so the sample
size for the same absolute separation rises by a factor of **(0.0707/0.06)² ≈ 1.39** — for the
smallest separation §4.1.3 would ship on, roughly 88 per arm rather than 63. That is arithmetic on
the document's own formula, not a new power analysis, and §4.1.3 already instructs U1 to recompute
rather than inherit.

---

## 8. The two arms return identical numbers, and that is expected

Every cell above is the same to four decimal places in `consistent` and `perTrial`. That is not a
rounding statement and it is not a defect.

The two banks are equated item-for-item on every scored property and differ only in which
pseudo-syllables spell the morphemes. The harness's simulated child responds to `difficulty` and
nothing else — there is no hidden system in the simulator to persist or scramble — so the two arms
present it with the same difficulty vector, and `itemId` enters only as a tie-break in
`selectNextNovelItem` when two candidates are exactly equidistant from a continuous target, which is
a measure-zero event. `STAGE2_BANK_RECOVERY_MEASUREMENT.md` §7 established this for `FLU-OPCHAIN-01`
by replaying the administration path; it reproduces here for the same structural reason.

**What that establishes, at its real strength:** the pipeline does not manufacture a between-arm
difference out of the arm label. **What it does not:** anything about whether the type measures
learning. A simulator's climb is written by the simulator, so recovering a between-arm difference
here would have been a bug. **At Gate A the scrambled bank is not an independent check — it is
arithmetically identical to A1.** Its value is entirely at Gate B, with real children, where the two
arms can finally differ in the only way that matters. Building it now was still correct: §4.1.1's
argument that a control from a different code path would confound the contrast stands.

---

## 9. The answer-key leak audit (U3(c)) — and the bound this type holds to

`FLU-OPCHAIN-01` shipped with the key recoverable by brute force on **11 of 234 items (4.7%)** before
its second anti-leak invariant was added, and its post-fix guarantee is "at least two options survive
the brute force" — a bound of 50% against a 20% chance floor. That was the floor to beat, and the
invariant was built into this generator from its first commit rather than added after a scan.

The attack, stated exactly: a client holding `content` enumerates every form-to-meaning mapping —
every ordered assignment of `depth` distinct meanings to the word's positions, at most
6·5·4·3 = 360 — and asks which options survive. Measured on the shipped banks, and re-derived
independently by `check-VER-MORPHO-01.mjs` rather than trusted from the generator:

| difficulty slice | items | key fully determined | mean viable options | best content-only attack |
| --- | --- | --- | --- | --- |
| Q1 (1.01–5.62) | 117 | **0** | **4.00 / 4** | 25.0% |
| Q2 (5.62–10.50) | 117 | **0** | **4.00 / 4** | 25.6% |
| **Q3 (10.50–15.38), the worst slice** | 117 | **0** | **4.00 / 4** | **28.3%** |
| Q4 (15.38–19.99) | 117 | **0** | **4.00 / 4** | 27.2% |

Identical in both arms.

- **The exact count: 0 of 468 items in each arm are fully determined by `content`**, against 11 of
  234 on the first version of the first type.
- **The graded figure: all four options remain viable in every slice, including the worst.** The
  elimination attack — brute-force the mappings, delete what nothing reaches, guess among the rest —
  scores exactly the **25.0% four-option chance floor** on every item in the bank. That is the bound
  the taxonomy was designed around: the four distractor classes are closed under relabelling, which
  is why `omission`, `first_step_only` and `identity_copy` were deliberately given up (each produces
  a picture reachable only by a *shorter* morpheme sequence, so a client can prove it is not the key
  and delete it).
- **A stronger attack, and its residue.** Weighting options by how many mappings point at each and
  taking the argmax does better than elimination. The key is **never** the unique modal option
  (0 of 468, an asserted invariant), but a modal *distractor* still carries a posterior above 25%:
  the best content-only attack averages **26.5%** across the bank and **28.3%** in the worst
  difficulty slice, with a per-item maximum of 41%. That residue is real, it is reported rather than
  rounded away, and it is bounded — a client running the strongest attack available beats blind
  guessing by about three points, not by twenty-five.
- **The picture-to-word direction is leak-free by proof rather than by measurement.** Every option
  word is the same length and made of distinct forms, so each is the image of exactly the same
  number of mappings and all four vote counts are equal by construction. All 25.0% cells above come
  from that half of the bank.
- **The direction lock, which none of the above measured, and which was the worst leak this bank
  had.** Every figure in this section brute-forces the mappings, and the strongest attack on this
  bank needed no brute force at all. `buildBank` advanced the key-slot cursor and the direction
  cursor once per item each, so `keyPosition = n mod 4` and `direction = n mod 2` — and `n mod 4`
  determines `n mod 2`. In the shipped bank the answer was therefore **never in B or D on a
  word→picture item and never in A or C on a picture→word one**, and `content.direction` is served.
  Reading one field and always tapping the same one of the two live slots scored exactly **50.0%**
  on all 468 items against the 25.0% floor. `STAGE2_ANTILEAK_COMPARISON` §7.3 found it; the same
  cursor also made the slot recoverable from the item's rank in the bank's difficulty order, at
  59.0% directly and 84.0% cross-validated once the served covariates were added (§7.2).

  Both are the one cursor, so both went with it. The key's slot is now allocated over the finished
  lever plan as a balanced multiset inside each (direction, depth) cell and permuted there from the
  seeded stream, with the remainder carried per direction. The bank in this report is the rebuilt
  one. Every cell now sits within one item of exact balance —

  | direction | A | B | C | D |
  | --- | --- | --- | --- | --- |
  | `wordToPicture` (234 items) | 58 | 59 | 59 | 58 |
  | `pictureToWord` (234 items) | 59 | 58 | 58 | 59 |

  — so the lock is unrepresentable rather than merely absent from this draw. Re-measured with the
  same probe, the covariate attack falls from **52.6% to 25.6%** and the difficulty-ordinal attack
  from **84.0% to 16.0%**, both against the 25.0% floor. Nothing above this bullet moved: the fix
  permutes which slot holds the key and changes no picture, no word, no difficulty and no slate,
  and Gate A reproduces digit for digit.
- Two further content-computable shortcuts are closed and asserted: the key is never the unique
  option that moved furthest from the reference picture, and in the picture-to-word direction all
  four candidate words carry the same morpheme count and the same character count, so counting
  syllables reveals nothing.
- The hidden system never ships: it lives under `answer.system`, which `servedItemSchema` omits
  wholesale, and `content` is asserted to name no meaning, no mapping, no verdict and no arm.

**The checker has teeth.** Seven injected defects — a moved key slot, a corrupted form-to-meaning
mapping, an understated difficulty, a mislabelled partial rule, an option made unreachable by
relabelling, a K-1 age band, and one item's `content` copied over another's — produced 35 failures
across independent checks, and the restored banks pass.

### 9.1 What the repo's own QA tools said, including the one that found a real defect

`qa/leak_scan.mjs`, `qa/audit_banks.mjs`, `qa/dupe_fingerprint.mjs` and `qa/density_check.mjs` were
run over the banks. Three verdicts, and the middle one was a genuine defect that is now fixed.

**`leak_scan.mjs`: no NAMED leak, no COMPUTABLE leak, one NEEDS REVIEW flag — reviewed and
dismissed.** The flag is a name heuristic firing on `content.targetPicture`, which appears only on
picture→word items. It is the *stimulus*: the picture the child is asked to name. Removing it would
leave nothing to answer. It does not encode the key, because the key is which of four words denotes
it and that requires the hidden mapping; the brute-force audit above is the actual test of that
claim and it is clean. The field was not renamed, because renaming to dodge a heuristic would hide
the question rather than answer it.

**`audit_banks.mjs` found 13 of 468 items sharing a `content` fingerprint with another item — and
in every case the pair carried different stated difficulties.** That is worse than redundancy on two
counts: `learning-block.ts` forbids repeats because a re-served item measures recall of that item,
and two items differing only in `itemId` are a repeat wearing a new label; and pricing the same
stimulus at two difficulties is precisely the §1.1(d) structured labelling error. All thirteen sat
at low depth, where the picture space is small enough for two independent draws to collide.

**Fixed by construction rather than by pruning.** The bank builder now carries a
`semanticFingerprint` of every item it has emitted — direction, reference picture, key slot,
morpheme sequence and option denotations, with the spelling projected out — and redraws on a
collision, carrying the redraw in the seed so items stay byte-reproducible from their own
provenance. The fingerprint omits the spelling deliberately: a spelling-sensitive one would let the
two arms redraw at different points and contain different items, which would break the equating the
gate rests on. Both arms are now **468 / 468 distinct content fingerprints**, and
`check-VER-MORPHO-01.mjs` asserts it so the property cannot regress silently. Every figure in this
report was re-measured after the fix and none of them moved, because the harness reads `difficulty`
and the difficulty vector was unchanged.

**`audit_banks.mjs` also warns that the ceiling is structurally indistinguishable from the floor.
That one is a tool limitation, and it was checked by hand rather than waved away.** The tool
compares numeric fields it can find in `content`, and the only one it finds here is
`stemPicture.count`, which is deliberately random. The difficulty ladder is carried by the *length*
of the word, which lives in a differently-shaped field in each of the two directions. Measured
directly, difficulty ≥ 16 against difficulty ≤ 8: morphemes per word 3.83 vs 1.33 (**Cohen's
d = 5.8**), number morphemes 1.94 vs 0.30 (**d = 4.5**), word characters 18.3 vs 8.3 (**d = 5.8**).
The ceiling is real.

**`density_check.mjs`: OK**, minimum window count 30 at the floor against a threshold the other
verbal banks clear at 8.

---

## 10. The reading demand this design was built to

This is the only Stage 2 type whose stimulus is text, and D-017 records that the instrument is
text-only with no audio, so the demand cannot be offloaded. The figure to hold the design to:

| band | max word | characters | syllables | words read per trial |
| --- | --- | --- | --- | --- |
| K-1 | **not served** | — | — | — |
| 2-3 | 3 morphemes | 11 | 3 | 2 (word→picture) / 5 (picture→word) |
| 4-5 | 4 morphemes | 15 | 4 | 2 / 5 |
| 6-8 | 5 morphemes | 19 | 5 | 2 / 5 |

Every one of those characters is a closed-syllable short-vowel CVC — the first pattern taught in
systematic phonics and the most reliably decodable string in English orthography. The letter sets
exclude c, g (as an onset), h, j, q, w, x and y, so no digraph (sh/ch/th/wh/ph/qu) and no soft c or
soft g can form; `r` never closes a syllable, so no r-controlled vowel appears; there are no
consonant clusters, no silent `e`, no doubled letters, and onset never equals coda.

Four further decisions all spend budget on the same hazard:

1. **Morphemes are hyphen-separated.** Segmenting an unfamiliar string is a real skill and it is not
   the construct — the construct is the morpheme-to-meaning mapping and the composition rules — so
   the segmentation is given away and the child decodes syllables rather than a 15-letter blob.
2. **The whole bank runs on ten forms**, so the decoding vocabulary is fixed and small.
3. **Those ten are pairwise at edit distance ≥ 2**, so no two morphemes are told apart by a single
   letter and no visual-discrimination load rides on the score.
4. **The stem is never load-bearing.** All four options in an item share one `kind`, so the stem
   cannot discriminate; it is present because a word needs one, and the reference picture shows what
   it denotes anyway.

In the picture-to-word direction the five strings are all the same length and differ by one
syllable, so the comparison is sub-lexical rather than five separate decodings. **K-1 is excluded
outright**, not capped: Grade-1 decoding accuracy is around 34% (brainlift 6.7), and §3.3 and §4.3
both prescribe excluding the band where a design floors, as the catalog already does for
`SPA-VIEW-01` and `SPA-SCENE-01`.

**What this does not do.** It reduces the decoding demand; it does not remove it, and no design can
while the instrument is text-only. A slow decoder in band 2-3 still reads eleven characters under
time pressure that a `FLU-OPCHAIN-01` child does not. Whether the residue is large enough to appear
in λ is not answerable synthetically; §12 names the covariate that would answer it.

---

## 11. Prior-knowledge resistance, verified rather than assumed

§3.3 claims this design resists prior knowledge best of the four because the lexicon is invented.
That claim is checkable and was checked, because the risk it hides is specific: a form that
accidentally *is* English, or that sounds like the English word for its own meaning, hands a strong
reader a shortcut past the induction.

- The form space is the 845 CVC strings over the declared letter sets. **386 of them — 46% — are
  entries in the 234,456-word `web2` dictionary.** Screening was not optional.
- Three screens run over the whole space: not in `web2`; not an English affix (`non`, `mis`, `dis`,
  `let`, `kin`, `ish`, …); and not within edit distance 1 of any of 49 English words that *name* one
  of the six meanings (`one`, `two`, `few`, `big`, `wee`, `not`, `nil`, `nix`, `doer`, `get`, …).
  276 forms survive.
- **The ten forms in play are `dez`, `fov`, `kib`, `pav`, `pef`, `pog` (affixes) and `saz`, `tas`,
  `vaf`, `zam` (stems).** All ten pass all three screens. The closest pair is `dez`/`pef` at edit
  distance 2.
- `check-VER-MORPHO-01.mjs` re-runs the screens against a **second, independently typed word list**
  as well as the frozen dictionary enumeration.

**No generated form collides with real English morphology.** The residual risk that survives is
narrow and worth stating: the screen is against orthographic forms, not pronunciations, so a form
that is a homophone of an unrelated English word through some spelling this alphabet cannot produce
would not be caught — and none of the ten is such a case on inspection. The screen also cannot rule
out collisions in a language other than English, which matters for a multilingual applicant pool and
is not addressed here.

---

## 12. The construct claim is open, and this is what would close it

**A-S2-3 — that `VER-MORPHO-01` loads on verbal rather than fluid reasoning — is untested, and
nothing in this report bears on it.** §3.3 states the tension plainly: push the abstraction far
enough to guarantee novelty and the task stops being verbal and becomes figural rule induction. What
the build did was hold the *mappings* semantic — negation, number, size and agent/patient role, the
categories §3.3 names and the categories natural morphology encodes — and hold the *forms* readable.
That is a design stance. The worry it does not answer is that a morphological transformation task on
invented words is the same rule-induction ability as `FLU-OPCHAIN-01` in different clothing, and the
structural similarity between the two generators is itself evidence for the worry, not against it.

Five things would distinguish them empirically. The first two adjudicate; the rest are cheap
corroboration.

1. **Differential correlation with the two Stage 1 standings, which every child already supplies.**
   A verbal-loading type predicts r(λ_VM, θ_verbal) > r(λ_VM, θ_fluid), and `FLU-OPCHAIN-01` should
   show the reverse. The two dependent correlations are compared with Steiger's z. This costs no
   extra administration because both standings are settled in Stage 1 before the block runs — which
   is the reason to prefer it. Its weakness is that θ_verbal is itself reading-loaded, so a positive
   result is consistent with "this measures reading" as well as "this measures verbal reasoning";
   item 4 is what separates those.
2. **Cross-type λ correlation in children who complete both blocks.** If λ_VM and λ_FLU correlate at
   or near their reliability ceiling, the two types measure one ability and the area labels are
   decoration. This is the test that actually addresses the worry, and it is the expensive one: at a
   30-trial posterior SE of 0.062 a per-child λ correlation is close to uninterpretable, so it has
   to be run on the **per-trial mixed-model slope** (`correct ~ trialIndex * type + difficulty +
   (1 + trialIndex | child)`) rather than on fitted λ — the same model class §4.1.3 already
   specifies for Gate B, which means the instrument exists.
3. **Minimal-pair accuracy against non-minimal-pair accuracy, within child.** If the type is
   morphological, competence should show up specifically where two options differ by one morpheme's
   worth of meaning, because that is where a whole-word association fails and a decomposition
   succeeds. The bank carries this contrast as a per-option field (`attributesFromKey`) on every
   item, so it is a free within-block analysis. `FLU-OPCHAIN-01` has no analogue. §3.3's failure
   mode (a) is precisely this contrast failing to appear.
4. **The direction asymmetry, which is also the decoding covariate.** The bank carries both
   word→picture and picture→word items, balanced within every 0.5-point rung, so the recognition /
   production contrast is estimable within child. A lexical process predicts an asymmetry; a
   domain-general induction process predicts none. Crossed with grade band and with first-response
   latency on the opening trials, the same contrast is what would show a decoding floor: if the
   picture→word deficit is concentrated in band 2-3 and tracks reading fluency, the type is
   measuring decoding and §10's mitigations were insufficient.
5. **An independent vocabulary measure.** §3.3's failure mode (b): λ correlating strongly with
   crystallized vocabulary would say the design's central claim — that an invented lexicon escapes
   the verbal-crystallized confound — is false after all.

**None of these is available without children**, and 1 and 2 are the two that adjudicate. Until they
run, the honest label for this type is *a verbal-form induction task whose construct loading is
unestablished*, and the area tag in the catalog should be read as where it was built to sit rather
than as a measured property.

---

## 13. Boundaries, and what remains open

**What this report establishes.** The two banks are well-formed against the repo's own contract; the
answer key is not derivable from `content` at a bound of 0 fully-determined items and a 28.3%
worst-slice best attack against a 25.0% floor; the difficulty ladder is monotone in every declared
lever and does not saturate; and the pipeline's manufactured λ on this bank is indistinguishable
from what it manufactures with no bank at all.

**What it does not.**

- That the type measures learning in children. Gate B, ~128 children, and no synthetic run
  substitutes.
- That the type is verbal (A-S2-3, §12).
- That the reading mitigations in §10 are sufficient (§12 item 4).
- That the residual 0.0166 can be removed. This isolates it as an estimator-plus-loop property; it
  does not cost a remedy, and E-200 already rejected an estimated 3PL floor as unidentifiable from
  30 dichotomous responses.
- That twelve items per rung beats six at 45–60 trials. That was
  `STAGE2_BANK_RECOVERY_MEASUREMENT.md` §5's untested conjecture and this bank adopts it without
  testing it — the comparison would need the harness's ideal grid re-run at `perRung = 6`, which is
  a change to a hard-wired constant in a shared script and out of scope here.

**If the owner accepts these figures, the governance record would need** (all deferred to U9, none
done here, per §9.3's "last and once"): an E-family entry for the Gate A table and the measured
contamination floor of 0.0166 ± 0.0012 at 30 trials; the fitted-λ SD of **0.0707** for U1's power
script; A-S2-3 recorded against §12's five discriminators; and a decision on whether §9.4's A1 stop
rule fires when the failure is demonstrably not attributable to the bank.

**No type is recorded as gate-passing.** Both banks ship `validated: false` and `syntheticOnly:
true`, neither is wired into the live learning block, and Gate B has not run.
