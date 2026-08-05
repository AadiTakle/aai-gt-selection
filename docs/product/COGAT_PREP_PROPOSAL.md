# Proposal: a CogAT preparation product that can prove it taught something

**Owner:** Tiffany Lam
**Source:** `brainlifting/cogat-prep-brainlift/brainlift-cogat-prep.md`
**Companion:** `docs/product/COGAT_PREP_PIVOT.md` (what is already built)
**Status:** proposal, not a commitment

Bracketed references like (3.1) point at subcategories of the BrainLift knowledge
tree. Every empirical claim below is traceable to one. Where the evidence is thin
or missing, this document says so rather than rounding up.

---

## 1. Problem

A family whose child is facing a selective-program reasoning test wants two
different things at once: a better result, and a child who reasons better. Almost
every product in this market sells the first and quietly implies the second. The
implication is usually false, and the reason it is false is measurable.

**A. A score can rise without any ability changing.** Simply taking a cognitive
ability test a second time buys roughly a quarter of a standard deviation, with no
teaching involved at all, and coaching on top of bare practice adds more (5.2).
That effect is not a curiosity. It is the size of the result most prep programs
report as their product working.

**B. The gain has been tested at the construct level, and it failed.** Reeve and
Lam examined repeated administrations at the level of the latent ability factor
rather than the observed score, and found full measurement invariance: the ability
factor's mean and variance were unchanged across sittings (1.1). The score moved
and the construct did not. Of the three mechanisms that produce retest gains, two
are construct-irrelevant by definition (reduced anxiety and unfamiliarity, and the
acquisition of test-specific tricks). No source in the tree demonstrates that a
retest or coaching gain reflects an increase in underlying reasoning ability.

**C. The obvious way to measure improvement cannot detect the difference.** If a
program teaches to a test and then measures on that same test, the two competing
explanations produce identical data. Separating them requires an independent audit
measure of the same domain, and even then the comparison is qualitative: a large
divergence between the focal test and the audit test licenses the inference of
appreciable inflation, but cannot quantify it, because part of any non-generalizing
gain is real learning the audit test was not built to detect (2.2). Correlations
between two instruments can stay stable while their means diverge sharply, so
correlation checks are not sufficient.

**D. The cheapest way to build the product is illegal and prohibited.** Individual
standardized-test questions are copyrightable expression, registering a form as a
compilation still covers the questions, substituting different numbers into an
otherwise identical item is copying rather than authorship, and fair use fails on
all four factors for a commercial preparation product (6.1). The professional
Standards reach the same boundary from the validity side, requiring that
preparation items be based on publicly disclosed information and prohibiting
material that reflects the specific test items closely enough to raise scores
without increasing genuine achievement (6.2).

**E. But refusing to prepare a child is also a defect.** The same Standards
affirmatively require the other half. Standard 6.5 requires that test takers be
given instructions and practice sufficient to reduce construct-irrelevant variance,
and the comment to Standard 12.8 says students and parents should be informed of
the domains tested, the nature of the item types, and the mode of administration
(6.2). A child who has never seen the format is carrying measurement error that has
nothing to do with their reasoning. Withholding format familiarity is not neutral.

**F. The intuitive fix does not work either.** The instinct is to train the
underlying capacity. Working-memory and brain-training programs produce enormous
gains on the trained task, moderate gains on tasks that share its format, and,
against an active control, nothing on ability measures: g = 0.05 on nonverbal
ability, and g = -0.05 at five-month follow-up (3.1). The mediation result is what
kills the theory rather than the effect size. Studies whose participants improved
most at the trained task did not transfer more than studies whose participants
barely improved, so the mechanism the approach depends on is absent.

**The problem, stated once.** Build a preparation product whose gains are real,
provable, and legally clean, in a market where the standard product is a gain that
is none of the three, and where doing nothing is itself a measurable harm to the
child's score.

---

## 2. Solution

Five commitments, each answering a specific failure above.

### Commitment 1. Teach a named method, then test it on problems it was never practiced on

The evidence supports training the reasoning operation rather than the capacity
underneath it or the item format on top of it.

- Inductive-reasoning training that teaches one explicit procedure, systematic
  comparison to detect regularities across attributes and relations, raised fluid
  intelligence and classroom learning together, with effects that grew rather than
  faded, and with academic transfer exceeding test transfer (3.3). That ordering is
  the signature that distinguishes teaching from coaching, because coaching
  produces the reverse.
- Ordinary schooling raises measured intelligence by a durable one to two points a
  year, which establishes that reasoning is not fixed. It also establishes what
  moves it: something broad, sustained and content-rich, not a short drill (3.2).
- On figural matrices, which strategy a solver uses predicts 78 percent of
  item-to-item accuracy variance, and inducing an effective strategy makes working
  memory stop predicting performance at all (5.3). The instructional target is a
  procedure the child was never shown, not a capacity they lack.

**Design rule.** Every unit names its method, teaches it explicitly, and then
assesses on items that method was not practiced on. A unit that only ever tests the
practiced shape has taught the shape.

### Commitment 2. Write our own items, and tell families exactly what the test looks like

Katzman leaves the space open in the same opinion that closes the other half: the
copyright reaches the language of an item, not the concept it tests or the order in
which concepts appear, and the court said directly that testing the same concept in
the same order is permitted so long as the language is not substantially similar
(6.1). The Standards require items to be built from publicly disclosed information
(6.2). Together those give a workable rule.

**Design rule.** Original items, in the same construct areas, never a reproduction
and never a near-clone. Format familiarity is delivered deliberately and openly,
because the Standards require it, and it is delivered through our items rather than
theirs. The public explainer at `/about-the-test` is the first piece of this and is
already live.

### Commitment 3. Expect different things from the three batteries

Trainability is not uniform across batteries, and a product that promises equal
movement in all three is promising something the evidence does not support (Insight
3).

| Battery | Evidence | What to promise |
|---|---|---|
| Nonverbal | Spatial training moves about half a standard deviation (g = 0.47), does not decay over the delays studied, and transfers to untrained spatial tasks (5.1). A causal demonstration exists in 250 eight-year-olds, inside our age band, with far transfer to mathematics (5.1). Matrix strategy is the highest-leverage single target found (5.3). | The most movement, and the place to start |
| Quantitative | What drives item difficulty is comparatively well specified, so a practice ladder can be built precisely against it | Steady, buildable movement |
| Verbal | Performance is entangled with vocabulary depth, which grows slowly (Insight 3) | The least movement in a short program, said out loud |

One caution belongs with the nonverbal claim. The figural battery is widely assumed
to be culture-free and is not: among 1,198 elementary children, English-language
learners scored 0.5 to 0.67 standard deviations below their peers on three
different nonverbal tests (5.2). Figural items carry acquirable content. That is
precisely why they are trainable, and also why a low score there is not a clean
reading of ability.

### Commitment 4. Prove the gain on something we never taught

This is the commitment that distinguishes the product, and it is the one that costs
something.

**Design rule.** Maintain a hold-out set of items, in the same three construct
areas, that no unit teaches to and no practice ladder draws from. Measure before
and after on both the practiced form and the hold-out set. Publish the comparison,
including when it is unflattering. A program that never runs the check has not left
the claim untested; it has dropped it (SPOV 1).

Two honest limits, taken from the audit-test literature rather than discovered
later: the comparison cannot quantify how much of a gain was inflation, and
divergence can understate inflation as easily as overstate it (2.2). What it can do
is tell us whether we taught reasoning or taught our own test, which is the
question that matters.

### Commitment 5. Which instructional methods get used

Restricted to methods with evidence in the age band the product serves.

- **Interleaving.** Mixing problem types instead of blocking them. A randomized
  classroom study of 126 seventh graders found effect sizes of 0.42 one day after
  review and 0.79 at thirty days (4.1). The advantage nearly doubled as the delay
  lengthened, which is a durability effect rather than a performance effect.
- **Analogical comparison.** Comparing two worked cases side by side to strip
  surface features and leave the relational structure, which is what a reasoning
  item samples (4.2). Prompt for similarities rather than differences, and withhold
  the general principle until after the comparison.
- **Metacognitive strategy instruction.** Teaching a child to plan, monitor and
  check their own work. Average effect 0.69 across 84 studies of primary and
  secondary students, and the effect grows slightly between posttest and follow-up
  rather than decaying (4.3).

There is a scheduling conflict worth designing around rather than ignoring:
comparison helps most immediately and fades with delay, while interleaving and
self-monitoring strengthen over time (4.1, 4.2, 4.3). Use comparison to build the
schema and the slower methods to make it stick.

---

## 3. Scope

### In scope

- Grades 3 through 8.
- Three batteries: Verbal, Quantitative, Nonverbal, reported separately.
- Closed-response item types only.
- Original items in CogAT's construct areas, authored by us.
- A baseline under 40 minutes, free, retakeable, reporting a level per battery.
- Method-first instructional units, each ending on unpracticed items.
- A hold-out audit set and the before-and-after comparison against it.
- Public, deliberate format familiarization.

### Out of scope

- Reproducing, paraphrasing or format-cloning real CogAT items. Hard boundary,
  legal and ethical (6.1, 6.2).
- Measuring how fast a child learns. That belongs to the `learning-rate-scoring`
  BrainLift and is not recoverable at the trial counts this product will have.
- Instrument quality at a selection cut, adaptive routing and retake policy,
  cross-instrument validation methodology, and separating a program's effect from
  selection into it. Each has its own BrainLift.
- Selection policy. What cut a program sets and whom it admits is not ours.
- Reusing items between the baseline and a retake. Identical forms inflate gains
  (5.2), so a reused item is measuring memory.

### Non-claims

Stated explicitly, because each is a claim the market makes and we cannot support.

1. **We do not claim to raise IQ.** What practice changes is performance on
   reasoning questions.
2. **We do not claim to predict a CogAT score.** That requires a correlation study
   that has not been run (see Phase 3). Until it exists, the levels this product
   reports are its own scale and nothing more.
3. **We do not report a gain measured only on the practiced form.** Any published
   improvement is accompanied by the hold-out result.
4. **We do not claim the nonverbal battery is culture-fair.** It is not (5.2).

---

## 4. Future plan

### Phase 0, done

Baseline live: three batteries, under 40 minutes, free, no payment gate. Item bank
in place. The public explainer at `/about-the-test` covers what the test is, what
each battery measures, and how the cut works, using our own questions.

### Phase 1, method units, in trainability order

Build where the evidence is strongest so the first result is the most likely to be
real.

1. **Matrix strategy** (constructive matching versus response elimination), the
   highest-leverage single target identified (5.3).
2. **Spatial visualization**, the strongest durable and transferable training effect
   in the tree (5.1). Note that practice with feedback matched instructional video
   on nearly every outcome in the eight-year-old study, so the expensive component
   is not always necessary; the exception was geometry, where named conventions are
   involved.
3. **Quantitative ladder**, built against specifiable difficulty drivers.
4. **Verbal**, last and with the lowest promised movement.

Each unit: named method, explicit teaching, interleaved practice, and an assessment
on shapes the method was not practiced on.

### Phase 2, the measurement that makes the claim

Build the hold-out audit set and the retake protocol, run before-and-after on both,
and publish the pair. This is the phase that either substantiates the product's
central claim or refutes it, and it should be built to be capable of refuting it.

### Phase 3, the external validation SPOV 4 demands

Demonstrate correlation between performance in the tool and performance on the
actual CogAT. This requires families willing to report real scores, so it is
gated on volume rather than on engineering, and it is the precondition for saying
anything at all about CogAT prediction.

### Risks, carried openly

- **The strongest supporting evidence has two holes.** Klauer's inductive-training
  meta-analysis reports no breakdown by active versus no-treatment control, and no
  independent meta-analysis by unconnected authors was found (3.3). Active-control
  moderation is exactly what collapsed the working-memory literature. This is the
  largest borrowed assumption in the whole design.
- **The best independent replication is partial.** Barkl and colleagues replicated
  reasoning gains at three months, including to untrained deductive reasoning, but
  the mathematics transfer that Klauer reported as the larger effect did not appear,
  and the control was untreated rather than active (3.3).
- **Matrix strategy evidence is adult-sample.** The Gonthier studies use Raven's
  Advanced Progressive Matrices with adult participants (5.3). The finding is the
  most design-relevant one in the tree and also the one whose age transfer is
  assumed rather than shown.
- **Fidelity loss at scale.** Metacognitive interventions worked better when
  researchers rather than ordinary teachers delivered them (4.3). A self-serve
  product is the far end of that gradient.
- **Comparison fades.** Analogical comparison's advantage is largest immediately and
  shrinks with delay (4.2), so it cannot be the whole method.

### Decisions the owner still needs to make

1. How large the hold-out set is, and whether it is drawn from existing types or
   authored separately.
2. Whether a published unflattering result is acceptable to the business, since
   Phase 2 is designed to be able to produce one.
3. Whether to keep the two adult-sample source blocks in the BrainLift tree
   (Gonthier at 5.3, Hausknecht at 5.2) now that SPOV 5 has been removed, given that
   5.3 is load-bearing for SPOV 2.
