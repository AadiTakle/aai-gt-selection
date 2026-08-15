# Aiming the instrument at gifted third to fifth graders

Written overnight 11–12 Aug 2026. Numbers from `platform/scripts/measure-bramblebrook.ts` over 4,000
simulated children; re-run with `npm run measure:bramblebrook 4000`.

## The decision

The cut is **θ = 1.645, the 95th percentile**, set in `CRITERIA_V1` and in Bramblebrook's app config. That is
the bar GT states in Crystal Martel's call — "95th percentile CogAT, strictly applied" — rather than a number
chosen for convenience. It replaces the prototype's 1.0, which was roughly the 84th percentile.

The prototype's 1.0 was not a considered bar. It was a generous *screening* instinct expressed in the wrong
place: leniency belongs on how confident we insist on being before recommending, not on where the line is.
Putting it in the threshold made the instrument measure the 84th percentile while everyone discussed the 95th.
Those are now separate knobs, and the section on the recommendation bar below is where leniency actually lives.

Raising the composite also exposed a bug. `domainBar`, the ability a child must clear to pass on a single
battery when the composite rejects them, was 1.5 — which at a 1.645 composite would have sat **below** it,
quietly making the single-battery route the *easier* way in. It is now 2.0, and a test asserts the ordering
rather than trusting the numbers to stay in order.

## The finding that matters: there is no grade-appropriate way to do this

**The age bands in this bank are difficulty tiers wearing grade labels.** For Bramblebrook's seven types:

| band | items | difficulty (logits) |
|---|---|---|
| K-1 | 154 | −3.17 to −2.04 |
| 2-3 | 190 | −2.26 to −0.71 |
| 4-5 | 190 | −0.97 to **+0.64** |
| 6-8 | 356 | +0.37 to +3.17 |

There is no `3-5` band at all — grades 3 to 5 straddle `2-3` and `4-5`. And the grade-appropriate ceiling is
**0.64**, a full logit below the 1.645 cut. Within grade level there are **zero** items inside half a logit of
the bar.

The consequence is not a tuning problem, it is arithmetic: a child measured only on items they will almost
certainly answer correctly produces no evidence about whether they are above the 95th percentile. Everyone
passes everything, and the posterior stays as wide as it started. A band-locked session cannot reach a gifted
decision no matter how many questions it asks.

So the instrument does not filter by age band. Difficulty is chosen by information at the threshold, which
means **100% of the questions served sit above the grade-appropriate ceiling** — median difficulty 1.42, and
the opening question between 0.86 and 2.04.

This is deliberate and it is the standard method. Above-level testing is how every talent search — SCAT, and
the Johns Hopkins CTY lineage generally — separates the top few percent: you administer material hard enough
to discriminate up there, which is by construction above the child's grade. An instrument that only asks
grade-level questions can tell you a third grader is fine. It cannot tell you they are gifted.

**What this costs, and it is a real cost.** A gifted third grader will meet questions written for sixth to
eighth graders and will get a good number of them wrong. Simulated accuracy at these difficulties runs near
55–65% for a child at the cut, which is what maximising information *means* — the most informative question is
one you might miss. Bramblebrook's framing has to carry that, because a child who experiences fourteen
questions as fourteen failures has been told something false about themselves. The ranch fiction helps: Nan
asking for help with a hard problem is not a test the child is failing. This deserves attention in the game's
copy and it is not a psychometric problem I can solve.

## Where the engine aims

Selection maximises Fisher information at the decision threshold, so the cut sets the difficulty directly:

- **Opening question:** median difficulty **1.41**, spread 0.86 to 2.04. The spread is the opening jitter — a
  fixed opening would make the first question identical for every child on every visit.
- **Every question served:** median **1.42**, range 0.86 to 2.09. The instrument sits on the bar and stays
  there, because that is where evidence about the bar comes from.
- **Above the 4-5 ceiling of 0.64:** **100%** of items served.

## Does it actually identify them?

Over 4,000 simulated children drawn from a standard normal, of whom 190 were genuinely above the cut:

| | |
|---|---|
| accuracy | **0.969** |
| sensitivity (gifted children correctly recommended) | **0.774** |
| specificity | **0.979** |
| deterministic selection, for comparison | 0.968 accuracy |

Sensitivity is the number to look at, and 0.774 means **roughly a quarter of gifted children are missed**.
That is the honest headline. It is also why the cohort had to be 4,000: at a 95th-percentile cut only 5% of any
sample is positive, so a 500-child run put sensitivity at 0.72 ± 0.21, which is not a measurement. At 4,000 it
is ±0.06.

Variety costs nothing here. Accuracy with the variety layers on (0.969) matches deterministic argmax (0.968),
so serving a different, non-repeating sequence to every child does not buy worse decisions.

## The recommendation bar is the sensitivity lever, not the budget

Sweeping both, at the 95th-percentile cut, over the same 4,000 children:

| budget | bar | median questions | sensitivity | specificity |
|---|---|---|---|---|
| 16 | 0.20 | 12 | 0.805 | 0.959 |
| 16 | 0.30 | 12 | 0.711 | 0.975 |
| 24 | **0.20** | 12 | **0.837** | 0.967 |
| 24 | 0.30 *(current)* | 12 | 0.774 | 0.979 |
| 24 | 0.40 | 12 | 0.742 | 0.983 |
| 32 | 0.20 | 12 | 0.847 | 0.970 |
| 32 | 0.30 | 12 | 0.826 | 0.978 |

Raising the budget from 24 to 32 buys +5 points of sensitivity. Dropping the bar from 0.30 to 0.20 buys +6.3
for free — no extra questions, since the median session length does not move.

In headcount over these 4,000 children:

- **bar 0.30:** 147 of 190 gifted children found, **43 missed**, 80 false positives
- **bar 0.20:** 159 found, **31 missed**, 125 false positives

Twelve more children found, at 45 more false positives — about 3.8 additional families who apply and are
declined, per additional gifted child who is found at all.

**My recommendation is 0.20**, and it is a one-line change to `recommendProbability` in
`platform/scripts/seed-bramblebrook.ts`. The reasoning is the asymmetric loss the codebase already commits to:
a false positive costs one family a declined application, a false negative costs a child who is never looked at
by anyone. A game is also the front door carrying the most construct-irrelevant variance of any surface — a
child can misread Nan, fumble the controls, or answer while walking — so it should be the *most* willing to
pass someone up to a human.

**I have not made that change.** It is a values judgement about how many declined applications are worth one
found child, and it is yours. 0.30 is what every number in these artifacts was measured at.

## What these numbers are not

The difficulties driving all of this are a linear rescale of an authoring difficulty, not calibrated item
parameters from children's responses. The simulation therefore answers "does the machinery find children who
are above the cut *on this difficulty scale*" — which is a real and necessary check — and not "does it find
gifted children." Only response data from real children can answer the second, and getting it is what
Bramblebrook is for.
