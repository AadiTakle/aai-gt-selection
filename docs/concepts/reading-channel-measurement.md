# Design note: separating reading from reasoning

**Status:** unvalidated proposal. Written up because the owner was skeptical and the objections are
worth keeping. Nothing here has been tested on a child.

**The pain it addresses:** Crystal Martel raised this twice, unprompted, on 2026-08-03:

> "whenever you're making something that is a reading requirement, we absolutely have to make sure
> that we can somehow separate their ability to read — both comprehension and decode — versus the
> content itself."

Her failure case: a kindergartner who "might also be like a fourth or fifth grade math student, but
they can't read the math content... so it's going to look like they're only [low]." Asked whether
these children then struggle on Timeback, she said not necessarily — "but **it doesn't allow them to
show off what they know either**."

---

## The obvious version does not work

"Verbal score minus nonverbal score = reading tax" is wrong, and should be rejected early.

Verbal and nonverbal reasoning are genuinely different abilities. CogAT reports them as separate
batteries precisely because they are not interchangeable. A child can be truly weaker at verbal
reasoning with no reading difficulty at all, so this difference confounds **reading cost** with
**verbal reasoning ability**. It would produce a number that collapses the first time a competent
reviewer pushes on it.

## The version that might

Hold the reasoning content identical and vary only the delivery channel.

Same item, two forms:

- **Narrated** — the stem is read aloud to the child.
- **Silent** — the identical stem must be decoded by the child.

If the reasoning demand is the same item and only the channel differs, a systematic gap is
attributable to the channel rather than to ability.

This is not an invention on our part. It is Crystal's own sentence made systematic:

> "the comprehension is great, **except when they have to read to themselves**."

She is describing listening versus reading. The design just administers that contrast deliberately.

### Why it is cheap for us specifically

The archived bank holds 57 **generative** item types. Parallel forms — matched items differing only in
channel — are exactly what generative banks are good at. Buying this would mean commissioning matched
forms; we can emit them. Text-to-speech on stems we already have is the whole narration cost.

### What it would output

Two numbers instead of one confounded number: what the child can reason, and how much decoding is
currently costing them. For Crystal's kindergartner, that is the difference between "looks average"
and "reasons well above level, gated by decoding."

---

## Four ways it breaks

### 1. Repeat exposure contaminates it

The same item cannot be given twice; the second exposure is no longer a clean measurement. The design
therefore needs **parallel forms randomly assigned to channel**, and "matched difficulty" has to
genuinely hold.

We have no child calibration data, so matching would rest on the generator's difficulty parameters
rather than on measured item behavior. This is a real weakness. The archived research also records
that automatically generated matrix items have been shown psychometrically equivalent to
human-authored ones — but on 80 adult undergraduates, with **no located study establishing the same
for children**.

### 2. It separates decoding from reasoning, not language from reasoning

A child failing both forms may have a language problem rather than a decoding one. The measure cannot
distinguish those.

This happens to be acceptable for Crystal's case: high oral language with low decoding reads as
_solves narrated, fails silent_, which is the exact pattern she described. But the claim has to stay
inside that boundary.

### 3. It is a difference score, and we wrote a research category warning about those

This is the strongest internal objection and it comes from our own work
(`archive/brainlifting/learning-rate-scoring-brainlift/`). Cronbach and Furby: a difference carries
the error of both measurements while typically having less true between-person variance than either.

The escape is Rogosa's rebuttal — a difference score is unreliable specifically when the true
difference does not vary between people. Reading-versus-listening gaps in K–2 almost certainly _do_
vary enormously, since some five-year-olds read fluently and some not at all. So the precondition is
plausibly satisfied here in a way it is not for learning-rate scores.

That is an assumption to state and test, not a fact to assert.

### 4. It cannot be validated in ten days

No child data. It would ship as a mechanism with a plausible rationale and zero calibration.

## What may honestly be claimed

A **flag, not a score**: _this child's performance changed materially when the question was read
aloud — worth a look._

The archived research sets out a ladder of progressively weaker claims — decision rule, rank, coarse
band, tie-breaker, follow-up flag, research-only signal — each with its own preconditions. An
uncalibrated instrument clears the flag rung and does not clear any rung above it. Reporting it as a
score, or letting it influence an admission decision, would be claiming past the evidence.

## The objection with no good answer

**What does GT actually do with the flag?**

The reading gate exists because Timeback content requires reading. Knowing a child is gated by
decoding does not obviously change the admit decision, because the platform's demand is unchanged. It
might change placement, or the support offered, or nothing at all.

The best available counter is Crystal's own framing: her complaint was not that these children fail,
it was that the current process does not let them "show off what they know." The value is in not
mis-ranking a capable child. And she describes K–2 as the band where GT already flexes on the reading
gate, so there is room to act there.

If that is unconvincing, the right conclusion is to keep this as a secondary output of a
drive-focused product rather than making it the centerpiece.

## Open questions before this is worth building

- Would GT act on the flag, or only record it?
- Does the generator's difficulty parameter hold well enough across channels to call two items matched,
  without child calibration?
- Is narration alone the right contrast, or does it need a third arm (pictorial stem) to separate
  language comprehension from decoding?
- What is the minimum item count per channel for the gap to mean anything at the individual level?
