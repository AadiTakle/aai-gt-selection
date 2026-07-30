# Do bursting and variety help each other, or cancel each other?

Method, results and claim boundaries for E-203. Reproduce with `pnpm exam:selection-integration`.

## 1. Why this had to be measured rather than merged

Two changes to Phase 1 routing were developed independently and land together:

- **D-201** caps what a question type can earn from tracked-inert metric shortfalls, and enables
  back-to-back bursts within a type. Its dominant effect is the cap: it took instruction screens
  from 26.9 to 15.6 per session, of which 24 of the 42 points came from the cap alone (E-201).
- **D-202** draws the engine seed per session, adds randomesque exposure control over the
  near-optimal types and items, and discounts a type the child has just been given. It took
  distinct types reached from 6 to 23 of 49 across 20 sittings (E-202).

They attack the same root cause — coverage pressure monopolising the type choice — from opposite
ends, and they both rewrite `nextType`. That makes the combination genuinely uncertain in both
directions:

- **They could over-correct.** D-201 compresses the spread of selection scores inside an area.
  D-202's tolerances are denominated in those same score points and were calibrated against the
  UNCAPPED spread. The same number is a proportionally wider net against a narrower spread, so the
  tolerance could end up outbidding the enforced metric shortfalls that gate the stop rule,
  producing selection that is effectively random and a battery that runs to its safety cap.
- **They could be complementary.** A burst makes each type-RUN longer while variety widens which
  types those runs draw from, so a session could plausibly get fewer instruction screens AND less
  repetition at once.

Neither branch's own measurement settles it, because neither was run against the other.

## 2. Method

`scripts/exam-selection-integration.ts`, over `scripts/exam-selection-harness.ts` — the same
harness `pnpm exam:instruction-cost` runs on. Sharing it is deliberate: a separately written
second harness is what produced the fault D-201 was about, where a burst policy was verified in a
simulation that selected over the research catalog's declared measurement lists and the engine's
default `CORE_METRICS` while a live session selects over the generated registry and the app's
`EXAM_ENGINE_OVERRIDES`. Different selection problems, different answers, nothing to reconcile them.

**The banks are browser-faithful.** Only registry-wired types exist; a type's metrics are the
generated registry's rather than the catalog's declared list; and an item's `content` is the served
index's, i.e. an option count and nothing else. `carryOptionCount: false` reproduces the index as
`dev` ships it, where `content` is `{}` and therefore nothing anywhere looks like a bounded choice.

**Four arms, and what defines each.**

| arm | option count on the index | `trackedCoverageCap` | burst | tolerances / recency |
| --- | --- | --- | --- | --- |
| `dev` baseline | no | uncapped | off | all zero |
| #28 alone | yes | 1 | ≤6 | all zero |
| #29 alone | no | uncapped | off | on |
| combined | yes | 1 | ≤6 | on |

Everything else is held matched: the same sittings, abilities, responder seeds, engine seeds, grade
band `4-5`, and 40-item cap.

**The seed varies between sittings in all four arms, including `dev`.** A constant seed would make
the `dev` arm one session replayed twenty times and would credit the per-session seed with the whole
of the variety difference. Varying it everywhere isolates the SELECTION-RULE change, which is what
is in dispute. `--as-shipped` re-runs `dev` and #28 on the constant seed they actually ship with.

**Two repetition statistics, because bursting moves them in opposite directions.** *Worst
within-session repeat* counts ITEMS of one type in the first 20 — the statistic D-202 reported, so
its figures stay comparable — and bursting necessarily raises it, since several items of one type is
what a burst is. *Worst return-to-type* counts ARRIVALS, so a burst of four is one arrival. The
second is the repetition a child experiences as "this game again".

**How "the stop rule still fires" is checked.** `isDone` short-circuits to `true` at the item cap,
so a session that merely ended is indistinguishable from one that concluded. Each of the stop rule's
evidence gates is therefore evaluated separately at exit, with the cap set aside: enforced metric
coverage, even area coverage, estimate stability, and type breadth.

## 3. Results — 80 sittings, the configuration a child sits

| | `dev` | #28 alone | #29 alone | combined |
| --- | --- | --- | --- | --- |
| instruction screens / session | 28.6 | **18.5** | 28.0 | 19.7 |
| items / session | 28.7 (16–40) | 29.2 (19–40) | **28.0** (16–40) | 30.4 (19–40) |
| distinct types reached (of 48) | 47 | 47 | 47 | 47 |
| distinct types / session | 18.1 | 14.9 | **19.8** | 17.1 |
| worst within-session repeat | 3.4 | 4.5 | **3.2** | 4.5 |
| worst return-to-type | 3.4 | 1.5 | 3.1 | **1.4** |
| distinct types per area | 4.5 | 3.7 | **4.9** | 4.3 |
| longest burst run | 1 | 5 | 1 | 5 |
| **enforced coverage complete** | **80/80** | **80/80** | **80/80** | **80/80** |
| concluded on evidence | 66/80 | **71/80** | 70/80 | 70/80 |
| sessions on the 40-item cap | 17 | **10** | 11 | 15 |

**The combination is complementary, not an over-correction — after retuning.** It keeps 87% of
#28's instruction saving (19.7 against 18.5, both against `dev`'s 28.6) while recovering most of the
construct breadth #28 gives up: #28 alone costs 3.2 distinct types per session against `dev`, and
adding #29 recovers 2.2 of them. Worst return-to-type is the lowest of all four arms, so a child
returns to the same game less often in the combination than in any single arm — which is the
complementarity hypothesis holding: longer runs drawn from a wider set of types.

**The residual cost belongs to the combination rather than to either part.** 15 of 80 sittings reach
the safety cap against 10 for #28 alone, so the combination gives back half of #28's improvement in
stop-rule reliability. It is still better than `dev`'s 17. Enforced metric coverage completes in
every sitting of every arm, so no arm makes the stop rule unsatisfiable; what varies is how long it
takes to get there.

**Distinct types reached across sittings is saturated at 47 of 48 in every arm and discriminates
nothing.** It is reported because it is the headline statistic D-202 is on record for, and its
saturation here is itself the finding — see §5.

## 4. The retune

`typeSelectionTolerance` moves from **1.0 to 0.5**. The constraint is a relationship rather than a
number: **it must stay strictly below `trackedCoverageCap`.**

Under D-201 the entire tracked-inert contribution to a type's score is bounded by
`trackedCoverageCap`, which is one metric's worth. A tolerance of 1.0 is therefore exactly the value
at which:

- a type carrying a tracked shortfall and a type carrying none fall within tolerance of each other,
  so the tracked signal stops deciding anything — cancelling the tilt the cap was deliberately left
  in place to preserve; and
- a type closing an ENFORCED shortfall (weight 2) falls within tolerance of a rival closing none but
  holding the full capped tracked gain, because 2 − 1 = 1.0.

Enforced coverage is what gates the stop rule, which is why the cost shows up as length. Swept over
80 sittings on the same grid, 1.0 costs **1.9 more items per session** than 0.5 and buys **0.3 of a
distinct type**. Below about 1/3 the knob does nothing at all, because no score gap is narrower than
the smallest recency step (`typeRecencyPenalty / typeRecencyWindow`).

`typeRecencyPenalty` (1.0), `typeRecencyWindow` (3) and `itemSelectionTolerance` (0.25) were swept
on the same grid and are at their measured optimum. **They are unchanged.** The sweep also shows
where the variety actually comes from under the cap: the recency discount buys most of it, because
it is targeted — it discounts only what was just served — while the tolerance is indiscriminate and
admits anything in range.

Reproduce the grid with `pnpm exam:selection-integration --sweep --sessions=80`.

## 5. What did not survive contact, and had to be said rather than fixed quietly

**D-202's fixed-rotation diagnosis does not reproduce under the browser's configuration.** With a
per-session seed, `dev`'s own selection rule already reaches 47 of 48 wired types across 20 sittings
there. The generated registry gives types much flatter metric lists than the research catalog does,
so the argmax ties far more often and the seeded tie-break varies the pick. D-202's "6 of 49" is a
true measurement of the ENGINE defaults, which is the configuration it was taken against, and it is
not what a child sits. The script reports both configurations for exactly this reason.

What a cohort meets **today** is the `--as-shipped` figure: on the one constant seed actually
shipped, 24 distinct types across 20 sittings, because every sitting draws identically. The
per-session seed is the part of D-202 that is doing the real work in production.

**A test was passing on the wrong margin.** D-202 pinned "across many sessions the first item is not
always the same type". Under the engine defaults that test passes only at a tolerance of exactly
1.0, and it passes because 1.0 admits a rival exactly one selection point behind — the same one
point that separates closing an enforced shortfall from closing none. First-item variety was being
bought directly out of the coverage signal. The underlying cause is in `pickArea`: `CORE_METRICS`
gives the four areas different enforced shortfall counts, so at item 0 one area wins on the first
tie-break and its coverage leader is the same type for every child. That is now asserted as the
limitation it is, and the property is asserted where it is real — with a flat enforced-metric
profile, which is the shape the app configures, the first type varies 21 ways across 30 seeds at
every tolerance including zero.

**A pinned constraint went slack and was re-pinned.** D-202's homing guard — the recency discount
applies only after an area has reversed — was held by D-023's convergence budget. With the coverage
cap in place the worst battery runs 47 items against a budget of 48 whether the guard is present or
removed, so that test passes either way and would no longer catch its removal. Whether the discount
applies while an area is homing is a property of selection, so it is now asserted on the served type
order directly, and the new assertions were verified to fail when the guard is removed. The
`itemSelectionTolerance < ageBandBias` pin was verified to still fail when the tolerance is raised
to 0.5.

## 6. Claim boundaries

Everything here is a **routing** measurement: which types are served, how many items that costs, and
whether the stop rule can still fire. The responder is a born-synthetic probabilistic child over
uncalibrated banks (`validated=false`), so nothing in this document speaks to score validity,
reliability, or fairness.

Instruction screens are **counted, never priced**. No per-type response-time data exists in this
repository — `app.exam_item_response` holds zero rows and the harness fakes `M-RTFIRST` as a flat
fraction of `M-RT` for every type (E-201). If a screen is cheap relative to a question, then fewer
screens is a smaller improvement than it reads.

The four arms differ only in the knobs listed in §2. They are not a controlled comparison of
anything else, and 80 sittings is enough to separate effects of a few items per session but not
effects of a fraction of one.
