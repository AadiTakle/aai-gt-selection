# Instruction cost in Phase 1: what was measured, what was not, and what would settle it

**Requirements served:** R11 (a screening instrument that can run at applicant scale — a child's time
is the scarce resource, and a battery that spends most of it on instructions spends the applicant's
attention rather than measuring), R9/R10 (claim boundaries — everything below is a count of screens,
never a claim about seconds), R7 (auditability — every figure is reproducible by one command).

**Evidence:** E-201. **Decision:** D-201.

**Reproduce:** `pnpm exam:instruction-cost`.

---

## 1. The complaint, and the metric it implies

The owner ran the adaptive battery and reported that Phase 1 questions felt "too instantaneous". The
underlying problem is not the questions' difficulty. Every question type opens with an instruction the
child has to read before they can answer anything, and the engine rotated types on every single item,
so a child paid that fixed cost once per question. What they experienced as instantaneous questions
was a session that was mostly instructions.

So the quantity to reduce is **instruction screens per session**: the count of served items whose type
differs from the item before them. Item one always costs a screen; the second item of a run costs
none. That is a count this repository can produce exactly, and it is the number this document reports.

**What is deliberately not reported: seconds.** Pricing a screen against a question requires the
observed `M-RT` / `M-RTFIRST` split per type, and that data does not exist — §5.

## 2. Why bursts never fired in a browser

Bursting — serving several consecutive items of one type so the instruction is read once — was
implemented, and simulation showed a six-item burst adapting properly inside itself. It never once
fired in a browser. Three independent causes, all of which had to be fixed:

1. **The selection index carries no stimulus.** A browser selects over `/api/exam-items?index=1`, whose
   `content` was `{}` so the whole pool could be fetched without megabytes of stimulus. Burst
   classification asks "is every item of this type a bounded choice?", which it answered off
   `content.options` — absent for every item in the index. So *every* type was ineligible, whatever
   else was true. Fixed by sending an option **count** (not the options) with the index.

2. **The eligibility rule disqualified types on a property that does not predict what it claimed.** It
   excluded any type declaring `M-PATH`, `M-EFF`, `M-PLANFUL` or `M-IDEAFLU`, reasoning that a type
   reporting on a solution process must have a slow multi-move response. §3.

3. **Metric-coverage pressure monopolised selection.** The six types the child met —
   `QUANT-MIX-01`, `SPA-XPLANE-01`, `GB-WORDFORGE-01`, `CX-check-01`, `GB-EXPLORE-01`,
   `VER-SEQUENCE-01` — are exactly the type in each area declaring the most tracked process
   measurements. Five of the six are constructed-response (zero of their items offer an option list),
   so they can never be burstable under any defensible rule. §4.

**A fourth cause, and the reason the first three shipped undetected:** the simulation that "proved"
bursting selected over the research catalog's declared measurement lists and the engine's default
`CORE_METRICS`, while a live session selects over the generated registry's per-type metrics and the
app's `EXAM_ENGINE_OVERRIDES`, which replaces `coreMetrics` wholesale. Those are different selection
problems with different answers. The browser's configuration now lives in
`apps/web/src/lib/exam/engine-config.ts`, free of browser globals precisely so an offline harness can
import the real thing, and `scripts/exam-instruction-cost.ts` does.

## 3. The new eligibility rule

A type is burstable when both hold, both read off its own bank, item by item:

1. **every** item offers a bounded choice of at most `burst.maxOptions` options; and
2. no item carries a field that paces or time-bounds the response — `timeBudgetSec`,
   `responseUntimed`, `paceMs`, `responseWindowMs`, `streamLength`, `instructionSet`.

`exposureMs` is deliberately not in that list: it bounds how long the *stimulus* is visible, after
which the response is still one forced choice.

Both conditions are facts about the SHAPE of a response, not its duration. Together they say a run of
these items is one instruction followed by several independent choices, with no clock and no
cross-item stream — which is the property a burst needs to be a coherent experience, and a property
this repository can check. Requiring *every* item to qualify is deliberate: a burst can land anywhere
in the pool.

**What was removed, and why the removal is the evidence-led choice.** The declared-process-metric
disqualifier is gone rather than widened. Declaring `M-PATH` means the renderer logs intermediate
states; it says nothing about how long a child takes. The only observation anyone has of these types
being answered is the owner's own session, in which all six types served declared a process
measurement and the report was that they were answered too fast. That observation is a single subject
on six types and it is not a response-time distribution — but it points the opposite way to the proxy,
and a proxy contradicted by the only available observation should not gate anything.

**The one speed proxy left** is the option-count step-down: burst length drops one item per option
above four, floored at `burst.minLength`. It is still a proxy and still provisional, kept because the
thing it stands in for — how many candidates the child must scan — is at least a property of the item.

## 4. Coverage pressure versus burst eligibility

**The honest answer is that coverage pressure was the problem and the eligibility rule was nearly
irrelevant.** Nineteen types were already classified burstable before any rule change; they were
simply never selected.

`nextType` scored a type by summing the selection weight of every under-covered metric it declares.
Enforced and tracked-inert shortfalls both summed without limit. In the wired registry that made one
type per area worth four points of tracked coverage against its rivals' two — a bigger margin than the
1.5-point age-band content preference and fifteen times the tie-breaking jitter — so that type won
every selection in its area until its counts filled. A tracked-inert metric is one that by
construction cannot block a score, and four of them were choosing the content of the test.

**Chosen (D-201):** enforced shortfalls still sum without limit, because each is a hard requirement
and the session cannot end until they are met. Tracked-inert shortfalls are summed and then capped at
`trackedCoverageCap`, one metric's worth. A tracked gap can now tilt a choice and break a tie; it
cannot own an area.

**What it costs.** Three things, stated as measured:

- **Construct variety per session falls, and this is arithmetic rather than a side effect.** Instruction
  screens *are* the number of type-runs, and distinct types can never exceed the number of runs. Any
  reduction in instructions is a reduction in types met. Mean distinct types per area goes 4.3 → 3.2
  and distinct types across the cohort 24 → 15 of 48 wired. There is no setting of anything that
  avoids this trade; the only question is where on it to sit.
- **A per-area estimate could have rested on one task format.** Bursting can hand a whole area to one
  type, and a verbal estimate built from six Fill-the-Gap items is an estimate of sentence completion.
  This was not a hypothetical: it happened in the app's own battery test. The stop rule now requires
  each area's evidence to span `minTypesPerArea` (2) types — `areaBreadthCovered`. This is the weakest
  form of the requirement that means anything, and every wired area supplies at least eight types, so
  `auditTypeBreadth` can confirm it stays satisfiable.
- **Tracked process metrics accumulate more slowly.** They are unenforced, so nothing blocks; but a
  session yields fewer `M-PATH` / `M-EXPLORE` samples than it did. If a research question later needs
  those at volume, it needs its own quota, not a selection thumb on the scale.

**Rejected: widening `evenSpreadTolerance` to the burst length.** It was the obvious next lever and it
did help before the length taper landed. Letting the four areas finish up to six items apart puts four
reported per-area levels on unequal evidence, which is a real cost to a report that names a level per
area. It also turned out to be unnecessary — arm E in the measurement below is now identical to arm D.

## 5. There is no response-time data. What would collect it.

**Checked, and the answer is no, on every path:**

| Where | What is there |
| --- | --- |
| `app.exam_item_response` (local Postgres, 2026-07-30) | **0 rows.** 0 sessions, 0 telemetry events, 0 outcomes. |
| `research/exam-question-types/measurements.json` | The *specification* of `M-RT` and `M-RTFIRST` — what they mean and how to collect them. No observations. |
| `packages/exam-engine/src/testing/real-bank.ts` | Simulates `M-RTFIRST` as a flat `0.35 × M-RT` for every type. A constant ratio, so even the simulation cannot tell types apart on the split. |
| `packages/exam-scoring/METRICS_BASIS.md` | `M-RT` and `M-RTFIRST` are wired at weight **0**. Collected, never scored. |

So no figure in this repository prices an instruction screen in seconds, and none of the design above
depends on one.

**The smallest thing that would collect it.** Everything needed is already built; nothing is being
measured because no session has been persisted. In order of cost:

1. **Persist a session.** Every wired renderer already emits `M-RT` and `M-RTFIRST` per item;
   `/api/exam-submit` already writes them into `exam_item_response.metrics` whenever an
   `examSessionId` is supplied. Running one battery end to end with a session open produces the first
   real rows. No code change.
2. **Read the split per type.** One query — median `M-RTFIRST`, median `M-RT`, and the ratio, grouped
   by `type_code`. `M-RTFIRST / M-RT` near 1 means the child spent the item deciding before acting;
   well below 1 means the answering phase dominated. That ratio is the quantity the retired proxy was
   guessing at.
3. **Decide with it.** The claim to test is *the instruction-reading share of an item is large and
   varies by type*. `M-RTFIRST` bundles instruction reading with encoding the stimulus and deciding,
   so the ratio alone over-attributes to reading. Separating them needs one addition — a timestamp for
   when the demo's instruction is dismissed or first scrolled out of view — which is a renderer change
   across 48 demos and should not be made before the ratio shows the effect is worth isolating.
4. **Sample size.** `measurements.json` asks for ≥20 `M-RT` samples for a per-child distribution. For a
   per-TYPE median the relevant n is per type: a burst of six from one child gives six, so a handful
   of sessions gives a usable per-type median long before it gives a per-child one.

Until step 2 has been run, "which types are fast" is not a measured property of anything, and this
branch does not claim it is. What it claims instead is checkable: that consecutive items of an
eligible type are each a single unpaced choice.

## 6. Measured before and after

Eight born-synthetic probabilistic children spanning the ability range in all four areas, grade band
`4-5`, 40-item safety cap, selecting over the served index with the app's own engine config. An
instruction screen is a served item whose type differs from the one before it.

**These figures were measured on this work alone and no longer reproduce on `dev`. See §6a.**

| Arm | Burstable types | Items (mean, range) | **Instruction screens** | Share of items opening one | Distinct types per area |
| --- | --- | --- | --- | --- | --- |
| **A** — `dev` as shipped | 0 | 26.9 (21–39) | **26.9** | 100% | 4.3 |
| **B** — A + option count on the index, retired rule kept | 19 | 29.1 (22–37) | **25.4** | 87% | 3.8 |
| **C** — B + retiring the process-metric disqualifier | 24 | 26.3 (22–31) | **21.9** | 83% | 3.4 |
| **D** — C + capping tracked-inert coverage (**this branch**) | 24 | 24.0 (19–28) | **15.6** | 65% | 3.2 |
| E — D + `evenSpreadTolerance` 6 (not adopted) | 24 | 24.0 (19–28) | 15.6 | 65% | 3.2 |

**Headline: 26.9 → 15.6 instruction screens per session, 42% fewer, with the session no longer than
before (24.0 items against 26.9) and no child running to the safety cap.**

Read the arms as an attribution, because they say something the plan did not expect:

- **A → B is worth 6%**, and buys it by making the session 8% longer. The index fix alone is nearly
  worthless.
- **B → C is worth a further 13%.** Retiring the process-metric rule — the change that looked like the
  whole task — moves 5 of the 48 types into eligibility and about 3 screens.
- **C → D is worth 24 points of the 42.** Capping tracked coverage is more than half the total gain,
  and it is the only change that also shortens the session.

**One counterintuitive result worth keeping in mind before anyone raises the burst ceiling.** Longer
bursts do not give fewer instructions. A burst of `n` commits the session to roughly `4n` items,
because `coverageIsEven` will not conclude while the areas are uneven, so a six-item ceiling puts the
session's exits at 24 items and then 48 — and 48 is past the cap, which is how a bursting battery ran
to the safety net. Bounding burst length by the remaining item budget (`roundHeadroom`) makes the
rounds taper — long, then shorter, then single items — and measured against a fixed ceiling it gives
*both* fewer screens and a shorter session. Under a 40-item cap the effective ceiling is therefore 4–5
rather than the configured 6. The owner's bound of "no more than 5–6, stepped down by option count" is
respected and was never approached from below.

## 6a. What changed when the variety work landed beside this

The table in §6 was measured on this work alone. It no longer reproduces, and saying so is more
useful than re-cutting it: **D-202 rewrote the same function.** `nextType` is now randomesque
exposure control over the near-optimal set with a recency discount, rather than a strict argmax with
a ±0.1 jitter, and `nextItem` draws from within a tolerance rather than taking the nearest item. Even
with every variety knob set to zero the tie-break RULE differs — a seeded draw where there used to be
a jitter and then an alphabetical fallback — and on the wired bank's flat metric lists ties are
common, so the served sequences diverge. There is no configuration of the merged engine that
reproduces §6's arms, because §6's arms ran different code.

`pnpm exam:instruction-cost` on the merged tree therefore answers a different and still useful
question: what the burst work adds ON TOP of variety, at the merged defaults. Its cohort also now
draws an engine seed per child, because the constant one D-202 removed had made all eight children a
single selection sequence answered by eight responders.

**Two claims from §6 do not survive the combination, and both are stated in E-203:**

- **"The session is no longer than before" does not hold.** Bursting now lengthens it slightly:
  measured over 80 sittings, 28.7 → 29.2 items against `dev`, and 28.0 → 30.4 items when added to
  the variety work.
- **"No child on the safety cap" does not hold** at the cohort sizes the four-arm measurement uses.
  15 of 80 sittings reach the 40-item cap in the combination, against 10 for this work alone and 17
  for `dev`.

The attribution ordering in §6 is unaffected — capping tracked coverage is still the change that
does most of the work, and the eligibility rule is still nearly worthless on its own.
`docs/product/EXAM_SELECTION_INTEGRATION.md` is the measurement of the merged behaviour and is the
one to cite for it.

## 7. Claim boundaries

- Instruction screens are **counted**. Nothing here says what one costs in seconds, or that a child
  experiences 15.6 screens as better than 26.9. The owner's report is the only evidence that the
  direction is right, and it is one person's impression of one session.
- The responder is born-synthetic and probabilistic over **uncalibrated** banks (`validated=false`).
  These are routing measurements, not psychometric results. No claim is made about score validity,
  reliability, or fairness.
- Burst eligibility is a claim about item **shape**, not about answering speed. §5 states what would
  make a speed claim available.
- Capping tracked coverage narrowed the `ageBandBias` plateau that D-025 established: the sweep's worst
  error at the operating value **improves** (1.20 → 0.77), and the plateau's upper edge moves from 1.0
  to inside (0.75, 1.0). At 1.0 — twice the operating value — one of 72 ability × area cells lands 1.84
  off, on one seed in five. `real-bank.test.ts` asserts the plateau over 0–0.75 and separately asserts
  that its edge stays soft rather than becoming a cliff.
