# Test-Structure → Screener Design Notes (product/design)

> **Relocated out of the BrainLift.** BrainLifts must stay codebase/governance-independent; this product/design doc MAY reference requirements, decisions, and codebase. The research grounding (sources, DOK 1/2) lives in `brainlifting/test-structure-brainlift/`; the raw research shards live in `research/test-structure-research/`.

## GT expectations & goals for the in-house test (Crystal Martel interview)

> **Source:** `docs/interviews/CRYSTAL_MARTEL_INTERVIEW_NOTES.md` — Crystal Martel, GT School Director of Admissions and current sole admissions reviewer; interviewed 2026-07-23 (Otter.ai, captured 07-24). **Status: stakeholder-reported policy/belief/opinion — notes, not ratified requirements.** Everything here is *as stated by Crystal*, not independently verified. This is a **design-input synthesis**, kept out of the BrainLift (which stays evidence-only). Governance follow-ups per the interview doc's own checklist — **not yet done:** update MVP PRD `B-01`–`B-08`, add/label entries in `docs/ASSUMPTIONS_AND_EVIDENCE.md`, and open `DECISION_LOG.md` entries only where an answer changes a requirement or scope.

### 1. Primary target — Timeback-fit, not generic giftedness `[STAKEHOLDER POLICY/BELIEF]`
The test should measure **whether a child would excel on the Timeback platform** (self-paced, fast, reading-based, little content re-review, no hand-holding), not a generic gifted score (Finding C). Stated consequences:
- Some **non-"gifted" kids thrive** on Timeback (4–5 grade levels ahead; "mimic giftedness"); some **genuinely gifted kids are not served** — examples she gave: nonverbal-autistic students, students needing "an outrageous amount of extra time" on specific content, a domain-only prodigy who dislikes academics, and 2e students in the bottom ~10th percentile of learners (the GT-Anywhere fit problem).
- → Target construct is **acceleration-fit / fast rule-induction**, so raw "gifted" instruments are treated as necessary-but-not-sufficient.

### 2. Signals GT believes distinguish the target child `[STAKEHOLDER BELIEF]` — candidate constructs to test
- **"Speed" = low re-teaching need:** absorbs/adapts to new information on the **1st–2nd exposure** and jumps ahead; ~80–90% correct in Timeback's optimal zone *so long as they read the content* (Finding E). She means **learning speed / few repetitions, not raw reaction time.**
- **Pattern recognition & spatial recognition** — "drawing connections from new info based on prior knowledge … recognizing relationships," explicitly **not memorization** (E).
- **Fast rule-induction / "system-hacking"** — quickly inferring "what the system wants" (Alpha Read/Write); cited a near-non-reader reaching ~grade-4 language via pattern use (E). → argues for testing **pattern, spatial, and fast rule-induction** over recall.

### 3. Hard reading/literacy gate `[STAKEHOLDER POLICY]` — most decision-relevant for the in-house test
- **Every student, regardless of CogAT: ≥ 85th-percentile fall MAP Reading** for the grade being entered (a per-grade RIT score) (Finding B).
- **Narrow exception (essentially ELL):** a 99th-percentile-cognitive child reading only ~70–80th is *not* rejected (expected to catch up); Timeback isn't offered in other languages yet (B, D).
- → Structurally this is a **separate reading pre-gate**, distinct from the cognitive screener's own routing/scoring — relevant to the "is reading the construct, or a gate?" design question (cross-ref "Structure → R11 config" Category D and the D-017 decision).

### 4. Current (human) admission criteria she applies `[STAKEHOLDER POLICY]` — the behavior to reproduce/automate
Multiple qualifying paths (Finding A), currently a **human decision**:
1. **MAP screeners > 95th pct** ("hustler kids") — admits even at ~90th CogAT.
2. **Blended aggregate > 90th pct** (e.g., MAP ~92/93 + CogAT ~89).
3. **Exceptional-ability waiver** — 99th-pct composite across the board.
(The §3 reading gate applies to all paths.)

### 5. Automation & accuracy requirement `[STAKEHOLDER REQUIREMENT-INTENT]`
- At scale ("thousands and thousands of children") the test **must auto-cut** ("try again in six months / a year"); manual per-application review is "impractical" (Finding F).
- The algorithm "needs to be pretty darn accurate." She values current human review (rescues near-misses — e.g., ~94th, or a child tested in a noisy 12-kid room), so **automated accuracy at the cut is the bar to clear** to justify removing the human. → motivates the **classification-accuracy-at-the-cut** and **auditability/reproducibility** design (Categories A, H, I below).
- **Manual behavioral review at the shadow-day stage remains.**

### 6. Accuracy benchmark & cautionary tale `[STAKEHOLDER BELIEF]`
- **CogAT** is "the only truly fairly accurate measurement" she's seen: **few false positives, some false negatives (especially the young)**; 97th–99th-CogAT kids behind on MAP-math "fly through four grade levels in six months" → she reads CogAT as accurate (Finding G).
- **Mindprint caution:** ~80th-CogAT kids admitted on Mindprint "gifted" results (2024/early-2025) without CogAT → one family "still really struggling" a year later → she is "heavy on **both**" giftedness *and* acceleration-fit. → the new test must **complement/beat CogAT on the target**, not merely correlate with a "gifted" label.

### 7. Constraints & validation resources `[STAKEHOLDER COMMITMENT/CONSTRAINT]`
- **Length: ≤ ~45 minutes** so she can test a whole campus (Finding H).
- **Validation dataset available:** she can **dummy-test the ~46 on-campus students in one afternoon** (all have CogAT + MAP) and **pull historical CogAT distributions from Riverside** — a concrete basis to compare *new test vs CogAT vs MAP* (H). → enables the local pilot the config notes repeatedly assume.
- **Integration target:** fold the new test into her existing **admissions/reviewer dashboard/portal** ("100% that is the goal"); one "GT Universe" portal; streamline the current CogAT-via-Northwestern → MAP → shadow-day flow (Finding J).

### 8. Proposals discussed (not decided) `[PROPOSAL]` & context
- **Two-track** (interns → Crystal): Track A auto-admit on strong scores; Track B for the ~50% regression-discontinuity gifted cohort via artifacts/portfolio — Crystal: portfolio is worth including, **but every path must still confirm Timeback-fit** (Finding K).
- **Scale context:** ~40–46 physical + ~300 virtual (K–8); ~100,000-kid goal; won't open a campus below ~20–30 students (Finding I).
- **Timeline / likely deliverable:** ~3 weeks left → **provide the model and let admissions tune the cutoff parameters** themselves (Finding L).

---

## Structure → R11 config (product linkage)

> Candidate structural/config implications for the R11 adaptive screener, aggregated from the shards. Research-grounded suggestions, NOT ratified config (that lives in the exam workstream).

### Category A — Adaptive structure & routing


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

### Category B — Item ordering, position & context effects


1. **Control item-position effects in calibration, not at scoring time.** Because unmodeled IPE biases person-ability estimates under item-level CAT (Albano et al. 2019) and pretest-in-multiple-positions or pool-level control outperforms item-level adjustment (Davey & Lee 2011; Ma & Harris 2024), the in-house bank should be **calibrated with items pretested across varied positions** and the chosen control method **locked and documented** to satisfy D-015 (automated, reproducible). *(Serves R11; ties GA 10.10.)*
2. **Expect and budget for a fatigue/effort gradient.** Difficulty rises and effort falls across position, especially in **low-stakes** settings and lower-performing groups (Weirich et al. 2017; Debeer et al. 2014), with person-level persistence differences (Wu et al. 2019). For a low-stakes K–8 screener this argues for **short, segmented sessions and monitoring of per-position response behavior** rather than long fixed blocks. *(Serves R11; interacts with Categories F/G.)*
3. **Front-load a few unscored warm-up/practice items** so the early practice/unfamiliarity effect (difficulty inflated on the first novel items; Christiansen & Janssen 2020; Albano et al. 2020) is absorbed **before** scored adaptive routing begins — flagged as a design inference pending direct K–8 evidence. *[gap]* *(Serves R11; ties GA 13.1.)*
4. **Keep local item context fixed where carryover is plausible.** For any reading-passage or multi-item bundles, treat the bundle as a **testlet** so each item carries its own context (Wainer & Kiely 1987); for standalone items, **interleaving task types is psychometrically safe-to-beneficial** in early assessment (Albano et al. 2020), which suits a varied on-screen K–8 item mix. *(Serves R11; ties GA 10.6.)*

### Category C — Retakes & repeated administration


1. **Cap retakes at two attempts (≈3 lifetime occasions) and use alternate/rotating forms, never the identical form.** Gains plateau after the third administration (C.4) and identical-form gains are ~2× alternate-form gains driven by answer recall (C.3); a CAT draw from a calibrated bank with exposure control (GA 10.1/10.10) makes rotating, equated alternate forms the natural, reproducible default.
2. **Enforce a minimum spacing window and log the exact interval per attempt.** Short intervals maximize the memory-driven, construct-irrelevant portion of the gain (C.5); Standard 13.2/2.19 require reporting the inter-administration interval, so the screener must record it deterministically for D-015 reproducibility.
3. **Score a retake as a *classification-consistency* event, not "take the higher score."** Standard 2.16 favors estimating whether two administrations classify the child the same way; combined with the near-cut CSEM band (Standard 2.14) and GA 8.2 tail instability, a defensible rule flags borderline cases for a consistency check rather than auto-promoting the higher observed score — which retest bias (C.6) and subgroup-differential gains (C.9) would otherwise contaminate.
4. **Judge individual improvement against a Reliable Change Index threshold, and publish the retake policy up front.** An observed increase should clear |RC| > 1.96 (C.8) before it is treated as real change rather than measurement noise or practice; Standard 10.7 requires disclosing whether/when a retake is allowed, and doing so in a locked, documented rule keeps the policy auditable (R7) and equitable (C.9).

---

### Category D — Presentation & interaction design


1. **Hold reading construct-relevant, attack every *other* CIV source.** Under D-017 reading demand is defined
   into the construct, so the screener does not "simplify language to raise scores" (that would be a D-017
   modification). But Standards 3.0/3.2 still oblige minimizing **interface/motor/device/mode** CIV — so the
   build should standardize wording, layout, and interaction and document CIV controls, treating reading as
   target and interface as noise (D.1; GA 13.4/13.7).
2. **Interaction defaults: tap-based selected-response, one item at a time, review disabled by default.**
   SR is construct-equivalent to CR when stem-equivalent, and tapping is more accessible than drag-and-drop
   for young/low-exposure children, so single-tap selected-response minimizes construct-irrelevant
   motor/format variance (reserve drag/constructed formats only where a construct requires them, grouped by
   gesture). Free item review in an adaptive engine invites the Wainer-like manipulation and efficiency
   loss, so disable it by default; if any review is offered, restrict it within blocks, which preserves
   precision and lets children fix slips — consistent with D-015 determinism (D.2–D.3; Rodriguez 2003;
   Bhavnani 2019; Han 2013; Vispoel 2000).
3. **Avoid scoring speed/motor latency and prove device+mode comparability empirically.** Device effects
   concentrate in speeded/fine-motor tasks and largely reflect self-selection; untimed reasoning is more
   device-robust. Constrain or fix the device/screen envelope, avoid speeded scoring, and run a
   program-specific comparability study across the actual device mix rather than assuming the meta-analytic
   "small effect" transfers (D.4–D.5; Passell & Germine 2021; Wang 2007/2008; Kingston 2009; Brown 2023).
4. **Build an unscored, self-teaching warm-up — and validate it, because the D-017 version is unproven.**
   A practice/demo phase can neutralize prior-exposure bias, but the strongest evidence (DEEP) used human
   verbal instruction and physical guidance. A **text-only, no-audio, fully-automated** demo is an
   extrapolation beyond the evidence and must be independently validated (e.g., prior-exposure invariance
   check) before relied upon (D.6; GA 13.7). `[gap]`

---

### Category E — Cognitive load & working memory


1. **Budget working memory explicitly, per band, as a locked parameter.** Because pure WM capacity is
   ~4 chunks (Cowan 2001) and functional WM grows across K–8 (Gathercole 2004), cap the count of
   simultaneously-required on-screen elements (stem + options + live instructions) per grade band —
   tightest for K–1 — and record the cap as a deterministic, audited config value (serves **R11**,
   **D-015/R7**).
2. **Compensate for the foreclosed modality remedy with visual-only levers.** Since D-017 forbids audio
   (so the modality fix is unavailable — E2), physically **integrate** each item's text with its referent
   stimulus (avoid split-attention; Chandler & Sweller 1991), strip redundant/decorative text and interface
   chrome (Kalyuga 1999), present **one item at a time** (xref Cat D), and pre-teach the response format
   with **unscored** teaching items (xref GA 13.7) so instruction-decoding is never scored as low ability
   (serves **R9**, **R5**).
3. **Hold presentation load constant; let only difficulty vary.** Because intrinsic load rises with adaptive
   difficulty (Sweller 2010) and fixed scaffolds are not load-neutral across ability (expertise reversal;
   Kalyuga 2003), keep interface/instruction load **low and identical across items**, so that harder items
   differ in *reasoning* demand, not *presentation* demand (serves **R11**, **D-016**; keeps routing
   defensible under **R7**).
4. **Document the WM demand that is intentionally *kept* as a construct boundary.** Fluid reasoning is
   heavily WM-loaded (Kyllonen & Christal 1990; Hagemann et al. 2023), so the screener should minimize
   **extraneous** load while explicitly stating that the residual WM demand is part of the intended
   reasoning construct — a claim-boundary/validity note (serves **R10**; AERA/APA/NCME 2014 construct-
   irrelevant-variance standard, E7).

---

### Category F — Session design & developmental fit

1. **Instrument effort, don't assume a clock.** Log **item position + per-item response time** and compute RTE, so
   declining data quality within a session is *measured and filterable* (F.2, GA 13.8) rather than guessed from a
   `[UNVERIFIED]` "age-in-minutes" limit (F.5). Publish per-position accuracy and rapid-guess rate as an auditable
   data-quality metric (supports D-015/R7 reproducibility).
2. **Segment by band with a recharge break, not by myth.** Because a 20–30 min break recovers more than an hour's
   fatigue loss but over-frequent breaks net negative (F.3), design **short scored blocks with one purposeful break**
   for K-1/2-3 and allow a longer single sitting for 4-5/6-8 (F.4 plateau ~age 10) — within one day where possible to
   avoid occasion variance (F.8).
3. **Age-band the session envelope on motor + reading, the true K-1 binders.** Larger touch targets / simpler
   gestures for K-1 (Vatavu; Hourcade, F.7); and treat **D-017 text-only as a real K-1 feasibility limit** — with
   grade-1 decoding ≈34% (Seymour, F.7), a text-only screen at K-1 substantially measures reading, which is
   ratified as capability but shrinks the valid K-1 reasoning-item pool (flag for the recommendations doc).
4. **Fix or record time-of-day.** Since each hour later ≈ −0.9% SD (F.6), hold administration time constant or
   capture it as a logged covariate for the audit trail (D-015/R7).

### Category G — Motivation, effort & engagement structure


1. **Capture response time and gate the score on effort, deterministically.** Log per-item RT,
   apply a **pre-registered, locked per-item threshold Tᵢ** (Kong, Wise & Bhola 2007) to flag
   rapid-guessing (Wise & Kong 2005; Wise 2017), and **effort-moderate or filter** flagged
   responses in scoring (Wise & DeMars 2006) so disengagement is removed as CIV *without* leaking
   into the ability estimate — and so the rule is reproducible/auditable (**D-015, R7, Category I**).
2. **Protect effort through adaptivity, not stakes or rewards.** Use challenge–skill matching
   (D-016 / GA 13.2 / GA 10.1) as the engagement mechanism; **do not** add points/badges/
   leaderboards tied to performance (Deci et al. 1999 / GA 13.3), and **do not** show within-test
   correctness/score feedback (Kluger & DeNisi 1996; Hattie & Timperley 2007) — both alter effort
   and can leak into the score.
3. **Design the text-only format against disengagement (D-017 collision).** Because heavy per-item
   text and later position drive rapid-guessing (Wise, Pastor & Kong 2009) and the screener is
   text-only, **cap per-item reading load**, monitor position/fatigue, and treat rising
   rapid-guessing late in a session as a **stop/segment** signal (cross-ref **Category F / E**).
4. **Frame low-threat without inviting disengagement.** Use non-punitive, low-stakes framing and
   avoid hidden/uncertain time pressure; if any pacing is displayed, prefer a **calm visible timer**
   over a hidden countdown (Hallez & Vallier 2025) — but **pair** the low-anxiety frame with the
   effort monitoring in (1) to defuse the stakes/effort paradox (Wise & DeMars 2005).

---

### Category H — Fairness & access in structure


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

### Category I — Auditability & reproducibility of structure


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
