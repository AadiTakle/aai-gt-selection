# Statistical and Psychometric Detection of Test Fraud

*General idea.* A second family of cheat-detection methods ignores the testing room entirely and
looks for fraud in the response data: person-fit indices that ask whether a response pattern is
plausible given a measurement model, similarity indices that ask whether two answer strings could
have been produced independently, gated mixture models that ask whether performance on exposed
items outruns performance on fresh items, and response-time statistics that treat
aberrantly-fast-and-correct answering as the fingerprint of preknowledge. The methodological
literature on these indices is mature and largely favorable: null distributions have been derived,
Type I error rates are controllable, and power against well-specified alternatives can be
respectable. The literature on *what a flag is worth* is far less comfortable. Cheating prevalence
on real examinations is measured in low single-digit percentages, indices are calibrated to a
nominal Type I error rate rather than to a posterior probability of guilt, and the resulting
positive predictive value of a flag at realistic prevalence is frequently below 50% and sometimes
below 15%. That arithmetic collides with a testing-standards regime that grants examinees notice,
access to the evidence, and an opportunity to rebut, and with a documented record of erasure and
similarity flags driving consequential accusations on thin corroboration. The sources below are
selected to hold the methodological optimism and the false-positive critique in the same frame.

---

## 1. Person-fit, answer-similarity, and item-preknowledge indices: what they detect and their measured power

**Source:** Snijders (2001, *Psychometrika*); Meijer, Molenaar & Sijtsma (1994, *Applied Psychological
Measurement*); Meijer & Sijtsma (1995, *Applied Measurement in Education*); Karabatsos (2003, *Applied
Measurement in Education*); Sinharay (2017, *Applied Measurement in Education*); Wollack (1997, *Applied
Psychological Measurement*); Wollack, Cohen & Serlin (2001, *Applied Psychological Measurement*);
Zopluoglu & Davenport (2012, *Educational and Psychological Measurement*); Maynes (2016) and Wollack
& Maynes (2016) in Cizek & Wollack, *Handbook of Quantitative Methods for Detecting Cheating on
Tests*; Eckerly (2021, *Applied Psychological Measurement*); Shu, Henson & Luecht (2013,
*Psychometrika*); McLeod, Lewis & Thissen (2003, *Applied Psychological Measurement*); Wollack, Cohen &
Eckerly (2015, *Educational and Psychological Measurement*); Sinharay & Johnson (2017, *Educational and
Psychological Measurement*)

**DOK 1 — Facts:**

- The standardized log-likelihood person-fit index lz is asymptotically standard normal only when
  true ability is used, and substituting an ability estimate shrinks its variance below 1 (Snijders,
  2001, *Psychometrika* 66(3), 331–342, doi:10.1007/BF02294437). `T2`
- Snijders (2001) derived the corrected index lz\*, which restores the standard normal null
  distribution under estimated ability but applies only to dichotomously scored items (Snijders,
  2001, doi:10.1007/BF02294437). `T2`
- Using critical values from the standard normal for lz under estimated ability yields less power
  than the corrected index because the true variance is smaller than 1 (Meijer & Sijtsma, 2001, as
  characterized in Xia & Zheng, 2018, *Applied Psychological Measurement*, PMC6023093). `T2`
- lz provided a high detection rate for cheating-type aberrance only among examinees of low or high
  ability, not in the middle of the ability range (Drasgow et al., 1987, as reviewed in Meijer &
  Sijtsma, 1995, doi:10.1207/s15324818ame0803_5). `T2`
- On 17-item tests with mean item reliability .34, the nonparametric U3 index detected 73%–80.5% of
  a-priori aberrant patterns across two replications (Meijer, Molenaar & Sijtsma, 1994,
  doi:10.1177/014662169401800202). `T2`
- Detection rates rose with item discrimination, test length, and the ratio of aberrant to
  non-aberrant examinees, and simulees "cheating" on the hardest items were detected more easily
  than those guessing throughout (Meijer, Molenaar & Sijtsma, 1994,
  doi:10.1177/014662169401800202). `T2`
- Increasing the number of misfitting patterns in the calibration sample *decreased* the power of
  ZU3, because aberrant examinees contaminate the item parameters used to judge them (van
  Krimpen-Stoop & Meijer, 1996, doi:10.1177/014662169602000204). `T2`
- Karabatsos (2003) compared 36 person-fit statistics by ROC area and ranked the nonparametric HT
  best overall, followed by C, MCI, and U3, all four outperforming 25 parametric indices
  (doi:10.1207/s15324818ame1604_2). `T2`
- **Contested:** Sinharay (2017) replicated Karabatsos's simulations and found the parametric lz and
  ECI4z to be as powerful as HT and U3 once the comparison was performed on equal footing,
  attributing the original ranking to the comparison design (doi:10.1080/08957347.2017.1353990). `T2`
- Wollack's nominal-response-model copying index ω held Type I error at or below the nominal level
  in all simulated conditions while the classical g2 index yielded substantially inflated rates
  (Wollack, 1997, doi:10.1177/01466216970214002). `T2`
- ω showed good power only when at least 20% of items were copied on an 80-item test and at least
  30% on a 40-item test (Wollack, 1997, doi:10.1177/01466216970214002). `T2`
- Applying copying indices pairwise falsely detected examinees almost three times as often as the
  nominal α level, and familywise power for ω was reasonable only when at least 30% of items were
  copied (Wollack, Cohen & Serlin, 2001, doi:10.1177/01466210122032118). `T2`
- Type I error control for g2 failed so badly under familywise conditions that its power could not
  be meaningfully evaluated at all (Wollack, Cohen & Serlin, 2001,
  doi:10.1177/01466210122032118). `T2`
- Across 1,440 simulated conditions neither the generalized binomial test nor ω inflated Type I
  error, with GBT slightly more powerful, and the amount of copying plus source ability dominated
  all other effects (Zopluoglu & Davenport, 2012, doi:10.1177/0013164412442941). `T2`
- An answer-similarity index estimates the probability that a pair would show the observed or
  greater response similarity under the assumption that the two worked independently (Maynes, 2016,
  doi:10.4324/9781315743097-3). `T2`
- Wollack and Maynes detect collusion groups by converting pairwise similarity probabilities into a
  distance matrix and running nearest-neighbour clustering (Wollack & Maynes, 2016,
  doi:10.4324/9781315743097-6). `T2`
- The cluster method is sensitive to the choice of clustering procedure and its probability
  statements still apply only to pairs, not to the clusters actually being accused (Eckerly, 2021,
  doi:10.1177/01466216211013109). `T2`
- The Deterministic Gated IRT Model decomposes observed performance into a true-ability and a
  cheating-ability distribution by conditioning on whether each item was exposed or unexposed (Shu,
  Henson & Luecht, 2013, doi:10.1007/s11336-012-9311-3). `T2`
- An earlier Bayesian approach detected preknowledge in adaptive testing by comparing performance on
  suspect and non-suspect item subsets (McLeod, Lewis & Thissen, 2003,
  doi:10.1177/0146621602250534). `T2`
- The erasure detection index compares observed wrong-to-right erasures to the number expected by
  chance conditional on ability and number of erased items, and with a continuity correction held
  Type I error at or below nominal in every condition studied (Wollack, Cohen & Eckerly, 2015,
  doi:10.1177/0013164414568716). `T2`
- Without the continuity correction the EDI often has inflated Type I error, and with it the index
  loses power (Sinharay & Johnson, 2017, doi:10.1177/0013164416632287). `T2`
- Erasure analysis in several U.S. states used only the average wrong-to-right erasure count for a
  school or district, a statistic whose power has been shown to be rather low (Sinharay, 2018,
  doi:10.1080/15366367.2018.1437308). `T2`

**DOK 2 — Summary:** The indices work, but only against the alternatives they were built for and
only when the aberrance is large: roughly a third of items copied before ω is reliably powered, and
person-fit power that collapses for mid-ability examinees and degrades further when aberrant cases
contaminate the calibration sample. The field also disagrees internally about which index wins,
with Karabatsos's nonparametric ranking directly challenged by a re-analysis. Two structural
limits recur: the probability statements attach to pairs rather than to the group being accused,
and every index needs item parameters that the cheaters themselves help estimate.

**Link to source:**

- [Snijders (2001), Asymptotic Null Distribution of Person Fit Statistics with Estimated Person Parameter](https://doi.org/10.1007/bf02294437) `T2`
- [Meijer, Molenaar & Sijtsma (1994), Influence of Test and Person Characteristics on Nonparametric Appropriateness Measurement](https://doi.org/10.1177/014662169401800202) `T2`
- [Meijer & Sijtsma (1995), Detection of Aberrant Item Score Patterns: A Review of Recent Developments](https://doi.org/10.1207/s15324818ame0803_5) `T2`
- [van Krimpen-Stoop & Meijer (1996), The Influence of the Presence of Deviant Item Score Patterns on the Power of a Person-Fit Statistic](https://doi.org/10.1177/014662169602000204) `T2`
- [Karabatsos (2003), Comparing the Aberrant Response Detection Performance of Thirty-Six Person-Fit Statistics](https://doi.org/10.1207/s15324818ame1604_2) `T2`
- [Sinharay (2017), Are the Nonparametric Person-Fit Statistics More Powerful Than Their Parametric Counterparts?](https://doi.org/10.1080/08957347.2017.1353990) `T2`
- [Xia & Zheng (2018), Asymptotically Normally Distributed Person Fit Indices for Detecting Spuriously High Scores on Difficult Items](https://pmc.ncbi.nlm.nih.gov/articles/PMC6023093/) `T2`
- [Wollack (1997), A Nominal Response Model Approach for Detecting Answer Copying](https://doi.org/10.1177/01466216970214002) `T2`
- [Wollack, Cohen & Serlin (2001), Defining Error Rates and Power for Detecting Answer Copying](https://doi.org/10.1177/01466210122032118) `T2`
- [Zopluoglu & Davenport (2012), The Empirical Power and Type I Error Rates of the GBT and ω Indices](https://doi.org/10.1177/0013164412442941) `T2`
- [Maynes (2016), Detecting Potential Collusion among Individual Examinees using Similarity Analysis](https://doi.org/10.4324/9781315743097-3) `T2`
- [Wollack & Maynes (2016), Detection of Test Collusion using Cluster Analysis](https://doi.org/10.4324/9781315743097-6) `T2`
- [Eckerly (2021), Answer Similarity Analysis at the Group Level](https://doi.org/10.1177/01466216211013109) `T2`
- [Shu, Henson & Luecht (2013), Using Deterministic, Gated Item Response Theory Model to Detect Test Cheating due to Item Compromise](https://doi.org/10.1007/s11336-012-9311-3) `T2`
- [McLeod, Lewis & Thissen (2003), A Bayesian Method for the Detection of Item Preknowledge in Computerized Adaptive Testing](https://doi.org/10.1177/0146621602250534) `T2`
- [Wollack, Cohen & Eckerly (2015), Detecting Test Tampering Using Item Response Theory](https://doi.org/10.1177/0013164414568716) `T2`
- [Sinharay & Johnson (2017), Three New Methods for Analysis of Answer Changes](https://doi.org/10.1177/0013164416632287) `T2`
- [Sinharay (2018), Application of Bayesian Methods for Detecting Fraudulent Behavior on Tests](https://doi.org/10.1080/15366367.2018.1437308) — [open preprint](https://files.eric.ed.gov/fulltext/ED582037.pdf) `T2`

---

## 2. Response-time signatures: aberrantly fast-and-correct at one extreme, rapid guessing at the other

**Source:** Qian, Staniewska & Reckase (2016, *Educational Measurement: Issues and Practice*); Sinharay
(2020, *Applied Psychological Measurement*); Sinharay & Johnson (2019, *British Journal of Mathematical
and Statistical Psychology*); Wise & Kong (2005, *Applied Measurement in Education*); Soland, Kuhfeld &
Rios (2021, *Large-scale Assessments in Education*)

**DOK 1 — Facts:**

- Item preknowledge is operationalized as an unexpectedly short response time paired with a correct
  response (Qian, Staniewska & Reckase, 2016, doi:10.1111/emip.12102). `T2`
- In a 111-item non-adaptive licensure examination, response-time analysis flagged 2 items as
  potentially exposed and 2 of 1,172 candidates as showing indications of preknowledge (Qian et al.,
  2016, doi:10.1111/emip.12102). `T2`
- On a companion adaptive licensure examination the same method found no indication of item
  preknowledge or compromised items at all (Qian et al., 2016, doi:10.1111/emip.12102). `T2`
- On one flagged item, 26 of 34 rapid responses (76.5%) were correct, far above the chance rate that
  benign rapid guessing would produce (Qian et al., 2016, doi:10.1111/emip.12102). `T2`
- A supporting simulation found that when examinees knew 10% of items or fewer, the response-time
  procedure detected 67 of 100 true preknowledge cases (Qian & Staniewska, 2013, as reported in Qian
  et al., 2016, doi:10.1111/emip.12102).
- Sinharay's Λs statistic quantifies the difference in speed between compromised and non-compromised
  items and is provably standard normal under the null of no preknowledge (Sinharay, 2020,
  doi:10.1177/0146621620909893). `T2`
- On real data at a nominal 1% level, the response-time person-fit statistic χpf produced Type I
  error rates of 0.062–0.063 — roughly six times nominal — while Λs produced 0.005–0.009 (Sinharay,
  2020, PMC7433384, Table 1). `T2`
- Bayesian response-time residuals were also inflated at a nominal 1% level, reaching 0.055 when 10
  items were compromised (Sinharay, 2020, PMC7433384, Table 1). `T2`
- Λs power exceeded 0.8 only when the speed shift was 2 or 3 units and at least 4 items were
  compromised (Sinharay, 2020, doi:10.1177/0146621620909893). `T2`
- Across a 3×3 crossing of percent-items-compromised by percent-examinees-with-preknowledge, Λs was
  expected to yield low power in 4 cells and outright unreliable results in 4 more, leaving one cell
  of large power (Sinharay, 2020, PMC7433384, Table 3). `T2`
- Detection statistics for test fraud are typically applied at conservative levels such as 1% rather
  than the customary 5% (Wollack, Cohen & Eckerly, 2015, as cited in Sinharay, 2020, PMC7433384). `T2`
- Sinharay explicitly cautions that the response-time statistic "should not be used as a sole
  measure to detect test fraud" and should serve as secondary evidence in high-stakes contexts
  (Sinharay, 2020, PMC7433384). `T2`
- van der Linden and Guo warned against the mechanical use of response-time statistics in
  high-stakes cheating detection because of their false-alarm rates (van der Linden & Guo, 2008, as
  characterized in Sinharay, 2020, PMC7433384). `T2`
- A statistic combining item scores and response times flagged examinees detected by neither the
  score-only nor the time-only statistic, with a false-alarm rate always below nominal in
  contaminated data sets (Sinharay & Johnson, 2019, doi:10.1111/bmsp.12187). `T2`
- Response Time Effort is the proportion of items on which an examinee exceeded an item-specific
  time threshold rather than responding too quickly to have read the item (Wise & Kong, 2005,
  doi:10.1207/s15324818ame1802_2). `T2`
- The validity criterion for a rapid-guessing threshold is that responses below it should be correct
  at approximately chance rate (Wise & Kong, 2005, doi:10.1207/s15324818ame1802_2). `T2`
- The operational normative threshold sets the rapid-guessing cutoff at 10% of an item's mean
  response duration capped at 10 seconds, validated by showing flagged responses were correct at
  near-chance rates (Wise & Ma, 2012, as described in Soland, Kuhfeld & Rios, 2021,
  doi:10.1186/s40536-021-00100-w). `T2`
- Four different threshold-setting methods — fixed, surface-feature, visual-inspection, and
  two-state mixture model — produced only minor differences in resulting effort scores (Wise, 2006,
  ERIC ED490202).

**DOK 2 — Summary:** Response time carries genuinely independent information: fast-and-correct is a
sharper signature of preknowledge than score aberrance alone, and it catches examinees that
score-only statistics miss. But the same 1%-level real-data comparison that validated the targeted
statistic showed a general-purpose response-time person-fit statistic firing at six times its
nominal rate, and the targeted statistic is reliable in only a narrow band of conditions. Notably,
the authors of these methods are among the loudest voices against using them alone.

**Link to source:**

- [Qian, Staniewska & Reckase (2016), Using Response Time to Detect Item Preknowledge in Computer-Based Licensure Examinations](https://doi.org/10.1111/emip.12102) — [open copy](https://www.ncsbn.org/public-files/Qian_et_al-2016-Educational_Measurement-_Issues_and_Practice.pdf) `T2`
- [Sinharay (2020), Detection of Item Preknowledge Using Response Times](https://doi.org/10.1177/0146621620909893) — [full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7433384/) `T2`
- [Sinharay & Johnson (2019), The use of item scores and response times to detect examinees who may have benefited from item preknowledge](https://doi.org/10.1111/bmsp.12187) — [open preprint](https://files.eric.ed.gov/fulltext/ED598424.pdf) `T2`
- [Wise & Kong (2005), Response Time Effort: A New Measure of Examinee Motivation in Computer-Based Tests](https://doi.org/10.1207/s15324818ame1802_2) — [open copy](https://files.eric.ed.gov/fulltext/ED490203.pdf) `T2`
- [Soland, Kuhfeld & Rios (2021), Comparing different response time threshold setting methods to detect low effort on a large-scale assessment](https://doi.org/10.1186/s40536-021-00100-w) `T2`
- [Wise (2006), Response Time Threshold Setting Methods (ERIC ED490202)](https://files.eric.ed.gov/fulltext/ED490202.pdf)

---

## 3. The base-rate problem and the standards of evidence for acting on a flag

**Source:** Skorupski & Wainer (2016) in Cizek & Wollack, *Handbook of Quantitative Methods for
Detecting Cheating on Tests*; Sinharay (2018, *Measurement: Interdisciplinary Research and
Perspectives*); Severo, Silva-Pereira, Ferreira, Monteiro & Pereira (2019, *BMC Medical Education*);
AERA/APA/NCME (2014, *Standards for Educational and Psychological Testing*); International Test
Commission (2014, *Guidelines on the Security of Tests, Examinations, and Other Assessments*); Dwyer &
Hecht (1995, ERIC ED382066); Wollack (2004, *The Bar Examiner*); Georgia Governor's Office of Student
Achievement erasure-analysis protocol; *Special Investigation into Test Tampering in Atlanta's School
System* (2011) and its Caveon exhibits; USA TODAY / Hechinger Report investigation (2011); Network
World interview with Caveon (2011)

**DOK 1 — Facts:**

- With 70,000 examinees, 5% cheaters, and a statistic that is 99% sensitive and 99% specific, 3,465
  true and 665 false positives yield 4,130 flags and a positive predictive value of 0.84 — a 16%
  false-positive rate among flags, not the nominal 1% (Skorupski & Wainer, 2016,
  doi:10.4324/9781315743097-18). `T2`
- **The same statistic at 1% prevalence produces 693 true and 693 false positives out of 1,386
  flags — a positive predictive value of exactly 0.50** (Skorupski & Wainer, 2016,
  doi:10.4324/9781315743097-18). `T2`
- At 1% prevalence and a threshold of 2 standard errors (α ≈ 0.023), the posterior probability of
  cheating given a flag is 0.18 when the cheater distribution is centred 2 SD out and 0.31 when it
  is centred 5 SD out — 69%–82% of flags are innocent (Skorupski & Wainer, 2016, Table 18.3,
  doi:10.4324/9781315743097-18). `T2`
- Raising the threshold to 3 SD (α ≈ 1.35×10⁻³) lifts the posterior probability of cheating to
  0.54–0.88, and to 4 SD (α ≈ 3.17×10⁻⁵) lifts it to 0.88–0.99 (Skorupski & Wainer, 2016, Table
  18.3, doi:10.4324/9781315743097-18). `T2`
- The detection threshold matters more than the separation between cheater and non-cheater
  distributions, because with 99% of the distribution non-cheating the only way a flag reliably
  indicates cheating is a threshold that excludes practically all non-cheaters (Skorupski & Wainer,
  2016, doi:10.4324/9781315743097-18). `T2`
- At a 4 SD threshold the posterior probability of cheating is 0.996–0.998 across assumed prevalence
  priors from 0.001 to 0.5, so a sufficiently extreme threshold makes the prevalence assumption
  nearly irrelevant (Skorupski & Wainer, 2016, Table 18.4, doi:10.4324/9781315743097-18). `T2`
- In a real licensure examination with 5,640 within-centre examinee pairs, the posterior probability
  of answer copying exceeded 0.95 only for ω values above about 3.13, the 99.9th percentile of the
  standard normal (Sinharay, 2018, ED582037). `T2`
- Sinharay concluded from that real-data analysis that "flagging an examinee based on a p-value of,
  for example, 0.01, is quite likely to yield a false accusation" (Sinharay, 2018, ED582037). `T2`
- **A peer-reviewed DGM simulation calibrated to real medical-school examinations reported positive
  predictive values of 12.71%–14.84% at 5% true cheating prevalence and 29.54%–34.07% at 10%
  prevalence, using a 0.9 classification cut-off** (Severo et al., 2019, Table 2,
  doi:10.1186/s12909-019-1710-z). `T2`
- Those positive predictive values arose from specificity of 77.8%–78.2% and sensitivity of
  60.3%–69.8% in the 5% prevalence conditions (Severo et al., 2019, Table 2,
  doi:10.1186/s12909-019-1710-z). `T2`
- Positive predictive value only reached 85.3%–88.4% at 35% prevalence and 98.7%–99.1% at 70%
  prevalence — i.e. the index is only trustworthy where cheating is already the norm (Severo et al.,
  2019, Table 2, doi:10.1186/s12909-019-1710-z). `T2`
- The measured true prevalence of item preknowledge in those same examinations was 1.2%–3.7%, below
  the lowest simulated prevalence condition, with apparent prevalence of 0.0%–3.4% (Severo et al.,
  2019, doi:10.1186/s12909-019-1710-z). `T2`
- Self-reported item preknowledge in the same medical-student population was about 25% and
  self-reported answer copying at least once ranged from 52% to 67%, an order of magnitude above the
  statistically estimated true prevalence (Severo et al., 2019,
  doi:10.1186/s12909-019-1710-z). `T2`
- Across 11 examinations of the Royal College of Paediatrics and Child Health the detected
  prevalence of answer copying was 0.1% (as cited in Severo et al., 2019,
  doi:10.1186/s12909-019-1710-z). `T2`
- Standard 8.11 requires that when a score is cancelled or withheld for possible testing
  irregularities including suspected misconduct, the type of evidence and general procedures be
  explained to all affected test takers, who must be given a timely opportunity to provide
  contrary evidence and access to the evidence considered on request (AERA/APA/NCME, 2014, p. 136).
- Standard 8.12 entitles a test taker to fair treatment and a reasonable resolution process, which
  may range from internal review to a full administrative hearing depending on the magnitude of the
  consequences (AERA/APA/NCME, 2014, p. 137).
- Standard 8.10 requires that a test taker be notified and given the reason when an individual score
  report is significantly delayed because of possible irregularities such as suspected misconduct
  (AERA/APA/NCME, 2014, p. 136).
- Standard 9.17 requires that where score integrity is questioned, the test taker be informed of
  relevant rights including the possibility of appeal and representation by counsel (AERA/APA/NCME,
  2014, p. 146).
- The International Test Commission states that test takers suspected or accused of test fraud have
  the right to due process, and recommends treating scores as provisional pending completion of
  irregularity review and data-forensics analysis (ITC, 2014, Guidelines on the Security of Tests).
- A review of statistical, legal, and policy issues concluded that no mechanistic detection method
  then available could provide reliable evidence of cheating and that statistical evidence alone
  should not be used to accuse individuals (Dwyer & Hecht, 1995, ERIC ED382066).
- The same review held that corroborating evidence "should be viewed as a necessity, not a desired
  luxury," with probabilistic data best used as a trigger for investigation (Dwyer & Hecht, 1995,
  ERIC ED382066, citing Buss & Novick).
- A copying index yields different values depending on which examinee is treated as copier and which
  as source, so by itself it cannot identify which member of a pair is culpable (Wollack, 2004, *The
  Bar Examiner*).
- Absent a proctor witness to the copying, one cannot rule out the possibility of a false positive
  even for a high similarity value (Wollack, 2004, *The Bar Examiner*).
- Georgia's own erasure-analysis protocol states that results "are used as an initial flag to spur
  further investigation" and "do not indicate that cheating necessarily occurred" (Georgia
  Governor's Office of Student Achievement, erasure analysis process overview).
- The Atlanta special investigation recorded the testing vendor's framing that classroom
  wrong-to-right erasures more than three standard deviations above the state norm carried "only a
  one in 370 chance" of coincidence, five standard deviations one in 1.7 million, and seven standard
  deviations one in 390 billion (*Special Investigation into Test Tampering in Atlanta's School
  System*, 2011).
- Fifty Georgia Bureau of Investigation agents questioned teachers and principals at 58 Atlanta
  schools flagged by that erasure analysis, in a jurisdiction where lying to a law enforcement
  officer is a felony (Hechinger Report, 2011).
- **Contested:** Caveon stated in the Atlanta exhibits that it "would never recommend that our
  clients launch full-scale investigations solely on the basis of wrong-to-right erasures" and that
  such an approach "flies in the face of industry best practices" (Atlanta investigation exhibits,
  2011).
- Caveon further argued that many of the flagged Atlanta schools were "almost certainly" on the
  concern list for reasons unrelated to cheating, giving scanner misalignment corrections as one
  mechanism generating wrong-to-right erasures (Atlanta investigation exhibits, 2011).
- **Company claim, not independently verified:** Microsoft stated that forensic analysis is accurate
  enough to be used as the sole evidence for enforcement actions including permanent certification
  bans, citing a one-in-a-trillion chance of a false positive (Network World, 2011).
- Caveon's chief scientist could not give a definitive statement about model accuracy because the
  firm does not identify false negatives (Network World, 2011).
- A USA TODAY-led investigation of six states and the District of Columbia identified 1,610 examples
  of statistically rare, potentially suspect gains on state tests (Hechinger Report, 2011).
- In the District of Columbia, unusually high wrong-to-right answer-change rates appeared at 103
  schools from 2008 through 2010 (Washington Post, 2011).
- The D.C. state superintendent's office told the district that wrong-to-right erasure statistics
  alone "provide no insight into the reason for excessive erasures" and that follow-up investigation
  was required before conclusions could be drawn (D.C. testing documents, DocumentCloud).
- After the 2008 erasure flags the D.C. school district did not investigate flagged classrooms and
  instead reported strengthened test-security protocols (D.C. testing documents, DocumentCloud).
- In 2011, 70 of 5,089 D.C. classrooms at 38 schools were flagged on some combination of suspicious
  erasures, unusually large score gains, or unusual score patterns (Washington Post, 2012).
- At one Tampa charter school roughly 100 reading tests were invalidated in 2006 after an erasure
  analysis, while the principal reported that investigators interviewed only a few teachers, mostly
  to confirm security agreements had been signed (Hechinger Report, 2011).
- 33 states reported using erasure analysis to detect possible fraudulent test-taking behaviour in
  K-12 assessments in 2013 (Government Accountability Office, 2013, as cited in Sinharay, 2018,
  ED582037). `T2`

**DOK 2 — Summary:** At the prevalence actually measured on real examinations, the positive
predictive value of a statistical flag is low: exactly 0.50 in the canonical 1%-prevalence worked
example even with 99% sensitivity and specificity, and 12.7%–14.8% in a peer-reviewed simulation of
a preknowledge model at 5% prevalence. Getting the posterior probability of cheating above 0.95
requires thresholds around 3.1–4 standard deviations rather than conventional significance levels,
which is far more extreme than the α = 0.01 that operational programs commonly use. The
testing-standards regime independently requires notice, disclosure of the evidence, an opportunity
to rebut, and an appeal path, and the vendor, methodological, and legal-policy literatures largely
converge on statistics as a trigger rather than a verdict — a convergence that the documented
erasure cases show was not always honoured in practice.

**Link to source:**

- [Skorupski & Wainer (2016), The Case for Bayesian Methods when Investigating Test Fraud](https://doi.org/10.4324/9781315743097-18) — [open chapter text](https://centerforassessment.github.io/Colloquium_2019/img/Papers/Skorupski%20&%20Wainer.pdf) `T2`
- [Sinharay (2018), Application of Bayesian Methods for Detecting Fraudulent Behavior on Tests](https://files.eric.ed.gov/fulltext/ED582037.pdf) `T2`
- [Sinharay & Johnson (2020), Detecting test fraud using Bayes factors](https://doi.org/10.1007/s41237-020-00113-9) — [open preprint](https://files.eric.ed.gov/fulltext/ED606501.pdf) `T2`
- [Severo, Silva-Pereira, Ferreira, Monteiro & Pereira (2019), Item pre-knowledge true prevalence in clinical anatomy](https://doi.org/10.1186/s12909-019-1710-z) `T2`
- [AERA/APA/NCME (2014), Standards for Educational and Psychological Testing](https://testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf)
- [International Test Commission (2014), Guidelines on the Security of Tests, Examinations, and Other Assessments](https://www.intestcom.org/files/guideline_test_security.pdf)
- [NCME, Code of Professional Responsibilities in Educational Measurement](https://ncme.org/wp-content/uploads/2025/10/NCME_STUC_2023_CodeofProfResp_Final_Updated.pdf)
- [Dwyer & Hecht (1995), Cheating Detection: Statistical, Legal, and Policy Implications](https://files.eric.ed.gov/fulltext/ED382066.pdf)
- [Wollack (2004), Detecting Answer Copying on High-Stakes Exams, *The Bar Examiner* 73(2)](https://testing.wisc.edu/May2004BE_JamesWollack.pdf)
- [Georgia GOSA, Erasure Analysis Process Overview](https://gosa.georgia.gov/document/document/erasure-analysis-process-overview-final020316pdf/download)
- [Special Investigation into Test Tampering in Atlanta's School System (2011)](https://archive.org/stream/215252-special-investigation-into-test-tampering-in/215252-special-investigation-into-test-tampering-in_djvu.txt)
- [Atlanta investigation exhibits, including Caveon correspondence](https://archive.org/stream/215451-exhibits/215451-exhibits_djvu.txt)
- [Hechinger Report / USA TODAY (2011), When standardized test scores soared in D.C., were the gains real?](https://hechingerreport.org/when-standardized-test-scores-soared-in-d-c-were-the-gains-real/)
- [Hechinger Report / USA TODAY (2011), When test scores are too good to be true](https://hechingerreport.org/when-test-scores-are-too-good-to-be-true/)
- [D.C. testing documents (DocumentCloud)](https://www.documentcloud.org/documents/73991-day-three-documents/?mode=notes)
- [Washington Post (2011), Parents, teachers seek federal probe of D.C. erasing scandal](https://www.washingtonpost.com/blogs/answer-sheet/post/parents-teachers-seek-federal-probe-of-dc-erasing-scandal/2011/05/06/AFxmxABG_blog.html)
- [Washington Post (2012), Probe finds test cheating at several D.C. schools](https://www.washingtonpost.com/local/education/probe-finds-test-cheating-at-several-dc-schools/2012/06/22/gJQAD4UXvV_story.html)
- [Network World (2011), How data forensics help root out certification cheaters](https://www.networkworld.com/article/800708/infrastructure-management-how-data-forensics-help-root-out-certification-cheaters.html)
- [Hechinger Report (2011), In Georgia, test-answer erasures triggered criminal probe](https://hechingerreport.org/in-georgia-test-answer-erasures-triggered-criminal-probe/)
- [Poole, Copp & Musch (2023), A straightforward graphical/statistical approach to help substantiate cheating on multiple-choice examinations](https://doi.org/10.1152/advan.00195.2022) `T2`

---

## Candidate tensions

- Microsoft states forensic analysis is accurate enough to be the sole evidence for a permanent certification ban, while Caveon, Dwyer & Hecht, and Wollack all hold that corroborating evidence is a necessity and statistics only a trigger.
- Skorupski & Wainer show a nominal 1% Type I error rate yields a positive predictive value of 0.50 at 1% prevalence, while operational testing programs continue to flag at conventional α levels of 0.01 or 0.05.
- Wollack, Cohen & Eckerly report EDI with continuity correction has high power and controlled Type I error, while Sinharay reports the continuity-corrected version loses power and that the school-average erasure count many states actually used has low power.
- The Atlanta investigation treated a three-standard-deviation erasure excess as "almost statistically impossible" without an external cause, while Caveon in the same record argued that many flagged schools were on the list for reasons unrelated to cheating, including scanner misalignment corrections.
- Karabatsos ranks nonparametric person-fit statistics decisively above parametric ones, while Sinharay's re-analysis of the same simulations finds lz and ECI4z equally powerful and attributes the gap to comparison design.
- Severo et al. measure true item-preknowledge prevalence at 1.2%–3.7% by statistical modelling, while self-report in the same population gives roughly 25% for preknowledge and 52%–67% for answer copying.
- Sinharay's own response-time statistic performs well yet he insists it "should not be used as a sole measure," while the practical appeal of automated data forensics is precisely that it scales without investigators.
- Georgia's protocol and the D.C. superintendent both stated erasure statistics alone explain nothing and require follow-up, while D.C. skipped classroom investigation after the 2008 flags and a Tampa school had roughly 100 tests invalidated after interviews with only a few teachers.
- Eckerly notes collusion-cluster probability statements apply only to pairs and are sensitive to the clustering procedure, while the method's purpose is to accuse groups.
- Wise & Kong validate rapid-guessing thresholds by requiring flagged responses to be correct at chance rate, while Qian et al. use the opposite pattern — fast responses correct at 76.5% — as evidence of item compromise, so the same short latency reads as disengagement or as fraud depending on accuracy.
