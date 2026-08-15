# Annotated Source Register — GT Admissions BrainLift (Complete Merged Ledger)

## Provenance and source-completeness

This ledger is a complete merger of the original gifted-assessment-quality and gt-school-counterfactual BrainLift source registers, preserving every original source entry, including weak, vendor, opinion, contested, and verification-gap entries. Sources appearing in both registers remain in both provenance branches rather than being silently deduplicated; this makes both original uses auditable. Additive material is explicitly marked: first the unvetted an unvetted, overnight-scraped secondary evidence compilation, then the 2026-07-22 integration from the test-effectiveness metrics research, in-house cognitive-test research notes, and cognitive-test design-guide notes. Original verification, inference, vendor, and COI labels are preserved and never upgraded merely because a source was integrated.

**Completeness confirmation:** all entries from both original registers are represented verbatim below, including Tier A/B/C classifications, author stakes/COIs, URLs/DOIs, corrections, and verification flags. This document does not convert dossier claims into verified facts.

## Shared ledger conventions

- **Tier A** = load-bearing; **Tier B** = supporting with stated caveat; **Tier C** = context, claim-under-test, vendor, opinion, or unverified material.
- Dossier labels retain their original meaning: `[VERIFIED]`, `[PRESS]`, `[ESTIMATE]`, `[INFERENCE]`, `[UNVERIFIED]`, and `[COMPANY CLAIM]`.
- Corrections that govern both branches: Lohman & Korb says approximately half fall out of top-3% status in one year and 35–40% remain from grade 3 to 8; N=320/44% doctorate is Kell/Lubinski/Benbow **2013**; Assouline DOI is `10.1177/0734282911433946`; Thompson & Weiss (2011) is *A Framework for the Development of CAT*; Wai headline is **70%**; “attention span equals age in minutes” is unverified/likely myth; no high-stakes K–8 gamified-assessment validation exists; CogAT current-form tail statistics are `[UNVERIFIED]`.

---

## 2026-07-22 integration addendum

This addendum records the sources newly promoted into the unified Knowledge Tree. The overnight A1–A12 report contains 190 labeled findings but is not independently re-vetted as a whole; only the sources below were promoted. Proposed designs, worked examples, software/tool lists, vendor estimates, and unresolved Wave-7 topics remain in the research reports.

### Tail precision, decision metrics, fairness, and comparison

- **Green, Bock, Humphreys, Linn & Reckase (1984), "Technical guidelines for assessing computerized adaptive tests," *JEM* 21(4):347–360. DOI 10.1111/j.1745-3984.1984.tb01039.x.** `[VERIFIED]` Tier A/B foundational-method source. **Use:** 9.1 marginal/empirical IRT reliability; it is **not** the source for difference-score reliability.
- **Trafimow (2015), difference-score reliability. DOI 10.1080/23311835.2015.1064626; Lord & Novick (1968).** `[VERIFIED]` / foundational. **Use:** 9.2 formula and profile/tilt-score caution.
- **Saito & Rehmsmeier (2015), *PLOS ONE*. DOI 10.1371/journal.pone.0118432; Manning, Raghavan & Schütze (2008), *Introduction to Information Retrieval*.** `[VERIFIED]` Tier A/B. **Use:** 9.10 PR-AUC baseline and precision@k/recall@k. Application to fixed GT capacity is a reasoned mapping; GT's actual capacity remains unverified.
- **Raju, van der Linden & Fleer (1995), *APM*. DOI 10.1177/014662169501900405; Millsap (1997), *Psychological Methods*. DOI 10.1037/1082-989X.2.3.248.** `[VERIFIED]` Tier A. **Use:** 9.11 DTF and the measurement–prediction duality.
- **Kleinberg, Mullainathan & Raghavan (2017), ITCS. DOI 10.4230/LIPIcs.ITCS.2017.43; Chouldechova (2017), *Big Data*.** `[VERIFIED]/[SECONDARY]` Tier A/B. **Use:** 9.11 fairness-impossibility boundary; does not choose a fairness policy.
- **Begg & Greenes (1983), *Biometrics*. DOI 10.2307/2530820; Ransohoff & Feinstein (1978), *NEJM*. DOI 10.1056/NEJM197810262991705; Rubin (1976), *Biometrika*. DOI 10.1093/biomet/63.3.581.** `[VERIFIED]` Tier A. **Use:** 9.12 verification/spectrum bias and the MAR/MNAR identification boundary.
- **Kane (1994), *RER*. DOI 10.3102/00346543064003425; Brennan & Lockwood (1980), *APM*. DOI 10.1177/014662168000400209.** `[VERIFIED]` Tier A. **Use:** 9.13 standard-setting validity and uncertainty of the cut.
- **Warm (1989), *Psychometrika*. DOI 10.1007/BF02294627; Bock & Mislevy (1982), *APM*. DOI 10.1177/014662168200600405.** `[VERIFIED]` Tier A. **Use:** 10.10 directional tail bias of MLE/WLE/EAP/MAP.
- **Reckase (2010), *Psychological Test and Assessment Modeling* 52(2):127–141; Belov & Armstrong (2005), *APM*. DOI 10.1177/0146621605275413; Eggen & Straetmans (2000), *EPM*. DOI 10.1177/00131640021970862.** `[VERIFIED]` Tier A/B. **Use:** 10.10 pool-depth audit and classification CAT. Worked pool-size targets in the overnight report remain `[INFERENCE]` and were not promoted.
- **van der Linden (1984), *Statistica Neerlandica*. DOI 10.1111/j.1467-9574.1984.tb01101.x; Kolen & Brennan (2014), DOI 10.1007/978-1-4939-0317-7; Linn (1993), DOI 10.1207/s15324818ame0601_5; DeLong et al. (1988), DOI 10.2307/2531595.** `[VERIFIED]` Tier A. **Use:** 11.5/11.8 relative efficiency, linking strength, and paired comparison.
- **Oosterhuis, van der Ark & Sijtsma (2016), *Assessment*. DOI 10.1177/1073191115580638.** `[VERIFIED]` Tier A/B. **Use:** 11.2 continuous-norming efficiency.
- **Sackett, Zhang, Berry & Lievens (2022), *JAP*. DOI 10.1037/apl0000994.** `[VERIFIED, contested major correction]` Tier A. **Use:** 4.4; pair the revised ~.31 operational-validity estimate with Schmidt & Hunter's ~.51 rather than silently replacing it.

### Selection/evaluation additions

- **Cheung & Slavin (2016), *Educational Researcher*. DOI 10.3102/0013189X16656615.** `[VERIFIED]` Tier A. **Use:** 3.4 average QED-versus-RCT difference across 645 studies; not proof every observational estimate is inflated.
- **Card & Giuliano (2016), *PNAS*, DOI 10.1073/pnas.1605043113; *AER*, DOI 10.1257/aer.20150484.** `[VERIFIED]` Tier A. **New uses:** 3.3 disadvantaged-complier/deconcentration facts; 3.7 positive achievement-rank RD versus essentially null IQ-threshold RD. Keep the two papers distinct.
- **Gleason et al. (2010), NCEE 2010-4029, ERIC ED510573.** `[VERIFIED official evaluation]` Tier A/B. **Use:** 3.9 pooled lottery scale and oversubscription transfer caveat.
- **SSP FY2025 annual report and 2026 evaluation materials.** `[VERIFIED official-source operational context]` Tier B/C. **Use:** 3.10 official 3,739 applications / 16% admitted / 588 enrolled for FY2025; 2026 qualified-pool size remains undisclosed.

### Child administration, security, game assessment, and open task precedents

- **Scharfen, Peters & Holling (2018), *Intelligence* 67:44–66. DOI 10.1016/j.intell.2018.01.003; Bors & Vigneau (2003).** `[VERIFIED]` Tier A/B. **Use:** 6.3 cognitive-test retest/form-reuse and matrix-strategy effects. No CogAT-specific coaching trial was located.
- **Riverside CogAT Form 7 short guide; EBSCO CogAT overview; WISC-V/WPPSI-IV/WJ-IV/SB5/NIH Toolbox administration materials.** `[VERIFIED official/publisher or strong-secondary; publisher-COI]` Tier B/C. **Use:** 7.4–7.5 concrete age and task mechanics. These describe formats, not independent validity.
- **Aneni, de la Vega, Jiao, Funaro & Fiellin (2023), *Progress in Brain Research*. DOI 10.1016/bs.pbr.2023.02.002; Song, Yi & Park (2020), *PLOS ONE*. DOI 10.1371/journal.pone.0230498.** `[VERIFIED]` Tier A/B. **Use:** 12.4 child/adolescent GBA evidence; neither validates high-stakes gifted identification.
- **National Academies, "Overview of Psychological Testing"; child tablet/touchscreen studies (PMC7710155 and cited interface work); WISC-V administration materials.** `[VERIFIED official/research; WISC publisher-COI]` Tier B. **Use:** 13.7 standardization, teaching items, mode/device, and examiner-error risk.
- **Condon & Revelle (2014), ICAR, *Intelligence* 43:52–64; school-age n-back norming (PMC4597481).** `[VERIFIED]` Tier A/B. **Use:** 15.6 public-domain/open task precedents. Reuse permission and task reliability do not transfer norms or gifted-use validity.

---

# Provenance branch A — Gifted-assessment-quality original ledger (complete)

# Annotated Source Register — Gifted-Assessment-Quality BrainLift

Companion to `brainlift-gifted-assessment-quality.md`. This is the full working set of sources — strong and weak — so a reviewer can see what was read, why it was trusted or distrusted, and how it feeds the argument. Verification status is recorded per source; conflicts of interest are named.

## How to read this — the evaluation rubric

Each source is scored on four dimensions:

1. **Author credibility** — established field expertise vs. newer/peripheral contributor. (High / Medium / Low)
2. **Comprehensiveness** — meta-analysis/large sample vs. small study, single essay, or blog. (type + N/k where known)
3. **Quant ↔ Qual** — hard statistics vs. analytical/editorial prose. (Quantitative / Mixed / Qualitative)
4. **Closeness / stake** — how invested the author is in the conclusion; COIs. (Independent / Some stake / Direct stake–COI)

Each entry ends with **Verification**, a **Verdict** (tier), and **Use in brainlift**.

### Tier definitions
- **Tier A — Load-bearing.** Peer-reviewed or canonical, credible authors, large/meta or foundational, quantitative, no disqualifying COI. Safe to build on.
- **Tier B — Supporting.** Solid but caveated: some author stake, foundational-but-old, textbook, or verified only via a reputable secondary.
- **Tier C — Context / claims-to-rebut / vendor.** Marketing, proponent-only validity, non-peer-reviewed, or figures confirmed only second-hand.

### At-a-glance tiering
- **Tier A:** Baker (2001); Lord (1980); Livingston & Lewis (1995); Spearman (1904); AERA/APA/NCME Standards (2014); Lohman (2005); Lohman & Korb (2006); Lohman, Korb & Lakin (2008); Wai, Lubinski & Benbow (2009); Deary et al. (2007); Weiss (1982); Weiss & Kingsbury (1984); Meehl & Rosen (1955); Hanley & McNeil (1982); Meredith (1993); Tong & Kolen (2007); Warne (2014); Hulin, Lissak & Drasgow (1982); National Academies (2022).
- **Tier B:** Embretson & Reise (2000); Lord & Novick (1968); Green et al. (1984); Hunsley & Meyer (2003); Holland & Wainer (1993); Ozen et al. (2024); van der Linden & Glas (2010); Wainer et al. (2000); Thompson & Weiss (2011); Yan, von Davier & Lewis (2014); Reckase (2009); Rupp, Templin & Henson (2010); Assouline & Lupkowski-Shoplik (2012); de Ayala (2009); Sternberg & Grigorenko (2002).
- **Tier C:** NWEA MAP technical/gifted-placement docs; Stumpf et al. (2013, CTY-STB); Shute & Ventura (2013) + Shute & Moore; Center for Assessment blog; Rudner (2001) practitioner note.
- **Game-based & learning-science additions (Sections 5–6):** *Tier A* — Mislevy, Steinberg & Almond (2003); *J. Intelligence* GBA meta (2024); Ohlms, Hohner & Melchers (2025); Simons et al. (2016); FTC Lumosity (2016); FDA/Kollins EndeavorRx (2020); von der Embse et al. (2018); Robson et al. (2023); Hembree (1988); Deci, Koestner & Ryan (1999); Ryan & Deci (2000); Sweller (1988) + Sweller, van Merriënboer & Paas (1998/2019); Sailer & Homner (2020); Bai, Hew & Huang (2020); Shewach, Sackett & Quint (2019). *Tier B* — Shute, Ventura & Ke (2015); Gomez, Ruipérez-Valiente & García Clemente (2023); Shute & Sun (2020); Kim et al. (2023); Hamari et al. (2014); Csikszentmihalyi (1990); Steele & Aronson (1995); Flore & Wicherts (2015); Slattery et al. (2025); Kluger & DeNisi (1996) / Hattie & Timperley (2007) [canon, DOI unverified this session]. *Tier C* — Shute & Ventura (2013) + Shute & Moore (2017); Roblox hiring-assessment docs (vendor); pymetrics/Harver + Wilson et al. cooperative audit; Arctic Shores / HireVue (vendor).
- **Game-design craft, child-UX & game-dev→test migration (Section 7):** *Tier A* — Andersen et al. (2012); Kao (2020); Habgood & Ainsworth (2011); Plass, Homer & Kinzer (2015); Hourcade (2008); Hourcade et al. (2004); Druin (2002); Haladyna & Downing (2004); Leighton (2017); Bergner & von Davier (2019); Gierl, Lai & Turner (2012); Corbett & Anderson (1994/95); Piech et al. (2015); Bock, Muraki & Pfeiffenberger (1988); Kohavi, Tang & Xu (2020). *Tier B* — Malone (1981); Malone & Lepper (1987); Ryan, Rigby & Przybylski (2006); Sweetser & Wyeth (2005); Hunicke (2005); Juul (2013); Betts et al. (2006); Vatavu et al. (2015) [DOI unconfirmed]; Drachen, Mirza-Babaei & Nacke (2018); Seif El-Nasr, Drachen & Canossa (2013); Thompson, Johnstone & Thurlow (2002); Sympson & Hetter (1985). *Tier C* — Chen (2007, CACM Viewpoint); Bruckman (1999, GDC talk); Swink (2009, practitioner); NN/g children's-UX guidance (practitioner).

---

## Section 1 — Psychometric quality metrics at the tail (BrainLift 1.3, 1.5)

### Baker, F. B. (2001) — *The Basics of Item Response Theory*, 2nd ed., ERIC Clearinghouse (ED458219)
- **Content:** `SE(θ) = 1/√I(θ)`; information is additive across items and peaks at item difficulty, so it is low in sparse tails. Free full text (ch. 6, "The Information Function").
- **1** High · **2** Foundational open text · **3** Quantitative · **4** Independent.
- **Verification:** Verified (ERIC record + full text read). **Verdict: Tier A.** **Use:** 1.2/1.3/1.5 — the backbone precision law.

### Lord, F. M. (1980) — *Applications of Item Response Theory to Practical Testing Problems*, Erlbaum
- **Content:** Canonical source for the information function and its use in test assembly; `I(θ) ∝ 1/SEM²`.
- **1** Very High · **2** Foundational monograph · **3** Quantitative · **4** Independent.
- **Verification:** Citation verified; exact page numbers `[UNVERIFIED]`. **Verdict: Tier A.** **Use:** 1.3/1.5 (the inverse-square-root law → "4× info to halve SEM").

### Livingston, S. A., & Lewis, C. (1995) — "Estimating the Consistency and Accuracy of Classifications Based on Test Scores," *J. Educational Measurement*, 32(2), 179–197
- **Content:** From a single form, estimate decision **accuracy** (% correctly classified) and **consistency** (% classified the same on a parallel form) via a 4-parameter beta-binomial model.
- **1** Very High · **2** Method paper, validated within ~1 pp · **3** Quantitative · **4** Independent (ETS).
- **Verification:** Verified (DOI 10.1111/j.1745-3984.1995.tb00462.x; ETS record). **Verdict: Tier A.** **Use:** 1.3/1.5 — the decision-level quality metric for a cut score. (A search index listed a "Swarthmore" affiliation; the work is ETS — minor metadata artifact.)

### Spearman, C. (1904) — "The proof and measurement of association between two things," *American Journal of Psychology*, 15(1), 72–101
- **Content:** Correction for attenuation: `ρ_true = r_xy / √(r_xx · r_yy)`, so **observed** validity ≤ `√(r_xx · r_yy)`.
- **1** Very High (seminal) · **2** Foundational · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.2307/1412159; formula corroborated across ≥3 psychometric references). **Verdict: Tier A.** **Use:** 1.5 — the ceiling that makes "2× validity" impossible. *Caveat:* disattenuated estimates can exceed 1.0 as a sample artifact; do not conflate with observed r.

### AERA, APA, & NCME (2014) — *Standards for Educational and Psychological Testing*
- **Content:** The field's rulebook: validity (ch. 1), reliability/precision incl. conditional SEM and decision consistency near a cut (ch. 2, Standards 2.14–2.16), fairness/DIF (ch. 3), design/norming/security (ch. 4–5, 9–10).
- **1** Very High (authoritative) · **2** Consensus standard · **3** Mixed · **4** Independent (joint authorship).
- **Verification:** Verified (open PDF, primary text read; exact standard-numbering `[PARTIAL]`). **Verdict: Tier A.** **Use:** 1.3/1.5 — what "quality" means; the build requirements.

### Meehl, P. E., & Rosen, A. (1955) — "Antecedent probability and the efficiency of psychometric signs, patterns, or cutting scores," *Psychological Bulletin*, 52(3), 194–216
- **Content:** Low base rates make positive predictive value fragile; a "valid" sign can still misclassify heavily near a stringent cut.
- **1** Very High (classic) · **2** Foundational · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1037/h0048070). **Verdict: Tier A.** **Use:** 1.3 — why base rates dominate gifted-ID classification.

### Hanley, J. A., & McNeil, B. J. (1982) — "The meaning and use of the area under a ROC curve," *Radiology*, 143(1), 29–36
- **Content:** ROC/AUC as a threshold-independent summary of sensitivity–specificity.
- **1** Very High · **2** Canonical method · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1148/radiology.143.1.7063747). **Verdict: Tier A.** **Use:** 1.3 — the sensitivity/specificity metric.

### Meredith, W. (1993) — "Measurement invariance, factor analysis and factorial invariance," *Psychometrika*, 58(4), 525–543
- **Content:** Formal definition of measurement invariance underlying fairness testing.
- **1** Very High · **2** Foundational · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1007/BF02294825). **Verdict: Tier A.** **Use:** 1.3 — fairness at the tail/subgroups.

### Embretson, S. E., & Reise, S. P. (2000) — *Item Response Theory for Psychologists*, Erlbaum
- **Content:** Standard graduate text on IRT information/precision as a function of θ.
- **1** High · **2** Textbook · **3** Quantitative · **4** Independent.
- **Verification:** Citation verified; specific paraphrase `[UNVERIFIED]` (not a direct quote). **Verdict: Tier B.** **Use:** 1.3 support.

### Lord, F. M., & Novick, M. R. (1968) — *Statistical Theories of Mental Test Scores*, Addison-Wesley
- **Content:** Classical true-score theory; reliability as true/observed variance ratio (bounded 0–1), including the foundations for reliability of composites and differences.
- **1** Very High · **2** Foundational · **3** Quantitative · **4** Independent.
- **Verification:** Citation verified; page-level detail `[UNVERIFIED]`. **Verdict: Tier B (foundational).** **Use:** 9.2 difference-score foundation and 11.4 reliability ceiling.

### Green, Bock, Humphreys, Linn & Reckase (1984) — "Technical guidelines for assessing computerized adaptive tests," *J. Educational Measurement*, 21(4)
- **Content:** Marginal and empirical IRT reliability plus guidelines for assessing computerized adaptive tests. It is not the source for the classical difference/profile-score formula.
- **1** High · **2** Guidelines paper · **3** Quantitative · **4** Independent.
- **Verification:** Verified; DOI 10.1111/j.1745-3984.1984.tb01039.x. **Verdict: Tier A/B foundational-method source.** **Use:** 9.1 marginal/tail-restricted reliability; prior 9.2 attribution corrected.

### Hunsley, J., & Meyer, G. J. (2003) — "The incremental validity of psychological testing and assessment," *Psychological Assessment*, 15(4), 446–455
- **Content:** Defines the incremental-validity bar for adding a second measure.
- **1** High · **2** Conceptual review · **3** Mixed · **4** Independent.
- **Verification:** Verified (DOI 10.1037/1040-3590.15.4.446). **Verdict: Tier B.** **Use:** 1.3 — the second-measure test.

### Holland, P. W., & Wainer, H. (1993) — *Differential Item Functioning*, Erlbaum
- **Content:** The canonical DIF methods volume.
- **1** Very High · **2** Edited canon · **3** Quantitative · **4** Independent.
- **Verification:** Citation verified. **Verdict: Tier B (canon).** **Use:** 1.3 — fairness methods.

### Rudner, L. M. (2001) — "Computing the expected proportions of misclassified examinees," *Practical Assessment, Research & Evaluation*, 7(14)
- **Content:** Expected false-positive/false-negative proportions from IRT.
- **1** High · **2** Practitioner note · **3** Quantitative · **4** Independent.
- **Verification:** Verified (Thread A). *(Note: a "Rudner 2005" variant is `[UNVERIFIED]` — do not cite.)* **Verdict: Tier C (practitioner).** **Use:** 1.3 support.

---

## Section 2 — What CogAT-class tests capture and miss (BrainLift 1.1, 1.2)

### Lohman, D. F. (2005) — "An Aptitude Perspective on Talent…," *J. for the Education of the Gifted*, 28(3/4)
- **Content:** CogAT Composite catches ~32% of top-3% readers; Nonverbal ~18% — one screen misses most of another's "top" list.
- **1** High (CogAT co-author) · **2** National standardization (~14,000/grade) · **3** Quantitative · **4** Some stake (co-authors CogAT, yet critical of single-cutoff misuse).
- **Verification:** Verified (DOI 10.1177/001698620504900203; figures confirmed Thread B and existing project register). **Verdict: Tier A.** **Use:** 1.2 (false negatives).

### Lohman, D. F., & Korb, K. A. (2006) — "Gifted Today but Not Tomorrow?" *JEG*, 29(4)
- **Content:** "~half of students in the top 3% in 1 year will not fall in the top 3% the next year"; ~35–40% remain top-3% from grade 3 to grade 8. Regression to the mean, not merely measurement error.
- **1** High · **2** Iowa longitudinal (Martin's 6,321-student set) · **3** Quantitative · **4** Some stake (CogAT authorship).
- **Verification:** Verified (DOI 10.4219/jeg-2006-245; ERIC EJ746292 primary text; corroborated Warne 2012). **Verdict: Tier A.** **Use:** 1.2 (one-shot instability). **Correction issued** to the existing project register's "~70%/~40%" phrasing.

### Lohman, Korb & Lakin (2008) — "Identifying Academically Gifted ELLs Using Nonverbal Tests," *GCQ*, 52(4)
- **Content:** ELLs scored 0.5–0.67 SD lower on Raven's/NNAT/CogAT-Nonverbal — nonverbal tests are not "culture-fair."
- **1** High · **2** 1,198 children (~40% ELL) · **3** Quantitative · **4** Some stake.
- **Verification:** Verified (DOI 10.1177/0016986208321808). **Verdict: Tier A.** **Use:** 1.2 (opportunity gaps persist).

### Wai, J., Lubinski, D., & Benbow, C. P. (2009) — "Spatial Ability for STEM Domains," *J. Educational Psychology*, 101(4)
- **Content:** **70% of the top 1% in spatial ability did not make the top-1% cut on math or verbal** (p. 825); spatial incremental variance ≈ 4% on average.
- **1** High · **2** ~400,000 stratified + Project TALENT, 11-yr · **3** Quantitative · **4** COI (spatial proponents), mitigated by independent dataset.
- **Verification:** Verified (DOI 10.1037/a0016127; quotes from full text). **Verdict: Tier A.** **Use:** 1.2 (spatial under-selection). *(Corrects a "~half" mis-statement — the exact figure is 70%.)*

### Deary, Strand, Smith & Fernandes (2007) — "Intelligence and educational achievement," *Intelligence*, 35(1)
- **Content:** Cognitive test at 11 correlates r ≈ .69 observed / .81 latent with exams at 16.
- **1** High · **2** >70,000 children, 5-yr prospective · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1016/j.intell.2006.02.001; figures Thread B). **Verdict: Tier A.** **Use:** 1.1 (ability predicts).

### Ozen, Pereira, Karatas, Castillo-Hermosilla & Maeda (2024) — CogAT validity meta-analysis, *GCQ*
- **Content:** Mean CogAT↔achievement validity r = .63 [.57, .69]; flags author-of-test effects.
- **1** High · **2** Meta-analysis · **3** Quantitative · **4** Independent (but studies include test-author work).
- **Verification:** Verified (DOI 10.1177/00169862241285593). **Verdict: Tier B.** **Use:** 1.1 (predictive validity).

---

## Section 3 — Patching methods (BrainLift 1.4)

### Weiss, D. J. (1982) — "Improving Measurement Quality and Efficiency with Adaptive Testing," *Applied Psychological Measurement*, 6(4), 473–492
- **Content:** Adaptive tests achieve "measurements of equal precision at all trait levels," need half the items for equal reliability / a third for equal validity, and improve classification accuracy.
- **1** Very High (founder of CAT) · **2** Simulation + live-testing · **3** Quantitative · **4** **Direct stake–COI** (commercial CAT vendor principal).
- **Verification:** Verified (DOI 10.1177/014662168200600408; quotes confirmed). **Verdict: Tier A (note COI).** **Use:** 1.4/1.5 — the precedent that adaptivity moves the tail axes.

### Weiss, D. J., & Kingsbury, G. G. (1984) — "Application of CAT to educational problems," *J. Educational Measurement*, 21(4)
- **Content:** Adaptive mastery classification is more accurate with fewer items than conventional mastery tests.
- **1** Very High · **2** Applied study · **3** Quantitative · **4** Direct stake–COI.
- **Verification:** Verified (DOI 10.1111/j.1745-3984.1984.tb01040.x). **Verdict: Tier A (COI).** **Use:** 1.4/1.5.

### van der Linden, W. J., & Glas, C. A. W. (eds.) (2010) — *Elements of Adaptive Testing*, Springer
- **Content:** Operational CAT: item selection, ability estimation, item-pool design/maintenance, item exposure.
- **1** Very High · **2** Authoritative edited volume · **3** Quantitative · **4** Independent (academic).
- **Verification:** Verified (DOI 10.1007/978-0-387-85461-8; TOC). **Verdict: Tier B (canon).** **Use:** 1.4 — CAT requirements.

### Wainer, H., et al. (2000) — *Computerized Adaptive Testing: A Primer*, 2nd ed., Erlbaum
- **Content:** Standard primer incl. item pools and "Caveats, Pitfalls, and Unexpected Consequences."
- **1** Very High · **2** Widely cited text · **3** Mixed · **4** Independent.
- **Verification:** Verified (ISBN; Routledge reprint DOI 10.4324/9781410605931). **Verdict: Tier B.** **Use:** 1.4.

### Thompson, N. A., & Weiss, D. J. (2011) — "A Framework for the Development of CAT," *PARE*, 16(1)
- **Content:** CAT components: calibrated item bank, starting rule, item-selection algorithm, ability estimation, termination criterion; exposure/security research.
- **1** High · **2** Practitioner framework · **3** Mixed · **4** **Direct stake–COI** (vendor principals).
- **Verification:** Verified (DOI 10.7275/wqzt-9427). *(Title-correction: the prompt's "A Practitioner's Guide to CAT" belongs to Thompson (2007), DOI 10.7275/fq3r-zz60 — a different paper.)* **Verdict: Tier B (COI).** **Use:** 1.4 — build requirements.

### Yan, von Davier & Lewis (eds.) (2014) — *Computerized Multistage Testing*, CRC Press
- **Content:** Module-based adaptivity; review-able; simpler exposure control.
- **1** High · **2** Edited volume (AERA award) · **3** Mixed · **4** Independent.
- **Verification:** Verified (ISBN; review DOI 10.1177/0146621614559744). **Verdict: Tier B.** **Use:** 1.4.

### Assouline, S. G., & Lupkowski-Shoplik, A. (2012) — "The Talent Search Model of Gifted Identification," *J. Psychoeducational Assessment*, 30(1), 45–59
- **Content:** The Talent Search model is fundamentally above-level testing (Stanley lineage).
- **1** High · **2** Descriptive review · **3** Mixed · **4** Some stake (Talent Search practitioners).
- **Verification:** Verified — **DOI corrected to 10.1177/0734282911433946** (prompt's 10.1177/0734282911428271 404s). **Verdict: Tier B.** **Use:** 1.4 (above-level).

### Warne, R. T. (2014) — "Using Above-Level Testing to Track Growth…," *Gifted Child Quarterly*, 58(1), 3–23
- **Content:** Above-level testing is "widely accepted … [but] has not been subject to careful psychometric scrutiny."
- **1** High · **2** Empirical (N=224; 435 administrations) · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1177/0016986213513793; GCQ Paper of the Year). **Verdict: Tier A.** **Use:** 1.4 — the honesty caveat on above-level testing.

### Tong, Y., & Kolen, M. J. (2007) — "Comparisons of Methodologies … in Vertical Scaling," *Applied Measurement in Education*, 20(2)
- **Content:** Scaling-method choices change the apparent growth pattern of high vs. low achievers.
- **1** High · **2** Empirical + simulation · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1080/08957340701301207; corroborated by NCME ITEMS module). **Verdict: Tier A.** **Use:** 1.4 — vertical-scale assumptions.

### Reckase, M. D. (2009) — *Multidimensional Item Response Theory*, Springer
- **Content:** Modeling multiple latent abilities simultaneously (profiles).
- **1** High · **2** Graduate text · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1007/978-0-387-89976-3). **Verdict: Tier B.** **Use:** 1.4 (profiles).

### Rupp, Templin & Henson (2010) — *Diagnostic Measurement: Theory, Methods, and Applications*, Guilford
- **Content:** Diagnostic classification models yield discrete multi-skill profiles; authors flag pitfalls.
- **1** High · **2** Textbook · **3** Quantitative · **4** Independent.
- **Verification:** Verified (ISBN). **Verdict: Tier B.** **Use:** 1.4 (profiles, with pitfalls).

### Stumpf, Mills, Brody & Baxley (2013) — CTY Spatial Test Battery, *Roeper Review*, 35(4)
- **Content:** CTY built a Spatial Test Battery to supplement math/verbal talent searches.
- **1** Medium-High · **2** Psychometric/descriptive report · **3** Quantitative · **4** **Direct stake–COI** (developers).
- **Verification:** Verified (DOI 10.1080/02783193.2013.829548). **Verdict: Tier C (developer-affiliated).** **Use:** 1.4 — an existing spatial patch. (Independent corroboration that it fills a real gap: US DoE report ERIC ED660319.)

### Sternberg, R. J., & Grigorenko, E. L. (2002) — *Dynamic Testing*, Cambridge Univ. Press
- **Content:** Dynamic testing emphasizes learning potential over prior accomplishment.
- **1** High · **2** Scholarly monograph/review · **3** Mixed · **4** Some stake (proponents).
- **Verification:** Verified (ISBN). **Verdict: Tier B (concept).** **Use:** 1.4 — with the honest `[gap]`: no located K-8 gifted predictive-validity meta-analysis. *(Lidz & Elliott 2000 exists but was not independently opened — `[UNVERIFIED]`.)*

### Shute, V. J., & Ventura, M. (2013) — *Stealth Assessment*, MIT Press (+ Shute & Moore validation)
- **Content:** Embed measurement in tasks; validation convergent correlations modest (r ≈ 0.22–0.41), small samples.
- **1** High (proponents) · **2** Monograph + small-sample validation · **3** Mixed · **4** **Direct stake–COI** (originators).
- **Verification:** Verified (ISBN; validation PDF). **Verdict: Tier C (proponent-only evidence).** **Use:** 1.4 — promise + measured limits.

---

## Section 4 — Feasibility & the "2×" bounds (BrainLift 1.5)

### Hulin, Lissak & Drasgow (1982) — "Recovery of two- and three-parameter logistic ICCs: A Monte Carlo study," *Applied Psychological Measurement*, 6(3)
- **Content:** ~500 examinees adequate for 2PL; ~1,000 (with 60 items) for accurate 3PL estimation.
- **1** High · **2** Monte Carlo study · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1177/014662168200600301; verbatim abstract). **Verdict: Tier A.** **Use:** 1.5 — calibration-sample reality.

### de Ayala, R. J. (2009) — *The Theory and Practice of Item Response Theory*, Guilford
- **Content:** Calibration N "depends" on estimation procedure, item/response characteristics, and person distribution; ≥500 for 2PL commonly attributed to him.
- **1** High · **2** Textbook · **3** Quantitative · **4** Independent.
- **Verification:** Verified ("it depends" text read); *edition mismatch* — online excerpt is 2nd ed. (2022) vs. the cited 2009 1st ed. **Verdict: Tier B.** **Use:** 1.5 — nuance on sample size.

### National Academies (2022) — *A Pragmatic Future for NAEP: Containing Costs and Updating Technologies*
- **Content:** Item creation ~$1,000–$20,000 per item; NAEP item development ≈ $16.3M/yr.
- **1** Very High · **2** Consensus report · **3** Quantitative · **4** Independent.
- **Verification:** Verified (verbatim). **Verdict: Tier A — but achievement-test context** (indicative, not a cognitive-battery budget). **Use:** 1.5 — cost realism.

### Center for Assessment (NCIEA) — "Measure Twice, Cut Once" blog
- **Content:** "Three years at a minimum" to develop a large-scale test.
- **1** Medium (professional org) · **2** Blog · **3** Qualitative · **4** Some stake.
- **Verification:** Verified verbatim, but **not peer-reviewed**. **Verdict: Tier C (expert opinion).** **Use:** 1.5 — timeline order-of-magnitude only.

### NWEA MAP — technical report; gifted-placement guide; grade-level guidance
- **Content:** Adaptive test with "significantly lower SEM than fixed-form tests" and a "very high ceiling," yet SEM rises near the top of a level's range.
- **1** High (publisher) · **2** Technical docs · **3** Quantitative · **4** **Direct stake–COI** (vendor self-report).
- **Verification:** Verified verbatim; a numeric "effective RIT ceiling" is `[UNVERIFIED]`. **Verdict: Tier C (vendor).** **Use:** 1.5 — the cautionary real-world case; cite as `[COMPANY CLAIM]`.

---

## Section 5 — Game-based / gamified assessment (BrainLift 1.6)

### Mislevy, R. J., Steinberg, L. S., & Almond, R. G. (2003) — "On the structure of educational assessments," *Measurement*, 1(1), 3–62
- **Content:** Evidence-Centered Design (ECD) — the framework used to score game/telemetry data.
- **1** Very High · **2** Foundational methodology (~780+ cites) · **3** Mixed · **4** Independent.
- **Verification:** Verified (DOI 10.1207/s15366359mea0101_02). **Verdict: Tier A.** **Use:** 1.6 (scoring framework). *(Page range listed as 3–62 or 3–67 across sources.)*

### Shute, V. J., & Ventura, M. (2013) — *Stealth Assessment*, MIT Press
- **Content:** Embed performance assessment in games; score process data via ECD + Bayesian networks.
- **1** High (originators) · **2** Monograph · **3** Mixed · **4** **Direct stake–COI.**
- **Verification:** Verified (DOI 10.7551/mitpress/9589.001.0001). **Verdict: Tier C (proponent).** **Use:** 1.6 definition (also 1.4).

### Shute, Ventura & Ke (2015) — "The power of play: Portal 2 and Lumosity," *Computers & Education*, 80, 58–67
- **Content:** Portal 2 > Lumosity on problem solving d≈.59, spatial d≈.64, persistence d≈.42 — **adults, n=77.**
- **1** High · **2** Small RCT (adults) · **3** Quantitative · **4** Direct stake–COI (proponents).
- **Verification:** Verified (DOI 10.1016/j.compedu.2014.08.013). **Verdict: Tier B.** **Use:** 1.6 (single-game effect sizes; note adult sample, training-effects design).

### Shute & Moore (2017) — "Consistency and validity in game-based stealth assessment"
- **Content:** Physics Playground α≈.87; convergent r≈.22–.41; authors state "more work to validate."
- **1** High · **2** Small-sample validation · **3** Quantitative · **4** Direct stake–COI.
- **Verification:** Verified (author full text). **Verdict: Tier C (proponent).** **Use:** 1.6 (reliability + modest convergent validity).

### *Journal of Intelligence* (2024) — GBA vs. cognitive-ability meta-analysis, 12(12):129
- **Content:** Observed r≈0.30 (corrected 0.45); 52 samples, >6,100 adults; range −0.35 to +0.75; high heterogeneity.
- **1** High · **2** Meta-analysis · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.3390/jintelligence12120129). **Verdict: Tier A.** **Use:** 1.6 — most independent, directly relevant; only moderate convergence; adults.

### Gomez, Ruipérez-Valiente & García Clemente (2023) — GBA systematic review, *IEEE Trans. Learning Technologies*, 16(4)
- **Content:** First systematic review of empirical GBA (65 papers); small samples, replication/validation problems.
- **1** High · **2** Systematic review · **3** Mixed · **4** Independent.
- **Verification:** Verified (DOI 10.1109/TLT.2022.3226661). **Verdict: Tier B.** **Use:** 1.6 (field-wide limits).

### Shute, V. J., & Sun, C. (2020) — "Games for assessment," in *Handbook of Game-Based Learning*, MIT Press
- **Content:** GBA "typically serves a formative function"; high-stakes replacement is an open question.
- **1** High (proponents) · **2** Handbook chapter · **3** Qualitative · **4** Direct stake–COI.
- **Verification:** Verified. **Verdict: Tier B (proponent concession).** **Use:** 1.6 (formative, not high-stakes).

### Ohlms, Hohner & Melchers (2025) — "Is test takers' video game usage a game changer?" *Applied Psychology*
- **Content:** Video-game usage predicts GBA scores but **not** academic performance → test bias / criterion-irrelevant variance; cites Bipp et al. 2024 meta r≈.30.
- **1** High · **2** Two adult samples (N=156; 92) · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1111/apps.70038). **Verdict: Tier A.** **Use:** 1.6 — the decisive fairness/bias fact (adult context; transfer to K-8 is inference).

### Kim et al. (2023) — Shadowspect spatial-GBA validity/generalizability, *BJET*, 54
- **Content:** "Enjoyment significantly affects one key feature"; low-proficiency inference must be caveated; gender-subgroup concern.
- **1** High · **2** Learning-analytics study · **3** Quantitative · **4** Some stake (Shute-adjacent).
- **Verification:** Verified (DOI 10.1111/bjet.13286). **Verdict: Tier B.** **Use:** 1.6 (enjoyment → construct-irrelevant variance).

### Roblox — EDM 2024 proceedings poster; Newsroom (2025) "Fair Play"
- **Content:** Game-based **hiring** assessment (2021) measuring "creative problem-solving and systems thinking"; practice game "Kaiju Cats"; "standardized, scientifically validated" (`[COMPANY CLAIM]`); internal reliability .93 (`[VENDOR-CLAIM]`). **Adults, not children.**
- **1** Medium (vendor/self) · **2** Poster + newsroom · **3** Mixed · **4** **Direct stake–COI.**
- **Verification:** Program existence VERIFIED-PRIMARY; validity/reliability are vendor claims. **Verdict: Tier C (vendor).** **Use:** 1.6 — adult proof-of-concept + novelty-effect mitigation; cite as `[COMPANY CLAIM]`.

### pymetrics / Harver — Wilson et al. (2021), ACM FAccT '21, 666–677
- **Content:** Cooperative audit verified only that de-biasing **code** met the four-fifths rule; **explicitly did not test** whether games measure ability or predict performance; co-authored with pymetrics' CEO.
- **1** Medium · **2** Audit (scope-limited) · **3** Mixed · **4** Cooperative COI.
- **Verification:** Verified (FAccT proceedings). **Verdict: Tier C (scope-limited / cooperative).** **Use:** 1.6 (commercial "measures cognition" claims are unvalidated for validity).

### Simons et al. (2016) — brain-training review, *PSPI*, 17(3); FTC Lumosity settlement (2016)
- **Content:** Brain-training far-transfer is weak; FTC imposed a $2M settlement for deceptive advertising.
- **1** Very High / regulatory · **2** Review (132+ articles) / federal action · **3** Mixed · **4** Independent.
- **Verification:** Verified (DOI 10.1177/1529100616661983; FTC press release). **Verdict: Tier A.** **Use:** 1.6 (cautionary tale for "cognitive" game claims).

### Akili EndeavorRx — FDA De Novo DEN200026 (2020); Kollins et al. (2020), *Lancet Digital Health*
- **Content:** First FDA-authorized game **therapeutic** (ADHD attention), N=348 RCT; explicitly **not** an IQ/ability test.
- **1** Very High (regulatory + peer-reviewed) · **2** RCT · **3** Quantitative · **4** Industry-sponsored but FDA-reviewed/registered.
- **Verification:** Verified (FDA record; DOI 10.1016/S2589-7500(20)30017-0). **Verdict: Tier A (bounded example).** **Use:** 1.6 — a rigorously validated game is possible but narrow.

### Slattery et al. (2025) — Minecraft learning systematic review, *Review of Education*; + Minecraft cluster RCT (2024, *Computers & Education*)
- **Content:** Learning-outcome effects with medium/high bias risk; a cluster RCT (N=885) found no overall spatial-thinking effect.
- **1** High · **2** Systematic review + RCT · **3** Mixed · **4** Independent.
- **Verification:** Verified (DOI 10.1002/rev3.70035; RCT via ScienceDirect S0959475224001300). **Verdict: Tier B.** **Use:** 1.6 (rigor → null; learning not assessment).

---

## Section 6 — Learning science of eliciting performance (BrainLift 1.7 + Learning Science Rationale)

### von der Embse et al. (2018) — test-anxiety 30-year meta-analysis, *J. Affective Disorders*, 227, 483–493
- **Content:** TA negatively related to achievement; grades 1–5 r≈−.22, grades 6–8 r≈−.25.
- **1** High · **2** ~238 studies · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1016/j.jad.2017.11.048; grade-band r's via Robson et al. 2023). **Verdict: Tier A.** **Use:** 1.7 (anxiety → construct-irrelevant variance).

### Robson et al. (2023) — primary-school test anxiety, *J. School Psychology*
- **Content:** 76 studies, **53,617 children aged 5–12**; TA negatively related to achievement; publication-bias-corrected gender effect.
- **1** High · **2** Large meta (K-8-relevant) · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1016/j.jsp.2023.02.003). **Verdict: Tier A.** **Use:** 1.7 (directly K-8).

### Hembree (1988) — test anxiety meta-analysis, *Review of Educational Research*, 58(1), 47–77
- **Content:** 562 studies; worry component > emotionality for performance.
- **1** Very High · **2** Foundational meta · **3** Quantitative · **4** Independent.
- **Verification:** Metadata verified (DOI 10.3102/00346543058001047); full text paywalled — sub-figures read via Robson et al. 2023. **Verdict: Tier A (foundational).** **Use:** 1.7 support.

### Csikszentmihalyi (1990) — *Flow: The Psychology of Optimal Experience*
- **Content:** Flow requires challenge≈skill; excess challenge → anxiety, deficit → boredom.
- **1** High · **2** Framework / trade book · **3** Qualitative · **4** Independent.
- **Verification:** Verified (full-text passage). **Verdict: Tier B (framework).** **Use:** 1.7 + Learning Science Rationale (adaptive difficulty).

### Deci, Koestner & Ryan (1999) — reward meta-analysis, *Psychological Bulletin*, 125(6), 627–668
- **Content:** Tangible/performance rewards undermined intrinsic motivation (d≈−.28 to −.40), **worse for children**; positive feedback enhanced it (d≈+.33).
- **1** High · **2** 128 studies · **3** Quantitative · **4** Some stake (SDT proponents) — but re-analyze prior metas.
- **Verification:** Verified (DOI 10.1037/0033-2909.125.6.627). **Verdict: Tier A.** **Use:** 1.7 + Rationale (avoid tangible rewards; the child moderation).

### Ryan & Deci (2000) — Self-Determination Theory, *American Psychologist*, 55(1), 68–78
- **Content:** Autonomy, competence, relatedness support high-quality motivation/engagement.
- **1** High · **2** Framework/review · **3** Qualitative · **4** Some stake (originators).
- **Verification:** Verified (DOI 10.1037/0003-066X.55.1.68). **Verdict: Tier A (framework).** **Use:** 1.7 (motivation design).

### Sweller (1988); Sweller, van Merriënboer & Paas (1998/2019) — Cognitive Load Theory
- **Content:** Intrinsic/extraneous/germane load; extraneous (presentation-driven) load is reducible by design.
- **1** Very High · **2** Foundational theory + review · **3** Mixed · **4** Independent.
- **Verification:** Verified (DOIs 10.1207/s15516709cog1202_4; 10.1023/A:1022193728205; 10.1007/s10648-019-09465-5). **Verdict: Tier A.** **Use:** 1.7 + Rationale (game UI adds construct-irrelevant load).

### Sailer & Homner (2020) — gamification meta-analysis, *Educational Psychology Review*, 32(1), 77–112
- **Content:** Cognitive g=.49, motivational g=.36, behavioral g=.25 (latter two less stable); high heterogeneity.
- **1** High · **2** Meta-analysis · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1007/s10648-019-09498-w). **Verdict: Tier A.** **Use:** 1.7 (gamification helps *learning*, not measurement validity).

### Hamari, Koivisto & Sarsa (2014) — "Does gamification work?" HICSS
- **Content:** Positive but context/user-dependent effects; explicit **novelty-effect** caveat.
- **1** High · **2** Vote-count review (k=24) · **3** Mixed · **4** Independent.
- **Verification:** Verified (DOI 10.1109/HICSS.2014.377). **Verdict: Tier B.** **Use:** 1.7 (novelty caveat).

### Bai, Hew & Huang (2020) — gamification meta-analysis, *Educational Research Review*, 30, 100322
- **Content:** g=.504 on performance; shorter interventions larger (novelty); some learners report anxiety/jealousy.
- **1** High · **2** Meta (30 interventions) · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1016/j.edurev.2020.100322). **Verdict: Tier A.** **Use:** 1.7 (novelty + not universally liked).

### Steele & Aronson (1995) — stereotype threat, *JPSP*, 69(5), 797–811
- **Content:** Original demonstration; U.S. college students, small samples.
- **1** High · **2** 4 lab experiments · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1037/0022-3514.69.5.797). **Verdict: Tier B (foundational, contested).** **Use:** 1.7 (one side of the debate).

### Shewach, Sackett & Quint (2019) — stereotype threat in operational settings, *JAP*, 104(12), 1514–1534
- **Content:** Under operational-like conditions d≈−.14 (negligible-to-small); nontrivial publication bias; corrects a prior analytic error.
- **1** High · **2** Largest meta (212 samples) · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1037/apl0000420). **Verdict: Tier A.** **Use:** 1.7 (the "attenuated in real settings" side).

### Flore & Wicherts (2015) — schoolgirl stereotype-threat meta, *J. School Psychology*, 53(1), 25–44
- **Content:** d=−.22 uncorrected → ~.07 after trim-and-fill; publication-bias signs.
- **1** High · **2** 47 effects (children/adolescents) · **3** Quantitative · **4** Independent.
- **Verification:** Verified (PubMed 25636259; trim-fill via secondary discussions). **Verdict: Tier B.** **Use:** 1.7 (child-specific, publication-bias caveat).

### Kluger & DeNisi (1996); Hattie & Timperley (2007) — feedback (learning-science canon)
- **Content:** ~1/3 of feedback interventions *lower* performance; feedback must be timely, task-focused, actionable.
- **1** High · **2** Meta / review · **3** Mixed · **4** Independent.
- **Verification:** **From the learning-science skill canon; DOIs not independently verified this session.** **Verdict: Tier B (canon).** **Use:** Learning Science Rationale (feedback double-edge).

---

## Section 7 — Game design, game-dev migration & child-UX (BrainLift 1.8 + Game Design Rationale)

*Compact entries (citation — tier; verification; COI/use). Grouped 7a (game-design craft & child-UX) and 7b (game-dev → test-design migration).*

### 7a — Game-design craft & child-UX

- **Malone (1981)** — "Toward a theory of intrinsically motivating instruction," *Cognitive Science* 5(4):333–369, DOI 10.1207/s15516709cog0504_2. *Tier B* (theoretical-heuristic). Verified. Use: intrinsic-motivation levers (challenge/fantasy/curiosity; intrinsic vs. extrinsic fantasy).
- **Malone & Lepper (1987)** — "Making learning fun: A taxonomy of intrinsic motivations for learning," in Snow & Farr (eds.), *Aptitude, Learning, and Instruction* Vol. 3, Erlbaum. *Tier B* (book chapter; no DOI). Verified. Use: challenge/curiosity/control/fantasy.
- **Ryan, Rigby & Przybylski (2006)** — "The motivational pull of video games: A self-determination theory approach," *Motivation and Emotion* 30(4):344–360, DOI 10.1007/s11031-006-9051-8. *Tier B*. Verified. **COI:** Rigby founded Immersyve (PENS vendor). Use: competence/autonomy from intuitive controls.
- **Sweetser & Wyeth (2005)** — "GameFlow: a model for evaluating player enjoyment in games," *Computers in Entertainment* 3(3):3A, DOI 10.1145/1077246.1077253. *Tier B* (model + small expert-review). Verified. Use: eight enjoyment elements.
- **Chen (2007)** — "Flow in games (and everything else)," *Communications of the ACM* 50(4):31–34, DOI 10.1145/1232743.1232769. *Tier C* (editorial **Viewpoint**, not peer-reviewed). Verified. **COI:** co-founder, thatgamecompany. Use: flow-zone / invisible DDA framing.
- **Hunicke (2005)** — "The case for dynamic difficulty adjustment in games," *Proc. ACM ACE 2005*:429–433, DOI 10.1145/1178477.1178573. *Tier B* (prototype + preliminary eval). Verified. Use: DDA must not feel like cheating.
- **Andersen et al. (2012)** — "The impact of tutorials on games of varying complexity," *Proc. CHI '12*, DOI 10.1145/2207676.2207687. *Tier A* (large-N A/B; **general players, not children**). Verified. Use: tutorials help most for complex/novel mechanics.
- **Kao (2020)** — "The effects of juiciness in an action RPG," *Entertainment Computing* 34:100359, DOI 10.1016/j.entcom.2020.100359. *Tier A* (N=3,018). Verified. Use: over-juicing *lowers* performance (medium is best).
- **Habgood & Ainsworth (2011)** — "Motivating children to learn effectively: Exploring the value of intrinsic integration in educational games," *Journal of the Learning Sciences* 20(2):169–206, DOI 10.1080/10508406.2010.508029. *Tier A* (children 7–11; small samples). Verified. Use: intrinsic integration (mechanic = construct).
- **Bruckman (1999)** — "Can educational be fun?" *Game Developers Conference '99*; "chocolate-covered broccoli" popularized by Laurel (2001). *Tier C* (non-peer-reviewed talk). Origin verified. Use: the bolted-on-reward failure mode.
- **Juul (2013)** — *The Art of Failure: An Essay on the Pain of Playing Video Games*, MIT Press, ISBN 9780262019057. *Tier B* (game-studies essay). Verified. Use: failure-friendly design.
- **Plass, Homer & Kinzer (2015)** — "Foundations of game-based learning," *Educational Psychologist* 50(4):258–283, DOI 10.1080/00461520.2015.1122533. *Tier A* (framework/review). Verified. Use: engagement across cognitive/affective/behavioral/sociocultural modes.
- **Hourcade (2008)** — "Interaction Design and Children," *Foundations and Trends in HCI* 1(4):277–392, DOI 10.1561/1100000006. *Tier A* (peer-reviewed review). Verified. Use: child developmental UX (design to cognition/fine-motor).
- **Hourcade, Bederson, Druin & Guimbretière (2004)** — "Differences in pointing task performance between preschool children and adults using mice," *ACM TOCHI* 11(4):357–386, DOI 10.1145/1035575.1035577. *Tier A* (controlled, preschoolers). Verified. Use: K-4 motor/pointing limits; larger targets help.
- **Druin (2002)** — "The role of children in the design of new technology," *Behaviour & Information Technology* 21(1):1–25, DOI 10.1080/01449290110108659. *Tier A* (framework). Verified. Use: involve target children (user/tester/informant/partner).
- **Betts, McKay, Maruff & Anderson (2006)** — "The development of sustained attention in children: the effect of age and task load," *Child Neuropsychology* 12(3):205–221, DOI 10.1080/09297040500488522. *Tier B* (cross-sectional, modest N). Verified. Use: attention develops 5–9, worse under load — supports "shorter/varied blocks," **not** any minute figure.
- **Vatavu, Cramariuc & Schipor (2015)** — "Touch interaction for children aged 3 to 6 years," *Int. J. Human-Computer Studies*. *Tier B*; **DOI `[UNVERIFIED]` this session** (title/venue confirmed). Use: touch target-size for young children (corroborating).
- **Nielsen Norman Group** — "UX Design for Children (Ages 3–12)" + stage-of-physical-development guidance. *Tier C* (**practitioner**, not peer-reviewed). Verified as practitioner source. Use: K-4 UX heuristics (touch>mouse, ~2 cm targets, audio/visual, age-banding) — to validate, not cite as evidence.
- **Haladyna & Downing (2004)** — "Construct-irrelevant variance in high-stakes testing," *Educational Measurement: Issues and Practice* 23(1):17–27, DOI 10.1111/j.1745-3992.2004.tb00149.x. *Tier A*. Verified. Use: the formal anchor for "engagement ≠ validity."

### 7b — Game-dev → test-design migration

- **Leighton (2017)** — *Using Think-Aloud Interviews and Cognitive Labs in Educational Research*, Oxford, DOI 10.1093/acprof:oso/9780199372904.001.0001. *Tier A*. Verified. Use: playtesting → cognitive labs / response-process validity.
- **Drachen, Mirza-Babaei & Nacke (2018)** — *Games User Research*, Oxford, ISBN 9780198794844. *Tier B* (edited handbook). Verified. Use: playtesting → GUR / pilot practice (game-side analog).
- **Seif El-Nasr, Drachen & Canossa (2013)** — *Game Analytics: Maximizing the Value of Player Data*, Springer, DOI 10.1007/978-1-4471-4769-5. *Tier B* (edited volume). Verified. Use: telemetry → process/log-data analytics.
- **Bergner & von Davier (2019)** — "Process data in NAEP: Past, present, and future," *J. Educational and Behavioral Statistics* 44(6), DOI 10.3102/1076998618784700. *Tier A*. Verified. Use: process-data psychometrics; response time alone ≠ engagement.
- **Gierl, Lai & Turner (2012)** — "Using automatic item generation to create multiple-choice test items," *Medical Education* 46(8):757–765, DOI 10.1111/j.1365-2923.2012.04289.x; **Gierl & Haladyna (2012)** — *Automatic Item Generation*, Routledge, DOI 10.4324/9780203803912. *Tier A*. Verified (1,248 items from one model). Use: PCG → AIG.
- **Corbett & Anderson (1994/95)** — "Knowledge tracing: Modeling the acquisition of procedural knowledge," *User Modeling and User-Adapted Interaction* 4(4):253–278, DOI 10.1007/BF01099821. *Tier A*. Verified. Use: player modeling → Bayesian knowledge tracing.
- **Piech et al. (2015)** — "Deep Knowledge Tracing," *NeurIPS 2015*:505–513, arXiv 1506.05908. *Tier A*. Verified. Use: neural knowledge tracing (RNN/LSTM).
- **Bock, Muraki & Pfeiffenberger (1988)** — "Item Pool Maintenance in the Presence of Item Parameter Drift," *J. Educational Measurement* 25(4):275–285, DOI 10.1111/j.1745-3984.1988.tb00308.x. *Tier A*. Verified. Use: live-ops/balancing → item-parameter-drift monitoring.
- **Kohavi, Tang & Xu (2020)** — *Trustworthy Online Controlled Experiments: A Practical Guide to A/B Testing*, Cambridge, ISBN 9781108724265. *Tier A* (industry-authored, Cambridge). Verified. Use: live-ops → continuous, trustworthy experimentation; guardrail metrics; novelty/carryover caveats.
- **Swink (2009)** — *Game Feel: A Game Designer's Guide to Virtual Sensation*, Morgan Kaufmann, ISBN 978-0-12-374328-2. *Tier C* (practitioner design book). Verified. Use: game feel → feedback design (pair with Kao 2020 for the evidence).
- **Thompson, Johnstone & Thurlow (2002)** — *Universal Design Applied to Large Scale Assessments*, NCEO Synthesis Report 44 (ERIC ED467721). *Tier B* (agency report). Verified. Use: accessibility → Universal Design for Assessment (seven elements).
- **Sympson & Hetter (1985)** — "Controlling item-exposure rates in computerized adaptive testing," *Proc. 27th Military Testing Association*:973–977. *Tier B* (foundational conference paper). Verified. Use: anti-cheat → item-exposure control.

---

## Section 8 — Consolidated COI / use-with-caution watch-list

| Source | Why caution | Legitimate use |
|---|---|---|
| Weiss (1982/2004); Thompson & Weiss (2011) | Commercial CAT-vendor principals | CAT efficiency/precision facts (authority + stake coincide) |
| NWEA MAP docs | Publisher self-report | Cautionary ceiling case; label `[COMPANY CLAIM]` |
| Stumpf et al. (CTY-STB) | Test developers | Existence of a spatial patch, not its incremental validity |
| Shute & Ventura / Shute & Moore | Approach originators | Promise + explicitly measured limits |
| Ozen et al. (2024) | Includes test-author studies | CogAT validity, with the flagged author-of-test effect |
| Lohman family of studies | CogAT co-authorship | Trusted *because* findings cut against interest |
| Center for Assessment blog | Not peer-reviewed | Timeline order-of-magnitude only |
| de Ayala (2009) | Edition mismatch online | "It depends" nuance; cite the edition you actually use |
| Roblox hiring-assessment docs | Vendor self-report ("scientifically validated"; .93 reliability) | Adult proof-of-concept only; label `[COMPANY CLAIM]` |
| pymetrics/Harver; Arctic Shores; HireVue | Vendor claims; the one audit was scope-limited/cooperative | "Games measure cognition" is unvalidated for validity/prediction |
| Shute lab GBA studies (Physics Playground, Portal 2, Shadowspect) | Proponent-generated, small/adult samples | Promise + effect sizes, with the independent r≈.30 meta as counterweight |
| Kluger & DeNisi (1996); Hattie & Timperley (2007) | Canon citations, DOI unverified this session | Feedback double-edge; verify DOIs before formal citation |
| Game-design craft (Malone; Sweetser & Wyeth; Hunicke; Kao; Habgood & Ainsworth; Juul; Plass et al.) | Design/HCI theory, mostly non-measurement | Engagement craft heuristics; not measurement-validity evidence |
| Ryan, Rigby & Przybylski (2006) | Rigby = Immersyve/PENS vendor | SDT-in-games; note vendor stake |
| Chen (2007, CACM); Bruckman (1999, GDC) | Editorial Viewpoint / conference talk (not peer-reviewed) | Framing only; corroborate load-bearing claims elsewhere |
| NN/g children's-UX guidance | Practitioner, not peer-reviewed | K-4 UX heuristics to validate, not cite as evidence |
| Kohavi, Tang & Xu (2020); Swink (2009); Seif El-Nasr et al. (2013) | Industry-authored / practitioner design books | Migrate the engineering practice, not psychometric validity |

---

## Section 9 — Corrections this register issues

1. **Lohman & Korb (2006) fall-out figure.** Existing project register says "~70% not top-3% by grade 8 / ~40% one year later." Primary source: **~half fall out in one year**; **~35–40% remain top-3% grade 3 → grade 8** (~60–65% fall out over five years). Recommend correcting the other register on its own branch.
2. **Assouline & Lupkowski-Shoplik (2012) DOI** is `10.1177/0734282911433946` (the commonly-passed `…428271` does not resolve).
3. **Thompson & Weiss (2011)** title is *"A Framework for the Development of CAT"* (DOI 10.7275/wqzt-9427); *"A Practitioner's Guide…"* is Thompson (2007), a different paper.
4. **Wai et al. (2009)** headline figure is **70%** of the spatial top-1% missed by math/verbal cuts (not "~half"; "over half" is a separate, more conservative top-3% statistic).

---

## Section 10 — Verification gaps (do not cite as settled)

- CogAT-specific current-form upper-tail reliability / conditional error / ceiling — `[UNVERIFIED]` (publisher-controlled).
- A numeric NWEA MAP "effective RIT ceiling" — `[UNVERIFIED]` (forum-quoted only).
- Dynamic-assessment and stealth/process-data **predictive validity for K-8 gifted ID** — no located meta-analysis (`[gap]`).
- Lord (1980), Lord & Novick (1968), Embretson & Reise (2000), Green et al. (1984): citations verified; exact pages/quote-level detail `[PARTIAL/UNVERIFIED]`.
- Rudner (2005) variant — `[UNVERIFIED]`; use Rudner (2001) instead.
- **Game-based / gamified assessment for high-stakes K-8 gifted ID** — no validating study located; GBA evidence is adult and/or formative/low-stakes, independent ability correlation only moderate (r≈.30) (`[gap]`).
- **Roblox hiring-assessment reliability/validity** — vendor self-report only; no independent audit located (`[VENDOR-CLAIM]`).
- **Minecraft spatial-thinking effect** — the cluster-RCT null is verified via ScienceDirect (S0959475224001300); a clean DOI string was not captured (`[PARTIAL]`).
- **Kluger & DeNisi (1996); Hattie & Timperley (2007)** — learning-science canon; DOIs not independently verified this session.
- **"Attention span ≈ age in minutes" (or "2–5 min/year of age")** — `[UNVERIFIED]` / likely a myth; Betts et al. (2006) supports only *relative* growth of sustained attention 5–9, no defensible absolute minute figure.
- **Vatavu et al. (2015)** touchscreen (ages 3–6) — DOI `[UNVERIFIED]` this session (title/venue confirmed); corroborating, not primary.
- **NN/g children's-UX numeric guidance** (target sizes, age bands, 156 guidelines) — practitioner recommendations from a paywalled report, not peer-reviewed findings.
- **Game-dev → test-design migration (1.8)** transfers *engineering*, not *validity* — no source shows a gamified score is valid for high-stakes K-8 gifted ID.
- **Andersen et al. (2012)** tutorial finding is from **general online players, not children** — application to K-4 onboarding is an inference.
- Book/chapter citations (Malone & Lepper 1987; Juul 2013; Swink 2009; Drachen et al. 2018; Seif El-Nasr et al. 2013) verified via publisher records; exact page-level detail not pinned.

---

## Section 11 — Incorporated from the dev evidence dossier (measurement-quality subset)

Source: an unvetted, overnight-scraped secondary evidence compilation — an explicitly **unvetted, overnight-scraped** evidence pile for the admissions/lottery thesis (claims C1–C8). Only the **measurement-quality** items (C2/C3/C8) are curated into this BrainLift; the **selection / lottery / counterfactual** items (C1, C4–C7) defend the access/causal thesis and belong in the gt-school-counterfactual BrainLift, not here.

**Citation correction issued:** the dossier attributes the N=320 / 44%-doctorate SMPY figures to "Kell, Lubinski & Benbow, 2014, *Psychological Science* 25(12):2217–2232." That is a mis-citation — those figures are **Kell, Lubinski & Benbow (2013), *Psychological Science* 24(5):648–659, DOI 10.1177/0956797612457784** (verified via SAGE + PubMed 23531483). The within-top-1% quartile gradient traces to **Lubinski (2016), "From Terman to Today."**

### Kell, Lubinski & Benbow (2013) — "Who Rises to the Top? Early Indicators," *Psychological Science*, 24(5), 648–659
- **Content:** N=320 identified before age 13 as top-1-in-10,000 (above-level SAT); 44% held doctorates by age 38 (vs. ~2% of population).
- **1** High · **2** Longitudinal (SMPY) · **3** Quantitative · **4** Some stake (SMPY team).
- **Verification:** Verified this session (DOI 10.1177/0956797612457784; PubMed 23531483; publisher + gwern full text). **Verdict: Tier A.** **Use:** §1.4 (a high ceiling captures real tail variation).

### Lubinski (2016) — "From Terman to Today: A Century of Findings on Intellectual Precocity"
- **Content:** Within the top 1%, accomplishment keeps rising across ability quartiles (N≈2,329) — "more ability matters" even inside the elite tail.
- **1** High · **2** Century review · **3** Quantitative · **4** Some stake (SMPY).
- **Verification:** Title + figure verified via full-text PDF; exact journal/volume/DOI `[UNVERIFIED]` this session. **Verdict: Tier B.** **Use:** §1.4 support.

### Grissom & Redding (2016) — "Discretion and Disproportionality," *AERA Open*, 2(1)
- **Content:** At equal achievement, Black students less likely identified as gifted; high-achieving Black students ~one-third as likely under a non-Black teacher.
- **1** High · **2** ECLS-K, ~10,000 kindergartners · **3** Quantitative · **4** Independent.
- **Verification:** Verified (DOI 10.1177/2332858415622175). **Verdict: Tier A.** **Use:** §1.2 (test + referral tracks family/social advantage). *(Also cited in the counterfactual BrainLift register.)*

### College Board (2023) — *Total Group SAT Suite of Assessments Annual Report*
- **Content:** Mean SAT total 891 (lowest census-tract income quintile) → 1148 (highest); 257-pt gap; "met both benchmarks" 15% → 63%.
- **1** High (issuer) · **2** National cohort · **3** Quantitative · **4** Issuer (College Board).
- **Verification:** Verified this session against the primary report. **Verdict: Tier A for the statistic — but the SAT is an *achievement* test, not an ability screen; used only to illustrate that scores track family income.** **Use:** §1.2.

### NWEA MAP — 2025 Growth norms / Growth-and-norms documentation
- **Content:** ~13.8M-student 2025 norms; expected RIT growth compresses in upper grades (≈6 RIT gr 5–6 vs. ≈4 gr 7–8) → conditional growth percentiles are the appropriate high-ceiling metric.
- **1** High (publisher) · **2** Technical docs · **3** Quantitative · **4** **Direct stake–COI (publisher).**
- **Verification:** Verified (NWEA docs). **Verdict: Tier C (vendor).** **Use:** §1.5 (MAP high-ceiling caveat).

### SEM-at-the-cutoff illustration (±3–5 IQ points; asymmetric error at a 130 cut; reliability lowest in young children)
- **Content:** Concrete confidence-band / asymmetric-misclassification numbers used to illustrate why a single hard cutoff misfires at the gifted boundary.
- **Verification:** Underlying principle is standard (AERA/APA/NCME 2014 Standards 2.14–2.16; regression-to-mean). The specific numeric illustration comes from a **secondary summary (Gavin Publishers)** compiled. **Verdict: Tier C (secondary / illustrative).** **Use:** §1.2, cited as illustrative only.

**Not incorporated (out of scope for this BrainLift):** C1 "Elite Illusion" RD (Abdulkadiroğlu, Angrist & Pathak 2014); C4 universal screening (Card & Giuliano 2016); C5–C7 lottery/charter/feasibility (Boston charters; federal charter-lottery N=2,330; Cheung & Slavin 2016 QED-vs-RCT). These defend the counterfactual/access thesis → the gt-school-counterfactual BrainLift.


---

# Provenance branch B — GT-school-counterfactual original ledger (complete)

# Annotated Source Register — gt.school Counterfactual BrainLift

Companion to `brainlift-gt-school-counterfactual.md`. This is the full working set of sources consulted — **strong and weak** — so a reviewer can see what we read, why we trusted or distrusted it, and how it feeds the argument. Weak sources are kept in deliberately: some are marketing or opinion we must *rebut*, some are the claims-under-test, and some are simply context.

## How to read this — the evaluation rubric

Each source is scored on four dimensions:

1. **Author credibility** — established field expertise vs. a newer/peripheral contributor. (High / Medium / Low)
2. **Comprehensiveness** — meta-analysis or large sample vs. small study, single essay, or anecdote. (stated as type + N/k where known)
3. **Quant ↔ Qual** — hard statistics/graphs vs. analytical/editorial prose. (Quantitative / Mixed / Qualitative)
4. **Closeness / stake** — how invested the author is in the conclusion; conflicts of interest. (Independent / Some stake / Direct stake–COI)

Each entry ends with a **Verdict** (tier) and **Use in brainlift**.

### Tier definitions
- **Tier A — Load-bearing.** Peer-reviewed, credible authors, large/meta or well-identified, quantitative, no disqualifying COI. Safe to build an argument on.
- **Tier B — Supporting.** Solid but carries a caveat: some author stake, older/foundational, or verified only via a reputable secondary summary.
- **Tier C — Context / claims-to-rebut.** Marketing, self-reported, opinion blogs, undergraduate work, encyclopedia, or figures we could only confirm second-hand. Useful as the *thing being argued about* or as background — **not** as independent proof.

### At-a-glance tiering
- **Tier A:** Lohman (2005); Lohman & Korb (2006); Lohman & Gambrell (2012); Lohman, Korb & Lakin (2008); McBee, Peters & Miller (2016); McBee, Peters & Waterman (2014); Ramsden et al. (2011); Card & Giuliano (2016); Abdulkadiroğlu, Angrist & Pathak (2014); Dobbie & Fryer (2014); Bui, Craig & Imberman (2014); Rosenbaum & Rubin (1983); Steenbergen-Hu, Makel & Olszewski-Kubilius (2016); Holland (1986); Rubin (1974); Heckman (1979); Duckworth et al. (2007); Credé, Tynan & Harms (2017); Sisk et al. (2018); Yeager et al. (2019); Deary et al. (2007); Grissom & Redding (2016); Lubinski & Benbow (2006); Kell, Lubinski & Benbow (2013); Bernstein et al. (2019); Makel et al. (2016); Bloom (1984); Kulik, Kulik & Bangert-Drowns (1990); Peters et al. (2019).
- **Tier B:** Swiatek & Benbow (1991); Robertson et al. (2010); Imbens & Lemieux (2008); Lee & Lemieux (2010); Schmidt & Hunter (1998); Kuncel, Hezlett & Ones (2001); Blackwell, Trzesniewski & Dweck (2007); Mueller & Dweck (1998); Kelley/Maassen (2000); Campbell & Stanley (1963); Galton (1886); Wyner et al. (2007) *Achievement Trap*; NAGC identification/equity; Education Next CRDC analysis; von Stumm et al. (SES); Cattell (1963); Naglieri & Ford (2003); Segan / *Reason* (2026); Kahneman (2011).
- **Tier C:** Alpha/2HourLearning marketing; Wikipedia (Alpha School); Dylan Kane (Substack); Scott Alexander / ACX; NEPC / First Fish; Jacobin; Tom's Guide; Pamela Hobart / *Above Grade Level*; Deborah Ruf (Substack); Perez (2023) JHU "Tale of Two Cities"; Özen et al. (2023) [unverified]; Duckworth & Seligman (2005) [unverified]; Hart & Risley (1995); secondary NAEP/OCR summaries; historical eugenics sources (NEA/DePaul/Undark).

---

## Section 1 — CogAT selection & the false-negative problem (BrainLift Category 1)

### Lohman, D. F. (2005) — "An Aptitude Perspective on Talent…" *Journal for the Education of the Gifted*, 28(3/4), 333–360
- **Content:** Uses the joint ITBS/CogAT national standardization (~14,000/grade) to show how poorly one test reproduces another's "top" list: CogAT Composite catches only 32% of top-3% readers; Nonverbal only 18%. Argues for local norms and multiple measures.
- **1 Credibility:** High — Lohman is a co-author of the CogAT itself and a leading talent-identification psychometrician.
- **2 Comprehensiveness:** Large national standardization sample; the central tables are direct empirical crosswalks.
- **3 Quant↔Qual:** Quantitative with interpretive discussion.
- **4 Stake:** Some stake — he co-authors CogAT, so he benefits from the test's use, yet he is *critical* of single-cutoff misuse, which cuts against self-interest and raises credibility.
- **Verdict: Tier A.** **Use:** the anchor for 1.1 (one screen misses most able kids) and a key equity source (6.2).

### Lohman, D. F., & Korb, K. A. (2006) — "Gifted Today but Not Tomorrow?" *JEG*, 29(4), 451–484
- **Content:** Longitudinal instability — ~70% of top-3% grade-3 math scorers are not top-3% by grade 8 (r=.73); only ~40% remain top-3% one year later. Worked CogAT SEM examples.
- **1 Credibility:** High. **2 Comprehensiveness:** Draws on Martin's (1985) 6,321-student Iowa longitudinal set. **3 Quant↔Qual:** Quantitative. **4 Stake:** Some (same CogAT authorship note).
- **Verdict: Tier A.** **Use:** backbone of 1.2 (a one-time childhood score is a moving target).

### Lohman, D. F., & Gambrell, J. L. (2012) — "Using Nonverbal Tests to Help Identify Academically Talented Children," *J. Psychoeducational Assessment*, 30(1), 25–44
- **Content:** "Large discrepancies between even highly correlated abilities become common at the extremes"; CogAT Nonverbal SEM ≈ 3.7 (SD=16); CogAT×achievement correlations ~.60–.78.
- **1 Credibility:** High. **2:** Standardization-scale data. **3:** Quantitative. **4:** Some stake.
- **Verdict: Tier A.** **Use:** 1.1 (SEM/true-score band) and the .6–.8 validity ceiling.

### McBee, M. T., Peters, S. J., & Miller, E. M. (2016) — "The Impact of the Nomination Stage on Gifted Program Identification," *Gifted Child Quarterly*, 60(4), 258–278
- **Content:** Simulation showing a nomination/screening gate can push the false-negative rate over 60%; a screening stage can only *lose* students.
- **1 Credibility:** High — McBee and Peters are recognized gifted-ID measurement specialists. **2:** Simulation/modeling (not a sample, but formally general). **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 1.3 (the gate manufactures false negatives).

### McBee, M. T., Peters, S. J., & Waterman, C. (2014) — "Combining Scores in Multiple-Criteria Assessment Systems," *GCQ*, 58(1), 69–89
- **Content:** Origin of the "and/or/mean" combination-rule modeling; "and" rule maximizes false negatives, "mean" is most accurate.
- **1 Credibility:** High. **2:** Simulation incl. Georgia's mandated system. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 1.3 (conjunctive-rule critique of a single-cutoff gate).

### Peters, S. J., et al. (2019) — "Effect of Local Norms on Racial and Ethnic Representation in Gifted Education," *AERA Open*, 5(2)
- **Content:** Switching from a national cutoff to local norms changes who qualifies and improves representation.
- **1 Credibility:** High (Peters, Makel, Matthews, Plucker). **2:** Large-scale. **3:** Quantitative. **4:** Independent (equity-oriented POV).
- **Verdict: Tier A.** **Use:** 1.3 and 6.4 (remedies).

### Ramsden, S., et al. (2011) — "Verbal and non-verbal intelligence changes in the teenage brain," *Nature*, 479, 113–116
- **Content:** Individual IQ shifted −20 to +23 (verbal) over ~3.5 years; ~33% changed FSIQ beyond CI; changes tracked brain-structure changes.
- **1 Credibility:** High — Cathy Price's UCL neuroimaging lab; *Nature*. **2 Comprehensiveness:** **Small N=33** — the key weakness; a later Addendum addressed methodology. **3:** Quantitative + neuroimaging. **4:** Independent.
- **Verdict: Tier A (with a small-N caveat).** **Use:** 1.2 (score instability); flag the N in any presentation.

### Wyner, J. S., Bridgeland, J. M., & DiIulio, J. J. (2007) — *Achievement Trap*, Jack Kent Cooke Foundation & Civic Enterprises
- **Content:** 3.4M top-quartile students from below-median-income families; ~44% of lower-income top-quartile first-grade readers fall out by grade 5 (vs. 31%); low-income students rarely rise in (7% vs. 16–17%).
- **1 Credibility:** Medium-High — reputable authors/foundation, but a **foundation report**, not peer-reviewed. **2:** Large (uses ECLS national data). **3:** Quantitative with advocacy framing. **4:** Some stake — JKCF advocates for low-income high achievers, so the framing serves its mission.
- **Verdict: Tier B.** **Use:** 1.4 (talent loss). Confirm exact page numbers before formal citation (figures verified via Fordham/EdWeek + the "3.4M" verified from the report PDF).

### Kelley's formula / Maassen, G. H. (2000) — *Psychometrika*, 65(2), 187–197
- **Content:** Regression-to-the-mean formula: expected regression ∝ (1 − reliability). The mechanism behind extreme-score fall-out.
- **1:** High (psychometrics). **2:** Methodological. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B (foundational-methodological).** **Use:** 1.2 (why extreme scorers regress). Purely statistical — kept as *mechanism*, not standalone evidence.

---

## Section 2 — The steelman FOR cognitive screening (BrainLift 1.5)

### Deary, I. J., Strand, S., Smith, P., & Fernandes, C. (2007) — "Intelligence and educational achievement," *Intelligence*, 35(1), 13–21
- **Content:** Cognitive test (CogAT) at 11 correlates r≈.69 observed / .81 latent with GCSE at 16; g explains ~59% of math variance.
- **1 Credibility:** High — Ian Deary is a leading intelligence researcher. **2 Comprehensiveness:** **>70,000 children**, 5-year prospective — exceptionally large. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 1.5 (ability really does predict). The single strongest pro-screening datum. Cite the observed .69 as conservative.

### Makel, M. C., Kell, H. J., Lubinski, D., Putallaz, M., & Benbow, C. P. (2016) — "When Lightning Strikes Twice…," *Psychological Science*, 27(7), 1004–1018
- **Content:** Above-level testing at 12 predicts doctorates/tenure/patents by ~40; validates early aptitude ID.
- **1:** High. **2:** SMPY-scale longitudinal. **3:** Quantitative. **4:** Some stake — SMPY team's program of work favors early-ability identification.
- **Verdict: Tier A (note the SMPY stake).** **Use:** 1.5 and cross-support for Category 2.

### Grissom, J. A., & Redding, C. (2016) — "Discretion and Disproportionality," *AERA Open*, 2(1)
- **Content:** At identical achievement, Black students identified as gifted ~half as often as White peers; 3× more likely with a Black teacher. Referral bias is a human-judgment problem a test can partly remove.
- **1:** High. **2:** ECLS-K, >10,000 students, nationally representative. **3:** Quantitative. **4:** Independent (equity POV).
- **Verdict: Tier A.** **Use:** dual-purpose — 1.5 (test beats biased referral) and 6.1 (disparity persists). Confirm exact % against SAGE full text.

### Cattell, R. B. (1963) — "Theory of fluid and crystallized intelligence," *J. Educational Psychology*, 54(1), 1–22
- **Content:** Gf/Gc distinction; the theoretical basis for "aptitude testing is fairer to under-exposed kids than achievement testing."
- **1:** High (seminal). **2:** Foundational theory + experiment. **3:** Mixed. **4:** Independent.
- **Verdict: Tier B (foundational, old).** **Use:** 1.5/6 framing only. Verify any verbatim quote.

### Schmidt, F. L., & Hunter, J. E. (1998) — "Validity and Utility of Selection Methods," *Psychological Bulletin*, 124(2), 262–274
- **Content:** General mental ability validity ≈ .51 for job performance — ability is the best single predictor.
- **1:** High. **2:** 85-year meta-synthesis. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B (contested).** **Caveat:** Sackett et al. (2022) argue range-restriction corrections inflate this; a revised estimate is ~.31. **Use:** 1.5, but pair with the Sackett caveat.

### Özen et al. (2023) — CogAT validity meta-analysis (mean r ≈ .63)
- **Content:** Reported meta-analytic CogAT↔achievement correlation.
- **Status:** **UNVERIFIED** — surfaced via a research pass, exact citation not confirmed.
- **Verdict: Tier C until verified.** **Use:** would strengthen the .6–.8 ceiling claim; do not cite until the paper is located.

---

## Section 3 — SMPY, the anchor literature (BrainLift Category 2)

### Lubinski, D., & Benbow, C. P. (2006) — "Study of Mathematically Precocious Youth after 35 years," *Perspectives on Psychological Science*, 1(4), 316–345
- **Content:** The canonical SMPY review — selection mechanism, five cohorts, dose-response within the top 1%, and the authors' own "self-selection or something intrinsic to the AP program" caveat.
- **1 Credibility:** High — SMPY's directors. **2:** >5,000 participants over decades. **3:** Quantitative with theory. **4:** **Direct stake** — it is their life's work and advances the ability-predicts-eminence thesis; read the outcome framing accordingly.
- **Verdict: Tier A (mind the stake).** **Use:** 2.1–2.4; also the design-honesty seam (their own admitted limits).

### Kell, H. J., Lubinski, D., & Benbow, C. P. (2013) — "Who Rises to the Top? Early Indicators," *Psychological Science*, 24(5), 648–659
- **Content:** N=320 top-0.01%, by age 38: 44% doctorates, ~15% patents, >11% tenure.
- **1:** High. **2:** Small but extreme-tail cohort tracked long-term. **3:** Quantitative. **4:** Direct stake (SMPY team).
- **Verdict: Tier A.** **Use:** 2.3 predictive validity. Confirm the 44/15/11 figures against the article body.

### Bernstein, B. O., Lubinski, D., & Benbow, C. P. (2019) — "Psychological Constellations…," *Psychological Science*, 30(3), 444–454
- **Content:** Ability/preference profiles at 13 predict distinct forms of eminence at ~50; constructive replication across two samples.
- **1:** High. **2:** Two samples (677 + 605). **3:** Quantitative. **4:** Direct stake.
- **Verdict: Tier A.** **Use:** 2.3.

### Swiatek, M. A., & Benbow, C. P. (1991) — ability-matched accelerated vs. unaccelerated, *J. Educational Psychology*, 83, 528–538
- **Content:** SMPY's own quasi-experimental matched comparison (not randomized).
- **1:** High. **2:** Modest longitudinal follow-up. **3:** Quantitative. **4:** Direct stake.
- **Verdict: Tier B.** **Use:** 2.2 (SMPY's counterfactual moves) and the limits of matching.

### Robertson, K., Smeets, S., Lubinski, D., & Benbow, C. P. (2010) — "Beyond the Threshold Hypothesis," *Current Directions in Psychological Science*, 19(6), 346–351
- **Content:** Ability *and* motivation both independently necessary; ability keeps mattering above any threshold.
- **1:** High. **2:** Review/synthesis. **3:** Mixed. **4:** Direct stake.
- **Verdict: Tier B.** **Use:** 4.4 (the strongest same-camp argument that motivation-only selection is risky).

### Vanderbilt SMPY homepage
- **Content:** Program facts (cohorts, leadership, follow-up schedule).
- **1:** High (primary institutional). **2:** N/A. **3:** Qualitative. **4:** Direct stake (self-description).
- **Verdict: Tier B (institutional primary).** **Use:** background facts only.

---

## Section 4 — Causal designs: RD, matched comparison, selection bias (BrainLift Category 3)

### Abdulkadiroğlu, A., Angrist, J., & Pathak, P. (2014) — "The Elite Illusion," *Econometrica*, 82(1), 137–196
- **Content:** Fuzzy RD at Boston/NYC exam-school cutoffs; big peer upgrades → little achievement effect at the margin.
- **1 Credibility:** Very High — Angrist is a Nobel laureate; *Econometrica* is top-tier. **2:** Large administrative datasets. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 3.1 (the null-at-the-margin template and cautionary tale). A *verbatim* definition of "elite illusion" was not located — paraphrase.

### Dobbie, W., & Fryer, R. (2014) — NYC exam schools, *AEJ: Applied Economics*, 6(3), 58–75
- **Content:** RD at Stuyvesant/Bronx Science/Brooklyn Tech; peers 0.17–0.36 SD higher, little effect on achievement or college.
- **1:** Very High (Fryer). **2:** Large. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 3.1. Exact SD coefficients not verified to the digit; the null is.

### Bui, S., Craig, S., & Imberman, S. (2014) — "Is Gifted Education a Bright Idea?" *AEJ: Economic Policy*, 6(3), 30–62
- **Content:** Final AEA article with two distinct designs. The fuzzy RD reconstructs distance to a three-dimensional eligibility surface built from achievement, NNAT, grades, recommendations, and contextual points. Crossing the boundary raised peer achievement ~0.27–0.32 SD and added ~1.25 advanced classes, with a reportedly deeper/project-based curriculum, yet preferred 2SLS effects after ~1.5 years were −0.037 math, +0.049 reading, −0.015 language, +0.003 social studies, and −0.025 science (SEs ~0.07–0.08); positive effects above roughly 0.11–0.18 SD were ruled out by subject. A separate lottery compared premier magnets with neighborhood gifted services: 542 applicants, 394 offers, preferred first stage ~0.47, +0.281 SD science, and nulls elsewhere; differential-attrition bounds included zero for science.
- **Additional facts:** Universal fifth-grade evaluation did not remove later self-selection: magnet applicants were ~1 SD above average gifted students, whiter, and less disadvantaged. Eligibility increased district retention ~4.9 pp from a 76% baseline. Raw-score distributions showed substantial upper-tail headroom. The authors identify compensatory parent tutoring/enrichment and reduced relative rank/instruction targeted above the margin as possible explanations, not measured mechanisms.
- **1:** Very High. **2:** RD outcomes ~4,018–4,025 by subject plus 542 lottery entrants; local estimands. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 3.1/3.7/3.8. It is the closest causal analogue to GT, but the RD is local and short-run, while the magnet lottery estimates intensity over ordinary gifted services rather than gifted versus no gifted. The final PDF corrects the prior overbroad "better peers, same curriculum" description. Note subtitle drift (published "…on Students"; NBER WP 17089 "…on Achievement").

### Card, D., & Giuliano, L. (2016) — "Universal screening…," *PNAS*, 113(48), 13678–13683
- **Content:** Universal screening raised disadvantaged gifted ID +174% / Hispanic +118% / Black +74%, no change to standards.
- **1:** Very High (Card is a Nobel laureate). **2:** District-wide natural experiment, 140 schools. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** triple duty — 3.3 (selection too restrictive), 1.5 (test beats referral), 6.3/6.4 (equity remedy). Use exact 174/118/74 (not rounded 180/130/80).

### Imbens, G., & Lemieux (2008), *J. Econometrics* 142(2); Lee, D., & Lemieux, T. (2010), *JEL* 48(2)
- **Content:** RD identifies a *local* effect (LATE) at the cutoff, silent on inframarginal students.
- **1:** Very High. **2:** Methodological reviews. **3:** Quantitative/technical. **4:** Independent.
- **Verdict: Tier B (methods canon).** **Use:** 3.2 (the LATE limitation — decisive for which population gt.school cares about).

### Rosenbaum, P., & Rubin, D. (1983) — "The Central Role of the Propensity Score," *Biometrika*, 70(1), 41–55
- **Content:** Propensity-score matching removes bias from *observed* covariates only; requires no-unmeasured-confounding.
- **1:** Very High. **2:** Foundational theory. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A (methods).** **Use:** 3.4 (matching's ceiling — the unobserved-motivation residual).

### Steenbergen-Hu, S., Makel, M., & Olszewski-Kubilius, P. (2016) — "What One Hundred Years of Research Says…," *Review of Educational Research*, 86(4), 849–899
- **Content:** Second-order meta-analysis; acceleration vs. same-age peers g≈0.70, vs. older peers g≈0.09 — comparison choice swings the effect.
- **1:** High. **2:** Meta-of-meta-analyses. **3:** Quantitative. **4:** Some stake (gifted-ed field, generally pro-acceleration).
- **Verdict: Tier A.** **Use:** 3.4 (how the counterfactual definition drives the answer). Exact primary-study count unverified; no verbatim quote pulled.

### Holland (1986) *JASA* 81(396); Rubin (1974) *JEP* 66(5); Heckman (1979) *Econometrica* 47(1)
- **Content:** Potential-outcomes framework, the Fundamental Problem of Causal Inference, and selection bias as specification error.
- **1:** Very High (canonical). **2:** Foundational. **3:** Quantitative/theoretical. **4:** Independent.
- **Verdict: Tier A (methods canon).** **Use:** 3.6 (why a counterfactual is required at all). *Moved out of Category 1* because it is design justification, not education-specific evidence.

### Campbell & Stanley (1963) — *Experimental and Quasi-Experimental Designs for Research*
- **Content:** Internal-validity threats; the one-group pretest-posttest design is explicitly vulnerable to regression/selection.
- **1:** High (classic). **2:** Foundational monograph. **3:** Qualitative-methodological. **4:** Independent.
- **Verdict: Tier B (old but canonical).** **Use:** 3.6 support.

### Galton (1886); Kahneman (2011, ch. 17)
- **Content:** Origin and popular exposition of regression to the mean.
- **1:** High. **2:** Historical / trade book. **3:** Mixed. **4:** Independent.
- **Verdict: Tier B / Tier C (Kahneman is a trade book).** **Use:** conceptual only; the education-anchored version lives in 1.2.

---

## Section 5 — Motivation, grit, mindset, catch-up (BrainLift Category 4)

### Duckworth, A., et al. (2007) — "Grit," *JPSP*, 92(6), 1087–1101
- **Content:** Grit predicts West Point retention, Spelling Bee, GPA over IQ/SAT; grit–SAT slightly negative.
- **1 Credibility:** High. **2:** Multiple studies, moderate samples. **3:** Quantitative. **4:** **Direct stake** — Duckworth *created* grit; she benefits from its adoption.
- **Verdict: Tier A (mind the stake).** **Use:** 4.1 (the pro-motivation case). Always pair with Credé.

### Credé, M., Tynan, M., & Harms, P. (2017) — "Much Ado About Grit," *JPSP*, 113(3), 492–511
- **Content:** Grit–performance ρ≈.18; grit–conscientiousness ρ≈.84 (grit barely distinct); only perseverance-of-effort carries signal.
- **1:** High. **2:** Meta-analysis — 584 effects, ~66,807 people. **3:** Quantitative. **4:** Independent (skeptic).
- **Verdict: Tier A.** **Use:** 4.2 (the load-bearing warning against motivation-as-mushy-proxy). The essential counterweight to Duckworth.

### Sisk, V., et al. (2018) — growth-mindset meta-analyses, *Psychological Science*, 29(4), 549–571
- **Content:** Overall mindset–achievement r≈.10; intervention d≈0.08; but low-SES d≈0.34, high-risk d≈0.19.
- **1:** High. **2:** Two meta-analyses, N up to 365,915. **3:** Quantitative. **4:** Independent (skeptic).
- **Verdict: Tier A.** **Use:** 4.3 — and the nuance (effects concentrate in behind students) cuts *for* the thesis.

### Yeager, D., et al. (2019) — national mindset experiment, *Nature*, 573, 364–369
- **Content:** Lower-achieving students gained +0.10 GPA; higher achievers ~0; advanced-math enrollment +~3pp.
- **1:** High. **2:** N=12,490; 65 nationally representative schools; RCT. **3:** Quantitative. **4:** Some stake (mindset-research camp) but a pre-registered, adversarially-scrutinized design.
- **Verdict: Tier A.** **Use:** 4.3 — the strongest external evidence *for* admitting behind-but-motivated students.

### Blackwell, Trzesniewski & Dweck (2007), *Child Development*; Mueller & Dweck (1998), *JPSP*; Dweck, *Mindset* (2006)
- **Content:** Foundational growth-mindset theory and intervention studies (the book is a trade popularization).
- **1:** High (Dweck). **2:** Moderate samples (the book: none). **3:** Quant (papers) / Qual (book). **4:** Direct stake — Dweck originated mindset.
- **Verdict: Papers Tier B; the book Tier C.** **Use:** 4.3 as the "case for," always paired with Sisk/Yeager.

### Bloom, B. (1984) — "The 2 Sigma Problem," *Educational Researcher*, 13(6), 4–16
- **Content:** One-to-one mastery tutoring ≈ 2 SD gain; group mastery ≈ 1 SD.
- **1:** Very High (Bloom). **2:** Synthesis of controlled studies. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A (classic).** **Use:** 4.4 — the mechanism by which behind students catch up (gt.school's actual model).

### Kulik, Kulik & Bangert-Drowns (1990) — mastery-learning meta-analysis, *RER*, 60(2), 265–299
- **Content:** Mastery learning +~0.52 SD on average, *stronger for weaker students*.
- **1:** High. **2:** Meta-analysis, 108 evaluations. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 4.4 — behind students gain most, supporting the thesis.

### Schmidt & Hunter (1998); Kuncel, Hezlett & Ones (2001)
- **Content:** Ability/GRE predictive validity — the "ability dominates" counter-pressure.
- **1:** High. **2:** Meta-analyses (Kuncel: 1,753 samples). **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B.** **Use:** 4.4 (ability is a strong predictor; motivation-only is risky).

### Duckworth & Seligman (2005) — "Self-Discipline Outdoes IQ…"
- **Content:** Self-discipline predicted GPA >2× as well as IQ.
- **Status:** **UNVERIFIED this pass** (title/journal/"2×" from memory).
- **Verdict: Tier C until verified.** **Use:** would support motivation-as-predictor; confirm before citing.

---

## Section 6 — gt.school / Alpha School (BrainLift Category 5)

### Segan, S. (2026) — "G.T. School's Bet on Gifted Ed…," *Reason*, June 24 2026
- **Content:** The most detailed independent profile — the 2-hour model, guides, cash rewards, the CogAT ~90th-percentile detail (in the interviewer's framing), Pamela Hobart's pro-screening defense, tuition (~$25k).
- **1 Credibility:** Medium — professional journalism, but *Reason* is a libertarian magazine with a pro-school-choice editorial lean. **2:** Single long-form article. **3:** Qualitative (interview). **4:** Some stake — the outlet is ideologically favorable to market-based education, though the piece notes gt has been "picked apart skeptically" too.
- **Verdict: Tier B (best available independent reporting; note the lean).** **Use:** 5.1–5.3; the CogAT cutoff fact and Hobart's quote (1.5).

### Alpha School program page / 2HourLearning.com / Timeback / "Mid-Year Report Card"
- **Content:** The outcome *claims* — "2.6x MAP growth," "top 1–2%," "top 0.1% of schools," "learn 10x faster."
- **1 Credibility:** Low for evidence (self-published marketing). **2:** Internal, non-audited analyses. **3:** Quant-styled but unverifiable. **4:** **Direct COI** — this is the seller marketing the product; the "top 0.1%" comparison was LLM-generated.
- **Verdict: Tier C.** **Use:** the *claims under test* (5.2) — cite explicitly as [COMPANY CLAIM], never as proof.

### Dylan Kane (2026) — "Alpha School's Secret Sauce," *Five Twelve Thirteen* (Substack)
- **Content:** Argues Alpha should compare to students' *own baseline*, not the national median; credits results to *motivation, not the technology*.
- **1 Credibility:** Medium-Low — a practicing math teacher and thoughtful blogger, not an academic. **2:** Single essay, no data of its own. **3:** Qualitative/analytical. **4:** Independent (no financial stake; has a critical POV).
- **Verdict: Tier C (opinion), but unusually sharp.** **Use:** 5.4 — he articulates the exact selection critique and independently lands on the motivation thesis. Cite as informed critique, not evidence.

### Scott Alexander — "Your Review: Alpha School," *Astral Codex Ten*
- **Content:** Frames the debate as selection-effect vs. joyless-drilling; "evidence thin in both directions."
- **1:** Medium-Low (influential blogger, not a domain expert). **2:** Essay/review. **3:** Qualitative. **4:** Independent.
- **Verdict: Tier C.** **Use:** 5.4 framing of the two skeptical camps.

### NEPC / First Fish (Cherkin & Champney, 2026)
- **Content:** "Guides" relabeling; questions whether results reflect pre-existing ability/family support; PA charter rejected as "untested."
- **1:** Medium — NEPC is a credible education-policy center, but the specific piece is an attributed opinion/blog the center disclaims endorsing. **2:** Commentary. **3:** Qualitative. **4:** Some stake — NEPC is generally critical of privatized/market education.
- **Verdict: Tier C (attributed opinion).** **Use:** 5.3/5.4 as critique; note the POV.

### Jacobin (Schwenk, 2025); Tom's Guide; Wikipedia (Alpha School)
- **Content:** Jacobin — ideological critique (mostly paywalled); Tom's Guide — consumer tech coverage/tuition; Wikipedia — synthesized overview (co-founder discrepancy: Andrew Price vs. Brian Holtz).
- **1:** Jacobin Low-Medium (left-leaning outlet, stake); Tom's Guide Low (consumer press); Wikipedia Low (tertiary). **2:** Articles/encyclopedia. **3:** Qualitative. **4:** Jacobin has ideological stake.
- **Verdict: Tier C.** **Use:** background and the spread of public framing only; corroborate any load-bearing fact elsewhere.

### Pamela Hobart — *Above Grade Level* (Substack); Deborah Ruf — Substack
- **Content:** Practitioner/advocacy writing on gifted education; Hobart is gt.school's own evangelist.
- **1:** Medium (credentialed advocates) / Low as evidence. **2:** Essays. **3:** Qualitative/editorial. **4:** **Direct stake** — Hobart works for gt.school.
- **Verdict: Tier C.** **Use:** Hobart as gt.school's *documented on-record position* (1.5), explicitly as an interested party; Ruf as background from the prior draft.

---

## Section 7 — Equity / disparity in aptitude testing (BrainLift Category 6)

### Grissom & Redding (2016) — *see Section 2* (dual-use; Tier A). **Use:** 6.1 representation gap at identical achievement.

### NAGC — "Identification" / "Equity" position statements
- **Content:** Underrepresentation "by at least 50%"; 55%/77% (Black/Hispanic) vs. 196%/108% (Asian/White) of expected representation (2017–18 OCR); "one test at one point in time should not dictate" identification.
- **1:** High for advocacy-consensus (the field's professional association). **2:** Aggregates federal data. **3:** Mixed. **4:** **Some stake** — NAGC advocates for gifted-ed expansion and equity.
- **Verdict: Tier B (primary-anchored advocacy).** **Use:** 6.1 (representation) and 6.4 (remedy consensus).

### Lohman, Korb & Lakin (2008) — ELLs on nonverbal tests, *GCQ*, 52(4), 275–296
- **Content:** ELL children scored 0.5–0.67 SD lower on Raven/NNAT/CogAT nonverbal; nonverbal tests are not "culture-fair."
- **1:** High. **2:** 1,198 children (~40% ELL). **3:** Quantitative. **4:** Some stake (CogAT authorship), but the finding critiques nonverbal fixes.
- **Verdict: Tier A.** **Use:** 6.2 (the culture-fair myth).

### Lohman (2005, *GCQ* 49(2)) — role of nonverbal tests
- **Content:** Nonverbal tests "neither culture free nor culture fair"; rebuts Naglieri & Ford.
- **1:** High. **2:** Analysis of standardization data. **3:** Quantitative. **4:** Some stake.
- **Verdict: Tier A.** **Use:** 6.2.

### Naglieri & Ford (2003) — NNAT reduces underrepresentation, *GCQ*, 47(2)
- **Content:** Claimed the NNAT identifies ethnic groups at near-equal rates.
- **1:** Medium-High (Naglieri is a test author). **2:** Sample study. **3:** Quantitative. **4:** **Direct COI** — Naglieri authored the NNAT he is validating; Lohman rebutted the analysis.
- **Verdict: Tier B, but conflicted — the claim was contested.** **Use:** 6.2 as the *disputed* pro-nonverbal position (present with Lohman's rebuttal).

### Education Next — CRDC analysis (2017–18)
- **Content:** 6.9% of students in gifted programs; 27.3% gifted are Black/Hispanic vs. 47.7% enrollment.
- **1:** Medium (reputable ed outlet, some POV). **2:** National federal data. **3:** Quantitative. **4:** Some stake (Education Next has a reform lean).
- **Verdict: Tier B.** **Use:** 6.1 corroboration.

### von Stumm et al. — SES and cognitive growth (PMC4641149); Bignardi et al. (2024), *Developmental Science*
- **Content:** SES–IQ gap ~6 points at age 2, ~triples by 16; vocabulary strongest; SES predicts general ability moderately, specific skills weakly.
- **1:** High. **2:** Large longitudinal (Bignardi N=16,360). **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B (confirm von Stumm citation).** **Use:** 6.3 (SES–score correlation).

### Hart & Risley (1995) — "30-million-word gap"
- **Content:** Differential early linguistic exposure by SES.
- **1:** Medium-High (classic) but **now contested / partially failed to replicate**. **2:** Small original sample (42 families). **3:** Quantitative. **4:** Independent.
- **Verdict: Tier C (contested).** **Use:** illustrative only; note the replication controversy.

### Perez, R. (2023) — "A Tale of Two Cities…," Johns Hopkins *Hopkins Insider*
- **Content:** Baltimore vs. Singapore; cultural definitions of giftedness advantage dominant groups.
- **1 Credibility:** Low — an **undergraduate** admissions-blog write-up, not peer-reviewed. **2:** Essay. **3:** Qualitative. **4:** Independent.
- **Verdict: Tier C.** **Use:** 6.4 as *framing* only; do not lean on it empirically. (Carried over from the first draft.)

### Historical-origins sources (Terman 1916; Brigham 1923; NEA; DePaul Law Review; Undark)
- **Content:** Eugenic roots of mass IQ/SAT testing.
- **1:** Mixed (primary historical + advocacy journalism). **2:** Historical. **3:** Qualitative. **4:** Varying stake (advocacy outlets have a POV).
- **Verdict: Tier C (contested historiography).** **Use:** 6.2 backdrop only — frame as "critics argue," note College Board's repudiation; do not equate historical origins with present-day intentional bias.

---

## Section 8 — Consolidated "use with caution" watch-list

Sources that are in the brainlift or research but must **not** be treated as independent proof:

| Source | Why weak | Legitimate use |
|---|---|---|
| Alpha/2HourLearning marketing | Self-reported, non-audited, direct COI | The claims under test |
| Dylan Kane / ACX / Hobart / Ruf Substacks | Opinion, no original data, some with direct stake | Critique framing; gt's own position |
| NEPC / First Fish; Jacobin | Attributed opinion; ideological lean | Critical framing, corroborate elsewhere |
| Wikipedia; Tom's Guide | Tertiary/consumer press | Background facts only |
| Perez "Tale of Two Cities" | Undergraduate, non-peer-reviewed | Equity framing only |
| Naglieri & Ford (2003) | Test-author COI; analysis contested | The disputed pro-nonverbal claim |
| Hart & Risley (1995) | Small N, replication issues | Illustration only |
| Özen (2023); Duckworth & Seligman (2005) | Unverified citations | Do not cite until confirmed |
| Historical eugenics pieces | Contested historiography, advocacy | Backdrop, framed as "critics argue" |
| Kahneman (2011); Dweck *Mindset* (2006) | Trade books, not primary research | Popular exposition of concepts |

---

## Section 9 — Deep-research additions (design, intervention evidence, motivation measurement)

*Added from a fan-out/adversarial-verification research pass (105 agents; 23 confirmed claims, 2 refuted, 1 empty angle). These fill the two thinnest parts of the brainlift: how to build the counterfactual, and the intervention's own evidence base. The confirmed design and intervention findings are now incorporated into the BrainLift body; this section retains the source-level audit trail.*

### Lottery / waitlist causal designs (the deliverable's backbone)

#### Angrist, Dynarski, Kane, Pathak & Walters (2012) — "Who Benefits from KIPP?" *Journal of Policy Analysis and Management*, 31(4), 837–860 (NBER w15740)
- **Content:** Uses four KIPP Lynn oversubscription lotteries as an offer instrument for cumulative attendance. Final journal version: 629 raw applicants, 446 matched randomized applicants, and 833 stacked student-test observations in preferred models (not 833 independent students); 67.9% offered and 52.5% attended. Preferred first stage ≈1.22 KIPP years; offer ITT/reduced form ≈+0.430 SD math / +0.164 ELA; attendance-IV/LATE ≈+0.352 math / +0.133 ELA per year.
- **Heterogeneity:** Effects were larger for lower-baseline, LEP, and SPED applicants; baseline interactions were −0.111 math and −0.167 ELA, and ELA gains concentrated in the bottom baseline quartile. Statewide administrative testing retained ~85% of expected non-offered outcomes and sensitivity analysis could not explain the large math effect.
- **1 Credibility:** Very High — Angrist (2021 Nobel, IV/LATE), Pathak (Clark Medal). **2:** Single school and voluntary low-income urban applicant pool; complete "No Excuses" package. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** 3.9 model design and the benefit-heterogeneity hypothesis. Transfer the offer/attendance distinction and attrition discipline, not the effect size or population result, to gifted Track B.

#### Tuttle et al. (2013) — "KIPP Middle Schools: Impacts on Achievement and Other Outcomes," Mathematica Policy Research (ED540912)
- **Content:** Multi-site lottery ITT: math **0.13 SD (yr1) → 0.24 SD (yr2)**, significant; reading positive but not significant. States most schools "do not have enough lottery participants," restricting the lottery arm to ~10 schools — the null reading result reflects **underpowering, not zero**.
- **1:** High (Mathematica). **2:** Multi-site; large but power-constrained per site. **3:** Quantitative. **4:** **KIPP-funded but independently executed** — and it reports the conservative null, which mitigates the COI.
- **Verdict: Tier A (note funding).** **Use:** the small-school power problem (Category 3); evidence that "no significant effect" ≠ "no effect."

#### Abdulkadiroğlu, Angrist, Narita & Pathak (2017) — "Research Design Meets Market Design," *Econometrica*, 85(5) (Cowles d2080)
- **Content:** Denver charters via centralized-assignment lottery: **0.35–0.42 SD math, 0.18–0.22 writing**. Omitting propensity-score ("type") controls biases 2SLS *downward by ~half*. **Design-based propensity-score pooling** grew the usable sample from 462 to ~2,300 (~5×) — the concrete fix for underpowered small-school RCTs.
- **1:** Very High. **2:** ~3,500 applicants randomized. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** the power-preservation method (Category 3) — directly relevant to gt.school's small size.

#### Angrist, Pathak & Walters (2022) — NBER w30639 (methodological statement)
- **Content:** Lays out the lottery-IV estimand and assumptions (offer independent of ability; offer raises enrollment); selection can bias in *either* direction and must be handled by design, not assumed.
- **1:** Very High. **2:** Methodological. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B (methods).** **Use:** Category 3 design justification; pairs with the relocated Holland/Rubin material in 3.6.

### The intervention's own evidence base (AI / intelligent tutoring, mastery, tutoring)

#### Steenbergen-Hu & Cooper (2013) — ITS for K-12 mathematics, *J. Educational Psychology*, 105(4), 970–987
- **Content:** Rigorous K-12 standardized-outcome meta-analysis: average **g = 0.01–0.09 (0.09 not significant)**; ITS helped **general-population students more than low achievers** (+0.04 vs −0.18) — could *widen* gaps.
- **1:** High (Harris Cooper, leading meta-analyst). **2:** 26 reports, 34 samples. **3:** Quantitative. **4:** Independent (finding is *unfavorable* to ed-tech → no pro-industry bias).
- **Verdict: Tier A.** **Use:** the reality check on gt.school's "2-hour AI" model (Category 5) and a genuine *complication* of the thesis (the tech may help behind-kids least). Scoped to 1997–2010 rule-based ITS, not modern LLM tutors.

#### VanLehn (2011) — *Educational Psychologist*, 46(4), 197–221
- **Content:** ITS d≈0.76 vs no tutoring, ≈ human tutoring (0.79); **debunks the 2-sigma human-tutoring myth** (actual ≈0.79, not 2.0).
- **1:** High. **2:** Review of ~28 evaluations. **3:** Quantitative. **4:** **Career stake in ITS** — treat the ITS≈human claim cautiously (it was the one finding that only passed 2–1, and the stronger "ITS ≈ human / can approximate 1:1" version was **refuted 0–3**).
- **Verdict: Tier B (author COI).** **Use:** the 2-sigma correction (see Category 4.4 flag below).

#### Kulik & Fletcher (2016) *RER* 86(1); Ma, Adesope, Nesbit & Liu (2014) *J. Educ. Psych.* 106(4); Steenbergen-Hu & Cooper (2014) college ITS meta
- **Content:** ITS median ≈0.66 SD over conventional instruction (Kulik & Fletcher, 50 evaluations), but the average was ~0.73 on locally developed tests versus ~0.13 on standardized tests; outcome alignment materially changes the apparent effect. Ma et al. report g≈0.42/0.57/0.35 by counterfactual (107 ES, N=14,321); college estimates are g≈0.32–0.37.
- **1:** High. **2:** Meta-analyses. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** shows ITS effects are both counterfactual- and outcome-dependent; local/aligned performance cannot be substituted for independent standardized learning (3.8/5.7).

#### Leite et al. (2025) — US K-12 ITS meta-analysis, arXiv 2511.04997 (g = 0.271)
- **1:** Medium (unknown team). **2:** 18 studies, 77 ES. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier C (un-peer-reviewed preprint; suspiciously tight SE).** **Use:** most-recent number, cite with caution.

#### Nickow, Oreopoulos & Quan (2024 update; orig. 2020 NBER w27476) — tutoring meta-analysis
- **Content:** 265 RCTs of tutoring; pooled **0.42 SD**; elementary literacy 0.46–0.48. Cohen, Kulik & Kulik (1982): tutoring ≈0.33 SD; **2-sigma never replicated** (via EdNext "Two Sigma Tutoring," 2024, secondary).
- **1:** High. **2:** Large meta. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** the realistic tutoring-effect benchmark; **corrects the Bloom 2-sigma citation in Category 4.4.**

### Hard-to-game motivation measurement (the Credé gap)

#### Porter, Catalan Molina, Blackwell, Roberts, Quirk, Duckworth & Trzesniewski (2020) — the PERC task, *J. Learning Analytics*, 7(1), 5–18
- **Content:** ~10-min computer **behavioral performance task** (persistence, effort, resilience, challenge-seeking); convergent, discriminant, and **incremental predictive validity for GPA beyond self-report** (N=3,188).
- **1:** High. **2:** Two diverse adolescent samples, N=3,188. **3:** Quantitative. **4:** **Some COI** — Duckworth (grit) and Blackwell (mindset) are advancing a behavioral measure over self-report; psychometrics reported straightforwardly; convergent effects modest (~.12).
- **Verdict: Tier B.** **Use:** the concrete answer to "how do you measure motivation without self-report gaming?" (Category 4 / the design).

#### French Academic Diligence Task study (2022, PMC8748826)
- **Content:** N=3,997 middle-schoolers — the behavioral effort task was the **least** predictive of outcomes; teacher questionnaire predicted best. Direct **counter-evidence** to "behavioral beats self-report."
- **1:** Medium-High. **2:** Large. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B (counter-evidence).** **Use:** keeps the motivation-measurement claim honest — behavioral tasks are *promising, not settled*.

### Test-prep / coaching & SES (Angle 5 — the open gap)

#### Briggs (NELS:88 analyses); WWC ACT/SAT coaching review; SAT-coaching summaries
- **Content:** After controlling for selection, commercial SAT coaching ≈ **20 points combined** (Briggs, NELS:88); WWC ≈ **+9 percentile**; far below the 100–200 points advertised. **No CogAT-specific coaching evidence located.**
- **1:** High (Briggs, Univ. of Colorado; WWC federal). **2:** Nationally representative / systematic review. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A/B — but the *direction* undercuts a brainlift claim.** **Use:** this is the reason to **soften Category 6.3's "test-prep double advantage"** — coaching effects on aptitude tests appear *modest*, so an aptitude cutoff is a proxy for SES mostly through the *developmental* score gap (6.3's SES-cognition evidence), not through test prep. The workflow verified **no** claims for this angle — treat it as an **open research gap**, not settled.

### Refuted claims (do NOT use)
- **"ITS is statistically indistinguishable from 1:1 human tutoring"** — refuted 0–3.
- **"Low achievers benefit from ITS as much as other students"** — refuted 0–3 (contradicted by Steenbergen-Hu & Cooper 2013).

### Two corrections these findings force on the existing brainlift
1. **Category 4.4** currently cites **Bloom's 2-sigma** as the catch-up mechanism. The 2-sigma figure has **never been replicated**; realistic tutoring effects are ~0.30–0.42 SD (Nickow et al. 2024; Cohen/Kulik/Kulik 1982). Add a caveat.
2. **Category 6.3's "test-prep + tuition double advantage"** is under-evidenced: SAT-coaching effects are small (~20 points) and there is no CogAT coaching evidence. Soften to "reasoned but under-evidenced; the SES→score link runs mainly through developmental gaps, not coaching."

---

## Section 10 — Program effect net of selection for high-ability students (the SMPY rebuttal)

*The direct answer to "can any study attribute growth to a program rather than to pre-existing ability?" These are the causal (RD) studies that isolate a program effect for high-ability students — the piece SMPY structurally cannot supply. These findings are incorporated in BrainLift subcategory 3.7.*

### Card, D., & Giuliano, L. (2016) — "Can Tracking Raise the Test Scores of High-Ability Minority Students?" *American Economic Review*, 106(10), 2783–2816
- **Content:** Rank-based **fuzzy RD** (n=4,144) on a separate high-achiever classroom entered by *achievement* rank. Principal local treatment-on-treated estimates are approximately +0.27 SD combined reading/math, +0.29 reading, and +0.34 math; Black & Hispanic complier effects are approximately +0.4–0.5 SD in additional analyses. Math gains persisted into fifth grade and science outcomes improved. Mechanism: differentiated curriculum + higher expectations for underserved high-achievers, not just better peers.
- **1 Credibility:** Very High (Card, Nobel laureate). **2:** Large RD sample. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** the single strongest "program raises achievement for high-ability students, net of selection" result — and the effect is concentrated in the *underserved*, directly supporting the motivation/underserved-inversion thesis. Incorporated in 3.7. (District anonymized in the AER text; widely identified as Broward County, FL.)

### Booij, A. S., Haan, F., & Plug, E. (2016) — "Enriching Students Pays Off…," IZA DP 9757
- **Content:** **Fuzzy RD** at a gifted-program aptitude cutoff (N=3,127, selective Dutch school): GPA +0.38 SD math / +0.30 language / +0.44 other; persists into university field choice. Authors: effects "comparable to what Card and Giuliano find for high achievers, but not for gifted students."
- **1 Credibility:** High (Plug is an established labor economist). **2:** N=3,127, multi-cohort RD. **3:** Quantitative. **4:** Independent. (Working paper, not yet journal-published at the DP stage — verify final publication.)
- **Verdict: Tier A/B (working paper).** **Use:** second clean causal "gifted program works" result; the differentiated-instruction mechanism. Incorporated in 3.7.

### Booij, Haan & Plug (2017) — "Can Gifted and Talented Education Raise the Academic Achievement of All High-Achieving Students?" IZA DP 10836
- **Content:** DiD + RD across three schools (~2,400 students): ~+0.2 SD GPA near the cutoff, with gains *growing* with distance above the cutoff (inframarginal students benefit more).
- **1:** High. **2:** ~2,400. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B (working paper; per-subject SEs unverified).** **Use:** 3.7 — shows the effect is not just a marginal-admit artifact.

### Berger, A., et al. (2013) — Early College High School Initiative Impact Study, AIR (ERIC ED577243); Song & Zeiser (2019)
- **Content:** **Lottery RCT** (2,458 participants, WWC "without reservations"): college enrollment 80% vs 71%; degree attainment 22% vs 2% (partly structural — associate's earned during HS).
- **1:** High (AIR). **2:** 2,458, 10 schools. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A (design), Tier B (relevance).** **Use:** gold-standard causal design, but underserved (not gifted) population and attainment (not achievement growth) — cite for the *design*, caveat the transfer.

### Nickow, Oreopoulos & Quan (2024) — "The Promise of Tutoring for PreK–12 Learning," *AERJ*, 61(1), 74–107 (NBER w27476, 2020)
- **Content:** Meta-analysis of **96 randomized tutoring experiments**; pooled **0.29 SD** (published) / 0.37 SD (WP). Strongest identification for individualized instruction — but sample is overwhelmingly *struggling* students; effect for high-ability students is **untested**.
- **1:** High. **2:** 96 RCTs. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** the closest analog to gt.school's individualized model; honest flag that high-ability transfer is an inference, not a result. (Also corrects the Bloom 2-sigma citation in Category 4.4.)

### Bhatt, R. (2009) — "The Impacts of Gifted and Talented Education" (SSRN 1494334)
- **Content:** **Instrumental-variables** (NOT RD) analysis, NELS:88: positive short-run math gains that fade; higher long-run AP-taking. Exact SD magnitudes unverified.
- **1:** Medium-High. **2:** ~530 schools. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B (weaker identification, unverified magnitudes).** **Use:** supporting, secondary; do not cite as RD.

### The acceleration matched-comparison ceiling (honesty anchor)
- **Steenbergen-Hu et al. (2016)** acceleration g≈0.70 vs same-age peers is **matched/observational only** — a selection-inflated upper bound, structurally as vulnerable to the "already gifted" critique as SMPY. Kulik & Kulik meta-analyses (1982/1992) likewise observational. **Verdict: keep as Tier A meta, but label the causal claim weak.** **Use:** the honest contrast that shows why RD studies (Card & Giuliano, Booij) matter.

### The reconciliation (positive vs. null causal results) — for the review
Program effects appear (Card & Giuliano, Booij) and vanish (Bui/Craig/Imberman; *Elite Illusion*; Dobbie & Fryer) along four axes: (1) selection on **achievement** vs. **IQ**; (2) **differentiated curriculum** vs. merely **better peers**; (3) **underserved** vs. **already-advantaged** populations; (4) **inframarginal** vs. **marginal** students. The defensible synthesis: *selective admission alone does not raise achievement (the elite illusion); differentiated instruction delivered to underserved high-achievers does.*

---

## Section 11 — What actually predicts achievement growth in high-ability students (if not "motivation")

*From a second deep-research pass (105 agents; 24 confirmed claims, 1 refuted, 2 angles empty). Direct answer to "if motivation isn't the correlating factor, what is?" Bottom line: **prior ability/achievement dominates (with no ceiling even at the top), the measurable ability-independent lever is conscientiousness/self-discipline (not grit/mindset), and ability *pattern* — especially spatial ability — is a systematically under-selected predictor.** Two requested angles (deliberate-practice critique; the Subotnik talent-development framework) produced no surviving verified claim — genuine gaps, flagged below.*

### Prior ability/achievement — the dominant predictor, no ceiling at the top

#### Guez, Peyre, Le Cam, Gauvrit & Ramus (2018) — "Are high-IQ students more at risk of school failure?" *Intelligence*
- **Content:** N=30,489 representative French students. Grade-6 fluid IQ predicts grade-9 achievement (β≈.10); coefficient barely changes restricted to top 2% (β=.11) / top 5% (β=.15); quadratic/cubic terms add ~nothing (R² .194→.196) → the IQ–achievement relation is **near-linear with no threshold/ceiling**. (Top-1% slice N=435 n.s., attributed to range restriction.)
- **1 Credibility:** High (Ramus, CNRS/ENS). **2:** Large, representative. **3:** Quantitative. **4:** Independent — no construct-proponent COI.
- **Verdict: Tier A.** **Use:** rebuts "high-IQ kids plateau/underperform"; ability keeps predicting even at the top. General (not gifted-selected) population.

#### McManus, Woolf, Dacre, Paice & Dewberry (2013) — "The Academic Backbone," *BMC Medicine* (PMC3827330)
- **Content:** 5 UK cohorts; secondary-school attainment predicts undergraduate *and* postgraduate performance years later; within-school year-to-year correlations **0.75 (yr1→2), 0.73 (yr3→4)**. Prior achievement is the dominant autoregressive predictor; range restriction in high-ability samples *understates* its true power.
- **1:** High. **2:** Multi-cohort, N=3,333 (1990 cohort). **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** the autoregressive-prior-achievement backbone; external validity to high-ability (medical students are range-restricted-high).
- *(SMPY within-top-1% and top-0.01% ability gradients — Lubinski & Benbow 2006; Kell et al. 2013 — are already in the register (Section 3, 2.3); they establish ability LEVEL predicts magnitude even inside the elite tail, falsifying the threshold hypothesis.)*

### Conscientiousness / self-discipline — the measurable, ability-independent lever

#### Poropat (2009) — "A meta-analysis of the Five-Factor Model and academic performance," *Psychological Bulletin*
- **Content:** k=138, N=70,926. **Conscientiousness** is the strongest Big Five correlate of achievement (corrected r=.22; Openness .12, others ~0); partial r rises to **.24 controlling for intelligence** (largely ability-independent); adds tertiary-GPA prediction (partial r=.17) even **controlling for prior GPA** — at least as large as intelligence's (.14).
- **1:** High. **2:** Large meta. **3:** Quantitative. **4:** Independent (meta-analyst, not construct proponent).
- **Verdict: Tier A.** **Use:** conscientiousness is a distinct, additive lever beyond ability. **Caveat:** general/mixed samples, not gifted-specific.

#### Mammadov (2021) — Big Five & academic performance meta-analysis, *Journal of Personality*
- **Content:** Largest to date — 267 samples, **N=413,074**. Conscientiousness strongest correlate, **corrected ρ=.27** (Openness .16, others ~0).
- **1:** High. **2:** Very large meta. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** confirms Poropat at scale.

#### Duckworth & Seligman (2005) — "Self-Discipline Outdoes IQ in Predicting Academic Performance of Adolescents," *Psychological Science*
- **Content:** Two 8th-grade samples (N=140, N=164). Self-discipline (multi-informant + delay-of-gratification) accounted for **>2× the variance of IQ** in final grades; predicted grades incrementally **after controlling for prior grades, achievement tests, and IQ**. 2022 replication (N=589) "partially supportive."
- **1:** High. **2:** Small original samples. **3:** Quantitative. **4:** **COI — Duckworth is the self-discipline/grit proponent**; possible shared-method variance (teachers rated discipline *and* grades). General population, not gifted.
- **Verdict: Tier B.** **Use:** the "measurable slice of motivation beats IQ for grades" datum. *This resolves the earlier "unverified" flag on Duckworth & Seligman (Section 5) — now verified, but note self-DISCIPLINE ≠ grit (which stays weak).*

#### Meyer, Lüdtke, Trautwein, Köller et al. (2024) — conscientiousness × ability interaction, *European Journal of Personality*
- **Content:** Integrative data analysis, N=18,637 German upper-secondary. **Small *synergistic* interaction** — conscientiousness *amplifies* the ability→achievement link (most valuable in able students).
- **1:** High (Trautwein/Lüdtke are leading ed-psych methodologists). **2:** Large pooled. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B.** **Caveat:** literature is **mixed** — Ziegler et al. (2009) found *compensatory* effects among low performers; a 2023 study found no reliable interaction; effect is small everywhere. **Use:** tentative support that conscientiousness pays off *most* for high-ability students.

### Ability *pattern* — spatial ability is the under-selected predictor

#### Wai, Lubinski & Benbow (2009) — spatial ability & STEM, *Journal of Educational Psychology*; Kell & Lubinski (2014)
- **Content:** Ability *level* predicts magnitude; ability *pattern* predicts the *domain*. A **spatial>verbal tilt + math** predicts STEM achievement. On Project Talent (**N>400,000**, 11-yr tracking), talent searches restricted to math/verbal **miss ~50% of the top 1% in spatial ability**; ~70% of the spatial top-1% are not in the math/verbal top 1%.
- **1:** High. **2:** Very large (Project Talent) + SMPY replication. **3:** Quantitative. **4:** **COI — spatial-ability proponents (Lubinski/Benbow/Wai)**, mitigated by the independent Project Talent dataset.
- **Verdict: Tier A.** **Use:** a *new, ability-based* leg for "the screen is too strict" (Category 1/6) — a CogAT verbal/quant/nonverbal composite likely under-weights spatial, missing ~half the top-1% spatial talent. Not a motivation argument at all.

#### Schneider & Niklas (2017) — IQ vs. working memory, Munich LOGIC study (PMC6526434)
- **Content:** Longitudinal (~200, ages 6–23): IQ predicted reading/spelling/math and **outperformed working-memory capacity** in SEM models.
- **1:** High. **2:** Small, general population. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier B.** **Caveat:** mixed literature (Alloway & Alloway 2010 found WM > IQ); authors concede their measure taps STM. **Use:** among specific cognitive predictors, IQ still leads.
- *Refuted (0-3):* the claim that prior domain knowledge fully *absorbs* IQ/WM once controlled — do not use.

### Gaps (requested but unverified — do NOT claim as supported)
- **Deliberate practice / instructional dose in academics** — the Ericsson vs. Macnamara, Hambrick & Oswald (2014) debate (deliberate practice ≈4% of variance in education) produced no surviving verified claim this pass. Research separately before citing.
- **Subotnik, Olszewski-Kubilius & Worrell (2011) talent-development framework** and its named "psychosocial skills" — not verified this pass. (Also: Renzulli's three-ring task-commitment and self-efficacy claims did not survive verification.)

### Thesis implication (for the review — honest read)
This **partly challenges** the pure "select on motivation" framing: ability keeps predicting achievement even at the top (no ceiling), so ability cannot be waved away. But it **refines the thesis productively**: (a) the real ability-*independent* lever is **conscientiousness/self-discipline** — measurable behaviorally (cf. PERC, Section 9), not the weak grit/mindset constructs; and (b) there is now a **non-motivation** reason the screen is too strict — **spatial ability is systematically under-selected**, missing ~half the top-1%. The defensible pivot: select on **demonstrated prior attainment + ability breadth (incl. spatial) + conscientiousness**, rather than on a narrow verbal/quant cutoff or on fuzzy "motivation."

---

## Section 12 — Measuring program impact isolated from initial ability & motivation (design + metric)

*From a three-cluster research pass (identification designs; outcome metrics + the gifted ceiling problem; methodologist standards + isolating motivation). The throughline: **design and metric are inseparable** — a flawless lottery still measures nothing if the test ceilings out on gifted kids, and a perfect growth metric still confounds motivation if the design isn't randomized. The defensible gifted evaluation combines (a) a **high-ceiling / above-level instrument**, (b) a **growth model referenced to the student's own multi-year baseline** (not the national median), and (c) a **randomization or cutoff design** for the clean causal claim — with **sensitivity bounds** when randomization is impossible.*

### 12A — Identification designs, ranked by how well they neutralize *unobserved* selection (motivation)

- **Admission lottery (ITT / 2SLS) — cleanest currently specified design for Track B.** Angrist, Imbens & Rubin (1996), "Identification of Causal Effects Using Instrumental Variables," *JASA* 91(434), 444–455 (IV/LATE canonical). Applied: Abdulkadiroğlu, Angrist, Dynarski, Kane & Pathak (2011), "Accountability and Flexibility... Boston's Charters and Pilots," *QJE* 126(2), 699–748. **1** Very High **2** Foundational + large application **3** Quantitative **4** Independent. **Tier A.** **Use:** random offer balances observed and unobserved traits (including motivation) in expectation within the randomized pool; attendance 2SLS identifies a LATE for compliers/applicants under additional assumptions. Valid protected-cutoff RD remains a credible local quasi-experimental alternative.
- **Regression discontinuity + its manipulation test.** McCrary (2008), "Manipulation of the running variable... a density test," *J. Econometrics* 142(2), 698–714; Imbens & Lemieux (2008) practice guide (also in 3.2). **1** Very High **2** Methods canon **3** Quantitative **4** Independent. **Tier A.** **Use:** neutralizes unobserved confounders *only locally at the cutoff* and *only if no manipulation* (McCrary density test is the check); silent on inframarginal top students.
- **Difference-in-differences / comparative interrupted time series.** Somers, Zhu, Jacob & Bloom (2013, MDRC) and Jacob, Somers, Zhu & Bloom (2016), "The Validity of the CITS Design...," *Evaluation Review* 40(3), 167–198. **1** High (MDRC/Bloom) **2** Methods validation **3** Quantitative **4** Independent. **Tier A/B.** **Use:** requires **parallel trends** (CITS needs ≥4 pre-points); fails if gifted students are on a *different* unobserved growth trajectory — a real risk here.
- **Synthetic control.** Abadie, Diamond & Hainmueller (2010), *JASA* 105(490), 493–505. **1** Very High **2** Method paper **3** Quantitative **4** Independent. **Tier A.** **Use:** for a single aggregate unit (one school); needs a long pre-period + credible donor pool; individual-level motivation not the direct confound but time-varying shocks remain.
- **Matching / propensity scores — bottom of the hierarchy.** Rosenbaum & Rubin (1983) (already in 3.4). **Use:** balances *observed* covariates only; **motivation fully confounded** — this is exactly the case that needs the 12B sensitivity tools.

### 12B — Sensitivity analysis: quantifying how strong an unmeasured "motivation" confounder must be to overturn a result

- **Rosenbaum bounds (Γ).** Rosenbaum (2002), *Observational Studies*, 2nd ed. (Springer). **Tier A (methods).** **Use:** reports the largest Γ (odds-ratio of differential treatment assignment from a hidden confounder) at which the effect stays significant — "significant up to Γ=2" = a confounder would have to double treatment odds to nullify it. Quantifies, does not remove.
- **Oster δ (coefficient stability).** Oster (2019), "Unobservable Selection and Coefficient Stability," *JBES* 37(2), 187–204. **Tier A.** **Use:** δ ≥ 1 = robust (unobservables would need to be ≥ as strong as observables); standard bound R_max = 1.3·R̃²; Stata `psacalc`. Assumes proportional selection.
- **E-value.** VanderWeele & Ding (2017), "Sensitivity Analysis... the E-Value," *Annals of Internal Medicine* 167(4), 268–274. **Tier A.** **Use:** minimum RR-scale association a confounder needs with both treatment and outcome to explain away the effect; larger = more robust.

### 12C — Outcome metrics that condition out initial ability (and their limits)

- **Value-added models.** Chetty, Friedman & Rockoff (2014), "Measuring the Impacts of Teachers I & II," *AER* 104(9), 2593–2632 / 2633–2679 (>1M students; bottom-5%→average teacher ≈ +$250k lifetime earnings/classroom). **1** Very High **2** Very large **3** Quantitative **4** Independent. **Tier A — but contested:** Rothstein (2017), "Measuring the Impacts of Teachers: Comment," *AER* 107(6) — reproduced CFR but argues the teacher-switching test is invalid; found moderate residual bias. **Use:** conditioning on prior scores removes bias *only if selection is on observables* — the CFR↔Rothstein fight is precisely about unobserved sorting.
- **Student Growth Percentiles.** Betebenner (2009), "Norm- and Criterion-Referenced Student Growth," *Educational Measurement: Issues and Practice* 28(4), 42–51. **1** High **2** Widely adopted (20+ states) **3** Quantitative **4** Some stake (model architect). **Tier B.** **Critique:** Sireci et al. (UMass CEA-16-1), "Why We Should Abandon Student Growth Percentiles" — SGPs are **descriptive, not causal**; a high SGP doesn't establish the *school* caused the growth.
- **Conditional-on-pretest / ANCOVA vs. gain scores, and Lord's Paradox.** Lord (1967), "A paradox in the interpretation of group comparisons," *Psychological Bulletin* 68(5), 304–305; Campbell & Kenny (1999), *A Primer on Regression Artifacts*. **Tier A/B (foundational).** **Use:** ANCOVA/pretest-conditioning handles *observed* starting level but is **biased when the grouping variable correlates with baseline AND the pretest has measurement error** — both true for a self-selected gifted group. No conditioning removes selection-on-unobservables.
- **Own-baseline vs. national-median counterfactual.** MDRC, "Measuring the Impacts of Whole-School Reforms" — project the counterfactual from a school's own recent 3-year baseline. **Tier B.** **Use:** the rigorous version of Kane's "compare to their own prior trajectory" critique — **but** single-school precision is poor: MDRC reports minimum detectable effects ≈ **0.57 SD (reading) / 0.80 SD (math)** for one school. Any single-site growth claim must acknowledge only large effects are detectable.

### 12D — The ceiling-effect problem for gifted students (the metric trap unique to this population)

- **The problem.** Grade-level tests cap gifted scores, making real growth invisible/understated; the AERA VAM statement explicitly flags ceiling/floor effects for high/low achievers. **Honest counter-evidence:** Koedel & Betts (2010), "Value-Added to What? How a Ceiling... Influences Value-Added Estimation," *Education Finance and Policy* 5(1), 54–81 — *aggregate* school-level VAM is only negligibly affected except under severe ceilings; and Resch & Isenberg (Mathematica) similar. **Tier A.** **Use / nuance:** the ceiling bites at the **individual gifted-student** level even where aggregate VAM is robust — different units of analysis; don't overclaim either way.
- **Above-level / out-of-level testing — the fix.** Assouline & Lupkowski-Shoplik (2012), "The Talent Search Model of Gifted Identification," *J. Psychoeducational Assessment* 30(1), 45–59; Lupkowski-Shoplik et al. (2025), "Above-Level Testing in K-12 Schools," *Gifted Child Today* (journal name PARTIALLY verified); SMPY/Stanley rationale (already in register). **Tier A.** **Use:** raise the ceiling (give 12–13-yr-olds an older-level test) so growth among the exceptionally able becomes measurable — the "spreading-out effect."
- **Computer-adaptive / vertically-scaled tests (NWEA MAP).** RIT scale (~100–350); NWEA argues adaptivity measures high achievers better. **Caveat:** precision degrades at the top (a secondary analysis cites an "effective ceiling" ~RIT 245 — PARTIALLY verified; NWEA disputes the framing). **Tier B.** **Use:** directly relevant — gt.school's own outcome metric is MAP, so its high-end ceiling behavior is a live evaluation-design question.

### 12E — Standards, pre-registration, and isolating motivation specifically

- **What Works Clearinghouse Handbook v5.0 (2022).** **Tier A (official standard).** Load-bearing thresholds: only a **low-attrition RCT** earns "meets standards *without* reservations"; QEDs cap at "*with* reservations" and must show **baseline equivalence** — **≤0.05 SD** (no adjustment) / **0.05–0.25 SD** (must adjust) / **>0.25 SD** (fails). The 0.25 cap traces to Ho, Imai, King & Stuart (2007), *Political Analysis* 15(3). Attrition example: 13% overall → max 6.1pp (cautious) / 10.8pp (optimistic) differential. **Use:** the concrete bar the pre-registered design must clear.
- **ITT vs. CACE/LATE.** ITT (analyze by assignment) is the conservative estimand; per-protocol/as-treated **break randomization and reintroduce selection**; CACE/LATE (2SLS) recovers the complier effect under exclusion + monotonicity. **Tier A.**
- **Pre-registration.** Nosek, Ebersole, DeHaven & Mellor (2018), "The preregistration revolution," *PNAS* 115(11), 2600–2606; OSF (~25-item) / AsPredicted (9-item); Registered Reports (Chambers, *Cortex*, 2013, with pre-data peer review + in-principle acceptance). Evidence: Kaplan & Irvin (2015), *PLoS ONE* — significant-result rate in large NHLBI trials fell **57% → 8%** after prospective registration was required (**correlational, not causal — flagged**). **Tier A/B.** **Use:** the credibility scaffolding a skeptic expects.
- **Isolating motivation specifically.** Random assignment directly zeroes the selection-bias term in expectation within the randomized pool (Angrist & Pischke, *Mostly Harmless Econometrics* 2009; Rosenbaum & Rubin 1983); valid RD can identify a local effect under continuity/no-manipulation assumptions. A baseline effort/persistence proxy (e.g., PERC, Section 9) as a covariate controls only the measured slice and improves precision, not bias removal. **Placebo/falsification tests** — Eggers, Tuñón & Dafoe, "Placebo Tests for Causal Inference" — run the analysis on a pre-treatment covariate or an outcome the program cannot affect; a nonzero "effect" signals residual selection. **Caveat:** balance/placebo tests are power-limited and can misfire. **Tier A/B.**

### Verification flags (Section 12)
Solidly verified: Angrist-Imbens-Rubin, McCrary, Abadie et al., Oster, VanderWeele-Ding, CFR ($250k), Betebenner, Koedel-Betts, Assouline-Lupkowski-Shoplik, WWC thresholds (0.05/0.25 SD; 13%→6.1/10.8pp), Ho et al. (0.25 origin), Nosek et al., Kaplan-Irvin (57%→8%). **Check before load-bearing use:** Rothstein exact pages; Lord (1967) exact pages; Resch & Isenberg venue/year; Lupkowski-Shoplik (2025) journal name; the NWEA "RIT 245 effective ceiling" figure (secondary source); Rosenbaum (2002) Ch. 4 page range. Kaplan-Irvin is **correlational** — do not state preregistration *causes* the drop.

---

## Section 13 — Operational comparator: SSP's qualified-pool lottery

### SSP International (2026) — official evaluation and application materials
- **Content:** SSP's official process is holistic/contextual review to identify students "who have the most to gain from and contribute to" the program, followed by parent permission, student assent, and lottery assignment to invitation or waitlist. The waitlist is the comparison group. SSP reported 720 participants across 13 campuses/20 sections in 2026, but publishes neither its applicant count nor qualified-pool size; ~10,000/~1,000 figures remain unverified.
- **Study:** Abt Global conducts 60-minute pre/post surveys under Abt's own IRB. Participants are paid and can withdraw after the study begins without losing a seat. Before the lottery, however, study consent is an eligibility condition: refusal removes the applicant from both program and waitlist. No public preregistration, protocol, power analysis, lottery-pool N, or comparison-arm N was located.
- **1:** High for official process facts; not evidence of impact. **2:** One current program; outcomes not yet published. **3:** Operational/qualitative. **4:** Direct stake — SSP sponsors and describes its own evaluation.
- **Verdict: Tier B (institutional primary / prior art).** **Use:** 3.10 existence proof for the operating pattern, with strict limits: it does not establish GT demand, feasibility, effect, or ethical adequacy.

### SSP scale context — official announcement, IRS filings, AP/*Science* coverage
- **Content:** SSP expanded to 720 participants after a roughly $200 million 2023 bequest; pre-bequest annual spending was around $2 million. Genuine scarcity plus exceptional resources enabled the evaluation.
- **1:** High for financial/participant facts. **2:** Official/IRS/press. **3:** Quantitative context. **4:** Independent filings/press plus institutional reporting.
- **Verdict: Tier B.** **Use:** feasibility boundary only. Do not transfer SSP's resources or oversubscription to GT.

### Jenkins, S. P. (2023) — "Offering Lottery Entry as an Incentive for Research Participation Compromises Informed Consent," *Ethics & Human Research*
- **Content:** Argues that lottery entry as the gateway/incentive for research participation challenges coercion-free informed consent because applicants may not know their odds and small probabilities are difficult to evaluate. The paper predates and does not name SSP, but addresses the same mechanism.
- **1:** High. **2:** Peer-reviewed bioethics analysis. **3:** Normative/analytical. **4:** Independent.
- **Verdict: Tier A for the ethics principle; transfer must be labeled.** **Use:** the ethics reason (3.10) to separate research choice from ordinary admission rights.

### "The Opportunity Cost of Compulsory Research Participation" (2020), *Science and Engineering Ethics*
- **Content:** Characterizes pools with costly refusal alternatives or penalties as objectively coercive, unlike participation that can be declined without cost.
- **1:** High. **2:** Peer-reviewed ethics analysis. **3:** Analytical. **4:** Independent.
- **Verdict: Tier A/B.** **Use:** corroborates the applicant-rights critique; it is an analogy, not an SSP-specific finding.

---

## Section 14 — Durable, transferable, and independent learning

### Kirschner, P. (2026) — "Alpha School May Be Efficient. But Is It Education?" (Substack)
- **Content:** AI-assisted synthesis of critiques by Robert Pondiscio, Jared Cooney Horvath, and Dylan Kane. Distinguishes fast software-aligned progress from retention, transfer, unaided performance, coherent knowledge, and broad educational quality; questions whether stronger monitoring replaces human judgment.
- **1:** Medium as an education scholar/commentator. **2:** Secondary essay with no original empirical study. **3:** Qualitative synthesis. **4:** Independent critical POV; explicitly ChatGPT-assisted.
- **Verdict: Tier C (critic framing).** **Use:** names the outcome-validity question in 5.7. Do not use as empirical proof.

### Kulik & Fletcher (2016) — intelligent-tutoring outcome alignment
- **Content:** In 50 controlled evaluations, median ITS effect was 0.66 SD; average effects were ~0.73 on locally developed tests and ~0.13 on standardized tests.
- **1:** High. **2:** Meta-analysis. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** local/aligned performance can materially overstate independent standardized effects.

### Bastani et al. (2025) — "Generative AI without guardrails can harm learning," *PNAS*
- **Content:** Field experiment with nearly 1,000 high-school math students. GPT Base raised assisted-practice grades 48% but lowered later unaided grades 17% relative to control; teacher-informed hint-based GPT Tutor raised assisted grades 127% and largely mitigated the unaided harm.
- **1:** High. **2:** Randomized field study. **3:** Quantitative. **4:** Independent.
- **Verdict: Tier A.** **Use:** demonstrates that assisted performance and independent learning can move in opposite directions. Transfer to Timeback is conceptual, not product-specific.

### Bailey, Duncan, Odgers & Yu (2017) — "Persistence and Fadeout in the Impacts of Child and Adolescent Interventions"
- **Content:** Reviews common intervention fadeout and distinguishes three persistence pathways: malleable/fundamental skills unlikely to develop anyway, timely opportunity-opening effects, and sustaining environments.
- **1:** High. **2:** Peer-reviewed framework/review. **3:** Mixed. **4:** Independent.
- **Verdict: Tier A.** **Use:** immediate outcome change does not establish persistence; delayed follow-up requires its own estimand.

### GT School privacy policy (April 2026)
- **Content:** Publicly describes possible collection of screenshots/continuous screen recording, mouse/keyboard activity, microphone/system audio, webcam recording, and precise geolocation.
- **1:** High for what the policy states. **2:** Institutional policy. **3:** Qualitative. **4:** Direct stake.
- **Verdict: Tier B for policy facts, not harm.** **Use:** monitoring/fidelity context in 5.7. Do not infer that every category is used in every workflow or that collection causes educational harm.

---

## Cross-cutting observations for the review

- **Author stake is the recurring theme.** The three most important "pro" positions each come from an interested party: SMPY (Lubinski/Benbow) advances ability-predicts-eminence; Duckworth owns grit; Dweck owns mindset; Naglieri sells the NNAT; Alpha markets itself. Each is paired in the brainlift with an independent skeptic (Credé, Sisk, Lohman, the exam-school economists), which is what keeps the argument defensible.
- **The strongest independent evidence sits with the causal-inference economists** (Card, Angrist, Pathak, Dobbie, Fryer, Bui-Craig-Imberman) and the **gifted-ID psychometricians** (Lohman, McBee, Peters) — Tier A, low stake, quantitative. Lean on these.
- **The gt.school evidence is almost entirely Tier C** (marketing + opinion). The single most valuable upgrade to this whole evidence base would be either (a) a documented, sourced statement from gt.school leadership, or (b) access to gt.school's own baseline/roster data — which is exactly why the brainlift's deliverable is a *design*, not a verdict.


---

## Additive dossier provenance (unvetted; labels retained)

an unvetted, overnight-scraped secondary evidence compilation was used as an additive lead source only. Its C1–C8 items are represented in the BrainLift only with their existing `[VERIFIED]`, `[PRESS]`, `[ESTIMATE]`, `[INFERENCE]`, or `[UNVERIFIED]` labels. The dossier's citation errors are not propagated: Kell/Lubinski/Benbow N=320/44% is 2013, and its CogAT current-form tail claims remain `[UNVERIFIED]`. No dossier item upgrades a source's tier or verification status in either provenance branch.

---

## §1.9 Instrument Ledger — the gifted-measurement toolbox beyond CogAT

Sources for Knowledge Tree A §1.9. Tags: **[V]** verified this session/prior against a real citation · **[PUB-COI]** publisher/author of the instrument (conflict of interest) · **[IND]** independent (arm's-length) · **[OLDER-FORM]** prior edition · **[UNVERIFIED]** not confirmed from an authoritative source. Cross-refs note sources already annotated elsewhere in this register (kept here so §1.9 is source-complete). Practicality baseline: individual batteries are Level-C, 1:1, 40–90 min, ~$800–$1,600 kits (publisher admin specs) [PUB-COI].

### A) Individually-administered IQ batteries
- **Wechsler (2014). WISC-V Technical & Interpretive Manual.** Pearson. [PUB-COI] — FSIQ reliability ~.96; norms N=2,200.
- **Pearson WISC-V Technical Reports #5 (Expanded GAI; Raiford, Silverman, Gilman, Courville) & #6 (Extended Norms).** pearsonassessments.com. [PUB-COI] — gifted extended norms to ~210; GAI/EGAI exclude WM/PS.
- **Canivez, Watkins & Dombrowski (2017). Structural validity of the WISC-V (CFA, 16 subtests).** *Psychological Assessment* 29(4):458–472. DOI 10.1037/pas0000358. [V, IND] — 5-factor model fails (negative FR variance); bifactor/dominant *g*; group indices of "questionable interpretive value independent of *g*."
- **Dombrowski, Canivez, Watkins & Beaujean (2015).** *Intelligence* 53:194–201. DOI 10.1016/j.intell.2015.10.009. [V, IND] — EFA corroboration.
- **Scheiber (2016). WISC-V structure/bias across race/ethnicity.** *J. Pediatric Neuropsychology*. DOI 10.1007/s40817-016-0019-7. [V, IND] — subgroup means; CHC structure largely invariant.
- **Wechsler (2012). WPPSI-IV.** Pearson. [PUB-COI] — norms N=1,700; lower ceiling than WISC-V.
- **Syeda & Climie (2014). WPPSI-IV review.** *J. Psychoeducational Assessment*. [V, IND].
- **Roid (2003). Stanford-Binet Intelligence Scales, 5th ed. (SB5).** Riverside/PRO-ED. [PUB-COI] — EXIQ to 225 (extrapolated); 2003 norms.
- **Minton & Pratt (2006). Gifted and highly gifted students: How do they score on the SB5?** *Roeper Review* 28(4):232–236. DOI 10.1080/02783190609554369. [V, IND] — SB5 < WISC-III; rank order not preserved; ceiling compression.
- **Kanaya, Scullin & Ceci (2003).** *American Psychologist*. DOI 10.1037/0003-066x.58.10.778. [V, IND] — Flynn effect/policy risk.
- **McGrew, Mather & LaForte (2025). WJ V Cognitive; WJ V Technical Abstract.** Riverside. [PUB-COI] — digital; ~5,837 norms; GIA .96–.97.
- **Schrank, McGrew & Mather (2014). WJ IV Cognitive.** Riverside. [PUB-COI].
- **WJ V Test Review (2025).** *J. Psychoeducational Assessment*. DOI 10.1177/07342829251395781. [V, IND] — "robust," weaker under six.
- **Elliott (2007). DAS-II; Normative Update (2023, school-age only).** Pearson. [PUB-COI] — GCA/SNC; extended & early-years norms remain 2007.
- **Kaufman & Kaufman (2004). KABC-II; Normative Update (2018, N=700).** Pearson. [PUB-COI] — MPI/NVI drop Gc; ceiling 160.
- **Scheiber (2016). KABC-II bias.** *Assessment*. DOI 10.1177/1073191115624545. [V, IND] — no slope bias; intercept over-prediction.
- **Scheiber (2016). MPI/NVI over-predict minority achievement → gifted placement.** *J. Pediatric Neuropsychology*. DOI 10.1007/s40817-015-0004-6. [V, IND].
- **Kaufman et al. (2006). KABC-II gifted use.** *Gifted Education International*. DOI 10.1177/026142940602100304. [V, some COI].
- **Reynolds & Kamphaus (2015). RIAS-2.** PAR; review DOI 10.1007/s40817-016-0016-x. [PUB-COI].
- **Nelson & Canivez (2012). RIAS structural validity.** *Psychological Assessment* 24(1):129–140. DOI 10.1037/a0024878. [V, IND] — essentially one *g* factor.
- **Dombrowski, Watkins & Brogan (2009).** *J. Psychoeducational Assessment*. DOI 10.1177/0734282909333179. [V, IND] — overfactoring critique.
- **McNicholas & Floyd (2017). RIAS-2 review.** *Canadian J. School Psychology* 32(2):176–180. DOI 10.1177/0829573516673458. [V, IND].

### B) Group ability & nonverbal / culture-reduced screens
- **OLSAT 8 (Otis-Lennon School Ability Test, 8th ed.).** Pearson (2003). [PUB-COI] — SAI SD=16; exact Form-8 coefficients [UNVERIFIED].
- **Buros MMY review of OLSAT 8 — Lohman (~2008).** [V exists; IND, reverse-COI (CogAT co-author); exact MMY edition UNVERIFIED].
- **ERIC ED286883 — older OLSAT/WISC-R predictive-bias study.** [V, OLDER-FORM].
- **NNAT3 Manuals (Levels A–D, E–G).** Pearson (2018). [PUB-COI] — reliabilities .80–.90, weakest K–3; SEM ≈ 4.9–6.7 NAI.
- **Naglieri & Ford (2003). Addressing underrepresentation using the NNAT.** *GCQ* 47(2):155–160. DOI 10.1177/001698620304700206. [V, author-COI].
- **Lohman (2005). Role of nonverbal ability tests…** *GCQ* 49(2):111–138. DOI 10.1177/001698620504900203. [V, IND] — "neither culture free nor culture fair." (Cross-ref: also in the measurement register.)
- **Lohman, Korb & Lakin (2008). Identifying gifted ELLs using nonverbal tests.** *GCQ* 52(4):275–296. DOI 10.1177/0016986208321808. [V, IND] — ELL gaps NNAT −9.5 / CogAT-NV −7.3 / Raven −7.5. (Cross-ref: already in register.)
- **Giessman, Gambrell & Stebbins (2013). NNAT2 vs CogAT6.** *GCQ* 57(2):101–109. DOI 10.1177/0016986213477190. [V, IND] — CogAT-NV closed subgroup gaps better than NNAT2.
- **Carman, Walther & Bartsch (2018).** *GCQ* 62(2):193–209. DOI 10.1177/0016986217752097. [V, IND].
- **NNAT2-vs-CogAT7 kindergarten (2020).** *GCQ*. DOI 10.1177/0016986220921164. [V (record); authors UNVERIFIED].
- **Raven, Rust, Chan & Zhou (2018). Raven's 2 (Clinical Edition).** Pearson. [PUB-COI] — re-normed vs Flynn.
- **McLeod & McCrimmon (2021). Raven's 2 review.** *J. Psychoeducational Assessment* 39(3):388–392. DOI 10.1177/0734282920958220. [V, IND].
- **J. Raven (2021) commentary.** eyeonsociety.co.uk. [V, competing-stake] — residual ceiling risk.
- **InView (TerraNova).** DRC / CTB-McGraw-Hill. [PUB-COI; independent psychometrics UNVERIFIED]; **Ohio DOE approved-test list** [V use] — CSI ≥ 128.
- **Bracken & McCallum. UNIT-2.** PRO-ED. [PUB-COI] — norms N=1,802 (2014 census).
- **Benson, Kranzler & Floyd (2020). EFA/CFA of the UNIT2.** *Assessment* 27(5). DOI 10.1177/1073191118786584. [V, IND] — primarily *g*; non-invariant by age/gender/race.
- **Maller (2004). UNIT non-invariance (deaf).** DOI 10.1177/0013164404263877. [V, IND].
- **Roid, Miller, Pomplun & Koch (2013). Leiter-3.** Stoelting. [PUB-COI].
- **Buros MMY review of Leiter-3 — Wiese (2014).** [V, IND] — reliable/valid NVIQ; no separable Gf/Gv indices; small criterion samples.
- **Hammill, Pearson & Wiederholt (2009). CTONI-2.** PRO-ED. [PUB-COI] — norms N=2,827.
- **Parkin, Beaujean, Firmin, Qiu & Firmin (2018). CTONI-2 independent validity.** *J. Psychoeducational Assessment* 36(5). DOI 10.1177/0734282916688792. [V, IND] — high-end ceiling; weaker reliability/achievement relations (adult sample; child transfer inferential).
- **Delen, Kaya & Ritter (2012). CTONI-2 review.** *JPA* 30(2):209–213. DOI 10.1177/0734282911415614. [V, IND].
- **McGill (2016). EFA of the CTONI-2.** *JPA* 34(4):339–350. DOI 10.1177/0734282915610717. [V, IND].

### C) Rating scales, creativity, above-level, dynamic assessment
- **GRS-2 (Gifted Rating Scales, 2nd ed.).** MHS (Pfeiffer & Jarosewich, orig. 2003). [PUB-COI] — halo/discriminant-validity concern.
- **Jabůrek et al. (2021). GRS-School validation (Czech).** *J. Psychoeducational Assessment* 39(3):361–371. DOI 10.1177/0734282920970718. [V; Pfeiffer co-author = COI] — high inter-factor correlations (halo).
- **McCoach et al. (2024). Teacher effects in gifted rating scales.** DOI 10.1177/00144029241247035. [V, IND] — 10–25% of variance is the teacher. (Cross-ref: holistic report.)
- **Renzulli et al. (2002/2010). SRBCSS (Scales for Rating Behavioral Characteristics of Superior Students).** Renzulli et al. (2009), *J. Advanced Academics* 21(1):84–108 (ERIC EJ880576). [developer-COI] — strong first/halo factor.
- **Gilliam & Jerman (2015). GATES-2.** PRO-ED. [PUB-COI]; **Buros 20th MMY review** [exists; content UNVERIFIED] — publisher-only psychometrics; specificity .70.
- **Peters & Gentry (2010). HOPE Scale.** *GCQ* 54(4):298–313. DOI 10.1177/0016986210378332; **Peters & Gentry (2013)** *GCQ* 57(2):85–100, DOI 10.1177/0016986212469253. [V; developer but transparent] — no race/income DIF; gender DIF; income bias in national norms → local norms.
- **Kim (2006). Can we trust creativity tests? (TTCT review).** *Creativity Research Journal* 18(1):3–14. DOI 10.1207/s15326934crj1801_2. [V, IND].
- **Runco, Millar, Acar & Cramond (2010). TTCT 50-year.** *Creativity Research Journal* 22(4). DOI 10.1080/10400419.2010.523393. [V; proponent-adjacent] — personal achievement r≈.31; public r<.05.
- **Cramond, Matthews-Morgan, Bandalos & Zuo (2005). TTCT 40-year.** *GCQ* 49(4):283–291. [V; proponent-adjacent].
- **Torrance (1966/1974/1984/1990/1998). TTCT.** Scholastic Testing Service. [PUB/author-COI].
- **Lubinski & Benbow (2006). SMPY after 35 years.** *Perspectives on Psychological Science* 1(4):316–345. DOI 10.1111/j.1745-6916.2006.00019.x. [V; some COI]. (Cross-ref: Tree B.)
- **Lubinski & Benbow (2021). Intellectual precocity since Terman.** *GCQ* 65(1):3–28. DOI 10.1177/0016986220925447. [V; some COI].
- **Kirschenbaum (1998). DA with underserved gifted.** *GCQ* 42(3):140–147. DOI 10.1177/001698629804200302. [V].
- **Bolig & Day (1993). DA and giftedness.** *Roeper Review* 16(2). DOI 10.1080/02783199309553552. [V].
- **Al-Hroub (2019). DA for twice-exceptional.** *Roeper Review*. DOI 10.1080/02783193.2019.1585396. [V].
- **Dumas, McNeish & Greene (2020). Dynamic measurement.** *Educational Psychologist* 55(2):88–105. DOI 10.1080/00461520.2020.1744150. [V, IND].

### D) Multi-criteria identification systems
- **NAGC (2019). Pre-K–Grade 12 Gifted Programming Standards (Standard 2).** [consensus/advocacy]. (Cross-ref: holistic report.)
- **Peters, Rambo-Hernandez, Makel, Matthews & Plucker (2019). Local norms.** *AERA Open* 5(2). DOI 10.1177/2332858419848446. [V, IND; preregistered] — Black rep. +238–300%. (Cross-ref: already in register.)
- **Card & Giuliano (2016). Universal screening.** *PNAS* 113(48). DOI 10.1073/pnas.1605043113. [V, IND]. (Cross-ref: already in register.)
- **McBee, Peters & Waterman (2014). Combining scores (AND/OR/mean).** *GCQ* 58(1):69–89. DOI 10.1177/0016986213513794. [V, IND]. (Cross-ref: already in register.)
- **Lakin (2018). Making the Cut in Gifted Selection.** *GCQ* 62(2):210–219. DOI 10.1177/0016986217752099. [V, IND] — OR-rule "diversity" is a pool-size artifact (GCQ Paper of the Year).

**§1.9 open/UNVERIFIED items** (carried from the research passes): OLSAT 8 exact reliability/validity coefficients + norm N + exact Buros MMY edition; NNAT3 achievement r + DIF tables; Raven's 2 exact reliabilities + norm cells; InView independent psychometrics (essentially none located); Leiter-3 exact alphas + independent culture-fairness confirmation; UNIT-2/Leiter-3/CTONI-2 gifted-tail ceiling studies (CTONI-2 finding is adult-sample); GATES-2 Buros review content; NNAT2-vs-CogAT7 (2020) author names; SRBCSS independent DIF/inter-rater.
