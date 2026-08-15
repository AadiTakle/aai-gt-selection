# DOK 1 — Decision Metrics for a Screener (as distinct from reliability metrics for a test)

Fact extraction only. No interpretation, no editorializing. Every number and every quoted phrase below was
read out of the source named beside it. Exact quotes are in quotation marks. Anything I could not verify is
flagged inline **and** listed again in the final section.

**Citation verification method.** Every DOI in this document was resolved against the Crossref REST API and
returned a matching record (title, authors, journal, volume, pages, year all confirmed). Publisher sites
(Sage, Wiley, Elsevier, APA) return HTTP 403 to command-line requests; that is Cloudflare bot-blocking, not a
dead link — those pages were retrieved successfully through other means and the DOIs resolve normally in a
browser. Where I could only reach an abstract and not a full text, I say so explicitly at that fact.

**Field labels.** Each source is tagged with the field it comes from, because transfer across fields is not
automatic. Fields appearing below: medicine / clinical epidemiology, biostatistics, medical decision making,
public health, clinical psychology, educational measurement.

---

## Question 1 — Sensitivity, specificity, PPV, NPV in a screening context

### 1.1 The base-rate result, stated in the psychology literature

**Source.** Meehl, P. E., & Rosen, A. (1955). "Antecedent probability and the efficiency of psychometric
signs, patterns, or cutting scores." *Psychological Bulletin*, 52(3), 194–216. DOI
[10.1037/h0048070](https://doi.org/10.1037/h0048070). PMID 14371890. Free author-hosted full text:
[meehl.umn.edu PDF](https://meehl.umn.edu/sites/meehl.umn.edu/files/files/035antecedentprobability.pdf).
**Field: clinical psychology.** This is the psychology-field statement of the same mathematics that medicine
calls "PPV depends on prevalence."

**The core claim, in the authors' words.** "Since diagnostic and prognostic statements can often be made with
a high degree of accuracy purely on the basis of actuarial or experience tables (referred to hereinafter as
base rates), a psychometric device, to be efficient, must make possible a greater number of correct decisions
than could be made in terms of the base rates alone."

**Their five stated reasons most psychometric devices cannot be evaluated.** Quoted verbatim, abridged:

1. "Base rates are virtually never reported."
2. "In most reports, the distribution data provided are insufficient for the evaluation of the probable
   efficiency of the device in other settings where the base rates are markedly different. Moreover, the
   samples are almost always too small for the determination of optimal cutting lines for various decisions."
3. "Most psychometric devices are reported without cross-validation data. If a psychometric instrument is
   applied solely to the criterion groups from which it was developed, its reported validity and efficiency
   are likely to be spuriously high, especially if the criterion groups are small."
4. "There is often a lack of clarity concerning the type of population in which a psychometric device can be
   effectively applied."
5. "Results are frequently reported only in terms of significance tests for differences between groups rather
   than in terms of the number of correct decisions for individuals within the groups."

**The urn worked example (their illustration of base-rate dominance).** "If I make a practice of inferring
under such circumstances that an observed black marble arose from the first urn, I shall be correct in such
judgments, in the long run, only 16.3% of the time." And: "But this considerable disparity in symptom rate is
overcome by the very low base rate ('antecedent probability of choosing from the first urn'), so that
inference to first-urn origin of black marbles will actually be wrong some 84 times in 100." They then map
the urns onto screening explicitly: "the urns are identified with the subpopulations of patients to be
discriminated (their antecedent probabilities being equated to their base rates in the population to be
examined), and the black marbles are test results of a certain ('positive') kind. The proportion of black
marbles in one urn is the valid positive rate, and in the other is the false positive rate."

**Their brain-damage worked example (this is the PPV threshold in base-rate form).** "If a certain cutting
score identifies 80% of patients with organic brain damage (high scores being indicative of damage) but is
also exceeded by 15% of the nondamaged sent for evaluation, in order for the psychometric decision 'brain
damage present' to be more often true than false, the ratio of actually brain-damaged to nondamaged cases
among all seen for testing must be at least one to five (.19)." That is: sensitivity .80, false-positive rate
.15, and PPV only exceeds .50 once the base rate exceeds about .19.

**Their statement that discrimination alone does not license use.** They note the existence of cases "where
base-rate asymmetry (P ≠ Q) counteracts the (p1 – p2) discrepancy, leading to the paradoxical consequence
that deciding on the basis of more information can actually worsen the chances of a correct decision. The
apparent absurdity of such an idea has often misled psychologists into behaving as though the establishment
of 'validity' or 'discrimination,' that is, that p1 ≠ p2, indicates that a procedure should be used in
decision making."

**Their psychotherapy-continuation worked example.** Test correctly identifies 75% of continuers and also
flags 40% of premature terminators; base rate of premature termination 50%. "Correct selection of patients
can be made with the given cutting score on the test 65% of the time, since p1/(p1 + p2) = .75/(.75 + .40) =
.65." They add: "the efficiency of the test would be exaggerated if the base rate for continuation in therapy
were actually .70, but the efficiency were evaluated solely on the basis of a research study containing equal
groups of continuers and noncontinuers, that is, if it were assumed that P = .50."

**Their Rotter sentence-completion worked example.** 85% of "maladjusted" girls correctly classified, 15% of
"adjusted" girls incorrectly classified. "Since p1/(p1 + p2) = .85/(.85 + .15) = .85, the overall hits in
diagnosis with the test will not improve on classification based solely on the base rates unless the
proportion of adjusted girls is less than .85."

**Their stated conclusion about fixed cut scores.** From the paper: "no one cutting line is maximally
efficient for clinical settings in which the base rates of the criterion groups in the population are
different. Furthermore, different cutting lines may be necessary for various decisions within the same
population." And, in a passage broken across a PDF line break so I quote it in two pieces: "base rates for
any given behavior or pathology differ from one clinical setting to another" / "an inflexible cutting score
should not be advocated for any psychometric device."

**Formula and assumption.** Meehl & Rosen state the two-category form in the notation P = base rate of actual
positives, p1 = valid positive rate, p2 = false positive rate, so that PPV = P·p1 / (P·p1 + Q·p2), which in
their simplification with equal base rates reduces to p1/(p1 + p2). *Assumption:* the sample on which p1 and
p2 were estimated is drawn from the same population whose base rate P is being applied. They explicitly warn
that studies with artificially equal criterion groups violate this.

### 1.2 The same result stated in the medical literature

**Source.** Altman, D. G., & Bland, J. M. (1994). "Statistics Notes: Diagnostic tests 2: predictive values."
*BMJ*, 309(6947), 102. DOI [10.1136/bmj.309.6947.102](https://doi.org/10.1136/bmj.309.6947.102). PMID
8038641. PMC free copy: [PMC2540558](https://pmc.ncbi.nlm.nih.gov/articles/PMC2540558/). **Field: medicine /
medical statistics.**

**Verification status — PARTIAL.** The citation is confirmed against Crossref (exact title, authors, journal,
volume, page, date). **I could not extract the body text**: the PMC record for this 1994 one-page Statistics
Note is a scanned page image with no machine-readable full text, and the BMJ page is paywalled to
command-line retrieval. I am therefore **not** putting a direct quote from this paper in this document. The
paper is well known to state that predictive values depend on prevalence, but I did not read those words
myself, so treat this entry as a pointer, not as evidence.

### 1.3 Which of the four matters most when the screener's job is to avoid missing cases

**Source (the rule itself).** Centre for Evidence-Based Medicine, University of Oxford. "SpPin and SnNout."
[https://www.cebm.ox.ac.uk/resources/ebm-tools/sppin-and-snnout](https://www.cebm.ox.ac.uk/resources/ebm-tools/sppin-and-snnout).
**Field: evidence-based medicine.** The mnemonic is conventionally attributed to Sackett and colleagues'
*Evidence-Based Medicine* (Churchill Livingstone, 1997); I did not obtain that book, so the attribution below
rests on the CEBM page and the Pewsner paper in 1.4, both of which credit Sackett.

**Exact statements from the CEBM page.**
- "When a sign, test or symptom has a high sensitivity, a negative result rules out the diagnosis."
- "When a sign, test or symptom has an extremely high specificity (say, over 95%), a positive result tends to
  rule in the diagnosis."
- "Often the best place to look for SpPins and SnNouts is at the highest (for SpPins) and lowest (for
  SnNouts) levels of multilevel likelihood ratios."

**Explicit application to screening vs. confirmation.** Health Knowledge (UK public-health e-learning,
sourced to Campbell, Machin & Walters, *Medical Statistics*, Wiley 2007, and to Sackett et al. 1997):
"Recalling Sackett's mnemonics SpPin and SnNout, for diagnosis we want a positive test to rule people in, so
we want a high specificity. For screening we want a negative test to rule people out so we want a high
sensitivity."
[https://www.healthknowledge.org.uk/e-learning/statistical-methods/specialists/diagnostic-tests](https://www.healthknowledge.org.uk/e-learning/statistical-methods/specialists/diagnostic-tests).
**Field: public health / medical statistics.** This is a teaching resource, not a peer-reviewed paper — noted
as such.

### 1.4 The published caution against relying on sensitivity alone

**Source.** Pewsner, D., Battaglia, M., Minder, C., Marx, A., Bucher, H. C., & Egger, M. (2004). "Ruling a
diagnosis in or out with 'SpPIn' and 'SnNOut': a note of caution." *BMJ*, 329(7459), 209–213. DOI
[10.1136/bmj.329.7459.209](https://doi.org/10.1136/bmj.329.7459.209). Free full text:
[PMC487735](https://pmc.ncbi.nlm.nih.gov/articles/PMC487735/). **Field: medicine / clinical epidemiology.**

**Their stated correction.** "The likelihood ratio associated with a negative test result does not depend on
its sensitivity alone, as suggested by the SnNOut rule, but also on its specificity."

**Their worked counterexample, with exact numbers.** Clinical criteria for diagnosis of Alzheimer's disease:
sensitivity 93%, specificity 23%. "However, despite this high sensitivity, the likelihood ratio of a negative
test was a modest 0.3, because of the test's low specificity of 23% (100 - 93/23 = 0.3...). Indeed, in the
population studied, the probability of Alzheimer's disease, given a negative test, was 25%."

**Their conclusion.** "The power to rule out a diagnosis thus depends on both sensitivity and specificity."

---

## Question 2 — ROC, AUC, and partial AUC

### 2.1 McClish (1989), the origin of partial AUC

**Source.** McClish, D. K. (1989). "Analyzing a Portion of the ROC Curve." *Medical Decision Making*, 9(3),
190–195. DOI [10.1177/0272989X8900900307](https://doi.org/10.1177/0272989X8900900307). PMID 2668680. **Field:
medical decision making / biostatistics.**

**Verification status — ABSTRACT ONLY.** The article body is paywalled at Sage. Everything quoted below is
from the published abstract, which I retrieved verbatim from three independent sources (Sage landing page,
PubMed, Crossref-indexed record) that agree word for word.

**The stated problem with whole-curve AUC (author's own words).** "The area under the ROC curve is a common
index summarizing the information contained in the curve. When comparing two ROC curves, though, problems
arise when interest does not lie in the entire range of false-positive rates (and hence the entire area)."

**What the method is.** "Numerical integration is suggested for evaluating the area under a portion of the
ROC curve. Variance estimates are derived. The method is applicable for either continuous or rating scale
binormal data, from independent or dependent samples."

**What was demonstrated.** "An example is presented which looks at rating scale data of computed tomographic
scans of the head with and without concomitant use of clinical history. The areas under the two ROC curves
over an a priori range of false-positive rates are examined, as well as the areas under the two curves at a
specific point." Note the phrase "a priori range" — the range is prespecified, not chosen after seeing the
data.

**Standardized partial AUC formula — SECOND-HAND SOURCE, FLAGGED.** I could not read McClish's own derivation
(paywall). The formula as reported by MedCalc's documentation, which cites "McClish DK (1989) Analyzing a
Portion of the ROC Curve. Medical Decision Making 9:190-195," is:

    pAUCs = ½ × ( 1 + (pAUC − pAUC_min) / (pAUC_max − pAUC_min) )

MedCalc states: "The Standardized pAUC (pAUCs) has a maximum value of 1 and a minimum value 0.5. Therefore it
allows you to view the partial area on the same scale as the total area under the ROC curve." Source:
[https://www.medcalc.org/en/manual/roc-curve-partial-area.php](https://www.medcalc.org/en/manual/roc-curve-partial-area.php).
*Assumptions:* pAUC_min is the area under the chance diagonal over the chosen interval and pAUC_max is the
area of the full rectangle over that interval; the rescaling is only interpretable relative to the specific
interval chosen, so two standardized pAUCs computed over different intervals are not comparable.

### 2.2 Walter (2005) — IMPORTANT: this source argues AGAINST partial AUC, not for it

**Source.** Walter, S. D. (2005). "The partial area under the summary ROC curve." *Statistics in Medicine*,
24(13), 2025–2040. DOI [10.1002/sim.2103](https://doi.org/10.1002/sim.2103). PMID 15900606. **Field:
biostatistics / meta-analysis methodology.**

**This is a correction to the premise of the research question.** The question as posed assumed Walter (2005)
supports partial AUC standardization. It does not. Walter's stated conclusion is the opposite. Quoting the
abstract verbatim:

> "The results suggest several disadvantages of the partial AUC measures. In contrast to earlier findings
> with the full AUC, the partial AUC is rather sensitive to heterogeneity. Comparisons between tests are more
> difficult, especially if an empirical truncation process is used. Finally, the partial area lacks a useful
> symmetry property enjoyed by the full AUC. Although the partial AUC may sometimes have clinical appeal, on
> balance the use of the full AUC is preferred."

**Walter's statement of what pAUC measures (he does state this fairly before rejecting it).** "When using the
partial AUC, one considers only those regions of the ROC space where data have been observed, or which
correspond to clinically relevant values of test sensitivity or specificity."

**Critical scope limit on Walter's negative conclusion.** Walter's paper is about the **summary ROC (SROC)
curve in meta-analysis**, not a single-study ROC curve. From the abstract: "The AUC measure is also used in
meta-analyses, where each component study provides an estimate of the test sensitivity and specificity. These
estimates are then combined to calculate a summary ROC (SROC) curve... In this paper, we extend the idea of
using the partial AUC to SROC curves in meta-analysis." His stated objection — "the partial AUC is rather
sensitive to heterogeneity" — is *inter-study* heterogeneity, which does not exist in a single-sample
screener evaluation. Do not cite Walter as a general argument against pAUC in a single-study setting; he did
not test that setting.

**He also proposed a rescaling.** "A scaled partial area measure is also proposed to restore the property
that the summary measure should range from 0 to 1."

### 2.3 A later paper that partly rehabilitates standardized pAUC

**Source.** Ma, H., Bandos, A. I., Rockette, H. E., & Gur, D. (2013). "On use of partial area under the ROC
curve for evaluation of diagnostic performance." *Statistics in Medicine*, 32(20), 3449–3458. DOI
[10.1002/sim.5777](https://doi.org/10.1002/sim.5777). **Field: biostatistics / radiology methodology.**
(Crossref confirms authors, journal, volume 32, pages 3449–3458.)

**Their framing of the practice gap.** "This summary index is considered to be more practically relevant than
the area under the entire ROC curve (AUC), but because of several perceived limitations, it is not used as
often. To improve interpretation, results for pAUC analysis are frequently reported using a rescaled index
such as the standardized partial AUC proposed by McClish (1989)."

**Their two proven results.** "First, we mathematically prove that the 'standardized' pAUC increases with
increasing range of interest for practically common ROC curves. Second, using comprehensive numerical
investigations, we demonstrate that, contrary to common belief, the uncertainty about the estimated
standardized pAUC can either decrease or increase with an increasing range of interest."

**Their conclusion.** "Our results indicate that the partial AUC could frequently offer advantages in terms
of statistical uncertainty of the estimation. In addition, selection of a wider range of interest will likely
lead to an increased estimate even for standardized pAUC."

*Consequence, stated as fact not interpretation:* because standardized pAUC provably increases with the width
of the chosen range, a standardized pAUC figure is meaningless unless the range is reported alongside it, and
two standardized pAUCs computed on different ranges cannot be compared.

### 2.4 Direct empirical demonstration that AUC differences do not track decision value

**Source.** Vickers, A. J., & Elkin, E. B. (2006) — full citation in Question 7 below. **Field: medical
decision making.** Three findings from their seminal-vesicle-invasion data, quoted verbatim:

- "although the expanded prediction model has a better AUC than the basic model (0.82 vs. 0.80), this makes
  no practical difference: the two curves are essentially overlapping."
- "the basic model has a considerably larger AUC than the simple clinical rule, yet for pt's above 2%, there
  is essentially no difference between the two models."
- "at some low values of pt, using the simple clinical rule actually leads to a poorer outcome than simply
  treating everyone, despite a reasonably high AUC (0.72)."

And from Vickers, Van Calster & Steyerberg (2016), on the same point: "Compare this conclusion from figure 1
with statistics such as the sensitivity and specificity of the marker (88% and 33%, respectively), the area
under the curve or Brier score of the model (0.822 and 0.150), or the calibration plot... It is not at all
clear how we could know whether the model's discrimination or calibration was sufficient to justify clinical
use."

---

## Question 3 — Youden's J index and number needed to screen

### 3.1 Youden (1950)

**Source.** Youden, W. J. (1950). "Index for rating diagnostic tests." *Cancer*, 3(1), 32–35. DOI
[10.1002/1097-0142(1950)3:1<32::AID-CNCR2820030106>3.0.CO;2-3](<https://doi.org/10.1002/1097-0142(1950)3:1%3C32::AID-CNCR2820030106%3E3.0.CO;2-3>).
PMID 15405679. Crossref confirms: Youden, W. J., *Cancer*, vol. 3, pp. 32–35, 1950. **Field: medicine /
statistics.** The paper has no abstract. I obtained the body text through a retrieval of the article content;
quotes below are from that text and the OCR is imperfect in places, so I quote only passages that came
through cleanly.

**The formula.** J = sensitivity + specificity − 1. In Youden's 2×2 notation, with (a+b) diseased of whom *a*
are correctly diagnosed and *b* are false negatives, and (c+d) controls of whom *d* are correctly diagnosed
and *c* are false positives: J = (a−b)/(a+b) averaged with (d−c)/(c+d), which he shows reduces to a/(a+b) +
d/(c+d) − 1.

**Youden's own derivation, quoted.** "the proportion of diseased individuals correctly classified is a/(a+b).
It seems appropriate to charge against this the proportion, b/(a+b), incorrectly classified, leaving [the
difference] as a measure of the success of the test on the diseased group. As further evidence that this is a
reasonable measure, note that, if a = b, or in other words if the test is equally likely to report a diseased
individual negative as positive, it has no discriminative power on the diseased group."

**His statement of the index and its interpretation.** "The index, J, is seen to be also equal to the sum,
diminished by unity, of the two fractions showing the proportions correctly diagnosed for the diseased and
control groups. The expression may also be written as a fraction in which the numerator is made up of the
product of the numbers correctly diagnosed diminished by the product of the numbers incorrectly classified.
The denominator is the product of the totals in the diseased and control groups."

**Range.** J takes "the value zero if the test [gives the same] proportion of positive tests for [both]
control and diseased groups," and "the value unity ... when there [are] neither false positives nor false
negatives resulting [from] the test."

**THE ASSUMPTION, IN YOUDEN'S OWN WORDS — this is the load-bearing sentence.** "Let the average of these two
be taken as the index. **This assumes false positives to be as undesirable as false negatives.**"

Smits (2010, below) independently confirms this quote and gives the page: Youden stated the index "assumes
false positives to be as undesirable as false negatives" ([Youden 1950], p. 33), and that it "is independent
of the relative sizes of the control and diseased groups" (Feature 5, p. 33).

### 3.2 The published objection to Youden's J as a threshold rule

**Source.** Smits, N. (2010). "A note on Youden's J and its cost ratio." *BMC Medical Research Methodology*,
10, 89. DOI [10.1186/1471-2288-10-89](https://doi.org/10.1186/1471-2288-10-89). Free full text:
[PMC2959030](https://pmc.ncbi.nlm.nih.gov/articles/PMC2959030/). **Field: biostatistics / psychometrics.**

**His stated finding, verbatim from the abstract.** "When using this index, one implicitly uses decision
theory with a ratio of misclassification costs which is equal to one minus the prevalence proportion of the
disease. It is doubtful whether this cost ratio truly represents the decision maker's preferences. Moreover,
in populations with a different prevalence, a selected threshold is optimal with reference to a different
cost ratio."

**His summary.** "The Youden index is not a truly optimal decision rule for setting thresholds because its
cost ratio varies with prevalence. Researchers should look into their cost ratio and employ it in a decision
theoretic framework to obtain genuinely optimal thresholds."

**His notation for J.** J_c = SE_c + SP_c − 1, "calculated for each threshold c, and the value c*, which
achieves a maximum, is referred to as the 'optimal' threshold."

### 3.3 Rembold (1998), number needed to screen

**Source.** Rembold, C. M. (1998). "Number needed to screen: development of a statistic for disease
screening." *BMJ*, 317(7154), 307–312. DOI
[10.1136/bmj.317.7154.307](https://doi.org/10.1136/bmj.317.7154.307). PMID 9685274. Free full text:
[PMC28622](https://pmc.ncbi.nlm.nih.gov/articles/PMC28622/). Crossref confirms sole author Christopher M
Rembold, BMJ 317, pp. 307–312, 1 Aug 1998. **Field: medicine / public health.**

**Definition, verbatim.** "Number needed to screen is defined as the number of people that need to be
screened for a given duration to prevent one death or adverse event."

**Extended definition from the key-messages box.** "Number needed to screen is a new statistic defined as the
number of people that need to be screened for a given duration to prevent one death or one adverse event. It
can be directly calculated from clinical trials of disease screening, and can also be estimated from clinical
trials of treatment and the prevalence of so far unrecognised or untreated disease."

**The estimation formula and its stated assumption.** "From clinical trials that measured treatment benefit,
the number needed to screen was estimated as the number needed to treat from the trial divided by the
prevalence of heretofore unrecognised or untreated disease."

    NNS ≈ NNT / (prevalence of unrecognised or untreated disease)

*Assumptions embedded in that formula, as stated by Rembold:* (a) the trial's NNT transfers to the screened
population; (b) the relevant prevalence is not the prevalence of the condition but the prevalence of the
condition *that is not already known and treated*; (c) results must be normalised to a stated duration —
"This normalisation was [required] to allow comparison between trials with differing durations."

**Worked examples, exact numbers, all for a 5-year duration.**

| Screening strategy | NNS (5 years) | Endpoint |
| --- | --- | --- |
| Dyslipidaemia (LDL > 4.14 mmol/l), then pravastatin | 418 | total mortality |
| Hypertension, then diuretic-based treatment | 274 to 1307 (10 mm Hg vs 6 mm Hg diastolic reduction respectively) | total mortality |
| Haemoccult testing | 1374 | death from colon cancer |
| Mammography, women aged 50–59 | 2451 | death from breast cancer |

Rembold's own gloss on the first figure: "This indicates that one death in 5 years could be prevented by
screening 418 people."

**His stated conclusion.** "These data allow the clinician to prioritise screening strategies. Of the
screening strategies evaluated, screening for, and treatment of, dyslipidaemia and hypertension seem to
produce the largest clinical benefit."

**His stated limitation.** "Unfortunately, there are no trials evaluating the prevention of death by
screening for atherosclerotic risk factors. I therefore estimated number needed to screen values for
atherosclerotic risk factors on the basis of the results of treatment clinical trials and the prevalence of
inadequately treated risk factors." The 418 and 274–1307 figures are therefore *estimates* from treatment
trials, not *direct calculations* from screening trials; the 1374 and 2451 figures are direct. He also
reports that "Screening with haemoccult testing and mammography significantly decreased cancer specific, but
not total, mortality."

---

## Question 4 — Incremental validity as the standard a new screener must meet

### 4.1 Sechrest (1963)

**Source.** Sechrest, L. (1963). "Incremental Validity: a Recommendation." *Educational and Psychological
Measurement*, 23(1), 153–158. DOI
[10.1177/001316446302300113](https://doi.org/10.1177/001316446302300113). Crossref confirms author, journal,
volume 23, issue 1, pages 153–158, April 1963. **Field: educational and psychological measurement.**

**Verification status — CITATION VERIFIED, FULL TEXT NOT OBTAINED.** The article is behind a Sage paywall
("Restricted access"; I reached only the landing page and reference list). **I did not read Sechrest's own
words.** What follows is a second-hand quotation, clearly marked as such.

**Second-hand quotation with page number.** A peer-reviewed article quoting Sechrest directly writes: "A new
test must show some '*increment* in predictive efficiency' beyond established measures (Sechrest, 1963, p.
154), and this increment will only emerge if the new test taps unique variance not predicted by current
measures. Establishing incremental validity is a theory-driven exercise wherein the researcher reviews past
research on a criterion to identify established predictors that will be used as control variables (Sechrest,
1963)." Source of the second-hand quote: an article in *Personality and Individual Differences*, "Looking for
validity or testing it? The perils of stepwise regression, extreme-scores analysis, heteroscedasticity, and
measurement error,"
[https://www.sciencedirect.com/science/article/abs/pii/S0191886910004575](https://www.sciencedirect.com/science/article/abs/pii/S0191886910004575).
**Field: personality/individual differences psychology.**

**Standard operationalisation, as described in that same secondary source.** "In terms of including controls,
which are usually entered first in the regression, it is advisable to be conservative and to include more
rather than fewer variables to avoid 'omitted variable bias'... In the second step, the new measure (or
measures) is added and the test of the significance of its coefficient (or coefficients) or a nested *F*-test
will show whether the *R*-square changes significantly." *Assumptions of that regression test, as stated
there:* "homoscedastic regression residuals, perfectly-measured independent variables, and a non-truncated
sample."

*Note on the last assumption, which matters directly for a talent screener:* "non-truncated sample" means
incremental validity estimated on an already-selected group (e.g. only applicants who were admitted) is
biased.

**Priority note.** A secondary source states the term was first used by Meehl in 1959 rather than Sechrest in
1963. I did **not** verify a 1959 Meehl paper and am not asserting it. Flagged in the final section.

### 4.2 Hunsley & Meyer (2003)

**Source.** Hunsley, J., & Meyer, G. J. (2003). "The Incremental Validity of Psychological Testing and
Assessment: Conceptual, Methodological, and Statistical Issues." *Psychological Assessment*, 15(4), 446–455.
DOI [10.1037/1040-3590.15.4.446](https://doi.org/10.1037/1040-3590.15.4.446). PMID 14692841. Crossref
confirms all metadata. **Field: clinical psychology.**

**Verification status — ABSTRACT VERIFIED, FULL TEXT NOT OBTAINED.** APA PsycNet is paywalled. The abstract
below is verbatim and confirmed identical across PubMed, APA PsycNet, and the DOI landing page. Their
specific numeric criteria for "how large an increment is meaningful" are in the body of the paper, which **I
could not read.** Flagged.

**Abstract, verbatim.** "There has been insufficient effort in most areas of applied psychology to evaluate
incremental validity. To further this kind of validity research, the authors examined applicable research
designs, including those to assess the incremental validity of test instruments, of test-informed clinical
inferences, and of newly developed measures. The authors also considered key statistical and measurement
issues that can influence incremental validity findings, including the entry order of predictor variables,
how to interpret the size of a validity increment, and possible artifactual effects in the criteria selected
for incremental validity research. The authors concluded by suggesting steps for building a cumulative
research base concerning incremental validity and by describing challenges associated with applying
nomothetic research findings to individual clinical cases."

**Three stated design targets, extracted from that abstract:** (a) entry order of predictors must be
specified and defended; (b) the *size* of the increment must be interpreted, not merely its significance; (c)
the criterion itself can produce artifactual increments.

**Second-hand quotation with page number.** A peer-reviewed article quotes Hunsley & Meyer's criterion
directly: a new measure must "provide[] information that was formerly unavailable or less adequately
obtained" (Hunsley & Meyer, 2003, p. 449). Source: Knöchelmann, L., Kemmer, J. A., & Cohrs, J. C.,
"Intellectual humility: Validation and comparison of four self-report scales in the German context," *Social
Psychological Bulletin*, 21. DOI [10.32872/spb.12465](https://doi.org/10.32872/spb.12465). Marked as
second-hand.

### 4.3 The companion papers in the same 2003 special section (both citation-verified)

**Hunsley, J. (2003).** "Introduction to the Special Section on Incremental Validity and Utility in Clinical
Assessment." *Psychological Assessment*, 15(4), 443–445. DOI
[10.1037/1040-3590.15.4.443](https://doi.org/10.1037/1040-3590.15.4.443). **Field: clinical psychology.**
Abstract, verbatim: "The lack of replicated incremental validity research limits the ability of psychologists
to establish their assessment practices on a solid empirical footing." The section addressed "(a) the
evaluation of the magnitude of validity increments, (b) the use of incremental validity data for test
development and validation, (c) the costs of assessment, (d) the use of multi-informant and multimethod
assessments, and (e) the treatment utility of assessment."

Hunsley's definition, as quoted with page number in a peer-reviewed secondary source (Canivez 2013):
incremental validity is the "extent to which a measure adds to the prediction of a criterion beyond what can
be predicted with other data" (Hunsley, 2003, p. 443).

**Haynes, S. N., & Lench, H. C. (2003).** "Incremental Validity of New Clinical Assessment Measures."
*Psychological Assessment*, 15(4), 456–466. DOI
[10.1037/1040-3590.15.4.456](https://doi.org/10.1037/1040-3590.15.4.456). Crossref confirms authors, volume,
pages. **Field: clinical psychology.** Abstract, verbatim, and directly on point for a screener that is being
justified on cost grounds:

> "Incremental validity is defined as the degree to which a measure explains or predicts a phenomenon of
> interest, relative to other measures. Incremental validity can be evaluated on several dimensions, such as
> sensitivity to change, diagnostic efficacy, content validity, treatment design and outcome, and convergent
> validity. Indices of incremental validity can vary depending on the criterion measures, comparison
> measures, and individual differences in samples... Incremental validity contributes to, but is different
> from, cost-benefits, which reflect the cost of acquiring the data and the benefits from the data. The
> impact of an incremental validity index on whether a measure is selected will be moderated by the cost of
> acquiring the new data, the importance of the measured phenomenon, and the clinical utility of the new
> data."

**Their stated conditionality (this is a limitation, in their words):** incremental validity indices "can
vary depending on the criterion measures, comparison measures, and individual differences in samples." There
is no single incremental validity number for an instrument.

---

## Question 5 — Calibration vs. discrimination

### 5.1 Van Calster et al. (2019), the "Achilles heel" paper

**Source.** Van Calster, B., McLernon, D. J., van Smeden, M., Wynants, L., & Steyerberg, E. W., on behalf of
Topic Group 'Evaluating diagnostic tests and prediction models' of the STRATOS initiative (2019).
"Calibration: the Achilles heel of predictive analytics." *BMC Medicine*, 17, 230. DOI
[10.1186/s12916-019-1466-7](https://doi.org/10.1186/s12916-019-1466-7). Open access. **Field: medicine /
clinical epidemiology / biostatistics.**

**The statement that separates the two properties.** "It is often overlooked that estimated risks can be
unreliable even when the algorithms have good discrimination. For example, risk estimates may be
systematically too high for all patients irrespective of whether they experienced the event or not. The
accuracy of risk estimates, relating to the agreement between the estimated and observed number of events, is
called 'calibration'."

**The observed practice gap.** "Systematic reviews have found that calibration is assessed far less often
than discrimination, which is problematic since poor calibration can make predictions misleading."

**Why it matters for a decision threshold, in their words.** "Calibration is especially important when the
aim is to support decision-making, even when discrimination is moderate."

**THE CALIBRATION HIERARCHY — four levels, quoted verbatim.**

> "According to four increasingly stringent levels of calibration, models can be calibrated in the mean,
> weak, moderate, or strong sense."

**Level 1 — mean calibration (calibration-in-the-large).** "First, to assess 'mean calibration' (or
'calibration-in-the-large'), the average predicted risk is compared with the overall event rate. When the
average predicted risk is higher than the overall event rate, the algorithm overestimates risk in general.
Conversely, underestimation occurs when the observed event rate is higher than the average predicted risk."

**Level 2 — weak calibration.** "Second, 'weak calibration' means that, on average, the model does not over-
or underestimate risk and does not give overly extreme (too close to 0 and 1) or modest (too close to disease
prevalence or incidence) risk estimates. Weak calibration can be assessed by the calibration intercept and
calibration slope. The calibration slope evaluates the spread of the estimated risks and has a target value
of 1. A slope < 1 suggests that estimated risks are too extreme, i.e., too high for patients who are at high
risk and too low for patients who are at low risk. A slope > 1 suggests the opposite, i.e., that risk
estimates are too moderate. The calibration intercept, which is an assessment of calibration-in-the-large,
has a target value of 0; negative values suggest overestimation, whereas positive values suggest
underestimation."

**Level 3 — moderate calibration.** "Third, moderate calibration implies that estimated risks correspond to
observed proportions, e.g., among patients with an estimated risk of 10%, 10 in 100 have or develop the
event. This is assessed with a flexible calibration curve to show the relation between the estimated risk (on
the x-axis) and the observed proportion of events (y-axis), for example, using loess or spline functions. A
curve close to the diagonal indicates that predicted risks correspond well to observed proportions."

Their explicit warning that levels 2 and 3 are not interchangeable: "Note that a calibration intercept close
to 0 and a calibration slope close to 1 do not guarantee that the flexible calibration curve is close to the
diagonal."

**Level 4 — strong calibration.** "Fourth, strong calibration means that the predicted risk corresponds to
the observed proportion for every possible combination of predictor values; this implies that calibration is
perfect and is a utopic goal."

**Sample-size requirement for a calibration curve — exact number.** "To obtain a precise calibration curve, a
sufficiently large sample size is required; a minimum of 200 patients with and 200 patients without the event
has been suggested, although further research is needed to investigate how factors such as disease prevalence
or incidence affect the required sample size. In small datasets, it is defendable to evaluate only weak
calibration by calculating the calibration intercept and slope."

**Their stated conclusion.** "Poorly calibrated predictive algorithms can be misleading, which may result in
incorrect and potentially harmful clinical decisions... Together with the phenomenon of population drifts,
models ideally require continued monitoring in local settings in order to maximize their benefit over time.
This argument will become even more vital with the growing popularity of highly flexible algorithms."

### 5.2 The primary source of the hierarchy, and the proof that ties calibration to decisions

**Source.** Van Calster, B., Nieboer, D., Vergouwe, Y., De Cock, B., Pencina, M. J., & Steyerberg, E. W.
(2016). "A calibration hierarchy for risk models was defined: from utopia to empirical data." *Journal of
Clinical Epidemiology*, 74, 167–176. DOI
[10.1016/j.jclinepi.2015.12.005](https://doi.org/10.1016/j.jclinepi.2015.12.005). Crossref confirms all
metadata. **Field: clinical epidemiology.** The 2019 BMC Medicine paper cites this as reference [4] for the
four levels.

**Abstract, verbatim, including the decision-theoretic result.**

> "Calibrated risk models are vital for valid decision support. We define four levels of calibration and
> describe implications for model development and external validation of predictions... A common definition
> of calibration is 'having an event rate of R% among patients with a predicted risk of R%,' which we refer
> to as 'moderate calibration.' Weaker forms of calibration only require the average predicted risk (mean
> calibration) or the average prediction effects (weak calibration) to be correct. 'Strong calibration'
> requires that the event rate equals the predicted risk for every covariate pattern. This implies that the
> model is fully correct for the validation setting. We argue that this is unrealistic: the model type may be
> incorrect, the linear predictor is only asymptotically unbiased, and all nonlinear and interaction effects
> should be correctly modeled. **In addition, we prove that moderate calibration guarantees nonharmful
> decision making.** Finally, results indicate that a flexible assessment of calibration in small validation
> data sets is problematic."

**Their stated conclusion.** "Strong calibration is desirable for individualized decision support but
unrealistic and counter productive by stimulating the development of overly complex models. Model development
and external validation should focus on moderate calibration."

**And in the body:** "In support of this view, we proved that moderate calibration guarantees that clinically
nonharmful decisions are made based on the model."

*This is the specific link between calibration and a decision threshold:* moderate calibration is the level
at which acting on a probability cut-point is provably non-harmful relative to the default. Mean and weak
calibration do not carry that guarantee; strong calibration is stated by the authors to be unattainable.

---

## Question 6 — Decision consistency and decision accuracy, as distinct from reliability

### 6.1 Livingston & Lewis (1995)

**Source.** Livingston, S. A., & Lewis, C. (1995). "Estimating the Consistency and Accuracy of
Classifications Based on Test Scores." *Journal of Educational Measurement*, 32(2), 179–197. DOI
[10.1111/j.1745-3984.1995.tb00462.x](https://doi.org/10.1111/j.1745-3984.1995.tb00462.x). Crossref confirms
all metadata. **Free full text of the ETS technical-report version** (ETS-RR-93-48, Oct 1993, same method and
same text):
[ERIC ED386492 PDF](https://files.eric.ed.gov/fulltext/ED386492.pdf). **Field: educational measurement /
psychometrics.** All quotes below are from the ETS report, which I read in full.

**THE TWO DEFINITIONS, VERBATIM.**

- **Decision accuracy** = "the agreement between the classifications based on the form actually taken and the
  classifications that would be made on the basis of the test-takers' true scores."
- **Decision consistency** = "the agreement between the classifications based on the form actually taken and
  the classifications that would be made on the basis of an alternate form."

They restate this in their summary: the method "estimates statistics describing the agreement between
classifications based on alternate forms of a test (decision consistency) and between classifications based
on one form and classifications based on test-takers' true scores (decision accuracy)."

**Their explicit note that the two are observationally different in kind.** "The decision accuracy statistics
estimated by this method describe the agreement between classifications based on an observable variable
(scores on one form of a test) and classifications based on an unobservable variable (the test-takers' true
scores). Therefore, these estimates cannot be evaluated on the basis of actual responses from real, live
test-takers. In contrast, the decision consistency statistics describe the agreement between classifications
based on two observable variables (scores on two forms of the same test)."

**THE RELATIONSHIP TO RELIABILITY — this is the key fact for the question asked.** In Livingston & Lewis's
method, the reliability coefficient is an *input*, not the answer. Their stated inputs are exactly four:

> "(1) the distribution of the scores on one form of the test, observed or estimated for the test-taker
> population, (2) the reliability coefficient of the scores, computed or estimated for the test-taker
> population, (3) the maximum and minimum possible scores on the test, and (4) the cut-points that separate
> the categories."

And: "It requires as input only the distribution of scores on one form, the minimum and maximum possible
scores, the cut-points used for classification, and the reliability coefficient. It will work for any test
score for which this information is available, regardless of the format of the test."

Because the cut-point location and the score distribution are separate inputs from reliability, the same
reliability coefficient yields different decision accuracy and decision consistency values at different
cut-points. The reliability coefficient alone does not determine either statistic.

**Their reported empirical accuracy of the method.** "An evaluation of the method showed that the estimates
of the percent of test-takers correctly classified and the percent consistently classified were within one
percentage point of the actual values in most cases."

**Their reported robustness result, with its stated exception.** "Although the estimated effective test
length and the estimates of the conditional standard error of measurement are sensitive to changes in the
specified minimum and maximum possible scores, the estimates of the decision accuracy and decision
consistency statistics are not."

**Their observed ordering of the two statistics.** "Notice that the agreement indicated by Tables 3 and 4
[decision consistency] is not as strong as the agreement indicated by [Tables 1 and 2, decision accuracy]."

**STATED ASSUMPTIONS OF THE METHOD (all in their words).**
1. "The reliability of the score is used to estimate its effective test length in terms of discrete items."
2. "The true score distribution is estimated by fitting a four-parameter beta model."
3. "The conditional distribution of scores on an alternate form, given the true score, is estimated from a
   binomial distribution based on the estimated effective test length."
4. "The agreement between classifications on two alternate forms is estimated by assuming conditional
   independence, given the true score."
5. "The effective test length corresponding to a test score is the number of discrete, dichotomously scored,
   locally independent, equally difficult items required to produce a total score of the same reliability."
6. "the computational procedure requires the scores to be expressed as integers. The cut-points are assumed
   to be halfway between the highest score in one category and the lowest score in the next."

**Reliability coefficients used in their own worked examples:** .852, .603, .891 (three different half-tests
in the evaluation study).

### 6.2 A source explicitly stating that reliability does not answer the classification question

**Source.** Jacobsen, J. (Senior Research Analyst, CASAS). "Using Expected Classification Accuracy and
Classification Consistency to Guide the Test Development Process for an Adult Education Assessment with
Multiple Cut Scores." CASAS research report.
[PDF](https://www.casas.org/docs/default-source/research/using-expected-classification-accuracy-and-classification-consistency-to-guide-the-test-development-process-for-an-adult-education-assessment-with-multiple-cut-scores.pdf?sfvrsn=a4ed325a_2%3FStatus%3DMaster).
**Field: educational measurement.** *Note: this is a test-publisher research report, not a peer-reviewed
journal article. Flagged as such. Its value here is that it quotes and applies the AERA/APA/NCME* Standards.

**The two definitions as given in the** *Standards for Educational and Psychological Testing* **(AERA, APA,
NCME, 2014), quoted through this report.** "Classification accuracy (CA), also referred to as decision
accuracy, measures the extent to which observed classifications of examinees based on the result of a single
replication test administration would agree with their true classification status. Classification consistency
(CC), also referred to as decision consistency, measures the degree to which the observed classifications of
examinees would be the same across replications of the testing procedure (American Educational Research
Association, American Psychological Association, & National Council on Measurement in Education, 2014)."

**The explicit statement that reliability is one approach among several and is not the one that answers the
classification question.** "One way to examine measurement precision is through the reliability coefficients
of classical test theory. Another is through the examination of consistency of scores across replications of
a testing procedure. The *Standards for Educational and Psychological Testing* states that the latter
approach employs different methods to examine this consistency in terms of standard errors, reliability
coefficients per se, generalizability coefficients, error/tolerance ratios, item response theory (IRT)
information functions, or various estimates of classification consistency (AERA, APA, NCME, 2014). **For
criterion-referenced tests that classify examinees into performance categories, a primary focus of
measurement precision should be the degree of classification accuracy (CA) or classification consistency
(CC).**"

**And, on the insufficiency of reliability alone:** "Without the CA or CC, a test user cannot conclude if
classification decisions can be reliably interpreted." (This sentence is split across a two-column table cell
in the PDF; the reconstructed reading is given here and is flagged as reconstructed from a garbled OCR
layout.)

### 6.3 Corroborating peer-reviewed statement

**Source.** "Is This Reliable Enough? Examining Classification Consistency and Accuracy in a
Criterion-Referenced Test." *International Journal of Assessment Tools in Education* (2016), pp. 137–150. DOI
[10.21449/ijate.245198](https://doi.org/10.21449/ijate.245198). **Field: educational measurement.**
*Verification note: Crossref returns the title, journal, year and pages but returns an empty author list, so
I cannot state the authorship. Flagged.*

**Quoted statement.** "In the case of a criterion-referenced certification test the consistency of interest
often concerns the classification (e.g. pass or fail) rather than the individual score. Reliability of
classification can be described in terms of classification consistency or classification accuracy...
Classification accuracy is often expressed in terms of false positive and false negative error rates and
concerns to what extent the classification reflect the test-taker's true score."

**Their stated caveat that the metric presupposes a defensible cut score.** "Indices for classification
consistency and accuracy depend on a well-placed cut-off score not only in terms of statistics. If the
cut-off score does not reflect a suitable boundary between those who have the necessary qualifications and
not then both the result and the consistency and accuracy of that decision loses meaning. This is not only a
reliability issue, but very much a question of validity."

**Also relevant — the mechanism by which reliability and decision consistency come apart.** From "A Practical
Comparison of Decision Consistency Estimates,"
[ERIC EJ1443424 PDF](https://files.eric.ed.gov/fulltext/EJ1443424.pdf) (**field: educational measurement**;
*I did not verify authorship or peer-review status of this item — flagged*): "while a DC estimate of at least
0.85 is a goal, there could be an empirical reason for the value to be lower. For example, if the peak of the
score distribution is at the cut score..." — i.e. decision consistency depends on where the cut sits in the
score distribution, which reliability does not capture.

---

## Question 7 — Net benefit and decision curve analysis

### 7.1 Vickers & Elkin (2006), the original paper

**Source.** Vickers, A. J., & Elkin, E. B. (2006). "Decision Curve Analysis: A Novel Method for Evaluating
Prediction Models." *Medical Decision Making*, 26(6), 565–574. DOI
[10.1177/0272989X06295361](https://doi.org/10.1177/0272989X06295361). PMID 17099194. Free full text:
[PMC2577036](https://pmc.ncbi.nlm.nih.gov/articles/PMC2577036/). Crossref confirms all metadata. **Field:
medical decision making / oncology.** All quotes below are from the full text, which I read.

**WHAT A THRESHOLD PROBABILITY REPRESENTS — the authors' definition, verbatim.**

> "Take the case of a patient deciding whether to undergo treatment for a specific disease. The patient is
> unsure whether or not disease is present... Let us imagine that there is a prediction model available. This
> provides a probability that the patient has the disease: if the probability of disease is near one, the
> patient will ask to be treated; if the probability is near zero, he is likely to forgo treatment. At some
> probability between 0 and 1, the patient will be unsure whether or not to be treated. **This threshold
> probability, pt, is where the expected benefit of treatment is equal to the expected benefit of avoiding
> treatment.**"

**What the threshold encodes about relative harms.** "Now d − b is the consequence of being treated
unnecessarily. If treatment is guided by a prediction model, this is the harm associated with a false-positive
result (compared to a true-negative result). Comparably, a − c is the consequence of avoiding treatment when
it would have been of benefit, that is, the harm from a false-negative result (compared to a true-positive
result). Equation 1 therefore tells us that the threshold probability at which a patient will opt for
treatment is informative of how a patient weighs the relative harms of false-positive and false-negative
results. In this formulation, 'harm' is considered holistically, as the overall effect of all negative
consequences of a particular decision."

**THE NET BENEFIT FORMULA.** In their words: "To place a value on this result, we fix a − c, the value of a
true-positive result, at 1. We then obtain the value of a false-positive result, b − d, as −pt/(1 − pt). We
can now calculate net benefit using the following formula (first attributed to Peirce)":

    Net benefit = (true-positive count / n) − (false-positive count / n) × ( pt / (1 − pt) )

Their gloss: "In this formula, true- and false-positive count is the number of patients with true- and
false-positive results and n is the total number of patients. In short, we subtract the proportion of all
patients who are false-positive from the proportion who are true-positive, weighting by the relative harm of
a false-positive and a false-negative result."

**Their worked arithmetic (exact numbers).** "In table 1, where pt is 10%, the true-positive count is 65, the
false-positive count is 225 and the total number of patients (n) is 902. The net benefit is therefore (65/902)
– (225/902) × (0.1/0.9) = 0.0443."

**Range of the statistic.** "A good model will have a high net benefit: the theoretical range of net benefit
is from negative infinity to the incidence of disease."

**"TREAT ALL" AND "TREAT NONE" REFERENCE LINES — in the authors' words.**

> "The clinical alternative to using a prediction model is to assume that all patients are positive and treat
> them – as might be done for individuals possibly exposed to a dangerous infection easily treated with
> antibiotics – or assume that all patients are negative and offer no treatment, as is done for diseases for
> which there are no proven screening methods."

- **Treat none.** "The true- and false-positive count for considering all patients negative are both 0, and
  hence the net benefit for leaving the seminal vesicle tip in all patients is 0. Hence if the net benefit
  for the prediction model is positive, it is better to use the model than to assume that everyone is
  negative." In the plotting algorithm: "Draw a straight line parallel to the x-axis at y = 0 representing
  the net benefit associated with the strategy of assuming that all patients are negative."
- **Treat all.** "The true- and false-positive count for the strategy of treating all patients are simply the
  number of patients with and without SVI respectively. Calculating net benefit gives: (87/902) − (815/902) ×
  (0.1/0.9) = −0.0039 for the strategy of removing seminal vesicles in all patients."

**A geometric fact they state about the two reference lines.** "Note that as expected, the two lines
reflecting the strategies of 'assume all patients have SVI' (i.e., treat all) and 'assume no patients have
SVI' (i.e., treat none) cross at the prevalence."

**A second geometric fact, directly relevant to a screener with a bounded score range.** "the prediction
model is comparable to the strategy of treat all at low pt and comparable to treat none at high pt. This is
because the probability of SVI predicted by the model ranges from a minimum of 1.8% to a maximum of 84.3%.
Using the model for pt < 1.8% or pt > 84.3% therefore gives the same result as treat all or treat none,
respectively."

**How to read the unit of net benefit.** "The net benefit of 0.062 at a pt of 5% can be interpreted in terms
that use of the model, compared with assuming that all patients are negative, leads to the equivalent of a net
6.2 true-positive results per 100 patients without an increase in the number of false-positive results."

**Converting a net benefit difference into avoided false positives (their formula).** "The reduction in the
number of unnecessary surgeries... per 100 patients is calculated as: (net benefit of the model – net benefit
of treat all)/(pt/(1 − pt)) × 100. This value is net of false negatives, and is therefore the equivalent to
the reduction in unnecessary surgeries without a decrease in the number of patients [with the condition] who
duly have [the] surgery." Their worked case: "at a pt of 5% the net benefit for the prediction model is 0.013
greater than assuming all patients are positive. We can use the net benefit formula to calculate that this is
the equivalent of a net 0.013 × 100/(0.05/0.95) = 25 fewer false-positive results per 100 patients."

**A variant formula for when the screening test itself is costly or harmful.** "If the prediction model
required obtaining data from medical tests that were invasive, dangerous or involved expenditure of time,
effort and money, we can use a slightly different formulation of net benefit." (The variant equation is
rendered as an image in the PMC copy and I could not extract it as text. Flagged.) They add: "If the test
were harmful in any way, it is possible that the net benefit of testing would be very close to or less than
the net benefit of the 'treat all' strategy for some pt."

**AUTHORS' OWN STATED ASSUMPTIONS AND LIMITATIONS — quoted.**
1. "One assumption of our method is that the predicted probability and threshold probability are
   independent." They defend this for their examples and note the exception: "It is possible that a third
   variable, such as age, might influence both the probability of recurrence and treatment preferences... One
   possible example would be gender. If gender was indeed correlated with both outcome and threshold
   probability, the analyst might consider constructing a decision curve separately for men and women."
2. "In the examples presented here, we have not considered the uncertainty associated with model predictions
   and their possible impact on the decision curve."
3. On why a single optimal threshold is usually not available: "Determining a single threshold is only
   possible under two conditions: first, the benefits and harms of action must be well understood; second,
   how benefits and harms are valued must be similar between individuals."
4. On noise at the tails: "Between 50% and 84.3%, the value of the model is sometimes negative: this is due
   to random noise."

### 7.2 Vickers, Van Calster & Steyerberg (2016), the BMJ explainer

**Source.** Vickers, A. J., Van Calster, B., & Steyerberg, E. W. (2016). "Net benefit approaches to the
evaluation of prediction models, molecular markers, and diagnostic tests." *BMJ*, 352, i6. DOI
[10.1136/bmj.i6](https://doi.org/10.1136/bmj.i6). Free full text:
[PMC4724785](https://pmc.ncbi.nlm.nih.gov/articles/PMC4724785/). Crossref confirms all metadata. **Field:
medicine / clinical epidemiology.**

**Their headline claim against sensitivity/specificity/AUC, verbatim from the key-messages box.**

> "Prediction models, diagnostic tests, and molecular markers are traditionally evaluated using statistics
> such as sensitivity and specificity; such statistics do not tell us whether the model, test, or marker
> would do more good than harm if used in clinical practice."
> "Decision analysis attempts to assess clinical value by incorporating clinical consequences, such as the
> benefit of finding disease early or the harm of unnecessary further testing."
> "Net benefit is a simple type of decision analysis in which harm is multiplied by an 'exchange rate' to
> place it on the same scale as benefit."
> "It is relatively straightforward to specify an exchange rate by asking about common medical practice; net
> benefit can also be plotted against a range of exchange rates in what is called a 'decision curve.'"

And from the abstract: "Net benefit is useful for determining whether basing clinical decisions on a model,
marker, or test would do more good than harm. This is in contrast to traditional measures such as
sensitivity, specificity, or area under the curve, which are statistical abstractions not directly informative
about clinical value."

**Net benefit in exchange-rate form.** "We define net benefit as: Benefit − (harm × exchange rate)."

**Their fully worked example with exact numbers.** 100 men, 25 with high grade disease; 72 marker-positive, of
whom 22 have high grade tumour. Exchange rate set by asking how many men should be biopsied to find one
cancer: "One reasonable response would be that to find one man with high grade cancer, no more than 10 men
should undergo biopsy. This implies that the harm of delaying diagnosis of a high grade cancer is nine times
greater than that of an unnecessary biopsy... So in our analysis we want to 'weight' finding high grade cancer
as nine times more important than avoiding unnecessary biopsy... we can use 1÷9 as the exchange rate."

- Net benefit, biopsy all men: 25% − (75% × (1÷9)) = **16.7%**
- Net benefit, biopsy on marker: 22% − (50% × (1÷9)) = **16.4%**
- Their conclusion: "Because at this particular exchange rate net benefit is lower for the marker than for
  biopsy in all men, we can conclude that use of the marker to determine biopsy would lead to poorer clinical
  outcome than the current practice of biopsy in all men."
- Sensitivity analysis at a different exchange rate (20 biopsies per cancer): biopsy-all 25% − (75% × (1÷19))
  = **21.1%** vs marker 22% − (50% × (1÷19)) = **19.4%**. Same conclusion.

**The unit.** "The unit of net benefit is true positives. So a net benefit of 16.4% means that the marker is
equivalent to a strategy that led to biopsy in 164 men per 1000 at risk, with all biopsy results positive for
cancer."

**Rank order, not magnitude.** "Another similarity between profit and net benefit is that the rank order is
more important than the size of the difference... we generally choose the strategy with the highest net
benefit, without worrying about the size of the difference in net benefit."

**The link between exchange rate and probability threshold — stated explicitly.** "For clinical prediction
models, the exchange rate is related to the probability threshold to determine whether a patient is classified
as being positive or negative for a disease." And: "A cut point of 10 biopsies for each high grade cancer is
the equivalent of carrying out a biopsy in men with a risk of ≥10%; if a clinician would be willing to conduct
as many as 20 biopsies to find a high grade cancer, the probability threshold would be 5%."

**THE ALGORITHM, verbatim.**
1. "Choose a threshold probability (pt) to define when a patient is positive"
2. "Count the number of patients with a positive result (risk ≥pt) who have the disease (true positives)
   versus those who have a positive result but are disease-free (false positives)"
3. "With N the total sample size, calculate the net benefit"
4. "Repeat steps 2 and 3 for a reasonable range of threshold probabilities."
5. "Repeat all steps for each marker, model, or test in the study, as well as the 'default' strategies of
   treating all men or no men as if the result is positive."

**How to read the plot.** "The basic interpretation of a decision curve is that the strategy with the highest
net benefit at a particular threshold probability has the highest clinical value."

**On choosing the threshold range — with their own worked reasoning.** "We chose an upper limit of 20% because
though doctors (taking into account patient preferences) might vary in their values for finding cancer
compared with avoiding unnecessary biopsy, it is unrealistic that any doctor or patient would need more than a
20% risk of high grade disease before biopsy is recommended. Thus the initial step in creating a decision
curve involves determining a reasonable range of threshold probabilities for the specific decision informed by
the marker, test, or model."

**The standard they set for a tool to be worth adopting.** "The key point is that the marker is only helpful
for a subset of preferences. What we would really like is for the marker to be better than any alternative
strategy across a wide range of reasonable preferences."

**STATED LIMITATIONS, quoted.**
- "Net benefit approaches assume that doctors and patients will act rationally in accordance with their
  preferences... The real world of actual clinical practice might be somewhat messier."
- "In some cases it can be useful to complement net benefit with 'impact studies' that empirically evaluate
  the effect of a marker, model, or test on clinical decision making and patient outcomes."
- On level of inference: "Net benefit may take a clinical perspective and incorporate differences in
  preferences between individuals, but the research technique gives a result at the population level: should
  doctors use this model, marker, or test in their practice?"
- They attribute a decision-curve failure to miscalibration: "Owing to slight miscalibration, the statistical
  model is worse than just carrying out a biopsy of all men at very low threshold probabilities."

### 7.3 The reference-line definitions in their most explicit published form

**Source.** Vickers, A. J., Cronin, A. M., Elkin, E. B., & Gonen, M. (2008). "Extensions to decision curve
analysis, a novel method for evaluating diagnostic tests, prediction models and molecular markers." *BMC
Medical Informatics and Decision Making*, 8, 53. DOI
[10.1186/1472-6947-8-53](https://doi.org/10.1186/1472-6947-8-53). Free full text:
[PMC2611975](https://pmc.ncbi.nlm.nih.gov/articles/PMC2611975/). Crossref confirms all metadata. **Field:
medical informatics.**

**The reference lines, stated in one sentence.** "Interpretation of the decision curve depends on comparing
the net benefit of the test, model or marker with that of a strategy of 'treat all' (the thin grey line) and
'treat none' (parallel to the x axis at net benefit of zero). The strategy with the highest net benefit at a
particular pt is optimal, irrespective of the size of the difference."

**Threshold probability as an odds statement.** "if a man would opt for biopsy if he was told that his risk of
prostate cancer was 20% or more, but not if his risk was less than 20%, it can be shown that he considers that
harms associated with a missed cancer to be four times greater than the harms associated with an unnecessary
biopsy, that is, the ratio of harms is the odds at the probability threshold."

**Their stated claim for what DCA does that accuracy metrics cannot.** "decision curve analysis allows us to
assess clinical relevance – which accuracy metrics cannot – without the need for additional data – as required
by traditional decision-analytic approaches."

**A practical caution they give about plotting uncertainty.** "A decision curve plot will have at least two
curves and a straight line, and there will be many areas in which the curves overlap or are very close. Adding
confidence bands to a plot, therefore, is likely to lead to confusing graph that is difficult to interpret.
Accordingly, the best way to present confidence intervals for a decision curve analysis would be, first, to
choose a limited number of key thresholds, and second, report the 95% C.I. for the difference in net benefit
for pairwise comparisons between models at each of these thresholds."

---

## Question 8 — Published guidance for a screener that feeds a second stage

### 8.1 WHO consolidated guidelines on tuberculosis, Module 2: Screening (2021)

**Source.** World Health Organization. *WHO consolidated guidelines on tuberculosis. Module 2: Screening –
systematic screening for tuberculosis disease.* Geneva: WHO, 2021. Chapter 3, "Recommendations for tools for
systematic screening for TB disease." NCBI Bookshelf ID
[NBK569339](https://www.ncbi.nlm.nih.gov/books/NBK569339/); WHO publication page
[9789240022676](https://www.who.int/publications/i/item/9789240022676). **Field: public health / medicine.**
This is the strongest published guidance I found that is explicitly about a screener whose job is to not lose
cases before an accurate instrument runs.

**THE ROLE DEFINITION, VERBATIM — a screener is not supposed to be accurate.**

> "TB screening tools are designed to distinguish people with a higher probability of having TB disease from
> those with a low probability and can be assumed to be free of TB disease. **They are not intended to provide
> a definitive diagnosis.** In general, they need to be able to be implemented easily and relay results
> rapidly in order to be informative in a screening context. **Screening tests need to be followed by a
> diagnostic test, offered as part of a comprehensive clinical evaluation, to confirm or rule out TB disease
> in individuals who screen positive.**"

**THE PUBLISHED NUMERIC TARGET FOR A FIRST-STAGE SCREENER.**

> "In 2014, WHO released a report summarizing the desirable characteristics, or target product profiles, of
> screening tests for detecting TB disease. The report highlighted that **the minimal requirements for a
> target screening test would be an overall sensitivity of 90% and a specificity of 70%** to detect pulmonary
> TB disease or rule it out in individuals being screened. Based on these benchmarks, an array of potential
> tools for screening for TB disease in different populations was considered by the GDG."

*Note:* the 90%/70% figures originate in a 2014 WHO target product profile report, cited as reference (67) in
the 2021 guideline. I verified the 2021 guideline's statement of them; I did **not** retrieve the 2014 report
itself. Flagged.

**THE EVALUATION PROTOCOL THAT FOLLOWS FROM THAT ROLE — fix sensitivity, then compare specificity.** This is
the operational answer to the question "how do you evaluate a screener that feeds a second stage":

> "For evaluation for the GDG, **each software programme was set to a threshold that corresponded to 90%
> sensitivity for detecting pulmonary TB disease based on a microbiological reference standard. The resulting
> accompanying specificity for the software at that threshold was then reported and compared** with the
> diagnostic accuracy of human readers interpreting CXRs in the same studies."

**The requirement to recalibrate the threshold per setting.**

> "The evaluations reviewed by the GDG demonstrated substantial variation in the diagnostic accuracy
> (sensitivity and specificity) of CAD programmes across settings, even when using the same technology set to
> the same threshold. Thus, **it will be essential to calibrate the threshold to be used for any given
> software for each setting and population in which it will be used** in order to ensure that the accuracy,
> predictive values, overall yield and requirements for further diagnostic testing are as expected."

**The requirement that a positive screen must not be treated as a decision.**

> "As with all screening tools, the GDG emphasized the importance in all settings of following up an mWRD
> screen with a diagnostic assessment **to prevent the potential harm of overtreatment.**"

**The base-rate warning restated for deployment in a lower-prevalence population.**

> "Screening with an mWRD in lower prevalence settings than those included in the IPD meta-analysis may result
> in higher false positives should the diagnosis not be confirmed, with the associated overtreatment and
> related social and economic consequences."

And: "The specificity and predictive value of the test for detecting TB, however, will likely be reduced in
settings with a lower TB prevalence than in those included in the meta-analysis."

**A reported case where the screener failed the target.** "None of the screens investigated reached the target
product profile of 90% minimum sensitivity in these high-risk subpopulations of [children], although CXRs came
the closest. Concerns were noted [about] incorporation bias when using a composite reference standard in this
group, thus potentially inflating the estimates of accuracy observed."

**Reported accuracy figures from the guideline (examples, with their CIs).**
- Symptom screen (cough, fever, or poor weight gain) in children, vs composite reference standard: pooled
  sensitivity 89% (95% CI 52%–98%), pooled specificity 69% (95% CI 51%–83%).
- CXR in close contacts, vs composite reference standard: pooled sensitivity 84% (95% CI 70%–92%), pooled
  specificity 91% (95% CI 90%–92%).
- CRP > 5 mg/L as an initial screen among people living with HIV: sensitivity 0.78 (95% CI 0.70–0.85),
  specificity 0.73 (95% CI 0.66–0.79). Compared with W4SS alone in that subpopulation: sensitivity 0.84 (95%
  CI 0.75–0.90), specificity 0.37 (95% CI 0.25–0.50).
- mWRD alone: sensitivity 0.69 (95% CI 0.60–0.76), specificity 0.98 (95% CI 0.97–0.99), versus W4SS followed
  by mWRD: sensitivity 0.62 (95% CI 0.56–0.69), specificity 0.99 (95% CI 0.97–0.99). **This pair is the
  clearest published demonstration in the guideline that adding a screening gate in front of an accurate
  instrument loses cases: sensitivity drops from 0.69 to 0.62.**

### 8.2 Decision-theoretic treatment of two-stage thresholds

**Source.** Longford, N. T. (2015). "Classification in two-stage screening." *Statistics in Medicine*, 34(23),
3281–3297. DOI [10.1002/sim.6554](https://doi.org/10.1002/sim.6554). Crossref confirms: sole author Nicholas
T. Longford, Statistics in Medicine, vol. 34, pp. 3281–3297, 16 June 2015. **Field: biostatistics.**

**Verification status — ABSTRACT ONLY.** Paywalled at Wiley.

**Abstract, verbatim.**

> "Decision theory is applied to the problem of setting thresholds in medical screening when it is organised
> in two stages. In the first stage that involves a less expensive procedure that can be applied on a mass
> scale, an individual is classified as a negative or a likely positive. In the second stage, the likely
> positives are subjected to another test that classifies them as (definite) positives or negatives. The
> second-stage test is more accurate, but also more expensive and more involved, and so there are incentives
> to restrict its application. Robustness of the method with respect to the parameters, some of which have to
> be set by elicitation, is assessed by sensitivity analysis."

**Two facts extractable from that abstract.** (a) The first-stage output is explicitly "a negative or a *likely
positive*," not a positive — the first stage does not classify. (b) The method requires parameters "set by
elicitation" and their influence is assessed "by sensitivity analysis," i.e. the two-stage threshold is not
data-determined.

### 8.3 An applied example of the two-stage evaluation protocol

**Source.** "Head-to-head comparison of diagnostic accuracy of TB screening tests: Chest-X-ray, Xpert TB host
response, and C-reactive protein."
[PMC11213098](https://pmc.ncbi.nlm.nih.gov/articles/PMC11213098/). **Field: medicine / global health.**
*Verification note: I read the methods section of the PMC full text but did not verify the author list or
final journal of record. Flagged.*

**Their stated evaluation protocol, verbatim — this is the concrete method for a screener feeding a second
stage.**

> "Two-test screening algorithms were also considered. We considered 1) a sequential negative serial screening
> approach, in which the second screening test is conducted only if the first is negative and a positive
> screen is defined as positive on either test and 2) a sequential positive serial screening approach, in
> which the second screening test is conducted only if the first is positive and a positive screen is defined
> as positive on both tests... For each potential combination, we considered 1,000 possible combinations of
> cut-points (100 possible cut-points for the first test and 100 possible cut-points for the second test).
> **We then identified all pairs of cut-points that would achieve sensitivity ≥90% and specificity ≥70%, then
> likewise selected the pair that achieved the highest possible specificity within these constraints. With all
> binary tests set to have a sensitivity of 90%, our primary analysis compared the specificity of each index
> alone and the possible combined two-test screening algorithms** among the entire study population."

They also state the reporting standard used: "Results are reported following STARD guidance."

### 8.4 The general directional rule for serial testing

**Source.** "Sequential Testing Analysis: A Comprehensive Guide," meddecide documentation.
[https://www.serdarbalci.com/meddecide/articles/36-sequential-testing-comprehensive.html](https://www.serdarbalci.com/meddecide/articles/36-sequential-testing-comprehensive.html).
**Field: medical decision support software documentation. NOT peer-reviewed — flagged.** Included only because
it states the directional rule compactly and I could not find the same statement in a citable peer-reviewed
source within this pass.

**The two serial designs and their effects, verbatim.**
- Serial positive: "Perform second test only if first test is positive. Result interpretation: Positive only
  if both tests are positive. Effect: **Maximizes specificity, reduces sensitivity.**"
- Serial negative: "Perform second test only if first test is negative. Result interpretation: Positive if
  either test is positive. Effect: **Maximizes sensitivity, reduces specificity.**"
- Design guidance given: "Serial positive: Second test should have higher specificity. Serial negative: Second
  test should have higher sensitivity."
- "First test: Should be practical, accessible, cost-effective. Second test: Should complement first test's
  weaknesses. Consider test correlation and independence assumptions."

*Note the stated assumption:* conditional independence between the two tests. The WHO mWRD figures in 8.1
(0.69 → 0.62 sensitivity) are a real-data instance of the sensitivity loss this rule predicts.

---

## Question 9 — Shrinkage and optimism

### 9.1 Steyerberg et al. (2001), the internal-validation comparison

**Source.** Steyerberg, E. W., Harrell, F. E., Borsboom, G. J. J. M., Eijkemans, M. J. C., Vergouwe, Y., &
Habbema, J. D. F. (2001). "Internal validation of predictive models: efficiency of some procedures for
logistic regression analysis." *Journal of Clinical Epidemiology*, 54(8), 774–781. DOI
[10.1016/S0895-4356(01)00341-9](<https://doi.org/10.1016/S0895-4356(01)00341-9>). PMID 11470385. Crossref
confirms all six authors, journal, volume 54, pages 774–781, August 2001. **Field: clinical epidemiology.**

**Verification status — ABSTRACT PLUS ONE BODY EXCERPT.** Elsevier paywall; the abstract below is verbatim and
consistent across PubMed, ScienceDirect and the journal site.

**THE STATEMENT OF THE PROBLEM, verbatim.** "The performance of a predictive model is overestimated when
simply determined on the sample of subjects that was used to construct the model."

**Study design, exact numbers.** "We evaluated several variants of split-sample, cross-validation and
bootstrapping methods with a logistic regression model that included eight predictors for 30-day mortality
after an acute myocardial infarction. Random samples with a size between n = 572 and n = 9165 were drawn from
a large data set (GUSTO-I; n = 40,830; 2851 deaths) to reflect modeling in data sets with between 5 and 80
events per variable."

**THEIR RESULTS AND RECOMMENDATION, verbatim.** "We found that split-sample analyses gave overly pessimistic
estimates of performance, with large variability. Cross-validation on 10% of the sample had low bias and low
variability, but was not suitable for all performance measures. Internal validity could best be estimated with
bootstrapping, which provided stable estimates with low bias. We conclude that split-sample validation is
inefficient, and recommend bootstrapping for estimation of internal validity of a predictive logistic
regression model."

**Body excerpt on when the problem is worst.** "Estimation of the internal validity of a predictive regression
model is especially problematic when the sample size is small. The apparent performance as estimated in the
sample then is a substantial overestimation of the true performance in similar subjects. In our study,
split-sample approaches underestimated performance and showed high variability. In contrast, bootstrap
resampling resulted in stable and [low-bias estimates]."

### 9.2 Steyerberg et al. (2003), what the bootstrap must include to work

**Source.** Steyerberg, E. W., Bleeker, S. E., Moll, H. A., Grobbee, D. E., & Moons, K. G. M. (2003).
"Internal and external validation of predictive models: A simulation study of bias and precision in small
samples." *Journal of Clinical Epidemiology*, 56(5), 441–447. DOI
[10.1016/S0895-4356(03)00047-7](<https://doi.org/10.1016/S0895-4356(03)00047-7>). Crossref confirms all five
authors, journal, volume 56, pages 441–447, May 2003. **Field: clinical epidemiology.**

**Design, exact numbers.** "We used a data set for the development (n = 376) and validation (n = 179) of
logistic regression models. The models included statistically significant [predictors selected from] 57
candidate predictors. Model development, including the selection of predictors, and validation were repeated
in a bootstrapping procedure."

**THE HEADLINE NUMBERS — the size of optimism, and the size of the error you make by ignoring predictor
selection.**

> "The average apparent ROC area was 0.74, which was expected (based on bootstrapping) to decrease by 0.07 to
> 0.67, whereas the observed decrease in the validation samples was 0.09 to 0.65. **Omitting the selection of
> predictors from the bootstrap procedure led to a severe underestimation of the optimism (decrease 0.006).**
> The standard error of the observed ROC area in the independent validation samples was large (0.05)."

That is: apparent AUC 0.74; true AUC in validation 0.65; bootstrap-corrected estimate 0.67. If predictor
selection is left out of the bootstrap loop, the estimated optimism collapses from 0.07 to 0.006 — a
fifteenfold understatement.

**A second reported optimism figure from the same paper's body.** "According to 1000 bootstrap samples, the
expected optimism was 0.056 for the ROC area (0.761 − 0.706)."

**THEIR RECOMMENDATION AND ITS PROVISO, verbatim.** "We recommend bootstrapping for internal validation
because it gives reasonably valid estimates of the expected optimism in predictive performance **provided that
any selection of predictors is taken into account.** For external validation, substantial sample sizes should
be used for sufficient power to detect clinically important changes in performance as compared with the
internally validated estimate."

**The stated methodological requirement.** From the paper: "when model specification, such as stepwise
selection of predictor variables, can be formulated in a systematic way, it may be replayed entirely in every
bootstrap sample. Such a procedure should provide an honest estimate of the optimism of the final model."

### 9.3 Riley et al. (2019), minimum sample size — the modern replacement for "10 EPV"

**Source.** Riley, R. D., Snell, K. I. E., Ensor, J., Burke, D. L., Harrell, F. E. Jr., Moons, K. G. M., &
Collins, G. S. (2019). "Minimum sample size for developing a multivariable prediction model: PART II – binary
and time-to-event outcomes." *Statistics in Medicine*, 38(7), 1276–1296. DOI
[10.1002/sim.7992](https://doi.org/10.1002/sim.7992). PMID 30357870. Free full text:
[PMC6519266](https://pmc.ncbi.nlm.nih.gov/articles/PMC6519266/). Crossref confirms all seven authors, volume
38, pages 1276–1296. **Field: biostatistics.**

**THE THREE CRITERIA, verbatim.**

> "We propose that the minimum values of n and E (and subsequently the minimum number of events per predictor
> parameter, EPP) should be calculated to meet the following three criteria: **(i) small optimism in predictor
> effect estimates as defined by a global shrinkage factor of ≥ 0.9, (ii) small absolute difference of ≤ 0.05
> in the model's apparent and adjusted Nagelkerke's R², and (iii) precise estimation of the overall risk in
> the population.**"

**What criteria (i) and (ii) are for, and what they require you to supply.** "Criteria (i) and (ii) aim to
reduce overfitting conditional on a chosen p, and require prespecification of the model's anticipated
Cox-Snell R², which we show can be obtained from previous studies."

**THEIR EXPLICIT REJECTION OF THE 10-EPV RULE OF THUMB, verbatim.** "Upon application of our approach, a new
diagnostic model for Chagas disease requires an EPP of at least 4.8 and a new prognostic model for recurrent
venous thromboembolism requires an EPP of at least 23. **This reinforces why rules of thumb (eg, 10 EPP)
should be avoided.**"

**A fourth consideration they add.** "Researchers might additionally ensure the sample size gives precise
estimates of key predictor effects; this is especially important when key categorical predictors have few
events in some categories, as this may substantially increase the numbers required."

**Stated requirement.** "When designing a study to develop a new prediction model with binary or
time-to-event outcomes, researchers should ensure their sample size is adequate in terms of the number of
participants (n) and outcome events (E) relative to the number of predictor parameters (p) considered for
inclusion." Note "considered for inclusion," not "retained" — p counts candidate parameters.

**Companion papers, both citation-verified via Crossref:**
- Riley, R. D., Snell, K. I. E., Ensor, J., Burke, D. L., Harrell, F. E., Moons, K. G. M., & Collins, G. S.
  (2019). "Minimum sample size for developing a multivariable prediction model: Part I – Continuous outcomes."
  *Statistics in Medicine*, 38(7), 1262–1275. DOI [10.1002/sim.7993](https://doi.org/10.1002/sim.7993).
- Riley, R. D., Ensor, J., Snell, K. I. E., Harrell, F. E., Martin, G. P., Reitsma, J. B., Moons, K. G. M.,
  Collins, G., & van Smeden, M. (2020). "Calculating the sample size required for developing a clinical
  prediction model." *BMJ*, 368, m441. DOI [10.1136/bmj.m441](https://doi.org/10.1136/bmj.m441).
  **Field: medicine / biostatistics.** *Citation verified via Crossref; I did not read the text.*

**Software named in a Riley lecture deck** (Deutsche Region der Internationalen Biometrischen Gesellschaft,
[PDF](http://www.biometrische-gesellschaft.de/fileadmin/AG_Daten/Weiterbildung/Riley_lecture3_sample_size.pdf)):
`pmsampsize` in R and Stata. The deck restates the criteria as "(i) A uniform shrinkage factor, S ≥ 0.9 (e.g.
target < 10% overfitting); (ii) A small difference in Nagelkerke's R²_app and R²_adj (e.g. target < 0.05
absolute difference); (iii) A small margin of error in overall risk estimate (e.g. target < 0.05 absolute
error)" and lists the required pre-specifications: "the number of predictor parameters (p), the desired
heuristic shrinkage factor (S), the overall risk in the population, model's anticipated Cox-Snell R²."
*This is a slide deck, not a peer-reviewed source — flagged; its content matches the peer-reviewed abstract.*

### 9.4 Optimism correction applied to net benefit specifically

**Source.** Vickers, Cronin, Elkin & Gonen (2008), full citation in 7.3 above. **Field: medical informatics.**
This matters because it shows the optimism problem applies to decision-curve results, not just to AUC.

**Their simulation design.** They fitted a logistic model (total PSA, free-to-total PSA ratio, age >60 vs ≤60,
DRE result) and "To artificially induce overfit, we randomly sampled from the data set such that we reduced
the number of cancers to exactly n, where n took on values of 100, 50, 40, 30, and 20. In doing so, we kept
the incidence the same." Estimates are "the mean and 5th to 95th percentiles across 2000 replications."

**Their finding, verbatim.** "For a threshold probability of 15%, the uncorrected estimate was over-optimistic
for all scenarios; all correction methods gave an estimate lower than the best estimate of net benefit;
repeated 10-fold cross-validation had the least bias for all but the scenario with 100 events, where the
bootstrap estimate had slightly lower bias (-0.0001 vs -0.0005). Similar results were obtained for threshold
probabilities of 25% and 35%. For the threshold probabilities of 60% and 80%, the bootstrap method had the
least bias."

**Their recommendation, verbatim.** "**We therefore recommend repeated 10-fold cross validation as a method to
correct decision curves created using the same data as that used to generate the model.**"

**Their stated reason for preferring it over the bootstrap despite the bootstrap winning at high thresholds.**
"The 60% and 80% thresholds are near the tail of the decision curve, and are subject to excess random noise.
The properties of the decision curve near this threshold are of minor interest because few men would require a
≥ 60% probability of cancer before they would accept biopsy. Thus the superior properties of the bootstrap at
this threshold are of little value." And: "One immediate attraction of repeated 10-fold cross-validation is
that it has a smoothing effect on the decision curve."

**Their reported magnitude of agreement between the two methods.** "In all comparisons for all threshold
probabilities except 60% and 80%, the absolute difference in the corrected estimates was less than 0.005, with
a relative difference in net benefit <6%."

### 9.5 The oldest statement of the shrinkage problem in this document

Meehl & Rosen (1955), already cited in 1.1, state it for psychometric screening devices specifically: "Most
psychometric devices are reported without cross-validation data. If a psychometric instrument is applied
solely to the criterion groups from which it was developed, its reported validity and efficiency are likely to
be spuriously high, especially if the criterion groups are small." **Field: clinical psychology.**

---

## Cross-cutting note on field transfer

Recording which field each result comes from, since the question asked for it:

| Result | Originating field | Transfers to a talent screener because… (stated basis only) |
| --- | --- | --- |
| PPV depends on base rate | clinical psychology (Meehl & Rosen) **and** medicine (Altman & Bland) | Meehl & Rosen's version is *already* about psychometric cutting scores and selection decisions; no transfer needed |
| SnNout / SpPin | evidence-based medicine | transfer is asserted by the sources ("For screening we want a negative test to rule people out"), and is qualified by Pewsner et al. |
| Partial AUC | medical decision making / biostatistics | purely a property of ROC geometry; no clinical content |
| Youden's J | medicine/statistics | purely arithmetic; the *assumption* (FP as costly as FN) is what must be checked per domain |
| Number needed to screen | medicine / public health | requires an outcome that can be "prevented" and a trial-derived NNT; **this is the weakest transfer in the set** |
| Incremental validity | educational & psychological measurement (Sechrest); clinical psychology (Hunsley & Meyer, Haynes & Lench) | native to testing; no transfer needed |
| Calibration hierarchy | clinical epidemiology / biostatistics | property of any probabilistic model |
| Decision consistency / accuracy | educational measurement | native to cut-score classification decisions; no transfer needed |
| Net benefit / DCA | medical decision making | requires a stateable exchange rate between a missed case and a false positive |
| Two-stage screening guidance | public health (WHO TB), biostatistics (Longford) | structurally identical (cheap mass first stage, expensive accurate second stage); the *numbers* (90/70) are TB-specific |
| Shrinkage / optimism / sample size | biostatistics, clinical epidemiology | property of model fitting |

---

## EVERYTHING I SEARCHED FOR AND COULD **NOT** VERIFY

Listed so nothing above is mistaken for a fully verified fact.

**Full texts I could not obtain (citation verified, body text not read):**

1. **Sechrest (1963), "Incremental Validity: a Recommendation."** Sage paywall. Citation confirmed via
   Crossref (author, journal, vol 23, pp. 153–158, April 1963). **I did not read a single word of Sechrest's
   own text.** The phrase "increment in predictive efficiency" attributed to Sechrest 1963 p. 154 in §4.1 is a
   **second-hand quotation** taken from a *Personality and Individual Differences* article. His actual stated
   criteria are unverified.
2. **Hunsley & Meyer (2003).** APA paywall. Abstract verified verbatim across three sources. **The body — which
   contains their actual criteria for interpreting the size of a validity increment — was not read.** The
   quoted phrase "provides information that was formerly unavailable or less adequately obtained" (p. 449) is
   second-hand, from *Social Psychological Bulletin*.
3. **McClish (1989).** Sage paywall. Abstract verified verbatim across three sources. **The derivation, the
   variance estimates, and the standardized pAUC formula were not read in the original.** The standardized
   pAUC formula given in §2.1 comes from MedCalc's documentation citing McClish, not from McClish.
4. **Walter (2005).** Wiley paywall. Abstract verified verbatim. Body not read.
5. **Longford (2015), "Classification in two-stage screening."** Wiley paywall. Abstract only. **His actual
   decision rule and thresholds are unverified.**
6. **Steyerberg et al. (2001).** Elsevier paywall. Abstract plus one body excerpt from a ScienceDirect
   preview. Full body not read.
7. **Livingston & Lewis (1995), the *Journal of Educational Measurement* version.** Wiley paywall. I read the
   **ETS technical report version (ETS-RR-93-48, ERIC ED386492)** instead, which is free and contains the same
   method and the same abstract. Page numbers I cite are the journal's (32:179–197) but the text I quote is
   from the ETS report. Minor wording differences between the two versions are possible.
8. **Altman & Bland (1994).** Citation verified via Crossref. **PMC copy is a scanned page image with no
   machine-readable text; BMJ site paywalled to my retrieval.** No quote from this paper appears above. If a
   quote is needed, this must be re-sourced.

**Things I looked for and did not find:**

9. **A peer-reviewed source stating, in one sentence, that "a high reliability coefficient does not imply high
   classification accuracy."** I did not find that exact claim asserted as such in a peer-reviewed paper. What
   I found instead and reported in §6: (a) Livingston & Lewis treat reliability as one of four *inputs* to
   decision accuracy, which entails the claim without stating it; (b) the AERA/APA/NCME *Standards* (2014)
   definitions quoted through a CASAS test-publisher report; (c) an *IJATE* paper stating the classification
   question is distinct from the score-reliability question. **The direct one-sentence claim in the question
   as posed remains unsourced.**
10. **The AERA/APA/NCME *Standards for Educational and Psychological Testing* (2014) itself.** Not obtained.
    The definitions in §6.2 are quoted *through* the CASAS report, which cites the *Standards*. This is a
    second-hand quotation of a primary standards document.
11. **The 2014 WHO target product profile report** that is the origin of the 90% sensitivity / 70% specificity
    benchmark. Not obtained. The 90/70 figures in §8.1 are quoted from the 2021 guideline's restatement of
    them.
12. **Meehl (1959) as the earliest use of the term "incremental validity."** A secondary source (Grokipedia)
    claims this. **I did not verify that a 1959 Meehl paper exists or that it uses the term.** Do not cite.
13. **Authorship of the *IJATE* (2016) paper** "Is This Reliable Enough?" Crossref returns an empty author
    list for DOI 10.21449/ijate.245198. Cited above without authors.
14. **Authorship / peer-review status of two educational-measurement items:** "A Practical Comparison of
    Decision Consistency Estimates" (ERIC EJ1443424) and the CASAS report by Jared Jacobsen. The CASAS report
    is a test-publisher research report, explicitly not peer-reviewed.
15. **Authorship and journal of record for the TB head-to-head screening comparison** (PMC11213098). I read
    its methods but did not verify its bibliographic record.
16. **The "meddecide" sequential-testing guide** used in §8.4 is software documentation, not peer-reviewed. I
    could not find the same compact statement of the serial-positive / serial-negative directional rule in a
    peer-reviewed source within this pass. **This is the weakest source in the document.**
17. **The alternative net-benefit formula for when the test itself is costly or harmful** (Vickers & Elkin
    2006). The equation is rendered as an image in the PMC copy and I could not extract it as text. Only the
    surrounding prose is quoted.
18. **Sackett et al. (1997), *Evidence-Based Medicine*** — the primary source for SnNout/SpPin. Book not
    obtained. The mnemonic is quoted from the CEBM Oxford page and from Pewsner et al. (2004), both of which
    credit Sackett.
19. **A published source specifically about evaluating a screener in a *talent selection* or *gifted
    identification* context** using the decision metrics above. I found none in this pass. Every source in
    this document comes from medicine, public health, biostatistics, clinical psychology, or educational
    measurement. **Nothing here was written about talent screening.**

**One correction to the premise of the research question, restated so it is not lost:**

20. **Walter (2005) does not support partial AUC.** The question assumed it was a source on partial AUC
    standardization in favour of the method. His stated conclusion is "on balance the use of the full AUC is
    preferred." His analysis is also scoped to *summary* ROC curves in *meta-analysis*, and his central
    objection (sensitivity to inter-study heterogeneity) does not apply to a single-sample evaluation. See
    §2.2. Ma et al. (2013), §2.3, is the source that argues partial AUC "could frequently offer advantages."
