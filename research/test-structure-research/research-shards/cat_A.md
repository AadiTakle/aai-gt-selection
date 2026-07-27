# Category A — Adaptive Structure & Routing (research shard)

**Fleet role:** Wave-1 breadth shard for the Test-Structure BrainLift (K–8 automated adaptive
screener; R11). Scope is the **structural** design of adaptivity — architectures, item-selection
algorithms, stopping/termination rules, content balancing, exposure control — **not** the
measurement-precision claim itself, which is owned by `gifted-assessment-quality` (cite as **GA 10.x/13.x**).
This screener makes a **single top-percentile classification**, so classification CAT is emphasized.

**Flag legend:** `T1` peer-reviewed empirical/meta · `T2` Standards/canonical text · `T3` proponent/vendor-affiliated ·
`T4` practitioner/gray. `[COI]` conflict of interest · `[UNVERIFIED]` citation not directly resolved ·
`[ADJACENT]` evidence from an adjacent domain (adult licensure/placement/mastery, not gifted-tail children) ·
`[gap]` no located evidence for the screener's exact condition. DOK-1 facts are literal extractions
("two engineers extract identically"); interpretation lives only in DOK-2/Product-linkage/Tensions.

---

## DOK 1 — Facts

### A.1 — Test architectures: item-level CAT, multistage testing (MST), and hybrid (CAST)

- Item-level **CAT** selects and scores one item at a time against the running ability estimate; it is
  a **mature** method that requires a large IRT-calibrated item bank plus exposure/security controls.
  *(Weiss, 1982, *Applied Psychological Measurement* 6(4):473–492, DOI 10.1177/014662168200600408; Thompson & Weiss, 2011, *Practical Assessment, Research & Evaluation* 16, DOI 10.7275/wqzt-9427; van der Linden & Glas, 2010, *Elements of Adaptive Testing*, DOI 10.1007/978-0-387-85461-8.)* `T2` `[COI: Weiss and Thompson are principals of commercial CAT vendors]` — measurement-maturity claim owned by **GA 10.1**.
- **MST** pre-assembles fixed **modules/panels** and routes examinees between stages after each module
  rather than after each item; it is a **mature** method treated as its own operating model.
  *(Yan, von Davier & Lewis, 2014, *Computerized Multistage Testing: Theory and Applications*, CRC Press, DOI 10.1201/b16858.)* `T2` — maturity claim owned by **GA 10.2**.
- **Computer-Adaptive Sequential Testing (CAST)** is a structured MST framework that "incorporates both
  adaptive testing methods with automated test assembly to allow test developers to maintain a greater
  degree of control over the production, quality assurance, and administration" of computerized tests,
  and "retains much of the efficiency of traditional CAT" while being adaptable to computer **mastery**
  testing (CMT). *(Luecht & Nungester, 1998, "Some Practical Examples of Computer-Adaptive Sequential Testing," *Journal of Educational Measurement* 35(3):229–249, DOI 10.1111/j.1745-3984.1998.tb00537.x.)* `T1` `[ADJACENT: demonstrated on a medical-licensure example]`
- MST/CAST families in practice differ in **number and length of stages/testlets** and in the target
  statistical/qualitative characteristics of stages and testlets; named variants include Computerized
  Mastery Testing (CMT), CAST, Multiple-Form Structures (MFS), and Bundled MST (BMAT).
  *(NCME Instructional Module on Multistage Testing, Hendrickson; citing Lewis & Sheehan 1990, Luecht & Nungester 1998, Armstrong et al. 2004, Luecht 2003.)* `T4` `[practitioner/instructional module]`

### A.2 — Item-selection algorithms

- The default CAT criterion is **Maximum Fisher Information (MFI)**: at each step select the item that
  maximizes Fisher information at the current θ estimate. *(Lord, 1980, *Applications of Item Response Theory to Practical Testing Problems*, Hillsdale, NJ: Lawrence Erlbaum.)* `T2` `[UNVERIFIED: canonical book; page not directly resolved this session]`
- MFI "could be much less efficient than assumed if the estimators are not close to the true θ,
  especially at early stages … when the test length … is too short to provide an accurate estimate";
  a **Kullback–Leibler (global) information** criterion using a moving average of KL information is
  proposed and reduced bias and mean squared error when the test was short / early (roughly m < 30).
  *(Chang & Ying, 1996, "A Global Information Approach to Computerized Adaptive Testing," *Applied Psychological Measurement* 20(3):213–229, DOI 10.1177/014662169602000303.)* `T1`
- **Bayesian item-selection criteria** built on the *true* posterior (not Owen's 1975 normal
  approximation) are proposed; the **maximum predicted posterior expected information** criterion "had
  excellent mean-squared error for more extreme values of theta, and is the criterion elect for
  application in short adaptive tests." *(van der Linden, 1998, "Bayesian item selection criteria for adaptive testing," *Psychometrika* 63(2):201–216, DOI 10.1007/BF02294775.)* `T1`
- **a-stratification** partitions the bank into strata by the discrimination parameter (a) and
  administers **low-a items in early stages and high-a items in later stages**; in simulation it reduced
  the skewness of item-exposure distributions "while efficiency was maintained in trait level
  estimation" and "achieved a lower average exposure rate than CATs based on Bayesian or
  information-based item selection and the Sympson–Hetter method." *(Chang & Ying, 1999, "a-Stratified Multistage Computerized Adaptive Testing," *Applied Psychological Measurement* 23(3):211–222, DOI 10.1177/01466219922031338.)* `T1`
- A refinement, **a-stratification with b-blocking**, requires b-parameter values to be evenly
  distributed across the a-strata and "improved control of item exposure rates and reduced mean squared
  errors" on a retired GRE bank. *(Chang, Qian & Ying, 2001, "a-Stratified Multistage CAT with b Blocking," *Applied Psychological Measurement* 25(4), DOI 10.1177/01466210122032181.)* `T1`

### A.3 — Stopping / termination rules (classification emphasis)

- CAT termination is generally either **fixed-length** (stop after a set number of items) or
  **fixed-precision / variable-length** (stop when the standard error of θ falls below a target); these
  are treated as the two standard CAT stopping families. *(van der Linden & Glas, 2010, *Elements of Adaptive Testing*, DOI 10.1007/978-0-387-85461-8; Thompson & Weiss, 2011, *PARE* 16, DOI 10.7275/wqzt-9427.)* `T2` `[COI: Thompson vendor-affiliated]`
- **Wald's (1947) Sequential Probability Ratio Test (SPRT)** can be implemented as an adaptive test that
  **classifies** examinees into categories by testing H₀: θ ≤ θ₀−δ vs H₁: θ ≥ θ₀+δ around a cut score
  θ₀ with an **indifference region** of half-width δ, stopping when the log-likelihood ratio crosses the
  A/B boundaries set by the target error rates. *(Wald, 1947, *Sequential Analysis*, New York: Wiley; applied to testing in Eggen, 1999, below.)* `T2`
- For classifying into categories, **item selection using Kullback–Leibler information "performed better
  than or as well as" Fisher-information-based selection** with the SPRT, in 2- and 3-category
  simulations. *(Eggen, 1999, "Item Selection in Adaptive Testing with the Sequential Probability Ratio Test," *Applied Psychological Measurement* 23(3):249–261, DOI 10.1177/01466219922031365.)* `T1`
- A CAT that classifies examinees into **three categories** (using either statistical testing [SPRT] or
  statistical estimation) yielded "a reduction of at least 22% in the mean number of items … compared to
  an existing paper-and-pencil placement test," and "imposing constraints on the MI selection strategy
  does not negatively affect the quality." *(Eggen & Straetmans, 2000, "Computerized Adaptive Testing for Classifying Examinees into three Categories," *Educational and Psychological Measurement* 60(5):713–734, DOI 10.1177/00131640021970862.)* `T1` `[ADJACENT: placement/pass-level cuts, not a top-percentile cut]`
- When matched on classification error rates, the **SPRT required fewer test items than a sequential
  Bayes procedure** to achieve the same classification accuracy. *(Spray & Reckase, 1996, "Comparison of SPRT and Sequential Bayes Procedures for Classifying Examinees Into Two Categories Using a Computerized Test," *Journal of Educational and Behavioral Statistics* 21(4):405–414, DOI 10.3102/10769986021004405.)* `T1` `[ADJACENT: licensure/certification/placement]`
- In a **confidence-interval / adaptive-mastery** stopping rule, a confidence interval is built around θ
  and compared to the cut; a comparison found the **SPRT produced greater average test-length reductions,
  but adaptive mastery testing (AMT, the confidence-interval approach) "resulted both in more valid
  mastery decisions and in more balanced error rates," giving "the best combination of test length and
  validity."** *(Kingsbury & Weiss, 1983, "A comparison of IRT-based adaptive mastery testing and a sequential mastery testing procedure," in D. J. Weiss (Ed.), *New Horizons in Testing*, pp. 257–283, Academic Press; finding corroborated in Kingsbury & Weiss, 1980, Research Report 80-4, University of Minnesota.)* `T2` `[COI: Weiss vendor-affiliated]` `[UNVERIFIED: 1983 chapter page range not directly resolved; 1980 report verified]`
- Review of **item selection in computerized classification testing (CCT)** concludes there is "no
  conclusive evidence on the substantial superiority of a single method" (several methods "assess items
  very similarly … and will usually select the same item"); crucially, "the efficiency of item selection
  approaches depend on the termination criteria," and "item selection at the cut score, which seems
  conceptually appropriate for CCT, is not always the most efficient option." *(Thompson, 2009, "Item Selection in Computerized Classification Testing," *Educational and Psychological Measurement* 69(5):778–793, DOI 10.1177/0013164408324460.)* `T1` `[COI: author affiliated with a CAT/CCT vendor (Assessment Systems Corporation)]`
- **Sequential generalized likelihood ratio (GLR)** tests extend asymptotic-optimality theory to
  "sequentially generated experiments … of particular interest in computerized adaptive testing," and
  the resulting adaptive mastery tests are "asymptotically optimal and … provide substantial
  improvements over currently used sequential and fixed length tests"; the paper flags that the error
  rates of the standard SPRT with adaptively selected (non-i.i.d.) items "are often substantially
  inflated." *(Bartroff, Finkelman & Lai, 2008, "Modern Sequential Analysis and Its Applications to Computerized Adaptive Testing," *Psychometrika* 73(3):473–486, DOI 10.1007/s11336-007-9053-9.)* `T1`

### A.4 — Content balancing & constraint management

- **Constrained CAT (C-CAT)** adds content control to a classical item-selection rule by selecting the
  next item from the content area whose **current administration rate is farthest below its target
  percentage**, "while maintaining the high measurement precision and short test length" of adaptive
  testing. *(Kingsbury & Zara, 1989, "Procedures for Selecting Items for Computerized Adaptive Tests," *Applied Measurement in Education* 2(4):359–375, DOI 10.1207/s15324818ame0204_6.)* `T1`
- Enforcing a content blueprint has a **length cost**: constrained CAT "requires an increase of 5% to
  11% in test length over the traditional adaptive test to reach the same error level," while a
  testlet-based approach "requires an increase of 43% to 104%." *(Kingsbury & Zara, 1991, "A Comparison of Procedures for Content-Sensitive Item Selection in Computerized Adaptive Tests," *Applied Measurement in Education* 4(3), DOI 10.1207/s15324818ame0403_4.)* `T1`
- The **shadow-test approach** re-assembles, before each item, a full-length "shadow" test by linear
  programming that maximizes information at the current θ, **fixes the already-administered items, and
  satisfies the entire constraint set**; the most informative free item is then administered, so the
  adaptive test automatically meets all constraints and is optimal at each θ. On a 753-item LSAT bank,
  "the θ estimator for adaptive tests of realistic lengths did not suffer any loss of efficiency from
  the presence of 433 constraints." *(van der Linden & Reese, 1998, "A Model for Optimal Constrained Adaptive Testing," *Applied Psychological Measurement* 22(3):259–270, DOI 10.1177/01466216980223006; method also in van der Linden, 2000.)* `T1` `[ADJACENT: LSAT / adult high-stakes bank]`
- Comparative work on content-balancing methods (constrained CAT, modified constrained CAT, modified
  multinomial) reports "no systematic effect of content balancing method in measurement efficiency and
  pool utilization," though the multinomial variant "consistently over-expose[s] fewer items."
  *(Leung, Chang & Hau, 2003, "Computerized Adaptive Testing: A Comparison of Three Content Balancing Methods," *Journal of Technology, Learning, and Assessment* 2(5).)* `T4` `[peer-edited e-journal; corroborative only]`

### A.5 — Item-exposure & security control

- The foundational probabilistic exposure control is the **Sympson–Hetter (SH) procedure**: an
  acceptance probability is applied after selection so that no item is administered to more than a target
  proportion of a reference population. *(Sympson & Hetter, 1985, "Controlling item-exposure rates in computerized adaptive tests," Proceedings of the 27th Annual Meeting of the Military Testing Association, pp. 973–977, San Diego: Navy Personnel R&D Center; documented in Wainer et al., 2000, *Computerized Adaptive Testing: A Primer*.)* `T2` `[COI: military/vendor origin]` `[UNVERIFIED: original proceedings not directly resolved; content corroborated by Stocking & Lewis 1995 and downstream T1 papers]`
- The **Stocking–Lewis multinomial** method generalizes SH to control overall exposure (including item
  sets), but its authors note it "do[es] not have all the features one might eventually require … the
  overall exposure rate of an item is controlled, [but] its exposure conditional on ability is not."
  *(Stocking & Lewis, 1995, "A New Method of Controlling Item Exposure in Computerized Adaptive Testing," *ETS Research Report Series* 1995(2), DOI 10.1002/j.2333-8504.1995.tb01660.x.)* `T3` `[COI: ETS operational-testing context]`
- **Exposure conditional on ability**: an item can have a low *overall* exposure rate yet be
  administered to "100% of the high[-ability]" test-takers; a method is presented to control the
  exposure rate of items **conditional on ability level** in continuous testing. *(Stocking & Lewis, 1998, "Controlling Item Exposure Conditional on Ability in Computerized Adaptive Testing," *Journal of Educational and Behavioral Statistics* 23(1):57–75, DOI 10.3102/10769986023001057.)* `T1`
- The **Progressive** method reduces the weight of a random component (raising the weight of information)
  as the test proceeds, and the **Restricted** method forbids any item from exceeding a predetermined
  exposure proportion; the Restricted method "reduce[d] maximum exposure rates," the Progressive method
  "reduced the number of unused items," both "did well regarding precision," and a **combined
  Progressive-Restricted** method "may be useful to control item exposure without a serious decrease in
  test precision." *(Revuelta & Ponsoda, 1998, "A Comparison of Item Exposure Control Methods in Computerized Adaptive Testing," *Journal of Educational Measurement* 35(4):311–327, DOI 10.1111/j.1745-3984.1998.tb00541.x.)* `T1`
- The **shadow-test / item-eligibility** method (van der Linden & Veldkamp) constrains exposure within
  the shadow-test assembly, and **a-stratification** (A.2) is itself categorized as a *stratification*
  exposure-control strategy, alongside SH (conditional selection) and Progressive (randomization).
  *(van der Linden & Veldkamp, 2004, "Constraining Item Exposure in Computerized Adaptive Testing With Shadow Tests," *Journal of Educational and Behavioral Statistics* 29(3), DOI 10.3102/10769986029003273; taxonomy per Georgiadou, Triantafillou & Economides, 2007, *JTLA* 5(8).)* `T1` (van der Linden & Veldkamp) / `T4` (Georgiadou review)
- Independent comparisons report a "clear and logical trade-off between item exposure control and
  measurement precision," with **no single method possessing all desired characteristics**; the Stocking–
  Lewis conditional multinomial and the Davey–Parshall methods were judged most promising overall.
  *(Chang & Ansley, 2003, "A Comparative Study of Item Exposure Control Methods in Computerized Adaptive Testing," *Journal of Educational Measurement* 40(1):71–103, DOI 10.1111/j.1745-3984.2003.tb01097.x.)* `T1`

---

## DOK 2 — Summary

Adaptivity is a family of separable **structural** choices — architecture, item-selection criterion,
stopping rule, content constraints, and exposure control — that can be configured independently, and the
psychometric literature treats item-level CAT, MST, and hybrid CAST as three mature architectures that
trade item-level efficiency against pre-publication quality assurance and control (A.1; GA 10.1/10.2).
Item-selection is not one algorithm: maximum-Fisher-information is the default but is unreliable early or
far from θ, which motivates Kullback–Leibler/global information, true-posterior Bayesian criteria (best
for **extreme θ and short tests**), and a-stratification (A.2). Because this screener makes a **single
top-percentile classification** rather than a point estimate, the relevant stopping rules are the
*classification* family — SPRT, the confidence-interval/adaptive-mastery rule, and modern generalized-
likelihood-ratio tests — which stop as soon as the cut decision is statistically secure and are markedly
shorter than fixed-length estimation (A.3). Within that family the evidence is genuinely mixed: SPRT is
the shortest on average, the confidence-interval approach is more valid with more balanced errors, and
GLR is asymptotically optimal while warning that textbook SPRT error rates are "substantially inflated"
under adaptively selected (non-i.i.d.) items (A.3). Content balancing (constrained CAT, shadow tests)
makes routing deterministic and auditable but costs roughly 5–11% more items, and every exposure-control
method buys security by giving up some precision (A.4–A.5). Most of this evidence comes from adult
licensure, placement, and mastery testing with cuts near the middle of the scale, so applying it to a
top-1–2% cut with a K-8 bank is an explicit `[ADJACENT]`/`[gap]` extrapolation (A.3–A.5).

---

## Source register entries

| Source (as written) | DOI/URL | Tier | Flags | One-line fact |
|---|---|---|---|---|
| Weiss, D. J. (1982). Improving measurement quality and efficiency with adaptive testing. *Applied Psychological Measurement*, 6(4), 473–492. | 10.1177/014662168200600408 | T2 | [COI vendor] | CAT is a mature method needing an IRT-calibrated bank + controls (measurement claim → GA 10.1). |
| Thompson, N. A., & Weiss, D. J. (2011). A framework for the development of computerized adaptive tests. *PARE*, 16. | 10.7275/wqzt-9427 | T2 | [COI vendor] | Frames CAT components incl. stopping families (fixed-length vs fixed-precision). |
| van der Linden, W. J., & Glas, C. A. W. (Eds.) (2010). *Elements of Adaptive Testing*. Springer. | 10.1007/978-0-387-85461-8 | T2 | — | Canonical compendium of CAT architecture, selection, stopping, constraints. |
| Yan, D., von Davier, A. A., & Lewis, C. (2014). *Computerized Multistage Testing: Theory and Applications*. CRC Press. | 10.1201/b16858 | T2 | — | MST is a mature module/panel-routed architecture (→ GA 10.2). |
| Luecht, R. M., & Nungester, R. J. (1998). Some practical examples of computer-adaptive sequential testing. *JEM*, 35(3), 229–249. | 10.1111/j.1745-3984.1998.tb00537.x | T1 | [ADJACENT licensure] | CAST hybrid: adaptive routing + automated assembly for control/QA, retains much CAT efficiency. |
| Lord, F. M. (1980). *Applications of Item Response Theory to Practical Testing Problems*. Erlbaum. | (book) | T2 | [UNVERIFIED page] | Maximum-Fisher-information item selection is the default CAT criterion. |
| Chang, H.-H., & Ying, Z. (1996). A global information approach to CAT. *APM*, 20(3), 213–229. | 10.1177/014662169602000303 | T1 | — | KL/global-information selection reduces bias/MSE when the test is short (m<30). |
| van der Linden, W. J. (1998). Bayesian item selection criteria for adaptive testing. *Psychometrika*, 63(2), 201–216. | 10.1007/BF02294775 | T1 | — | Max predicted posterior expected information: excellent MSE at extreme θ; best for short tests. |
| Chang, H.-H., & Ying, Z. (1999). a-Stratified multistage CAT. *APM*, 23(3), 211–222. | 10.1177/01466219922031338 | T1 | — | Low-a early / high-a late reduces exposure skew at equal efficiency; lower avg exposure than SH. |
| Chang, H.-H., Qian, J., & Ying, Z. (2001). a-Stratified multistage CAT with b blocking. *APM*, 25(4). | 10.1177/01466210122032181 | T1 | — | b-blocking refinement improves exposure control and reduces MSE. |
| Wald, A. (1947). *Sequential Analysis*. Wiley. | (book) | T2 | — | SPRT: sequential test of H0/H1 with an indifference region; origin of classification stopping. |
| Eggen, T. J. H. M. (1999). Item selection in adaptive testing with the SPRT. *APM*, 23(3), 249–261. | 10.1177/01466219922031365 | T1 | — | KL-based item selection ≥ Fisher-based for SPRT 2-/3-category classification. |
| Eggen, T. J. H. M., & Straetmans, G. J. J. M. (2000). CAT for classifying examinees into three categories. *EPM*, 60(5), 713–734. | 10.1177/00131640021970862 | T1 | [ADJACENT placement] | ≥22% fewer items vs paper placement; content/exposure constraints didn't hurt quality. |
| Spray, J. A., & Reckase, M. D. (1996). Comparison of SPRT and sequential Bayes … *JEBS*, 21(4), 405–414. | 10.3102/10769986021004405 | T1 | [ADJACENT licensure] | At matched error rates, SPRT needs fewer items than sequential Bayes. |
| Kingsbury, G. G., & Weiss, D. J. (1983). A comparison of IRT-based adaptive mastery testing and a sequential mastery testing procedure. In *New Horizons in Testing* (pp. 257–283). | (book chapter) | T2 | [COI vendor][UNVERIFIED page] | SPRT shortest on average, but confidence-interval AMT gives more valid, more balanced decisions. |
| Thompson, N. A. (2009). Item selection in computerized classification testing. *EPM*, 69(5), 778–793. | 10.1177/0013164408324460 | T1 | [COI vendor] | No single CCT selection method superior; efficiency depends on stopping; cut-selection not always best. |
| Bartroff, J., Finkelman, M., & Lai, T. L. (2008). Modern sequential analysis and its applications to CAT. *Psychometrika*, 73(3), 473–486. | 10.1007/s11336-007-9053-9 | T1 | — | GLR mastery tests asymptotically optimal; SPRT error rates "substantially inflated" under adaptivity. |
| Kingsbury, G. G., & Zara, A. R. (1989). Procedures for selecting items for CAT. *AME*, 2(4), 359–375. | 10.1207/s15324818ame0204_6 | T1 | — | Constrained CAT (C-CAT) + randomesque; select from content area farthest below its target. |
| Kingsbury, G. G., & Zara, A. R. (1991). A comparison of procedures for content-sensitive item selection in CAT. *AME*, 4(3). | 10.1207/s15324818ame0403_4 | T1 | — | Content blueprint costs +5–11% items (constrained CAT); testlets +43–104%. |
| van der Linden, W. J., & Reese, L. M. (1998). A model for optimal constrained adaptive testing. *APM*, 22(3), 259–270. | 10.1177/01466216980223006 | T1 | [ADJACENT LSAT] | Shadow test (LP) meets full constraint set each step; 433 constraints, no efficiency loss (753-item bank). |
| Leung, C.-K., Chang, H.-H., & Hau, K.-T. (2003). CAT: a comparison of three content balancing methods. *JTLA*, 2(5). | ejournals.bc.edu/index.php/jtla/article/view/1665 | T4 | [e-journal] | No systematic efficiency difference among content-balancing methods; multinomial over-exposes fewer items. |
| Sympson, J. B., & Hetter, R. D. (1985). Controlling item-exposure rates in CAT. *Proc. 27th Mil. Testing Assoc.*, 973–977. | (proceedings) | T2 | [COI mil/vendor][UNVERIFIED] | SH probabilistic acceptance caps an item's exposure to a target proportion of a population. |
| Stocking, M. L., & Lewis, C. (1995). A new method of controlling item exposure in CAT. *ETS RR* 1995(2). | 10.1002/j.2333-8504.1995.tb01660.x | T3 | [COI ETS] | Multinomial exposure control (overall), but does not control exposure conditional on ability. |
| Stocking, M. L., & Lewis, C. (1998). Controlling item exposure conditional on ability in CAT. *JEBS*, 23(1), 57–75. | 10.3102/10769986023001057 | T1 | — | Low overall exposure can still mean ~100% exposure at one ability; controls exposure conditional on θ. |
| Revuelta, J., & Ponsoda, V. (1998). A comparison of item exposure control methods in CAT. *JEM*, 35(4), 311–327. | 10.1111/j.1745-3984.1998.tb00541.x | T1 | — | Progressive + Restricted (combined) control exposure with little precision loss. |
| van der Linden, W. J., & Veldkamp, B. P. (2004). Constraining item exposure in CAT with shadow tests. *JEBS*, 29(3). | 10.3102/10769986029003273 | T1 | — | Item-eligibility constraints inside shadow-test assembly control exposure. |
| Chang, S.-W., & Ansley, T. N. (2003). A comparative study of item exposure control methods in CAT. *JEM*, 40(1), 71–103. | 10.1111/j.1745-3984.2003.tb01097.x | T1 | — | Clear exposure↔precision trade-off; no method has all desired properties. |
| Georgiadou, E., Triantafillou, E., & Economides, A. (2007). A review of item exposure control strategies 1983–2005. *JTLA*, 5(8). | ejournals.bc.edu/index.php/jtla/article/view/1647 | T4 | [review] | Taxonomy: conditional-selection (SH/restricted/eligibility), randomization (progressive), stratification (a-strat). |

---

## Cross-references (to `gifted-assessment-quality` — cite, do not duplicate)

- **GA 10.1 (Adaptive testing / CAT — mature):** owns the *precision/efficiency* claim ("half the items
  for equal reliability," near-equal precision at all θ). This shard adds the *how* — selection/stopping/
  constraint/exposure mechanics — and does not re-derive precision.
- **GA 10.2 (Multistage testing — mature):** owns MST maturity/validity; A.1 here adds the *structural*
  CAT↔MST↔CAST distinction (item-level vs panel-level routing; QA/control vs efficiency).
- **GA 10.3 (above-level) / 10.4 (high ceiling) / 10.5 (vertical scaling):** the item bank a top-percentile
  CAT routes into must be calibrated above grade with ceiling headroom; A.2 selection at an extreme cut
  presumes that bank (see also Category B item-difficulty ordering).
- **GA 10.6 (multidimensional IRT):** multidimensional CAT changes item-selection/stopping math (D-optimality,
  per-dimension precision); A.2/A.3 here are stated for the unidimensional case.
- **GA 10.8 (repeated measurement) / 10.10 (CAT operating system):** exposure control (A.5) and deterministic
  routing (A.4) are the operating-system machinery that make repeated/continuous administration secure — hands
  off to **Category C (retakes)** and **Category I (auditability/D-015)**.
- **GA 13.4 (extraneous load) / 13.7 (comprehension/device/delivery):** stopping-rule length and content
  constraints set test length, which interacts with load and session design → **Categories E and F**.

---

## Product linkage (R11 screener) — concrete structural/config implications

1. **Use a classification (variable-length) stopping rule, not fixed-precision θ estimation.** The
   screener's job is a single top-percentile decision, so a rule that stops when the cut decision is
   secure (SPRT, confidence-interval/adaptive-mastery, or GLR) is structurally correct and materially
   shorter (Eggen & Straetmans 2000; Spray & Reckase 1996). **Config:** define an indifference region
   (θ₀ ± δ) around the top-percentile cut and target Type-I/II error rates; because textbook SPRT error
   rates are "substantially inflated" under adaptive item selection (Bartroff et al. 2008), either adopt
   GLR/truncated-SPRT or **empirically calibrate** decision error at the cut before trusting nominal
   bounds. Serves R11, R5, R10; ties Category I (D-015).
2. **Select items at/around the cut, but co-design selection with the stopping rule.** Information is
   worth most near θ₀ for a classification, yet Thompson (2009) shows cut-focused selection is "not
   always the most efficient option" and efficiency "depend[s] on the termination criteria." **Config:**
   pilot MFI-at-cut vs KL vs Bayesian-posterior selection *jointly* with the chosen stopping rule; for
   the extreme tail, van der Linden (1998) favors the true-posterior criterion for short tests. Serves R11.
3. **Control exposure conditional on ability at the cut, not just overall.** Concentrating items at one
   cut θ overexposes the near-cut items to the entire borderline population even when overall rates look
   safe (Stocking & Lewis 1998). **Config:** apply conditional exposure control (Stocking–Lewis
   conditional or progressive-restricted, Revuelta & Ponsoda 1998) at the cut band, and size the bank so
   near-cut items have replacements. This directly limits coaching/retake gaming → hands to Categories C & H.
4. **Prefer deterministic, pre-constrained routing (constrained CAT or shadow test), or an MST/CAST
   panel design, for auditability.** Shadow tests guarantee every path meets the full constraint set and
   are optimal at each θ (van der Linden & Reese 1998); MST/CAST trades some item-level efficiency for
   pre-publication QA and reproducibility (Luecht & Nungester 1998) — attractive under D-015 (fully
   automated + reproducible). **Config/tradeoff:** budget the ~5–11% length premium of content balancing
   (Kingsbury & Zara 1991) against the K-8 session-length ceiling (Category F). Serves R7, R11; ties Category I.

---

## Tensions / disagreements (DOK 3 seeds — no insight/stance written here)

- **Shortest vs most-valid stopping rule.** SPRT gives the shortest average test (Spray & Reckase 1996),
  but the confidence-interval/adaptive-mastery rule "resulted … in more valid mastery decisions and …
  more balanced error rates" (Kingsbury & Weiss 1983). For a one-shot gifted gate, does the child's
  minute saved outweigh a more balanced false-negative/false-positive profile at the cut?
- **Do textbook SPRT error guarantees survive adaptivity?** Bartroff et al. (2008) state SPRT error
  rates are "substantially inflated" when items are selected adaptively (non-i.i.d.). If true at a top-
  1–2% cut, the "efficient" SPRT may silently miss its nominal error rate exactly where the decision is
  most consequential — a tension between operational simplicity and calibrated tail error.
- **a-stratification vs maximum-information-at-the-cut.** a-stratification deliberately holds high-a
  items for later stages to spread exposure (Chang & Ying 1999), but a classification at an extreme cut
  most *wants* those high-a items concentrated at the cut. These two structural goals pull in opposite
  directions when the whole test targets one narrow θ region.
- **Every control mechanism taxes precision/length.** Content balancing costs +5–11% items (Kingsbury &
  Zara 1991) and exposure control shows a "clear and logical trade-off between item exposure control and
  measurement precision" with "no method [possessing] all of the desired characteristics" (Chang & Ansley
  2003; Revuelta & Ponsoda 1998). More auditability/security ⇒ longer test for young children (tension with
  Categories E/F load and session limits).
- **CAT vs MST/CAST for an *automated, reproducible* screener.** Item-level CAT maximizes efficiency;
  MST/CAST maximizes control, QA, and reproducibility at some efficiency cost (Luecht & Nungester 1998).
  D-015's automation/reproducibility requirement and item-level efficiency may favor different
  architectures — an unresolved structural choice.
- **Evidence-domain mismatch `[ADJACENT]`/`[gap]`.** Nearly all classification-CAT, content-balancing,
  and exposure results come from adult licensure/placement/mastery with cuts near mid-scale and large
  banks (Eggen & Straetmans 2000; van der Linden & Reese 1998 on LSAT; Luecht & Nungester 1998 on medical
  licensure). No located study places these mechanics at a **top-1–2% cut with a K-8 bank of text-only
  items** — the extrapolation to this screener is unvalidated.
