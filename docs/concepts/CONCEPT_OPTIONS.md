# Concept options — the 10-day GT deliverable

**Status:** exploratory. Nothing here is chosen or approved.
**Audience:** Joe Liemandt, via a proposal Crystal Martel selects from.
**Source of the constraints and pains below:** `docs/interviews/2026-08-03-crystal-martel-call.md`.
Research support is in the BrainLifts at `brainlifting/`.

---

## The framing

Joe has ruled out an in-house cognitive test. Taken literally, that stops being a limitation:

> **You mandated we not touch the CogAT. So we built everything around it that it can't do.**

It respects the mandate, avoids the discrimination exposure driving it, and points at where every
pain Crystal named actually sits — not in the CogAT, but in the space before and after it.

Today that space is empty. An applicant applies, waits one to four weeks for a batched proctored
sitting, takes the test, and GT learns one number. Crystal named four things she wishes she knew, and
a CogAT score cannot carry any of them.

## Hard constraints

| Constraint                                                                    | Source                |
| ----------------------------------------------------------------------------- | --------------------- |
| No in-house cognitive test; replacement only via a better third-party service | Joe, via Crystal      |
| No video-game framing; must not cheapen an elite brand                        | Crystal               |
| Must not confound reading ability with the construct being measured           | Crystal, raised twice |
| Must work for K–2, who cannot reliably read                                   | Crystal               |
| Cannot be a static resource a competent pair builds in a day                  | Internship lead       |
| ~10 days, two people                                                          | Project               |

## Ruled out, and why

Recorded so they are not re-proposed.

- **An in-house CogAT replacement.** Joe forbade it on discrimination and PR grounds. Not a quality
  argument, so not one we can engineer past.
- **Identifying "hustlers" for admission.** Crystal's arithmetic: a hustler needs six to eight hours a
  day to reach MIT-by-8, which breaks the short-day promise and leaves no time for the project work
  that produces tier-one university admission. This was the July target and it is now dead.
- **Anything gamified.** Brand constraint, stated plainly.
- **Self-report drive, grit, or mindset instruments.** Duckworth's own published guidance says the Grit
  Scale is unfit for selection and can be faked "without much effort"; grit correlates ρ = .84 with
  conscientiousness and adds essentially nothing over it; and self-reported grit _falls_ when students
  enter more demanding environments even as their attendance improves. Crystal independently reached
  the same place — a parent-completed drive form "is not going to be the same."
- **A Quizlet-style study clone.** Judged in the call as unlikely to impress Joe.
- **Fixing large-scale CogAT proctoring.** This is Crystal's single biggest operational blocker, but the
  Riverside software is proprietary and must run on their secure server. Almost certainly untouchable
  from outside. Worth confirming rather than assuming.

## Candidate concepts

### C1 — The pre-CogAT window _(currently the strongest)_

One product occupying the one-to-four-week wait GT already owns: CogAT familiarization, plus
reading-free reasoning practice, instrumented so that drive is measured from behavior rather than
asked about.

- **Pains addressed:** drive (4.1), K–2 weakness (4.2), reading/content confound (4.3), portal prep
  page (4.5).
- **Why it can be defended:** measure _choice_, not self-report. Yeager's challenge-seeking task — offer
  the harder, more instructive problem against an easy one and record which is taken — was the
  behavioral measure that predicted where a mindset intervention worked when self-report predicted
  nothing. Add return-across-days for the "long term" half of Crystal's marshmallow framing. Separate
  productive persistence from wheel-spinning, which the educational-data-mining literature detects by
  about the fourth attempt and which predicts continued failure rather than growth.
- **What it costs GT:** nothing. The window already exists and is currently dead time.
- **Risk:** "drive" is a construct with a bad track record. Everything must be behavioral and framed as
  a flag, not a score.

### C2 — A K–2 supplement

The same instrument aimed only at kindergarten through grade 2, where Crystal says CogAT predicts
only two to three years out and is hardest to read.

- **Pains addressed:** 4.2 primarily.
- **Argument for narrowing:** it is the one band where Crystal has told us the incumbent underperforms,
  so a supplement competes with a weak baseline rather than a strong one. Reading-free is forced
  rather than optional, which removes a design argument.
- **Risk:** a smaller slice of applicants; may read as niche to Joe.

### C3 — True grade level without a full mastery placement

A short adaptive screen reporting per-domain grade level rather than a composite.

- **Pains addressed:** 4.4. Her example is a grade-7 student at the 99th percentile on every MAP
  screener who is struggling with grade 3–4 coursework, because composites hide gaps.
- **Argument for:** it is the most concretely useful output for the guides, and it is adjacent to
  placement rather than selection, so it sits outside Joe's cognitive-testing constraint entirely.
- **Risk:** the interns already identified the problem in the call — a real placement instrument runs
  long and children disengage. Also the largest build of the three.

### C4 — The reading-channel diagnostic

Separating decoding from reasoning by holding item content constant and varying only whether the stem
is narrated or must be read. Design note and failure analysis:
`docs/concepts/reading-channel-measurement.md`.

- **Pains addressed:** 4.3, which Crystal raised twice unprompted.
- **Argument for:** nobody has this, and our generative item bank makes parallel forms cheap.
- **Risk:** it is a difference score, and we have written a whole research category on why those are
  fragile. It also has an unanswered "so what" — GT may not act on the flag. Probably a secondary
  output rather than a centerpiece.

### C5 — CogAT familiarization page alone

Exactly what Crystal described for her portal.

- **Verdict:** correct but insufficient on its own. Should be the front door of C1 rather than a
  project.

## Current recommendation

**C1, with C4 as a secondary output and C2 as the sharpest aim point within it.** One product, not
four: the pre-CogAT window, aimed hardest at K–2, where familiarization is the visible surface and the
behavioral drive record is the thing GT keeps.

What Joe would hear: _applicants who used to wait now arrive prepared, and GT now knows three things
the CogAT cannot report — whether the child chooses hard problems, whether they come back, and whether
reading is hiding their reasoning._

## Reusable assets

All in `archive/`, and all still running:

- **57 generative item types** across verbal, quantitative, spatial and fluid reasoning
  (`archive/packages/exam-engine`). Generative matters here: parallel forms are what the
  reading-channel design needs and what a rotating, un-preppable bank needs.
- An adaptive engine with Bayesian ability estimation, item selection, coverage rules, stopping rules,
  seeded replay, and a simulation harness.
- A scoring package with learning-curve fitting, learning-rate intervals, and a metric registry
  (`archive/packages/exam-scoring`).
- A Next.js surface and Supabase backend.
- Eleven researched BrainLifts (`brainlifting/`), which are part of the deliverable's value
  rather than background: the stated bar is depth of understanding, not just a working demo.

## Delivery seam

Two people, ten days. The clean boundary is one person owning item serving and scoring up to a
profile, the other owning drive instrumentation and the profile output. **Freeze the profile shape on
day one**; otherwise both halves block in the second week.

## Open questions

- Are seats rationed? Determines whether false positives or false negatives are expensive. The July
  interview said no; this call did not revisit it.
- Would GT act on a reading-versus-reasoning flag, or only record it?
- Is the Riverside proctoring constraint genuinely untouchable?
- Does anything built here need to survive Joe's third-party-only rule, or is it positioned as a
  supplement that sits outside the cognitive-testing decision?
