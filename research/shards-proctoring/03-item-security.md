# 03 — Item and Item-Bank Security

**General idea.** Most cheat-detection literature asks how to catch a person; this shard asks
how the test itself gets stolen. An adaptive test built on maximum-information selection is
structurally biased toward leaking its most valuable items first: the algorithm keeps returning
to the same small, highly discriminating subset, so a handful of organised memorisers can
compromise the operationally useful core of a bank while leaving most of it untouched.
Published exposure-control algorithms (Sympson–Hetter, randomesque/Kingsbury–Zara,
progressive-restricted, a-stratified) exist to flatten that distribution, and the measured cost in
measurement precision turns out to depend enormously on which method and which pool — from
essentially zero to a 26% increase in RMSE, with a further 25% attributable to changing the
item-selection rule itself rather than to exposure control. The proposed escape from bank security
altogether is automatic item generation: if items are minted from templates or models on
demand, there is no fixed bank to steal. But the psychometric bill is real and specific — item
models must be calibrated, generated isomorphs are measurably *not* exchangeable in at least
one large figural bank, and a leaked item model compromises every item it ever produced. The
figural/visual case cuts both ways: figural items are the cheapest domain to generate
algorithmically, yet the claim that they are harder to steal or transmit has no published support,
and generated figural forms have repeatedly failed to behave as parallel forms on retest.

---

### 1. Exposure control in adaptive testing: what each algorithm buys and what it charges

**Source:** Simulation comparisons of published item-exposure-control algorithms across pool
sizes, IRT models, and stopping rules (Georgiadou/Triantafillou/Economides review; Boztunç
Öztürk & Doğan; Karagianni & Tsaousis; Leroux and colleagues; Lee & Dodd; Wainer; Stocking;
Lim & Han).

**DOK 1 — Facts:**

- Exposure-control strategies partition into randomisation, conditional-probability, stratified, and hybrid families, all of which work by degrading the "always pick the single most informative item" rule (Georgiadou, Triantafillou & Economides 2007) `T2`
- Randomesque selection administers one item drawn at random from the top-*k* most informative candidates and, unlike the earlier 5-4-3-2-1 strategy, never reverts to pure maximum-information selection (Kingsbury & Zara 1989) `T2`
- Sympson–Hetter separates the probability an item is *selected* from the probability it is *administered*, using control parameters derived from prior simulation runs (Sympson & Hetter 1985, as described in Boztunç Öztürk & Doğan 2015) `T2`
- Sympson–Hetter control parameters are pool-specific and must be recomputed whenever the pool changes, an operational cost the randomisation and hybrid families do not incur (Boztunç Öztürk & Doğan 2015) `T2`
- Stocking and Lewis characterised the exposure/precision relation as a balloon — squeeze one side and the other swells (quoted in Boztunç Öztürk & Doğan 2015) `T2`
- In a 500-item pool delivering 25-item adaptive tests, maximum-Fisher-information selection with no exposure control left 293 items (58.6%) never administered in any of 25 replications (Boztunç Öztürk & Doğan 2015) `T2`
- Under that same no-control condition the maximum observed exposure rate reached 1.0, meaning some items were shown to every single examinee (Boztunç Öztürk & Doğan 2015) `T2`
- Adding Sympson–Hetter to maximum-information selection raised RMSE from 0.1748 to 0.1900 in a medium-difficulty pool and from 0.2168 to 0.2734 (+26%) in a hard pool (Boztunç Öztürk & Doğan 2015) `T2`
- Switching from maximum-information to a-stratified selection raised RMSE from 0.1748 to 0.2186 (+25%) before any exposure control was applied at all (Boztunç Öztürk & Doğan 2015) `T2`
- No condition in that study reached the ideal test-overlap rate of 0.05, the best achieved being 0.097 under a-stratification plus Fade-Away (Boztunç Öztürk & Doğan 2015) `T2`
- In a 160-item abstract-reasoning bank delivering 30-item adaptive tests to 10,000 simulees, bias ranged only 0.002–0.007 and standard error of estimation only 0.26–0.27 across six exposure-control methods *and* the no-control baseline (Karagianni & Tsaousis 2026) `T2`
- In that same study progressive-restricted control used 100% of the bank at 18% mean exposure, while every other method including no control used only 73.13–76.88% (Karagianni & Tsaousis 2026) `T2`
- Under no exposure control 44% of administered items exceeded the 0.20 target exposure rate, versus 31% under progressive-restricted (Karagianni & Tsaousis 2026) `T2`
- Under a 3PL model, randomesque, Sympson–Hetter and no-control procedures administered at most 52% of a large bank and at most 80% of a small one, while progressive-restricted-standard-error administered almost all items at comparable precision (Leroux, Lopez, Hembry & Dodd 2013) `T2`
- With a 172-item pool and a predicted-standard-error-reduction stopping rule, no control left 68% of the pool unadministered, randomesque-3 left 62%, randomesque-6 left 56%, and progressive-restricted-standard-error left 0% (Leroux et al. 2019) `T2`
- Maximum-information selection left between 13% and 33% of a polytomous pool unused depending on pool difficulty and ability distribution, while progressive-restricted left 0% (Lee & Dodd 2012) `T2`
- In a variable-length shadow-test design, maximum-Fisher-information selection left 35.6% of the bank unused, overexposed 10.3% of items, and produced a 33.6% test-overlap rate, all of which a stratification modification cut to 5.0%, 7.2% and 21.4% (Lim & Han 2025) `T2`
- Across three polytomous IRT models, randomesque and within-.10-logits with six-item candidate groups gave the best exposure control per unit of precision lost, while a-stratified and enhanced a-stratified "turned in surprisingly poor performances across all variables" (Davis 2002)
- In that same study Sympson–Hetter and conditional Sympson–Hetter did hold exposure to target but were "difficult and time consuming to implement" and disappointing on pool utilisation (Davis 2002)
- Wainer argued from item-usage distributions that pool security rises only linearly as pool size rises exponentially, making "just build a bigger bank" economically infeasible (Wainer 2000) `T2`
- Retrospective analysis of five operational pools found pools worth six to eight linear tests sufficient for adaptive tests half the length of a parallel linear test, but insufficient for exposure control under continuous administration (Stocking 1994)
- An early study reported 141 of 260 items never administered under maximum-information selection, cited here secondhand from a 1983 conference-era source and not independently verified (Hulin, Drasgow & Parsons 1983, as cited in Boztunç Öztürk & Doğan 2015) — **secondhand, unverified at source**

**DOK 2 — Summary:** Exposure control reliably shifts the exposure distribution but the
precision it costs is not a fixed price — it ranges from statistically indistinguishable
(Karagianni & Tsaousis; Leroux) to a 26% RMSE increase in a hard pool (Boztunç Öztürk & Doğan),
and the divergence appears to track pool difficulty and stopping rule. A separate and comparable
cost, roughly 25% of RMSE, comes from switching the item-selection rule to a-stratified before any
exposure control is applied, so studies that change both at once overstate what exposure control
alone charges. The dominant finding across studies is that plain
maximum-information selection strands 13–68% of a bank unused while pushing some items to
100% exposure, and that hybrid progressive-restricted methods achieve full pool utilisation
without a precision penalty. Nobody reports reaching a theoretically ideal overlap rate, and
Wainer's argument implies pool size cannot be bought out of the problem.

**Link to source:**

- [Georgiadou, Triantafillou & Economides (2007), *A Review of Item Exposure Control Strategies for CAT 1983–2005*, JTLA 5(8)](https://files.eric.ed.gov/fulltext/EJ838610.pdf) `T2`
- [Kingsbury & Zara (1989), *Procedures for Selecting Items for Computerized Adaptive Tests*, Applied Measurement in Education 2(4), 359–375](https://doi.org/10.1207/s15324818ame0204_6) `T2`
- [Boztunç Öztürk & Doğan (2015), *Investigating Item Exposure Control Methods in CAT*, Educational Sciences: Theory & Practice 15(1), 85–98 — full text](https://files.eric.ed.gov/fulltext/EJ1057460.pdf) (DOI `10.12738/estp.2015.1.2593` is registered but its publisher redirect is dead) `T2`
- [Karagianni & Tsaousis (2026), *Balancing exposure and efficiency*, Frontiers in Education 11:1769909](https://doi.org/10.3389/feduc.2026.1769909) `T2`
- [Leroux, Lopez, Hembry & Dodd (2013), *A Comparison of Exposure Control Procedures in CATs Using the 3PL Model*, EPM 73(5), 857–874](https://doi.org/10.1177/0013164413486802) `T2`
- [Leroux et al. (2019), *An Investigation of Exposure Control Methods With Variable-Length CAT Using the Partial Credit Model*, APM 43(8), 624–638](https://doi.org/10.1177/0146621618824856) `T2`
- [Lee & Dodd (2012), *Comparison of Exposure Controls, Item Pool Characteristics, and Population Distributions for CAT*, EPM 72(1), 159–175](https://doi.org/10.1177/0013164411411296) `T2`
- [Lim & Han (2025), *Improving item pool utilization … a shadow-test approach*, J Educ Eval Health Prof 22:35](https://doi.org/10.3352/jeehp.2025.22.35) `T2`
- [Wainer (2000), *Rescuing Computerized Testing by Breaking Zipf's Law*, JEBS 25(2), 203–224](https://doi.org/10.3102/10769986025002203) `T2`
- [Stocking (1994), *Three Practical Issues for Modern Adaptive Testing Item Pools*, ETS Research Report Series 1994(1)](https://doi.org/10.1002/j.2333-8504.1994.tb01578.x)
- [Davis (2002), *Strategies for controlling item exposure in computerized adaptive testing with polytomously scored items*, doctoral dissertation, University of Texas at Austin](https://repositories.lib.utexas.edu/items/ecc2b4f8-347b-4e79-89b5-b35d84486b8a)

---

### 2. The structural vulnerability of adaptive selection, and organised bank compromise

**Source:** Item-theft severity simulations under realistic adaptive selection rules, plus field
and forensic evidence on braindump compromise and exposure-driven parameter drift (Yi, Zhang &
Chang; Chang & Zhang; Zhang & Chang; Foster; International Test Commission; van der Linden &
Glas; Zimmermann, Klusmann & Hampe).

**DOK 1 — Facts:**

- Maximum-information selection with Sympson–Hetter control administered only 69% of a 480-item pool, shrinking the *effective* pool from 480 to 332 items (Yi, Zhang & Chang 2008) `T2`
- That concentration drove the observed average test-overlap rate to 17.5% under maximum-information-plus-Sympson–Hetter versus 10.6% under a-stratified selection with the same control (Yi, Zhang & Chang 2008) `T2`
- With 30 thieves each memorising 10 items from among the first 1,000 examinees, a later examinee met on average 27.8 of 40 items already compromised under maximum-information-plus-Sympson–Hetter, versus 20.1 under a-stratified and 17.3 under randomised selection (Yi, Zhang & Chang 2008) `T2`
- Maximum-information selection produced *fewer* distinct compromised items (170) than randomised selection (218) from the same 300 memorisation slots, yet caused more damage, because the stolen items were precisely the ones being re-administered (Yi, Zhang & Chang 2008) `T2`
- The identical theft carried out among the last 5,000 examinees compromised only 10.7 items per examinee versus 27.8 among the first 1,000, making early-pool-life theft roughly 2.6 times as damaging (Yi, Zhang & Chang 2008) `T2`
- Of the three designs tested, maximum-information selection *with* Sympson–Hetter exposure control was the most vulnerable to organised item theft (Yi, Zhang & Chang 2008) `T2`
- Under randomised selection, 34 thieves memorising 20 items each compromise 50% of a 1,000-item pool but only 17 are needed for a 500-item pool (Chang & Zhang 2003, reported in Yi, Zhang & Chang 2008) — **conference paper, secondhand**
- Test-overlap-rate lower bounds derived from the hypergeometric family let a program compare an algorithm's observed overlap against the best theoretically achievable, with a large gap indicating the design needs work (Chang & Zhang 2002) `T2`
- Splitting a bank into multiple randomly assigned pools reduces the expected number of compromised items an examinee encounters relative to a single whole pool, but only under characterised conditions (Zhang & Chang 2005)
- An entire technology-delivered test session, including every question, can be captured automatically by a digital recording system attached to a computer output port (International Test Commission 2014)
- Organised memorisation of items for later reconstruction and distribution is the practice the testing industry designates "harvesting" (International Test Commission 2014)
- Hundreds of certification test files purchased from braindump sites matched the original published test files at 99–100% content overlap (Foster & Zervos 2006, reported in Foster 2016) — **conference poster, vendor-sourced, not independently replicated**
- One vendor analysis inferred that more than 80% of 598 takers of a popular certification exam used braindump content, and that the pass rate would have been 7% rather than the observed 93% without it (Maynes 2009, reported in Foster 2016) — **company claim, single exam, not independently replicated**
- Server-side theft is the most devastating variety because the complete operational pool is stolen at once rather than item by item (Foster 2016)
- A disclosed item is expected to show drift in its item parameters, which motivates applying statistical quality-control charts to parameters re-estimated from live adaptive data (van der Linden & Glas 2000) `T2`
- In simulated preknowledge on an operational medical-admissions test, a drop in discrimination combined with a rise in local item dependence detected compromised items with sensitivity 1.0 and specificity .95 when 11 of 80 items were preknown to 10% of takers (Zimmermann, Klusmann & Hampe 2016) `T2`
- In that same study, cheating groups smaller than 5% of test takers were not detected reliably by any indicator (Zimmermann, Klusmann & Hampe 2016) `T2`
- Item difficulty can also drop because a cohort was better prepared or the curriculum shifted, so parameter drift alone is not proof of leakage (Zimmermann, Klusmann & Hampe 2016) `T2`
- Drift-based leak detection has a bootstrapping problem: the anchor set used to equate two administrations must itself be uncompromised, which cannot be established before equating (Zimmermann, Klusmann & Hampe 2016) `T2`
- Item designs that resist theft are rare, and the intuition that items demanding more than factual recall are harder to steal and share has no research support (Foster 2016)

**DOK 2 — Summary:** The measured concentration figures show the adaptive-specific failure
mode directly: maximum-information selection with exposure control produced *fewer* stolen items
than random selection yet substantially more damage, because the items it leaks are the ones it
keeps re-serving. Timing dominates magnitude — theft during a pool's first tenth of life was
roughly 2.6 times as damaging as the same theft later — and forensic detection of the resulting
drift works well only above roughly a 5% cheating base rate. The most cited real-world
compromise numbers (99–100% braindump fidelity, >80% braindump usage) come from vendor and
conference sources rather than independent peer review.

**Link to source:**

- [Yi, Zhang & Chang (2008), *Severity of Organized Item Theft in Computerized Adaptive Testing: A Simulation Study*, APM 32(7), 543–558](https://doi.org/10.1177/0146621607311336) `T2`
- [Yi, Zhang & Chang (2006), *Severity of Organized Item Theft in CAT: An Empirical Study*, ETS Research Report Series 2006(2), i–25 — the report version carrying the fuller tables](https://doi.org/10.1002/j.2333-8504.2006.tb02028.x)
- [Chang & Zhang (2002), *Hypergeometric Family and Item Overlap Rates in CAT*, Psychometrika 67(3), 387–398](https://doi.org/10.1007/BF02294991) `T2`
- [Zhang & Chang (2005), *The Effectiveness of Enhancing Test Security by Using Multiple Item Pools*, ETS Research Report 05-19](https://doi.org/10.1002/j.2333-8504.2005.tb01996.x)
- [Foster (2016), *Testing Technology and Its Effects on Test Security*, in Drasgow (ed.) *Technology and Testing*, ch. 11](https://doi.org/10.4324/9781315871493-13)
- [International Test Commission (2014), *Guidelines on the Security of Tests, Examinations, and Other Assessments*](https://www.intestcom.org/files/guideline_test_security.pdf)
- [van der Linden & Glas (2000), *Detection of Known Items in Adaptive Testing with a Statistical Quality Control Method*, JEBS 25(4), 373–389](https://doi.org/10.3102/10769986025004373) `T2`
- [Zimmermann, Klusmann & Hampe (2016), *Are Exam Questions Known in Advance? Using Local Dependence to Detect Cheating*, PLOS ONE 11(12): e0167545](https://doi.org/10.1371/journal.pone.0167545) `T2`

---

### 3. Automatic item generation as a security strategy, and its psychometric bill — including figural items

**Source:** AIG methodology reviews and cost analyses, plus calibration and retest studies of
automatically generated figural/matrix items (Sommer & Arendasy; Kosh et al.; National
Academies; Glas & van der Linden; Sinharay, Johnson & Williamson; Zorowitz et al.; Blum &
Holling; Freund, Hofer & Holling; Matzen et al.; Harris et al.; Arendasy & Sommer; Freund &
Holling; Scharfen, Peters & Holling; Schneider et al.).

**DOK 1 — Facts:**

- Isomorphs vary only incidental surface features and are hypothesised to carry statistically identical parameters, whereas variants vary radicals and are expected to differ (Bejar 2002, as characterised in Sommer & Arendasy 2025) `T2`
- Calibrating item *models* rather than individual items saves money only when within-family parameter variation is low and adequately modelled, which the reviewers state "is not always the case" (Sommer & Arendasy 2025) `T2`
- Bayesian hierarchical family expected response functions were developed precisely because items from one family are statistically dependent and cannot be calibrated as independent items (Sinharay, Johnson & Williamson 2003) `T2`
- Substituting predicted for empirically calibrated item parameters has negligible effect on person estimates only when radicals explain R² ≥ 0.80 of item-parameter variance (Sommer & Arendasy 2025) `T2`
- Cognitive-design-system generators achieved correlations of R = 0.70 to 0.90 between predicted and estimated difficulty, i.e. 49–80% of item-difficulty variance explained (Sommer & Arendasy 2025) `T2`
- Automatic min-max generators achieved R = 0.89 to 0.96 across sets of 120–320 items with reported item loss of ≤1% even under the Rasch model (Sommer & Arendasy 2025) `T2`
- One transformer-generated item set had radicals explaining only R² = 0.29 of difficulty variance and R² = 0.10 of discrimination variance (Runge et al. 2024, reported in Sommer & Arendasy 2025) `T2`
- Another transformer-generated set retained only 454 of 789 items (57.5%) after expert-panel review, and the surviving items' classical difficulty and discrimination statistics "varied considerably" (Attali et al. 2022, reported in Sommer & Arendasy 2025) `T2`
- Deployed generators have implemented only *k* = 6 to roughly *k* = 60 distinct item models, which caps the number of psychometrically distinct items obtainable regardless of how many instances are minted (Sommer & Arendasy 2025) `T2`
- If a single item model leaks, every item ever generated from it is compromised and must be withdrawn, making item-model generation *more* exposed to organised theft than element-based generation where theft proceeds item by item (Sommer & Arendasy 2025) `T2`
- Administering two isomorphs of one model within a session induces local dependence and biases the person-parameter estimate, so generation requires exposure control at the model level in addition to the item level (Glas & van der Linden 2003; Sommer & Arendasy 2025) `T2`
- Automatic generation beat manual item writing on cost only above 173–247 items within a single fine-grained content area (Kosh, Simpson, Bickel, Kellogg & Sanford-Moore 2019) `T2`
- Item creation and review for one selected-response item on a large national assessment cost $1,000–$2,500, with an all-item-types weighted average near $3,700 (National Academies 2022)
- In a matrix-reasoning bank whose clones differ only in shape set, clone-level residual variance accounted for 35.1% of total difficulty variance across clones, estimated at 0.620 (95% HDI 0.538–0.701) (Zorowitz, Chierchia, Blakemore & Daw 2024) `T2`
- That residual corresponded to a mean absolute difficulty difference of 0.705 logits between clones of the same item, leading the authors to conclude clones "cannot be assumed to be exchangeable" (Zorowitz et al. 2024) `T2`
- In the same bank, distractor type alone produced a 19.9% accuracy reduction on otherwise identical items — a result that **contradicts an earlier study of the same bank** (Zorowitz et al. 2024, vs Chierchia et al. 2019) — **non-replication**
- Clone-level variance was credible for difficulty but not for discrimination, so non-equivalence in that bank was parameter-specific rather than global (Zorowitz et al. 2024) `T2`
- For 23 automatically generated figural analogies administered to 307 people, Rasch and rule-based (LLTM) difficulty estimates correlated r = 0.74 (r² = 0.55), and the rule-based model fitted significantly worse than the descriptive model (Blum & Holling 2018) `T2`
- For 25 computer-generated figural matrix items administered to 169 people, Rasch and LLTM difficulty estimates correlated r = 0.71 (Freund, Hofer & Holling 2008) `T2`
- Raven-like matrix generation software can produce effectively unlimited items, but many items used in its own norming study required manual alteration to fix distractors (Matzen et al. 2010) `T2`
- A later psychometric review of that generator noted the time to generate and curate new items may itself hinder adoption, and published fixed pregenerated item sets with IRT parameters instead (Harris, McMillan, Listyg, Matzen & Carter 2020) `T2`
- With 358 respondents, retest gains on generated *isomorphic* alternate forms were as pronounced as on identical forms, while psychometrically matched forms — same parameters, different radicals — produced smaller gains (Arendasy & Sommer 2013) `T2`
- Alternate forms whose items differ only in non-salient surface features produce retest gains almost identical to identical forms (Arendasy & Sommer 2013; Matton et al. 2011; Morley et al. 2004, as summarised in Sommer & Arendasy 2025) `T2`
- Meta-analytic retest gains were SMCR = 0.37 for identical material and 0.23 for alternate forms across 174 samples and 153,185 participants, with no further gain after the third administration (Scharfen, Peters & Holling 2018) `T2`
- With 189 people taking two tests of figural matrices generated to a strict construction rationale, item difficulty parameters were **not invariant across time**, and identical versus parallel generated forms differed little at the individual level (Freund & Holling 2011) `T2`
- A 6:41-minute video teaching five figural-matrix rules raised Raven's Advanced Progressive Matrices scores at d = 0.52, 0.56 and 0.81 in three experiments, but at d = 0.14 and non-significantly in a fourth (Loesche et al. 2015, as reported in Schneider, Becker, Krieger, Spinath & Sparfeldt 2020) — **one of four experiments failed; reported secondhand**
- Generation-based rotating item pools have been argued to reduce exposure and enhance security, but the reviewers state that more studies calibrating generated items are needed before isomorph parameter equivalence can be assumed (Sommer & Arendasy 2025) `T2`

**DOK 2 — Summary:** AIG's security promise depends entirely on a psychometric claim that the
strongest available figural evidence contradicts: in a large matrix-reasoning bank, clones
differing only in shape set showed 35.1% of difficulty variance at the clone level and a mean
0.705-logit spread, and the authors concluded clones are not exchangeable. Rule-based difficulty
prediction for figural items lands around r = 0.71–0.74 (roughly half the variance) in
independent studies, well below the R² ≥ 0.80 threshold at which substituting predicted for
calibrated parameters is held to be harmless — although min-max generators in other domains
report R = 0.89–0.96. Separately, generated isomorphs do not blunt score gains on retest any
better than reusing the identical item, and a leaked item model compromises its entire
progeny at once.

**Link to source:**

- [Sommer & Arendasy (2025), *Automatic- and Transformer-Based Automatic Item Generation: A Critical Review*, Journal of Intelligence 13(8), 102](https://doi.org/10.3390/jintelligence13080102) `T2`
- [Kosh, Simpson, Bickel, Kellogg & Sanford-Moore (2019), *A Cost–Benefit Analysis of Automatic Item Generation*, EM:IP 38(1), 48–53](https://doi.org/10.1111/emip.12237) `T2`
- [National Academies of Sciences, Engineering, and Medicine (2022), *A Pragmatic Future for NAEP*, ch. 4 "Item Development"](https://www.nationalacademies.org/read/26427/chapter/6)
- [Glas & van der Linden (2003), *Computerized Adaptive Testing With Item Cloning*, APM 27(4), 247–261](https://doi.org/10.1177/0146621603027004001) `T2`
- [Sinharay, Johnson & Williamson (2003), *Calibrating Item Families and Summarizing the Results Using Family Expected Response Functions*, JEBS 28(4), 295–313](https://doi.org/10.3102/10769986028004295) `T2`
- [Zorowitz, Chierchia, Blakemore & Daw (2024), *An item response theory analysis of the matrix reasoning item bank (MaRs-IB)*, Behavior Research Methods 56, 1104–1122](https://doi.org/10.3758/s13428-023-02067-8) `T2`
- [Blum & Holling (2018), *Automatic Generation of Figural Analogies With the IMak Package*, Frontiers in Psychology 9:1286](https://doi.org/10.3389/fpsyg.2018.01286) `T2`
- [Freund, Hofer & Holling (2008), *Explaining and Controlling for the Psychometric Properties of Computer-Generated Figural Matrix Items*, APM 32(3), 195–210](https://doi.org/10.1177/0146621607306972) `T2`
- [Matzen et al. (2010), *Recreating Raven's: Software for systematically generating large numbers of Raven-like matrix problems with normed properties*, Behavior Research Methods 42(2), 525–541](https://doi.org/10.3758/brm.42.2.525) `T2`
- [Harris, McMillan, Listyg, Matzen & Carter (2020), *Measuring Intelligence with the Sandia Matrices*, Personnel Assessment and Decisions 6(3)](https://doi.org/10.25035/pad.2020.03.006) `T2`
- [Arendasy & Sommer (2013), *Quantitative differences in retest effects across different methods used to construct alternate test forms*, Intelligence 41(3), 181–192](https://doi.org/10.1016/j.intell.2013.02.004) `T2`
- [Freund & Holling (2011), *How to get really smart: Modeling retest and training effects in ability testing using computer-generated figural matrix items*, Intelligence 39(4), 233–243](https://doi.org/10.1016/j.intell.2011.02.009) `T2`
- [Scharfen, Peters & Holling (2018), *Retest effects in cognitive ability tests: A meta-analysis*, Intelligence 67, 44–66](https://doi.org/10.1016/j.intell.2018.01.003) `T2`
- [Schneider, Becker, Krieger, Spinath & Sparfeldt (2020), *Teaching the underlying rules of figural matrices in a short video increases test scores*, Intelligence 82:101473](https://doi.org/10.1016/j.intell.2020.101473) `T2`

---

## Candidate tensions

- Karagianni & Tsaousis and Leroux et al. find exposure control costs essentially nothing in precision; Boztunç Öztürk & Doğan measure a 26% RMSE increase from the same named algorithms — the studies disagree on the price of the same goods.
- Sympson–Hetter is presented across the literature as the workhorse conditional method, yet the item-theft simulation found maximum-information-plus-Sympson–Hetter to be the *most* vulnerable design tested, because capping per-item exposure does not stop the algorithm from concentrating on a small effective pool.
- Wainer holds that pool size cannot buy security because the relationship is exponential; Chang & Zhang's thief-count arithmetic and Stocking's pool-sizing guidance both treat larger and multiplied pools as a workable lever.
- a-stratification is recommended as the better security choice in one comparison and dismissed as turning in "surprisingly poor performances across all variables" in a polytomous dissertation study — the method's standing is unresolved.
- Weak-theory AIG proponents hold that calibrating item models plus subject-matter-expert content review suffices for high-stakes use; strong-theory proponents require explanatory IRT validation of radicals, and Sommer & Arendasy argue the weak-theory route leaves cost savings and validity unverifiable.
- Item-model AIG is promoted as reducing exposure risk; the same review argues item models *increase* organised-theft exposure because one leaked model compromises every instance, whereas element-based generation leaks item by item.
- Generated isomorphs are assumed exchangeable in the AIG security argument; the MaRs-IB calibration finds 35.1% of clone-level difficulty variance unexplained and declares them non-exchangeable — and itself fails to replicate an earlier distractor-type finding on the same bank.
- Isomorphic alternate forms are proposed as the mechanism for secure rotation, yet retest studies find gains on surface-feature-only alternate forms are as large as on identical forms, so the same devices that defeat verbatim item theft may not defeat preknowledge.
- Sandia and IMak-style generators are described as producing effectively unlimited figural items, while both the original norming report and a later psychometric review note substantial manual distractor curation was required — "free items" and "usable items" are not the same quantity.
- Foster states there is no research supporting the belief that harder-to-verbalise or higher-order items resist theft, which cuts against the intuition that figural/visual items are intrinsically safer than verbal ones; the ITC guidance that a digital recorder can capture an entire session regardless of modality points the same way.
- Freund & Holling report that algorithmically generated figural matrix forms showed item-difficulty non-invariance across time and behaved little differently from identical forms, which is in tension with claims that strict construction rationales deliver genuinely parallel figural forms.
- Drift-based leak detection is offered as the operational safeguard, but its own authors note the equating anchor must be uncompromised to work and that sub-5% cheating groups escape detection — so absence of detected drift is weak evidence of an intact bank.
