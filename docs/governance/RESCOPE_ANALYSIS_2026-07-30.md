# Rescope analysis — the screener becomes the binding aim

**Decision recorded:** `D-400`. **Date:** 2026-07-30. **Owner:** Team lead.
**Baseline:** `dev` after the `R11` reconciliation (`D-032`).
**Source of the rescope:** `docs/interviews/CRYSTAL_MARTEL_INTERVIEW_NOTES.md`
(Crystal Martel, Director of Admissions, GT School; 2026-07-23).

This document is the working-out behind `D-400`. It exists because the rescope
turns on two things a decision entry cannot carry: what the interview does and
does not support, and exactly which claims elsewhere in the repository stop
being underwritten once the counterfactual requirement is no longer binding.

**Requirements served:** R7 (auditability — a rescope that cannot be traced to
its evidence cannot be reviewed), R10 (claim boundaries — §4 is the list of
places the repository now says more than the design supports).
**Evidence:** E-096–E-102 (the interview entries landed by `D-032`), and
E-400–E-404, registered here for the first time.

<!-- id-audit:ignore-start — the next paragraph names the trunk-sequence IDs this change deliberately did NOT allocate -->

**A note on the IDs.** `D-032` closed the trunk allocation band at `D-032` and
`E-102` and introduced disjoint per-lineage bands (`AGENTS.md`, "Governance ID
allocation"). This is governance work, so it allocates from the governance band,
`400`–`499` — hence `D-400` and `E-400`–`E-404` rather than the `D-033` /
`E-103` the trunk sequence would have suggested. The band scheme landed hours
before this change and is being honoured on its first use.

<!-- id-audit:ignore-end -->

---

## 1. Headline

GT asked for a test. Across 41 minutes with the person who owns the admissions
decision, the request is a scalable automated screener that predicts fit to the
Timeback platform, is validated against GT's own CogAT/MAP data, exposes a cut
GT tunes itself, and drops into the admissions portal GT has already built.

The interview supports every part of that. It does **not** support the other
half of the rescope, and the distinction matters:

| Rescope component | Interview support |
| --- | --- |
| The screener is what GT wants built | **Direct and repeated** (§2.1) |
| Automated decisioning at scale is required, not optional | **Direct** (§2.2) |
| GT owns and tunes the cut; we ship a model, not a policy | **Direct** (§2.3) |
| Stop building a total application; integrate into GT's | **Direct** (§2.4) |
| Program-effect demonstration should be non-binding | **Absent — not stated either way** (§3) |
| A randomized counterfactual is currently infeasible at GT | **Strong indirect, and it is new** (§3.2) |

The honest summary is that the interview *positively* establishes the first
four, is *silent* on the fifth, and *undercuts a precondition* of the design
that the sixth depended on. The demotion of program effect is therefore the
owner's decision informed by the interview, not a thing Crystal asked for. §3
states that plainly because the owner needs to know which parts of `D-400` rest
on stakeholder demand and which rest on their own judgement.

---

## 2. What GT actually asked for

Line references are to `docs/interviews/CRYSTAL_MARTEL_INTERVIEW_NOTES.md`.

### 2.1 A custom in-house test is the ask, in her words, unprompted

She raised it herself before the team described anything (L224–226):

> "My goal — I said this to Pam before I knew there were interns (welcome,
> guys) — **was to see what I could build out with the team regarding custom
> tests.** So what work, if any, have you done on what a custom in-house test
> would look like?"

Registered together with the automation requirement below as **E-402**.

And the criterion the test must predict is fit to the platform, not giftedness
(L287–292, L305–306):

> **Tiffany:** "It's more that the test should measure whether a student would
> excel on Timeback, rather than a generic gifted metric…"
> **Crystal:** "To a certain extent, yes — and at a rigorous pace…"
> "So, the long way of saying yes: **we're looking for giftedness *and* people
> who thrive on the Timeback platform.**"

This is already registered as E-097 and ratified in `D-015`. It is restated here
only because it is the thing the rescope makes primary.

### 2.2 Automation is a requirement, and she names the volume

L483–493 is the clearest statement of need in either transcript:

> "Ideally, though, **the test we create will need an algorithm to make that
> decision — the instant cutoff** — because if we're talking about **thousands
> and thousands of children** doing this screener, I do not want a human going
> through each and every application; **that's impractical.** … So if we have a
> test we're creating — I love the idea — **the algorithm needs to be pretty
> darn accurate** to filter out 'try again in six months or a year from now.'"

She is the sole reviewer (L500), and she says the current per-applicant human
process does not survive contact with the virtual program's scale.

### 2.3 GT owns the cut; the deliverable is a tunable model

The team proposed this and she accepted it without qualification (L533–537):

> **Speaker 1:** "I think we can scope proving the test — or we can provide the
> facilities for you to test it and modify it yourself. **We can provide the
> model and let you or your admissions team tune the parameters to get that
> cutoff exactly where you want it.**"
> **Crystal:** "Awesome."

She also volunteered the validation data that makes tuning meaningful (L398–406):
the ~46 on-campus students dummy-tested in an afternoon, everyone's CogAT and
MAP on file, historical Riverside CogAT distributions, with a ≤45-minute
constraint on test length.

### 2.4 GT already has the application. It wants the test in it.

This is the load-bearing evidence for the "total app" pivot, and it is
unambiguous (L204–211):

> **Tiffany:** "Do you know approximately what time frame this would be deployed
> by? **Would this be something we could integrate our tests into — this
> environment?**"
> **Crystal:** "**100% — that is the goal.**"
> **Tiffany:** "Okay."
> **Crystal:** "**That is exactly what we want to be doing.**"

The environment in question is an admissions/reviewer dashboard she already
owns: "Yes, and I have that built on the back end" (L170), "it is technically
live on a dummy page" (L200–201), built by her husband's company, and she
offered to share the tech stack so the team could match it (L217–219). Her
stated destination is a single "GT Universe" portal with GT School and GT
Anywhere pipelines side by side (L150–158). Registered as **E-401**.

**What this means for us.** Every hour spent building a family portal,
admissions queue, reviewer workspace, or applicant-correction workflow is an
hour spent rebuilding something the customer already has and did not ask us to
replace. She asked for the one component she does not have.

---

## 3. What the interview does *not* say

### 3.1 Program-effect evaluation never comes up

Across both transcripts, the following terms appear **zero** times:

```
program effect · causal · counterfactual · lottery · random ·
control group · comparison group · impact
```

Reproduce with `grep -ci` against the notes file. The two uses of "validate"
(L92, L392) are both about validating *the screener* against CogAT and MAP —
criterion validity — not about estimating what GT's program does to a child.

So the interview neither requests program-effect work nor asks for it to be
dropped. **Treating Crystal's interview as authority for demoting R2/R3/R6
would be reading a demand into a silence.** It is not evidence of what GT wants
on this question; it is evidence that this question was not on the admissions
director's agenda. That is registered honestly as E-404, classed as a reasoned
inference from a bounded source rather than as a company claim, because one
stakeholder's priorities in one 41-minute conversation do not establish GT's
institutional position.

The defensible statement is narrower and still useful: *the only person at GT
who owns the admissions decision, asked what she needs, asked for a screener and
described no evaluation need.* That justifies making the screener primary. It
does not by itself justify making program effect non-binding.

### 3.2 But the interview does undercut the counterfactual design's precondition

This is the genuinely new finding, and it is the strongest evidentiary support
`D-400` has for the demotion.

`R2`'s ratified implementation (`D-010`, `EV-01`, `H3`, BrainLift SPOV 1) is a
randomized offer-versus-not-offered lottery among equally eligible Track B
candidates. `H3` states the precondition in its own text: "**When genuine
scarcity and ethical equipoise exist**, random assignment among qualified
applicants provides the strongest separation…". `E-010` records the same
precondition as an explicit **open assumption**: "GT will have enough eligible
applicants and constrained seats for the selected design… **Unverified.**"

The interview is the first real evidence on that assumption, and it points the
wrong way.

**The virtual program does not ration seats** (L504–507):

> "Frankly, **for GT Anywhere right now, they just let everybody in** — I'm the
> first admissions person to be like, 'whoa, whoa, wait a second.'"

**Physical capacity is demand-limited, not seat-limited** (L430–444):

> "If we have locations for physical campuses, the answer is … **we can
> exponentially open ten campuses tomorrow if we had enough interest.** … we
> will not open a campus unless we've got at least 20–30 students to start it. …
> If we open a physical campus, let's make it 20–30 kids, so there's traction —
> once you hit 30 it starts exponentially filling up, and our physical campus
> can hold up to 100 students."

A program that opens a campus when 20–30 families ask for one, and that
currently admits everyone who applies to its 300-student virtual arm, does not
have more qualified applicants than seats. Without oversubscription there is
nothing to randomize, and randomizing anyway would mean **manufacturing scarcity
for research purposes** — denying a seat to a qualified child GT would otherwise
have taken. That is barred by `R9` and by the charter's "rights before research"
principle, and it would be barred even if the owner wanted it.

Registered as **E-400**. Note what this does *not* say: it does not say GT will
never be oversubscribed. Crystal is describing today. If the screener works and
demand outruns campus openings, the precondition could return. That is precisely
why `D-400` demotes R2 rather than retiring it.

### 3.3 The same interview strengthens a *different* counterfactual design

The lottery needs scarcity. A **regression discontinuity** needs a hard,
mechanically-applied threshold — and the interview documents several, in detail
(E-096, L456–467): the 85th-percentile fall MAP Reading gate applied to "every
student, regardless of CogAT"; two MAP screeners above the 95th; a blended
CogAT+MAP aggregate above the 90th; a 99th-percentile composite waiver.

`EV-13` ("Track A cutoff regression-discontinuity audit") already exists in the
feature map as `Future / Specified/researched`. The interview makes it more
credible than it was, not less, because it confirms the thresholds are real and
applied rather than advisory.

And this is what gives "pursue program effect **through the test**" a concrete
meaning rather than a reassuring one. A screener that runs at scale with a
locked, versioned, tunable cut *is an assignment mechanism with a discontinuity
at a known point.* Building it — which `R11` requires anyway — creates the
running-variable and the sharp cut an RD design needs, and does so as a
by-product of the primary aim rather than as a parallel workstream. The rescope
is therefore a re-sequencing, not an abandonment: build the instrument that
makes identification possible later, instead of designing an identification
strategy for an assignment mechanism that does not yet exist.

`D-400` does not ratify an RD design. It records that the door is open and names
`EV-13` as where that work would live.

### 3.4 There is no outcome window inside the capstone

Secondary but decisive for `R6`. The internship's final day is ~2026-08-14 and
GT's school year starts 2026-08-12 (L528–531):

> **Speaker 1:** "Our final day is, I think, the 14th of August."
> **Crystal:** "Oh man — **testing is going to be tough. We don't even start
> school until August 12th.**"

Two days of instruction is not a growth-measurement horizon. `R6` requires "a
pre-program baseline", a "fixed" time horizon, and attrition handling. None of
those can be satisfied, or even meaningfully rehearsed against real data, before
the capstone ends. Registered as **E-403**.

---

## 4. What is lost — claims the repository can no longer make

This is the section the owner should read most carefully. A rescope that lowers
the evidentiary standard while leaving the old claims standing is a worse defect
than the thing it fixes.

### 4.1 The boundary that does *not* move

**Nothing about what may be claimed changes.** `R4` and `R10` stay Required and
are strengthened, not weakened, by `D-400`. The rubric's automatic-rejection
conditions — "relies only on admitted-student before/after results for causal
impact" and "makes a claim stronger than the identification design" — are
untouched.

The asymmetry is deliberate and worth stating in one sentence: **`D-400` removes
the obligation to build a counterfactual; it does not grant permission to claim
a program effect without one.** The two are independent. Demoting R2 makes the
set of claims the project can support *smaller*, not the standard for making
them *lower*.

Concretely, after `D-400` the project may claim, if it earns them: that the
screener can be operated; that it scores reliably; that its outputs relate to
CogAT/MAP in a measured way; that access changed. It may **not** claim: that GT
School causes growth, that admitted students grew *because of* the program, or
that the screener identifies students who *will benefit* — that last one is a
causal claim wearing a selection claim's clothes, and it is the one most likely
to be made by accident.

### 4.2 Claims that now overstate what the design supports

Each of these was true, or defensible, while `R2` was binding. Each is now
unsupported or contradicted. **None is edited by this change** except where
noted, because most live in dated research records and the project's rule is
that reversals create new entries rather than rewriting history. They are listed
so the overstatement is visible rather than silent.

| # | Location | What it claims | Why it now overstates |
| - | --- | --- | --- |
| 1 | `docs/research/EVIDENCE_DOSSIER.md:96` | `[INFERENCE]` "**our program has genuine scarcity (more qualified applicants than seats)** and can run a lottery *among qualified applicants*" | Directly contradicted by E-400. This is the single worst one: it asserts as an inference the exact precondition the interview falsifies, and every downstream lottery-feasibility claim rests on it. |
| 2 | `docs/research/EVIDENCE_DOSSIER.md:98` | "a lottery is credible *only* under genuine excess demand, **which our qualified-applicant scarcity supplies**" | Same contradiction, embedded in the implication clause of an otherwise-verified source bullet, so it reads as source-backed when the GT-specific half is not. |
| 3 | `docs/research/EVIDENCE_DOSSIER.md:23` (claim **C5**) | Randomized admission among qualified applicants "is the strongest feasible way to estimate program effect" for this project | "Strongest" survives; "feasible" does not, at current GT scale. |
| 4 | `docs/research/EVIDENCE_DOSSIER.md:25` (claim **C7**) | "The design is **feasible and precedented**" | The precedents are real; the transfer to GT is what E-400 undercuts. E-060 already carried an explicit transfer-limit caveat for the SSP comparator that this claim does not honour. |
| 5 | `brainlifting/gt-school-counterfactual-brainlift/…:26` (**SPOV 1**) | "A capability-gated admission lottery is a **clean and feasible** method of collecting causal evidence" | Feasibility is the contested half. The SPOV's *reasoning* is unaffected; its applicability to GT today is not established. |
| 6 | same file, **SPOV 3** | Conditions under which GT should "expand the admitted cohort … toward the 10K MIT-ready kids by 8th grade goal" | Conditional on a lottery result that is no longer a planned deliverable. Separately, the figure is wrong: the interview says ~100,000 (E-101), and `D-015` already tracks the 10K→100K correction as an open follow-up. |
| 7 | `docs/product/CONCEPT_OPTIONS.md:15` | The shared problem requires a product that "supports a credible comparison between program participation and the counterfactual" | Was a binding property of any acceptable concept; now a property of the non-binding arm only. Reference library, unratified — low risk, listed for completeness. |
| 8 | `docs/critic-ready-product-roadmap.canvas.tsx:46,55,56` | Week 2–3 **P0 `critical: true`** deliverables: "Define the counterfactual, estimand, assignment/comparison design", "Runnable counterfactual demo", "outcome simulation" | Plan-level commitments to build the thing that is now non-binding. Marked critical-path against `R2, R3, H3`. Should be re-prioritized, but the roadmap is a lower-precedence plan artifact and re-planning is not this change. |
| 9 | `docs/research/ASSUMPTIONS_AND_EVIDENCE.md` — **E-010** | "GT will have enough eligible applicants and constrained seats for the selected design." Status: `Unverified` | **Edited by this change.** It is no longer merely unverified; there is now evidence against it. Its Status field is updated to point at E-400. The claim text is left intact. |
| 10 | `docs/governance/DEVELOPMENT_RUBRIC.md:28,29,32` | `R2` / `R3` / `R6` listed among gates where "all applicable required gates must pass" | **Edited by this change**, minimally. Left alone, precedence-3 rubric would contradict the precedence-2 requirements document. See §6.3. |
| 11 | `docs/governance/DEVELOPMENT_RUBRIC.md:46` | Concept scorecard weights **Causal credibility at 30/100** — the single largest weight | A scorecard that assigns 30% of a concept's score to the non-binding aim will systematically mis-rank screener concepts. **Deliberately not changed** — see §7, judgement call 4. |
| 12 | `docs/governance/DECISION_LOG.md` — **D-010** | Ratifies the two-stage evaluation design, MAP as the outcome measure, and the fee-waiver/questionnaire follow-up apparatus | Not withdrawn and not rewritten. It remains the ratified *design* for a program-effect evaluation; it is no longer a binding *deliverable*. `D-400` records the change in status. |
| 13 | `docs/governance/DECISION_LOG.md` — **D-015** | "Retain the counterfactual/lottery design (R2; D-010) unchanged as the program-effect evaluation arm — the screener defines the capable/fit pool, **the lottery measures program effect**" | The clause `D-400` most directly supersedes. Not rewritten. |

Two further observations for the owner.

**The evidence dossier is the real exposure.** Items 1–4 are in a document whose
own header banner reads "Predictive validity ≠ program impact. Before/after ≠
counterfactual. A cited number defends a claim only if it actually measures what
the claim asserts." Items 1 and 2 are the dossier failing its own test — a
GT-specific factual assertion carried inside `[VERIFIED]` and `[INFERENCE]`
bullets whose sources are about Boston charter schools. That was already true
before the interview, since `E-010` was always unverified. The interview turns a
weak inference into a contradicted one.

**Correcting them is a separate change.** Rewriting the dossier and the
counterfactual BrainLift is a research-workstream task with its own review, and
`D-015` already tracks BrainLift reframing as a deferred follow-up. Bundling it
here would make a governance rescope unreviewable. Recommended as the immediate
next branch.

---

## 5. Requirement-by-requirement consequence map

Produced before any edit. "Binding" means: the capstone is not complete without
it. Every requirement keeps its ID; nothing is deleted or renumbered.

| ID | Title | Program-effect content? | Disposition | Reasoning |
| --- | --- | --- | --- | --- |
| `R1` | Produce an actual student-selection decision | None | **Required** | The screener *is* a selection decision. Unaffected. |
| `R2` | Create a credible counterfactual | **Entirely** | **→ Non-binding** | Its whole subject is the comparison that identifies program effect. Mechanical consequence of the owner's instruction. |
| `R3` | Define the causal question before observing results | **Entirely** | **→ Non-binding** | Every element it fixes in advance — estimand, comparison condition, measurement horizon, maximum causal claim — presupposes a causal study. Nothing in it constrains a screener. |
| `R4` | Avoid circular selection and success measurement | **Mixed** | **Required, reworded** | Judgement call — see §7.1. Its binding force is a *prohibition* ("do not present percentile standing as evidence the program caused growth"), which costs nothing to keep and is the exact protection that must not lapse. Its one build-mandate clause is conditionalized. |
| `R5` | Preserve a defensible capability-and-fit standard | None | **Required** | Post-`D-032` this is the screener's own validity requirement. Becomes more central, not less. |
| `R6` | Measure growth without a gifted-student ceiling | **Entirely** | **→ Non-binding** | "The **primary outcome** must be capable of detecting meaningful growth" with "a pre-program baseline", a fixed horizon, and a "comparison group" — this is the impact outcome, not the screener. Also operationally impossible in the remaining window (E-403). See §7.2 for the ceiling concern it leaves behind. |
| `R7` | Make the process auditable and falsifiable | **One bullet** | **Required, bullet scoped** | Only "Primary outcomes and analyses are preregistered" is program-effect-specific; scoped to the non-binding arm. Rule-locking, logging, null-reportability and company-claim separation all apply to a screener and stay binding. |
| `R8` | Be feasible under real GT constraints | **One bullet, already conditional** | **Required, unchanged** | "Applicant volume and statistical power are assessed **before causal claims are promised**" is already written as a conditional. It needs no edit and keeps full force. |
| `R9` | Protect students and families | None | **Required** | Not negotiable, and load-bearing: it is the reason manufacturing scarcity to enable a lottery is off the table (§3.2). |
| `R10` | State the boundaries of every conclusion | **It is the boundary** | **Required, strengthened** | The five-milestone ladder — operable, reliable, access changed, outcomes changed, program caused the change — is what stops the rescope from becoming a licence. A gaining requirement, not a losing one. |
| `R11` | Provide a scalable, tunable, GT-validated screening instrument | None | **Required — now primary** | Arrives with `D-032`. `D-400` makes it the aim the others serve. |

**Full set that moves: `R2`, `R3`, `R6`.** The task brief anticipated `R2`, `R3`,
`R4` "at minimum". The verified set differs in both directions: `R6` also moves
(it was not named), and `R4` does not (it was). §7.1 argues the `R4` call.

### High-leverage requirements

`H3` (address unobserved selection), `H5` (independent evaluator), `H6`
(statistical information) and `H8` (protect current high performers) all serve
the now-non-binding arm. They stay in the High-leverage tier at their existing
IDs. No tier change is proposed: High-leverage is already a "should, unless
justified" tier, and an item that serves a non-binding aim is self-evidently
justifiable to omit. Adding a fourth tier to express that would be churn.

---

## 6. Why a third tier, and not High-leverage

The instruction allowed either. A separate, explicitly-labelled non-binding tier
is cleaner, for three reasons — the first of which is close to decisive.

**6.1 High-leverage would force a renumber, and a renumber orphans citations.**
`H1`–`H10` are occupied. Moving `R2` into the High-leverage tier means either
renaming it `H11`, which orphans every existing `R2` citation across the
repository, or leaving a heading that reads `R2` inside a section titled
"High-leverage requirements", which breaks the convention that `R` means
required and would confuse every future reader. Orphaning ratified IDs is
exactly the failure `docs/governance/REQUIREMENT_ID_AUDIT.md` documented earlier
tonight and `D-032` just finished repairing. Repeating it hours later would be
indefensible. A third tier inside the same document keeps `R2`, `R3`, `R6`
defined — `scripts/audit-requirement-ids.mjs` treats any `^### R\d+\.` heading in
`docs/product/project-requirements.md` as a definition regardless of section, so
every one of their citations continues to resolve.

**6.2 High-leverage carries a default-include obligation that contradicts the
rescope.** The tier's own text: "These should be included **unless the team
documents why they are infeasible or counterproductive**." Filing R2/R3/R6 there
would immediately require writing a justification for not doing the thing the
owner just made optional — reintroducing the binding force through the back
door, and generating a paper exercise.

**6.3 A separate tier makes the rescope legible where it matters.** A reader
scanning the requirements document should be able to see which aim is binding.
Folded into High-leverage, `R2` disappears among `H1`–`H10` and the most
important governance change of the week becomes invisible in the document that
defines it.

The tier's binding rule is written to be conditional rather than merely weak:
*not required for capstone completion; if the project makes or publishes a
program-effect claim, these govern that claim in full.* That construction is
what prevents the rescope from licensing a cheap causal claim — there is no tier
in which a weak counterfactual becomes acceptable. You either meet `R2`/`R3`/`R6`
or you do not make the claim.

---

## 7. Judgement calls

Applied on a best reading, and listed because a reasonable owner could decide
each differently. These are also reproduced at the top of the pull request.

### 7.1 `R4` stays Required — against the brief's expectation

The brief named `R4` among requirements that "encode program-effect
demonstration as mandatory". Reading its text, it mostly does not.

Its three evidence bullets are all prohibitions that cost nothing to satisfy
without a counterfactual: selection criteria and impact outcomes have distinct
roles; prior achievement is a starting condition, not proof of impact; national
percentile standing alone is not presented as evidence the program caused
growth. Those are the project's stated claim boundaries, nearly verbatim.
Demoting them would mean it is *optional* to refrain from presenting percentile
standing as proof of causation — which is not a rescope, it is a licence, and it
is the specific defect the brief warned against.

`R4` also does independent work under a test-primary scope that has nothing to
do with program effect: the screener is validated against CogAT and MAP while
GT's admission rule is *built on* CogAT and MAP. Validating a selection
instrument against the signals it is meant to replace, then reporting the
agreement as evidence the instrument works, is circular in exactly the way `R4`
exists to catch. It is arguably more relevant after the rescope than before.

What I did instead: kept `R4` Required and conditionalized its single
build-mandate clause, so it reads as "if program impact is claimed, it must be
evaluated as change relative to a credible counterfactual" rather than as a
standing obligation to construct one. **If the owner disagrees, the minimal
alternative is to split it** — `R4` stays Required as the anti-circularity and
claim-boundary rule, and the counterfactual-evaluation sentence moves wholly
into `R2`. I did not split it because splitting a requirement mid-rescope
creates a new ID and a new set of citations to maintain.

### 7.2 `R6` moves, but the ceiling problem does not disappear

`R6` is written about the impact outcome, so it moves cleanly. But its
underlying concern — that instruments ceiling out on gifted children — applies
with full force to the screener itself, which by design measures children at the
top of the distribution. That concern currently has no binding home: `R11`
requires validation against CogAT/MAP but says nothing about upper-range
precision, and `H1` is about measure breadth, not headroom.

I did **not** add a new requirement or amend `R11`, because inventing a
requirement is not a mechanical consequence of the owner's instruction. Flagging
it as a live gap. The cheapest fix is one bullet on `R11`.

### 7.3 The scope boundary is proposed, not mechanical

§8 assigns 99 feature IDs to keep / reduce / out-of-scope. The extremes are
forced by the interview (the screener stays; a family portal GT already has does
not). The middle is judgement — see the four contested calls flagged inline in
§8.4. `D-400` ratifies the boundary; it deletes no code, and any code removal is
a separate decision.

### 7.4 The rubric's 30-point causal-credibility weight is left alone

The concept scorecard gives `Causal credibility` the largest single weight,
30/100, and `Measurement validity and power` 15. With the aims re-ranked, this
systematically under-scores exactly the concepts the project now wants. Leaving
it produces a scoring instrument that argues against the ratified direction.

I did not rebalance it because choosing new weights is a fresh judgement with no
evidential basis in the interview, and a wrong rebalance is harder to detect
than a stale one. **Recommended for the owner:** roughly invert the top two, to
`Causal credibility 15` and `Measurement validity and power 30`, or split
`Causal credibility` into "claim discipline" (binding, retained weight) and
"identification strength" (non-binding, reduced weight). The second is better
and is more work.

### 7.5 `D-010` is left standing

`D-010` ratified the two-stage evaluation design in detail — MAP as the outcome,
the fee-waiver incentive, the resource questionnaire. All of it now describes a
non-binding arm. I did not mark it Superseded, because it is not wrong; it is
the still-correct design for an evaluation that is no longer scheduled. `D-400`
records the status change and cites it. If the owner prefers, `D-010`'s status
could move to `Approved (non-binding arm)`, but that edits an existing entry and
the log's rule is that reversals create new entries.

---

## 8. Scope boundary — "pivoting away from a total application"

Governance scope only. **No code is deleted by this change.** Existing
implementations remain in the tree; what changes is whether further investment
in them is in scope. Feature IDs are from
`docs/product/FEATURE_TO_REQUIREMENT_MAP.md`.

### 8.1 Principle

Crystal has an admissions application and wants the test inside it (§2.4). So
the boundary is drawn at the seam she named: **we build the instrument and the
integration surface; GT keeps the application.** A feature stays in scope only
if the screener cannot be built, validated, tuned, embedded, or defended without
it.

### 8.2 In scope — the instrument

- `AX-01`–`AX-06` — the adaptive screener sub-application (`D-016`). The
  deliverable.
- `packages/exam-engine`, `packages/exam-scoring`, the item bank, the verifier
  registry, and the validation harness.
- `GOV-01`–`GOV-08` — governance. Unchanged; it is how the work is reviewable.
- `BE-13` (generated types), `OPS-01` (workspace boundaries), `SEC-04`
  (service-role elimination), `SEC-05` (born-synthetic loopback guard) —
  infrastructure the screener runs on.
- `BE-09`, `BE-10`, `BE-12`, `BE-11` — immutable versioning, canonical hashing,
  hash-chained audit, replay. These are `R7`, and `R7` stays Required: a
  screener whose scoring cannot be reconstructed cannot be defended to GT.
- `SEC-01`–`SEC-03`, `SEC-06`–`SEC-09` — the data boundary around test-taker
  records.
- `UI-05` — integration shell and synthetic banner. This is the seam into GT's
  portal, and after the pivot it is one of the more important surfaces, not one
  of the least.

### 8.3 Reduced to "supports the screener only"

Kept, but scoped to what the instrument needs. Further build-out beyond that is
out of scope.

- `UI-01` Family Portal → reduced to: get a child into a test session and return
  a result. **Not** the six-stage `D-014` admissions journey.
- `UI-02` Admissions Operations Dashboard → reduced to: parameter/cut tuning and
  the validation view (this is the "let your admissions team tune the
  parameters" deliverable, §2.3). **Not** completeness queues, assignment
  queues, or correction-rerun operations.
- `F11.2` Configuration and policy registry → reduced to screener parameter
  versioning and cut locking.
- `F11.3` Decision audit and replay console → reduced to screener sessions.
- `F6.1`/`F6.2` Accommodations and administration invalidation → reduced to
  **test** accommodations and invalid-administration recovery. `R9` is Required
  and a child who tested in a noisy room is a case Crystal raised herself
  (L480–483).
- `F9.1`/`F9.2` Explanation and factual correction → reduced to explaining and
  correcting a **screener result**. `R9` and `H9` remain Required.
- `F10.1`/`F10.3` Consent separation, purpose limitation and retention →
  reduced to screener data.
- `F7.1`/`F7.5` Routing and deterministic reasons → reduced to the screener's
  own admit / defer / "try again in six months" output (L491–493). **Not** the
  dual-track eligibility aggregation.
- `BE-01`–`BE-08`, `BE-14`–`BE-16` → the screener-serving subset only
  (sessions, items, responses, telemetry, scoring, RPC boundary).

### 8.4 Out of scope — the application GT already has

Reduced-investment, not deleted. Existing code stays and keeps working.

- `F2.1`–`F2.5` — reusable profiles, cycle applications, accessible intake
  routes, school directory, financial-aid intake.
- `F3.1`–`F3.3` — parent observable-evidence form, narrative fallback,
  third-party recommender surface.
- `F4.1`, `F4.2` — talent-task hub (already Deferred), learning-response tasks.
- `F5.1`, `F5.2` — artifact provenance and assistance metadata.
- `F7.2`, `F7.3`, `F7.4`, `F7.6` — Track B invitation rule, eligibility
  aggregation, prohibited-input firewall as an admissions-wide construct,
  allocation handoff.
- `F8.1`–`F8.4` — anchored rubric, blind two-reviewer panel, calibration,
  abstention/replacement. **This is the largest single removal.** It is the
  human-review apparatus that Crystal explicitly wants automation to replace at
  the screening stage (L483–487). The human path `R11` preserves is GT's
  shadow day, run by GT's guides — not a reviewer workspace we build.
- `F9.3`, `F9.4`, `F9.5` — procedural cure, substantive appeal, automated
  re-entry (the latter two already Deferred by `D-010`).
- `F10.2` — data-rights request intake as a full workflow.
- `F11.1`, `F11.4`, `F11.5` — admissions queues and SLA fail-safes, compliance
  exports, incident propagation.
- `UI-03`, `UI-03S` — Reviewer and Review Supervisor workspaces.
- `UI-04` — Configuration and Audit view (already Deferred).
- `EV-01`–`EV-21` — the entire evaluation block moves to the non-binding arm.
  All 21 are already `Future`, `Blocked` or `Deferred`; what changes is that
  they no longer have a binding requirement above them. `EV-13` (RD audit) is
  called out in §3.3 as the most promising survivor.

**Contested calls inside this boundary**, flagged rather than buried:

1. **`F8.x` reviewer panel.** Removing it is a real loss of `R5`/`H1` machinery —
   blind independent review with calibration is the strongest non-test evidence
   apparatus the project has. Justified because Crystal wants the screening
   stage automated and keeps her own behavioral review at shadow day. Contest
   this if Track B artifacts are meant to survive.
2. **`F7.2` Track B invitation.** Track B is the regression-discontinuity group
   the team pitched and Crystal partly endorsed — "portfolio/artifacts are worth
   including, **but** every path must still confirm the student will be served
   by Timeback" (L118–124). Marking it out of scope reads that "but" as decisive.
   A defensible alternative is to keep Track B as a *screener output band*
   (a "defer to human artifact review" verdict) rather than as a separate
   application track. That is the reading I would take if the owner wants Track B
   preserved, and it costs little.
3. **`F2.5` / `F10.2` finance and data-rights.** Out of scope as *product
   surfaces*, but `R9` is Required and does not care whose UI the data sits in.
   If GT's portal handles them, our obligation is to not make them worse.
4. **`UI-01` Family Portal.** "Reduced" not "out" is a judgement. Someone has to
   render a test to a child, and until the integration into GT's portal is real,
   that surface is ours. If integration lands early, `UI-01` should drop to
   out-of-scope.

---

## 9. Verification

- `pnpm governance:ids` (`node scripts/audit-requirement-ids.mjs --strict`) —
  exit 0. `R2`, `R3` and `R6` remain defined by their `### R\d+\.` headings after
  the tier move, since the tool keys on the heading and not on the enclosing
  section, so no citation is orphaned. `E-400`–`E-404` and `D-400` are defined in
  their registers and cited outside them, and no ID is defined twice.
- `pnpm format:check`, `pnpm lint` — clean.

This change also depends on `D-032`, which is open as PR #17 at the time of
writing and not yet merged to `dev`. This branch is based on its remedy commit.

---

_This document reports repository state and interview content. It makes no claim
about GT School's program, the screener's validity, or program impact. Per `R10`,
a screener that can be operated and scores reliably has established neither that
access changed nor that outcomes changed nor that GT caused a change._
