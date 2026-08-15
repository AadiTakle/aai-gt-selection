# DOK 1 — How Few Items Can a Screener Use and Still Make a Defensible Advance/Do-Not-Advance Decision?

Fact extraction only. Every number below was read out of the source named beside it. Exact quotes are in
quotation marks. Anything I could not verify is flagged inline and listed again in the final section.

Every DOI in this document was resolved against the Crossref registry (or DataCite, for the *Practical
Assessment, Research & Evaluation* items, which are DataCite-registered) and returned a matching record with
matching author, year, title and journal. Every non-DOI URL was checked for a live response. Sage, Wiley, the
Radboud repository (`repository.ubn.ru.nl`) and Arkansas ScholarWorks return HTTP 403 to command-line
requests; that is bot-blocking, not a dead link, and the content of those pages was retrieved successfully by
other means. One URL I originally used is genuinely dead and has been replaced — see §5.1.

**Year convention.** Three Sage articles carry a Crossref date one year earlier than their print issue, because
Crossref records the online-first date: Thompson (issue 2009, Crossref 2008), Magis, Béland & Raîche (issue
2011, Crossref 2010) and Ippel & Magis (issue 2020, Crossref 2019). I cite the print-issue year and the
volume/issue/pages, which are unambiguous.

**Scope note.** The design question is a ~15-minute public screener whose output is advance / do-not-advance
against a bar somewhere near the 95th percentile. Almost every source below is set in licensure, medical
education, personnel selection, or adult online samples, uses a cut score near the *middle* of the ability
distribution, and studies adults. Where that gap matters I say so. **No source I found studies a short
adaptive classification test, administered to children, at a 95th-percentile cut.** That is the single
biggest evidentiary hole and it recurs in every section.

---

## 1. Computerized adaptive testing efficiency — the "50% fewer items" claim

### 1.1 The primary source with the measured figure: Weiss (1982)

**Source.** Weiss, D. J. (1982). "Improving Measurement Quality and Efficiency with Adaptive Testing."
*Applied Psychological Measurement*, 6(4), 473–492. DOI
[10.1177/014662168200600408](https://doi.org/10.1177/014662168200600408).

**The exact sentence that the 50% claim comes from,** from the abstract:

> "Improvements in test fidelity observed in simulation studies are supported by live-testing data, which
> showed **adaptive tests requiring half the number of items as that of conventional tests to achieve equal
> levels of reliability, and almost one-third the number to achieve equal levels of validity.**"

Two further sentences from the same abstract that bear directly on a classification-only design:

> "Adaptive tests designed for dichotomous classification also represent improvements over conventional tests
> designed for the same purpose. Simulation studies show reductions in test length and improvements in
> classification accuracy for adaptive vs. conventional tests; live-testing studies in which adaptive tests
> were compared with 'optimal' conventional tests support these findings."

**Flag: I read the abstract in full from two independent sources (the Sage record and the University of
Minnesota Conservancy record, which reproduce it verbatim and identically). I could not obtain the full text
of the 1982 article,** so I cannot report which live-testing studies produced the one-half and one-third
figures, what item pools they used, or what the absolute test lengths were. The abstract is the extent of
what I verified.

### 1.2 The citation everyone actually uses: Weiss & Kingsbury (1984)

**Source.** Weiss, D. J., & Kingsbury, G. G. (1984). "Application of Computerized Adaptive Testing to
Educational Problems." *Journal of Educational Measurement*, 21(4), 361–375. DOI
[10.1111/j.1745-3984.1984.tb01040.x](https://doi.org/10.1111/j.1745-3984.1984.tb01040.x).

**Flag: paywalled. I verified the citation and the full abstract only, and read no page of the body text.**
The abstract contains no percentage. Its only efficiency statement is qualitative:

> "For the adaptive mastery testing procedure, evidence from a series of studies comparing conventional and
> adaptive testing procedures is presented showing that the adaptive procedure results in **more accurate
> mastery classifications than do conventional mastery tests, while using fewer test questions.**"

**This matters, because Weiss & Kingsbury (1984) is the paper the "half as many items" rule of thumb is
routinely attributed to.** The clearest verifiable example:

- Thompson, N. A., & Weiss, D. A. (2011). "A Framework for the Development of Computerized Adaptive Tests."
  *Practical Assessment, Research, and Evaluation*, 16(1): 1. DOI
  [10.7275/wqzt-9427](https://doi.org/10.7275/wqzt-9427). Free full text:
  [PARE](https://openpublishing.library.umass.edu/pare/article/id/1444/). p. 3: "An executive or professor
  might hear that **CAT typically uses only half as many items as a conventional test (Weiss & Kingsbury,
  1984)** or even less, and simply make a decision that the testing program will move to CAT. This can be
  quite dangerous." **Note: PARE and DataCite both record this paper's second author as "David A. Weiss,"
  whereas the 1982 and 1984 papers are by David J. Weiss. I did not establish whether these are the same
  person or whether one record carries a typo.**

**Flag: a web search surfaced a second, stronger-worded attribution — "reducing test length and examinee seat
time by up to 50% on average (Weiss & Kingsbury, 1984; Stocking, Smith, & Swanson, 2000)" — indexed to an
Association of Test Publishers newsletter issue
([PDF](https://www.testpublishers.org/assets/documents/Issue%205%202008.pdf)). When I retrieved that PDF the
extracted text was a single Thompson article, "A Proposed Framework of Test Administration Methods," which
does not contain that sentence. I could not confirm the quotation and am not treating it as a source.**

**Finding to carry forward: the 50% figure is real and traceable, but it traces to Weiss (1982), not to
Weiss & Kingsbury (1984), and it is a reliability-equivalence figure from unnamed live-testing studies.** The
paper it is usually cited to states no number in its abstract, and I could not check its body.

### 1.3 The underlying measured reductions, in a source I could read in full: Kingsbury & Weiss (1979)

This is the study Weiss & Kingsbury (1984) cite for adaptive mastery testing, and it is free.

**Source.** Kingsbury, G. G., & Weiss, D. J. (1979). *An Adaptive Testing Strategy for Mastery Decisions*
(Research Report 79-5). Minneapolis: University of Minnesota, Department of Psychology, Psychometric Methods
Program. Sponsored by the Office of Naval Research, contract N00014-76-C-0627. Free full text: ERIC
[ED209336](https://files.eric.ed.gov/fulltext/ED209336.pdf). **Flag: this is a technical report, not a
peer-reviewed journal article.**

**Method and sample.** Real-data simulation. Items from two conventionally administered mastery tests given
in a military training environment were calibrated with the unidimensional three-parameter logistic model.
Test 11 was 25 items; Test 31 was 38 items. Item selection by maximum-information search and selection
(MISS). Termination when a 95% Bayesian confidence interval around the achievement estimate no longer
contained the mastery level. **A floor of three items was imposed** "to avoid anomalous results that might
occur from making mastery decisions based on a small number of item responses." Three mastery levels were
tested: proportion-correct P = .7, .8, .9.

**Headline, verbatim:**

> "The AMT procedure reduced the average test length **30% to 81%** over all circumstances examined (with
> **modal test length reductions of up to 92%**), while reaching the same decision as the conventional
> procedure for **96%** of the trainees."

**Measured mean test lengths, total group:**

| Test | Conventional | Mastery level | Adaptive mean | Reduction |
| --- | --- | --- | --- | --- |
| Test 11 | 25 items | P = .8 | 17.4 items | 30.4% |
| Test 11 | 25 items | P = .7 | 12.2 items | 48.8% |
| Test 31 | 38 items | P = .8 | 23.4 items | 38.4% |
| Test 31 | 38 items | P = .9 | 14.7 items | 61.3% |

**The high-confidence subgroup — where the very short tests live.** For the 50%–77% of trainees for whom the
confidence interval cleared the mastery level before the pool was exhausted, "AMT mean test lengths were 60%
to 81% shorter than the conventional tests across all mastery levels examined." Modal test length for Test 11
in this subgroup "was 3 items (see Appendix Table B-2), or only 12% of the length of the conventional test
(an 88% reduction)." Test 31 modal lengths in this subgroup were 4, 5 and 3 items at P = .7, .8 and .9.

**The finding in this report that matters most for a high cut score, and it cuts against the design.** The
one subgroup that got no savings at all was the group *passing* at the *highest* bar:

> "As the mastery level became higher, for both Test 11 and Test 31 there was **a trend for greater numbers of
> items to be administered before a decision of mastery could be made.** This resulted from the fact that the
> higher mastery levels fell above the steepest portion of the TCCs... until for Test 31 at the P=.9 mastery
> level, **all those who were declared masters took all of the items in the item pool before the mastery
> decision was made.**"

And from the summary: "The only subgroup for which no test length reduction was observed for the AMT strategy
was the group passing Test 31 at the highest criterion level (P=.90 correct)."

The mirror image also holds, and it favours the design: for trainees declared *nonmasters* on Test 31, "the
maximum reduction in average test length was 27.1 items, or 71.3% of the conventional test length, at the
P=.9 mastery level. **As the criterion level increased, the number of items needed by the AMT procedure to
make the nonmastery decision steadily decreased.**"

**Stated plainly: at a high bar, ruling a candidate out is cheap and confirming them is expensive.** That is
the reverse of the asymmetry a recommend-generously screener would want.

---

## 2. Classification-oriented adaptive testing (CCT) — classification versus estimation

This is the comparison the design turns on, so I report everything I could verify with numbers.

### 2.1 Spray & Reckase (1996)

**Source.** Spray, J. A., & Reckase, M. D. (1996). "Comparison of SPRT and Sequential Bayes Procedures for
Classifying Examinees Into Two Categories Using a Computerized Test." *Journal of Educational and Behavioral
Statistics*, 21(4), 405–414. DOI
[10.3102/10769986021004405](https://doi.org/10.3102/10769986021004405). ERIC record:
[EJ542049](https://eric.ed.gov/?id=EJ542049).

**Flag: paywalled. Abstract and ERIC record verified; I read no body text and extracted no numbers.** The
abstract's finding is directional only:

> "The purpose of the research reported in this article was to compare two such procedures, one based on the
> sequential probability ratio test and the other on sequential Bayes methodology, to determine which required
> fewer items for classification when the procedures were matched on classification error rates. The results
> showed that **under the conditions studied, the SPRT procedure required fewer test items than the sequential
> Bayes procedure to achieve the same level of classification accuracy.**"

**This paper is frequently cited for CCT efficiency. It contains no verifiable-to-me item count.** Its
contribution here is the framing sentence, also from the abstract: "Many testing applications focus on
classifying examinees into one of two categories (e.g., pass/fail) rather than on obtaining an accurate
estimate of level of ability."

### 2.2 Eggen (1999) — measured mean test lengths, full text obtained

**Source.** Eggen, T. J. H. M. (1999). "Item Selection in Adaptive Testing with the Sequential Probability
Ratio Test." *Applied Psychological Measurement*, 23(3), 249–261. DOI
[10.1177/01466219922031365](https://doi.org/10.1177/01466219922031365).

**Free full text of the pre-publication version:** Eggen, T. J. H. M. (1998), Cito Measurement and Research
Department Report 98-1,
[PDF](https://cito.nl/media/j5tczwrk/1998-item-selection-in-adaptive-testing-with-the-sequential-probability-ratio-test.pdf).
**Flag: all numbers below are read from the Cito report, whose cover states "This manuscript has been
submitted for publication." Text, tables and abstract match the published APM article's abstract, but I could
not read the published version to confirm the tables are identical.**

**Method and sample.** Monte Carlo simulation, N = 5,000 simulees per condition. Operational item bank: 250
mathematics items used in Dutch adult education for course placement, calibrated with the 2-PL model. Ability
distribution N(.294, .522). Three easy starting items. Two-category problem: cut point θ₀ = .1, maximum test
length k_max = 40.

**Table 1 — mean number of required items (k) and percentage of correct decisions, indifference zone
δ = .15:**

| Error rate | F1 (max Fisher info at current estimate) | F2 (max Fisher info at cut point) | K1a | K1b | K1c |
| --- | --- | --- | --- | --- | --- |
| α = β = .05 | 16.0 / 95.6% | 16.3 / 94.7% | 16.1 / 95.4% | 16.3 / 94.6% | 15.9 / 95.5% |
| α = β = .075 | 14.9 / 95.0% | 14.0 / 95.2% | 13.9 / 94.8% | 13.9 / 95.2% | 13.9 / 95.6% |
| α = β = .10 | 13.2 / 94.9% | 12.7 / 94.8% | 13.2 / 94.8% | 12.7 / 95.3% | 12.9 / 94.8% |

Eggen's own reading: "Most notable is that there are almost no differences in Table 1. For the three error
rates and all five item selection methods, the percentage of correct decisions are about 95%. A consistent
difference between these error rates over selection methods can be seen in the mean number of required items:
**the lower the rates, the more items are needed.**"

**Three-category problem** (cut points θ₁ = −.13, θ₂ = .33, δ = .13, k_max = 25): mean required items ranged
from 14.2 to 21.8 depending on selection method and error rate, with 87.0% to 90.1% correct decisions.

**On the indifference zone, which is the single biggest lever on test length:** "if the indifference interval
2δ = θ₂ − θ₁ increases, the width of the critical interval gets smaller, which indicates that **shorter tests
can be used to make a decision.**" And: "the mean number of items required decreases as the indifference zone
increases for all three selection procedures."

**Numbers to carry forward: a two-category classification at ~95% accuracy took 12.7 to 16.3 items on average
under every method tested.** That is the closest thing in this literature to a directly usable figure for a
15-minute screener — with the caveats that this is a simulation, on adults, with a cut point near the
population mean.

### 2.3 Eggen & Straetmans (2000) — a real placement test replaced by a CAT

**Source.** Eggen, T. J. H. M., & Straetmans, G. J. J. M. (2000). "Computerized Adaptive Testing for
Classifying Examinees into Three Categories." *Educational and Psychological Measurement*, 60(5), 713–734.
DOI [10.1177/00131640021970862](https://doi.org/10.1177/00131640021970862).

**Flag: paywalled. Abstract verified; body not read.** From the abstract:

> "The results of the study are that **a reduction of at least 22% in the mean number of items can be expected
> in a computerized adaptive test (CAT) compared to an existing paper-and-pencil placement test.** Furthermore,
> statistical testing is a promising alternative to statistical estimation."

**The underlying figures, from a secondary Cito source.** Cito Measurement and Research Department report
(2001), "Overexposure and underexposure of items in computerized adaptive testing,"
[PDF](https://cito.nl/media/d4ljwg3x/2001-overexposure-and-underexposure-of-items-in-computerized-adaptive-testing.pdf),
Table 1, citing Eggen & Straetmans (2000):

| Method | Average number of items | % correct decisions |
| --- | --- | --- |
| Paper-and-pencil | 25 | 87.0 |
| CAT (maximum information) | 14.2 | 88.3 |
| CAT (random selection) | 20.2 | 85.2 |

**Flag: this table is from a Cito research report, not from the peer-reviewed EPM article, and it is not
peer reviewed. The peer-reviewed number is "at least 22%."** The report's numbers imply a 43% reduction (25 →
14.2 items) with accuracy slightly *higher* than the paper test. I would want the primary before quoting the
14.2.

### 2.4 Thompson (2011) — the cleanest head-to-head of variable-length versus fixed-length

**Source.** Thompson, N. A. (2011). "Termination Criteria for Computerized Classification Testing."
*Practical Assessment, Research, and Evaluation*, 16(1): 4. DOI
[10.7275/wq8m-zk25](https://doi.org/10.7275/wq8m-zk25). Free full text:
[PARE](https://openpublishing.library.umass.edu/pare/article/id/1450/). **Note a citation inconsistency: the
PDF running head reads "Volume 16, Number 4, February 2011" while the journal's own "How to Cite" string reads
"16(1): 4." I use the journal's string.**

**Method and sample.** Monte Carlo, 10,000 simulees per condition drawn from N(0,1). Bank of 500 items, 3PL.
Cut score θ = −0.5, corresponding to a pass rate of approximately 69%. Variable-length tests constrained to a
minimum of 20 and a maximum of 200 items. Fixed forms built by taking the most informative items at the cut
score, i.e. the best possible fixed forms.

**Table 2 — average test length (ATL) and percent correctly classified (PCC):**

| Test design | ATL | PCC | Type I | Type II |
| --- | --- | --- | --- | --- |
| 200-item fixed, number-correct | 200.00 | 96.10 | 1.81 | 2.09 |
| 200-item fixed, IRT | 200.00 | 96.19 | 2.07 | 1.74 |
| 100-item fixed, number-correct | 100.00 | 95.19 | 2.56 | 2.25 |
| 100-item fixed, IRT | 100.00 | 95.13 | 2.62 | 2.25 |
| **50-item fixed, number-correct** | **50.00** | **93.62** | 3.60 | 2.78 |
| **50-item fixed, IRT** | **50.00** | **93.46** | 3.24 | 3.30 |
| Ability confidence intervals, theoretical SEM | 51.65 | 95.73 | 2.57 | 1.70 |
| Ability confidence intervals, observed SEM | 54.61 | 95.78 | 2.51 | 1.71 |
| **SPRT, δ = 0.3** | **39.30** | **95.74** | 1.85 | 2.41 |
| **GLR, δ = 0.3** | **37.62** | **95.73** | 2.03 | 2.24 |
| SPRT, δ = 0.2 | 55.77 | 96.21 | 1.81 | 1.98 |
| GLR, δ = 0.2 | 48.41 | 96.06 | 2.01 | 1.93 |

Author's summary: "the variable-length methods produced short tests, with ATL ranging from 37.62 to 55.77,
while maintaining the level of accuracy produced by the longer fixed form tests that delivered two to four
times as many items... **The 50-item fixed test entailed approximately as many items as the variable-length
methods, but with notably decreased accuracy.**" And: "While 100-item fixed-form tests produced approximately
95% accuracy, the SPRT and GLR could do so with less than 40 items on average."

**The warning in this paper is as important as the efficiency result.** Table 4 (δ = 0.2):

| Termination | Nominal accuracy | ATL | Observed PCC |
| --- | --- | --- | --- |
| GLR | 99 | 67.90 | 96.02 |
| GLR | 95 | 53.61 | 95.32 |
| SPRT | 99 | 85.55 | 95.68 |
| SPRT | 95 | 62.62 | 95.65 |

> "for the 1% condition, observed accuracy was always lower than the nominal accuracy. In fact, **the highest
> observed PCC in Figure 2 was only 96.02 (in Table 4), well short of the nominal 99%.** Furthermore, as δ
> increased, the observed PCC dropped to approximately 92%. This extreme disconnect between observed and
> nominal accuracy has been found in past research and warrants further research. For example, Eggen (1999,
> Table 1) reported observed accuracy of approximately 95% with nominal levels of 90%, 85%, and 80%."

> "the width of the indifference region should never be specified by the arbitrary methods often suggested...
> or even worse, simply adding and subtracting an arbitrarily chosen number δ. Instead, **a study such as this
> one should be conducted**, designed based on actual characteristics of a testing program like bank size and
> examinee distribution."

**Assumption note: the α and β you set in an SPRT are nominal, not achieved. In both Eggen's and Thompson's
simulations the realised error rate differed from the specified one, in both directions.**

### 2.5 Thompson (2007) and Thompson (2009) — framework papers, no item counts

- Thompson, N. A. (2007). "A Practitioner's Guide for Variable-length Computerized Classification Testing."
  *Practical Assessment, Research, and Evaluation*, 12(1): 1. DOI
  [10.7275/fq3r-zz60](https://doi.org/10.7275/fq3r-zz60). Free full text:
  [PARE](https://openpublishing.library.umass.edu/pare/article/id/1411/). **I read this in full. It contains no
  measured item-savings figure.** Its efficiency statement is qualitative: "While there is no question as to
  the fact that VL-CCTs offer a substantial advantage in terms of shorter tests than a conventional
  fixed-length approach, the specific components utilized directly affects the extent of this advantage."

  Three design facts from it that are directly usable:
  - "A wider indifference region will lead to increased error but decreased test length (Reckase, 1983; Eggen,
    1999)."
  - "a minimum test length will increase the average test length over all examinees, and a maximum test length
    will decrease average test length. Similarly, **item exposure constraints and content constraints generally
    only serve to increase average test length.**"
  - On maximum test length: a truncation rule "differs from a maximum test length constraint in that is not
    arbitrarily set, e.g., 50 items, but **empirically justified and therefore more legally defensible.**"
  - On sample size: IRT "requires a much larger calibration sample, up to 1,000 examinees (Wainer & Mislevy,
    2000)," whereas classical-test-theory CCT "can still be used to design highly efficient VL-CCTs (Rudner,
    2002)" with smaller samples but requires independently distinguishable groups.

- Thompson, N. A. (2009). "Item Selection in Computerized Classification Testing." *Educational and
  Psychological Measurement*, 69(5), 778–793. DOI
  [10.1177/0013164408324460](https://doi.org/10.1177/0013164408324460). **Flag: paywalled, abstract only.**
  The abstract's relevant conclusions: "Several alternatives for item selection algorithms based on item
  response theory in computerized classification testing (CCT) have been suggested, **with no conclusive
  evidence on the substantial superiority of a single method**... the efficiency of item selection approaches
  depend on the termination criteria that are used... **Item selection at the cut score, which seems
  conceptually appropriate for CCT, is not always the most efficient option.**"

---

## 3. SPRT applied to test length — every measured average test length I could verify

Consolidated. Each row is a figure I read in a source I could open.

| Source | Design | Cut score location | Stated error rate | Average test length | Achieved accuracy |
| --- | --- | --- | --- | --- | --- |
| Eggen (1998/1999) Table 1 | 2-category SPRT, 250-item bank, δ = .15, k_max 40 | θ₀ = .1, near the mean | α = β = .05 | 15.9–16.3 items | 94.6–95.6% |
| Eggen (1998/1999) Table 1 | same | same | α = β = .075 | 13.9–14.9 items | 94.8–95.6% |
| Eggen (1998/1999) Table 1 | same | same | α = β = .10 | 12.7–13.2 items | 94.8–95.3% |
| Eggen (1998/1999) Table 2 | 3-category SPRT, δ = .13, k_max 25 | θ₁ = −.13, θ₂ = .33 | .05 / .075 / .10 | 14.2–21.8 items | 87.0–90.1% |
| Thompson (2011) Table 2 | 2-category SPRT, 500-item bank, δ = 0.3, min 20 / max 200 | θ = −0.5 (69% pass) | nominal 95% | 39.30 items | 95.74% |
| Thompson (2011) Table 2 | GLR, δ = 0.3, same bank | same | nominal 95% | 37.62 items | 95.73% |
| Thompson (2011) Table 4 | SPRT, δ = 0.2 | same | nominal 99% | 85.55 items | 95.68% |
| Thompson (2011) Table 4 | GLR, δ = 0.2 | same | nominal 99% | 67.90 items | 96.02% |
| Kingsbury & Weiss (1979) | Bayesian CI termination, real-data simulation, floor of 3 items | P = .7 / .8 / .9 proportion-correct | 95% Bayesian CI | 12.2–23.4 items (means); modal 3–5 items in the high-confidence subgroup | same decision as conventional for 96% of trainees |
| Eggen & Straetmans (2000), *via* Cito 2001 report | 3-category CAT replacing a 25-item paper placement test | placement into 3 course levels | not stated in the source I read | 14.2 items | 88.3% |

**Three assumptions behind every figure in this table.**

1. **The item bank is dense near the cut score.** Thompson's bank was deliberately built that way ("the bank
   was again intended to provide a substantial number of items with difficulty near the cutscore"); Eggen's
   was an operational placement bank centred on the population.
2. **Item parameters are treated as known.** Thompson (2007) reports that "Spray and Reckase (1987) found
   that item parameter estimation error had no effect on classification error, but simply **required more
   items for the test to make a decision.**" **Flag: I did not read Spray & Reckase (1987); this is Thompson's
   characterization of it.**
3. **Nominal error rates are not achieved error rates.** See §2.4.

**The honest headline for the design question: the published SPRT literature's average test lengths for a
two-category decision at ~95% accuracy cluster between roughly 13 and 40 items, depending almost entirely on
how wide an indifference zone you accept.** The low end (13–16) comes from a bank purpose-built at the cut and
an indifference zone of ±0.15 θ; the high end (38–40) from a wider bank with δ = 0.3 but a minimum-length
floor of 20 items.

---

## 4. Short-form reliability

### 4.1 The Spearman–Brown prophecy formula and its original sources

Published independently and simultaneously in the same 1910 volume:

- Spearman, C. (1910). "Correlation Calculated from Faulty Data." *British Journal of Psychology*, 3, 271–295.
  DOI [10.1111/j.2044-8295.1910.tb00206.x](https://doi.org/10.1111/j.2044-8295.1910.tb00206.x).
- Brown, W. (1910). "Some Experimental Results in the Correlation of Mental Abilities." *British Journal of
  Psychology*, 3, 296–322. DOI
  [10.1111/j.2044-8295.1910.tb00207.x](https://doi.org/10.1111/j.2044-8295.1910.tb00207.x).

**Flag: both DOIs resolve in Crossref with matching titles and year. I did not read either 1910 paper.** The
formula as I state it is taken from a modern peer-reviewed source: Warrens, M. J. (2015). "Some Relationships
Between Cronbach's Alpha and the Spearman-Brown Formula." *Journal of Classification*, 32(1), 127–137. DOI
[10.1007/s00357-015-9168-0](https://doi.org/10.1007/s00357-015-9168-0), which gives it as

ρ* = Nρ / (1 + (N − 1)ρ)

where ρ is the reliability before adjustment, ρ* after, and N the length factor.

**Stated assumptions.** Warrens: "the S-B formula is based on the assumption of parallel equivalency."
Kruyen, Emons & Sijtsma (2012, §4.6 below) state the same and add the qualifier: "Although somewhat weaker,
these trends are also effective **if test parts are not parallel, which is common in real tests.**" A recent
paper argues the assumption is weaker still — Ellis, J. L., & Sijtsma, K. (2024). "Proof of Reliability
Convergence to 1 at Rate of Spearman–Brown Formula for Random Test Forms and Irrespective of Item Pool
Dimensionality." *Psychometrika*, 89(3), 774–795. DOI
[10.1007/s11336-024-09956-7](https://doi.org/10.1007/s11336-024-09956-7). Abstract: "The Spearman–Brown
formula is derived traditionally from the assumption that items or test parts are parallel, but **we show that
it also works under more general conditions**... the Spearman–Brown formula is also correct for randomly
sampled [test forms] that are not parallel and not even unidimensional." **Flag: abstract only.**

### 4.2 Worked implications — **these are my own arithmetic, not quotations**

Applying ρ* = Nρ / (1 + (N − 1)ρ) with N = new length ÷ old length. Every figure below is computed, not read
out of a source, and inherits the parallel-parts assumption.

**A 60-item test cut to 15 items (N = 0.25):**

| Reliability of the 60-item test | Predicted reliability of the 15-item version |
| --- | --- |
| .95 | **.826** |
| .93 | .769 |
| .90 | .692 |
| .85 | .586 |
| .80 | .500 |

**A 60-item test cut to 10 items (N = 1/6):**

| 60-item reliability | Predicted 10-item reliability |
| --- | --- |
| .95 | .760 |
| .93 | .689 |
| .90 | .600 |
| .85 | .486 |
| .80 | .400 |

**Inverted — how many items you need, starting from a 60-item test with reliability .95:**

| Target reliability | Items required |
| --- | --- |
| .90 | 28.4 |
| .85 | 17.9 |
| .80 | 12.6 |
| .70 | 7.4 |

**Starting from a 60-item test with reliability .90:** .85 needs 37.8 items, .80 needs 26.7 items, .70 needs
15.6 items.

**The direct answer to the question as posed: a 15-item test drawn from a 60-item test with reliability .95
tops out at about .83, and .83 is above the widely quoted .70 screening floor and well below the .90 floor
for individual decisions.** Both of those floors are examined in §4.4, where they turn out to be more
fragile than their ubiquity suggests.

### 4.3 An empirical check on the formula

The ICAR (§5.1) provides a real 60-item-to-16-item case. Observed: ICAR60 α = 0.93, ICAR16 α = 0.81.
Spearman–Brown predicts 0.78 for N = 16/60. **The observed short form beat the prediction by .03, because the
16 items were selected rather than sampled at random.** That is the direction to expect from deliberate item
selection, and it is small.

### 4.4 Where the .70 and .90 thresholds actually come from — and it is not the *Standards*

**Source.** Lance, C. E., Butts, M. M., & Michels, L. C. (2006). "The Sources of Four Commonly Reported Cutoff
Criteria: What Did They Really Say?" *Organizational Research Methods*, 9(2), 202–220. DOI
[10.1177/1094428105284919](https://doi.org/10.1177/1094428105284919).

Lance et al. traced the .70 reliability cutoff to its alleged source and found a misattribution. Their
citation audit: a Social Science Index search of Nunnally (1978) across 11 journals for 2000–2004 found 90
citations, "of which a full 44% (40) were to the alleged .70 reliability cutoff criterion. Of the 40 citations
to Nunnally for the .70 cutoff, 8 (20%) still reported research using scales that had estimated reliabilities
less than .70, 26 (65%) cited the .70 cutoff in the context of basic or applied research, 4 (10%) referred to
the .70 cutoff in the context of scale development or early stages of research."

**What Nunnally actually wrote, quoted by Lance et al. from Nunnally, J. C. (1978), *Psychometric Theory*
(2nd ed.), New York: McGraw-Hill, pp. 245–246:**

> "what a satisfactory level of reliability is depends on how a measure is being used. **In the early stages of
> research... one saves time and energy by working with instruments that have only modest reliability, for
> which purpose reliabilities of .70 or higher will suffice.**... In contrast to the standards in basic
> research, in many applied settings a reliability of .80 is not nearly high enough. In basic research, the
> concern is with the size of correlations and with the differences in means for different experimental
> treatments, for which purposes a reliability of .80 for the different measures is adequate. In many applied
> problems, a great deal hinges on the exact score made by a person on a test... In such instances it is
> frightening to think that any measurement error is permitted. Even with a reliability of .90, the standard
> error of measurement is almost one-third as large as the standard deviation of the test scores. **In those
> applied settings where important decisions are made with respect to specific test scores, a reliability of
> .90 is the minimum that should be tolerated, and a reliability of .95 should be considered the desirable
> standard.**"

**Flag: I did not read Nunnally (1978) directly. This is Lance et al.'s block quotation of it, with page
numbers given, in a peer-reviewed journal.**

Lance et al.'s verdict, verbatim:

> "The legend: Nunnally (1978) said that .70 reliability is adequate, right? The kernel of truth: **Nunnally
> conjectured that perhaps one can get away with measures that have only modest reliabilities of .70 or
> thereabouts if one wants to save time and effort in a new area of research.** The myth: Contrary to many
> researchers' (implicit or explicit) claims, Nunnally's 'Standards of Reliability' section (a) **did not
> proclaim .70 as a universal standard of reliability**, (b) did not indicate that .70 reliability was adequate
> for research (except as qual[ified]..."

(The (b) clause runs past a page break in the source and I have not read its continuation; I have marked the
truncation rather than closing the sentence for them.)

> "**.80, and not .70 as has been attributed, appears to be Nunnally's recommended reliability standard for the
> majority of purposes** cited in organizational research."

> "what constitutes adequate reliability (a) will always be a judgment call, (b) depends very much on the
> measurement situation, and (c) **should be cited as .80, not .70**, for almost all the applications we found
> in our literature review if one is to rely on a faithful citation to Nunnally (1978)."

Their footnote 3 traces the number across editions: "although the text of Nunnally's (1978) 'Standards of
Reliability' section has remained relatively unchanged over its three editions, he did raise the bar for
reliability of measures in 'early stages of research' **from '.60 or .50' (p. 226) in 1967 to .70 in 1978** and
maintained the .70 standard in Nunnally and Bernstein (1994). Across the three editions, Nunnally was
consistent in recommending a .80 reliability standard in basic research and at least .90 (with .95 desirable)
for applied test use but added in 1994, 'However, never switch to a less valid measure simply because it is
more reliable' (p. 265)."

**Three findings to carry forward.**

1. **The .90 floor for individual decisions is traceable and real.** It is Nunnally, and he stated it in almost
   exactly the terms it is usually quoted in.
2. **The .70 floor is a misattribution.** Nunnally's .70 was for *early-stage research instruments*, offered as
   a time-saving concession, and explicitly not for applied decisions about individuals. **He never proposed
   .70 as a screening threshold.** I found no original source that does.
3. **Nunnally's own recommended general standard was .80.**

### 4.5 What the AERA/APA/NCME *Standards* actually say — no numeric threshold at all

**Source.** American Educational Research Association, American Psychological Association, & National Council
on Measurement in Education. (2014). *Standards for Educational and Psychological Testing*. Washington, DC:
AERA. Full text used:
[testingstandards.net PDF](http://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf).
**Page numbers below are approximate: I located each passage between the PDF's embedded page markers and give
the chapter, which is exact.**

**On thresholds — chapter 2, "Reliability/Precision and Errors of Measurement" (pp. 33–47), near p. 40:**

> "there is no single, preferred approach to quantification of reliability/precision. No single index
> adequately conveys all of the relevant information. No one method of investigation is optimal in all
> situations, nor is the test developer limited to a single approach for any instrument. **The choice of
> estimation techniques and the minimum acceptable level for any index remain a matter of professional
> judgment.**"

> "General statements to the effect that a test is 'reliable' or that it is 'sufficiently reliable to permit
> interpretations of individual scores' are rarely, if ever, acceptable. **It is the user who must take
> responsibility for determining whether scores are sufficiently trustworthy to justify anticipated uses**...
> If scores are to be used for classification, indices of decision consistency are useful in addition to
> estimates of the reliability/precision of the scores."

**The single most important sentence in the *Standards* for a reversible, non-decisive screener,** from the
opening of chapter 2:

> "The reliability/precision of measurement is always important. However, **the need for precision increases as
> the consequences of decisions and interpretations grow in importance.** If a test score leads to a decision
> that is not easily reversed, such as rejection or admission of a candidate to a professional school... a
> higher degree of reliability/precision is warranted. **If a decision can and will be corroborated by
> information from other sources or if an erroneous initial decision can be easily corrected, scores with more
> modest reliability/precision may suffice.**"

**On test length — chapter 2:**

> "In general, **if the assessment is shortened (e.g., by decreasing the number of items or tasks), the
> reliability is likely to decrease**; and if the assessment is lengthened with comparable tasks or items, the
> reliability is likely to increase. In fact, lengthening the assessment... is an effective and commonly used
> method for improving reliability/precision."

Chapter 4, "Test Design and Development," under the heading "Test Length": "Specifications for test length
must balance testing time requirements with the precision of the resulting scores, **with longer tests
generally leading to more precise scores**... When tests are administered adaptively, test length (the number
of items administered to each examinee) is determined by stopping rules, which may be based on a fixed number
of test questions or may be based on a desired level of score precision."

**On decision consistency, which is what a screener should actually report — chapter 2, "Decision
Consistency" section, and Standard 2.16:**

> "Where the purpose of measurement is classification, some measurement errors are more serious than others.
> **Test takers who are far above or far below the cut score established for pass/fail or for eligibility for a
> special program can have considerable error in their observed scores without any effect on their
> classification decisions.** Errors of measurement for examinees whose true scores are close to the cut score
> are more likely to lead to classification errors."

> "Note that the degree of consistency or agreement in examinee classification is **specific to the cut score
> employed and its location within the score distribution.**"

Standard 2.16: "When a test or combination of measures is used to make classification decisions, estimates
should be provided of the percentage of test takers who would be classified in the same way on two
replications of the procedure."

**The *Standards* explicitly endorse short screening tests as a pool-reduction device — chapter 11, "Workplace
Testing and Credentialing," near pp. 170–171:**

> "The size of an applicant pool can constrain the type of testing system that is feasible. For desirable jobs,
> very large numbers of candidates may compete, and **short screening tests may be used to reduce the pool to a
> size for which the administration of more time-consuming and expensive tests is practical.**"

The same chapter distinguishes the two directions: "In some instances, the goal of the selection system is to
**screen in** individuals who are likely to be very high performers on one set of behavioral or outcome
criteria of interest to the organization. In others, the goal is to **screen out** individuals who are likely
to be very poor performers."

Glossary (p. 222): "**screening test:** A test that is used to make broad categorizations of test takers as a
first step in selection decisions or diagnostic processes."

**Finding to carry forward: the *Standards* nowhere state a numeric reliability threshold, for screening or
for anything else, and say so in as many words. Any document attributing ".70 for screening, .90 for
individual decisions" to the *Standards* is wrong. Both numbers are Nunnally's.**

### 4.6 The one source that answers "how few items" with an item count

**Source.** Kruyen, P. M., Emons, W. H. M., & Sijtsma, K. (2012). "Test Length and Decision Quality in
Personnel Selection: When Is Short Too Short?" *International Journal of Testing*, 12(4), 321–344. DOI
[10.1080/15305058.2011.643517](https://doi.org/10.1080/15305058.2011.643517). Free author copy: Radboud
Repository
[PDF](https://repository.ubn.ru.nl/bitstream/handle/2066/111866/111866.pdf?sequence=4).

**Method and sample.** Monte Carlo simulation, no human sample. 1,000 simulated applicants per condition,
θ ~ N(0,1). Dichotomous items generated under the 2-PL; rating-scale items under the graded response model.
Five test lengths: J = 40, 20, 15, 10, 5, with shorter tests nested inside longer ones. Item difficulties
equidistant on [−1.5, 1.5]; discriminations drawn from U[.5, 2], described as "typical of applied research."
Five personnel-selection scenarios; base rates and selection ratios of 50%, 25% and 10%.

**Reliabilities produced by those realistic parameters:** "coefficient alpha equal to **.90 for 40 items,
approximately .70 for 10 items and ranging from .50 to .55 for 5 items**, depending on the selection scenario."
To force a 5-item test to α ≥ .70, "these parameters must be at least 1.6 to 2.9," which the authors call
"unrealistically high."

**The individual-level metric.** CC⁺ is the proportion of *truly suited* applicants for whom the probability
of a correct classification, on repeated administration, is at least the stated lower bound p. CC⁻ is the same
for truly unsuited applicants. p = .9 means "upon repetition an individual may not be misclassified more often
than in 10% of the test repetitions."

**Table 1, Scenario 1 (single test, top-down selection), dichotomous items, selection ratio 10% — the row
closest to a selective admission:**

| J | Alpha | Specificity / NPV | Sensitivity / PPV | CC⁻ (p=.7) | CC⁻ (p=.9) | CC⁺ (p=.7) | CC⁺ (p=.9) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 40 | .90 | .97 | .76 | .98 | .91 | .60 | **.34** |
| 20 | .81 | .96 | .65 | .97 | .89 | .38 | .16 |
| **15** | **.77** | **.96** | **.61** | **.97** | **.84** | **.30** | **.10** |
| 10 | .68 | .95 | .57 | .97 | .83 | .30 | .06 |
| 5 | .51 | .94 | .46 | .97 | .79 | .15 | .02 |

Authors' description: "At a 10% selection ratio, CC⁺ at p = .9 was only .34 for J = 40, but **for J ≤ 15, CC⁺
dropped even below .10.** Thus, for [very few suited applicants can the correct decision be made with the
desired certainty]."

> "Even if one accepts p = .7 as the lower bound, **a satisfactory CC⁺ value was not obtained when tests with
> less than 15 items were used.**"

**The authors' explicit recommendation, verbatim, which is the most direct answer in the literature to the
question as posed:**

> "For all practical purposes, we advise test users to use long tests for personnel selection that contain **at
> least 20 items to have acceptable decision quality at the group level, and at least 40 items if correct
> decisions on the individual level** [are required]."

And the finding that defeats the reliability-floor defence:

> "**even if short tests satisfy minimum-reliability requirements recommended in standard textbooks,
> individuals may run a high risk to be incorrectly rejected or accepted.**"

(In the forced-α ≥ .70 5-item condition, "CC⁺ for lower bound p = .9 was only .11 at a selection ratio of
10%.")

**Other measured drops.** Group level: "The largest decline in specificity and NPV was .14 (Scenario 1, base
rate 50%). For J = 5, the minimum value for both specificity and NPV was .76." In Scenarios 3 and 4 at a 10%
base rate or selection ratio, "the sensitivity reduced with .28... This means that compared to 40-item tests,
**5-item tests additionally rejected 28% of all suited applicants.**" Scenario 5: specificity and NPV fell from
.88 at J = 40 to .71 at J = 5.

**Companion papers, verified but not read in full:**
- Kruyen, P. M., Emons, W. H. M., & Sijtsma, K. (2013). "On the Shortcomings of Shortened Tests: A Literature
  Review." *International Journal of Testing*, 13(3), 223–248. DOI
  [10.1080/15305058.2012.703734](https://doi.org/10.1080/15305058.2012.703734). **Abstract only.**
- Emons, W. H. M., Sijtsma, K., & Meijer, R. R. (2007). "On the consistency of individual classification using
  short scales." *Psychological Methods*, 12(1), 105–120. DOI
  [10.1037/1082-989X.12.1.105](https://doi.org/10.1037/1082-989X.12.1.105). **Abstract only.** This is the
  study Kruyen et al. extended; per Kruyen et al., Emons and colleagues "concluded that as test length
  decreases, the certainty by which one makes the right decisions about individuals can be impaired and become
  worrisome."

**A caveat I want on the record before this recommendation is treated as binding.** Kruyen et al.'s test
lengths are *fixed-form*, and every item was drawn from a bank whose difficulties span only [−1.5, 1.5] with
discriminations averaging around 1.25. Their 15-item test is not an adaptive 15-item test with items
concentrated at the cut. The CCT literature in §2 and §3 reaches ~95% correct classification in 13–16 items
precisely by targeting the cut. **These two literatures are not directly comparable, and I found no study that
runs both designs against each other.**

---

## 5. Very short cognitive measures with published validity

### 5.1 ICAR (International Cognitive Ability Resource)

**Source.** Condon, D. M., & Revelle, W. (2014). "The International Cognitive Ability Resource: Development
and initial validation of a public-domain measure." *Intelligence*, 43, 52–64. DOI
[10.1016/j.intell.2014.01.004](https://doi.org/10.1016/j.intell.2014.01.004). Free full text:
[icar-project.org PDF](https://www.icar-project.org/papers/ICAR2014.pdf). **I read the full text.** I first
read the typeset published version at `icar-project.com/attachments/download/60/Intelligence 2014.pdf`; **that
URL now returns HTTP 404, so I do not cite it.** Every number reported below was re-confirmed against the
icar-project.org PDF, which resolves and contains the same tables and figures.

**Samples.**
- Study 1: 96,958 individuals (66% female) from 199 countries, recruited through SAPA-project.org between
  18 August 2010 and 20 May 2013, in exchange for personality feedback. Mean self-reported age 26 (SD 10.6,
  median 22), range 14–90. Administration was online, unproctored and untimed. Individual participants
  completed only a subset of items.
- Study 2: n = 34,229, a subset aged 18–22 (mean 19.9). Criterion was **self-reported** SAT and ACT scores.
- Study 3: n = 137 college students (76 female) at a selective private midwestern university, mean age 19.7.
  Criterion was the Shipley-2, administered offline. n = 69 for Composite A, n = 68 for Composite B.

**Composition.** ICAR60 = 60 items: 9 Letter and Number Series, 11 Matrix Reasoning, 16 Verbal Reasoning, 24
Three-dimensional Rotation. **ICAR16 (the "Sample Test") = 16 items, four from each of the four types.**

**Reliability (Table 4):**

| Scale | α | ω_h | ω_total | Items |
| --- | --- | --- | --- | --- |
| ICAR60 | 0.93 | 0.61 | 0.94 | 60 |
| **ICAR16** | **0.81** | **0.66** | **0.83** | **16** |
| Letter/Number Series | 0.77 | 0.66 | 0.80 | 9 |
| Matrix Reasoning | 0.68 | 0.58 | 0.71 | 11 |
| Verbal Reasoning | 0.76 | 0.64 | 0.77 | 16 |

Note the authors' observation that the shorter form has the *higher* general-factor saturation: "the shorter
16-item measure (ICAR16 ω_h = 0.66; ICAR60 ω_h = 0.61)."

**Validity — Study 2, ICAR16 against self-reported achievement tests (Table 8):**

| Criterion | Uncorrected r | Corrected for reliability |
| --- | --- | --- |
| SAT Critical Reading + Math | **0.50** | **0.59** |
| ACT composite | **0.46** | **0.52** |
| SAT Math | 0.50 | 0.59 |
| SAT Critical Reading | 0.43 | 0.52 |

Authors' summary: "After correcting for the 'reliability' of self-reported scores, the 16 item ICAR Sample
Test correlated 0.59 with combined SAT scores and 0.52 with the ACT composite."

**Validity — Study 3, ICAR16 against the Shipley-2 (Table 13):**

| Correction | vs Composite A (n=69) | vs Composite B (n=68) |
| --- | --- | --- |
| **Uncorrected** | **0.41** | **0.41** |
| Range corrected | 0.68 | 0.68 |
| Range **and** reliability corrected | **0.82** | **0.81** |

Standard error on the doubly corrected values: se = 0.10. **The widely quoted "ICAR16 correlates .82 with a
commercial IQ measure" is the doubly corrected figure. The raw observed correlation in that sample was .41.**
Both numbers are in the paper; the .41 is the one an unproctored screener would actually observe in a
restricted-range sample.

**Chained context the authors supply.** Per Shipley et al. (2010) as cited by Condon & Revelle, Shipley-2
Composites A and B correlate 0.64 and 0.60 with the Wonderlic, 0.77 and 0.72 with WASI Full-Scale IQ, and 0.86
and 0.85 with WAIS Full-Scale IQ. **Flag: I did not read Shipley et al. (2010); this is Condon & Revelle's
citation of the Shipley-2 manual.**

**Group-level validity.** Mean ICAR scores by university major correlated 0.75 (se = 0.147) with published
mean SAT norms by major, and 0.86 (se = 0.092) with published mean GRE norms by major.

**Reference point the authors give for the criterion itself:** Frey and Detterman (2004) reported an
uncorrected correlation of 0.48 between combined SAT and Raven's Progressive Matrices, 0.72 after correcting
for range restriction; Koenig, Frey and Detterman (2008) reported 0.61 uncorrected and 0.75 range-corrected
between ACT and Raven's APM. **Flag: both are Condon & Revelle's citations, read at second hand.**

**A supporting independent validation, verified at abstract level only.** An examination of ICAR16 convergent
validity against the WAIS-IV reports an uncorrected FSIQ–ICAR16 correlation of .62 and a latent general-factor
correlation of .94. **Flag: I read this from a hosted PDF of the article
([link](https://sage.cnpereading.com/storage/sage/journal/article/JPA/2020/JPA_2020_38_8/unzip/10.1177_0734282920943455.pdf))
and did not resolve or verify the DOI 10.1177/0734282920943455, so I am not citing it as established.**

**Applicability flag: the ICAR was validated on adults, mostly 18–26, self-selected into an online personality
survey. It has no published child norms that I found. The item types (three-dimensional rotation, verbal
reasoning) are not designed for K-5.**

### 5.2 Raven's APM 12-item short forms

**Source.** Arthur, W., Jr., & Day, D. V. (1994). "Development of a Short Form for the Raven Advanced
Progressive Matrices Test." *Educational and Psychological Measurement*, 54(2), 394–403. DOI
[10.1177/0013164494054002013](https://doi.org/10.1177/0013164494054002013). **Flag: paywalled; abstract
verified. All numbers below are taken from two sources that reproduce them.**

Abstract, verbatim: "a major drawback curtailing more widespread use is its length; **the APM is a 36-item
power test with an administration time of 40-60 minutes.** The present study reports on the development of a
12-item short form of the APM that demonstrates psychometric properties similar to the long form, but with a
substantially shorter administration time."

**The definitive comparison table** is Table 9 of Bilker et al. (2012) (§5.3), which reports both of Arthur &
Day's samples separately. This resolves a discrepancy that appears throughout the secondary literature:

| Version | Full/short length | % item reduction | Full/short α | **Full–short score correlation** | Full/short time (min) | % time saved |
| --- | --- | --- | --- | --- | --- | --- |
| Arthur & Day, APM, **selection sample** | 36 / 12 | 67% | .84 / .72 | **.90** | 45 / — | — |
| Arthur & Day, APM, **validation sample** | 36 / 12 | 67% | .86 / .65 | **.66** | 34 / 15 | 44% |
| Bors & Stokes, APM | 36 / 12 | 67% | .84 / .73 | **.92** | 45 / — | — |
| Wytek et al., SPM 30-item | 60 / 30 | 50% | .97 / .96 | .98 | 17 / 9 | 47% |
| Bilker et al., SPM Form A | 60 / 9 | 85% | .96 / .80 | .98 | 17 / 4 | 76% |
| Bilker et al., SPM Form B | 60 / 9 | 85% | .96 / .83 | .98 | 17 / 3 | 82% |

**This is an important finding and I want it stated flatly. The Arthur & Day short form's headline correlation
of .90 with the full APM is from the *selection* sample — the same data the 12 items were chosen from, with
the short form embedded inside the full test. In the independent validation sample it was .66, and α fell to
.65.** Bilker et al.'s own text says so in the introduction: "Correlations between scores based on reduced
sets and the total APM test ranged from **r = .66 (Arthur & Day, 1994)** to r = .91 (Bors & Stokes, 1998)."

An independent replication reaches the same conclusion. Ibrahim, M., & Kazem, M. (2013). "Psychometric
properties of scores from an embedded and independently-administered short form of the Raven's Advanced
Progressive Matrices." *International Journal of Learning Management Systems*, 1(2). DOI
[10.12785/ijlms/010203](https://doi.org/10.12785/ijlms/010203). N = 433 (full test) and N = 179
(stand-alone short form), university students in Oman. Abstract: "**the scores from the
independently-administered short form had inadequate psychometric properties compared to those of the embedded
short form and the full test.** Hence, it was concluded that the short form under consideration is not suitable
for predictive purposes due to the relatively low level of reliability of scores obtained from it when
administered as a stand-alone test which results in a large standard error of measurement as compared to the
full test." **Flag: DOI verified in Crossref; this is a low-profile journal and I read the abstract plus a
hosted PDF, not the version of record. Treat as supporting, not load-bearing.**

**Related, verified:** Arthur, W., Tubre, T. C., Paul, D. S., & Sanchez-Ku, M. L. (1999). "College-Sample
Psychometric and Normative Data on a Short Form of the Raven Advanced Progressive Matrices Test." *Journal of
Psychoeducational Assessment*, 17(4), 354–361. DOI
[10.1177/073428299901700405](https://doi.org/10.1177/073428299901700405). **Abstract only; no numbers
extracted.**

### 5.3 The shortest validated form I found: 9 items

**Source.** Bilker, W. B., Hansen, J. A., Brensinger, C. M., Richard, J., Gur, R. E., & Gur, R. C. (2012).
"Development of Abbreviated Nine-Item Forms of the Raven's Standard Progressive Matrices Test." *Assessment*,
19(3), 354–369. DOI [10.1177/1073191112446655](https://doi.org/10.1177/1073191112446655). Free full text:
[PMC4410094](https://pmc.ncbi.nlm.nih.gov/articles/PMC4410094/). **I read the full text.**

**Method and sample.** n = 180 consecutive participants assessed on the 60-item RSPM at the University of
Pennsylvania Brain Behavior Laboratory. Ages 16–77, mean 33.9 (SD 12.6); mean 14.5 years of education; 54.4%
male. The sample includes healthy volunteers, patients with schizophrenia, relatives of patients, and
non-psychotic patients with Axis I disorders. Split sample: 90 for model construction, 90 for validation, plus
200-repetition cross-validation and 10,000-iteration bootstrap. Method: Poisson regression predicting the
number of *incorrect* items, with a branch-and-bound-style algorithm to search item subsets.

**Score distribution:** combined sample mean 41.3 of 60, median 45.5, range 2–59, skewness −0.94. **This is a
left-skewed, heavily ceiling-loaded distribution — the opposite of what a gifted screener faces.**

**Headline, verbatim from the abstract:**

> "Using **nine RSPM items as predictors, correlations of .9836 and .9782 were achieved for the reduced forms;
> .9063 and .8978 for the validation data.** Thus, a 9-item subset of RSPM predicts the total score for the
> 60-item scale with good accuracy... The two 9-item forms provide a 75% administration time savings compared
> to the 30-item form."

**Cross-validation over 200 random splits:** Form A construction mean r = .9795 (SD 0.0026, 95% CI
[.9744, .9846]), validation mean r = .9256 (SD 0.0182, 95% CI [.8899, .9613]). Form B construction .9749,
validation .9205.

**Item instability across splits** — relevant to anyone planning to select a small item subset: "item 36 was
selected for final Form A, but was selected only for 6.5% of the Form A's across the 200 splits. At the other
extreme, item 24 was selected for the final Form A and was selected in 62.0% of the Form A splits... this is a
strong indication that **there are many different subsets of items that could have made up Forms A and B, with
very similar correlations.**"

**Timing (Table 9): full 60-item RSPM ≈ 17 minutes; the 9-item forms ≈ 3–4 minutes.**

The ceiling finding from this paper is reported in §8.1 because it is the single most relevant result I found
for measurement in the upper tail.

### 5.4 Summary of the very short measures

| Instrument | Items | Reliability | Best-verified validity coefficient | Population |
| --- | --- | --- | --- | --- |
| ICAR16 | 16 | α = .81 | .50 uncorrected vs SAT CR+M (n = 7,348); .41 uncorrected vs Shipley-2 (n ≈ 69) | Adults, online, unproctored |
| Arthur & Day APM SF | 12 | α = .72 (selection) / .65 (validation) | **.66** in the validation sample; .90 embedded in the derivation sample | University community adults |
| Bors & Stokes APM SF | 12 | α = .73 | .92 (as reported by Bilker et al.) | 506 undergraduates |
| Bilker Form A / B | 9 | α = .80 / .83 | .91 / .90 in the held-out validation half | Clinical/community adults, ages 16–77 |

**I found no published, validated reasoning measure of 10–20 items with reported validity in children, and
none validated at or near a 95th-percentile decision point.**

---

## 6. Test length, child fatigue and dropout

This is the weakest-evidenced of the eight questions, and I want to be explicit about that before listing
what I did find.

### 6.1 Position effects in large-scale testing — the best-measured decline

**Source.** Borgonovi, F., & Biecek, P. (2016). "An international comparison of students' ability to endure
fatigue and maintain motivation during a low-stakes test." *Learning and Individual Differences*, 49, 128–137.
DOI [10.1016/j.lindif.2016.06.001](https://doi.org/10.1016/j.lindif.2016.06.001). **Flag: paywalled; abstract
and secondary summaries only.**

**Source with the number I could verify in full text.** Zamarro, G., Hitt, C., & Mendez, I. (2019). "When
Students Don't Care: Reexamining International Differences in Achievement and Student Effort." *Journal of
Human Capital*, 13(4), 519–552. DOI [10.1086/705799](https://doi.org/10.1086/705799). Free working-paper
version: University of Arkansas ScholarWorks
[PDF](https://scholarworks.uark.edu/cgi/viewcontent.cgi?article=1021&context=edrepub).

Working-paper text, verbatim:

> "**Across the sample, average performance declines from 5.85 items correct on the first ten items to 4.46
> items correct on the final ten items.** That said, for some students the decline in performance may reflect
> the fact that their booklets randomly contained relatively difficult items toward the end of the exam.
> Indeed, ANOVA estimates find that 16.3 percent of the variation in decline from the first ten to last ten
> items is explained by booklet number... **the adjusted rate of decline in performance from the first ten to
> the last ten items is 1.37 points.**"

**So: a 13.7 percentage-point drop in the probability of a correct answer between the first ten and the last
ten items, after adjusting for which booklet a student received.** Item difficulty is held constant by the
random booklet assignment, which is what makes this a fatigue/effort estimate rather than a difficulty
artefact.

Abstract of the published version: "Together, our measures of student effort explain **between 32 and 38
percent of the variation in test scores across countries.**"

**Setting: PISA, 15-year-olds, a roughly two-hour low-stakes assessment. Not young children, and a much longer
session than 15 minutes.**

**Corroborating position-effect evidence, verified at abstract level:** Wu, Q., Debeer, D., Buchholz, J.,
Hartig, J., & Janssen, R. (2019). "Predictors of individual performance changes related to item positions in
PISA assessments." *Large-scale Assessments in Education*, 7(5). DOI
[10.1186/s40536-019-0073-6](https://doi.org/10.1186/s40536-019-0073-6). Open access. Its literature summary
notes that "Hartig and Buchholz (2012) employed a multilevel IRT model and reported a significant negative
item position effect in 10 selected countries in the PISA 2006 science assessment. Debeer et al. (2014)... found
a negative position effect in all countries in the PISA 2009 reading assessment," and, importantly, that
"Weirich et al. (2016) demonstrated that **position effects were only partially due to changes in test-taking
effort and did not vanish** when the (decline in) test-taking effort was controlled for." Also: "Wise et al.
(1989) found that the variation in performance associated with item positions was more related to the ability
of examinees than to the characteristics of items, and **the effect was more pronounced for lower ability
examinees.**" **Flag: all of these are Wu et al.'s citations of other papers, read at second hand.**

Downstream: Borgonovi, F., & Biecek, P. (2021), "Performance decline in a low-stakes test at age 15 and
educational attainment at age 25," *Journal of Adolescence*, DOI
[10.1016/j.adolescence.2021.08.011](https://doi.org/10.1016/j.adolescence.2021.08.011), finds "performance
decline at age 15 predicts completion of a college degree by age 25." **Abstract-level only.**

### 6.2 The counter-finding, which should be reported alongside it

**Source.** Ackerman, P. L., & Kanfer, R. (2009). "Test length and cognitive fatigue: An empirical examination
of effects on performance and test-taker reactions." *Journal of Experimental Psychology: Applied*, 15(2),
163–181. DOI [10.1037/a0015719](https://doi.org/10.1037/a0015719). Publicly posted PDF:
[APA](https://www.apa.org/pubs/journals/releases/xap-15-2-163.pdf).

**Method and sample.** 239 first-year university students in the Atlanta area. Within-participant, fully
counterbalanced. Three SAT batteries on three consecutive weekend mornings: Short (3½-hour total session),
Standard (4½ hours), Long (5½ hours). Paid $150 plus performance bonuses.

**Result, verbatim from the abstract:**

> "Consistent with expectations, subjective fatigue increased with increasing time-on-task. However, **mean
> performance increased in the longer test length conditions, compared with the shorter test length
> condition.** Individual differences in personality/interest/motivation trait complexes were found to have
> greater power than the test-length situations for predicting subjective cognitive fatigue."

The authors are explicit that they designed against the standard confound: "The current procedure, by using a
between-session test-length manipulation and a counterbalanced design, distributes any practice effects across
the three test-length conditions, such that any differences between the conditions cannot be attributed to
practice or learning effects."

**Finding to carry forward: adding two hours of testing time to a paid, motivated adult sample raised
subjective fatigue without lowering performance. The PISA decline is therefore probably an effort/motivation
effect at least as much as a cognitive-fatigue effect — which is exactly what Zamarro et al. argue it is.
Neither study tells you how long a seven-year-old can sustain effort.**

### 6.3 Children specifically — what little I found

I could not find a study that measures the relationship between test session length and accuracy in children
across a range of session lengths. What exists is task-level:

**Source.** "Which Factors Influence Attentional Functions? Attention Assessed by KiTAP in 105 6-to-10-Year-Old
Children." *Behavioral Sciences*, 9(1), 7 (2019). DOI
[10.3390/bs9010007](https://doi.org/10.3390/bs9010007). Open access:
[PMC6359051](https://pmc.ncbi.nlm.nih.gov/articles/PMC6359051/). **Flag: I did not verify the author list and
am deliberately not naming authors for this item.**

Design fact worth noting on its own: the KiTAP battery's sustained-attention subtest runs **10 minutes** and
is scored by comparing performance in the first 5 minutes against the second 5 minutes; its vigilance subtest
runs 15 minutes. The paper reports that in the first 5 minutes "pupils in the higher grades have the best
performance, doing the fewest number of omissions and having more rapid reactions," and that "**Boys committed
more false alarms in the last 5 min**... the worst performances of pupils can be caused by fatigue, especially
in younger children (7 years), and boredom."

**Flag: this is a descriptive study of 105 children on an attention battery, not a reasoning test, and its
own regression models are weak (the reported model for the second half of the test has R² = 0.07). I would
not build a test-length policy on it.** The one durable fact is that a standardized, published children's
attention battery treats **10 minutes as the length at which a within-task decline is expected to be
detectable** — which sits directly underneath a 15-minute design.

### 6.4 Completion and attrition in unsupervised online cognitive testing

The closest analogues to a public, unproctored, link-delivered screener:

- **Adults, 13-task battery.** "Participation and engagement in online cognitive testing." *Scientific
  Reports* (2024). [Link](https://www.nature.com/articles/s41598-024-65617-w). 58% (n = 3,248) completed all
  tasks; a further 22.5% (n = 1,270) completed 7 or more; 13.2% completed fewer than 7; 6.7% (n = 373)
  completed none. Mean 10.3 of 13 tasks. Only 6% of the variance in completion was explained by all measured
  covariates combined (R² = 0.06). The authors note "longer or more demanding tasks, such as verbal list
  learning, appeared to cause relatively high dropout rates." **Flag: abstract and results section read from
  the page; I did not verify the DOI or author list.**
- **Children, school-supervised, 8-task battery.** "Computerized attention measure." *Frontiers in Education*
  (2025). [Link](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1540817/full).
  Completion rate across 13 middle schools ranged from **29.17% to 100%, mean 67.80%**. Stated causes were
  technical (network quality) and insufficient time allocated, not fatigue. **Flag: same verification
  caveat.**
- **Children, unmoderated at home.** e-Babylab, *Behavior Research Methods* (2023).
  [Link](https://link.springer.com/article/10.3758/s13428-023-02200-7). Reports "a relatively high dropout
  rate... of around **25% of children**" in looking-time studies conducted in children's natural environments.
  **Flag: same verification caveat, and looking-time infant paradigms are a poor analogue for a reasoning
  screener.**
- **Gamification does not fix attrition.** "Attrition from Web-Based Cognitive Testing: A Repeated Measures
  Comparison of Gamification Techniques." [PMC5719230](https://pmc.ncbi.nlm.nih.gov/articles/PMC5719230/). 482
  signed up, 265 completed the four compulsory sessions. "**No evidence of an effect of gamification on
  attrition was observed.** A log-rank test showed no evidence of a difference in dropout rates between task
  variants (χ²₂ = 3.0, P = .22)." Adults, paid. **Flag: same verification caveat.**

**None of these four is a peer-reviewed measurement of dropout as a function of session length in children.**
Taken together they put non-completion somewhere between roughly 25% (e-Babylab, unmoderated at home) and 45%
(the gamification study: 482 signed up, 265 finished), with 32% in the supervised school setting and 42% for
"completed all 13 tasks" in the adult battery. **That is an order of magnitude to plan around and nothing
more.**

---

## 7. The cost of a short test at an extreme cut score

### 7.1 The one study that varies test length and cut score together

**Source.** Schauber, S. K., & Homer, M. (2025). "Challenging the norm: Length of exams determined by
classification accuracy or reliability." *Medical Education*, 59(12), 1363–1374. DOI
[10.1111/medu.15742](https://doi.org/10.1111/medu.15742). Author accepted manuscript, open:
[White Rose Repository
PDF](https://eprints.whiterose.ac.uk/id/eprint/226675/9/250414%20Schauber-Homer%20-%20Challenging%20the%20norm.pdf).

**Method and sample.** Resampling from real exam data: three undergraduate medical knowledge exams, five
previous administrations each. Seven test lengths (20, 30, 50, 75, 100, 125, 150 items) crossed with five cut
scores (40, 50, 60, 70, 80 percent correct), 100 random item samples per cell. **N = 52,500 estimates**
(3,500 × 3 × 5). Linear mixed-effects models with fixed effects for test length and cut score and a random
effect for exam.

**Results, verbatim:**

> "Results indicate that **only classification accuracy, not reliability, varies in relation to the cut-score
> for pass-fail decisions.** Furthermore, reliability and classification accuracy are differently related to
> test length. Optimal test length to using reliability was around 100 items, independent of pass-rates. For
> classification accuracy, recommendations are less generic. **For exams with a small percentage of fail
> decisions (i.e., 5% or less), an item size of 50 did, on average, achieve an accuracy of 95% correct
> classifications.**"

> "For classification accuracy, when we only entered test length in the regression model, we found a
> standardized regression coefficient of **β_std = 0.31** (95% CI [0.30, 0.31]) for the relation between test
> length and classification accuracy. **This is a weaker effect than that for Cronbach's alpha (β_std = 0.81).**
> Generally, **higher cut-scores were related to lower classification accuracy (β_std = −0.79, 95% CI [−0.77,
> −0.75])**."

**The authors' stated mechanism, which is the sentence that determines whether this finding helps or hurts a
95th-percentile design:**

> "Since **a higher-cut score moves closer to the mean of the score distribution**, a more equal balance of
> pass-fail decisions is made, which in turn implies a greater likelihood of incorrect classifications. This
> pattern is shown in Figure 1, lower panel, where **an exam with 20 items, where most students pass (1%
> fails), has a higher classification accuracy than a 150-item exam where about half of** [candidates fail]."

> "for 18% fail-decisions, a 150-item exam would reach, on average, a level of approx. 90% accuracy."

> "Crucially, this depends upon the cut-score relative to the average candidate performance, or equivalently,
> **the expected failure rate.**"

**Read carefully, this study's "higher cut score" means *closer to the middle of the distribution*, because
medical students mostly pass. A 95th-percentile bar in a general population is the *opposite* case: it is far
out in the tail, few candidates sit near it, and by this paper's own mechanism classification accuracy should
be high — which is also what the AERA/APA/NCME *Standards* say ("Test takers who are far above or far below
the cut score... can have considerable error in their observed scores without any effect on their
classification decisions"). I am reporting the mechanism as the authors stated it; I have not found a study
that runs it out to a 95th-percentile cut.**

The authors' own framing of the practical benefit: "The benefits of a shorter test design practice include
minimizing the burden of assessment on candidates and test developers. Item writers could focus on developing
fewer, but higher quality, items."

### 7.2 The counterweight: base rate destroys positive predictive value

Kruyen et al. (2012), §4.6, measured exactly the case where the qualifying group is small. **At a 10%
selection ratio, sensitivity/PPV fell from .76 at 40 items to .61 at 15 items to .46 at 5 items, and CC⁺ at
p = .9 fell from .34 to .10 to .02.** Note that specificity/NPV barely moved at all (.97 → .96 → .94).

**The asymmetry is the finding: at a selective bar, a short test loses almost nothing on the reject side and a
great deal on the accept side.** This is the same asymmetry Kingsbury & Weiss (1979) found in the opposite
direction of item count (§1.3): confirming mastery at a high bar took *more* items, ruling it out took fewer.

### 7.3 Maximizing information at the cut score is not automatically optimal for a short test

**Source.** Wyse, A. E., & Babcock, B. (2016). "Does Maximizing Information at the Cut Score Always Maximize
Classification Accuracy and Consistency?" *Journal of Educational Measurement*, 53(1), 23–44. DOI
[10.1111/jedm.12099](https://doi.org/10.1111/jedm.12099). **Flag: paywalled; abstract only.**

> "This article uses simulated examples to illustrate that one can obtain **higher classification accuracy and
> consistency by designing tests that have maximum test information at locations other than at the cut
> score.** We show that the location where one should maximize the test information is dependent on the length
> of the test, the mean of the ability distribution in comparison to the cut score... Analyses also suggested
> that the differences in classification performance between designing tests optimally versus maximizing
> information at the cut score **tended to be greatest when tests were short and the mean of ability
> distribution was further away from the cut score.**"

**That final clause describes the design under consideration exactly: a short test with a cut score far from
the population mean. This paper says the standard CCT recipe — put all your information at the cut — is most
likely to be suboptimal precisely in that configuration. I have the abstract's claim but not the magnitudes.**

---

## 8. Measurement at the extremes with few items

### 8.1 The measured ceiling effect in a 9-item form

Bilker et al. (2012), full text (§5.3). The authors split the 180 participants into tertiles of the full
60-item RSPM score (0–38, 39–50, 51–60) and recomputed the correlation between the full test and each 9-item
form within each tertile:

| Tertile of full 60-item score | Form A | Form B |
| --- | --- | --- |
| 1st (0–38) | .75 | .84 |
| 2nd (39–50) | .80 | .69 |
| **3rd (51–60)** | **.67** | **.39** |

Authors' own reading, verbatim:

> "It is important to note that the correlations within segments of one of the variables being correlated may
> be smaller than the overall correlation, since local linearity relationships dominate these local
> correlations, especially for narrow segments, as in this case... Thus, **there does not appear to be a floor
> effect for either of the reduced forms. There does appear to be a ceiling effect, particularly for Form B,
> resulting in a reduced correlation in the upper tertile.** Since the upper tertile is composed of a very
> narrow relatively high range (51 to 60) and **the major emphasis of the Ravens test is to look at average to
> lower-than-average ranges of abilities, this is not a major concern.**"

**Two things are true here and both matter.** First, the authors' caveat is legitimate: correlations computed
within a restricted band are attenuated by construction, so .39 is not a clean estimate of the form's accuracy
in the top third. Second, **the authors explicitly disclaim the top of the range as out of scope for their
instrument.** A screener whose whole job is discriminating in the top 5% cannot inherit that disclaimer. This
is the closest thing I found to a direct measurement of what a 9-item form does at the top of the
distribution, and the number is .39.

### 8.2 The estimator itself misbehaves at the extremes with short tests

**Source.** Magis, D., Béland, S., & Raîche, G. (2011). "A Test-Length Correction to the Estimation of Extreme
Proficiency Levels." *Applied Psychological Measurement*, 35(2), 91–109. DOI
[10.1177/0146621610378289](https://doi.org/10.1177/0146621610378289). **Flag: paywalled; abstract only.**

> "the estimation of proficiency levels by maximum likelihood (ML), despite being asymptotically unbiased,
> **may yield infinite estimates.** On the other hand, with an appropriate prior distribution, the Bayesian
> approach of maximum a posteriori (MAP) yields finite estimates, but it **suffers from severe estimation bias
> at the extremes of the proficiency scale.** As a first step, a simple correction to the MAP estimator is
> proposed to reduce this estimation bias. **The correction factor is determined through a simulation study and
> depends only on the length of the test.**"

**That last sentence is the direct answer to "does the number of items matter at the extremes": in this
model the required bias correction is a function of test length and nothing else.** The paper is Rasch-based;
the authors state "the method could be adapted to other logistic item response models."

### 8.3 Standard errors are least trustworthy exactly where a selective screener operates

**Source.** Ippel, L., & Magis, D. (2020). "Efficient Standard Errors in Item Response Theory Models for Short
Tests." *Educational and Psychological Measurement*, 80(3), 461–475. DOI
[10.1177/0013164419882072](https://doi.org/10.1177/0013164419882072). **Flag: I read the results and
discussion sections from the publisher page; I did not read the methods in full.**

> "In the **five-item test length condition, the ASE [asymptotic standard error] overestimates the SE for those
> test takers with abilities at the either end of the scale**, resulting in high ASB and RMSE. On the other
> hand, for these extreme test takers the exact SE is only marginally too small. **The panel for the 10-item
> test length condition shows a similar but less pronounced pattern.**"

> "the gain in efficiency of using the exact SE is **especially clear at the extreme ends of the ability scale,
> those levels of ability which were targeted poorly by the test.** Even when the test only consists of 10
> items, the advantage of exact standard error over asymptotic standard error, which is simpler to compute, **is
> negligible for the midrange test takers.**"

**Design implication stated as a fact and not a recommendation: the Fisher-information standard error that
almost every adaptive engine uses to decide when to stop is biased at 5 and 10 items, and the bias is
concentrated at the ends of the scale.** A stopping rule that says "stop when SE ≤ 0.3" is therefore using a
quantity that is itself unreliable in the exact region a selective screener cares about.

### 8.4 What the *Standards* say about the tail

Chapter 2 of the 2014 *Standards* (§4.5) contains the relevant general statement, which cuts both ways for a
95th-percentile bar:

> "Test takers who are far above or far below the cut score established for pass/fail or for eligibility for a
> special program **can have considerable error in their observed scores without any effect on their
> classification decisions.** Errors of measurement for examinees whose true scores are close to the cut score
> are more likely to lead to classification errors."

> "the degree of consistency or agreement in examinee classification is **specific to the cut score employed and
> its location within the score distribution.**"

The *Standards* also recommend the specific diagnostic: report "the conditional standard error in the vicinity
of the cut score or the decision consistency/accuracy indices (e.g., percentage of correct decisions, Cohen's
kappa), which vary as functions of both score reliability/precision and the location of the cut score."

### 8.5 The domain-specific paper on measuring high-ability students, which I could not read

**Source.** LeBeau, B., Assouline, S. G., Mahatmya, D., & Lupkowski-Shoplik, A. (2020). "Differentiating Among
High-Achieving Learners: A Comparison of Classical Test Theory and Item Response Theory on Above-Level
Testing." *Gifted Child Quarterly*, 64(3), 219–237. DOI
[10.1177/0016986220924050](https://doi.org/10.1177/0016986220924050).

**Flag: paywalled. Abstract only, no numbers extracted.** N = 1,893 fourth- to sixth-grade high-achieving
students. Abstract: "This study investigated the application of item response theory (IRT) **to expand the
range of ability estimates for gifted... students' performance on an above-level test**... IRT can also
differentiate students based on the student's grade or within a grade by using the unique string of correct
and incorrect answers the student makes while taking the test. **This differentiation may have implications
for identifying or classifying students who are ready for advanced coursework.**"

This is the one paper in the set that is about exactly the right population and the right problem. **I could
not read it and extracted nothing from it. It should be obtained.**

### 8.6 No published minimum item count for tail estimation

**I searched specifically for published guidance on the number of items required to estimate ability
precisely in the upper tail and found none.** What exists is the machinery in §8.2 and §8.3 — corrections and
standard-error formulations that acknowledge the problem — plus the general IRT result that the standard error
is the inverse square root of the test information function, so precision at any θ is determined by how many
administered items were informative *at that θ*. No source I found states "you need at least N items above
the 95th percentile." The nearest analogue is the design fact from Kingsbury & Weiss (1979): at their highest
mastery level the adaptive procedure exhausted the entire item pool before it could confirm mastery, because
"the higher mastery levels fell above the steepest portion of the TCCs."

---

## Could not verify — explicit list

1. **Weiss (1982) full text.** Abstract verified verbatim from two independent reproductions. I could not read
   the body, so I cannot say which live-testing studies produced the "half the number of items" and "almost
   one-third" figures, what pools they used, or what the absolute lengths were.
2. **Weiss & Kingsbury (1984) full text.** Paywalled. Citation and full abstract verified. **The abstract
   contains no percentage.** Every "50% fewer items (Weiss & Kingsbury, 1984)" citation I found is therefore
   either citing something in the body I could not check, or is a drifted attribution of Weiss (1982). I
   consider this an open question and the most important one in §1.
3. **Spray & Reckase (1996) full text.** Paywalled. Abstract and ERIC record verified. **No item counts
   extracted.** The paper is cited constantly for CCT efficiency; I have no number from it.
4. **Eggen (1999) published version.** All Table 1 and Table 2 numbers in §2.2 and §3 are read from Cito
   Report 98-1, the submitted manuscript. Abstracts match; tables not confirmed against the published APM
   article.
5. **Eggen & Straetmans (2000) full text.** Paywalled. The "at least 22%" is from the verified abstract. **The
   25 → 14.2 item figures and the 87.0/88.3/85.2 accuracy figures are from a 2001 Cito research report citing
   that paper, not from the paper itself, and are not peer reviewed.**
6. **Thompson (2009), EPM 69(5).** Paywalled, abstract only. No simulation numbers extracted.
7. **Nunnally (1978), *Psychometric Theory* (2nd ed.).** Not read. The block quotation of pp. 245–246 in §4.4
   is Lance, Butts & Michels's (2006) quotation of it. Lance et al. is peer-reviewed and gives page numbers,
   but this is still a second-hand quotation of the single most load-bearing passage in the document.
   **Somebody should check pp. 245–246 of the physical book before this is put in front of a client.**
8. **Exact page numbers in the 2014 *Standards*.** The quotations are verbatim from the full-text PDF and the
   chapters are certain (chapter 2 for reliability, chapter 4 for test design, chapter 11 for workplace
   screening, glossary p. 222). The page numbers I give for individual passages are inferred from the PDF's
   embedded page markers and may be off by one.
9. **Arthur & Day (1994) full text.** Paywalled. Every number in §5.2 is from Bilker et al.'s (2012) Table 9
   and introduction, and from a secondary account. **The .90 versus .66 discrepancy is resolved by Bilker et
   al.'s table, but I have not confirmed it against Arthur & Day's own text.**
10. **Arthur, Tubre, Paul & Sanchez-Ku (1999).** DOI verified; abstract only; no numbers extracted.
11. **Bors & Stokes (1998).** I never located this paper. The α = .73 and r = .92 figures attributed to it are
    from Bilker et al.'s Table 9 and introduction. **No DOI verified; I am not citing it directly.**
12. **Wytek, Opgenoorth & Presslich (1984).** Same status: known only through Bilker et al.'s summary
    (30-item form, split-half r = .95, sample of 300 psychiatric outpatients and inpatients). **No DOI
    verified.**
13. **Shipley et al. (2009, 2010) manual data.** The Shipley-2 reliabilities (.925, .93) and its correlations
    with the Wonderlic, WASI and WAIS are Condon & Revelle's citations of the test manual. Not independently
    verified.
14. **Frey & Detterman (2004) and Koenig, Frey & Detterman (2008).** Cited at second hand via Condon &
    Revelle. Not independently verified.
15. **The ICAR16–WAIS-IV convergent-validity study.** I read a hosted PDF reporting FSIQ–ICAR16 r = .62
    uncorrected and a latent-factor r = .94, but **did not resolve DOI 10.1177/0734282920943455 or confirm the
    journal, volume and authors.** Not cited as established.
16. **LeBeau, Assouline, Mahatmya & Lupkowski-Shoplik (2020).** Paywalled. Abstract only. **This is the most
    directly relevant paper in the whole set — above-level testing, N = 1,893 high-achieving fourth to sixth
    graders, IRT versus CTT for classifying students — and I extracted nothing from it.** Highest-priority
    item to obtain.
17. **Wyse & Babcock (2016).** Paywalled. Abstract only. The claim that the cut-score-targeting rule is most
    suboptimal for short tests with distant cut scores is the abstract's, with no magnitudes.
18. **Magis, Béland & Raîche (2011).** Paywalled. Abstract only. I have the existence and functional form of
    the test-length-dependent correction, not the correction factor itself.
19. **Borgonovi & Biecek (2016).** Paywalled. Abstract verified. The 13.7-percentage-point decline figure I
    report is from **Zamarro, Hitt & Mendez's** working paper, which I read in full; the two studies use
    related but distinct measures and I did not confirm that Borgonovi & Biecek report the same number.
20. **Spray & Reckase (1987) on item parameter estimation error.** Known only through Thompson's (2007)
    one-sentence characterization. Not read.
21. **Hartig & Buchholz (2012), Debeer et al. (2014), Weirich et al. (2016), Wise et al. (1989).** All cited
    at second hand via Wu et al. (2019). Not read.
22. **The four online-attrition sources in §6.4.** I read results text from the publisher pages but did **not**
    verify DOIs, author lists, or journal metadata for any of them. Treat the 25%–45% non-completion range as
    indicative only.
23. **The KiTAP children's attention study (§6.3).** DOI 10.3390/bs9010007 was not verified against Crossref
    and I did not confirm the author list. Cited for the 10-minute/15-minute subtest durations and the
    qualitative fatigue statement only.
24. **Ibrahim & Kazem (2013).** DOI verified in Crossref, but this is a low-profile journal and I read a
    hosted PDF rather than a version of record.
25. **Ellis & Sijtsma (2024), *Psychometrika*.** DOI, authors, journal, volume and pages all verified in
    Crossref, but I read the abstract only and did not check the proof. Cited for its abstract's claim about
    the Spearman–Brown parallelism assumption and nothing else.
26. **The "up to 50% on average" quotation attributed to an Association of Test Publishers newsletter.** A web
    search returned that sentence with a `testpublishers.org` URL. The PDF at that URL extracted as a single
    Thompson article that does not contain the sentence. **Not verified; not used as a source.** Only the
    Thompson & Weiss (2011) attribution of the 50% figure to Weiss & Kingsbury (1984) is verified.
27. **The `icar-project.com` PDF of Condon & Revelle (2014) returns HTTP 404.** I read the typeset published
    version there before it stopped resolving. All numbers were re-confirmed against the `icar-project.org`
    preprint, which resolves. Anyone rechecking should use the DOI or the .org link.
28. **The single biggest gap: no study, anywhere in this set, measures a short adaptive classification test
    administered to children at a cut score in the top few percent of the distribution.** Every item-count
    figure in this document is transferred from adults, from a cut score near the middle of the distribution,
    or from both. That transfer is an assumption, not a finding.
