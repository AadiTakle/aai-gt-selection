# Category I — Auditability & Reproducibility of Structure (research shard)

**Fleet role:** Wave-1 breadth shard for the Test-Structure BrainLift (K–8 automated adaptive
screener; R11). Scope is how an **adaptive, per-child-different** test can remain **deterministic,
reproducible, and auditable** — the structural bite of **D-015** (fully automated + reproducible
classification) and **R7** (an independent reviewer can reconstruct how a student was classified).
This shard does **not** re-derive precision (owned by `gifted-assessment-quality`, cite as **GA 10.x**)
and does **not** re-specify the exposure-control / routing *mechanics* (owned by sibling **Category A**,
A.4–A.5); it takes those as given and adds the **reproducibility/audit** layer on top. Much of the
content is standards-based/conceptual; empirical gaps are flagged `[gap]`.

**Flag legend:** `T1` peer-reviewed empirical/meta · `T2` Standards/canonical text · `T3` proponent/
vendor-affiliated · `T4` practitioner/gray. `[COI]` conflict of interest · `[UNVERIFIED]` citation not
directly resolved · `[ADJACENT]` evidence from an adjacent domain (adult licensure/placement, open
science, not gifted-tail children) · `[gap]` no located evidence for the screener's exact condition ·
`[INFERENCE]` reasoned extrapolation, not a literal source claim. DOK-1 facts are literal extractions
("two engineers extract identically"); interpretation lives only in DOK-2 / Product-linkage / Tensions.

---

## DOK 1 — Facts

### I.1 — The adaptive rule set is deterministic and fully specifiable

- The 2014 *Standards* require that developers "document the rationale and supporting evidence for the
  administration, scoring, and reporting rules used in computer adaptive, multistage-adaptive, or other
  tests delivered using computer algorithms to select items," and that this documentation "include
  procedures used in **selecting items** … in determining the **starting point and termination
  conditions** … in **scoring the test**, and in **controlling item exposure**." *(AERA, APA & NCME,
  2014, *Standards for Educational and Psychological Testing*, **Standard 4.3, p. 86**.)* `T2` — i.e.,
  the full routing rule set is treated as documentable, fixed content.
- The specification of a CAT "refer[s] both to the **item pool** and to the **rules or procedures by
  which an individualized set of items is selected** for each test taker." *(AERA et al., 2014, ch. 4,
  Test Design and Development, p. 80.)* `T2`
- When an IRT model is used, the test specifications "should indicate the form of the model, how model
  parameters are to be estimated, and how model fit is to be evaluated." *(AERA et al., 2014, ch. 4,
  p. 79.)* `T2` — the scoring/estimator is itself a specifiable, lockable object.
- Adaptive item selection decomposes into a small set of separable, individually specifiable components
  — a content-balancing rule, an item-selection (information) criterion, and an item-exposure control —
  each with named, published algorithms. *(Kingsbury & Zara, 1989, *Applied Measurement in Education*
  2(4):359–375, DOI 10.1207/s15324818ame0204_6; van der Linden & Glas (Eds.), 2010, *Elements of
  Adaptive Testing*, Springer, DOI 10.1007/978-0-387-85461-8.)* `T1`/`T2` — mechanics owned by
  **Category A (A.2–A.5)**; the point here is only that the rule set is *enumerable and fixable*.
- `[INFERENCE]` Given a fixed calibrated bank, a fixed rule set, and a fixed response string, the
  sequence of items and the final θ/classification are a **deterministic function** of those inputs (a
  pure function of bank + rules + responses + any random seed); no source states this for a gifted
  screener specifically `[gap]`.

### I.2 — Where randomness enters routing (and how seeding preserves reproducibility)

- The "**randomesque**" strategy selects the next item **at random from among the several most-
  informative candidate items**, deliberately introducing a stochastic step into selection to spread
  item exposure. *(Kingsbury & Zara, 1989, DOI 10.1207/s15324818ame0204_6.)* `T1`
- Conditional exposure control admits a selected item **probabilistically** (a random draw against an
  exposure-control parameter) so that, e.g., a high-information item is not administered to ~100% of
  examinees at one ability level even when its overall rate looks safe. *(Stocking & Lewis, 1998,
  *Journal of Educational and Behavioral Statistics* 23(1):57–75, DOI 10.3102/10769986023001057.)* `T1`
  — exposure-control *mechanics* are owned by **Category A (A.5)**; extracted here only as the source of
  routing stochasticity.
- `[INFERENCE]` Because randomesque and probabilistic exposure control make item selection **stochastic**,
  an operational session is reproducible **only if the pseudo-random draws are driven by a recorded seed**
  (a standard pseudo-random-number-generator property); replaying the same seed + bank + rules + responses
  then reproduces the identical item sequence. No located psychometric study validates seeded-PRNG replay
  for an operational gifted screener `[gap]`.

### I.3 — Logging, protocol retention & replay of adaptive sessions

- **R7 (project requirement):** an independent reviewer "must be able to **reconstruct how students were
  selected**"; evidence includes that "selection rules and analysis choices are **locked before results
  are observed**" and that "**decisions and changes are logged**." *(docs/product/project-requirements.md,
  R7.)* `[internal governance]`
- The 2014 *Standards* require that, "when individual test data are retained, both the **test protocol**
  and any written report should also be preserved in some form," because "**the protocol may be needed to
  respond to a possible challenge from a test taker** or to facilitate interpretation at a subsequent
  time." *(AERA et al., 2014, **Standard 6.15**.)* `T2`
- Test scorers "should establish scoring protocols," and where complex responses are scored by computer,
  "the **accuracy of the algorithm and processes should be documented**." *(AERA et al., 2014, **Standard
  6.8**.)* `T2` — the CAT-specific documentation anchor is Std 5.16 (I.4); 6.8 adds the general
  scoring-protocol duty.
- Organizations retaining identifiable test data "should maintain appropriate data security, which should
  include administrative, technical, and physical protections," under a documented retention policy.
  *(AERA et al., 2014, **Standard 6.14**.)* `T2` — audit-trail retention is bounded by privacy duties (ties R9).
- `[INFERENCE]` Standards 6.15/6.8 + R7 together imply the auditable unit is a **complete session log**
  (item IDs, presentation order, responses, interim θ/SE, each selection and stop decision, the seed, and
  the engine + item-parameter-snapshot versions) sufficient to **re-execute the session and reproduce the
  classification**. Empirical validation of such deterministic replay for a K-8 gifted CAT is `[gap]`.

### I.4 — Comparability under adaptivity (standardization ⇄ adaptivity)

- Classical standardization equalizes conditions so examinees have "comparable contexts": "uniform
  directions, specified time limits, specified room arrangements," etc. *(AERA et al., 2014, ch. 3,
  Fairness, p. 50.)* `T2` — the baseline that item-level adaptivity deliberately breaks (different items/
  orders per child).
- The *Standards* defend adaptive comparability on a **common scale**, not identical items: "With some
  adaptive tests … two examinees rarely if ever receive the same set of items … [and] may be given sets
  of items that differ markedly in difficulty. **Nevertheless, adaptive test scores can be reported on a
  common scale and function much like scores from a single alternate form** of a test that is not
  adaptive." *(AERA et al., 2014, ch. 5, p. 98.)* `T2`
- Comparability must be **documented, not assumed**: "When test scores are based on model-based
  psychometric procedures, such as those used in computerized adaptive or multistage testing,
  documentation should be provided to indicate that the scores have **comparable meaning over alternate
  sets of test items**," including "clear descriptions of **model-based algorithms, software used, quality
  control procedures** followed, and technical analyses conducted." *(AERA et al., 2014, **Standard
  5.16**.)* `T2`
- For links that cannot be equated (which includes CATs), "**direct evidence of score comparability
  should be provided**, and the examinee population for which score comparability applies should be
  specified clearly." *(AERA et al., 2014, **Standard 5.17**.)* `T2`
- Score comparability of CAT forms is an active, formalizable measurement problem: "CATs can have
  thousands of forms with **each examinee typically seeing a unique form** … items are selected from a
  calibrated item pool," and comparability is evaluated against (weakened forms of) **Lord's (1980)
  equity property** — first-order equity (equal conditional means; Divgi, 1981) and second-order equity
  (equal conditional standard errors of measurement; Morris, 1982). *(Wyse, 2023, *Applied Psychological
  Measurement* 47(7-8):513–525, DOI 10.1177/01466216231209749.)* `T1` `[COI: author affiliated with
  Renaissance, a commercial adaptive-testing vendor]`

### I.5 — Locking / pre-registration of rules & item parameters before operational use

- Deviations from standardized procedures can "**compromise the comparability of scores** or use of
  norms, and/or unfairly advantage some individuals," so the operating procedure itself is what must be
  held fixed. *(AERA et al., 2014, ch. 3, p. 53.)* `T2`
- Item quality is fixed pre-operationally through "item review procedures and item tryouts, often
  referred to as pretesting," before items enter the operational pool. *(AERA et al., 2014, ch. 4,
  p. 81.)* `T2` — i.e., item parameters are established (calibrated) *before* operational scoring, not
  during.
- `[ADJACENT]` **Pre-registration** — "define the research questions and analysis plan **before observing
  the research outcomes**" — is the general method for distinguishing prediction (confirmatory) from
  postdiction (exploratory) and is offered as the remedy for outcome-dependent analytic flexibility.
  *(Nosek, Ebersole, DeHaven & Mellor, 2018, *PNAS* 115(11):2600–2606, DOI 10.1073/pnas.1708274114.)*
  `T1` `[ADJACENT: open-science methodology, not testing-specific]` — supports R7's "rules locked before
  results," applied here to the routing/stopping/scoring rules and the item-parameter snapshot.

### I.6 — Item-parameter drift vs a frozen scale (reproducibility ⇄ validity)

- A previously exposed / disclosed item "**is bound to show drift in the item parameter values**," and a
  **statistical quality-control** method can detect such "known items" by re-estimating item parameters
  from adaptive-test data and testing for parameter drift (worked out for the 1-PL and 3-PL models).
  *(Veerkamp & Glas, 2000, *Journal of Educational and Behavioral Statistics* 25(4):373–389, DOI
  10.3102/10769986025004373.)* `T1` — links drift monitoring ↔ security ↔ ongoing audit of a "frozen" bank.
- Under simulated 2-PL conditions across two occasions, "item parameter drift … **had a small effect on
  ability estimates**": even with a- and b-parameters increased for **20% of items**, θ estimates were
  expected to deviate "**by no more than 0.14 logits**, for any true θ value." *(Wells, Subkoviak &
  Serlin, 2002, *Applied Psychological Measurement* 26(1):77–87, DOI 10.1177/0146621602261005.)* `T1`
  — reassuring for freezing parameters, but the study is simulated and not at a top-percentile cut `[gap]`.
- Adaptivity adds an **order-dependent** threat to parameter stability: adaptive tryout data "should be
  examined for possible **context effects** to assess how much **item parameters might shift when items
  are administered in different orders**." *(AERA et al., 2014, ch. 4, p. 80.)* `T2` — because a CAT gives
  each child a different order, the same item's parameters are not guaranteed invariant across sessions
  (position/context effects owned by sibling **Category B**), which is a reproducibility concern for a
  frozen scale.
- `[INFERENCE]` Reproducibility (identical re-scoring) is maximized by a **permanently frozen** item-
  parameter file, whereas validity/security argue for **periodic recalibration** because parameters drift
  and items leak (Veerkamp & Glas, 2000); the two goals are reconcilable only via **versioned, hashed
  parameter snapshots** (freeze per version; recalibrate to a *new* documented version). No source
  prescribes a recalibration cadence for a gifted screener `[gap]`.

### I.7 — Test security & audit trails (Standards Ch. 6)

- Test integrity is a standards obligation: developers/users should make "reasonable efforts … to ensure
  the integrity of test scores by **eliminating opportunities for test takers to attain scores by
  fraudulent or deceptive means**." *(AERA et al., 2014, **Standard 6.6**.)* `T2`
- "Test users have the responsibility of **protecting the security of test materials at all times**,"
  where security concerns include "inappropriate disclosure of test content, tampering with test
  responses or results," balanced against test-taker rights. *(AERA et al., 2014, **Standard 6.7**.)* `T2`
- The 2014 revision explicitly names "the **tension between the use of proprietary algorithms and test
  users' need to evaluate** complex applications" (e.g., automated scoring, computer-based testing) as a
  motivating technology issue. *(AERA et al., 2014, Introduction / summary of revisions; corroborated by
  NCME, "Testing Standards," ncme.org.)* `T2` — auditability vs proprietary/complex algorithms is a
  named standards tension (see Tensions).
- Continuous/computerized administration raises security issues "as opposed to the more periodic testing
  environment typically used for … paper-and-pencil tests," which is the operational reason exposure
  control exists. *(Stocking & Lewis, 1998, DOI 10.3102/10769986023001057.)* `T1` — mechanics in **Category A (A.5)**.

---

## DOK 2 — Summary

An adaptive test is reproducible because its routing is a **deterministic function of a fully specifiable
rule set** — start rule, item-selection criterion, content constraints, exposure control, θ-estimator,
and stopping rule — over a fixed IRT-calibrated bank, and the 2014 *Standards* require every one of these
to be documented (I.1; Std 4.3; van der Linden & Glas 2010). The only non-deterministic element is the
pseudo-randomness that randomesque and probabilistic exposure control deliberately inject, which becomes
bit-for-bit reproducible once every draw is driven by a **recorded seed** (I.2; Kingsbury & Zara 1989;
Stocking & Lewis 1998 — the seed step is `[INFERENCE]`). Auditability then reduces to **logging the full
session protocol and re-executing it**, which the *Standards* independently anticipate by requiring the
"test protocol" be preserved to "respond to a possible challenge" and the scoring algorithm's accuracy be
documented (I.3; Std 6.15/6.8; R7). The hard conceptual problem is **comparability**: every child sees a
different item set and order, yet the *Standards* defend adaptive scores as comparable because they sit on
a **common IRT scale**, provided documented evidence (algorithms, software, QC) and an equity-property
analysis support it (I.4; Std 5.16 & ch. 5 p. 98; Wyse 2023). Reproducibility and validity pull apart over
time — a **frozen** parameter file makes re-scoring deterministic, but real parameters drift and disclosed
items are detectable via statistical quality control, so a frozen scale must be paired with an out-of-band
**drift/security monitor** and versioned recalibration (I.6/I.7; Veerkamp & Glas 2000; Wells et al. 2002).
Most of this is standards-based/conceptual: no located study validates seeded-replay auditability, a
recalibration cadence, or lay acceptance of adaptive comparability **for a K-8 gifted screener
specifically** `[gap]`.

---

## Source register entries

| Source (as written) | DOI/URL | Tier | Flags | One-line fact |
|---|---|---|---|---|
| AERA, APA & NCME (2014). *Standards for Educational and Psychological Testing*. Washington, DC: AERA. | testingstandards.net | T2 | — | Std 4.3 (p.86): document CAT/MST selection, start/termination, scoring, and exposure rules. |
| AERA, APA & NCME (2014), ch. 4, pp. 79–80. | testingstandards.net | T2 | — | CAT spec = item pool + selection rules; IRT model form/estimation/fit documented; tryouts checked for order/context parameter shift. |
| AERA, APA & NCME (2014), ch. 5, p. 98. | testingstandards.net | T2 | — | Adaptive scores from different item sets "can be reported on a common scale" like an alternate form. |
| AERA, APA & NCME (2014), **Standard 5.16**. | testingstandards.net | T2 | — | Must document comparable meaning over alternate item sets: algorithms, software, QC procedures. |
| AERA, APA & NCME (2014), **Standard 5.17**. | testingstandards.net | T2 | — | For non-equatable links (incl. CAT), provide direct evidence of comparability + specify population. |
| AERA, APA & NCME (2014), **Standard 6.8**. | testingstandards.net | T2 | — | When scoring is done by computer, the algorithm's accuracy and processes should be documented. |
| AERA, APA & NCME (2014), **Standard 6.15**. | testingstandards.net | T2 | — | Retain the "test protocol" to answer a test-taker challenge / later interpretation (audit basis). |
| AERA, APA & NCME (2014), **Standard 6.14 / 6.6 / 6.7**. | testingstandards.net | T2 | — | Data-security + retention policy; score integrity; protect materials from disclosure/tampering. |
| van der Linden, W. J., & Glas, C. A. W. (Eds.) (2010). *Elements of Adaptive Testing*. Springer. | 10.1007/978-0-387-85461-8 | T2 | — | Canonical framework: CAT item selection, exposure control, calibration are specifiable rule components. |
| Kingsbury, G. G., & Zara, A. R. (1989). Procedures for selecting items for CAT. *Applied Measurement in Education*, 2(4), 359–375. | 10.1207/s15324818ame0204_6 | T1 | — | "Randomesque": choose next item at random among the most-informative candidates (routing stochasticity). |
| Stocking, M. L., & Lewis, C. (1998). Controlling item exposure conditional on ability in CAT. *JEBS*, 23(1), 57–75. | 10.3102/10769986023001057 | T1 | [COI ETS] | Items admitted probabilistically to control exposure conditional on ability in continuous testing. |
| Wyse, A. E. (2023). Two statistics for measuring the score comparability of computerized adaptive tests. *Applied Psychological Measurement*, 47(7-8), 513–525. | 10.1177/01466216231209749 | T1 | [COI vendor: Renaissance] | Each examinee sees a unique CAT form; comparability evaluated via Lord's (weakened) equity property. |
| Veerkamp, W. J. J., & Glas, C. A. W. (2000). Detection of known items in adaptive testing with a statistical quality control method. *JEBS*, 25(4), 373–389. | 10.3102/10769986025004373 | T1 | — | Disclosed items show parameter drift; an SPC method re-estimates parameters and tests for drift. |
| Wells, C. S., Subkoviak, M. J., & Serlin, R. C. (2002). The effect of item parameter drift on examinee ability estimates. *APM*, 26(1), 77–87. | 10.1177/0146621602261005 | T1 | [ADJACENT: simulated 2PL, mid-scale] | Under simulation, 20% drifting items shifted θ by ≤0.14 logits — a small effect on ability estimates. |
| Nosek, B. A., Ebersole, C. R., DeHaven, A. C., & Mellor, D. T. (2018). The preregistration revolution. *PNAS*, 115(11), 2600–2606. | 10.1073/pnas.1708274114 | T1 | [ADJACENT: open science] | Locking questions + analysis plan before outcomes separates confirmation from postdiction. |
| docs/product/project-requirements.md — **R7**. | (internal) | — | [internal governance] | An independent reviewer must reconstruct selection; rules locked before results; decisions logged. |

---

## Cross-references (to `gifted-assessment-quality` and sibling shards — cite, do not duplicate)

- **GA 10.10 (a CAT's delivered precision depends on the whole operating system):** the primary partner.
  GA 10.10 establishes that the bank + estimator (MLE/WLE/EAP) + exposure control + stopping rule + a
  **calibration-error perturbation** are what a CAT must certify; **this shard is the auditability/
  reproducibility complement** — the same operating system must additionally be *locked, seeded, logged,
  and replayable* to satisfy D-015/R7. GA 10.10's "calibration-error perturbation" is the empirical
  counterpart to I.6's frozen-scale-vs-drift tension.
- **GA 10.1 / 10.2 (CAT / MST maturity):** own the precision/efficiency claim and note CAT "requires an
  IRT-calibrated bank + exposure/security controls"; I.1–I.2 add *why those controls make routing
  stochastic* and how seeding restores determinism.
- **GA 11.1 (building a standardized test; Standards ch. 4–5):** owns "adaptive designs require large
  operational pools + stopping rules"; I.5 adds the *locking/pre-registration* of those rules + parameters
  before operational use.
- **GA 11.9 (validity belongs to the proposed use):** documenting model/algorithm/QC per Std 5.16 is part
  of the validity argument for *this* screener's use, not a transferable property.
- **Sibling Category A (A.4 deterministic constrained-CAT/shadow-test routing; A.5 exposure control):**
  owns the routing/exposure *mechanics* (Sympson–Hetter, Stocking–Lewis, progressive-restricted,
  a-stratification, shadow-test eligibility). Category A explicitly hands determinism off to Category I;
  this shard consumes that handoff and does not re-derive the mechanics.
- **Sibling Categories C (retakes) & H (fairness/security):** drift monitoring, exposure control, and
  audit trails interact with retake policy (C) and the security↔coaching↔fairness triad (H); logged,
  reproducible sessions are also the evidence base for detecting retake gaming.

---

## Product linkage (R11 screener) — concrete structural/config implications

1. **Seed and log every stochastic draw; make each session bit-for-bit replayable.** Because randomesque
   and conditional exposure control make item selection stochastic (Kingsbury & Zara 1989; Stocking &
   Lewis 1998), the screener must drive all pseudo-random draws from a **per-session recorded seed** and
   persist a complete protocol (item IDs, order, responses, interim θ/SE, each selection + stop decision,
   seed, engine version, item-parameter-snapshot hash). Re-executing that log must reproduce the identical
   classification. **Serves D-015 (reproducible), R7 (reconstructable);** grounded in Std 6.15/6.8. `[gap: no
   gifted-screener validation of seeded replay]`
2. **Lock and version the rule set + item-parameter snapshot before any operational decision.** Freeze the
   start rule, selection criterion, content constraints, exposure parameters, θ-estimator, and stopping
   rule, plus a hashed IRT-parameter file, and pin them by version before results are observed (Std 4.3;
   Std 5.16; pre-registration logic, Nosek et al. 2018; R7 "rules locked before results"). Any change
   produces a **new documented version**, never an in-place edit. **Serves R7, D-015, R11.**
3. **Ship a Standard-5.16 comparability dossier, not an assumption.** Since every child sees a different
   item set/order, produce documented evidence that scores are comparable on the common θ scale —
   model/software/QC descriptions plus a conditional-SEM / equity-property check (Wyse 2023; Std 5.16/5.17;
   ch. 5 p. 98). Without it, "different test per child" is a defensibility/fairness liability at the gifted
   cut. **Serves R7, R9, R5;** ties **GA 10.10**.
4. **Pair the frozen scale with an out-of-band drift & item-compromise monitor.** Freezing parameters
   preserves reproducibility, but disclosed items drift (Veerkamp & Glas 2000) and drift is nonzero even
   when small (Wells et al. 2002); run a scheduled statistical-quality-control audit on accumulating
   responses that can **trigger a versioned recalibration** (a new locked snapshot per #2) rather than
   silently mutating the live scale. **Serves R7, D-015, R9;** ties **GA 10.10** and **Category H**.

---

## Tensions / disagreements (DOK 3 seeds — no insight/stance written here)

- **Frozen scale (reproducibility) vs recalibration (validity/security).** D-015 pushes toward permanently
  frozen item parameters so re-scoring is deterministic; validity and security push toward periodic
  recalibration because parameters drift and items leak (Veerkamp & Glas 2000). Wells et al. (2002) find
  drift's effect on θ is *small* in simulation, softening the tension — but that study is mid-scale and
  simulated, and near a stringent top-percentile cut even a ≤0.14-logit shift can move a classification
  (cut-sensitivity owned by **GA 8.x**). Unresolved: freeze-forever vs a versioned-recalibration cadence.
- **Standardization-as-identical-items vs standardization-as-identical-rules.** Classical fairness rests on
  everyone getting the same items/order/conditions (Std ch. 3, p. 50); adaptivity deliberately varies items
  and order per examinee. The *Standards* relocate "standardization" to the **algorithm + common scale**
  (Std 5.16; ch. 5 p. 98), but whether families, auditors, or courts accept "different test, same rules" as
  *fair* is a normative/empirical question with no located evidence `[gap]`.
- **Auditability vs proprietary/complex algorithms.** The 2014 *Standards* explicitly name the tension
  between proprietary algorithms and users' need to evaluate them. A fully open, deterministic, logged rule
  set maximizes auditability (R7), but publishing exact selection/exposure rules can aid coaching and item
  harvesting, conflicting with Std 6.7 test security (ties **Category H**). Transparency ↔ security.
- **Determinism vs deliberately injected randomness.** Exposure control *intends* randomness to protect the
  bank (Stocking & Lewis 1998; randomesque, Kingsbury & Zara 1989); pure determinism would maximize
  reproducibility but concentrate exposure on a few optimal near-cut items. Seeding reconciles them *in
  principle*, but the seed becomes a new single point of audit and failure (secure generation, storage,
  and disclosure policy) — no gifted-screener evidence on managing this `[gap]`.
- **Evidence maturity.** The comparability defense, protocol-retention, and locking requirements are
  **standards-based/conceptual**; the drift and exposure results are **peer-reviewed but adult/mid-scale
  simulation** (Wells et al. 2002; Veerkamp & Glas 2000; Wyse 2023 is vendor-affiliated). No located study
  demonstrates end-to-end deterministic, seeded, replayable auditing of a **top-1–2% K-8 text-only adaptive
  screener** — the exact D-015/R7 use is `[gap]`.
