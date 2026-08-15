# Proposal: the public screener

**What it is:** A free, short, public assessment a family can take in about fifteen minutes that tells them whether their child looks like a fit for GT and invites them to apply. It makes no admission decision and it can't reject anyone.

**The pitch:** Joe banned an in-house cognitive test for admissions decisions. This one makes no decision, so the engine we already built becomes usable again, and it deletes the step in GT's funnel that is currently losing the most children.

**Status:** Proposal. The adaptive engine and item bank it would run on already exist and work. Research
support is in `../../brainlifting/`, and the admission-cutoff and talent-screening BrainLifts there carry
most of the argument below.

---



## The problem

GT's admissions funnel doesn't begin at the application. It begins weeks or years earlier, when a parent
decides their child might be gifted. Every child whose parent never has that thought is invisible to GT,
and nobody knows how many of them there are.

That first step is a screening gate, and the research on screening gates is unusually clear about what one
costs. In a modelled analysis of gifted identification systems, placing a gate in front of the real test
drops the share of qualifying children found from 84 percent to 28 percent. The reason is structural. A
good test placed after a gate protects you from admitting the wrong child and does nothing whatsoever to
protect you from rejecting the right one, since the rejected child never reaches the test. Thus the
authors state it as a rule: "screeners cannot improve the sensitivity of an assessment system; they can
only reduce it."

**Parent self-identification is that gate.** Nobody chose it, nobody has validated it, and right now it is
the highest-leverage part of GT's admissions process.

There is also direct evidence for what removing it is worth. When a large district began testing every
second grader instead of waiting for referrals, holding its eligibility standards exactly where they were,
gifted identification rose 45 percent overall and 174 percent among disadvantaged students. However, the
detail that matters most for GT is this one: "A full 20% of the compliers have IQs of 130 or higher." The
referral system had been losing children who cleared the strict bar outright, and the authors concluded
that "the traditional referral system also misses some high-ability nondisadvantaged students." Then,
when funding for the screening was cut, the whole gain disappeared inside a year, which tells you the
mechanism was administrative and not developmental. The children were always there. Nobody was looking.

Of course, GT can't run universal screening. It doesn't own a district and can't test children who have
never come to it. What it can do is delete the requirement that a parent already knows.

Two things make this urgent instead of merely interesting.

**The current gate encodes advantage.** Research on single-test-plus-referral systems finds they track
family and social advantage, not ability alone. That is the same exposure Joe named when he banned an
in-house cognitive test: "Who's to say we're not only taking a certain type of person in this program."
So the current funnel already has the problem he's worried about, and a tool that reaches families who
would never have applied shrinks it.

**Nothing in admissions is currently a growth mechanism.** Joe wants 100,000 children. Crystal has roughly
350 and describes the pipeline as "pretty cut and dry." Every part of the process is built to evaluate the
people who arrive, and no part of it is built to make more of them arrive.

## The proposed solution

A free public assessment, about fifteen minutes, that a family opens from a link. Schools, community
groups and GT's own marketing can hand it out. At the end it either recommends applying to GT or shows a
neutral page about what GT looks for. That's the entire output.

### The one design rule everything else follows from

**The tool can only ever open a door.** It never tells a parent their child isn't gifted. It has exactly
two outcomes: apply, or here's more about GT. Nothing in between and nothing negative.

That single constraint is doing a lot of work. It keeps the tool clear of Joe's ban, since the ban covers
an instrument that makes an admissions decision and this one makes none. It also keeps GT clear of the
legal exposure sitting behind the ban, because the risk in a selection instrument comes from an adverse
decision about a protected class, and a tool with no adverse outcome produces none. Additionally, it fixes
the error tolerance for us: a tool that can only add people to the funnel should be tuned to recommend
generously.

### What it is built from

The archived work already holds 57 generative reasoning item types across verbal, quantitative, spatial
and fluid reasoning, plus adaptive item selection, Bayesian ability estimation and seeded replay. That
work stopped because Joe banned an in-house cognitive test for admissions. **However, he banned the
decision, not the technology.** Moved upstream of every decision, the same engine is useful, defensible
and mostly finished.

Generative items also matter here for a specific reason covered under evidence below. A public test that
families can retake needs a bank that never serves the same form twice, and a generative bank gives us
that for free.

### One engine, any number of front doors

**The screener should be built as a scoring service that knows nothing about how it is displayed.** A
surface asks for the next item, sends back the answer, and gets a result at the end. Everything about item
selection, difficulty, stopping and the recommendation lives behind that boundary. Thus a new front door
is a presentation layer and not a new product, and standing one up costs design time instead of
engineering time.

The archived build already splits this way, with the exam engine in its own package and the web app
consuming it, so we would be extending a boundary that exists instead of inventing one.

Marketing and admissions can therefore put it wherever they decide it belongs:

- An unbranded lead-generation site, where GT's name doesn't appear until the result page.
- The official GT site and the admissions pipeline, as a step inside the flow Crystal has nearly finished.
- A partner school's own page, co-branded or white-labelled.
- A game or simulation surface, Roblox included, if GT ever decides that is on-brand.
- Email or a QR code at an event, since a link is all it takes.

Each surface also tags its own results. So the tool tells GT which channel is producing applicants who
actually clear the CogAT bar, which is the attribution question a marketing team asks first and currently
can't answer for any channel.

However, one consequence needs stating rather than glossing over. **Two surfaces will not produce
comparable numbers.** Game familiarity predicts performance on game-delivered tasks without predicting
ability, which is construct-irrelevant variance, and interface controls and graphics consume the working
memory the reasoning itself needs. Therefore each surface carries its own recommendation threshold, and a
surface that changes how items are presented has to be treated as its own instrument with its own
calibration, not as a skin over a shared one.

### What a marketing admin can tune, without engineering

- **The recommendation threshold, per surface**, expressed as how likely a child is to clear GT's actual
bar instead of as a raw score.
- **How much confidence to require before recommending**, which trades test length against certainty.
- **Test length and the item mix per age band.**
- **The exact wording of each outcome.**
- **Which ages are eligible.**

A loose threshold is the recommended practice here, not a compromise we're making for marketing. The
co-author of the CogAT writes that for a screening test you should "set a relatively low cut score so
capable students are not screened out too soon," aiming for a pool two to three times the size the program
can serve.

### What it collects

Since a family can be invited to create a GT admissions account at the end, results tie to a real
applicant record. That gets us four things GT can't buy today:

- Screener result vs. whether the family actually applied.
- Screener result vs. CogAT score, once the CogAT comes back.
- Screener result vs. admission outcome.
- On a longer horizon, screener result vs. how the child actually performs after enrolling.

Every one of those accumulates as a byproduct of marketing spend GT would be making anyway.

### What it deliberately does not do

- No score, percentile or IQ estimate shown to a family.
- No badges, points, streaks or rewards.
- No game framing.
- No admission decision, at any threshold, ever.
- One sitting per child.



## The evidence



### The referral step is where the population is lost

This is the load-bearing claim and it is covered above: 84 percent down to 28 percent when a gate precedes
the test, screeners can only reduce sensitivity, and universal screening raised identification 45 percent
with a fifth of the newly found children clearing the strict bar. If those numbers are even directionally
right for GT, then the funnel's largest loss is happening before GT knows a child exists.

### How loose the threshold should be, and the formula that answers it

Under unequal error costs, the cost-optimal threshold is the false-positive share of total error cost. So
work through what those costs actually are here. A false positive is a family who fills in an application
that gets declined, which costs GT a review and costs the family an afternoon. A false negative is a child
GT never learns about at all. Given that gap, the formula pushes the threshold very low, and the only real
constraint left is credibility.

In other words, **this is the rare case where the evidence and the marketing goal want the same thing.**

### What this has to beat is a parent's guess

The honest framing of the bar, and it cuts both ways. The incumbent first-stage filter is a parent's
intuition, and nobody has measured how good that is. Thus the bar this tool has to clear is probably low,
and we also cannot currently prove it clears it. That comparison is one of the things the tool would end up
measuring about itself.

### Letting families retake it would wreck it, and generative items are the fix

Across 153,000 people, simply sitting the same kind of reasoning test a second time raises the score by
about a third of a standard deviation, and by half by the third sitting, with nobody teaching anything.
The effect is larger in younger children. Worse, the inflated score predicts real performance *worse* than
the first one did, since the retest score shifts toward memory and away from reasoning, and one study found
the shift erased the test's criterion validity entirely.

Two design consequences follow. First, one sitting per child, enforced at the account level. Second,
alternate forms instead of identical ones, which nearly halves the inflation where repetition does happen,
at 0.226 vs. 0.372. Luckily the generative bank in the archive produces alternate forms as a side effect
of how it already works.

### Why making it pleasant is a measurement decision

This is the argument that squares the design with Crystal's brand constraint, so it is worth getting right.
Test anxiety makes children underperform, so a stressful format understates true ability and manufactures
false negatives. A low-anxiety format therefore removes a known downward bias instead of making the test
easier. Low-anxiety formats also reduce missing data and dropout in young children, and accuracy at the
tail is biased by who is missing from the data, so a format children actually finish gives a better
estimate for structural reasons.

However, the same literature draws a hard line at rewards. Tangible performance-contingent rewards cut
children's freely chosen interest in a task by 0.28 to 0.40 standard deviations and are "more detrimental
for children than college students," while positive feedback raised it by 0.33. **So the design is pleasant
and encouraging, with no points, badges or prizes.** That's evidence-backed and not a matter of taste,
which is a much better position to defend it from.

### The validity numbers it produces will be a floor

Worth stating up front so nobody over-claims it later. Only families who took the screener, then applied,
then sat the CogAT will show up in the correlation, which restricts the range twice. The observed
correlation will therefore understate the true relationship. Corrections for that kind of indirect
restriction are themselves biased downward, and the most recent work in the area found the field had been
over-correcting rather than under-correcting. Thus the number should be reported as a lower bound and
labelled that way.

## How to validate it

Four tests, cheapest first.

**1. Follow-through against a control.** Split a marketing cohort: half get the screener, half get a
conventional landing page. The outcome is applications started and applications completed. This is the
entire business case and it is measurable in weeks.

**2. Yield quality.** Of the applicants the screener produced, what share cleared the CogAT bar? Compare
that against the share among families who arrived on their own. If screener-sourced applicants clear at a
similar rate or better, then the tool is finding children instead of manufacturing volume.

**3. Correlation with the CogAT, reported as a floor.** Runs on data the process generates anyway.

**4. Reach, which is the real test of the premise.** One question on the application: would you have
applied to GT without this? If most screener-sourced families say they would have applied anyway, the tool
is a modest funnel improvement and nothing more. But if a meaningful share say no, then it is doing the
thing this whole proposal claims.

## The unknowns



### What GT has to decide

**Whether Joe accepts the distinction between an instrument and a decision.** This is the question that
kills the idea if the answer is no, and it is one conversation. Everything here rests on the ban covering
instruments that decide admission, and on a one-sided tool that can only recommend sitting outside that.
If Joe reads the ban as covering any cognitive measure GT builds regardless of what it is used for, then
nothing here survives and we should drop it instead of arguing it.

**Whether this fits the posture Crystal wants.** She has said she would like to "flip that narrative that
it is a privilege that we consider you for an elite campus like GT School. You tell me why I should take
your child." A free tool that courts families runs against that on its face. There is a version that
supports it, where the screener makes the standard visible and demanding and works as a gauntlet instead
of a giveaway. Still, that's a real tension and it should be settled deliberately rather than discovered
in the copy.

**The name and the framing, which carry almost all of the brand risk.** A free "is your child gifted" quiz
is the most cheapened format on the internet, and Crystal has been explicit that GT can't be known for
cheap tech. The engineering here is straightforward and the positioning isn't. So this is the part that
needs her judgment most and ours least.

**Which surfaces are on-brand, which is her call and not ours.** Building it portable means we don't have
to settle this before starting. Still, it's worth being explicit that a game or Roblox surface runs
straight into her stated constraint that GT must not be "known as the school that's using video games to
track." Making the tool *able* to run there defers that decision to her instead of quietly making it for
her. A game surface also costs measurement quality for the reasons above, so if it ever gets used it should
be for reach at the very top of the funnel and nowhere near a decision.

**Who distributes it.** Schools, community organizations, paid acquisition, GT's existing channels, etc.
The answer changes what the tool has to look like, though not what it has to do.

### What we would have to build or resolve

**Privacy and consent for children under 13.** Collecting assessment data on young children through a
public funnel is a regulated activity, and COPPA and FERPA both bear on it. This is a hard requirement and
it needs a real answer before launch, not after.

**Exactly what the recommendation says.** In a tool whose only output is a sentence, the sentence *is* the
product. It has to be encouraging without promising, specific without scoring, and it has to still work
for the parent of a child who then doesn't get in.

**What happens to a recommended child who is declined.** The tool creates an expectation and GT will
sometimes disappoint it. Our mitigation is to speak about fit for GT's specific model instead of about the
child, though the failure case needs designing rather than hoping.

**Whether the screener becomes the new thing families prep for.** If it is free and public and visibly tied
to admission, coaching will follow, and that recreates one step earlier the same prep-inequality problem
already affecting the CogAT. A rotating generative bank is the defense, and it is only a partial one.

**Whether an age band exists where this can't work.** K-2 is where reading is weakest and reliability is
lowest, and it is also the band where a parent is least likely to already know. So it is simultaneously the
highest-value target and the hardest technical case.