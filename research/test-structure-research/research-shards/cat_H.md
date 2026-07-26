# Category H — Fairness & Access in Structure

**Wave-1 research shard (DOK 1–2 only).** Citation-verified facts for the K–8 automated
adaptive screener (R11; D-015 automated/reproducible, D-016 adaptive, D-017 text-only /
reading-as-capability). DOK 3/4 are the author's and are **not** written here.

- **Requirements served (as research):** R11 (scalable/tunable screener — primary), R9
  (protect students/families), R7 (auditable/falsifiable), R5 (defensible capability
  standard); H1 (broader measures), H4 (broaden who can demonstrate ability), H10
  (minimize gaming/burden).
- **Decisions engaged (do not relitigate):** D-015, D-016, and **D-017** (text-only, no
  audio, non-readers screened out, no ELL/2e accommodations *inside* the screener). The
  DECISION_LOG already records D-017 as "in tension with" H4 and the charter's
  "capability, not privilege" / rights-before-research principles, with an
  **adverse-impact / DIF review and an accommodations decision left open**.
- **Evidence/assumptions:** E-071 (stakeholder claim that Timeback requires baseline
  literacy — *unverified*, and the sole basis for D-017's construct-relevance premise);
  RES-012 (no item parameter empirically calibrated) and RES-013 (born-synthetic) mean the
  DIF/exposure procedures below are currently un-runnable on real data — a standing [gap].
- **In scope:** the *structural* fairness of order/position, adaptivity, and
  exposure/security-coaching-retakes, plus the D-017 ⇄ Universal-Design-for-Assessment
  tension. **Out of scope / cross-referenced, not duplicated:** the measurement-side
  fairness tools owned by the companion `gifted-assessment-quality` brainlift (culture-fair/
  ELL gaps GA 8.4; DIF/measurement invariance GA 9.7; stereotype threat GA 13.6).

---

## DOK 1 — Facts

### H.1 — Item order / position effects and position-induced DIF

- Changing item order across forms (a routine **test-security** practice) can change item
  difficulty; item-position effects can be modeled in IRT, and **individual differences in
  position sensitivity, if subgroups receive different item sequences, can masquerade as
  DIF**. *(Debeer & Janssen, 2013, Journal of Educational Measurement, DOI
  10.1111/jedm.12009.)* [T1]
- Position effects are estimable as **item × position interactions** (change in item
  difficulty per position shift); demonstrated on a K-12 reading test (>90,000 students)
  and GRE pilot sections. The same paper notes that in **CAT the item set *and sequence*
  differ significantly across examinees**, so the "position is negligible" assumption is
  least safe precisely in adaptive delivery. *(Albano, 2013, Journal of Educational
  Measurement, DOI 10.1111/jedm.12026.)* [T1]
- Item-location change has **direct implications for IRT equating and adaptive testing** —
  i.e., position is a recognized threat specifically in CAT-style delivery, not only fixed
  forms. *(Kingston & Dorans, 1984, Applied Psychological Measurement, DOI
  10.1177/014662168400800202.)* [T1]
- The position effect is **person-varying and partly driven by change in test-taking
  effort**: difficulty rose across a 60-min assessment, and *change in effort* moderated
  the position effect (people differ in this moderation) — so late items are
  differentially harder for examinees whose effort declines. Position effects **did not
  vanish** even for persistently high-effort examinees (multiple causes: fatigue,
  listlessness, declining effort). This is a concrete channel by which **position can
  introduce subgroup-differential difficulty**. *(Weirich, Hecht, Penk, Roppelt & Böhme,
  2017, Applied Psychological Measurement, 41(2), 115–129, DOI
  10.1177/0146621616676791.)* [T1]
- In a **reading-comprehension** test, individual position sensitivity correlated with
  **decoding speed and reading enjoyment / persistence** — fluent decoders showed more
  persistence and smaller position-related decline. *(Nagy et al., 2018, Psychological Test
  and Assessment Modeling, 60(2).)* [T1] [ADJACENT] [UNVERIFIED: full author list beyond
  first author; no DOI]
- Empirically, **different test booklets (different item orders) produce variant DIF
  flagging patterns** for the same items (Mantel–Haenszel, Raju area, Wald), consistent
  with order changing item parameters differentially. *("Impact of retrofitting and item
  ordering on DIF," Journal of Measurement and Evaluation in Education and Psychology /
  EPOD, DOI 10.21031/epod.886920.)* [T1] [UNVERIFIED authors] [ADJACENT: retrofitted real
  data, not a gifted screener]
- **[gap]** No located study measures item-position DIF in a **K-8 gifted/high-ability
  screener** specifically; the evidence base is general large-scale and adult testing.

### H.2 — Fairness & measurement invariance under adaptivity (DIF in CAT)

- Because each examinee sees a different, tailored subset of items, **fairness in CAT is
  actively debated** and DIF/measurement-invariance checks must be **modified for the
  adaptive setting** (raw-score matching is unavailable). *(Zwick, Thayer & Wingersky,
  1994, Applied Psychological Measurement, DOI 10.1177/014662169401800203.)* [T1]
- **DIF is still detectable in CAT**: a modified Mantel–Haenszel / standardization using
  IRT-based (expected-true-score) matching recovered DIF that was **highly correlated with
  full-pool, nonadaptive DIF** (each simulee saw 25 of 75 items). Fairness of an adaptive
  form can therefore be audited. *(Zwick, Thayer & Wingersky, 1994, DOI
  10.1177/014662169401800203.)* [T1]
- Detection is **harder with sparse per-examinee data**; an **empirical-Bayes enhancement**
  of MH was developed specifically to stabilize CAT-DIF estimates. *(Zwick & Thayer, 2002,
  Applied Psychological Measurement, DOI 10.1177/0146621602026001004.)* [T1]
- A CAT-specific SIBTEST (**CATSIB**) with regression correction for impact exists, **but
  its performance is condition-dependent** — later work reports inflated false-positive
  rates under some conditions, and finds an odds-ratio method plus scale purification more
  robust when many items carry DIF. *(Nandakumar & Roussos, 2004, Journal of Educational
  and Behavioral Statistics, DOI 10.3102/10769986029002177; Shih et al., Journal of
  Applied Measurement / JAM, 2024.)* [T1] [ADJACENT: LSAT/simulation]
- A DIF item **encountered early in a CAT distorts the interim ability estimate and
  therefore the routing** of every subsequent item, so an unfair item can cascade rather
  than stay local; MH-style correction was **insufficient to fully mitigate** the effect
  under some simulated conditions. *(Recent CAT-DIF simulation, PMC11501093, 2024.)* [T1]
  [ADJACENT: simulation]
- **[gap]** Whether adaptivity **nets out** as more or less fair than a fixed form for a
  gifted cut is unresolved in the located evidence — it depends on pool DIF, routing, and
  where precision is concentrated (see Tensions).

### H.3 — Item exposure & test security ⇄ coaching ⇄ retakes (rotating banks as a fairness lever)

- In paper-and-pencil testing, item exposure is controlled **by policy** — regulating
  **reuse of forms and how often a candidate may retake**; continuous/on-demand computer
  delivery removes those natural limits, so exposure must be controlled algorithmically.
  *(Stocking & Lewis, 1995, ETS Research Report, DOI 10.1002/j.2333-8504.1995.tb01660.x;
  Sympson & Hetter, 1985, Proc. 27th Military Testing Association.)* [T1] [COI: ETS/Navy
  research reports] [Sympson-Hetter: no DOI]
- A CAT item-selection algorithm is **greedy** — left unconstrained it over-administers the
  most informative items, creating a **security/exposure risk**. Standard remedies:
  **Randomesque** (randomly pick among the top-k best items) *(Kingsbury & Zara, 1989,
  Applied Measurement in Education, DOI 10.1207/s15324818ame0204_6)*; **Sympson–Hetter**
  probabilistic control of P(administer) *(Sympson & Hetter, 1985)*; **conditional-on-
  ability multinomial control** *(Stocking & Lewis, 1998, Journal of Educational and
  Behavioral Statistics, DOI 10.3102/10769986023001057)*; and **item-ineligibility
  probabilities** on a shadow test that can push exposure below 0.025 **at the cost of
  ability-estimate accuracy** *(van der Linden & Veldkamp, 2007, Journal of Educational and
  Behavioral Statistics, 32(4), 398–418, DOI 10.3102/1076998606298044)*. [T1]
- Exposure control **trades measurement precision for security**, and the loss is largest
  at **extreme ability levels** — i.e., exactly the gifted tail where the cut sits. *(Chang
  & Twu, 1998, as reviewed in Georgiadou, Triantafillou & Economides, 2007, Journal of
  Technology, Learning, and Assessment, 5(8), ERIC EJ838610.)* [T1] [review]
- Test security is explicitly a **fairness** mechanism, not only an integrity one:
  "Maintaining test security also helps ensure that no one has an unfair advantage."
  *(AERA/APA/NCME, 2014, Standards — test-administration/security standards; quote
  verbatim.)* [T2]
- **Coaching** raises scores modestly on well-controlled admissions tests but more on
  ability/IQ-type tests: SAT ≈ **0.15 SD**, other aptitude/intelligence tests ≈ **0.43 SD**
  across 38 studies *(Kulik, Bangert-Drowns & Kulik, 1984, Psychological Bulletin, DOI
  10.1037/0033-2909.95.2.179)*; published comparison studies show SAT-V ≈ **0.09 SD**,
  SAT-M ≈ **0.16 SD** *(Becker, 1990, Review of Educational Research, DOI
  10.3102/00346543060003373)*; matched/randomized estimates are small (~10 SAT points)
  *(DerSimonian & Laird, 1983, Harvard Educational Review, DOI
  10.17763/haer.53.1.n06j5h5356217648)*. Coaching/prep access covaries with family
  resources → an equity concern (H10). [T1] [ADJACENT: adult/college admissions]
- **Retest / practice effects** are real and repeatable: overall adjusted **d ≈ 0.26**
  across 50 studies (N=134,436), and gains are **larger when identical forms are reused and
  when coaching is added** *(Hausknecht, Halpert, Di Paolo & Moriarty Gerrard, 2007, J.
  Applied Psychology, DOI 10.1037/0021-9010.92.2.373)*. A larger meta (174 samples,
  N=153,185) finds gains up to the **3rd administration then a plateau**, with **form
  equivalence** a significant moderator (alternate forms reduce the gain) *(Scharfen,
  Peters & Holling, 2018, Intelligence, DOI 10.1016/j.intell.2018.01.003)*. [T1] [ADJACENT]
- Therefore **rotating, never-reused forms drawn from a large bank act as a combined
  security *and* anti-coaching/anti-retest-advantage (fairness) lever**: they blunt
  memorization/pre-knowledge and shrink the retake/coaching edge that otherwise accrues to
  repeat-testers and the coached. *(Synthesis of Sympson & Hetter, 1985; Kingsbury & Zara,
  1989; Hausknecht et al., 2007; Scharfen et al., 2018.)* [T1] [reasoned inference from
  cited effects]
- Retesting can also **threaten measurement invariance** — retest scores may not measure
  the same construct, so a changed score is not automatically a truer score. *(Lievens,
  Reeve & Heggestad, 2007, J. Applied Psychology, DOI 10.1037/0021-9010.92.6.1672.)* [T1]
  [ADJACENT: selection]

### H.4 — Universal Design for Assessment, accommodations, and the D-017 reading-load tension

- **Universal Design for Assessment (UDA)** proposes that large-scale tests be designed
  from the start for the widest population — **including students with disabilities and
  limited-English-proficient students** — via seven elements: (1) inclusive assessment
  population, (2) **precisely defined constructs**, (3) accessible, non-biased items, (4)
  **amenable to accommodations**, (5) simple/clear/intuitive instructions & procedures, (6)
  **maximum readability & comprehensibility**, (7) maximum legibility. *(Thompson,
  Johnstone & Thurlow, 2002, NCEO Synthesis Report 44.)* [T2] [technical report, not
  peer-reviewed]
- The 2014 **Standards make fairness/accessibility fundamental to validity** and set an
  **overarching Standard 3.0**: "All steps in the testing process … should be designed …
  to minimize construct-irrelevant variance and to promote valid score interpretations …
  for **all examinees** in the intended population," the central idea being to "identify
  and remove **construct-irrelevant barriers** to maximal performance." *(AERA/APA/NCME,
  2014, Standards, ch. 3, Standard 3.0, p. 63.)* [T2]
- The Standards **endorse universal design** and, as a fairness example, explicitly list
  **"minimizing the linguistic load"** of items whose reading demand is not part of the
  target construct. *(AERA/APA/NCME, 2014, ch. 3.)* [T2]
- **Construct-relevant vs construct-irrelevant reading load is the hinge.** The Standards
  state: if a test is **not** intended to measure reading, then for weak readers / LEP test
  takers the **scores do not represent the same construct** as for fluent readers (reading
  load is then construct-*irrelevant* contamination). **But** where the impeding skill **is
  part of the construct** — the Standards' own example is **"dyslexia in the context of
  tests of reading"** — providing access "may require some adaptation of the construct as
  well," and comparable measurement across adapted/unadapted versions may be impossible.
  *(AERA/APA/NCME, 2014, ch. 3, pp. ~51–52, 59.)* [T2]
- Consistent with that, a read-aloud/screen-reader on a test **"that includes decoding as
  part of the construct" is classified as a *modification* (it changes the construct
  measured), and its scores are not assumed comparable** to standard-condition scores —
  distinct from an *accommodation*, which removes a construct-irrelevant barrier without
  changing the construct. *(AERA/APA/NCME, 2014, ch. 12, p. ~190.)* [T2]
- The **interaction hypothesis** (an accommodation should help those who need it more than
  those who don't; if everyone benefits, scores may be invalidly inflated) is **not cleanly
  supported**: extended time tends to improve performance for **all** students (SWD
  relatively more), and oral/read-aloud on **math** helps some SWD. *(Sireci, Scarpati &
  Li, 2005, Review of Educational Research, DOI 10.3102/00346543075004457.)* [T1]
- In a read-aloud meta-analysis (114 effect sizes, 23 studies), **both** SWD and non-SWD
  benefited, SWD **significantly more**, and — critically — the read-aloud effect was
  **significantly larger when the tested subject was *reading* than math** (and larger with
  a human reader than a computer). A read-aloud helps most exactly where it **removes the
  reading construct itself**, i.e., where reading is construct-relevant. *(Li, 2014,
  Educational Measurement: Issues and Practice, DOI 10.1111/emip.12027.)* [T1]
- **[gap]** No located evidence establishes, for a **gifted screener**, whether a text-only
  reading gate's foreseeable disparate impact on ELL / 2e / young / lower-SES readers is
  **offset** by genuine construct-relevance of reading — this is precisely the
  adverse-impact/DIF question D-017 defers (and E-071's literacy premise is unverified).

---

## DOK 2 — Summary

Item order is a security lever with a fairness cost: changing position changes difficulty,
and because the position penalty is person-varying and effort/persistence-driven (and, for
reading, tied to decoding fluency), item position can inject subgroup-differential
difficulty that can be mistaken for — or add to — DIF, a risk that is *greatest* in
adaptive delivery where sequence differs per examinee (H.1). Adaptivity does not remove
fairness accountability: DIF is detectable in CAT with IRT-matched, empirical-Bayes-
stabilized methods, but detection is harder on sparse per-examinee data and an early
DIF item can cascade through routing, so "different examinees see different items" cuts
both ways (H.2). Because on-demand computer delivery strips away paper-era exposure limits,
exposure control plus a large, rotating, never-reused bank is simultaneously a security
control and an anti-coaching/anti-retest-advantage fairness lever — coaching (~0.15 SD SAT,
~0.43 SD on ability tests) and practice effects (d≈0.26, larger with identical forms) both
favor the resourced and the repeat-tester, and both shrink under alternate forms (H.3).
The central structural tension is D-017 vs Universal Design for Assessment: the 2014
Standards demand minimizing construct-irrelevant variance and endorse UDA and "minimizing
linguistic load," yet the *same* Standards say that when the impeding skill is part of the
construct (their example: dyslexia on a reading test), removing it is a construct-changing
*modification* yielding non-comparable scores — so whether the reading gate is legitimate
turns entirely on the unverified premise that reading literacy is construct-relevant here,
and the read-aloud evidence (largest effect precisely on reading tests) is consistent with
*both* readings (H.4).

---

## Source register entries

| Source (as written) | DOI/URL | Tier | Flags | One-line fact |
|---|---|---|---|---|
| Debeer, D., & Janssen, R. (2013). Modeling item-position effects within an IRT framework. *Journal of Educational Measurement*, 50(2), 164–185. | 10.1111/jedm.12009 | T1 | — | Order changes for security alter difficulty; position sensitivity can masquerade as DIF across subgroups. |
| Albano, A. D. (2013). Multilevel modeling of item position effects. *Journal of Educational Measurement*, 50(4). | 10.1111/jedm.12026 | T1 | — | Position modeled as item×position interaction; in CAT the item set *and* sequence differ per examinee. |
| Kingston, N. M., & Dorans, N. J. (1984). Item location effects and their implications for IRT equating and adaptive testing. *Applied Psychological Measurement*, 8(2), 147–154. | 10.1177/014662168400800202 | T1 | — | Item-location effects are a recognized threat specifically for equating and adaptive testing. |
| Weirich, S., Hecht, M., Penk, C., Roppelt, A., & Böhme, K. (2017). Item position effects are moderated by changes in test-taking effort. *Applied Psychological Measurement*, 41(2), 115–129. | 10.1177/0146621616676791 | T1 | — | Position penalty is person-varying and moderated by change in effort → subgroup-differential late-item difficulty. |
| Nagy et al. (2018). Item position effects in a reading comprehension test. *Psychological Test and Assessment Modeling*, 60(2). | https://www.psychologie-aktuell.com/fileadmin/download/ptam/2-2018_20180627/03_PTAM-2-2018_Nagy_v2.pdf | T1 | [ADJACENT][UNVERIFIED authors][no DOI] | Position sensitivity correlates with decoding speed / reading persistence. |
| "Impact of retrofitting and item ordering on DIF." *J. Measurement and Evaluation in Education and Psychology (EPOD)*. | 10.21031/epod.886920 | T1 | [UNVERIFIED authors][ADJACENT] | Different booklets (orders) produce variant DIF flagging patterns for the same items. |
| Zwick, R., Thayer, D. T., & Wingersky, M. (1994). A simulation study of methods for assessing DIF in CATs. *Applied Psychological Measurement*, 18(2), 121–140. | 10.1177/014662169401800203 | T1 | — | Modified MH with IRT matching recovers CAT DIF ≈ full-pool DIF; fairness of adaptive forms is auditable. |
| Zwick, R., & Thayer, D. T. (2002). Empirical Bayes enhancement of MH DIF for a CAT. *Applied Psychological Measurement*, 26(1), 57–76. | 10.1177/0146621602026001004 | T1 | — | Empirical-Bayes MH stabilizes DIF estimates under sparse CAT data. |
| Nandakumar, R., & Roussos, L. (2004). Evaluation of the CATSIB DIF procedure in a pretest setting. *J. Educational and Behavioral Statistics*, 29(2), 177–199. | 10.3102/10769986029002177 | T1 | [ADJACENT] | CATSIB provides impact-corrected CAT DIF detection (condition-dependent). |
| Shih, C.-L. et al. (2024). Assessing DIF in CAT. *Journal of Applied Measurement*. | https://jamntnu.net/PDF/JAM%20V25-PT1_pp12-25-SHIH%20ET%20AL.pdf | T1 | [ADJACENT] | Odds-ratio + purification outperforms CATSIB (which can inflate false positives) when many DIF items exist. |
| Effect of DIF on CAT under different conditions (2024). | https://pmc.ncbi.nlm.nih.gov/articles/PMC11501093/ | T1 | [ADJACENT][simulation] | Early DIF items distort θ̂ and cascade through routing; MH correction insufficient in some conditions. |
| Sympson, J. B., & Hetter, R. D. (1985). Controlling item-exposure rates in CAT. *Proc. 27th Military Testing Association*, 973–977. | (no DOI) | T1 | [COI Navy][no DOI] | Probabilistic exposure control: bound P(administer) = P(A\|S)·P(S) ≤ r. |
| Kingsbury, G. G., & Zara, A. R. (1989). Procedures for selecting items for CATs. *Applied Measurement in Education*, 2(4), 359–375. | 10.1207/s15324818ame0204_6 | T1 | — | Randomesque exposure control + content balancing (largest target-actual deviation). |
| Stocking, M. L., & Lewis, C. (1998). Controlling item exposure conditional on ability in CAT. *J. Educational and Behavioral Statistics*, 23(1), 57–75. | 10.3102/10769986023001057 | T1 | — | Conditional-on-ability multinomial exposure control. |
| Stocking, M. L., & Lewis, C. (1995). A new method of controlling item exposure in CAT. *ETS Research Report*. | 10.1002/j.2333-8504.1995.tb01660.x | T1 | [COI ETS] | P&P controls exposure via form-reuse + retake-frequency policy; CAT must do it algorithmically. |
| van der Linden, W. J., & Veldkamp, B. P. (2007). Conditional item-exposure control using item-ineligibility probabilities. *J. Educational and Behavioral Statistics*, 32(4), 398–418. | 10.3102/1076998606298044 | T1 | — | Shadow-test exposure control can drive rates <0.025, at a cost to ability-estimate accuracy. |
| Georgiadou, E., Triantafillou, E., & Economides, A. A. (2007). Review of item exposure control strategies 1983–2005. *J. Technology, Learning, and Assessment*, 5(8). | ERIC EJ838610 | T1 | [review] | Exposure control sacrifices precision, most at extreme ability levels (gifted tail). |
| Kulik, J. A., Bangert-Drowns, R. L., & Kulik, C.-L. C. (1984). Effectiveness of coaching for aptitude tests. *Psychological Bulletin*, 95(2), 179–188. | 10.1037/0033-2909.95.2.179 | T1 | [ADJACENT] | Coaching: SAT ≈ 0.15 SD; other aptitude/IQ tests ≈ 0.43 SD (38 studies). |
| Becker, B. J. (1990). Coaching for the SAT: further synthesis and appraisal. *Review of Educational Research*, 60(3), 373–417. | 10.3102/00346543060003373 | T1 | [ADJACENT] | Published comparison studies: SAT-V ≈ 0.09 SD, SAT-M ≈ 0.16 SD. |
| DerSimonian, R., & Laird, N. (1983). Evaluating the effect of coaching on SAT scores. *Harvard Educational Review*, 53(1), 1–15. | 10.17763/haer.53.1.n06j5h5356217648 | T1 | [ADJACENT] | Matched/randomized coaching effect ~10 SAT points (small). |
| Hausknecht, J. P., Halpert, J. A., Di Paolo, N. T., & Moriarty Gerrard, M. O. (2007). Retesting in selection: a meta-analysis. *J. Applied Psychology*, 92(2), 373–385. | 10.1037/0021-9010.92.2.373 | T1 | [ADJACENT] | Practice/retest d≈0.26 (N=134,436); larger with identical forms and coaching. |
| Scharfen, J., Peters, J. M., & Holling, H. (2018). Retest effects in cognitive ability tests: a meta-analysis. *Intelligence*, 67, 44–66. | 10.1016/j.intell.2018.01.003 | T1 | [ADJACENT] | Gains plateau after ~3rd administration; form equivalence (alternate forms) reduces gains (N=153,185). |
| Lievens, F., Reeve, C. L., & Heggestad, E. D. (2007). Psychometric bias due to retesting on cognitive ability tests. *J. Applied Psychology*, 92(6), 1672–1682. | 10.1037/0021-9010.92.6.1672 | T1 | [ADJACENT] | Retesting can break measurement invariance → a changed score isn't necessarily a truer score. |
| Thompson, S. J., Johnstone, C. J., & Thurlow, M. L. (2002). Universal design applied to large-scale assessments (Synthesis Report 44). NCEO. | https://nceo.umn.edu/docs/onlinepubs/synth44.pdf | T2 | [technical report] | Seven UDA elements incl. precisely-defined constructs, max readability, amenable to accommodations, inclusive of SWD/LEP. |
| AERA, APA, & NCME (2014). *Standards for Educational and Psychological Testing*, ch. 3 (Fairness) & ch. 12. | https://www.testingstandards.net (2014 edition) | T2 | — | Std 3.0 minimize construct-irrelevant variance for all; removing a construct-relevant skill (e.g., decoding on a reading test) is a construct-changing *modification*. |
| Sireci, S. G., Scarpati, S. E., & Li, S. (2005). Test accommodations and the interaction hypothesis. *Review of Educational Research*, 75(4), 457–490. | 10.3102/00346543075004457 | T1 | — | Interaction hypothesis not clean: extended time helps all; oral math accommodation helps some SWD. |
| Li, H. (2014). Effects of read-aloud accommodations for students with and without disabilities: a meta-analysis. *Educational Measurement: Issues and Practice*, 33(3), 3–16. | 10.1111/emip.12027 | T1 | — | Read-aloud helps all (SWD more) and is largest on *reading* tests — i.e., it removes the reading construct. |

---

## Cross-references (to `gifted-assessment-quality`; cite, do not duplicate)

- **GA 8.4** — "Culture-fair"/nonverbal formats do **not** erase opportunity gaps
  (ELL scored 0.5–0.67 SD lower; Lohman, Korb & Lakin, 2008). Used here as the empirical
  basis for the D-017 reading gate's **foreseeable disparate-impact channel** (reading
  ability correlates with ELL/SES) and as evidence that changing *format* alone does not
  close subgroup gaps. This shard adds the **structural** fairness layer (order/CAT/exposure)
  on top; it does not re-derive the ELL-gap magnitude.
- **GA 9.7** — Fairness is **measurable** via DIF / measurement invariance (Meredith, 1993;
  Holland & Wainer, 1993; ETS MH A/B/C bands; logistic-regression DIF). H.2 **extends** this
  to the CAT-specific case (IRT-matched, empirical-Bayes MH; CATSIB) and to **position-induced
  DIF** (H.1); the effect-size bands and the "DIF read at the cut" monitor live in GA 9.7.
- **GA 13.6** — Stereotype threat is a **possible, not settled** performance factor (Steele &
  Aronson, 1995; Shewach, Sackett & Quint, 2019; Flore & Wicherts, 2015). Relevant because
  test *structure/framing* is one hypothesized threat channel; treat as a **candidate**, not
  an assumed, mechanism (do not double-count against the fairness case).

---

## Product linkage (R11 screener)

1. **Bake exposure control + a large, rotating, never-reused bank into the D-015/D-016
   engine as a joint security *and* fairness lever.** A greedy CAT over-uses top items
   (Sympson & Hetter, 1985; Kingsbury & Zara, 1989; Stocking & Lewis, 1998), and coaching
   (Kulik et al., 1984) plus practice effects (Hausknecht et al., 2007; Scharfen et al.,
   2018) both advantage the resourced/repeat-tester and both shrink under alternate forms —
   so rotation directly serves **H10** (minimize gaming/coaching) and **R9**. Budget the
   known **precision-at-the-tail cost** of exposure control (Georgiadou et al., 2007), since
   the gifted cut sits at the extreme (cross-ref GA 9.7/tail precision).
2. **Run CAT-adapted DIF / measurement-invariance monitoring as a standing control,
   reported at the cut.** Use IRT-matched, empirical-Bayes MH (Zwick et al., 1994; Zwick &
   Thayer, 2002) because adaptivity makes DIF both harder to see (sparse data) and more
   damaging (a bad early item cascades through routing; PMC11501093, 2024). Serves **R7/R9**
   and operationalizes GA 9.7 for the adaptive design; **blocked today by RES-012** (no
   calibrated item parameters).
3. **Lock and monitor ordering / warm-up rules; treat position as a fairness variable, not
   just a difficulty variable.** Because the position penalty is effort/persistence-driven
   and, for reading, tied to decoding fluency (Weirich et al., 2017; Nagy et al., 2018),
   uncontrolled ordering can add construct-irrelevant, **subgroup-correlated** difficulty
   that compounds the D-017 reading load — so deterministic, audited ordering (R7) is also a
   fairness control (R9).
4. **Govern D-017 as a fairness-critical construct-definition decision, and close its own
   deferred review.** If reading is declared construct-relevant, *document the construct
   precisely* (UDA element 2; Standard 3.0) and treat any read-aloud as a construct-changing
   modification (2014 Standards ch. 12; Li, 2014); **and** — because the identical choice
   imposes construct-*irrelevant* linguistic load on any non-reading reasoning the screener
   also claims to measure, with foreseeable disparate impact (GA 8.4) — actually **run the
   adverse-impact / DIF review and log who is screened out**, which the DECISION_LOG D-017
   entry itself lists as open. (Structural implication only; the *decision* is the author's.)

---

## Tensions / disagreements (DOK 3 seeds — not resolved here)

- **The D-017 reading gate vs Universal Design / accessibility — grounded in the *same*
  authority.** UDA and Standard 3.0 push to *minimize construct-irrelevant variance*,
  "minimize linguistic load," design for the widest range, and keep tests amenable to
  accommodations (Thompson et al., 2002; AERA/APA/NCME, 2014, ch. 3). The *same* Standards
  say that when the impeding skill **is** the construct (their example: dyslexia on a reading
  test), removing it is a construct-changing *modification* producing non-comparable scores
  (ch. 3 & ch. 12). So both a hard reading gate **and** its opposite can cite the Standards —
  the disagreement collapses onto one unresolved empirical premise: **is reading literacy
  construct-relevant to the capability this screener claims to measure?** (E-071 asserts yes;
  it is unverified.) Presented; **not adjudicated** — that is the author's DOK 3/4.
- **The read-aloud evidence is genuinely double-edged.** Li (2014) finds the read-aloud
  effect *largest on reading tests* — the pro-gate reading treats this as proof the
  accommodation would remove the very construct (so text-only is justified); the anti-gate
  reading treats the same fact plus the ELL gaps (GA 8.4) as proof the gate mostly filters
  reading/decoding, not general ability, misclassifying capable non-readers/ELL/2e students.
- **Does adaptivity help or hurt fairness?** *Helps:* near-uniform precision across the
  ability range and at the tail, plus content balancing (Kingsbury & Zara, 1989; cross-ref
  GA 10.1). *Hurts/complicates:* comparability is not automatic when examinees see different
  items, DIF is harder to detect (Zwick & Thayer, 2002), a DIF item can cascade through
  routing (PMC11501093, 2024), and exposure control costs precision most at the extremes
  (Georgiadou et al., 2007). Net effect for a gifted cut is unresolved.
- **The interaction hypothesis doesn't cleanly hold.** Extended time helps *everyone*
  (Sireci et al., 2005) and read-aloud helps non-disabled students too (Li, 2014), so "an
  accommodation only removes a construct-irrelevant barrier for those who need it" is not a
  safe general claim — which undercuts *both* a naive "just accommodate everyone" position
  and a naive "any accommodation is unfair to non-recipients" position.
- **Position-effect magnitude is contested / program-specific.** Some programs assume it is
  negligible; others find substantial, person-varying effects (Debeer & Janssen, 2013;
  Albano, 2013; Weirich et al., 2017). Whether it is material for *this* screener is a [gap]
  until measured on real forms (RES-012/RES-013).
- **Retakes: fairer access vs decision integrity.** More occasions can reduce one-shot error
  and widen access (cross-ref Cat C / GA 8.2), but practice effects (Hausknecht et al., 2007;
  Scharfen et al., 2018) and retest non-invariance (Lievens et al., 2007) mean an improved
  retake score may not be a *truer* score — so a retake policy for a high-stakes gifted cut
  trades access against comparability.
