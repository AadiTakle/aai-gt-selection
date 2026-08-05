# DOK 1 — Item Bank Management and Automatic Item Generation

Fact extraction only. Every number below was read out of the source named beside it. Exact quotes are in
quotation marks. Anything I could not verify is flagged inline and listed again in the final section.

Every DOI in this document was checked against the Crossref registry and returned a matching record with the
author, year, journal, volume and pages stated here. Where a source is paywalled and I could only read the
abstract, I say so and I do not attribute numbers to it.

Applicability note that recurs throughout: almost every figure in this literature comes from **high-stakes,
high-volume, professionally staffed testing programs** — GRE, GMAT, LSAT, NCLEX, the Medical Council of
Canada, College Board Physics, UK medical finals. These programs have thousands of examinees per item, paid
psychometricians, and legal exposure. Sample-size minimums, pool-size ratios and exposure caps derived in that
setting are *not* automatically transferable to a small, low-stakes, shared question library. Where the gap
matters I say so.

---

## 1. Automatic item generation and item models / templates

### 1.1 The canonical description of template-based AIG

**Source.** Gierl, M. J., & Lai, H. (2013). "Instructional Topics in Educational Measurement (ITEMS) Module:
Using Automated Processes to Generate Test Items." *Educational Measurement: Issues and Practice*, 32(3),
36–50. DOI [10.1111/emip.12018](https://doi.org/10.1111/emip.12018). Free full text hosted by NCME:
[Module 34 PDF](https://ncme.org/wp-content/uploads/2025/10/Module-34-Automated-Item-Generation-Gierl-Lai.pdf).
ERIC record: [EJ1025484](https://eric.ed.gov/?id=EJ1025484).

**Definition.** "AIG is the process of using item models to generate test items with the aid of computer
technology."

**The three steps, verbatim from the self-test key.** "First, test development specialists create item models
that specify the elements in the assessment task that must be manipulated. Second, the content used for item
generation is identified and structured by test development specialists. This content can be structured using
either a weak or strong theory approach. Third, elements in the item model are manipulated with computer-based
algorithms to produce new items."

**What an item model is.** "An item model is like a template, mould, or prototype that highlights the features
in an item that must be manipulated to produce new items." Three components: **stem**, **options**, and
**auxiliary information**. "An element is the specific variable in an item model that is manipulated to
produce new test items. An element is denoted as either a string, which is a non-numeric value or an integer,
which is a numeric value."

The paper lists the synonyms in use, which matters because the literature is terminologically fragmented:
"schemas (Singley & Bennett, 2002), blueprints (Embretson, 2002), templates (Mislevy & Riconscente, 2006),
forms (Hively, Patterson, & Page, 1968), frames (Minsky, 1974), and shells (Haladyna & Shindoll, 1989)."

**The isomorph / variant distinction, stated by Gierl & Lai.**

> "Generated items with comparable psychometric characteristics (e.g., similar difficulty levels) are
> isomorphic… Generated items with different psychometric characteristics are also known as variants."

**Generative capacity, measured.** For their surgery example, the 1-layer item model produced **256 items**;
the n-layer model produced **16,384 items**. The self-test key gives the combinatorial arithmetic for the
1-layer model: "8 AGE * 2 GENDER * 4 PAIN * 4 LOCATION * 4 ACUITYOFONSET * 4 PHYSICALFINDINGS * 4 WBC =
16384," and for the n-layer model "16384 from 1st Layer * 3 QuestionPrompt * 4 TestFindings * 4 Situation =
786432." (Note the internal inconsistency: the body of the paper reports 256 generated from the 1-layer model
while the self-test key computes 16,384 for the same figure. I am reporting both and flagging it.)

**Measured textual similarity of generated items — the cosine similarity index (CSI).** CSI ranges 0 (no
shared words) to 1 (identical). A random sample of 100 items from each model, 4,950 pairwise comparisons:

| Model type | CSI range | Mean | SD |
| --- | --- | --- | --- |
| 1-layer | 0.53 – 0.98 | **0.74** | 0.11 |
| n-layer | 0.17 – 1.00 | **0.53** | 0.16 |

Authors' reading: "a high mean for the 1-layer model indicates that the generated items are quite similar
while the low standard deviation reveals the items are relatively homogeneous."

**The single most important admission in this paper for a bank designer.** Gierl and Lai do *not* claim
generated clones inherit parameters. They say the opposite:

> "While AIG provides a solution for generating large numbers of new test items, the psychometric properties
> (e.g., item difficulty) of these items must still be evaluated. Item quality is typically determined through
> a field or pilot testing process where each item is administered to a sample of examinees so the
> psychometric characteristics of the item can be evaluated. **This typical solution is often not feasible
> when thousands of new items have been generated.**"

They explicitly decline to solve it: "Unfortunately, a description of precalibration methods is beyond the
scope of this module."

**The pejorative usage.** "In our experience, isomorphic items generated from 1-layer item models are referred
to pejoratively by many test development specialists as 'clones,' 'ghost' items or 'Franken-items.'"

**Two economic figures, both cited at second hand.** Gierl & Lai report that "Breithaupt, Ariel, and Hare
(2010) claimed that a high-stakes 40-item computer adaptive test with two administrations per year would
require, at minimum, a 2,000-item bank," and that "Rudner (2010) estimated that the cost of developing one
operational item using the traditional approach… can range from $1,500 to $2,500." **Flag: both are book
chapters in van der Linden & Glas, *Elements of Adaptive Testing*. I did not read either original. The
$1,500–$2,500 figure is independently repeated by Westacott et al. (2023), also citing Rudner.**

### 1.2 Gierl, Lai & Turner (2012) — the 1,248-item demonstration

**Source.** Gierl, M. J., Lai, H., & Turner, S. R. (2012). "Using automatic item generation to create
multiple-choice test items." *Medical Education*, 46(8), 757–765. DOI
[10.1111/j.1365-2923.2012.04289.x](https://doi.org/10.1111/j.1365-2923.2012.04289.x).

From the published abstract: "Firstly, a cognitive model is created by content specialists. Secondly, item
models are developed using the content from the cognitive model. Thirdly, items are generated from the item
models using computer software. **Using this methodology, we generated 1248 multiple-choice items from one
item model.**" Domain: a medical licensure test, content area of surgery.

### 1.3 Embretson (1999) — the psychometric problem stated

**Source.** Embretson, S. E. (1999). "Generating items during testing: Psychometric issues and models."
*Psychometrika*, 64(4), 407–433. DOI [10.1007/BF02294564](https://doi.org/10.1007/BF02294564).
**Flag: paywalled. I verified the citation and the published abstract; I did not read the full text and
extract no numbers from it.**

The abstract states the core tension precisely:

> "Item generation seemingly conflicts with the well established principle of measuring persons from items
> with known psychometric properties."

And the three issues it addresses: "First, design principles to generate items are considered… Second,
**psychometric models for calibrating generating principles, rather than specific items, are required**…
Third, the impact of item parameter uncertainty on person estimates is considered."

### 1.4 Bejar (2002) — the isomorph / variant definitions

**Source.** Bejar, I. I. (2002). "Generative testing: From conception to implementation." In S. H. Irvine &
P. C. Kyllonen (Eds.), *Item generation for test development* (pp. 199–217). Mahwah, NJ: Lawrence Erlbaum.
Book DOI [10.4324/9781410602145](https://doi.org/10.4324/9781410602145).
**Flag: I did not read this chapter. The definitions below are how two peer-reviewed sources characterize
Bejar's distinction, not text I read in Bejar.**

Graf, Peterson, Steffen & Lawless (2005, ETS RR-05-11, DOI
[10.1002/j.2333-8504.2005.tb02002.x](https://doi.org/10.1002/j.2333-8504.2005.tb02002.x)) state:

> "Instances with predictable variation in their psychometric parameters are called **variants**; instances
> with similar psychometric parameters are called **isomorphs** (Bejar, 2002)."

> "Isomorphs are instances that are equivalent in every way except with regard to their surface features. They
> are considered exchangeable; they share the same psychometric properties and problem structure, or schema.
> Variants within a model show systematic variation with regard to a particular characteristic and are
> generally not exchangeable."

Sommer & Arendasy (2025), *Journal of Intelligence*, 13(8), 102, DOI
[10.3390/jintelligence13080102](https://doi.org/10.3390/jintelligence13080102), state the same distinction and
attach the crucial word *expected*:

> "Items constructed by only manipulating incidentals are referred to as item isomorphs (Bejar 2002) or item
> clones (Glas and van der Linden 2003). Item isomorphs are **expected to exhibit statistically identical item
> parameters**."

Irvine's radical/incidental vocabulary, as summarized by Graf et al. (2005): "In an item model, a **radical**
is a variable that affects the psychometric characteristics of the instances, and an **incidental** is a
variable that has no detectable effect on the psychometric characteristics."

**Bottom line for question 1.** No source in this set claims that generated clones *do* share item parameters
as a matter of fact. Every source states it as a *design intention* ("expected to," "presumed to," "designed
to generate"). Gierl & Lai explicitly say the psychometric properties "must still be evaluated."

---

## 2. Do generated clones actually have equivalent difficulty? — the measured within-family variability

This is the section that decides whether a generative bank can be trusted without calibrating every instance.
Four independent bodies of evidence, and they disagree in an interesting way.

### 2.1 The strongest single empirical answer: Westacott et al. (2023), 2,218 UK medical students

**Source.** Westacott, R., Badger, K., Kluth, D., Gurnell, M., Reed, M. W. R., & Sam, A. H. (2023).
"Automated Item Generation: impact of item variants on performance and standard setting." *BMC Medical
Education*, 23, 659. DOI [10.1186/s12909-023-04457-0](https://doi.org/10.1186/s12909-023-04457-0).
**Open access, full text read.**

**Design.** 50 existing MSC Assessment Alliance bank items used as item models. The AIG software generated 15
variants per model; two authors selected the four "displaying maximum difference from each other." Four
50-item papers (A–D) were compiled. 12 UK medical schools, one paper each, **N = 2,218 final-year students**.
Each paper independently standard set by a separate nine-person modified-Angoff panel; each panel also rated a
common 30-item set so panel behaviour could be compared. Four items removed before analysis, leaving 46.

**The headline result — variants intended to be isomorphic were not.**

- **21 of 46 item models (46%) had a facility difference of ≥ 0.15 between the four variants.**
- 16 of 46 item models had a difference in standard-set (Angoff) score of ≥ 0.1 between variants.
- "the average range of variation across the four variants was **0.03 for Angoff scores compared to 0.10 for
  the variance in facility**."
- Worked example (Item 12, kidney stones): "The standard setting range of 0.08 (0.52–0.60) is much lower than
  the facility range of 0.30 (0.30–0.60)."
- Whole-paper level: "the average student performance varied by 10% across the four papers, from 55% (paper 4)
  to 65% (paper 3). This contrasts with a much smaller difference in the standard set for each paper, where
  the passing standard set only varied from 58% (papers 1 and 4) to 61% (paper 3)."
- Test reliabilities: Cronbach's alpha 0.67–0.75; correlation between item facility and Angoff score per
  paper r = 0.65, 0.83, 0.68, 0.67.

**Authors' conclusion, verbatim:**

> "We believe this study is the first to demonstrate that item variants produced by changing incidental
> variables (creating clones) using AIG leads to wider variation in student performance than in standard
> setting behaviour. This study demonstrates that **'isomorphic' (or clone) questions generated by AIG for
> undergraduate medical assessments should not be assumed to have the same passing standard, and therefore
> each variant should be standard set as an individual item.**"

**What drove the variance.** "the predominant theme identified was that the facility of question variants
diverged most when clinical vignettes deviated more from typical keywords (or 'buzzwords') associated with the
condition." Concretely: variants describing gallbladder pain as "right upper quadrant" (prototypical) were
easier than variants describing it as "epigastric"; and in a COPD item, variants where the patient had "lost 2
kg in weight" were harder than variants where the patient "maintained a steady weight," because the weight
loss pushed students toward a cancer diagnosis. The authors' explanation: "Variation in parameters that could
alter clinical reasoning strategies had the greatest impact on item facility."

**The authors' own confound, stated plainly.** "participants were randomised by medical school and therefore…
differences in performance between papers may be a result of difference in school cohort performance rather
than question characteristics." No anchor items linked the four papers. Their own recommendation: "Anchor
items should be used in future studies if using different student cohorts to allow test equating."

**Two internal numeric discrepancies I want on the record.** The abstract says "The average facility of the
four papers ranged from 0.55–0.61" and "Twenty item models had a facility difference > 0.15 and 10 item models
had a difference in standard setting of > 0.1." The Results and Discussion sections say 0.55–0.65, and
"21/46 item models with a facility difference ≥ 0.15 and the 16/46 item models with a difference in standard
setting of ≥ 0.1." **Use the Results-section figures (0.55–0.65; 21 and 16); the abstract appears not to have
been updated after the four items were removed.**

### 2.2 A within-model IRT parameter range from a GRE item-modelling program

**Source.** Graf, E. A., Peterson, S., Steffen, M., & Lawless, R. (2005). "Psychometric and Cognitive Analysis
as a Basis for the Design and Revision of Quantitative Item Models." ETS Research Report RR-05-11. DOI
[10.1002/j.2333-8504.2005.tb02002.x](https://doi.org/10.1002/j.2333-8504.2005.tb02002.x). Full text read.

**Design.** The stated goal was "to design a set of item models that would generate psychometrically
equivalent (isomorphic) multiple-choice instances for use in unscored quantitative sections of the Graduate
Record Examination (GRE)." Four content areas (linear inequalities, probabilities, remainders, quadrilateral
perimeters), a model at each of four difficulty levels = 16 models, **10 multiple-choice instances generated
per model** and inserted into unscored sections. Analysis sample restricted to U.S. citizens for whom English
is the best language. 3PL fitted with scaling factor 1.7.

**Overall finding.** "Some of the models generated instances with similar item parameter estimates, but others
generated instances with highly variable item parameter estimates."

**The measured spread within one model designed to produce isomorphs (the linear inequality model, 10
instances):**

> "The proportion correct across instances was highly variable (proportion correct ranges from .14 to .32).
> The IRT parameter estimates were also highly variable (**a-parameter estimates range from .20 to 1.37;
> b-parameter estimates range from 2.52 to 4.10; and c-parameter estimates range from .05 to .26**)."

That is a **1.58-logit spread in difficulty among ten items that one model was purposely built to make
exchangeable**, plus a discrimination range spanning nearly the whole usable interval. The instances fell into
"two distinct performance classes" the authors labelled Type 1 and Type 2.

**The cause, and why it is the scariest fact in this whole document.** The two classes differed in exactly one
respect: which distractor-generating rule was used. "The main difference between the two performance classes
is that the Type 1 instances include Distractor Model 1, and the Type 2 instances replace Distractor Model 1
with Distractor Model 5." Distractor Model 1 corresponded to a popular misconception: "between 40-50% of
examinees selected this option when it appeared, and it was much more popular than the key."

The authors' own comment on detectability: "**It should be noted that this analysis is retrospective —
without the benefit of item performance data, the instances from this model appear quite similar.** There may
be no strong a priori reason to believe that one distractor model is more compelling than another."

And more generally: "**apparently small differences in the composition of the instances can have very large
effects on performance, and we have observed that this is often the case with other item models as well.**"

They also cite the earlier finding they were replicating: "Meisner, Luecht, and Reckase (1993) investigated the
statistical comparability of mathematics instances that were generated from the same algorithm… They found
that many algorithms generated instances with similar statistics, but that a few did not." (ACT Research
Report 93-9. **Flag: not read; cited at second hand.**)

### 2.3 The magnitude of within-family variance actually assumed in the ETS GRE simulation

**Source.** Bejar, I. I., Lawless, R. R., Morley, M. E., Wagner, M. E., Bennett, R. E., & Revuelta, J. (2002).
"A Feasibility Study of On-the-Fly Item Generation in Adaptive Testing." ETS Research Report RR-02-23. DOI
[10.1002/j.2333-8504.2002.tb01890.x](https://doi.org/10.1002/j.2333-8504.2002.tb01890.x). Also published as
Bejar et al. (2003), *Journal of Technology, Learning, and Assessment*, 2(3), free full text at
[JTLA](https://ejournals.bc.edu/index.php/jtla/article/view/1663). Full text read.

**Design.** 261 items, 147 item models, GRE quantitative. Three levels of "lack of isomorphicity" were built
into the simulation by choosing three variance-covariance matrices for the item parameters — best (Σ1),
medium (Σ2), worst (Σ3). The diagonals as printed:

| Scenario | Var(a) | **Var(b)** | Var(c) | Implied SD of b |
| --- | --- | --- | --- | --- |
| Σ1 "best" | .003 | **.023** | .006 | ≈ 0.15 logits |
| Σ2 "medium" | .012 | **.237** | .014 | ≈ 0.49 logits |
| Σ3 "worst" | .015 | **.337** | .020 | ≈ 0.58 logits |

**Flag on provenance.** These matrices were derived from "the variance-covariance matrix among the parameter
estimates of each item" for a set of *linking* items, then adopted as stand-ins for within-model variation:
"we selected one matrix at each of three levels of variability in b, which we labeled best (Σ1), medium (Σ2),
and worst-case (Σ3) scenarios." So they are a realistic order-of-magnitude, not a direct measurement of clone
spread. The implied SDs in the last column are my arithmetic (√variance), not the authors'.

**Results.** "Results of the simulation study showed that under different levels of isomorphicity, **there was
no bias, but precision of measurement was eroded**, especially in the middle range of the true-score scale."
And in the discussion: "the impact of lack of isomorphicism is primarily in measurement precision, at least
within limits… **This outcome is fortunate, as a loss of precision can be compensated by lengthening the test,
but bias would be more difficult to correct.**"

**Field study result.** An experimental on-the-fly adaptive quantitative test given to real examinees: "the
correlation between the two sets of scores was **.87**. This correlation turns out to be as high as the GRE
quantitative section's test-retest correlation." Item-level analysis "suggested that a high level of
isomorphicity across items within models was achieved."

### 2.4 The simulation that quantifies how much within-family variance a test can absorb

**Source.** Tian, C., & Choi, J. (2023). "The Impact of Item Model Parameter Variations on Person Parameter
Estimation in Computerized Adaptive Testing With Automatically Generated Items." *Applied Psychological
Measurement*, 47(4), 275–290. DOI
[10.1177/01466216231165313](https://doi.org/10.1177/01466216231165313). Free full text:
[PMC10240571](https://pmc.ncbi.nlm.nih.gov/articles/PMC10240571/). Full text read.

**Design.** Data generated under the Related Siblings Model (variance exists), scored under the Identical
Siblings Model (variance ignored) — i.e., exactly the mistake a naive generative bank makes. 2PL. 1,000 item
models per pool, five content categories, test lengths 10/20/30/40/50/80, 15 ability points, 100 replications.

**How they operationalize "small / medium / large."** "The three levels are defined using the **ratio of
within-family variance over across-family variance. 10% means small, 20% means medium, and 50% means large.**"
A 0% baseline was included.

**Results.**

- "There is no dramatic increase in SE when the within-family variance increases from small (10%) to large
  (50%), especially when the test length is larger than 20."
- "A test having 20 or more items would yield a correlation coefficient greater than **0.95** [linear tests],
  regardless of the size of within-family variance"; for CAT, "greater than **0.97**."
- The failure mode is bias, not noise: "as the within-family variance increases, the MLE estimates are biased
  **towards zero**… The absolute values of biases in all conditions are smaller than **0.3**." And critically:
  "the bias could not be compensated by longer test lengths."
- Their design fix: "to yield less biased ability estimates, the item model pool should provide balanced
  opportunities such that **'fake-easy' and 'fake-difficult' item instances cancel their effects.**"
- Their own hedge on the worst condition: "**Fortunately, the large within-family variance depicted in Figure
  8 is unrealistic.**"

Note also, buried in their methods, a pool-size rule of thumb they treat as settled: "The pool size, 1000, was
chosen based on the rule of thumb that **the pool size should be 12 times the CAT test length**." (See §6.)

**Direct conflict with Bejar et al. worth flagging.** Bejar et al. (2002) found "no bias… precision of
measurement was eroded." Tian & Choi (2023) found the opposite pattern: standard error barely moves, bias
toward the centre appears and does not wash out with test length. Both are simulations; they differ in model
(3PL/ERF vs. 2PL/RSM-ISM) and in what was held fixed. **I am not reconciling them. The disagreement is real
and is a DOK 3 seed.**

### 2.5 The statistical models built specifically because clones are not identical

**Sources.**
- Glas, C. A. W., & van der Linden, W. J. (2003). "Computerized Adaptive Testing With Item Cloning."
  *Applied Psychological Measurement*, 27(4), 247–261. DOI
  [10.1177/0146621603027004001](https://doi.org/10.1177/0146621603027004001). **Flag: paywalled at Sage.
  Abstract verified; full text not read; no numbers attributed.**
- Sinharay, S., Johnson, M. S., & Williamson, D. M. (2003). "Calibrating Item Families and Summarizing the
  Results Using Family Expected Response Functions." *Journal of Educational and Behavioral Statistics*,
  28(4), 295–313. DOI [10.3102/10769986028004295](https://doi.org/10.3102/10769986028004295).
- Johnson, M. S., & Sinharay, S. (2003). "Calibration of Polytomous Item Families Using Bayesian Hierarchical
  Modeling." ETS Research Report RR-03-32. DOI
  [10.1002/j.2333-8504.2003.tb01915.x](https://doi.org/10.1002/j.2333-8504.2003.tb01915.x). **Full text read.**
- Sinharay, S., & Johnson, M. S. (2008). "Use of Item Models in a Large-Scale Admissions Test: A Case Study."
  *International Journal of Testing*, 8(3), 209–236. DOI
  [10.1080/15305050802262019](https://doi.org/10.1080/15305050802262019). **Flag: paywalled. Abstract verified
  only.**

**Glas & van der Linden's abstract states the premise directly:** "An important consequence of item cloning is
**possible variability between the item parameters**. To deal with this variability, a multilevel item
response (IRT) model is presented which allows for differences between the distributions of item parameters of
families of item clones." Their selection procedure has two stages: "First, a family of item clones is
selected to be optimal at the estimate of the person parameter. Second, **an item is randomly selected from
the family** for administration."

**The three-model taxonomy, quoted from Johnson & Sinharay (2003).** This is the cleanest statement in the
literature of the design choice a shared question library is implicitly making:

- **Unrelated Siblings Model (USM)** — every item calibrated independently. "the model has the disadvantage
  that each item has to be individually calibrated. In addition, this approach ignores the relationship
  between siblings in an item family and hence will provide standard errors of item parameters that are too
  large and will require larger sample sizes for acceptable calibration precision."
- **Identical Siblings Model (ISM)** — all siblings share one parameter set. "it has the limitation that it
  **ignores any variation between siblings and hence, in the face of such variations, provides biased
  estimates of the item parameters and is overconfident about the amount of information available to estimate
  examinee scores.**"
- **Related Siblings Model (RSM)** — hierarchical; each item gets its own response function, but siblings'
  parameters are drawn from a family distribution. "ISM and USM are limiting cases of the RSM. If the mixing
  distribution approaches a point mass (or the variances of the mixing distribution go to 0), then the RSM
  approaches the limit to the ISM."

**The RSM's practical drawback, from the same paper:** "there is no standard software for fitting this model.
We use our own C++ program."

**Their simulation's own calibration of what is realistic:** "The data generator draws individual item
parameters so that **the within-family variance is one fifth as large as the between-family variance**" —
i.e., 20%, matching Tian & Choi's "medium" condition.

**A real-data result from NAEP Mathematics Online (Grade 8), where 15 of 26 items per form were automatically
generated.** Johnson & Sinharay found: "The item families **without** AIG items generally have a set of item
score functions that are closer to the family score functions than families **with** AIG items." And a
specific failure: "Family 5, also an AIG family, contains one item score function that is quite different from
the other three… the AIG item from block M4 **deviates dramatically** from the other three-item item score
functions in the family. The extent of the deviation appears to impact the response function for the family as
a whole."

**Their own stated unknown, which is precisely the design question:** "First among them is to find out **the
sample size required to achieve a prespecified accuracy**… it will be helpful to be able to provide some
guidance as to 'how large' the sample size should be. Also, given a specific number of examinees who will take
a test involving item families, we will like to determine the optimum values of **the number of siblings per
family and the number of examinees per sibling**." They also report the estimator is fragile with small
families: "the simulated data has **only 10 items per item family, which is probably too few for estimating
the within family variances**."

**Sinharay & Johnson (2008), from the verified abstract:** "A major question for these types of data is
whether these items are isomorphic; that is, if they behave the same psychometrically. This article describes
a number of rough diagnostic measures and a statistical diagnostic to assess the extent of isomorphicity."
**Flag: the widely repeated claim that they found "surprising variation within some item siblings" comes from
a secondary source (a UMass dissertation summarizing them), not from text I read in the paper.**

### 2.6 Two more data points on the reliability of the generative pipeline

- Sommer & Arendasy (2025), DOI [10.3390/jintelligence13080102](https://doi.org/10.3390/jintelligence13080102):
  "In most applications that examined the dimensionality of the automatically generated test items, **the
  percentage of item loss ranged from 10 to 30 percent**" after calibration, for reasons such as model misfit.
- Westacott et al. (2023) had to remove 4 of 50 items: two had two correct answers, one was postgraduate-level
  with an unclear lead-in, and one was caught only on manual review — "the AIG process created variants for
  this particular item that **enabled there to be more than one correct answer**, however this was only
  revealed on reviewing each of the variants." That fourth item **did not flag on performance data**.

---

## 3. Item calibration sample size requirements

### 3.1 The honest headline: there is no single number, and the field says so

**Source.** Schroeders, U., & Gnambs, T. (2025). "Sample-Size Planning in Item-Response Theory: A Tutorial."
*Advances in Methods and Practices in Psychological Science*, 8(1). DOI
[10.1177/25152459251314798](https://doi.org/10.1177/25152459251314798). Preprint DOI
[10.31234/osf.io/hv6zt](https://doi.org/10.31234/osf.io/hv6zt).

> "Several textbooks on IRT provide general recommendations on the required sample size for different models
> (De Ayala, 2022; DeMars, 2010; van der Linden, 2018), which often culminate in suggesting **at least 250 or
> 500 respondents**… or having a sufficient **ratio of respondents to model parameters, such as 10:1 or 20:1**
> (De Ayala & Sava-Bolesta, 1999; DeMars, 2003)."

> "However, simulation studies examining the minimum required sample size for IRT analyses have consistently
> shown that these are context-dependent. For instance, some studies have suggested that IRT can yield
> accurate parameter estimates with **as few as 100 respondents if prior information is incorporated** into
> the estimation… In contrast, other studies have indicated that for IRT models including guessing or slipping
> parameters… **even sample sizes of 2,000 may be insufficient.**"

Their list of the seven factors that move the answer: item type, response model, estimation method,
dimensionality, latent trait distribution, size and homogeneity of the item pool, and test design including
missing data and item coverage. Their recommendation is to run a Monte Carlo simulation of your own design
rather than use a rule of thumb.

### 3.2 The classical anchor: Lord (1968) and the "1,000 for the 3PL" convention

Reported by Şahin & Anıl (2017) (full citation below), reading the primary literature:

> "Lord's (1968) study is the first one of its kind… As a result, Lord concluded that a **minimum of 50 items
> and 1,000 examinees** were required to estimate a parameters with high accuracy. With the support of
> subsequent studies (Patsula & Gessaroli, 1995; Tang, Way, & Carey, 1993; Yen, 1987; Yoes, 1995), **1,000 was
> taken as the minimum sample size required for accurate item-parameter estimation in IRT.**"

Lord, F. M. (1968), *Educational and Psychological Measurement*, 28(4), 989–1020, DOI
[10.1177/001316446802800401](https://doi.org/10.1177/001316446802800401). **Flag: I verified the citation via
Şahin & Anıl's reference list; I did not read Lord (1968).**

### 3.3 The best single empirical table: Şahin & Anıl (2017)

**Source.** Şahin, A., & Anıl, D. (2017). "The Effects of Test Length and Sample Size on Item Parameters in
Item Response Theory." *Educational Sciences: Theory & Practice*, 17(1), 321–335. DOI
[10.12738/estp.2017.1.0270](https://doi.org/10.12738/estp.2017.1.0270). Free full text:
[ERIC EJ1130806](https://files.eric.ed.gov/fulltext/EJ1130806.pdf). **Full text read.**

**Design — note that this is *real* data, not simulated.** A 50-item English language test administered to
**6,288** university freshmen in one session. Sub-tests of 10, 20 and 30 items built by factor loading; nine
stratified random samples (N = 150, 250, 350, 500, 750, 1,000, 2,000, 3,000, 5,000). Estimation by MMLE in
Xcalibre 4.1. The full-data estimates (N = 6,288, 50 items) were treated as "true." Acceptance criteria: **r ≥
0.70** between recovered and baseline parameters **and RMSD ≤ 0.33**.

**Their Table 4 — minimum sample size meeting both criteria:**

| Test length | 1PL | 2PL | 3PL |
| --- | --- | --- | --- |
| 10 items | **150** | **750** | **750** |
| 20 items | **150** | **500** | **750** |
| 30 items | **150** | **250** | **350** |

Selected supporting statistics they report: at N = 500 with 10 items in the 3PL, "500 examinees with 10 items
in 3PLM yields very poor estimates for the a parameter (r = 0.345, RMSD = 0.19)." At N = 250 with 10 items in
the 2PL, the a-parameter correlation was **−0.311**.

**Authors' own limitations, verbatim:** "the present findings may only be limited to language-test development
and short test lengths up to 30 items with qualities similar to those used in the present study. Moreover, the
parameter estimates were obtained using MMLE, so the present findings may be limited to item parameter
estimation with MMLE." Also: KR-20 was 0.76 / 0.85 / 0.88 for the three sub-tests and the sub-tests were
constructed to be "highly unidimensional." Both conditions flatter the result.

### 3.4 The scatter in the prior literature, as Şahin & Anıl catalogue it

This is worth reproducing because the honest answer to "how many responses does an item need" is "published
minimums disagree by an order of magnitude."

- **1PL:** 250 (Goldman & Raju, 1986), 300 (Guyer & Thompson, 2011), 500 (Thissen & Wainer, 1982). "some
  authors have already suggested a sample size of around 200 as appropriate for 1PLM (DeMars, 2010; Wright &
  Stone, 1979)."
- **2PL:** 250 with 15 items (Harwell & Janosky, 1991); 500 (Stone, 1992) or 750 (Lim & Drasgow, 1990) with 20
  items; 200 (Weiss & Minden, 2012) or 250 (Harwell & Janosky, 1991) with 25 items; 500 with 30 items (Hulin,
  Lissak, & Drasgow, 1982); 300 with 75 items (Yoes, 1995).
- **3PL:** 1,000 with 20 items (Patsula & Gessaroli, 1995; Swaminathan & Gifford, 1979; Yen, 1987); 200 with 25
  items (Weiss & Minden, 2012); 500 with 30 items (Akour & Al-Omari, 2013); 300 with 50 items (Chuah, Drasgow,
  & Luecht, 2006); 1,000 with 40/50/60/75 items; 500 with 80 items (Ree & Jensen, 1980).

**Flag: every citation in §3.4 is second-hand, taken from Şahin & Anıl's literature review. I did not read any
of them.**

### 3.5 The Rasch-specific small-sample table — useful but not peer-reviewed

**Source.** Linacre, J. M. (1994). "Sample Size and Item Calibration [or Person Measure] Stability." *Rasch
Measurement Transactions*, 7(4), 328. [https://www.rasch.org/rmt/rmt74m.htm](https://www.rasch.org/rmt/rmt74m.htm).
**Flag: *Rasch Measurement Transactions* is a newsletter, not a peer-reviewed journal. Treat this as a
practitioner heuristic.**

| Item calibrations stable within | Confidence | Minimum sample range (best → poor targeting) | "Size for most purposes" |
| --- | --- | --- | --- |
| ± 1 logit | 95% | 16 – 36 | 30 (minimum for dichotomies) |
| ± 1 logit | 99% | 27 – 61 | 50 (minimum for polytomies) |
| ± ½ logit | 95% | 64 – 144 | 100 |
| ± ½ logit | 99% | 108 – 243 | 150 |
| **Definitive or high stakes** | 99%+ | **250 – 20 × test length** | **250** |
| Adverse circumstances | Robust | 450 upwards | 500 |

The page also states: "Inflate these sample sizes by 10%-40% if there are major sources of unmodelled
measurement disturbance, such as different testing conditions or alternative curricula."

**Why the ± ½ logit row is the row that matters for a shared bank.** A ±1-logit confidence interval on item
difficulty is roughly the *entire* difficulty spread Graf et al. (2005) observed inside a single item model
(§2.2). Calibrating to ±1 logit cannot detect the clone-drift problem it would need to detect.

### 3.6 What the Standards require, rather than recommend

AERA/APA/NCME (2014), **Standard 4.10** (full citation in §8):

> "When a test developer evaluates the psychometric properties of items, the model used for that purpose (e.g.,
> classical test theory, item response theory, or another model) should be documented. **The sample used for
> estimating item properties should be described and should be of adequate size and diversity for the
> procedure.** The process by which items are screened and the data used for screening, such as item
> difficulty, item discrimination, or differential item functioning (DIF) for major examinee groups, should
> also be documented."

Comment attached: "**Although overall sample size is relevant, there should also be an adequate number of
cases in regions critical to the determination of the psychometric properties of items.**"

Note what this does and does not say: the Standards impose a **documentation** requirement, not a numeric
floor. There is no number in the Standards.

---

## 4. Item parameter drift

### 4.1 Origin of the term

**Source.** Goldstein, H. (1983). "Measuring Changes in Educational Attainment Over Time: Problems and
Possibilities." *Journal of Educational Measurement*, 20(4), 369–377. DOI
[10.1111/j.1745-3984.1983.tb00214.x](https://doi.org/10.1111/j.1745-3984.1983.tb00214.x). Free full text of the
article (author's institutional copy):
[University of Bristol CMM PDF](https://www.bristol.ac.uk/media-library/sites/cmm/migrated/documents/measuring-changes-in-educational-attainment-over-time.pdf).

Goldstein's framing of the logical problem, from that text: the Rasch approach "requires that the
characteristics of all the items during that [time] period remain constant," while the whole point of
measuring change is to let items reflect a changing curriculum. Baldwin et al. (2025) state the standard
attribution: "it is conventional to describe any lack of parameter invariance over time as **item parameter
drift (IPD; Goldstein, 1983)**." (Baldwin, Grabovsky, Swygert & Fogle, 2025, *Applied Psychological
Measurement*, 49(3–4), 212–223, DOI [10.1177/01466216251316282](https://doi.org/10.1177/01466216251316282).)

In a later popular piece Goldstein describes the standard anchor practice and its two untestable assumptions:
"each test contains a small number of identical questions, say **15% of the total**… First it is necessary to
make the invariance assumption for the common items and this, inevitably, is **a matter for judgment which may
not be universally shared.** Then even if such an assumption is accepted, because the non-common items are
allowed to reflect background changes, the relationship between the common item set and the non-common items
can be expected to vary across the tests; yet it is necessary to assume that this relationship is constant."
([Measuring educational standards, *Significance*, September 2004, Bristol CMM PDF](https://www.bristol.ac.uk/media-library/sites/cmm/migrated/documents/measuring-educational-standards1.pdf).)

### 4.2 The empirical demonstration over 10 years

**Source.** Bock, R. D., Muraki, E., & Pfeiffenberger, W. (1988). "Item Pool Maintenance in the Presence of
Item Parameter Drift." *Journal of Educational Measurement*, 25(4), 275–285. DOI
[10.1111/j.1745-3984.1988.tb00308.x](https://doi.org/10.1111/j.1745-3984.1988.tb00308.x).
**Flag: paywalled at Wiley. Abstract verified; full text not read; no drift magnitudes extracted.**

The full published abstract, which is short enough to quote entire:

> "Differential linear drift of item location parameters over a **10-year period** is demonstrated in data
> from the **College Board Physics Achievement Test**. The relative direction of drift is associated with the
> content of the items and reflects changing emphasis in the physics curricula of American secondary schools.
> **No evidence of drift of discriminating power parameters was found.** Statistical procedures for detecting,
> estimating, and accounting for item parameter drift in item pools for long-term testing programs are
> proposed."

Two facts worth isolating: drift was **content-correlated**, not random, and it hit **difficulty only, not
discrimination**.

A worked example of the mechanism, reported second-hand by Li (n.d., Michigan Language Assessment research
report, [PDF](https://michiganassessment.org/wp-content/uploads/2020/02/20.02.pdf.Res_.AnInvestigationoftheItemParameterDriftintheExaminationfortheCertificateofProficiencyinEnglishECPE.pdf)):
"An example was a fourth-grade science test item about the metric system… The time teachers spent in teaching
the metric system was longer than that spent in teaching the English system, which resulted in **declining
difficulty for items concerning the metric system but increasing difficulty for the English system items**."
**Flag: this example is attributed to Bock et al. by a secondary source; I did not read it in Bock et al.**

### 4.3 Detection methods

**Source.** DeMars, C. E. (2004). "Detection of Item Parameter Drift over Multiple Test Administrations."
*Applied Measurement in Education*, 17(3), 265–300. DOI
[10.1207/s15324818ame1703_3](https://doi.org/10.1207/s15324818ame1703_3). **Flag: paywalled. Abstract verified
only.**

Three methods compared, from the abstract: "the procedure in BILOG-MG for estimating linear trends in item
difficulty, the CUSUM procedure that Veerkamp and Glas (2000) used to detect trends in difficulty or
discrimination, and a modification of Kim, Cohen, and Park's (1995) χ² test for multiple-group differential
item functioning (DIF), using linear contrasts on the discrimination and difficulty parameters."

Design: "Data were simulated as if collected over **3, 4, or 5 time points**, with parameter drift in either a
gradual, linear pattern, a less linear but still monotonic pattern, or as a sudden shift at the third time
point."

Result: "The BILOG-MG procedure and the modification of the Kim et al. procedure were **more powerful than the
CUSUM procedure, nearly always detecting drift**. All three procedures had false alarm rates for nondrift
items near the nominal alpha."

Also relevant: Donoghue, J. R., & Isham, S. P. (1998). "A Comparison of Procedures to Detect Item Parameter
Drift." *Applied Psychological Measurement*, 22(1), 33–51. DOI
[10.1177/01466216980221002](https://doi.org/10.1177/01466216980221002). **Flag: paywalled; cited only as the
standard comparison study.**

The routine operational practice, as stated by Huang et al. (2018), *Applied Psychological Measurement*, free
full text [PMC5978631](https://pmc.ncbi.nlm.nih.gov/articles/PMC5978631/): "practice for identifying parameter
drift… is to **recalibrate items and evaluate changes in the [parameters] over testing occasions**."

### 4.4 The magnitude of drift that operational programs treat as tolerable

**Source.** Han, K. T., & Guo, F. (2011). "Potential Impact of Item Parameter Drift Due to Practice and
Curriculum Change on Item Calibration in Computerized Adaptive Testing." GMAC Research Report RR-11-02.
[PDF](https://www.gmac.com/-/media/files/gmac/research/research-report-series/rr1102_itemcalibration.pdf).
**Flag: a testing-organization research report, not peer-reviewed. Full text read.**

This gives the single most useful operational number I found:

> "the IPD by **±0.50** with b-parameter at each individual item level is very important to study because it
> is considered **an acceptable range of IPD** considering that the **standard error of estimation for b
> parameter usually ranges between 0.30 and 0.50 even without IPD**. An item with IPD of a magnitude larger
> than 0.50 may be detected easily by various IPD detection methods… and excluded from operational use, and so
> is usually inconsequential in practice. **Items with IPD of 0.50 or less, however, often go undetected and
> end up being used in test operations.**"

**Design.** 1,000 real GMAT quantitative items (mean a = 0.84, b = 0.55, c = 0.20), 100 held out as pretest,
900 operational; 50,000 simulated test takers, θ ~ N(0.5, 1); 30-item CAT; **relative exposure limit set to
0.20**; 20% of operational items (180) given a b-shift of −0.50, affecting 10/20/30/40/50% of test takers.

**Findings.**
- Mean bias in θ rose linearly with the affected fraction; at 50% of test takers affected it was "approximately
  0.038." Change in mean absolute difference "was less than 0.006," against a typical θ standard error of
  about 0.3.
- Effect on new pretest-item calibration: "**the new item parameter estimates were not significantly
  influenced by IPD under the studied conditions unless IPD affected 50 percent of test takers.**" Matched-pair
  t-tests were significant only for the a parameter at 50% (p = .031); the mean absolute difference in item
  response function was significant at 30% and above.
- Overall: "**the short-term effect of IPD on item calibration turned out to be very limited and fairly
  inconsequential under the studied conditions.**"

**Their own caveat, which is the one that transfers to a small bank:** "the effect of such IPD can be
cumulative and can become consequential at some point over the long term… **the impact of IPD on the item
calibration may rapidly become consequential as more pretest items are added to the item pool as operational
items.**" In their second round only 100 of 1,000 pool items (10%) were newly calibrated; in a small,
fast-churning bank that fraction is far higher.

Prior findings they summarize (all from non-adaptive tests): "Wells, Subkoviak, and Serlin (2002) found that
**20 percent of IPD items** included in the test could have a significant impact on the score estimates. Han
and Wells (2007) further… concluded that the test equating result could deteriorate significantly even with
**10 percent of IPD items in the linking item set**." (Wells, Subkoviak & Serlin, 2002, *Applied Psychological
Measurement*, 26(1), 77–87, DOI [10.1177/0146621602026001005](https://doi.org/10.1177/0146621602026001005).
**Flag: verified citation only; not read.**)

### 4.5 What the Standards require about drift

AERA/APA/NCME (2014), **Standard 5.6**:

> "Testing programs that attempt to maintain a common scale over time should conduct **periodic checks of the
> stability of the scale** on which scores are reported. Comment: The frequency of such checks depends on
> various characteristics of the testing program. In some testing programs, **items are introduced into and
> retired from item pools on an ongoing basis**… if a fixed scale is used for reporting, it is important to
> ensure that the meaning of the scale scores does not change over time. **When scales are based on the
> subsequent application of precalibrated item parameter estimates using item response theory, periodic
> analyses of item parameter stability should be routinely undertaken.**"

And **Standard 4.24 cluster / Test Revisions** narrative text:

> "Tests and their supporting documents… should be reviewed periodically to determine whether revisions are
> needed. Revisions or amendments are necessary when new research data, significant changes in the domain, or
> new conditions of test use and interpretation suggest that the test is no longer optimal or fully
> appropriate for some of its intended uses… **tests of mastery of educational or training curricula should be
> reviewed whenever the corresponding curriculum is updated.**"

---

## 5. Item exposure control

### 5.1 Why over-exposure compromises a bank

**Source.** Way, W. D. (1998). "Protecting the Integrity of Computerized Testing Item Pools." *Educational
Measurement: Issues and Practice*, 17(4), 17–27. DOI
[10.1111/j.1745-3992.1998.tb00632.x](https://doi.org/10.1111/j.1745-3992.1998.tb00632.x).
**Flag: paywalled at Wiley. I could not read the full text. Everything attributed to Way below is quoted from
Chen, Ankenmann & Spray (1999), who cite him. Note also that the ACT report's reference list miscites the
volume as "27" — Crossref confirms 17(4), 17–27.**

Way's two-category taxonomy of exposure control, as reported by Chen, Ankenmann & Spray (1999):

> "Way (1998) stated that, to date, the methods used to avoid item overexposure in CATs fall into two general
> categories: (a) **randomized item selection** (e.g., McBride & Martin, 1983; Bergstrom, Lunz, & Gershon,
> 1992; Way, Zara, & Leahy, 1996); and (b) **conditional item selection** (e.g., Sympson & Hetter, 1985; Davey
> & Parshall, 1995; Stocking & Lewis, 1995, 1998)."

Two definitions, also from Way via Chen et al.: "**Item exposure rate** refers to the relative frequency with
which an item is presented across all CAT administrations, that is, the proportion of all CATs in which an item
is administered. **Average item overlap** is defined by Way (1998) as the proportion (or percentage) of items
shared by pairs of exams, averaged across all possible pairwise comparisons."

### 5.2 The Sympson–Hetter procedure

**Source.** Sympson, J. B., & Hetter, R. D. (1985, October). "Controlling item-exposure rates in computerized
adaptive testing." *Proceedings of the 27th Annual Meeting of the Military Testing Association* (pp. 973–977).
San Diego, CA: Navy Personnel Research and Development Center.
**Flag: unpublished conference proceedings, no DOI, not available online. I could not obtain it. The
description below is Stocking's (1993) account, which is contemporaneous, from ETS.**

**Source for the description.** Stocking, M. L. (1993). "Controlling Item Exposure Rates in a Realistic
Adaptive Testing Paradigm." ETS Research Report RR-93-02. DOI
[10.1002/j.2333-8504.1993.tb01513.x](https://doi.org/10.1002/j.2333-8504.1993.tb01513.x). Free full text:
[ERIC ED384663](https://files.eric.ed.gov/fulltext/ED384663.pdf). **Full text read.**

> "The procedure distinguishes between the probability P(S) that an item is selected as optimal in an adaptive
> test for an examinee randomly sampled from a typical group of examinees, and P(A|S), the probability that an
> item is administered, given that it has been selected… The procedure seeks to control the overall
> probability that an item is administered, P(A) = P(A|S)*P(S), and to insure that **the maximum value over
> all P(A)s is less than some value r. This value r is the expected (not observed) maximum rate of item
> usage.**"

> "The conditional probability P(A|S) = k is some fraction that indicates the proportion of the time an item is
> selected that it should actually be administered. **The exposure control parameters, k, one for each item,
> are determined through a series of simulations** using an already established adaptive test design and
> simulees drawn from a typical distribution of ability."

Operational rule at test time: "If the random number is greater than the exposure control parameter for the
selected item, do not administer the item, and remove it from the pool of remaining items for this examinee.
Repeat this procedure for the next-most-optimal item. Continue until an item is found that can be
administered."

**Stocking & Lewis conditional version.** Stocking, M. L., & Lewis, C. (1998). "Controlling Item Exposure
Conditional on Ability in Computerized Adaptive Testing." *Journal of Educational and Behavioral Statistics*,
23(1), 57–75. DOI [10.3102/10769986023001057](https://doi.org/10.3102/10769986023001057). Earlier ETS version:
Stocking & Lewis (1995), RR-95-25, DOI
[10.1002/j.2333-8504.1995.tb01660.x](https://doi.org/10.1002/j.2333-8504.1995.tb01660.x). **Flag: both
paywalled; verified citations only.** The point of the conditional version is that Sympson–Hetter controls
exposure *marginally*, over the whole population, while a colluding group of examinees at a similar ability
level sees a far higher effective exposure.

### 5.3 The stated maximum exposure rates in operational designs

- **Stocking (1994), ETS, on three of five operational adaptive tests:** "the extended Sympson and Hetter
  exposure control methodology was employed, with the **target maximum exposure rate specified to be .2**,
  that is, ideally no element in the pool is to be seen by more than 20% of a typical population."
- **Han & Guo (2011), GMAC, GMAT simulation:** "To control item exposure, the **relative exposure limit was
  set to 0.20**, by which no more than 20 percent of test takers could see the same item during the entire
  test administration."
- **Chang (1998), as tabulated by Chen, Ankenmann & Spray (1999):** Sympson–Hetter run "with a desired maximum
  item exposure rate of **.10**."
- **Chen & Ankenmann (1999), as tabulated by Chen, Ankenmann & Spray (1999):** Sympson–Hetter with "a desired
  maximum item exposure rate of **.20**."

### 5.4 The measured effect of exposure control — and the finding that a bigger pool alone does not help

**Source.** Chen, S.-Y., Ankenmann, R. D., & Spray, J. A. (1999). "Exploring the Relationship Between Item
Exposure Rate and Test Overlap Rate in Computerized Adaptive Testing." ACT Research Report 99-5. Iowa City, IA:
ACT, Inc. [PDF](https://www.act.org/content/dam/act/unsecured/documents/ACT_RR99-05.pdf).
**Flag: a testing-organization research report, not peer-reviewed. Full text read. The derivation itself is
algebra, so it is checkable.**

**The key identity.** For fixed-length CATs, the average item exposure rate is fixed by design alone:
r̄ = k/n, where k is test length and n is pool size — "for a given ratio of pool size to fixed test length, the
average item exposure rate is fixed, **regardless of the number of CATs administered or the quality of the
items in the pool**." And the large-sample average between-test overlap is T̄ = (S²ᵣ / r̄) + r̄, a linear
function of the *variance* of exposure rates with slope n/k.

**Their empirical Table 3** (360-item ACT-Math pool, 20-item test, ratio 18:1, 7,000 simulated CATs, 3PL,
Sympson–Hetter with r_max = .20):

| Condition | Mean exposure rate | Variance of exposure rates | Max exposure | Average between-test overlap | Proportion of pool never used |
| --- | --- | --- | --- | --- | --- |
| No content balancing, no exposure control | .0556 | .01376 | 1.00 | **30.3%** | **60.9%** |
| Content balancing only | .0556 | .01131 | .566 | 25.9% | 63.1% |
| Content balancing + exposure control | .0556 | .00229 | .208 | **9.7%** | **21.6%** |
| Random item selection | .0556 | 7.14 × 10⁻⁶ | .063 | 5.6% | 0% |

Two things to read off that table. First, with no control, **61% of a 360-item pool was never administered at
all** and a single item was administered to every examinee. Second, the mean exposure rate is identical in all
four rows; only the variance changes, and the variance is what drives overlap.

**Their Table 4, reproducing Chang (1998), contains the finding that most directly contradicts intuition.**
Holding test length at 30 and doubling the pool from 360 to 720 items with no exposure control:

> "doubling the item pool size from 360 to 720 (while keeping the fixed test length unchanged at 30) yielded a
> **negligible decrease in the average between-test overlap from 37% to 34%. Changing the pool size to fixed
> test length ratio, alone, did little to reduce the test overlap rate.**"

Their summary: "**Increasing the pool size to fixed test length ratio, alone, does not guarantee that the
average between-test overlap will be maintained within desired limits; the variance of the item exposure rates
must be controlled also.**"

---

## 6. Minimum item pool size

Four published ratios, from four different sources, all consistent with each other:

### 6.1 Stocking (1994): six to eight linear test forms

**Source.** Stocking, M. L. (1994). "Three Practical Issues for Modern Adaptive Testing Item Pools." ETS
Research Report RR-94-05. DOI
[10.1002/j.2333-8504.1994.tb01578.x](https://doi.org/10.1002/j.2333-8504.1994.tb01578.x). Free full text:
[ERIC ED385551](https://files.eric.ed.gov/fulltext/ED385551.pdf). **Full text read.**

**Method — and this matters.** This is *retrospective* analysis of five operational pools, not a prospective
derivation. "Retrospective results are analyzed for five operational pools." The context: weighted-deviations
item selection (Stocking & Swanson, 1993), 3PL, adaptive tests built to be as parallel as possible to an
existing linear form used as the scoring reference test. Adaptive test lengths "range from roughly 1/3 to 2/3
the length of the reference test."

**The conclusion, verbatim:**

> "these analyses indicate that **item pools of the size and quality of six to eight linear tests are adequate
> to support adaptive tests of roughly half the length of a parallel linear test.**"

> "in this context, both in terms of content and in terms of measurement properties, the data suggest that **a
> pool composed of six to eight typical linear forms will support adaptive testing where the (fixed) length of
> the adaptive test is roughly one-half that of the linear forms. This rule of thumb seems to hold across two
> different randomization methods, three different types of measures, and two different approaches to the
> specification of overlap.**"

**Read the ratio carefully.** "Six to eight linear forms" for an adaptive test half a linear form's length
implies a pool of roughly **12 to 16 times the adaptive test length**, not 6 to 8 times. The paper's own
statistical global factor was 6.6 relative to the *reference* test length. For set-based content Stocking
recommends more: "For tests of this nature, in which item selection is substantially restricted because of the
preponderance of set based items, it would be better to aim for an item pool that is the equivalent of **seven
or eight** linear test forms."

### 6.2 The overlap-derived floors

From Chen, Ankenmann & Spray (1999), derived algebraically and stated as minima:

> "the practical implication of this for CAT design is that **item pool size must be at least 6.7 times as
> large as the fixed test length if the average between-test overlap is not to exceed 15%**, as prescribed by
> Way (1998) for CATs used in college admissions decisions. **Limiting the test overlap rate to 10% would
> require a pool size at least 10 times as large as the fixed test length.**"

Their crucial qualifier: "**these ratios are deceiving, because they represent minimal prescriptions based on
an assumption of completely randomized item selection.** In practice, the psychometric qualities of items
feature strongly in CAT item selection via some form of an item information function… and under these
circumstances S²ᵣ > 0."

The realistic version, combining pool ratio with exposure-rate variance:

> "for pool sizes at least **10 times** as large as the fixed test length, an item exposure rate variance less
> than **.005** guarantees that the average between-test overlap will be under 15%. An average between-test
> overlap below 10% is guaranteed when the variance of the item exposure rates is less than **.002** with pool
> sizes at least **14 times** as large as the fixed test length (or less than roughly **.0014** with pool
> sizes at least **12 times** as large as the fixed test length)."

### 6.3 The "12 times" rule as it circulates today

Two independent recent papers state it as settled practice:

- Tian & Choi (2023), DOI [10.1177/01466216231165313](https://doi.org/10.1177/01466216231165313): "The pool
  size, 1000, was chosen based on **the rule of thumb that the pool size should be 12 times the CAT test
  length**."
- Lim, S., & Choi, J. (2023), "Item exposure and utilization control methods for optimal test assembly,"
  *Behaviormetrika*, DOI [10.1007/s41237-023-00214-1](https://doi.org/10.1007/s41237-023-00214-1): "The levels
  were chosen in consideration of **the guideline (Stocking 1994) that the item pool size should be at least 12
  times the desired test length** to be effective."

**Note the attribution problem.** Both attribute "12×" to Stocking (1994). Stocking (1994) does not use the
number 12; she says "six to eight linear tests" for an adaptive test half that length. The 12× figure is a
correct *derivation* from her statement, but it is not her wording.

### 6.4 The absolute-count figure

From Gierl & Lai (2013), citing Breithaupt, Ariel & Hare (2010): "a high-stakes **40-item** computer adaptive
test with two administrations per year would require, at minimum, a **2,000-item bank**." That is a **50:1**
ratio — far above every ratio in §6.1–6.3, because it is sized for continuous replenishment across
administrations rather than for a single pool's overlap properties. **Flag: second-hand; original not read.**

### 6.5 What the Standards say

AERA/APA/NCME (2014), Chapter 4 narrative:

> "When a pool of operational items is developed for a computerized adaptive test, **the specifications refer
> both to the item pool and to the rules or procedures by which an individualized set of items is selected for
> each test taker**… In most cases, **large numbers of items are needed** in constructing a computerized
> adaptive test to ensure that the set of items administered to each test taker meets all of the requirements
> of the test specifications."

No number. The Standards never state a pool-size minimum.

---

## 7. Linking and equating when a bank changes

### 7.1 The Angoff rule of thumb — 20 items or 20%, whichever is larger

**Source.** Angoff, W. H. (1971). "Scales, norms, and equivalent scores." In R. L. Thorndike (Ed.),
*Educational Measurement* (2nd ed., pp. 508–600). Washington, DC: American Council on Education. Reprinted as
Angoff, W. H. (1984). *Scales, Norms, and Equivalent Scores*. Princeton, NJ: Educational Testing Service.
**Flag: I did not read Angoff. The rule below is quoted from two independent secondary sources that both give
a page number.**

- Omar (2022), *British Journal of Education*, 10(13), 56–67
  ([PDF](https://eajournals.org/wp-content/uploads/Bootstrap-Equating-Errors.pdf)): "The anchor items sizes of
  16, 20, 24, were used **based on Angoff's suggestion (1984, p.107)**. According to Angoff (1984), the rule of
  thumb for the minimum number of anchor items of **20 anchor items or 20% of the total items in the test**."
- Shea, J. A., & Norcini, J. J. (1995). "Equating." Chapter 11 in J. C. Impara (Ed.), *Licensure Testing:
  Purposes, Procedures, and Practices*. Lincoln, NE: Buros Institute of Mental Measurements. Free full text:
  [digitalcommons.unl.edu/buroslicensure/16](https://digitalcommons.unl.edu/buroslicensure/16/). "**A rule of
  thumb for many years has been that the common-items link should be roughly 20% the length of the total test
  or 20 items, whichever is longer (Angoff, 1971/1984).**"

### 7.2 The Kolen & Brennan statement

**Source.** Kolen, M. J., & Brennan, R. L. (2014). *Test Equating, Scaling, and Linking: Methods and
Practices* (3rd ed.). New York: Springer. DOI
[10.1007/978-1-4939-0317-7](https://doi.org/10.1007/978-1-4939-0317-7). The same rule appears at p. 271 of the
2004 second edition.
**Flag: I did not read the book. The quotation below is reproduced identically by two independent secondary
sources, both citing p. 271.**

> "**a common item set should be at least 20% of the length of a total test containing 40 or more items,
> unless the test is very long, in which case 30 items might suffice**" (p. 271).

Two operational uses of the rule, both stating the citation:
- Puhan (2007), ETS RR-07-38, DOI
  [10.1002/j.2333-8504.2007.tb02076.x](https://doi.org/10.1002/j.2333-8504.2007.tb02076.x): "Following rules of
  thumb provided by Kolen and Brennan (2004, p. 271), **the common items in the NEAT design constituted at
  least 20% of the length of the total test. They were also chosen to represent the total test in content and
  difficulty.**"
- Born, Fink, Spoden & Frey (2019), *Frontiers in Psychology*, 10, 1277, DOI
  [10.3389/fpsyg.2019.01277](https://doi.org/10.3389/fpsyg.2019.01277): "Following the recommendation of Kolen
  and Brennan (2014) that the number of common items should be at least 20% of the test length, **the number of
  common items in the linking cluster was set to 15 items**" for a 60-item test. (15/60 = 25%.)

### 7.3 The "mini-test" requirement — the anchor must mirror the test, not just be long enough

Multiple sources converge, as catalogued by Sinharay, S., & Holland, P. (2006), "The Correlation Between the
Scores of a Test and an Anchor Test," ETS Research Report RR-06-04, *ETS Research Report Series*. Free full
text: [ERIC EJ1111404](https://files.eric.ed.gov/fulltext/EJ1111404.pdf):

> "It is a widely held belief that the anchor test should be a mini version of the total test. **Angoff (1968,
> p. 12) and Budescu (1985, p. 15) recommended an anchor test that is a parallel miniature of the operational
> forms.** More specifically, several experts recommended that an anchor test should be **proportionally
> representative or a mirror of the total test in content and statistical characteristics** (von Davier,
> Holland, & Thayer, 2004, p. 33; Dorans, Kubiak, & Melican, 1998, p. 3; Kolen & Brennan, 2004, p. 19;
> Petersen, Kolen, & Hoover, 1989, p. 246). Currently, most testing programs employ this type of anchor test
> (referred to as a minitest)."

**A dissenting empirical result from the same paper**, which is worth knowing before treating the minitest as
sacred: "we show that **the traditionally recommended minitest is not the optimum anchor test** so far as the
correlation between an anchor test and the total test is concerned. The anchor-test to total-test correlation
is shown to be consistently lower for the minitest than for an anchor test whose spread of item difficulties
is less than that of a total test."

### 7.4 Evidence that shorter anchors can work under IRT

From the Buros/UNL chapter cited in §7.1: "For conventional equating, lengths over 20 items seem not to have an
advantage if the examinee groups are similar in ability (Klein & Kolen, 1985; Norcini, 1990). For IRT, some
researchers have reported that **much shorter anchor tests (as few as two or five well-chosen items) work
well** (Raju, Bode, Larsen, & Steinhaus, 1986; Vale, 1986). However, other researchers working within IRT
suggest **15 to 20 items** are more appropriate (Hills, Subhiyah, & Hirsch, 1988; Wingersky, Cook, & Eignor,
1986). Unless there is a persuasive need for a very short anchor, in light of the equivocal results regarding
length, the 20% guideline still seems sensible."

Also, from Omar (2022) reading Wingersky & Lord (1984): "when the item parameters of both tests are estimated
concurrently, **as few as five or six carefully chosen items could perform as satisfactory anchors** in IRT
equating."

And Omar's own simulation result (80 total items, anchors of 16 / 20 / 24, N = 1,000, four Rasch equating
methods): "reasonably accurate IRT equating for the CINEG design can be achieved with an anchor size of 20 or
20% of the total items. However, **increasing anchor test sizes does not contribute further to lowering the
SEE and RMSE significantly, indicating the length of the anchor tests is not the most critical factor to
improve testing accuracy. More investigation can be focused on the quality of the anchor items.**"

### 7.5 What the Standards require

AERA/APA/NCME (2014):

**Standard 5.12:** "A clear rationale and supporting evidence should be provided for any claim that scale
scores earned on **alternate forms** of a test may be used interchangeably… For scores on alternate forms to be
used interchangeably, the alternate forms must be built to **common detailed content and statistical
specifications**."

**Standard 5.13:** "When claims of form-to-form score equivalence are based on equating procedures, detailed
technical information should be provided on the method by which equating functions were established and on the
accuracy of the equating functions… Technical information should include the design of the equating study, the
statistical methods used, the size and relevant characteristics of examinee samples used in equating studies,
and **the characteristics of any anchor tests or anchor items**. For tests for which equating is conducted
prior to operational use (i.e., pre-equating), **documentation of the item calibration process should be
provided and the adequacy of the equating functions should be evaluated following operational administration**."

**Standard 5.15:** "In equating studies that employ an anchor test design, the characteristics of the anchor
test and its similarity to the forms being equated should be presented… If anchor items are used in the
equating study, **the representativeness and psychometric characteristics of the anchor items should be
presented.**"

**Standard 5.19 — directly on the practice of rebuilding tests out of a shared bank:**

> "When tests are created by taking a subset of the items in an existing test or by rearranging items,
> **evidence should be provided that there are no distortions of scale scores, cut scores, or norms** for the
> different versions or for score linkings between them. Comment: … **It should not be assumed that
> performance data derived from the administration of items as part of the initial version can be used to
> compute scale scores, compute linked scores, construct conversion tables, approximate norms, or approximate
> cut scores for alternative intact tests. Caution is required in cases where context effects are likely,
> including speeded tests, long tests where fatigue may be a factor, adaptive tests, and tests developed from
> calibrated item pools.**"

**Standard 5.20:** "If test specifications are changed from one version of a test to a subsequent version, such
changes should be identified, and an indication should be given that converted scores for the two versions may
not be strictly equivalent… **When substantial changes in test specifications occur, scores should be reported
on a new scale**, or a clear statement should be provided to alert users that the scores are not directly
comparable with those on earlier versions of the test."

The Standards also acknowledge that adaptive scores are still comparable despite item-set differences: "With
some adaptive tests, it may happen that **two examinees rarely if ever receive the same set of items**…
Nevertheless, adaptive test scores can be reported on a common scale and function much like scores from a
single alternate form of a test that is not adaptive. … In many situations, item pools for adaptive tests are
updated by replacing some of the items in the pool with new items."

---

## 8. Versioning and auditability of assessment content

**Primary source for this whole section.** American Educational Research Association, American Psychological
Association, & National Council on Measurement in Education. (2014). *Standards for Educational and
Psychological Testing*. Washington, DC: AERA. ISBN 978-0-935302-35-6. **Open access since March 2021.** Full
PDF: [standards_2014edition.pdf](https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf).
Landing pages: [testingstandards.net](https://www.testingstandards.net/open-access-files.html),
[APA](https://www.apa.org/science/programs/testing/standards), [NCME](https://ncme.org/resources/books/testing-standards/).
ERIC record: [ED565876](https://eric.ed.gov/?id=ED565876). **Full text read; every quotation below was read
directly from the open-access PDF.**

### 8.1 The retention and reconstructibility standards

**Standard 6.14** (p. 119–120):

> "Organizations that maintain individually identifiable test score information should develop **a clear set of
> policy guidelines on the duration of retention of an individual's records** and on the availability and use
> over time of such data for research or other purposes. **The policy should be documented and available to the
> test taker.** Test users should maintain appropriate data security, which should include administrative,
> technical, and physical protections."

**Standard 6.15** (p. 120) — this is the closest thing in the Standards to an audit-trail requirement:

> "**When individual test data are retained, both the test protocol and any written report should also be
> preserved in some form.** Comment: **The protocol may be needed to respond to a possible challenge from a
> test taker or to facilitate interpretation at a subsequent time.** The protocol would ordinarily be
> accompanied by testing materials and test scores. **Retention of more detailed records of responses would
> depend on circumstances and should be covered in a retention policy.** Record keeping may be subject to legal
> and professional requirements."

**Standard 6.3** (p. 114–115) — on capturing deviations:

> "**Changes or disruptions to standardized test administration procedures or scoring should be documented and
> reported to the test user.** Comment: **Information about the nature of changes to standardized
> administration or scoring procedures should be maintained in secure data files so that research studies or
> case reviews based on test records can take it into account.**"

**Standard 6.13** (p. 119) — on correcting a score after the fact:

> "When a **material error** is found in test scores or other important information issued by a testing
> organization or other institution, this information and a corrected score report should be distributed as
> soon as practicable to all known recipients who might otherwise use the erroneous scores as a basis for
> decision making. The corrected report should be labeled as such. **What was done to correct the reports
> should be documented.** The reason for the corrected score report should be made clear to the recipients of
> the report. Comment: **A material error is one that could change the interpretation of the test score and
> make a difference in a significant way.**"

**Standard 6.9** (p. 118) — the scoring-quality standard:

> "Those responsible for test scoring should establish and document quality control processes and criteria.
> Adequate training should be provided. **The quality of scoring should be monitored and documented. Any
> systematic source of scoring errors should be documented and corrected.**"

**Standard 6.8** (p. 118) — includes an explicit periodic-review clause for reused items:

> "Those responsible for test scoring should establish scoring protocols… **When scoring of complex responses
> is done by computer, the accuracy of the algorithm and processes should be documented.** Comment: … **When
> tests or items are used over a period of time, scoring materials should be reviewed periodically.**"

**Standard 6.11** (p. 119) — on machine-produced interpretations:

> "When automatically generated interpretations of test response protocols or test performance are reported,
> **the sources, rationale, and empirical basis for these interpretations should be available, and their
> limitations should be described.**"

### 8.2 The development-side documentation standards

**Standard 4.7** (p. 87):

> "**The procedures used to develop, review, and try out items and to select items from the item pool should be
> documented.** Comment: **The qualifications of individuals developing and reviewing items and the processes
> used to train and guide them in these activities are important aspects of test development documentation.**"

**Standard 7.4** (p. 125–126):

> "Test documentation should summarize test development procedures, including descriptions and the results of
> the statistical analyses that were used in the development of the test, evidence of the reliability/precision
> of scores and the validity of their recommended interpretations, and the methods for establishing performance
> cut scores. Comment: When applicable, test documents should include **descriptions of the procedures used to
> develop items and create the item pool**, to create tests or forms of tests, to establish scales for reported
> scores, and to set standards and rules for cut scores or combining scores."

**Standard 7.5** (p. 126):

> "Test documents should record the relevant characteristics of the individuals or groups of individuals who
> participated in data collection efforts associated with test development or validation… **the nature of
> judgments made by subject matter experts**… **the instructions that were provided to participants in data
> collection efforts for their specific tasks; and the conditions under which the test data were collected**…
> Test developers should describe the relevant characteristics of those who participated in various steps of
> the test development process **and what tasks each person or group performed**."

**Standard 4.23** (item weighting):

> "When a test score is derived from the differential weighting of items or subscores, the test developer
> should document the rationale and process used to develop, review, and assign item weights… **The rationale
> for weighting the different content areas should also be documented and periodically reviewed.**"

### 8.3 The honest gap

**I could not find a published standard that literally requires a testing program to be able to reconstruct,
for any individual candidate, exactly which form and which item instances that candidate saw.** The closest
provisions are Standard 6.15 ("both the test protocol and any written report should also be preserved in some
form") and Standard 6.3 (deviations "maintained in secure data files so that research studies or **case
reviews based on test records** can take it into account"). Standard 6.15's comment explicitly leaves
response-level retention to local policy: "Retention of more detailed records of responses would depend on
circumstances and should be covered in a retention policy."

So the Standards mandate (a) that a retention policy exist, (b) that it be documented and available to the test
taker, and (c) that the protocol be preserved — but they do not specify a granularity, a duration, or an
item-level audit trail. Anyone claiming "the Standards require an item-level audit trail" is over-reading them.

---

## 9. Quality control workflow for item review

### 9.1 The named stages, from the Standards' own narrative

AERA/APA/NCME (2014), Chapter 4, "Item Development and Review" (p. 81):

> "The test developer usually assembles an item pool that **consists of more questions or tasks than are needed
> to populate the test form or forms to be built**… **The quality of the items is usually ascertained through
> item review procedures and item tryouts, often referred to as pretesting. Items are reviewed for content
> quality, clarity, and construct-irrelevant aspects of content that influence test takers' responses. In most
> cases, sound practice dictates that items be reviewed for sensitivity and potential offensiveness** that
> could introduce construct-irrelevant variance for individuals or groups of test takers."

Chapter 4, "Assembling and Evaluating Test Forms" (p. 81–82) — the stage most relevant to a shared bank:

> "The next step in test development is to assemble items into one or more test forms or to identify one or
> more pools of items for an adaptive or multistage test. **The test developer is responsible for documenting
> that the items selected for the test meet the requirements of the test specifications.** In particular, the
> set of items selected for a new test form or an item pool for an adaptive test must meet both content and
> psychometric specifications. In addition, **editorial and content reviews are commonly conducted to replace
> items that are too similar to other items or that may provide clues to the answers to other items in the same
> test form or item pool.**"

### 9.2 The mandated review stages, as standards

**Standard 4.8** (p. 87) — the review stage itself:

> "**The test review process should include empirical analyses and/or the use of expert judges to review items
> and scoring criteria. When expert judges are used, their qualifications, relevant experiences, and
> demographic characteristics should be documented, along with the instructions and training in the item review
> process that the judges receive.** Comment: When sample size permits, **empirical analyses are needed to
> check the psychometric properties of test items and also to check whether test items function similarly for
> different groups.** Expert judges may be asked to check item scoring and to identify material likely to be
> **inappropriate, confusing, or offensive** for groups in the test-taking population."

**Standard 4.9** (p. 87–88) — the tryout / field-test stage:

> "When item or test form tryouts are conducted, **the procedures used to select the sample(s) of test takers as
> well as the resulting characteristics of the sample(s) should be documented. The sample(s) should be as
> representative as possible of the population(s) for which the test is intended.** Comment: Conditions that may
> differentially affect performance on the test items by the tryout sample(s) as compared with the intended
> population(s) should be documented when appropriate. For example, **test takers may be less motivated when
> they know their scores will not have an impact on them.**"

**Standard 4.10** (p. 88) — the statistical review stage. Full text quoted in §3.6.

**Standard 4.13:** "When credible evidence indicates that irrelevant variance could affect scores from the
test, then to the extent feasible, the test developer should investigate sources of irrelevant variance. Where
possible, **such sources of irrelevant variance should be removed or reduced by the test developer.**"

### 9.3 Downing's twelve steps

**Source.** Downing, S. M. (2006). "Twelve Steps for Effective Test Development." In S. M. Downing & T. M.
Haladyna (Eds.), *Handbook of Test Development* (pp. 3–25). Mahwah, NJ: Lawrence Erlbaum.
[Full-text PDF of the handbook](https://fatihegitim.files.wordpress.com/2014/03/hndb-t-devt.pdf) (Chapter 1
read directly).

The twelve steps, from Table 1.1 and the chapter headings: **(1)** Overall plan, **(2)** Content definition,
**(3)** Test specifications, **(4)** Item development, **(5)** Test design and assembly, **(6)** Test
production, **(7)** Test administration, **(8)** Scoring test responses, **(9)** Passing scores /
standard setting, **(10)** Reporting test results, **(11)** Item banking, **(12)** Test technical report.

Downing's own qualifications on the model, both of which matter for a bank that is continuously edited:

> "This particular organization of tasks and activities into twelve discrete steps is **somewhat arbitrary**;
> these tasks could be organized differently such that there were fewer or more discrete steps."

> "These steps are listed as a linear model or as a sequential timeline, from a discrete beginning to a final
> end point; however, **in practice, many of these activities may occur simultaneously or the order of some of
> these steps may be modified**… **Item banking issues are shown as Step 11, but for ongoing testing programs,
> many item banking issues occur much earlier in the test development sequence.**"

His framing of why the sequence exists at all: "**Each of these steps can be thought of as one major organizer
of validity evidence to be documented in a technical report** which summarizes all the important activities and
results of the test."

Related chapters in the same handbook, listed here because they name the review functions explicitly: Ch. 15
"Item Editing and Editorial Review" (Baranowski); Ch. 16 "Fairness Reviews in Assessment" (Zieky); Ch. 11
"Computerized Item Banking" (Vale); Ch. 19 on item analysis (Livingston). **Flag: I read only Chapter 1 of this
handbook.**

Zieky's fairness-review procedure, from his chapter "Fairness in Test Design and Development" (DOI
[10.4324/9781315774527-3](https://doi.org/10.4324/9781315774527-3)), stated as a set of process rules:

> "the reviews [should be] conducted by a third party… **have no vested interest in the survival of the item**…
> The reviewer's [obligation is] to challenge an [item and to state the reason]. **It is not acceptable for the
> reviewer simply to say an item is unfair**… The owner of the item may agree or disagree with the fairness
> reviewer. If the owner and reviewer agree, the owner revises or deletes the item… **If they disagree, the
> owner and reviewer discuss their differences. If agreement is not reached, some resolution mechanism is
> invoked.** For example, a small group of experienced fairness reviewers could evaluate the item and reach a
> decision, or a very experienced fairness reviewer could be appointed as the final arbiter."

He extends the same logic to whole forms: "**tests should be reviewed for fairness even though test assemblers
strive** [to build fair forms]. In addition to checking each item, test fairness reviewers try to ensure that
**the test form as a whole does not reinforce stereotypes and that the test form represents diversity
appropriately.**"

### 9.4 An operational example of the full pipeline, including post-field-test data review

**Source.** Smarter Balanced Assessment Consortium (2023). *2021-22 Summative Technical Report*, Chapter 4
(Test Design).
[technicalreports.smarterbalanced.org](https://technicalreports.smarterbalanced.org/2021-22_summative-report/_book/test-design.html).
**Flag: a consortium technical report, not peer-reviewed. Full text read.**

> "During the committee reviews, educators specifically compare the items against the quality criteria for
> **accessibility** and for **bias and sensitivity**. The reviewers identify and resolve or reject any item,
> stimulus, or performance task that does not pass the criteria… **Items flagged for accessibility,
> bias/sensitivity, and/or content concerns are either revised to address the issues identified by the panelists
> or removed from the item pool.**"

> "**After items are field tested, the Consortium carries out statistical analyses of field test data** to
> determine the statistical quality of the items. On the basis of these results, some field-tested items are put
> into operational use, some are rejected from operational use, and others go through a process called **data
> review**. In a data review, items flagged based on statistical criteria are reviewed by educators in
> collaboration with Smarter Balanced staff, for possible content flaws, bias, and other features that might
> explain the statistical qualities. **Items that go through data review may be subsequently revised and
> field-tested again in a future year, rejected, or accepted for operational use.**"

North Carolina DPI documents the same *ordering* explicitly — bias review happens **after** field testing, not
before ([NC DPI Appendix 4-B](https://www.dpi.nc.gov/appendix-4-b-fairness-and-dif-review-process/download?attachment=)):
"**bias reviews occur after items have been field tested and have data that supports further inspection of the
items for bias or insensitivity.** This is processed in steps within the online test development system (TDS)
that are titled DIF Review." Their stated rationale: "While the presence or absence of true bias is a
qualitative decision, based on the content of the item and the curriculum context within which it appears,
**DIF can be used to quantitatively identify items that should be subjected to further scrutiny.**"

### 9.5 The iterative loop that AIG specifically requires

Graf et al. (2005), from the GRE item-modelling program, describe a review cycle that has no analogue in
one-item-at-a-time development, because the unit of revision is the *model*, not the item:

> "Once the model has been developed, one or more test developers review it to ensure that it is both correct
> and consistent with the goals of the construct analysis, **reviewing the model itself as well as samples of
> the instances it generates**. At this point, the developer edits the model in accordance with reviewers'
> suggestions; additional cycles of reviewing and editing may be warranted. When a model is complete, a sample
> of its instances is automatically generated for use in an unscored section. **Content specialists review each
> instance for accuracy and clarity.** Minor formatting changes are often made directly to the instances;
> **more substantial changes may require that the model is changed and that a new sample of instances is
> generated.**"

> "Cognitive scientists and test developers then study the statistics of all the instances of a model to see if
> the instances preserve the difficulty levels of the source items. If the difficulty varies, we try to
> determine which factors are causing the variability. After the cognitive analysis, **the models are often
> revised or modified and new instances are generated**."

Their team-size observation: "In our experience, **a team of three to four people is the ideal size for the
efficient creation and review of the models.**"

Their recommended unit of management, which is the operative design claim: "**It may be more appropriate to
think of the item model family, rather than the item model, as the essential unit of development.**"

Their stated limits on the whole approach: "One obvious limitation is that **it is time-consuming**. Another
limitation is that this approach is a model-fitting exercise; **we are trying to make a generalization about a
large set of instances (all the instances in a model) based on a relatively small set of instances**… Another
potential risk with this approach is that **in the process of revising models, it is possible to introduce
additional variables that may have unforeseen effects on performance**."

And the unresolved sampling question, stated as an open problem: "**It is not clear how many instances should be
sampled, or how to select a representative sample. It also is not clear that the sample should be the same size
for every model.**"

---

## Could not verify — explicit list

1. **Glas & van der Linden (2003) full text.** Paywalled at Sage. Citation and abstract verified; no numbers
   extracted or attributed. The within-family variance components from their LSAT simulation are therefore
   absent from this document.
2. **Sinharay & Johnson (2008) full text.** Paywalled at Taylor & Francis. The ETS Research Report version
   (RR-05-06, DOI 10.1002/j.2333-8504.2005.tb01983.x) exists and the DOI resolves, but the Wiley full-text
   fetch timed out repeatedly and I never read it. **The widely repeated claim that they found "surprising
   variation within some item siblings" is a secondary source's characterization, not text I read.**
3. **Bock, Muraki & Pfeiffenberger (1988) full text.** Paywalled. Abstract verified. **No drift magnitude — no
   logits per year, no effect size — was extracted, because the abstract gives none.** If you need "how fast
   do items drift," this document does not answer it from the primary source. The only quantitative anchor I
   have is Han & Guo's operational statement that ±0.50 in b is treated as the tolerable/undetectable band
   (§4.4), and that is a GMAC report, not peer-reviewed.
4. **DeMars (2004) full text.** Paywalled. Abstract verified; detection-power figures beyond "nearly always
   detecting drift" were not obtained.
5. **Donoghue & Isham (1998), Stocking & Lewis (1995, 1998), Wells/Subkoviak/Serlin (2002), Embretson (1999),
   Way (1998).** All paywalled. Citations verified against Crossref; abstracts read where available; no
   numbers attributed beyond what a citing source states explicitly.
6. **Sympson & Hetter (1985).** Unpublished conference proceedings (27th Annual Meeting of the Military Testing
   Association, pp. 973–977). Not available online, no DOI. Everything in §5.2 is Stocking's (1993) ETS account
   of the method, which is contemporaneous and detailed but is not the original.
7. **Bejar (2002) book chapter.** Not read. The isomorph/variant definitions in §1.4 are Graf et al.'s (2005)
   and Sommer & Arendasy's (2025) characterizations of Bejar.
8. **Angoff (1971/1984) and Kolen & Brennan (2014, p. 271).** Neither read directly. The "20 items or 20%"
   rule and the "20% of a test containing 40 or more items, unless very long, in which case 30 items might
   suffice" quotation each come from two independent secondary sources that agree verbatim and cite a page
   number. I would want the primary before putting the quotation marks in a client-facing document.
9. **Breithaupt, Ariel & Hare (2010) "2,000-item bank" and Rudner (2010) "$1,500–$2,500 per item."** Both book
   chapters in van der Linden & Glas, *Elements of Adaptive Testing*; neither read. Both are reported at second
   hand by Gierl & Lai (2013), and the Rudner figure is independently repeated by Westacott et al. (2023).
10. **Meisner, Luecht & Reckase (1993), ACT Research Report 93-9.** Not obtained. Their finding that "many
    algorithms generated instances with similar statistics, but that a few did not" is quoted from Graf et al.
    (2005).
11. **Lord (1968) and the ~30 sample-size studies catalogued in §3.4.** All cited at second hand from Şahin &
    Anıl's (2017) literature review. None read.
12. **Whether any published standard requires an item-level audit trail.** Not found. §8.3. The Standards
    require a documented retention policy (6.14) and preservation of "the test protocol" (6.15), and explicitly
    leave response-level retention to local policy. Do not claim the Standards mandate reconstructibility of
    which specific item instances a candidate saw — they do not.
13. **Any published guidance on managing a *multi-author, continuously edited* shared item bank.** Not found.
    Every source here assumes a single accountable test-development organization with trained item writers,
    formal review committees, and a psychometrics function. I found no peer-reviewed treatment of concurrent
    editing, contributor permissions, merge conflicts, or item-level version control in an assessment bank.
14. **Two internal inconsistencies I am flagging rather than silently resolving.**
    - **Westacott et al. (2023):** the abstract reports paper facility range 0.55–0.61 and "twenty item
      models… facility difference > 0.15 and 10 item models… standard setting > 0.1"; the Results and
      Discussion report 0.55–0.65, 21/46 and 16/46. Use the Results figures.
    - **Gierl & Lai (2013):** the body says the 1-layer surgery model generated 256 items; the self-test key
      computes 16,384 for the same model. Both appear in the published article.
15. **A citation error in a source I otherwise rely on.** Chen, Ankenmann & Spray (1999) cite Way (1998) as
    "*Educational Measurement: Issues and Practice*, 27, 17-27." Crossref confirms the correct volume is
    **17(4)**, pages 17–27. Cite Way as 17(4).
16. **Bejar et al. (2002) vs. Tian & Choi (2023) on whether ignoring within-family variance produces bias.**
    Bejar et al.: "there was no bias, but precision of measurement was eroded." Tian & Choi: standard error
    barely moves, but "scores are biased towards the center, and bias was not compensated by test length."
    These are directly contradictory. Both are simulations under different models. **I did not reconcile them
    and neither should be quoted alone.**
