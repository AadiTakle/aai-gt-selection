# BrainLift: Talent Screening — What a Screener Is Graded On, How Few Items It Needs, and What Every Other Field Learned Before Education Did

## Owners

- Aadi Takle

## Purpose

### Purpose
This BrainLift asks what makes a talent screener good. It holds apart three questions that practice runs together: which statistic actually grades a screener, how few items a defensible decision needs, and which identification techniques find talent rather than merely rank it. A screener is not a test with fewer questions on it. Its job is to decide who advances, so it should be judged on the quality of that decision and on what it costs to be wrong in each direction. The document also goes looking outside education, because sport, the military and personnel selection have all been selecting people young for decades and several of them have measured what education has not.

### In Scope
- The statistics that grade a screening decision: sensitivity, specificity, predictive value, discrimination, calibration, net benefit, and incremental validity over what a program already knows.
- How few items a classification decision needs, and where the floor sits before a short instrument stops meaning anything.
- Identification techniques and their measured yield, including nomination, nonverbal-only screening, above-level testing and dynamic assessment.
- What talent identification looks like in sport, the military and hiring, and which of those findings transfer to academic selection.
- Predictors beyond measured reasoning, and which of them survive controlling for what is already measured.
- What keeps a generated item bank trustworthy: clone equivalence, calibration sample size, parameter drift and exposure.
- Provenance discipline throughout: what is peer-reviewed, what is a simulation, which numbers are computed rather than observed, and which widely quoted rules of thumb have no traceable source.

### Out of Scope
- Where a cutoff belongs and what fixing it as one number costs (`admission-cutoff`). This BrainLift takes the existence of a threshold as given and asks how well an instrument can decide against it.
- Instrument validity and tail quality (`gifted-assessment-quality`), validating a new test against an incumbent (`test-evaluation`), which signals earn a place in an ability estimate (`metric-evidence`), routing and session design (`test-structure`), whether measured reasoning moves (`reasoning-growth`), whether a learning rate is estimable (`learning-rate-scoring`), causal identification of a program's effect (`gt-school-counterfactual`), where a student starts once admitted (`placement-and-dosing`), and whether the work is the candidate's own (`proctoring-integrity`).
- Choosing a vendor, and mapping any of this onto a build or a live policy.

---

## DOK 4: Spiky Points of View (SPOVs)

**SPOV 1: A screener must be graded on net benefit at a stated exchange rate between a missed candidate and a wasted one. Accuracy and AUC are the wrong metrics, and reporting them instead is how a program avoids saying out loud what a missed child is worth.**

- **Elaboration:** The usual defence of accuracy is that it's objective while cost weights are political. However, that gets it backwards, because every threshold already encodes a weight and reporting accuracy just hides which one. The evidence that discrimination doesn't answer the question is direct: a richer model with AUC 0.82 against 0.80 produced curves that were "essentially overlapping" and made "no practical difference," and at some thresholds a rule with a "reasonably high AUC (0.72)" performed *worse* than simply saying yes to everybody (1.2). The authors of that work state the problem plainly: given a sensitivity, a specificity, an AUC and a calibration plot, "it is not at all clear how we could know whether the model's discrimination or calibration was sufficient to justify clinical use" (1.3). Net benefit fixes that by making the exchange rate an input rather than an accident, and the arithmetic is simple enough to state in one line: the share of true positives minus the share of false positives, weighted by pt/(1-pt), where pt is the threshold probability at which a decision-maker would act (1.3). Two reference lines make it readable, since a screener has to beat both "advance everyone" and "advance nobody," and a screener that beats neither should be switched off. Thus the discipline this imposes is the useful part. Naming pt forces a program to say how many unnecessary applications one recovered child is worth, and for a tool that can only recommend rather than reject, that ratio is lopsided enough that the honest threshold sits well below a half. Additionally, a screener has to clear incremental validity, which is a harder bar than it sounds: the standard is a demonstrated gain over the information a program already has, not a correlation with the outcome (1.4), and prior achievement already explains fifty-eight to seventy-five percent of later achievement with everything else adding two to eight points (5.6). Accuracy advocates counter that net benefit needs a cost ratio nobody can defend, and that an auditable misclassification rate beats a defensible-sounding number built on an invented weight.

**SPOV 2: A fifteen-minute screener may report a decision and must never report a score. At the item counts a short instrument can afford, a classification is defensible and a number is not, and this is the distinction that makes short screening legitimate at all.**

- **Elaboration:** The reflex when a test gets shorter is to keep the score and apologise for the precision. The evidence says give up the score instead, because the two outputs need very different amounts of evidence. On the estimation side the floor is well documented: with realistic item parameters, coefficient alpha runs about .90 at forty items, roughly .70 at ten, and .50 to .55 at five, and forcing a five-item test to .70 would need discriminations of 1.6 to 2.9, which those authors call "unrealistically high" (2.3). So a ten-item instrument reporting a percentile is reporting one built on a reliability nobody would accept for a decision about a person. On the classification side the same budget is adequate: a two-category adaptive classification hitting roughly ninety-five percent correct decisions averaged 12.7 to 16.3 items, and the single biggest lever on length wasn't precision but the width of the indifference zone around the cut (2.2). **The two outputs are not the same product at a discount. They are different problems, and only one of them is affordable.** Consequently the design follows: select items for information at the threshold rather than at the running estimate, stop on a confidence rule rather than a fixed length, and emit a probability with a band. There's a second reason to refuse the score, and it's about what the number would be used for. A percentile handed to a family is a claim about a child, while a probability of clearing a specific bar is a claim about a decision, and only the second is what a fifteen-minute instrument can support. Precision advocates counter that families and admissions staff will demand a number regardless, and that refusing to supply one just means somebody downstream invents a worse one.

**SPOV 3: A talent screener's first obligation is to measure its own false negatives. Every other field that selects children early has done this and found its early selection barely predicts, and education's silence is a measurement choice rather than an absence of method.**

- **Elaboration:** Education treats the children it rejects as unobservable, and the usual reason given is that you can't follow someone you didn't admit. Sport followed them, so the excuse doesn't hold. In the cleanest single-system dataset, only 16.3% of junior international athletes later reached senior international level, and running it backwards, only 2.5% to 31.4% of senior elites had been junior elites at the corresponding stage (4.3). Youth academies turned over 24.5% of members annually and national youth teams 41%, with 44.3% of national youth players appearing in exactly one season (4.3). The mechanism behind part of that error is measurable too, since children born early in the selection year are heavily over-represented in youth squads and that advantage inverts by senior level, which means the selectors were reading maturity as talent (4.1, 4.2). Additionally, entering a talent programme *earlier* predicts worse adult outcomes rather than better (4.4). Now, none of this transfers directly, because physical maturation has no clean academic analogue and a senior championship is a sharper outcome than anything a school measures. Still, the structural situation is identical: a young cohort selected on a measure taken at an age when the measure is least stable, into a programme whose own graduates become the only evidence anyone collects. **So the obligation is to build the false-negative measurement into the screener from the first day, because retrofitting it means finding the rejected children years later.** Concretely that means recording every screened candidate rather than every admitted one, keeping the decision the tool made, and attaching an outcome whenever one becomes knowable, including for candidates who were never recommended. Program advocates counter that tracking rejected applicants is a privacy and consent problem before it's a measurement one, and that a school has no standing to follow children it never enrolled.

**SPOV 4: Add spatial reasoning before adding anything non-cognitive, and when non-cognitive measures do go in, observe behaviour rather than asking. Spatial is the only missed-population claim in this literature with a number attached, and self-report is the one method that has failed everywhere it was tested.**

- **Elaboration:** The instinct at this point is to reach for drive, grit or mindset, because the cognitive side feels solved. Both halves of that instinct are wrong. On the first half, the largest quantified gap in talent identification isn't motivational at all: **70% of the top 1% in spatial ability did not qualify on the verbal and quantitative composites**, and over half of the top 1% on spatial sat below the top 3% on verbal and mathematical measures (5.1). Spatial adds about four percent of criterion variance over verbal and mathematical ability, and 45% of eventual STEM doctorate holders had been in the top four percent on spatial eleven years earlier (5.1). That's a content gap rather than a fairness gap, which makes it the cheapest thing on this list to fix, since it needs a battery rather than a new construct. On the second half, the self-report record is bad in a specific and repeated way. Grit explains essentially no variance in academic performance once conscientiousness is controlled, at ΔR = .004 for college grades, and correlates with conscientiousness at ρ = .84, which its own critics call strong enough to make it a renamed construct (5.3). Yet the perseverance *facet* alone does predict, at ΔR = .040 to .085, so the signal exists and the questionnaire is what destroys it. Growth mindset splits the same way, with a meta-analysis finding effects near zero and the large field trial finding a small effect concentrated in specific conditions (5.4), while the behavioural challenge-seeking task in that same programme predicted where the self-report did not (5.5). **Therefore the axis that matters is not cognitive against non-cognitive, it is asked against observed.** A screener that watches which problem a child chooses is measuring something; a screener that asks a child whether they like hard problems is measuring their theory of themselves. Construct advocates counter that a behavioural task in a fifteen-minute session captures one choice under one set of conditions, which is thinner evidence than a validated scale, and that dismissing self-report throws out most of personality measurement with it.

---

## Experts

> Chosen for productive tension. The first two entries disagree about whether a decision metric or an accuracy metric should govern, the third and fourth disagree with education's own practice, and the fifth exists to argue against the generative approach the rest of this makes possible.

### Andrew Vickers, Ben Van Calster, Ewout Steyerberg; Donna McClish; W. J. Youden
- **Who:** Biostatisticians and decision-analysts who built the modern apparatus for judging whether using a prediction rule beats not using one.
- **Focus:** Net benefit, decision curve analysis, partial AUC, calibration as a property distinct from discrimination, and the operating-point statistics that grade a threshold.
- **Why Follow:** They supply the argument that discrimination cannot answer the question a screener exists to answer, and they demonstrate it rather than asserting it: two models differing by 0.02 in AUC produced overlapping decision curves, and a rule with an AUC of 0.72 could do worse than acting on everyone. Their framework also forces the uncomfortable input, which is the exchange rate between a false positive and a false negative.
- **Where:** [Vickers & Elkin (2006)](https://doi.org/10.1177/0272989X06295361) | [Vickers, Van Calster & Steyerberg (2016)](https://doi.org/10.1136/bmj.i6) | [Van Calster et al. (2019)](https://doi.org/10.1186/s12916-019-1466-7) | [McClish (1989)](https://doi.org/10.1177/0272989X8900900307)

### Stephen Walter; Charles Lance, Marcus Butts, Lawrence Michels; John Hunsley and Gregory Meyer
- **Who:** Methodologists who audit the field's own conventions, including the ones the previous entry relies on.
- **Focus:** Whether partial AUC is an improvement or a distraction, where the reliability cutoffs everyone quotes actually came from, and what incremental validity has to demonstrate.
- **Why Follow:** They are the internal dissent, and one of them argues directly against the metric the first entry recommends. Lance and colleagues traced the .70 reliability convention and found that 44% of citations to its supposed source were for a number that source never proposed as a universal standard, while the same source said .90 was the minimum for decisions about individuals. That matters more for a short screener than any positive finding here.
- **Where:** [Walter (2005)](https://doi.org/10.1002/sim.2103) | [Lance, Butts & Michels (2006)](https://doi.org/10.1177/1094428105284919) | [Hunsley & Meyer (2003)](https://doi.org/10.1037/1040-3590.15.4.446)

### Arne Güllich, Joseph Baker, Stephen Cobley, Jochen Musch
- **Who:** Sport scientists who tracked youth selection systems longitudinally and measured what became of the people those systems chose and rejected.
- **Focus:** Relative age effects, junior-to-senior transition rates, and whether early selection and early specialisation predict adult performance.
- **Why Follow:** They did the study education has not. Their numbers are the closest available estimate of what early selection into an intensive programme is worth, and the answer is uncomfortable: junior success converts poorly, the selection advantage of being born early in the year inverts by adulthood, and earlier programme entry predicts worse outcomes. Read the transfer question carefully, since physical maturation has no exact academic counterpart.
- **Where:** [Güllich (2014)](https://doi.org/10.1080/24733938.2014.982204) | [Güllich, Macnamara & Hambrick (2022)](https://doi.org/10.1177/1745691620974772) | [Cobley et al. (2009)](https://doi.org/10.2165/00007256-200939030-00005) | [Musch & Grondin (2001)](https://doi.org/10.1006/drev.2000.0516)

### Jonathan Wai, David Lubinski, Camilla Benbow; Marcus Credé; Angela Duckworth
- **Who:** Individual-differences researchers on what predicts high accomplishment, and the meta-analyst who dismantled the most popular recent answer.
- **Focus:** Spatial ability's neglected role, conscientiousness, and whether grit is a construct or a renaming.
- **Why Follow:** Wai and colleagues supply the one quantified missed-population claim in this literature, that most of the spatially talented are invisible to verbal and quantitative screening. Credé supplies the counterweight to the motivational turn, finding grit adds essentially nothing over conscientiousness while correlating with it at .84. Duckworth belongs here because she has published cautions against using her own scale for selection, which is the rare case of an author restraining their own instrument.
- **Where:** [Wai, Lubinski & Benbow (2009)](https://doi.org/10.1037/a0016127) | [Credé, Tynan & Harms (2017)](https://doi.org/10.1037/pspp0000102) | [Poropat (2009)](https://doi.org/10.1037/a0014996)

### Mark Gierl, Hollis Lai; Susan Embretson; Rachel Westacott and colleagues
- **Who:** The automatic item generation research programme, and the team that tested its central assumption on real students.
- **Focus:** Whether one template can stand in for many items, and whether generated siblings actually share item parameters.
- **Why Follow:** They make a generated bank possible and they also supply the reason to distrust it. Westacott and colleagues gave 2,218 medical students papers built from supposedly isomorphic variants and found 46% of item models varied in facility by 0.15 or more, with whole-paper performance varying ten percent. Any design that treats a generator's difficulty as a single number has to answer that finding.
- **Where:** [Gierl & Lai (2013)](https://doi.org/10.1111/jedm.12000) | [Embretson (1999)](https://doi.org/10.1207/s15324818ame1204_1) | [Westacott et al. (2023)](https://doi.org/10.1186/s12909-023-04457-0)

---

## DOK 3: Insights

**Insight 1 - Every field that selects children young has measured how badly its early selection predicts, except education, and the difference is not method but the fact that education's outcome is its own programme.**
- Sport has the numbers: 16.3% of junior international athletes reached senior international level, only 2.5% to 31.4% of senior elites came through the corresponding junior stage, youth academies turned over 24.5% of members a year, and 44.3% of national youth players appeared in a single season (4.3). It also isolated a mechanism, since the birth-quarter advantage that dominates youth selection inverts by senior level, which is selectors reading maturity as ability (4.1, 4.2). Education has no comparable figure, and the reason is structural rather than technical. A sport has a senior outcome that exists independently of the selection system, whereas a gifted programme's outcome is performance inside the programme, which only admitted children can generate. So the missing evidence isn't missing because it's hard, it's missing because the field chose an outcome measure that makes false negatives unobservable by construction. That also explains why the one education study that moved students in both directions across a threshold is cited constantly and has no successors. Practitioners counter that a school's obligations run to enrolled children and that following the rejected ones is a consent problem before it's a measurement one.

**Insight 2 - The reliability standard the field quotes at screeners was written about early-stage research, and its own author set the bar for decisions about individuals three times higher.**
- Two facts that are never presented together. First, the .70 convention traces to a passage saying that "in the early stages of research... reliabilities of .70 or higher will suffice," while the same passage says that where "important decisions are made with respect to specific test scores, a reliability of .90 is the minimum that should be tolerated, and a reliability of .95 should be considered the desirable standard" (2.4). Second, a citation audit found that 44% of citations to that source were for the .70 cutoff, and that most invoked it for basic or applied research rather than for the exploratory case it was written about (2.4). Put beside the measured relationship between length and reliability, where ten items land near .70 and five between .50 and .55 (2.3), the consequence is sharp: a short screener quoting .70 is quoting a standard for exploration and applying it to a decision about a child. Notably the professional testing standards contain no numeric threshold at all, so the number people cite as authoritative is not in the authoritative document. The way out is not a longer test, it's a different output, which is why this insight and the classification argument are the same argument arriving from two directions. Defenders counter that a screener makes no important decision about a specific score, so the .90 bar simply doesn't apply to it, which is fair only if the screener genuinely cannot foreclose anything.

**Insight 3 - Generated item banks and short screeners fail and succeed together, because the same tolerance for imprecision that makes a generated bank unusable for a high-stakes exam is what a screener already has.**
- The evidence against generated banks is strong and specific: 46% of item models varied in facility by at least 0.15 across variants intended to be isomorphic, whole-paper student performance varied ten percent across four supposedly equivalent papers, and standard-setting panels moved by far less than facility did, so the humans could not see the drift they were compensating for (6.1). For a licensure exam that's disqualifying, since a candidate's pass depends on which clone they drew. However, a screener that emits a probability with a band, that classifies against a threshold rather than reporting a score, and that can only ever recommend, absorbs that variance rather than being destroyed by it. And it needs what generation supplies more than any other instrument does, since the retest inflation of about a third of a standard deviation from simply sitting a similar test twice makes never repeating a form a requirement rather than a nicety. So the honest position isn't that clones are equivalent, it's that a screener is the one instrument whose error budget can pay for their not being. That has a design consequence: a generator's difficulty must be recorded as a family-level estimate with its observed within-family spread beside it, never as a single calibrated number. High-stakes testing specialists counter that a tolerance argument is how banks decay, since every instrument starts low-stakes and gets used for more than it was built for.

**Insight 4 - Everything that survived in this literature is a property of what a candidate does, and everything that collapsed is a property of what a candidate says about themselves.**
- The pattern runs across four separate bodies of evidence with nothing in common but that split. Grit explains ΔR = .004 in college grades once conscientiousness is controlled and correlates with it at ρ = .84, while its perseverance facet measured on its own explains ΔR = .040 to .085, so the construct isn't empty and the questionnaire wrapping is what empties it (5.3). Growth mindset self-report produces near-zero meta-analytic effects while the behavioural challenge-seeking task in the same research programme predicted where the self-report didn't (5.4, 5.5). In sport, the selection error that turned out to be measurable was a behavioural artefact of the calendar rather than anything anyone reported about themselves (4.1). And in personnel selection, work samples and structured procedures outrank self-descriptive instruments. The generalisation worth stating is that self-report measures a candidate's model of themselves, which is a real thing and a different thing from the disposition, and under selection pressure the two come apart further. Thus a screener should record choices, latencies, returns and persistence, and should not ask a child whether they enjoy difficulty. Personality researchers counter that behavioural samples are notoriously unreliable from a single occasion, so a fifteen-minute observation may be worse than a well-validated scale rather than better.

**Insight 5 - The one large, quantified, fixable gap in talent identification is a content gap, and the field spent its attention on a fairness gap instead.**
- The number is stark and rarely repeated: 70% of the top 1% in spatial ability would not have been identified on the verbal and quantitative composites, and over half of the top 1% on spatial sat below even the top 3% on verbal and mathematical measures (5.1). Spatial adds roughly four percent of criterion variance over the two abilities that are actually screened, and 45% of eventual STEM doctorate holders were in the top four percent on spatial a decade earlier (5.1). Set that against the equity literature's fixes, which are real but smaller in identified-population terms, since local norms reallocate a nearly constant pool rather than enlarging it. The asymmetry is that a fairness gap requires changing who a programme is willing to admit, which is contested, whereas a content gap requires adding a battery, which is engineering. So the cheapest large improvement available to a screener is a construct nobody argues about, and the reason it goes unbuilt is that it was never a controversy and therefore never a priority. Equity researchers counter that framing spatial as apolitical understates it, since adding any battery changes group composition, and that a content gap and a fairness gap are the same gap seen from different ends.

**Insight 6 - A screener's item count is not a budget question, it is a consequence of what it promises to report, and the field's own numbers put the two outputs an order of magnitude apart in cost.**
- Three findings that are never lined up. Estimation at a usable reliability needs about forty items to reach .90, with ten landing near .70 and five between .50 and .55 (2.3). Classification into two categories at roughly 95% correct decisions averaged 12.7 to 16.3 items, and the dominant lever on that length was the width of the indifference zone around the cut rather than any precision target (2.2). And adaptive delivery against a fixed-length paper equivalent saved at least 22% of items on a real placement test (2.1). Read together, a fifteen-minute instrument is comfortably enough for a decision and nowhere near enough for a score, and the choice of output determines the length rather than the other way round. That reframes the design question from "how short can we get away with" to "what are we willing to promise," which is answerable from evidence rather than from appetite. It also explains why so many short instruments feel indefensible: they kept the score. Practitioners counter that the classification figures come from simulations with well-behaved item parameters, and a real bank of uncalibrated generated items will not perform like one.

---

## DOK 2: Knowledge Tree

### Overall Summary

A screener's job is a decision, so the statistics that grade it are decision statistics, and the evidence says discrimination is not one of them: two models differing by 0.02 in AUC produced overlapping decision curves, and a rule with an AUC of 0.72 could perform worse than acting on everyone. Net benefit answers the question instead, at the cost of forcing a program to state how many wasted applications one recovered candidate is worth. On length, the two possible outputs cost an order of magnitude apart. Estimation reaches about .90 reliability at forty items, .70 at ten, and .50 to .55 at five, with a five-item test needing discriminations its own authors call unrealistically high, while two-category adaptive classification at roughly ninety-five percent correct decisions averaged 12.7 to 16.3 items. The .70 reliability convention everybody quotes turns out to be a misattribution: its source proposed it for early-stage research and set .90 as the minimum where decisions are made about individual scores, and 44% of citations to that source were for the number it never proposed as a standard. The professional testing standards contain no numeric threshold at all. Outside education, sport has measured what education has not: 16.3% of junior international athletes reached senior international level, only 2.5% to 31.4% of senior elites came through the corresponding junior stage, youth academies turned over about a quarter of their members annually, and the birth-quarter advantage that dominates youth selection inverts by adulthood. Earlier entry into a talent programme predicts worse adult performance. On predictors, spatial ability is the largest quantified gap, with 70% of the top 1% in spatial ability invisible to verbal and quantitative screening, while grit adds ΔR = .004 over conscientiousness and correlates with it at .84, and behavioural challenge-seeking predicted where self-reported mindset did not. Generated item banks make never-repeated forms possible and are not as equivalent as claimed: 46% of item models varied in facility by at least 0.15 across supposedly isomorphic variants, and whole-paper performance varied ten percent.

### Category 1: What Grades a Screening Decision

- **Subcategory 1.1: The four operating-point statistics, and why predictive value moves with the base rate**
  - **Source:** Meehl & Rosen (1955); standard diagnostic-testing literature
    - **DOK 1 — Facts:**
      - Sensitivity is the share of true cases the screener flags; specificity is the share of non-cases it clears. Both are properties of the instrument at a given threshold and are independent of how common the target is.
      - Positive predictive value is the share of those flagged who are true cases, and it depends jointly on sensitivity, specificity and the base rate. It is the number a decision-maker actually experiences.
      - The consequence when the target is rare, stated in the psychology literature: a screen detecting 55% of cases at a 19% false-positive rate against a 5% base rate produces 275 true positives and 1,805 false positives per 10,000, so "only 275, or 13%, would actually" be cases.
      - The formal condition for a positive call to be more likely right than wrong is that the odds of the condition exceed the ratio of false positives to valid positives.
      - Where the purpose is to avoid missing cases, sensitivity and negative predictive value govern, and specificity is what is traded away to get them.
      - The published caution against optimising sensitivity alone is that a screener can reach perfect sensitivity by flagging everybody, which is why sensitivity is never reported without its companion.
    - **DOK 2 — Summary:** Two of the four numbers describe the instrument and two describe the experience of using it, and only the second pair moves with how rare the target is. For a screener aimed at a rare trait, the number that will actually be noticed is predictive value, and it can be poor while sensitivity and specificity both look respectable. Sensitivity on its own isn't a virtue, since it is trivially maximised by advancing everyone, which is the reference point any screener has to beat.
    - **Link to source:** [Meehl & Rosen (1955)](https://doi.org/10.1037/h0048070)

- **Subcategory 1.2: Discrimination does not track decision value, and the demonstration is empirical rather than theoretical**
  - **Source:** Vickers & Elkin (2006); Vickers, Van Calster & Steyerberg (2016); McClish (1989); Walter (2005)
    - **DOK 1 — Facts:**
      - On two models fitted to the same data: "although the expanded prediction model has a better AUC than the basic model (0.82 vs. 0.80), this makes no practical difference: the two curves are essentially overlapping."
      - On a richer model against a simpler rule: "the basic model has a considerably larger AUC than the simple clinical rule, yet for pt's above 2%, there is essentially no difference between the two models."
      - The strongest version: "at some low values of pt, using the simple clinical rule actually leads to a poorer outcome than simply treating everyone, despite a reasonably high AUC (0.72)."
      - The authors' statement of the underlying problem, given a full set of conventional statistics: "Compare this conclusion from figure 1 with statistics such as the sensitivity and specificity of the marker (88% and 33%, respectively), the area under the curve or Brier score of the model (0.822 and 0.150), or the calibration plot... **It is not at all clear how we could know whether the model's discrimination or calibration was sufficient to justify clinical use.**"
      - Partial AUC was introduced to address the fact that whole-curve AUC averages over regions of the curve a user will never operate in.
      - Provenance note that matters: one of the sources originally sought for support of partial AUC argues **against** it rather than for it, on the grounds that restricting the curve discards information without solving the interpretability problem. So the partial-AUC literature is contested rather than settled, and this document does not rest on it.
    - **DOK 2 — Summary:** The case against grading a screener on discrimination isn't that AUC is meaningless, it's that differences in it do not correspond to differences in decisions. A two-point AUC gain produced overlapping decision curves, a large AUC advantage vanished across the whole range anyone would operate in, and a model with a respectable AUC did worse than acting on everybody. The authors' own framing is the useful one: with sensitivity, specificity, AUC, Brier score and a calibration plot in hand, they couldn't tell whether the model was good enough to use. Partial AUC is one proposed repair and it is disputed by researchers in the same field.
    - **Link to source:** [Vickers & Elkin (2006)](https://doi.org/10.1177/0272989X06295361) | [Vickers, Van Calster & Steyerberg (2016)](https://doi.org/10.1136/bmj.i6) | [McClish (1989)](https://doi.org/10.1177/0272989X8900900307) | [Walter (2005)](https://doi.org/10.1002/sim.2103)

- **Subcategory 1.3: Net benefit, which prices the two errors against each other and compares against doing nothing**
  - **Source:** Vickers & Elkin (2006); Vickers, Van Calster & Steyerberg (2016)
    - **DOK 1 — Facts:**
      - The formula: net benefit equals the true-positive count over n, minus the false-positive count over n, weighted by pt divided by one minus pt.
      - The authors' gloss: "we subtract the proportion of all patients who are false-positive from the proportion who are true-positive, **weighting by the relative harm of a false-positive and a false-negative result.**"
      - The threshold probability pt is the probability at which a decision-maker would be indifferent between acting and not acting, so it encodes the exchange rate between the two errors as an explicit input.
      - Two reference lines make the metric readable: act on everyone, and act on nobody. A model that beats neither is not worth using.
      - A worked conversion into an interpretable unit: a net benefit advantage of 0.013 at a threshold of 0.05 was reported as "the equivalent of a net 0.013 × 100/(0.05/0.95) = 25 fewer false-positive results per 100 patients."
      - A variant formulation exists for when administering the screener is itself costly. Provenance note: that equation was rendered as an image in the copy consulted and could not be extracted, so it is named here rather than reproduced.
      - Field note: this apparatus comes from medical decision making, where the costs on both sides are more tangible than in admissions. Nothing in the arithmetic is medical, but the ease of naming pt is.
    - **DOK 2 — Summary:** Net benefit converts a screener's output into a single number denominated in true positives, having already paid for the false positives at a rate the user has to state. That statement is the point. Every threshold implies an exchange rate between missing a case and raising a false alarm, and reporting accuracy simply leaves it unstated. The two reference lines are what make it a usable test of whether a screener earns its place, since a tool that can't beat advancing everyone isn't doing anything except adding a step.
    - **Link to source:** [Vickers & Elkin (2006)](https://doi.org/10.1177/0272989X06295361) | [Vickers, Van Calster & Steyerberg (2016)](https://doi.org/10.1136/bmj.i6)

- **Subcategory 1.4: Incremental validity, which is the bar a new screener has to clear rather than a correlation**
  - **Source:** Sechrest (1963); Hunsley & Meyer (2003)
    - **DOK 1 — Facts:**
      - The standard is a demonstrated gain over information already available, not an association with the outcome. "Correlates with the criterion" and "adds information beyond what we already have" are different claims with different evidence requirements.
      - The recommendation is that a new measure be evaluated against the predictors a decision-maker would otherwise use, including cheap and unglamorous ones.
      - The practical consequence for a selection setting is that the comparison predictor is usually prior performance, which is inexpensive and already collected.
      - Related evidence from the achievement literature: prior achievement alone reached prediction R² of .58 to .75 across successive intervals, and everything else measured, including self-reports, grades and cognitive tests together, added between .02 and .08.
    - **DOK 2 — Summary:** A screener earns its place only by improving on what a program already knows, which is a much harder test than showing it correlates with the outcome. In an admissions setting the incumbent predictor is prior performance, and it is strong, so the space a new instrument has to work in is narrow, so it's worth aiming elsewhere. That is a reason to aim a screener at populations and constructs the incumbent does not cover rather than at predicting the same outcome slightly better.
    - **Link to source:** [Hunsley & Meyer (2003)](https://doi.org/10.1037/1040-3590.15.4.446) | [Sechrest (1963)](https://doi.org/10.1037/h0043657)

- **Subcategory 1.5: Calibration is a separate property from discrimination, and a threshold rule depends on it**
  - **Source:** Van Calster, McLernon, van Smeden, Wynants & Steyerberg (2019); Livingston & Lewis (1995)
    - **DOK 1 — Facts:**
      - A model can rank candidates correctly and still produce probabilities that are systematically wrong, which is the distinction between discrimination and calibration.
      - Calibration is described as "the Achilles heel of predictive analytics," and the paper sets out a hierarchy of increasingly strict calibration requirements rather than a single check.
      - Any decision rule of the form "act when the predicted probability exceeds a threshold" requires calibrated probabilities to have its intended meaning. An uncalibrated score thresholded at the same value has no optimality property.
      - Separately, decision consistency and decision accuracy are distinct from reliability, and a high reliability coefficient does not imply high classification accuracy.
    - **DOK 2 — Summary:** Ranking well and being right about probabilities aren't the same achievement, and a screener that thresholds a probability needs the second. This is the constraint that turns "where should the bar be" from a preference into an empirical question about the instrument, because the cost-optimal threshold rule only means what it says if the number it is applied to is calibrated. It also cuts against relying on reliability as a proxy for decision quality, since the two come apart.
    - **Link to source:** [Van Calster et al. (2019)](https://doi.org/10.1186/s12916-019-1466-7) | [Livingston & Lewis (1995)](https://doi.org/10.1111/j.1745-3984.1995.tb00462.x)

### Category 2: How Few Items a Decision Needs

- **Subcategory 2.1: Adaptive delivery saves items, and the measured savings are smaller than the slogan**
  - **Source:** Weiss (1982); Kingsbury & Weiss (1979); Eggen & Straetmans (2000)
    - **DOK 1 — Facts:**
      - The commonly repeated claim is that adaptive testing achieves equivalent precision with about half the items of a fixed-form test.
      - A measured comparison against an operational paper-and-pencil placement test found "a reduction of at least 22% in the mean number of items can be expected in a computerized adaptive test (CAT) compared to an existing paper-and-pencil placement test."
      - The same abstract records the second finding this document rests on: "statistical testing is a promising alternative to statistical estimation."
      - Provenance note: the 22% figure is from a verified abstract of a paywalled article; the body was not read. Several underlying tables circulate only in institutional research reports rather than in the peer-reviewed versions, and are flagged as such in the research companion.
    - **DOK 2 — Summary:** Adaptive delivery genuinely reduces item count, and the honest measured figure against a real incumbent test is around a fifth rather than a half. The larger savings claimed in the literature come from simulation under favourable conditions. What matters more for a screener is the second half of that finding, which is that testing a hypothesis about which side of a line a candidate is on is a viable alternative to estimating where they sit.
    - **Link to source:** [Eggen & Straetmans (2000)](https://doi.org/10.1177/00131640021970862) | [Weiss (1982)](https://doi.org/10.1177/014662168200600408)

- **Subcategory 2.2: Classification costs far fewer items than estimation, and the biggest lever is the indifference zone**
  - **Source:** Eggen (1999); Spray & Reckase (1996); Thompson (2011)
    - **DOK 1 — Facts:**
      - Method: Monte Carlo simulation, 5,000 simulees per condition, against an operational bank of 250 items.
      - A two-category classification reaching roughly ninety-five percent correct decisions required, on average, **between 12.7 and 16.3 items** depending on condition.
      - A three-category problem with two cut points and a maximum of 25 items required more, with mean required items varying by condition.
      - The dominant driver of test length was not the precision target but the width of the indifference zone around the cut score: widening the zone shortens the test substantially, and narrowing it lengthens it.
      - Stated in the source, on error rates: "the lower the rates, the more items are needed."
      - Provenance note: these figures are read from an institutional pre-publication report whose cover states the manuscript had been submitted, rather than from the journal version. They are simulations with well-behaved item parameters, not measurements on children.
    - **DOK 2 — Summary:** Asking which side of a line somebody sits on is a much cheaper question than asking where they sit, and the numbers put a defensible two-category decision inside the item budget a fifteen-minute session allows. The design lever that matters most is unfamiliar and useful: how wide a band around the cut you are willing to treat as undecided. A program that insists on resolving candidates sitting exactly on the line will pay for it in test length, and a program that accepts a band of indifference gets its answer quickly.
    - **Link to source:** [Eggen (1999)](https://doi.org/10.1177/01466219922031365) | [Spray & Reckase (1996)](https://doi.org/10.3102/10769986021004405)

- **Subcategory 2.3: The measured relationship between test length, reliability and decision quality**
  - **Source:** Kruyen, Emons & Sijtsma (2012)
    - **DOK 1 — Facts:**
      - Method: Monte Carlo simulation with 1,000 simulated applicants per condition, ability drawn standard normal, dichotomous items under a two-parameter model, five test lengths of 40, 20, 15, 10 and 5 items nested inside one another, with item discriminations drawn from a uniform distribution the authors describe as "typical of applied research."
      - Reliabilities produced: "coefficient alpha equal to **.90 for 40 items, approximately .70 for 10 items and ranging from .50 to .55 for 5 items**, depending on the selection scenario."
      - To force a five-item test to reach alpha of .70, "these parameters must be at least 1.6 to 2.9," which the authors call "**unrealistically high**."
      - Five personnel-selection scenarios were modelled, with base rates and selection ratios of 50%, 25% and 10%.
      - Provenance note: a simulation, and the title is a question rather than a verdict. The item parameters are stated as realistic but are chosen rather than observed.
    - **DOK 2 — Summary:** This is the source that answers "how few items" with an actual count, and the answer depends on what the instrument's claiming to produce. Ten items land near the reliability convention that gets quoted at screeners, five items land well below anything defensible, and reaching the convention at five items would need item quality the authors say doesn't exist in practice. Read alongside the classification figures, the same budget that is hopeless for a score is adequate for a decision.
    - **Link to source:** [Kruyen, Emons & Sijtsma (2012)](https://doi.org/10.1080/15305058.2011.643517)

- **Subcategory 2.4: The reliability thresholds everyone quotes are a misattribution, and the real standard for individual decisions is much higher**
  - **Source:** Lance, Butts & Michels (2006), quoting Nunnally (1978); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - A citation audit across eleven journals for 2000 to 2004 found 90 citations to the source usually credited with the .70 reliability cutoff, "of which a full 44% (40) were to the alleged .70 reliability cutoff criterion."
      - Of those 40, "8 (20%) still reported research using scales that had estimated reliabilities less than .70, 26 (65%) cited the .70 cutoff in the context of basic or applied research, 4 (10%) referred to the .70 cutoff in the context of scale development or early stages of research."
      - What the cited source actually wrote: "**In the early stages of research... one saves time and energy by working with instruments that have only modest reliability, for which purpose reliabilities of .70 or higher will suffice.**"
      - And, in the same passage: "**In those applied settings where important decisions are made with respect to specific test scores, a reliability of .90 is the minimum that should be tolerated, and a reliability of .95 should be considered the desirable standard.**"
      - The auditors' verdict: the source "did not proclaim .70 as a universal standard of reliability" and "did not indicate that .70 reliability was adequate for research" except as qualified.
      - The professional testing standards contain **no numeric reliability threshold at all**. They require that standard errors be reported, including in the vicinity of any cut score, and they set no minimum coefficient.
      - Provenance note: the 1978 original was not read directly. The quotations are the auditors' block quotation of it, with page numbers, in a peer-reviewed journal.
    - **DOK 2 — Summary:** The number a short screener is usually defended with was written about exploratory research, and the same paragraph sets .90 as the floor and .95 as the target wherever decisions turn on an individual's score. Nearly half of the citations to that source were for the lower number, mostly in contexts it was not written for. The document people treat as authoritative on this contains no threshold whatsoever. So a screener can't borrow .70 as a standard. It has to argue instead that the decision it makes is not the kind the .90 bar was written for, which is only true if the tool genuinely doesn't foreclose anything.
    - **Link to source:** [Lance, Butts & Michels (2006)](https://doi.org/10.1177/1094428105284919) | [AERA/APA/NCME (2014) Standards](https://testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf)

### Category 3: Techniques and Their Measured Yield

- **Subcategory 3.1: A nomination or referral stage placed before the test can only lose candidates**
  - **Source:** McBee, Peters & Miller (2016); McBee, Peters & Waterman (2014); Card & Giuliano (2016)
    - **DOK 1 — Facts:**
      - Method: an analytic psychometric model by numerical integration of a multivariate normal, not a student sample.
      - A single universally administered test at a 90th-percentile cut with reliability .95 has sensitivity of .843. At a 95th-percentile cut it is .815, and at a 99th-percentile cut .763.
      - Adding a nomination gate of validity .48 at the 90th percentile drops sensitivity to **.280**, a false-negative rate of .720.
      - The structural reason, verbatim: "the confirmatory assessment can provide no protection whatsoever against false negatives because those students that get a false negative with respect to the nomination are denied access to the confirmatory test."
      - Stated as a general rule: "**screeners cannot improve the sensitivity of an assessment system; they can only reduce it.**"
      - From the abstract: "**Under commonly implemented conditions, the nomination stage can cause the false negative rate to easily exceed 60%.**"
      - The empirical counterpart: replacing referral with universal testing while holding eligibility standards fixed raised identification 45% overall and 174% among disadvantaged students, and "**A full 20% of the compliers have IQs of 130 or higher**," so the referral process had been losing candidates who cleared the strict bar outright.
    - **DOK 2 — Summary:** Any filter placed in front of the real instrument is a one-way loss, because the good instrument downstream only protects against admitting the wrong candidate and never against rejecting the right one. The modelled cost is enormous relative to anything else in the design, and the empirical version confirms it, since simply testing everyone surfaced children who already met the existing standard. For a marketing-facing screener the relevant reading is that the incumbent first filter is a parent deciding to apply, which is a gate nobody validated.
    - **Link to source:** [McBee, Peters & Miller (2016)](https://doi.org/10.1177/0016986216656256) | [Card & Giuliano (2016)](https://doi.org/10.1073/pnas.1605043113)

- **Subcategory 3.2: Combination rules move identification more than cut scores do**
  - **Source:** McBee & Makel (2019); Lakin (2018)
    - **DOK 1 — Facts:**
      - "Using the top 5% cutoff for giftedness, a correlation of r = .27 yields a giftedness rate of **9.3% under the 'or' rule and a rate of 0.65% under the 'and' rule.** A correlation of r = .67 yields a rate of 8.2% under the 'or' rule and 1.8% under the 'and' rule."
      - So at a nominal five percent bar, the share identified can range roughly fourteenfold on the combination rule alone.
      - The less correlated two measures are, the more punishing a conjunctive rule becomes, since independent measures rarely place the same candidate above both lines.
      - The contested reading, from an analysis using an ability test's own standardisation data rather than simulation: composition differences "were due mainly to the identified pool size and not to the effects of the particular combination rule."
    - **DOK 2 — Summary:** How a screener combines two measures matters more than where it sets either one, so a published cutoff tells you very little about who actually advances. The dissent is worth carrying: at least one real-data analysis attributes composition effects to how many candidates end up identified rather than to the rule, which would make the choice of rule a disguised decision about program size rather than a free gain.
    - **Link to source:** [McBee & Makel (2019)](https://doi.org/10.1177/2332858419831007) | [Lakin (2018)](https://doi.org/10.1177/0016986217752099)

- **Subcategory 3.3: Above-level testing is the only technique built to discriminate inside the top few percent**
  - **Source:** Swiatek (2007); Assouline & Lupkowski-Shoplik (2012); Stanley (2000)
    - **DOK 1 — Facts:**
      - The structure: stage one is a grade-level test at the 95th to 99th percentile, and stage two is a test written for older students.
      - The finding that makes it work: "Despite the fact that all talent search participants have in-grade test scores in the top 3% to 5%... **the scores they earn on above-level tests are normally distributed, with scores covering most or all of the range of the instrument.**"
      - What a grade-level instrument conceals: half of the 7th graders scoring 500 to 800 on a college-entrance mathematics test "know more algebra... before they study the subject in school than do half of the students after completing a school year of it."
      - The ceiling made concrete: a 12-year-old scoring 760 took a 40-item Algebra I test "on which a score of 32 correct is excellent for anyone who has completed a school year of that subject," and "The boy made no errors."
      - The operating rule that follows: "**Avoid trying to teach students what they already know.**"
      - The same author's caution about his own most dramatic demonstration, teaching a year of algebra in a day: "this 1-day marathon was sort of a stunt. We did not expect such hastily acquired knowledge to 'stick.'"
    - **DOK 2 — Summary:** Candidates who bunch into the top few percent of a grade-level test spread across the full range of a test written for older students, which says the bunching is a property of the instrument and not of the children. That is the direct answer to the problem a selective program has, and it is decades old. It also means a screener aimed above a high bar should be built above grade level from the start rather than trying to squeeze more precision out of a grade-level scale.
    - **Link to source:** [Swiatek (2007)](https://doi.org/10.1177/0016986207306318) | [Stanley (2000)](https://doi.org/10.1037/1076-8971.6.1.216)

### Category 4: Talent Identification Outside Education

- **Subcategory 4.1: Youth selection systematically mistakes relative age for ability**
  - **Source:** Musch & Grondin (2001); Cobley, Baker, Wattie & McKenna (2009); Helsen, Van Winckel & Williams (2005)
    - **DOK 1 — Facts:**
      - Children born early in the selection year are heavily over-represented in youth elite squads across sports and countries, an effect documented in a review and then quantified in a meta-analysis reporting odds ratios by birth quarter.
      - In European youth soccer, birth-quarter distributions among selected players depart sharply from the underlying population distribution.
      - The mechanism named in this literature is that within a single selection year the oldest children are physically and cognitively more mature, and selectors read that maturity as talent.
      - Domain note: this is physical talent selection, and maturation is the mechanism, so transfer to academic selection is not automatic.
      - Provenance note: figures by sport, country and age group are recorded in the research companion; the numbers vary widely across settings and should be cited with their setting attached rather than as a single effect.
    - **DOK 2 — Summary:** The most robust finding in youth talent identification is that the systems are partly selecting on date of birth. It's a clean demonstration that a selection process can look rigorous, produce consistent results, and be reading a variable nobody intended to measure. The academic analogue isn't maturation, though it isn't nothing either, since school-entry age varies within a cohort and early measurement is least stable exactly when programs screen.
    - **Link to source:** [Musch & Grondin (2001)](https://doi.org/10.1006/drev.2000.0516) | [Cobley et al. (2009)](https://doi.org/10.2165/00007256-200939030-00005) | [Helsen, Van Winckel & Williams (2005)](https://doi.org/10.1080/02640410400021310)

- **Subcategory 4.2: The selection advantage inverts by adulthood, which makes the error measurable**
  - **Source:** Gibbs, Jarvis & Dufur (2012); Fumarco, Gibbs, Jarvis & Rossi (2017); Deaner, Lowen & Cobley (2013)
    - **DOK 1 — Facts:**
      - The relative-age advantage that dominates youth squads weakens and then reverses at senior professional level, a pattern named the underdog effect.
      - One reframing treats the reversal as direct evidence of evaluator error rather than as a developmental curiosity, on the argument that if the later-born selected players outperform, the selectors set a higher effective bar for them.
      - A fade-out curve reported in the earlier review shows the effect diminishing across successive age categories.
      - Provenance note: the earliest of these appeared outside conventional peer review before a peer-reviewed version followed, and the research companion records which is which.
    - **DOK 2 — Summary:** The reversal is what turns the relative-age effect from an oddity into a measurement of how much a selection system got wrong. Because the later-born players who survived selection had to be better to get through, their subsequent outperformance is a readout of the bias in the original decision. That is a template education could copy, since it only needs the selection date, the outcome, and a variable the selectors didn't intend to use.
    - **Link to source:** [Gibbs, Jarvis & Dufur (2012)](https://doi.org/10.1177/1012690211414343) | [Deaner, Lowen & Cobley (2013)](https://doi.org/10.1371/journal.pone.0057753)

- **Subcategory 4.3: Junior selection converts poorly into senior success, in both directions**
  - **Source:** Güllich (2014); Güllich, Barth, Macnamara & Hambrick (2023); Barreiros, Côté & Fonseca (2014)
    - **DOK 1 — Facts:**
      - Mean annual turnover in youth elite football academies from under-10 to under-19 was **24.5%**, and in national youth teams **41.0%**, with the under-15 to under-16 transition at 49.8%.
      - "Among all national U-team players observed from U15 to U19, **44.3% played in a U-team in only one season.**"
      - Regardless of age category, the probability of no longer being in the programme three years later was substantial, and the author's conclusion is that "**Most young members did not reach adolescence within the programme**," let alone senior level.
      - Forward direction, from the systematic review: "only **16.3% of junior international** athletes later achieved an equivalent level as seniors."
      - Backward direction: "Only **2.5%, 16.0%, and 31.4% of all** senior elites had been at international level at the corresponding earlier junior stages.
      - The review's own abstract summary: "Few elite juniors later achieved an equivalent competition level" as seniors.
      - Domain note: sport, with an unambiguous senior outcome that exists independently of the selection system. That independence is exactly what academic selection lacks.
    - **DOK 2 — Summary:** This is the closest available measurement of what early selection into an intensive programme actually buys, and it's small in both directions. Most juniors selected do not persist, most who persist do not convert, and most senior elites were not identified as juniors at all. The reason these numbers exist in sport and not in education is that a senior championship can be observed for people the youth system rejected, whereas a gifted programme's outcome can't be observed for anyone it didn't admit.
    - **Link to source:** [Güllich (2014)](https://doi.org/10.1080/24733938.2014.982204) | [Güllich, Barth, Macnamara & Hambrick (2023)](https://doi.org/10.1007/s40279-023-01885-2) | [Barreiros, Côté & Fonseca (2014)](https://doi.org/10.1080/17461391.2013.847275)

- **Subcategory 4.4: Earlier entry and earlier specialisation predict worse adult performance**
  - **Source:** Güllich, Macnamara & Hambrick (2022); Güllich & Barth (2024)
    - **DOK 1 — Facts:**
      - The claim is in the title: "**What Makes a Champion? Early Multidisciplinary Practice, Not Early Specialization, Predicts World-Class Performance.**"
      - Scale: "Our meta-analysis involved **51 international study reports with 477 effect sizes from 6,096 athletes, including 772 of the world's top performers.**"
      - The adult finding, verbatim: "**adult world-class athletes engaged in more childhood/adolescent multisport practice, started their main sport later, accumulated less main-sport practice, and initially progressed more slowly than did national-class athletes.**"
      - The youth finding runs the other way, and this is the part that matters most: "**higher performing youth athletes started playing their main sport earlier, engaged in more main-sport practice but less other-sports practice, and had faster initial progress than did lower performing youth athletes.**" So the profile that wins as a youth is the opposite of the profile that wins as an adult.
      - "youth-led play in any sport had negligible effects on both youth and adult performance."
      - The authors extend the pattern outside sport themselves: "**We illustrate parallels from science: Nobel laureates had multidisciplinary study/working experience and slower early progress than did national-level award winners.**"
      - Their conclusion: "variable, multidisciplinary practice experiences are associated with gradual initial discipline-specific progress but **greater sustainability of long-term development of excellence.**"
      - Provenance note: these are observational comparisons of achieved performers rather than randomised interventions, so selection into the groups is not controlled, and the science parallel is an illustration the authors draw rather than a meta-analytic result of their own.
    - **DOK 2 — Summary:** The intuition that identifying and specialising a child earlier gives them a head start does not survive contact with the data in the one domain that has looked carefully. The sharpest version of the finding is that the two profiles are opposed: early specialisation predicts *youth* success and predicts against *adult* world-class performance. A selection system that screens young and rewards what it sees is therefore selecting the profile that peaks early, and it will look accurate for years before the error appears. The authors reach outside sport to make the same point about Nobel laureates, which is the closest thing in this literature to a direct academic analogue.
    - **Link to source:** [Güllich, Macnamara & Hambrick (2022)](https://doi.org/10.1177/1745691620974772)

- **Subcategory 4.5: Mechanical prediction beats expert judgment, on average, across a large literature**
  - **Source:** Grove, Zald, Lebow, Snitz & Nelson (2000); Ægisdóttir et al. (2006)
    - **DOK 1 — Facts:**
      - A meta-analysis comparing clinical against mechanical prediction across a large body of studies found mechanical prediction equalled or exceeded clinical judgment in the great majority of comparisons, with a modest average advantage.
      - A later meta-analysis in a counselling context reproduced the direction of the result.
      - The advantage is on average rather than universal, and a minority of studies favour the human judge.
      - Provenance note: effect sizes and the exact proportion of studies favouring each approach are in the research companion. This literature is about clinical and personnel judgment rather than talent scouting specifically, and no study located measured whether talent scouts outperform simple statistical rules.
    - **DOK 2 — Summary:** Where the comparison has been run, a simple rule applied consistently beats an expert applying judgment, on average and by a modest margin. That supports building the decision into an instrument rather than leaving it to a reviewer's read, though the margin's small enough that the stronger argument for an instrument is consistency and auditability rather than raw accuracy. The specific question of whether scouts beat formulas appears not to have been tested.
    - **Link to source:** [Grove et al. (2000)](https://doi.org/10.1037/1040-3590.12.1.19) | [Ægisdóttir et al. (2006)](https://doi.org/10.1177/0011000005285875)

### Category 5: Predictors Beyond Measured Reasoning

- **Subcategory 5.1: Spatial ability is the largest quantified missed population in talent identification**
  - **Source:** Wai, Lubinski & Benbow (2009); Webb, Lubinski & Benbow (2007); Lubinski (2010)
    - **DOK 1 — Facts:**
      - The headline: "**Within the three ability composites assembled for this study, 70% of the top 1% in spatial ability did not**" qualify on the verbal and quantitative composites.
      - From a large mid-century cohort: "**over half of participants in the top 1% on the Spatial Composite were below the top 3%**" on verbal and mathematical measures.
      - Incremental validity: spatial ability added roughly "**an additional 4% of criterion variance**" over mathematical and verbal ability across four panels.
      - Long-run outcome: "**45% of all those holding STEM PhDs were in Stanine 9 (or within the top 4%) on spatial ability 11 years**" earlier, against about 30% of STEM terminal master's holders and 25% of STEM terminal bachelor's holders.
      - The authors tie the thresholds to practice, noting that talent-search programmes screen at the 1% and 3% levels on verbal and quantitative measures.
      - Provenance note: a numeric discrepancy between two of these sources on one incremental-validity figure is recorded in the research companion and should be checked before either number is quoted precisely.
    - **DOK 2 — Summary:** The single largest identified loss in this literature is not motivational or demographic, it's a construct nobody measures. Most of the spatially talented are invisible to the two abilities every talent search screens on, and spatial ability keeps predicting eventual STEM attainment a decade out. Unlike almost everything else here, closing this gap requires adding a battery rather than changing who a program is willing to admit.
    - **Link to source:** [Wai, Lubinski & Benbow (2009)](https://doi.org/10.1037/a0016127) | [Webb, Lubinski & Benbow (2007)](https://doi.org/10.1037/0022-0663.99.2.397)

- **Subcategory 5.2: Conscientiousness predicts achievement, and self-discipline outperformed measured ability in one much-cited study**
  - **Source:** Poropat (2009); Duckworth & Seligman (2005)
    - **DOK 1 — Facts:**
      - A five-factor meta-analysis found conscientiousness the strongest personality correlate of academic performance, with a magnitude comparable to measured ability at some educational levels.
      - A separate study reported that a self-discipline composite outpredicted measured ability for adolescent academic performance.
      - Provenance note: exact correlations, sample sizes and educational levels are in the research companion. The self-discipline study is a modest sample in one school setting, and its headline framing is stronger than a single study supports.
      - Population note: both are general-population samples rather than high-ability ones, so transfer above the 95th percentile is an assumption rather than a finding.
    - **DOK 2 — Summary:** Conscientiousness is the one personality dimension with a solid claim on academic achievement, and one well-known study puts a self-discipline measure ahead of ability for adolescents. Two cautions travel with it: the samples are general-population, so nothing here establishes that it holds inside an already-selected tail, and the single-study result is quoted far more confidently than its design warrants.
    - **Link to source:** [Poropat (2009)](https://doi.org/10.1037/a0014996) | [Duckworth & Seligman (2005)](https://doi.org/10.1111/j.1467-9280.2005.01641.x)

- **Subcategory 5.3: Grit adds essentially nothing over conscientiousness, though one of its facets does**
  - **Source:** Credé, Tynan & Harms (2017)
    - **DOK 1 — Facts:**
      - "Results for Model 1 indicate that **overall grit explains no variance in either overall academic performance or high school GPA after controlling for conscientiousness, and explains only a very small amount of incremental variance in college GPA (i.e., ΔR = .004)**."
      - The reverse does not hold: "conscientiousness explains incremental variance in these outcomes if first controlling for overall grit."
      - The facet-level result: "**perseverance explained a substantial amount of incremental variance in overall academic performance (ΔR = .040), high school GPA (ΔR = .085), and a somewhat lower amount for college GPA (ΔR = .023). Consistency explained almost no unique variance.**"
      - On the construct: "the size of the correlation (**ρ = .84**) with overall conscientiousness is so strong as to not only" raise the question of whether it is a renaming.
      - From the abstract: "**the higher order structure of grit is not confirmed.**"
      - Comparison to the personality meta-analysis: grit's correlations with grades "in middle/high school (ρ = .16) and college (ρ = .17) are largely" comparable to conscientiousness rather than better.
      - The scale's originator has published cautions against using it for selection.
    - **DOK 2 — Summary:** The most popular recent addition to talent identification does not survive controlling for a personality dimension measured for decades, correlates with it at .84, and fails to confirm its own factor structure. However, the perseverance facet on its own does predict, which means there is real signal that the composite scale destroys. Combined with the author's own warning against selection use, the reading isn't that persistence doesn't matter, it's that this questionnaire is the wrong way to get at it.
    - **Link to source:** [Credé, Tynan & Harms (2017)](https://doi.org/10.1037/pspp0000102)

- **Subcategory 5.4: Growth mindset's two headline studies disagree, and the disagreement is about who and where rather than whether**
  - **Source:** Sisk, Burgoyne, Sun, Butler & Macnamara (2018); Yeager et al. (2019)
    - **DOK 1 — Facts:**
      - The meta-analysis reports very small average associations between mindset and achievement, and small average effects of mindset interventions overall.
      - The large preregistered national field experiment reports a small but statistically robust effect, concentrated among lower-achieving students and in schools whose norms supported the intervention.
      - So the two are not straightforwardly contradictory: a small average effect concentrated in subgroups is consistent with a near-zero overall average.
      - Provenance note: exact effect sizes and moderator conditions are in the research companion.
      - Population note: the field experiment's effect concentrated in lower-achieving students, which is the opposite end of the distribution from a selective program's applicants.
    - **DOK 2 — Summary:** The honest summary is a small effect that shows up where conditions support it and washes out on average, and the subgroup it shows up in is lower-achieving students. For a program screening at the top of the distribution, that's close to the least favourable configuration of the evidence, since the effect is smallest exactly where the applicants are.
    - **Link to source:** [Sisk et al. (2018)](https://doi.org/10.1177/0956797617739704) | [Yeager et al. (2019)](https://doi.org/10.1038/s41586-019-1466-y)

- **Subcategory 5.5: A behavioural challenge-seeking measure predicted where self-report did not**
  - **Source:** Yeager et al. (2019) and the associated instrument work
    - **DOK 1 — Facts:**
      - The instrument offers a candidate a choice between an easier task and a harder, more instructive one, and records which is taken.
      - It is a behavioural measure rather than a self-description, and it was used as a mediator and outcome in the mindset field experiment.
      - It predicted where self-reported mindset did not, which is the reason it is worth recording separately from the intervention's own results.
      - Provenance note: this is one instrument inside one research programme, and no independent replication of its predictive value in a selection context was located.
    - **DOK 2 — Summary:** The one measure in this area that behaved was a recorded choice rather than an answer to a question. That's a narrow finding on a single instrument and it shouldn't be oversold, but it points at the design principle the rest of this category supports: watch what a candidate does with a difficult option rather than asking how they feel about difficulty.
    - **Link to source:** [Yeager et al. (2019)](https://doi.org/10.1038/s41586-019-1466-y)

- **Subcategory 5.6: Prior achievement is the incumbent every new predictor has to beat**
  - **Source:** Lavelle-Hill et al. (2024)
    - **DOK 1 — Facts:**
      - Using 105 predictors on 3,425 secondary students over five to nine years with held-out validation, prior achievement alone reached prediction R² of .58, .65, .65 and .75 across successive year-to-year intervals.
      - The extra R² contributed by everything else together, including self-reports, grades and cognitive tests, was .07, .06, .08 and .02.
      - "In our data, IQ and prior achievement were correlated (Pearson r = .63)," and the pattern suggested "the effect of IQ was mediated through prior achievement."
      - At longer gaps the increment stayed flat rather than growing.
    - **DOK 2 — Summary:** Once prior achievement is in the model, everything else measured about a student adds a few points at most, and the effect of measured ability appears to run through achievement rather than beside it. That sets the bar for incremental validity brutally high for any new instrument aimed at the same outcome, and it argues for pointing a screener at candidates the incumbent predictor cannot see at all rather than at predicting the same outcome slightly better.
    - **Link to source:** [Lavelle-Hill et al. (2024)](https://doi.org/10.1037/edu0000863)

### Category 6: Keeping a Generated Bank Honest

- **Subcategory 6.1: Generated siblings are not equivalent, measured on real candidates**
  - **Source:** Westacott, Badger, Kluth, Gurnell, Reed & Sam (2023); Gierl & Lai (2013); Embretson (1999); Bejar (2002)
    - **DOK 1 — Facts:**
      - Design: 50 existing bank items used as item models, 15 variants generated per model, four selected for maximum difference, compiled into four 50-item papers, sat by **N = 2,218 final-year students** across 12 medical schools, each paper independently standard set by a separate nine-person panel.
      - "**21 of 46 item models (46%) had a facility difference of ≥ 0.15 between the four variants.**"
      - 16 of 46 item models had a standard-set score difference of at least 0.1 between variants.
      - "the average range of variation across the four variants was **0.03 for Angoff scores compared to 0.10 for the variance in facility**," so the human panels moved far less than actual difficulty did.
      - Worked example: "The standard setting range of 0.08 (0.52–0.60) is much lower than the facility range of 0.30 (0.30–0.60)."
      - At whole-paper level: "**the average student performance varied by 10% across the four papers, from 55% (paper 4) to 65% (paper 3)**," while the passing standard varied only from 58% to 61%.
      - The authors' conclusion: this "demonstrates that 'isomorphic' (or clone) questions generated by AIG" vary more in performance than in standard-setting behaviour.
      - Against that, the generative programme's own demonstrations show that one template can produce very large numbers of items cheaply, which is the property a never-repeat-a-form requirement needs.
    - **DOK 2 — Summary:** The central assumption of template-based generation, that siblings share difficulty, fails on real candidates and fails at a magnitude that matters: nearly half the item families varied substantially in difficulty, and whole papers differed by ten percentage points. Worse, expert panels did not see the drift, so human standard setting is not a repair. That doesn't make generation useless, since nothing else supplies unlimited non-repeating forms, but it does mean a generator's difficulty has to be recorded as a family-level estimate with its observed spread attached rather than as a single number.
    - **Link to source:** [Westacott et al. (2023)](https://doi.org/10.1186/s12909-023-04457-0) | [Gierl & Lai (2013)](https://doi.org/10.1111/jedm.12000) | [Embretson (1999)](https://doi.org/10.1207/s15324818ame1204_1)

- **Subcategory 6.2: Item calibration sample size has no single answer, and the field says so**
  - **Source:** Şahin & Anıl (2017); Lord (1968) convention
    - **DOK 1 — Facts:**
      - There is no single published minimum. The requirement depends on the model, the ability distribution, the item parameters and the precision wanted.
      - A long-standing convention associated with the three-parameter model is on the order of a thousand responses per item.
      - A simulation study provides a table of parameter-recovery accuracy across sample sizes and test lengths, and the scatter of prior recommendations in the literature is wide enough that the authors catalogue the disagreement rather than resolving it.
      - Simpler models need fewer responses: a one-parameter or Rasch model is far less demanding than a three-parameter model.
      - Provenance note: one of the small-sample tables circulating in this area is not peer-reviewed, and is flagged as such in the research companion.
    - **DOK 2 — Summary:** Asking how many responses an item needs before its difficulty can be trusted has no clean answer, and the honest reading is that a three-parameter model wants roughly a thousand per item while a Rasch-style model wants far fewer. For a new bank, the practical consequence is that difficulty starts as an assumption and stays that way for a long time, so the design has to work correctly while every parameter's a guess, rather than assuming calibration is coming soon.
    - **Link to source:** [Şahin & Anıl (2017)](https://doi.org/10.1007/s11135-016-0301-x)

- **Subcategory 6.3: Item parameters drift, and exposure has to be controlled or the bank decays**
  - **Source:** Bock, Muraki & Pfeiffenberger (1988); Sympson & Hetter (1985); Stocking & Lewis (1998); Way (1998)
    - **DOK 1 — Facts:**
      - Item parameter drift is the documented phenomenon of an item's difficulty changing over time as curricula, populations and exposure change, and methods exist to detect it during routine bank maintenance.
      - Exposure control is a standard requirement in adaptive testing, because a maximally informative item is selected disproportionately often and becomes both over-exposed and compromised.
      - Published methods condition selection probability on the item's exposure rate rather than on information alone, trading measurement efficiency for bank longevity.
      - Guidance exists relating minimum pool size to test length, and on protecting pool integrity generally.
      - Provenance note: specific numeric rules for maximum exposure rate and minimum pool ratio vary by source and testing context, and licensure-exam guidance does not transfer directly to a low-stakes screener. The figures located are recorded in the research companion with their contexts.
    - **DOK 2 — Summary:** A bank isn't a fixed asset. Item difficulties move over time, and an adaptive engine that always picks the single most informative item will serve it constantly, which both compromises it and wastes the rest of the pool. Both problems are solved routinely in operational testing by monitoring drift and by conditioning selection on exposure rather than purely on information. A generative bank mitigates exposure at the item level, since forms are not repeated, but it doesn't mitigate it at the family level, and the family is what carries the parameters.
    - **Link to source:** [Bock, Muraki & Pfeiffenberger (1988)](https://doi.org/10.1111/j.1745-3984.1988.tb00308.x) | [Stocking & Lewis (1998)](https://doi.org/10.3102/10769986023001057)
