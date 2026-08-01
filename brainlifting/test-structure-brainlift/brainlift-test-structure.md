# BrainLift: Gifted/IQ Test **Structure** — Adaptivity, Retakes, Sequencing, and the Learning Science of the Test Experience

## Owners

- Aadi Takle

## Purpose

### Purpose

How the **structure** of a gifted/IQ test — its adaptivity, retake policy, item ordering and presentation, session design, and the cognitive-load / learning-science of the test *experience* — shapes what the test actually measures. The goal is an original, defensible position on how to structure a K–8 cognitive screen so the delivered experience elicits genuine ability rather than test-taking artifacts. It argues from external evidence and general principles only, and is written to be read with no knowledge of any specific product or codebase. *(DOK 1–2 are AI-assisted + citation-verified; DOK 3–4 are the author's to own. Companion: `source-register-annotated.md`.)*

### In Scope

The structure / sequencing / delivered-experience design of a K–8 automated, adaptive, text-only cognitive screen, and its learning-science grounding:

- Adaptive **structure & routing** (CAT vs MST vs hybrid; item-selection, stopping rules, content balancing, exposure control).
- **Item ordering, position & context effects** (easy→hard vs random vs adaptive; warm-up placement; within-session practice/fatigue).
- **Retakes / repeated administration** (test–retest reliability, practice effects, reliable change, occasions, spacing, alternate/rotating forms, retest policy for a decision).
- **Presentation & interaction** (text-only delivery; one-at-a-time vs review; response formats; device/touch; instructions/self-teaching demos + warm-ups).
- **Cognitive load & working memory** in test design (intrinsic/extraneous/germane load; WM limits by age; how load interacts with the above).
- **Session design & developmental fit** (length, breaks, fatigue, attention by band K-1/2-3/4-5/6-8).
- **Motivation, effort & engagement structure** (test anxiety, flow, rapid-guessing/effort detection, feedback timing/type, reward crowding-out).
- **Fairness & access in structure**, and **auditability/reproducibility of an adaptive structure** (locked, deterministic routing/stopping/ordering).

### Out of Scope

- **Measurement validity, instruments, and tail-quality metrics** — owned by the companion `gifted-assessment-quality` BrainLift (its Cat 7–12, 14–15). This BrainLift *uses* those conclusions (e.g., adaptivity improves tail precision, 10.1) and adds the structural/experience layer; it does not re-derive them.
- **Causal identification / separating program effect from selection effect** — owned by the companion `gt-school-counterfactual` BrainLift.
- **Any mapping of these findings onto a specific build, configuration, or roadmap** — belongs in a separate product/design document, not this BrainLift.
- Re-deriving the companion's already-covered CAT/MST maturity (10.1–10.2), above-level (10.3), repeated measurement (10.8), CAT operating system (10.10), or learning science (13.1–13.7); this BrainLift cross-references those and goes deeper only on the *structural/sequencing* mechanics.

---

## DOK 4: Spiky Points of View (SPOVs)

- **Spiky POV 1 - A gifted screener should measure two different constructs in two different test structures.**
   - **Elaboration:** There are two things our test should understand and measure: "What can this applicant already do?" (standing) and "How fast can they learn under difficulty" (learning-rate/timeback readiness). Unfortunately, these two measurements require different test structures to be adequately measured (Insight 1). Standing is most cleanly read when questions are asked below a student's skill/knowledge limit, while learning rate only becomes truly observable above that limit (5.8, GA 10.8). Therefore, a single test that tries to measure both will not be able to measure either one accurately enough for the high-stakes gate that we are measuring for. Instead, a MST that covers the standing in a first stage and then learning-rate in a second difficulty-scaled stage will provide more accurate results. The accuracy stage will be adaptive to identify where the student's limits are in each of the core reasoning areas we are looking at as well as their ability to accurately answer questions below that limit (Insight 2). Then, the learning-rate stage will use that information to scale the difficulty of its test past the student's limit so they actually struggle to answer the proposed questions. Then, through this struggle, students will demonstrate that they are able to understand their mistakes and correct/improve from them (Insight 3). This MST design also needs to account for fatigue and effort loss over the course of the test, so incorporating a break between phases and tracking real time response time data to account for engagement dropoff will make the test more effective (Insight 6). Supporting retakes, however, is a large departure from this core structure and is best left as a future extension, since it does not have a large impact on the outcome or accuracy of the exam itself. Instead, we should develop our structure to allow retakes to be folded in later. This primarily includes sizing and calibrating the item bank for rotation from the start. Then, retakes can be added as an extension rather than a complete redesign (Insight 7).
- **Spiky POV 2 - The student should only be "struggling" during the learning-rate stage, since any difficulty during the accuracy stage will degrade results.**
   - **Elaboration:** Desirable difficulties are only evidence-backed for the durable learning measured in the learning-rate stage (5.8, Soderstrom & Bjork 2015). In the accuracy stage, desirable difficulty leads to unreliable and unpredictable performance, especially without repetition/immediate feedback. It additionally destroys any diagnostics for those difficult questions since the student is no longer engaging with the question in a meaningful and thoughtful process, often leading to frustration and rapid-guessing and unnecessary cognitive load (Insight 2, 6.2). Thus, it should be avoided during this stage of the test.
- **Spiky POV 3 - Effort and engagement telemetry data should be used as validations and filters for the assessment's determined score/decision. They should not be used to gate/grade the child.**
   - **Elaboration:** Though timeback's model is most effective with kids demonstrating high engagement and effort, these signals are not correlated with the more important accuracy and learning-rate measurements. Effort is near-zero correlated with ability (7.4) and the telemetry data can encode device/motor/timeback familiarity variance worst for young applicants (4.4, GA 12.6/13.5). Instead, these metrics should be used to detect and prevent against biases by detecting disengagement, filtering rapid-guessing, and keeping effort variance out of the estimate (7.4, 7.5).
- **Spiky POV 4 - the accuracy and learning-rate metrics that are being gated on must be auditable. This is how the test's results can be verified and validated.**
   - **Elaboration:** Any metric we actually gate the admission decision on has to be auditable because that is how a borderline or rejected family's result can be reconstructed, defended, and shown to be rule-governed instead of arbitrary (Category 9; 8.2). However, the test needing to be auditable cannot choose the construct for us: accuracy is easy to make reproducible and fair, so it is tempting to gate on accuracy alone. However, that inverts our priorities since it optimizes defensibility over validity and turns our test back into a conventional ability screen, under-representing the learning-rate/timeback-readiness we actually care about (construct underrepresentation) (7.3, Insight 5). Therefore, the real work is bringing the learning-rate metric up to the same bar as accuracy and have it be deterministic, replayable, fair at the cut, and shown to add real predictive value against an outcome we trust (like later achievement growth) so it can legitimately help gate (Category 9, 8.2, GA 10.8). Learning-rate measurement is still unproven for high-stakes decisions (GA 10.8), so until it clears that bar, we should use a documented accuracy floor alongside a logged, provisional learning-rate signal on an explicit, timeboxed validation plan.

## Experts

> Chosen for productive tension — the disagreements between these camps are where the DOK 3 insights come from.

- **Expert 1 — Wim J. van der Linden and the adaptive-testing psychometricians (with David Weiss; Yan, von Davier & Lewis)**
   - **Who:** Psychometricians who formalized computerized adaptive testing (CAT), multistage testing (MST), item-selection, shadow-test content balancing, and exposure control.
   - **Focus:** Tuned adaptive routing measures more precisely with fewer items; the structure (selection rule, stopping rule, exposure control) is engineered, not incidental.
   - **Why Follow:** They define what an adaptive *structure* can and cannot do, and the machinery a classification screen would use. Pole: adaptivity + tuned routing is superior.
   - **Where:** van der Linden & Glas, *Elements of Adaptive Testing*; Yan, von Davier & Lewis, *Computerized Multistage Testing*.
- **Expert 2 — John Sweller and Cognitive Load Theory (with Paas, van Merriënboer)**
   - **Who:** Originators of Cognitive Load Theory — intrinsic/extraneous/germane load, element interactivity, and the split-attention, redundancy, and modality effects.
   - **Focus:** Performance degrades when extraneous load consumes the working memory needed for the target reasoning.
   - **Why Follow:** The core lens for presentation, session, and ordering design. Pole: minimize extraneous load.
   - **Where:** Sweller, van Merriënboer & Paas (1998/2019).
- **Expert 3 — Robert & Elizabeth Bjork (desirable difficulties)**
   - **Who:** Memory researchers behind "desirable difficulties" — conditions that slow acquisition but improve retention and transfer.
   - **Focus:** Some difficulty *improves* learning outcomes.
   - **Why Follow:** The counter-pole to CLT, and the sharpest tension in a *measurement* (not learning) context — does "desirable difficulty" even apply when you are measuring, not teaching?
   - **Where:** Bjork & Bjork (2011); Soderstrom & Bjork (2015).
- **Expert 4 — Steven Wise (rapid-guessing / response-time effort)**
   - **Who:** Measurement researcher on test-taking effort, rapid-guessing, and effort-moderated scoring.
   - **Focus:** Disengaged rapid guesses carry no signal and must be detected and filtered; effort is a precondition for valid measurement.
   - **Why Follow:** Grounds the engagement/effort structure and the response-time signals (with van der Linden's RT models).
   - **Where:** Wise & Kong (2005); Wise & DeMars (2006).
- **Expert 5 — Retest / practice-effect meta-analysts (Hausknecht et al.; Scharfen et al.; Lievens)**
   - **Who:** Researchers quantifying test–retest gains, practice effects by form type, and retest policy in high-stakes selection.
   - **Focus:** Repeated testing produces score gains that vary by form and interval and can be subgroup-differential.
   - **Why Follow:** The evidence base for a retake policy — occasions, spacing, alternate forms, reliable change.
   - **Where:** Scharfen, Peters & Holling (2018); Hausknecht, Halpert, Di Paolo & Moriarty Gerrard (2007).
- **Expert 6 — Item-position & context-effect researchers (Debeer & Janssen; Weirich et al.; Kingston & Dorans)**
   - **Who:** Psychometricians modeling how an item's serial position and surrounding context shift its difficulty and DIF.
   - **Focus:** Position is a construct-irrelevant factor that ordering choices can inject.
   - **Why Follow:** Grounds the item-ordering / warm-up design and the "adaptivity confounds position with difficulty" problem.
   - **Where:** Debeer & Janssen (2013); Weirich, Hecht, Penk, Roppelt & Böhme (2017).
- **Expert 7 — Test-anxiety & motivation researchers (von der Embse et al.; Deci, Koestner & Ryan)**
   - **Who:** Researchers on K–8 test anxiety and on extrinsic rewards crowding out intrinsic motivation.
   - **Focus:** Anxiety adds construct-irrelevant variance; tangible/performance rewards can distort effort, worse in children.
   - **Why Follow:** Grounds the anxiety-reducing, reward-free engagement structure.
   - **Where:** von der Embse et al. (2018); Deci, Koestner & Ryan (1999).
- **Expert 8 — The testing Standards & Universal Design for Assessment (AERA/APA/NCME; Thompson, Johnstone & Thurlow)**
   - **Who:** The joint *Standards for Educational and Psychological Testing* and the Universal Design for Assessment framework.
   - **Focus:** Fairness, accessibility, comparability, and the construct-relevant vs construct-irrelevant line.
   - **Why Follow:** The rulebook for fairness/auditability of structure and the counter-pole to a text-only reading barrier.
   - **Where:** AERA/APA/NCME (2014) *Standards*; Thompson, Johnstone & Thurlow (2002), NCEO.

## DOK 3: Insights

- **Insight 1 - A student's standing and their learning rate are useful at distinctly different levels of understanding and difficulty.** A test's one-shot accuracy score will provide information about a student's standing and baseline capability, but will not tell us about their capability to learn from their mistakes, understand them, and improve. Learning rate encapsulates that concept by measuring a latent change through "improvement over exposure" (5.8; dynamic/test-teach-retest, GA 10.8). Additionally, applying the learning science concept of desirable difficulty has shown to raise later learning and growth but reduces short-term performance (designed for failure-first) (5.8). Since adaptable test designs introduce an element of desirable difficulty as the student's boundary is reached, it is clear that both standing and learning rate cannot and should not be measured together during the test. Standing is more useful for identifying the student's limits within the reasoning areas and learning rate is more suitable for desirable difficulty testing where the goal is to see how the student improves over multiple exposures (7.7). This insight immediately lends itself to an MST test design (1.1 MST routing). 

- **Insight 2 - When identifying a student's reasoning limits, don't ramp up to their limits, bracket around them.** The immediate instinct to measure a student's limits by pushing difficulty until they plateau does eventually give a secure answer, but it causes students to experience test anxiety as questions approach and exceed their ability limits, leading to rapid-guessing and reduced effort (6.2, 7.6, 7.1, 2.1). Instead, we should close in on the student's ability from both sides, which is best done by picking each question to shrink the remaining uncertainty as much as possible. This is what Bayesian criteria like minimum expected posterior variance (MEPV) are built for (1.6). Maximum-information selection does nearly the same thing more cheaply, and the comparisons find little separating them past the first several items (1.7, 1.8). Thus, what matters here is closing in from both sides, not the specific criterion used. Two things about the underlying math change how this should be built. The most informative question is the one sitting at the student's current estimate, not one at the edge of what they can do, since a question far from the student carries almost no information and a wide range will stay wide (1.6). Additionally since we are primarily using five-option questions and a guessing floor, the information-optimal question is one the student gets right about 65% of the time rather than 50% (1.10). Therefore, the question we want for measurement reasons is already easier than the naive version and much of the conflict between measuring well and causing test anxiety closes on its own. SPRT belongs in this design but not in this step since it is a stopping rule that tells us when the decision is secure, not which question to ask next (1.3). The bracketing is a separate choice about selection that happens to pair well with it.


- **Insight 2b - Aiming our questions at the gifted cut instead of at the student would decide faster, but it costs us the per-area estimate the learning-rate stage runs on.** Selecting questions at the decision point rather than at the student's own estimate reaches a secure classification in fewer questions, and the advantage is largest exactly where a selective cut sits, which is where ours sits (1.9). That makes it genuinely tempting. The problem is what it gives up. Aiming at the cut produces an ability estimate that is only precise near the cut and close to useless away from it (1.9), and our standing stage is not just deciding pass or fail, it has to locate the student's limits in each reasoning area so the learning-rate stage can scale its difficulty past them (Insight 1, SPOV 1). A number that is only trustworthy near the cut cannot do that job. Cut-aimed selection also serves every student the same opening questions since it is barely adapting to the person at all (1.9), which throws away the exposure protection that student-matched selection gives us for free and would burn our item bank faster. Therefore, we should aim at the student and accept the extra questions, and treat cut-aimed selection as the right tool for a different test than the one we are building.

- **Insight 3 - Despite being harmful for a student standing focused test, desirable difficulty will improve our ability to measure learning-rate once the student's limits are identified.** Because desirable difficulty reduces performance in the short term (5.8, Soderstrom & Bjork 2015), a standing measure cannot use it since it will worsen the accuracy of its estimates. In contrast, desirable difficulty is shown to improve durable learning, which makes it perfect for a learning-rate focused test and measurement (5.8, Soderstrom & Bjork 2015). Such a test can measure improvement-under-difficulty by providing desirable difficulty to identify how well the student adapts and improves over multiple iterations. Thus, load and difficulty is minimized during the standing test and the improvement is mandated as part of the learning-rate test (5.2, 5.6).   

- **Insight 4 - Effort telemetry data is primarily useful for score reinforcement, but cannot determine admission on its own.** Response-time-based effort is near-zero correlated with ability (7.4, Wise & Kong 2005), so though it is useful for identifying engagement, it is not useful for identifying giftedness. What has support is using the data for effort-moderated scoring/filtering that's supplementary to the methods of determining admission (7.4, 7.5). Using it as a primary metric is ill-advised since it doesn't validate gifted kids and encodes device/motor/timeback familiarity variance the worst for younger kids (GA 12.6/13.5; 4.4). Thus, these metrics should be kept as secondary, supporting telemetry metrics that contribute as a final filter at the admissions cut but not as a metric that determines final admission.

- **Insight 5 - Every signal that carries a high-stakes decision must be auditable and traceable. This includes the accuracy, telemetry, and learning-rate signals.** Since we are attempting to understand and quantify how fast a child is able to learn and adapt, we need to gate on multiple signals to ensure accuracy on this unconventional metric and prove validity. Currently, the two formal threats to validity are construct-irrelevant variance and construct underrepresentation (AERA/APA/NCME 2014, 7.3). Gating on accuracy provides a great floor, finding the initial group of applicants that has the skills needed to excel, but provides no information about their learning rate. For that, we would need to gate on a learning-rate signal. Unfortunately, learning-rate signals are difficult to audit as an IRT accuracy classification is only lockable, seedable, replayable, and DIF-auditable at an accuracy cut (Category 9, 8.2), making it the wrong construct for these signals. Additionally, learning-rate signals can carry construct-irrelevant device/familiarity variance (GA 12.6, 4.4). Both of these are serious threats to the validity of learning-rate signals, so a good learning-rate gate will need to engineer an auditable and traceable learning-rate measure up to the same decision-grade bar as the IRT accuracy classification (deterministic/replayable, fair at the cut, and shown to add incremental validity against an external outcome such as later achievement growth).

- **Insight 6 - Because the learning-rate stage needs both a student's known limits and full effort to be an effective test, our structure needs to ensure students provide full effort on the test.** Effort and data quality decline with position and accumulated load (2.2, 6.2). Additionally, the learning-rate stage is required to run after the accuracy/standing stage since it needs the student's difficulty limits to provide effective results, placing it directly where a student is likely to provide the least amount of effort. Thus the assessment will need to be designed to account for this. With attention plateauing around age 10 (6.4) and a break between tests recovering more than a hour's worth of fatigue, a two-stage design will only work if the segments are short, and a break is provided between segments, and response time effort data is collected in real time to identify when engagement reduces (6.2, 6.3). This metric will perform better than the generic fixed clock for different ages (6.5). Because of this, effort-protection has become a core element of the test's design, as it is required to ensure that the test's results are accurate and valid.

- **Insight 7 - A retake policy will force the standing stage onto a large, rotating item bank and force us to score a retake as a change in classification.** Studies have shown that repeated testing reliably raises scores slightly, but doesn't result in a real ability gain (d ~ .26, 3.2), with the gain doubling if an identical test form is used (3.3). If allowing for retakes, quizzes must expand the question banks and rotate different questions, meaning that the design decision is apparent from the first administration of the test (Cat 1, Cat 8). Students who retake tests over multiple years will naturally improve their scores in a manufactured manner, producing false-positives above the cut (3.7). Seeing as these individuals are close to the cutoff (3.9), a rudimentary structure of taking the best of their attempts invalidates the results. The solution is to compare the consistency between the years with a Reliable Change Index, not banking on the student's high test score (3.8, 3.10). Retakes affect both stages of the test: the standing stage must take into account form-recall and regression risk and re-administration must factor in the memory of "learn-under-struggle" tasks. A learning-rate retake needs new yet parallel questions, solidifying the need for a rotating set of questions from an immense bank.

## DOK 2: Knowledge Tree

### Overall Summary

This tree maps how the *structure* of a K–8 adaptive cognitive screen shapes what it measures, across nine categories: adaptive routing, item ordering, retakes, presentation, cognitive load, session design, motivation and effort, fairness, and auditability. The recurring finding is that most structural levers — adaptivity, ordering, retakes, exposure control, and a text-only reading gate — improve one property (efficiency, security, engagement, or reproducibility) at a measurable cost to another (comparability, fairness, effort, or construct validity), and almost all of the evidence comes from adult or non-gifted-tail settings, so the magnitudes are design mechanisms to reason from, not calibrated constants for a top-percentile K–8 cut.

### Category 1: Adaptive structure & routing

*General idea: Adaptivity is not one thing but a family of separable, individually configurable structural choices — architecture, item selection, stopping rule, content balancing, and exposure control.*

- **Subcategory 1.1: Test architectures: item-level CAT, multistage testing (MST), and hybrid (CAST)**
  - **Source:** van der Linden & Glas (2010); Weiss (1982); Yan, von Davier & Lewis (2014); Luecht & Nungester (1998)
    - **DOK 1 — Facts:**
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
    - **DOK 2 — Summary:** Item-level CAT, MST, and hybrid CAST are three mature adaptive architectures that trade per-item efficiency against pre-publication quality assurance and control.
    - **Link to source:** [https://doi.org/10.1177/014662168200600408](https://doi.org/10.1177/014662168200600408) | [https://doi.org/10.7275/wqzt-9427](https://doi.org/10.7275/wqzt-9427) | [https://doi.org/10.1007/978-0-387-85461-8](https://doi.org/10.1007/978-0-387-85461-8) | [https://doi.org/10.1201/b16858](https://doi.org/10.1201/b16858) | [https://doi.org/10.1111/j.1745-3984.1998.tb00537.x](https://doi.org/10.1111/j.1745-3984.1998.tb00537.x)
- **Subcategory 1.2: Item-selection algorithms**
  - **Source:** Lord (1980); Chang & Ying (1996, 1999); van der Linden (1998); Chang, Qian & Ying (2001)
    - **DOK 1 — Facts:**
      - The default CAT criterion is **Maximum Fisher Information (MFI)**: at each step select the item that
        maximizes Fisher information at the current θ estimate. *(Lord, 1980, *Applications of Item Response Theory to Practical Testing Problems*, Hillsdale, NJ: Lawrence Erlbaum.)* `T2` `[UNVERIFIED: canonical book; page not directly resolved this session]`
      - MFI "could be much less efficient than assumed if the estimators are not close to the true θ,
        especially at early stages … when the test length … is too short to provide an accurate estimate";
        a **Kullback–Leibler (global) information** criterion using a moving average of KL information is
        proposed and reduced bias and mean squared error when the test was short / early (roughly m < 30).
        *(Chang & Ying, 1996, "A Global Information Approach to Computerized Adaptive Testing," *Applied Psychological Measurement* 20(3):213–229, DOI 10.1177/014662169602000303.)* `T1`
      - **Bayesian item-selection criteria** built on the *true* posterior (not Owen's 1975 normal
        approximation) are proposed, including maximum predicted posterior expected information, and are
        recommended for short adaptive tests where the large-sample approximation behind Fisher information
        is least safe. *(van der Linden, 1998, "Bayesian item selection criteria for adaptive testing," *Psychometrika* 63(2):201–216, DOI 10.1007/BF02294775.)* `T1` **Provenance note:** an earlier version of this
        entry carried a verbatim quotation ("…is the criterion elect for application in short adaptive
        tests") that could not be located in the paper's full text. The substance is restated as a
        paraphrase rather than dropped, and the wording should be re-checked against the article before it
        is quoted anywhere.
      - **a-stratification** partitions the bank into strata by the discrimination parameter (a) and
        administers **low-a items in early stages and high-a items in later stages**; in simulation it reduced
        the skewness of item-exposure distributions "while efficiency was maintained in trait level
        estimation" and "achieved a lower average exposure rate than CATs based on Bayesian or
        information-based item selection and the Sympson–Hetter method." *(Chang & Ying, 1999, "a-Stratified Multistage Computerized Adaptive Testing," *Applied Psychological Measurement* 23(3):211–222, DOI 10.1177/01466219922031338.)* `T1`
      - A refinement, **a-stratification with b-blocking**, requires b-parameter values to be evenly
        distributed across the a-strata and "improved control of item exposure rates and reduced mean squared
        errors" on a retired GRE bank. *(Chang, Qian & Ying, 2001, "a-Stratified Multistage CAT with b Blocking," *Applied Psychological Measurement* 25(4), DOI 10.1177/01466210122032181.)* `T1`
    - **DOK 2 — Summary:** Maximum-Fisher-information is the default item-selection rule but is unreliable early or far from the ability estimate, motivating Kullback–Leibler/global, true-posterior Bayesian (best for extreme ability and short tests), and a-stratification criteria.
    - **Link to source:** [https://doi.org/10.1177/014662169602000303](https://doi.org/10.1177/014662169602000303) | [https://doi.org/10.1007/BF02294775](https://doi.org/10.1007/BF02294775) | [https://doi.org/10.1177/01466219922031338](https://doi.org/10.1177/01466219922031338) | [https://doi.org/10.1177/01466210122032181](https://doi.org/10.1177/01466210122032181)
- **Subcategory 1.3: Stopping / termination rules (classification emphasis)**
  - **Source:** Wald (1947); Eggen (1999); Eggen & Straetmans (2000); Spray & Reckase (1996); Kingsbury & Weiss (1983); Thompson (2009); Bartroff, Finkelman & Lai (2008)
    - **DOK 1 — Facts:**
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
    - **DOK 2 — Summary:** Because this screener makes a single classification, the relevant stopping rules are the classification family (SPRT, confidence-interval/adaptive-mastery, GLR), which end as soon as the cut decision is statistically secure and are much shorter than fixed-length estimation — though textbook SPRT error rates inflate under adaptively selected items.
    - **Link to source:** [https://doi.org/10.1007/978-0-387-85461-8](https://doi.org/10.1007/978-0-387-85461-8) | [https://doi.org/10.7275/wqzt-9427](https://doi.org/10.7275/wqzt-9427) | [https://doi.org/10.1177/01466219922031365](https://doi.org/10.1177/01466219922031365) | [https://doi.org/10.1177/00131640021970862](https://doi.org/10.1177/00131640021970862) | [https://doi.org/10.3102/10769986021004405](https://doi.org/10.3102/10769986021004405) | [https://doi.org/10.1177/0013164408324460](https://doi.org/10.1177/0013164408324460) | [https://doi.org/10.1007/s11336-007-9053-9](https://doi.org/10.1007/s11336-007-9053-9)
- **Subcategory 1.4: Content balancing & constraint management**
  - **Source:** Kingsbury & Zara (1989, 1991); van der Linden & Reese (1998); Leung, Chang & Hau (2003)
    - **DOK 1 — Facts:**
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
    - **DOK 2 — Summary:** Content constraints (constrained CAT, shadow-test assembly) make routing meet a blueprint and stay auditable, at a cost of roughly 5–11% more items.
    - **Link to source:** [https://doi.org/10.1207/s15324818ame0204_6](https://doi.org/10.1207/s15324818ame0204_6) | [https://doi.org/10.1207/s15324818ame0403_4](https://doi.org/10.1207/s15324818ame0403_4) | [https://doi.org/10.1177/01466216980223006](https://doi.org/10.1177/01466216980223006)
- **Subcategory 1.5: Item-exposure & security control**
  - **Source:** Sympson & Hetter (1985); Stocking & Lewis (1995, 1998); Revuelta & Ponsoda (1998); van der Linden & Veldkamp (2004); Chang & Ansley (2003)
    - **DOK 1 — Facts:**
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
        the shadow-test assembly, and **a-stratification** (1.2) is itself categorized as a *stratification*
        exposure-control strategy, alongside SH (conditional selection) and Progressive (randomization).
        *(van der Linden & Veldkamp, 2004, "Constraining Item Exposure in Computerized Adaptive Testing With Shadow Tests," *Journal of Educational and Behavioral Statistics* 29(3), DOI 10.3102/10769986029003273; taxonomy per Georgiadou, Triantafillou & Economides, 2007, *JTLA* 5(8).)* `T1` (van der Linden & Veldkamp) / `T4` (Georgiadou review)
      - Independent comparisons report a "clear and logical trade-off between item exposure control and
        measurement precision," with **no single method possessing all desired characteristics**; the Stocking–
        Lewis conditional multinomial and the Davey–Parshall methods were judged most promising overall.
        *(Chang & Ansley, 2003, "A Comparative Study of Item Exposure Control Methods in Computerized Adaptive Testing," *Journal of Educational Measurement* 40(1):71–103, DOI 10.1111/j.1745-3984.2003.tb01097.x.)* `T1`
    - **DOK 2 — Summary:** Every exposure-control method buys item security by giving up some measurement precision, with no method dominating and the precision loss largest at extreme ability — exactly where a top-percentile cut sits.
    - **Link to source:** [https://doi.org/10.1002/j.2333-8504.1995.tb01660.x](https://doi.org/10.1002/j.2333-8504.1995.tb01660.x) | [https://doi.org/10.3102/10769986023001057](https://doi.org/10.3102/10769986023001057) | [https://doi.org/10.1111/j.1745-3984.1998.tb00541.x](https://doi.org/10.1111/j.1745-3984.1998.tb00541.x) | [https://doi.org/10.3102/10769986029003273](https://doi.org/10.3102/10769986029003273) | [https://doi.org/10.1111/j.1745-3984.2003.tb01097.x](https://doi.org/10.1111/j.1745-3984.2003.tb01097.x)
- **Subcategory 1.6: Bayesian item selection: Owen's sequential procedure and minimum expected posterior variance (MEPV)**
  - **Source:** Owen (1975); van der Linden (1998)
    - **DOK 1 — Facts:**
      - **Owen (1975)** originated the Bayesian line: an approximate empirical Bayes procedure for a
        three-parameter **normal-ogive** model that replaces the true posterior with **a normal
        approximation having the same mean and variance**, selects item *k* to satisfy
        **|bₖ − E(θ | u₁,…,uₖ₋₁)| < δ** for a small δ (i.e., difficulty closest to the **EAP**
        estimate), and **stops as soon as the posterior variance falls below a prespecified threshold**.
        *(Owen, 1975, "A Bayesian Sequential Procedure for Quantal Response in the Context of Adaptive Mental Testing," *Journal of the American Statistical Association* 70(350):351–356, DOI 10.1080/01621459.1975.10479871; procedure as described in van der Linden, 1998, DOI 10.1007/BF02294775.)* `T1` `[UNVERIFIED: 1975 original not directly resolved this session; description taken from van der Linden's (1998) account]`
      - **Owen also proposed the stronger criterion in the same paper** — "minimization of the
        **preposterior risk under a quadratic loss function**," which "selects the item that **minimizes
        the expected posterior variance**" — but it was "computationally … more involved" than the
        δ-rule, "and for this reason the latter became widely popular as Owen's procedure of adaptive
        testing." *(van der Linden, 1998, describing Owen, 1975, DOI 10.1007/BF02294775.)* `T1`
      - **MEPV, formally.** Selecting the *k*th item, weight the **posterior variance of θ after each
        possible response** by that response's **posterior predictive probability** and take the item
        minimising the sum, writing **u** for the responses already given to the first *k*−1 items:
        **iₖ = minⱼ { p(Uⱼ=0 | u)·Var(θ | u, Uⱼ=0) +
        p(Uⱼ=1 | u)·Var(θ | u, Uⱼ=1) }**. It is thus a **preposterior** rule: it scores an item by the
        uncertainty that will remain *after* the answer, not by information at a point.
        *(van der Linden, 1998, eq. 15, DOI 10.1007/BF02294775.)* `T1`
      - **Why the posterior variance rather than the information.** "Though the use of information
        measures for item selection is a well-established practice in IRT, **the reciprocal of the
        information measure is only a large-sample approximation to the true variance of the
        posterior**"; MEPV is therefore "**a small-sample alternative**" — i.e., it is specifically the
        criterion that stays correct while the ability estimate is still poor. *(van der Linden, 1998,
        DOI 10.1007/BF02294775.)* `T1`
      - MEPV sits in a family of true-posterior criteria proposed in the same paper — **maximum
        posterior-weighted information (MPWI)**, **maximum expected information (MEI)**, MEPV, and
        **maximum expected posterior-weighted information (MEPWI)** — of which MEI, MEPV and MEPWI are the
        ones that use the **posterior predictive distribution of the next response**. *(van der Linden,
        1998, DOI 10.1007/BF02294775.)* `T1`
      - **The criterion self-destructs as the test lengthens.** Asymptotically the Bayesian criteria
        "lead to the selection of the same items as the maximum-information criterion," and for MEPV
        specifically "both posterior variances converge to the reciprocal of Fisher's information"; hence
        "the choice of a Bayesian item selection criterion in adaptive testing **is not expected to lead
        to improved ability estimation … for long tests**." *(van der Linden, 1998, DOI 10.1007/BF02294775.)* `T1`
      - **Computation is a real cost, not a rounding error.** The four Bayesian criteria each required
        **1.0–1.5 seconds per item selection** on the study's hardware (a Pentium 133 PC); MEPV requires
        re-estimating the full posterior twice per candidate item at every step. *(van der Linden, 1998,
        DOI 10.1007/BF02294775.)* `T1` `[dated hardware; the transferable fact is the per-item cost relative to MFI, not the seconds]`
    - **DOK 2 — Summary:** MEPV picks the item that minimises the posterior variance expected *after* the response — originating with Owen (1975) and formalised by van der Linden (1998) — and its stated justification is precisely that Fisher information is only a large-sample approximation to that variance, so MEPV is the small-sample criterion that stays correct early and provably converges to maximum-information selection late.
    - **Link to source:** [https://doi.org/10.1080/01621459.1975.10479871](https://doi.org/10.1080/01621459.1975.10479871) | [https://doi.org/10.1007/BF02294775](https://doi.org/10.1007/BF02294775)
- **Subcategory 1.7: Weighted-information and Kullback–Leibler criteria: why maximum-information selection is unstable early**
  - **Source:** Veerkamp & Berger (1997); van der Linden (1998); Chang & Ying (1996); Rulison & Loken (2009)
    - **DOK 1 — Facts:**
      - The whole weighted family exists because the point estimate is untrustworthy early: "as long as the
        posterior distribution of the estimator has not yet converged to a single point, it may be
        **suboptimal to select an item with maximum information at a point estimate ignoring values of the
        ability parameter with substantial likelihood in its neighborhood**." *(van der Linden, 1998, DOI 10.1007/BF02294775.)* `T1`
      - **Veerkamp & Berger (1997)** proposed criteria that "take into account **the uncertainty of the
        ability estimates**" and gave "**a general weighted information criterion of which the usual
        maximum information criterion and the proposed alternative criteria are special cases**." Their
        simulation found "the **likelihood weighted information** criterion is a good alternative to the
        maximum information criterion," and that so is "a maximum information criterion with the maximum
        likelihood estimator of ability **replaced by the Bayesian expected a posteriori estimator**."
        *(Veerkamp & Berger, 1997, "Some New Item Selection Criteria for Adaptive Testing," *Journal of Educational and Behavioral Statistics* 22(2):203–226, DOI 10.3102/10769986022002203.)* `T1`
      - **Each weighting choice has its own failure mode.** For the **interval information** criterion, in
        the 2-PL "the integral is known to approach the value of the discrimination parameter aⱼ" as the
        interval widens, so "item selection becomes **independent of the value of the item difficulty
        parameter bⱼ** — a phenomenon contrary to the well-known importance of the difficulty parameter."
        **Likelihood weighting** improves on this, "but for the first few items the likelihood function is
        still relatively flat and item selection **may capitalize again on large values of aⱼ independent
        of the value of bⱼ**"; posterior weighting is described as "the only way out." *(van der Linden,
        1998, DOI 10.1007/BF02294775.)* `T1` — the "capitalize on high-a items" failure is the same
        mechanism a-stratification counteracts (**1.2**) and the reason exposure skews (**1.5**).
      - **Kullback–Leibler / global information** (Chang & Ying, 1996) belongs to this family as the
        non-Fisher way of averaging discriminating power over a region rather than at a point; its
        derivation and short-test result are owned by **1.2** and are not re-derived here. *(Chang & Ying, 1996, DOI 10.1177/014662169602000303.)* `T1` — cross-ref **1.2**.
      - **The concrete damage from early mis-targeting, at the top of the scale.** In a CAT, "**early
        mistakes by high-ability students can lead to considerable underestimation, even in tests with 45
        items**," and the error is **asymmetric**: "the opposite response pattern, where low-ability
        students start with lucky guesses, leads to **much less bias**." Using a four-parameter model
        (Barton & Lord) plus "**a less informative prior** can lower bias and root mean square error … for
        high-ability students with a poor start," and the 4PM "slightly outperform[ed] a CAT in which less
        discriminating items are initially used." *(Rulison & Loken, 2009, "I've Fallen and I Can't Get Up: Can High-Ability Students Recover From Early Mistakes in CAT?" *Applied Psychological Measurement* 33(2):83–101, DOI 10.1177/0146621608324023.)* `T1` `[simulation; directly on the high-ability tail]`
    - **DOK 2 — Summary:** Likelihood-weighted, posterior-weighted and Kullback–Leibler criteria all exist because maximum-information selection trusts a point estimate that is unreliable early, and the cost of getting that early window wrong is asymmetric and largest for high-ability examinees, who can stay substantially underestimated 45 items later.
    - **Link to source:** [https://doi.org/10.3102/10769986022002203](https://doi.org/10.3102/10769986022002203) | [https://doi.org/10.1007/BF02294775](https://doi.org/10.1007/BF02294775) | [https://doi.org/10.1177/014662169602000303](https://doi.org/10.1177/014662169602000303) | [https://doi.org/10.1177/0146621608324023](https://doi.org/10.1177/0146621608324023)
- **Subcategory 1.8: Empirical comparisons of selection criteria: does the sophistication actually pay?**
  - **Source:** van der Linden (1998); Chen, Ankenmann & Chang (2000); Choi & Swartz (2009); Thompson (2009)
    - **DOK 1 — Facts:**
      - **The originating simulation is favourable to MEPV.** On a 300-item 2-PL pool
        (a ~ U(0.5, 1.5), b ~ U(−4, 4)), test lengths n = 5/10/20/30, 250 replications per θ: "for all test
        lengths **the maximum information criterion had the worst MSE function**, followed by the maximum
        posterior-weighted information criterion"; "**the differences among the MSE functions for these
        three criteria [MEI, MEPV, MEPWI] were always negligible**"; and "**even after 30 items**, the MSE
        functions for [the] first two and last three criteria still **differed by a factor equal to 2**."
        *(van der Linden, 1998, DOI 10.1007/BF02294775.)* `T1`
      - **A design caveat on that comparison.** In the same study the maximum-information arm used
        "θ ~ U(−4.0, 4.0) as prior" (which, combined with MAP estimation, "yields an MLE for θ"), while the
        four Bayesian arms used an **informative empirical normal prior** derived from a background
        variable; criterion and prior are therefore **not fully separated** in the reported gap.
        *(van der Linden, 1998, procedures 1–5 and standard setup, DOI 10.1007/BF02294775.)* `T1`
        `[INFERENCE: the confound is read off the stated design, not claimed by the author]`
      - **Independent replication finds the advantage small and short-lived.** Comparing five rules —
        Fisher information (FI), Fisher interval information, Fisher information with a posterior, KL, and
        KL with a posterior — the four alternatives "**performed marginally better than FI at the early
        stages of CAT for θ = −3 and −2**," but "**for tests longer than 10 items, there appeared to be no
        precision advantage for any of the selection rules**." *(Chen, Ankenmann & Chang, 2000, "A Comparison of Item Selection Rules at the Early Stages of Computerized Adaptive Testing," *Applied Psychological Measurement* 24(3):241–255, DOI 10.1177/01466210022031705.)* `T1`
      - **A systematic six-criterion comparison finds no practical benefit.** "The results showed **no clear
        benefit from more sophisticated selection criteria**," and MEPWI — "previously believed to be
        superior" — was shown to be **mathematically equivalent to the simpler MPWI**. The authors conclude
        that "more complex and computing-intensive item selection procedures … with theoretical advantages
        **do not seem to provide practical benefits over the standard maximum information criterion in
        conjunction with the EAP**," and that "**the MFI using the EAP theta estimation was very
        competitive** (although the MEPV method would be preferred from the Bayesian perspective)."
        *(Choi & Swartz, 2009, "Comparison of CAT Item Selection Criteria for Polytomous Items," *Applied Psychological Measurement* 33(6):419–440, DOI 10.1177/0146621608327801.)* `T1` `[ADJACENT: polytomous graded-response banks of 30–60 items, health/psychology outcomes, not a dichotomous K–8 reasoning bank]`
      - **What the gain is actually attributable to.** The same authors argue that "**selecting an item
        based on summarizing the information for a range of theta values** (i.e., using a weight function
        such as the posterior distribution) as opposed to the information at a single point … **might be
        all that is necessary to achieve the performance gain**, and predicting the next observation using
        the predictive posterior distribution **may not be necessary**" — consistent with Veerkamp &
        Berger's finding that MFI evaluated at the EAP performs like the weighted criteria.
        *(Choi & Swartz, 2009, DOI 10.1177/0146621608327801; Veerkamp & Berger, 1997, DOI 10.3102/10769986022002203.)* `T1`
      - Reviews of the classification case reach the same verdict — "**no conclusive evidence on the
        substantial superiority of a single method**," with several methods that "assess items very
        similarly … and will usually select the same item." *(Thompson, 2009, DOI 10.1177/0013164408324460.)* `T1` `[COI: vendor-affiliated]` — full treatment in **1.3**.
      - `[gap]` These comparisons are run **unconstrained**; a caution in this literature is that
        differences between selection procedures "will probably be smaller" once exposure control and
        complex content balancing are added. *(Spray & Reckase, 1994, ED372078.)* `T4` `[conference paper]` —
        interaction with exposure control belongs to **1.5**; the only claim extracted here is that it
        **shrinks** criterion differences.
    - **DOK 2 — Summary:** MEPV's advantage over maximum Fisher information is real but modest and concentrated where the ability estimate is poor — the originating simulation reports a factor-of-two MSE gap (with prior and criterion partly confounded), while independent replications find no precision advantage past about ten items and no practical benefit over maximum information evaluated at the EAP, at a real per-item computational cost.
    - **Link to source:** [https://doi.org/10.1007/BF02294775](https://doi.org/10.1007/BF02294775) | [https://doi.org/10.1177/01466210022031705](https://doi.org/10.1177/01466210022031705) | [https://doi.org/10.1177/0146621608327801](https://doi.org/10.1177/0146621608327801) | [https://doi.org/10.1177/0013164408324460](https://doi.org/10.1177/0013164408324460)
- **Subcategory 1.9: Selecting for a classification decision at a cut vs. selecting to estimate ability**
  - **Source:** Spray & Reckase (1994); Huebner (2012); Weissman (2007); Eggen (1999); Thompson (2009)
    - **DOK 1 — Facts:**
      - **The two objectives are formally different problems.** Adaptive tests "seek to **estimate an
        examinee's ability parameter as accurately and precisely as possible, as opposed to categorizing
        the examinee**," and "the difference in the aims … lead to differences in how the two types of
        tests are delivered" — in both the **item-selection rule** and the **termination rule**.
        *(Huebner, 2012, "Item Overexposure in Computerized Classification Tests Using Sequential Item Selection," *Practical Assessment, Research & Evaluation* 17(12).)* `T4` `[open-access peer-reviewed e-journal; corroborative]`
      - **The core result: when the objective is a decision, the optimal item sits at the cut, not at the
        examinee.** "Results … provide very clear evidence that **selecting items to maximize information
        at the decision point results in shorter average test lengths than selecting items to maximize
        information either at true ability (which is impossible) or the most recent ability estimate**."
        *(Spray & Reckase, 1994, "The Selection of Test Items for Decision Making with a Computer Adaptive Test," NCME annual meeting, ERIC ED372078.)* `T4` `[conference paper; the peer-reviewed companion comparing SPRT to sequential Bayes is Spray & Reckase, 1996, in **1.3**]`
      - **A worked Rasch illustration of why.** With the cut at θ₀ = 0.0 and an examinee at θ = 1.0,
        testing H₀ at α = .05 needs **n = 3.78 items** when items are selected at the cut (b = 0.0, where
        the examinee's success probability is .73 against a null of .50) but **n = 4.26 items** when items
        are selected at the examinee's own ability (b = 1.0, where success is .50 against a null of .27) —
        matching the examinee **flattens the very contrast the decision rests on**. *(Spray & Reckase, 1994, ED372078.)* `T4`
      - **The gap widens exactly where a selective cut sits.** "When the **decision points are high
        relative to the prior distribution, or for high ability examinees**, the differences in average
        test length for the alternative item selection methods can be **quite dramatic** … This finding may
        be quite important when certification or licensure standards are fairly high, **or selection
        criteria are rigorous**." *(Spray & Reckase, 1994, ED372078.)* `T4` `[ADJACENT: college-placement item pool, pass/fail cuts; not a top-percentile K–8 cut]`
      - **The documented exception runs through the guessing floor.** The advantage of cut-based selection
        reverses "for very low ability examinees **when a model with nonzero lower asymptotes is used**";
        below about **θ = −1.5**, "selecting at the estimated ability may save one or two items," because
        cut-targeted items are so hard for those examinees that "the noise induced by the c parameter has a
        prominent effect." *(Spray & Reckase, 1994, ED372078.)* `T4` — see **1.10**.
      - **What cut-based selection costs.** It is barely adaptive to the person: "**all examinees start
        with the same items** (unless some sort of exposure control is used) and **the only adaptation that
        takes place is in the length of the test**." Consequently it forfeits the **inherent exposure
        control** that ability-matched selection provides — under ability matching "it is likely that a
        given pair of examinees will not have seen the same exact set of items," whereas under cut-based
        selection "it is **guaranteed that every examinee will see the most informative items in the
        pool**," so "the problem of item overexposure is **exacerbated**." *(Spray & Reckase, 1994, ED372078; Huebner, 2012, *PARE* 17(12).)* `T4` — exposure *mechanics* owned by **1.5**.
      - **What estimation-based selection costs.** It buys a θ estimate that is good across the scale at the
        price of more items to reach the same decision accuracy (above); conversely, cut-based selection
        concentrates precision at the cut, so the resulting θ is **not a general-purpose ability score away
        from the cut** — the two objectives are traded, not jointly optimised. `[INFERENCE]` — follows from
        Spray & Reckase (1994) plus the definition of the information function; no located source
        quantifies the off-cut precision loss for a top-percentile screener `[gap]`.
      - **Inside the classification problem the criterion ranking changes again.** For a four-category
        adaptive classification test, "**mutual information (MI) item selection classifies the highest
        proportion of examinees correctly and yields the shortest test lengths**. The next best performance
        is observed for **FIP** [posterior-weighted Fisher] item selection, followed by **FI**."
        *(Weissman, 2007, "Mutual Information Item Selection in Adaptive Classification Testing," *Educational and Psychological Measurement* 67(1):41–58, DOI 10.1177/0013164406288164.)* `T1` — consistent with
        Kullback–Leibler selection performing "better than or as well as" Fisher-based selection under the
        SPRT (Eggen, 1999, **1.3**).
      - **Counterweight.** Cut-based selection is not automatically best: "the efficiency of item selection
        approaches **depend on the termination criteria**," and "**item selection at the cut score, which
        seems conceptually appropriate for CCT, is not always the most efficient option**."
        *(Thompson, 2009, DOI 10.1177/0013164408324460.)* `T1` `[COI: vendor-affiliated]` — full treatment in **1.3**.
    - **DOK 2 — Summary:** When the objective is a classification at a cut rather than a score, the optimal item is located at the cut and not at the examinee — an advantage that is largest precisely for high, selective cuts — but cut-based selection buys that shorter test by giving up person-level adaptation, the inherent exposure control that ability matching provides, and precision in the ability estimate away from the cut.
    - **Link to source:** [https://files.eric.ed.gov/fulltext/ED372078.pdf](https://files.eric.ed.gov/fulltext/ED372078.pdf) | [https://openpublishing.library.umass.edu/pare/article/1344/](https://openpublishing.library.umass.edu/pare/article/1344/) | [https://doi.org/10.1177/0013164406288164](https://doi.org/10.1177/0013164406288164) | [https://doi.org/10.1177/0013164408324460](https://doi.org/10.1177/0013164408324460)
- **Subcategory 1.10: The guessing floor moves the information-optimal success rate above 50%**
  - **Source:** Birnbaum (1968) / Lord (1980); Magis (2013); Eggen & Verschoor (2006)
    - **DOK 1 — Facts:**
      - **Under 1-PL/2-PL, the information-optimal item is the coin-flip item.** With c = 0 the item
        information function "is maximized whenever x = 0.5, implying that θ = b is the optimal ability
        level." *(Magis, 2013, "A Note on the Item Information Function of the Four-Parameter Logistic Model," *Applied Psychological Measurement* 37(4):304–315, DOI 10.1177/0146621613475471.)* `T1`
      - **Under a non-zero lower asymptote it is not.** For the 3-PL, maximising information in P-space
        requires the roots of **p(x) = −2x² + x + c**, which "are equal to **0.25 ± √(1+8c)/4**"; the
        relevant (positive) root "**belongs to (0.5; 1)**". Equivalently, the optimal success probability
        is **P\* = (1 + √(1 + 8c)) / 4**, and the optimal ability is
        **θ\* = b + (1/a)·log[(1 + √(1 + 8c)) / 2]**. *(Magis, 2013, eqs. 21–23, DOI 10.1177/0146621613475471.)* `T1`
      - **The derivation is Birnbaum's, restated by Lord.** "With the 3PL model, the solution was provided
        by **Birnbaum (1968; see also Lord, 1980)**"; Magis's algebra "corresponds exactly to the result
        provided by Lord (1980)." *(Magis, 2013, DOI 10.1177/0146621613475471, citing Birnbaum, 1968, in Lord & Novick, *Statistical Theories of Mental Test Scores*, and Lord, 1980, *Applications of Item Response Theory to Practical Testing Problems*.)* `T1` (Magis) / `T2` (Birnbaum; Lord) `[UNVERIFIED: Birnbaum/Lord pages not directly resolved this session; the derivation is independently reproduced in Magis (2013)]`
      - **What it means for five-option items.** At **c = 0.20** (a five-option item guessed at chance),
        **P\* ≈ 0.653** — the information-maximising item is one the child gets right about **65%** of the
        time, not 50% — and the optimal difficulty sits **≈ 0.27/a logits below** the child's ability. For
        four options (c = 0.25), **P\* ≈ 0.683**. *(Values computed directly from P\* = (1 + √(1 + 8c))/4 as given in Magis, 2013, DOI 10.1177/0146621613475471.)* `T1` `[arithmetic from the cited formula, not a separately reported statistic]`
      - **Caveats on transferring the number.** Estimated c is frequently **below** the reciprocal of the
        number of options, so 0.653 is an upper anchor rather than a design constant; and if an **upper
        asymptote** (inattention) is modelled, the optimum moves again and no longer has the closed 3-PL
        form. *(Magis, 2013, deriving the 4-PL case, DOI 10.1177/0146621613475471.)* `T1` `[gap]` no located
        source calibrates c for a K–8 text-only reasoning bank.
      - **The 3-PL case is explicitly flagged as open in the adjacent literature.** Work on selecting easier
        or harder items notes that its methods "are **symmetric around the p-50 points** … only true for the
        1pl and 2pl model. Knowing that **the symmetry disappears**, it is worthwhile investigating the
        application of the selection method if the 3pl model, including a guessing parameter, is used."
        *(Eggen & Verschoor, 2006, DOI 10.1177/0146621606288890.)* `T1` — see **1.12**.
    - **DOK 2 — Summary:** Under a model with a guessing floor the information-maximising item is not the coin-flip item: the optimum sits at P\* = (1 + √(1 + 8c))/4, which for five-option items is about 65% success — so part of the gap between "information-optimal" and "child-tolerable" difficulty closes for free, and the symmetric easier/harder machinery built for 1-PL/2-PL banks no longer applies unchanged.
    - **Link to source:** [https://doi.org/10.1177/0146621613475471](https://doi.org/10.1177/0146621613475471) | [https://doi.org/10.1177/0146621606288890](https://doi.org/10.1177/0146621606288890)
- **Subcategory 1.11: Information-optimal difficulty vs. child effort and engagement (evidence on both sides)**
  - **Source:** Eggen & Verschoor (2006); Ortner, Weißkopf & Koch (2014); Ortner & Caspers (2011); Asseburg & Frey (2013); Martin & Lazendic (2018); Akhtar et al. (2023); Frey, Liu, Fink & König (2024)
    - **DOK 1 — Facts:**
      - **The premise is quantified, not rhetorical.** "**Maximum information item selection in CATs using
        an item bank that is calibrated with the one or the two-parameter logistic model results in each
        individual answering about 50% of the items correctly.**" *(Eggen & Verschoor, 2006, "Optimal Testing With Easy or Difficult Items in Computerized Adaptive Testing," *Applied Psychological Measurement* 30(5):379–393, DOI 10.1177/0146621606288890.)* `T1`
      - **Psychometricians themselves raise the child-specific worry.** CAT tests "can be perceived as very
        difficult for each individual student and this could have possible negative side effects, for
        example, **enhanced test anxiety and, consequently, possible lower test performance**. This could
        **especially be the case for tests which are administered in primary and secondary education**,
        where, traditionally, tests are constructed in such a way that the average student has … a somewhat
        **higher probability (60 or 70%)** of correctly answering the items." *(Eggen & Verschoor, 2006, DOI 10.1177/0146621606288890; report version, Cito Measurement and Research Department Report 2004-2.)* `T1` — an argued rationale, not an empirical finding.
      - **Against — adaptive delivery lowered motivation in adolescents.** In 174 students aged 15–21 given
        either a CAT or a fixed-item version of the same matrices test, "**more situational fear of failure
        and less subjective probability of success were reported using CAT compared to FIT**"; self-reported
        **flow did not differ**; and "as average reported motivation was lower during CAT, **results
        contradict assumptions of enhanced motivation during CAT**." *(Ortner, Weißkopf & Koch, 2014, "I Will Probably Fail: Higher Ability Students' Motivational Experiences During Adaptive Achievement Testing," *European Journal of Psychological Assessment* 30(1):48–56, DOI 10.1027/1015-5759/a000168.)* `T1` `[ADJACENT: ages 15–21, German secondary schools]` `[UNVERIFIED-year: Crossref indexes the issue as 2014; many records cite the 2013 online-first version]`
      - **Against — the harm is concentrated in anxious test-takers, and is partly an explanation problem.**
        Testing the hypothesis "that tests containing mainly **items with medium probabilities of being
        solved** would have negative effects on test performance for testtakers high in test anxiety," a
        study of 110 students aged 16–20 found "a **significant interaction of test anxiety and test
        mode**": the effect of test mode on score "was **stronger for students with higher scores on test
        anxiety**." Notably, "**getting information about CAT led to significantly better results than
        receiving standard test instructions**." *(Ortner & Caspers, 2011, "Consequences of Test Anxiety on Adaptive Versus Fixed Item Testing," *European Journal of Psychological Assessment* 27(3):157–163, DOI 10.1027/1015-5759/a000062.)* `T1` `[ADJACENT: ages 16–20; n = 110]`
      - **Against, with a twist — the effort/difficulty relation is linear, not an inverted U.** In
        **N = 9,452** German ninth-graders (PISA 2006 mathematics), "**ability-difficulty fit was positively
        linear related with effort and boredom/daydreaming**," and "overall, mean item difficulty exceeded
        individual ability," so "**low ability students may not show maximum performance** in a sequential
        achievement test." The same easing that raises effort also raises boredom; no optimum at 50% is
        observed. *(Asseburg & Frey, 2013, "Too hard, too easy, or just right? The relationship between effort or boredom and ability-difficulty fit," *Psychological Test and Assessment Modeling* 55(1):92–104.)* `T1` `[ADJACENT: ninth-graders; fixed sequential test, not adaptive]`
      - **For — the largest school-age study found no motivational penalty and a precision gain.** Among
        **N = 12,736** Australian students in **years 3, 5, 7 and 9**, adaptive (multistage) delivery
        "generated **lower achievement error rates (i.e., higher measurement precision)**," with positive
        motivation, engagement and subjective-experience effects "relatively greater for **females and older
        students**"; the authors state the findings "**counter claims that computer-adaptive testing reduces
        students' test-relevant motivation, engagement, and subjective experience**." *(Martin & Lazendic, 2018, "Computer-adaptive testing: Implications for students' achievement, motivation, engagement, and subjective test experience," *Journal of Educational Psychology* 110(1):27–45, DOI 10.1037/edu0000205.)* `T1` `[K–8 relevant: years 3–9]` `[ADJACENT: multistage routing vs fixed order — it does not manipulate the success-rate target]`
      - **For — meta-analysis finds no overall motivational effect of adaptivity either way.** Across 11
        direct CAT-vs-fixed comparisons, "**no overall effect of test type on anxiety and motivation** …
        (k = 11, g+ = 0.06, p = .28)"; only "two of the four studies on motivation and four of nine studies
        on anxiety … supported the benefits of CAT, while one of them showed the opposite result: a decrease
        in motivation under CAT." *(Akhtar, Silfiasari, Vekety & Kovacs, 2023, "The Effect of Computerized Adaptive Testing on Motivation and Anxiety: A Systematic Review and Meta-Analysis," *Assessment* 30(5):1379–1390, DOI 10.1177/10731911221100995.)* `T1`
      - **Both at once — but item difficulty is a significant moderator.** A larger meta-analysis
        (**27 studies, 190 effect sizes**) found "the overall effect of CAT was **not significant for
        motivation and negative emotion** and significant for positive emotion after publication bias
        correction," while moderator analysis found a significant effect of "**average difficulty of
        presented items**" on **negative emotion**; the authors recommend that CAT configurations "avoid
        speededness, **present easy items**, allow for response revision, and provide feedback."
        *(Frey, Liu, Fink & König, 2024, "Meta-Analysis of the Effects of Computerized Adaptive Testing on the Motivation and Emotion of Examinees," *European Journal of Psychological Assessment* 40(5):427–443, DOI 10.1027/1015-5759/a000821.)* `T1`
      - `[gap]` No located study manipulates the **target success probability** and measures effort,
        rapid-guessing or anxiety in a **K–8 gifted upper-tail** screener. Most of the child-age evidence
        contrasts *adaptive vs fixed delivery*, which is not the same manipulation; the one located study
        that varies the success target directly in school-age children is on a general middle-school
        mathematics assessment (**1.12**), not on a top-percentile reasoning screen.
    - **DOK 2 — Summary:** The evidence does not resolve the tension: adolescents report more fear of failure and lower success expectancy under adaptive delivery (worst for anxious test-takers), yet the largest school-age study and two meta-analyses find no overall motivational penalty from adaptivity — while both meta-analyses agree that the average difficulty of the items presented is one of the few moderators that does matter.
    - **Link to source:** [https://doi.org/10.1177/0146621606288890](https://doi.org/10.1177/0146621606288890) | [https://doi.org/10.1027/1015-5759/a000168](https://doi.org/10.1027/1015-5759/a000168) | [https://doi.org/10.1027/1015-5759/a000062](https://doi.org/10.1027/1015-5759/a000062) | [https://www.leibniz-ipn.de/en/research/publications/too-hard-too-easy-or-just-right](https://www.leibniz-ipn.de/en/research/publications/too-hard-too-easy-or-just-right) | [https://doi.org/10.1037/edu0000205](https://doi.org/10.1037/edu0000205) | [https://doi.org/10.1177/10731911221100995](https://doi.org/10.1177/10731911221100995) | [https://doi.org/10.1027/1015-5759/a000821](https://doi.org/10.1027/1015-5759/a000821)
- **Subcategory 1.12: Compromise designs: targeting a higher success probability, and its measured price**
  - **Source:** Bergstrom, Lunz & Gershon (1992); Eggen & Verschoor (2006); Ling, Attali, Finn & Stone (2017); Akhtar et al. (2023); Pitkin & Vispoel (2001)
    - **DOK 1 — Facts:**
      - **The mechanism.** Rather than selecting maximum information *at* the current ability estimate,
        select the item with maximum information at a **shifted** ability level; matching on an item's
        **probability points** (the p-60 or p-70 point) also works but "yields good results **only with the
        one-parameter logistic model and not with the two-parameter** logistic model," because it ignores
        the height of the information function. *(Eggen & Verschoor, 2006, DOI 10.1177/0146621606288890; the 1-PL precursor is Bergstrom, Lunz & Gershon, 1992, "Altering the Level of Difficulty in Computer Adaptive Testing," *Applied Measurement in Education* 5(2):137–149, DOI 10.1207/s15324818ame0502_4.)* `T1` `[UNVERIFIED: the 1992 paper is cited here as described by Eggen & Verschoor; original not directly resolved this session]`
      - **The price, in numbers.** In a large 2-PL bank with a 40-item test, mean standard error and mean
        percent-correct were: **max-information 0.083 at 50.1%**, **p-60 0.085 at 60.1%**, **p-70 0.091 at
        70.2%**, **p-80 0.106 at 79.7%**, **p-90 0.143 at 88.9%**, against **random selection 0.145 at
        50.4%**. Expressed as items needed to match the precision of a 30-item random test: **11 / 12 / 13 /
        17 / 29** respectively. *(Eggen & Verschoor, 2006, Tables 9–10, DOI 10.1177/0146621606288890.)* `T1` `[UNVERIFIED: table values read from the openly available Cito Measurement and Research Department Report 2004-2 preprint; the published table numbering was not directly resolved this session]`
      - **The authors' own verdict.** "**For practical purposes, item selection, aiming at percentages
        correct of 60 or 70 (or 40 or 30), seems to be possible without a large loss in precision**,"
        whereas "extreme values of the success probabilities are combined with a considerable loss in
        precision." *(Eggen & Verschoor, 2006, DOI 10.1177/0146621606288890.)* `T1`
      - **Exposure control makes the compromise more expensive and less accurate.** Adding Sympson–Hetter
        control at a maximum exposure rate of 0.3 cost "on average … **2 or 3 items**," and "**the
        discrepancy between the desired and the achieved percentages correct is larger when exposure control
        is applied**." *(Eggen & Verschoor, 2006, DOI 10.1177/0146621606288890.)* `T1` — exposure mechanics
        owned by **1.5**; the point retained here is that exposure control **constrains how precisely a
        success-rate target can be hit at all**.
      - **The compromise has been tested on children, and it worked — motivationally.** Middle-school
        students took a mathematics assessment under **fixed, adaptive, or easier-adaptive** conditions:
        "**the easier adaptive test resulted in higher engagement and lower anxiety than either the adaptive
        or fixed-item tests**," and "these effects were **not related to ability level**."
        *(Ling, Attali, Finn & Stone, 2017, "Is a Computerized Adaptive Test More Motivating Than a Fixed-Item Test?" *Applied Psychological Measurement* 41(7):495–511, DOI 10.1177/0146621617707556.)* `T1` `[K–8 relevant: middle school]` `[COI: all four authors Educational Testing Service]`
      - **But the motivational gain did not convert into a measurement gain.** In the same study, "results
        showed **little evidence for test type effects**" and "**no significant differences in performance
        were found across test types**"; the authors raise "the possibility that test experiences in
        adaptive tests may **not in practice be significantly different** than in fixed-item tests."
        *(Ling et al., 2017, DOI 10.1177/0146621617707556.)* `T1`
      - **Meta-analytically, "easier CAT" is the one configuration with a positive effect.** Against an
        overall null for CAT vs fixed-item testing, "**easier CAT had [a] positive effect compared with FIT
        (k = 2, g+ = .22, p < .001)**" — and the reviewers note this rests on the small number of studies
        that compared an easier CAT with a regular CAT. *(Akhtar et al., 2023, DOI 10.1177/10731911221100995.)* `T1` `[k = 2; small evidence base]`
      - **A related lever, and its trade.** Letting examinees choose difficulty themselves (self-adapted
        testing) "yielded proficiency estimates that were **0.12 standard deviation units higher** and
        post-test anxiety levels that were **0.19 standard deviation units lower** than those yielded by
        CATs," after controlling for measurement error — but self-adapted tests are **less precise and less
        efficient** than CATs. *(Pitkin & Vispoel, 2001, "Differences Between Self-Adapted and Computerized Adaptive Tests: A Meta-Analysis," *Journal of Educational Measurement* 38(3):235–247, DOI 10.1111/j.1745-3984.2001.tb01125.x.)* `T1` `[ADJACENT: mostly college samples]`
    - **DOK 2 — Summary:** Targeting a higher success probability is a solved engineering problem with a measured price — about 60–70% correct costs on the order of one or two extra items, and above that the precision loss climbs steeply — and in middle-schoolers an easier adaptive test did raise engagement and lower anxiety, but it produced no better scores, so the compromise is currently evidenced as an experience improvement rather than a measurement one.
    - **Link to source:** [https://doi.org/10.1207/s15324818ame0502_4](https://doi.org/10.1207/s15324818ame0502_4) | [https://doi.org/10.1177/0146621606288890](https://doi.org/10.1177/0146621606288890) | [https://doi.org/10.1177/0146621617707556](https://doi.org/10.1177/0146621617707556) | [https://doi.org/10.1177/10731911221100995](https://doi.org/10.1177/10731911221100995) | [https://doi.org/10.1111/j.1745-3984.2001.tb01125.x](https://doi.org/10.1111/j.1745-3984.2001.tb01125.x)

### Category 2: Item ordering, position & context effects

*General idea: How items are ordered has two distinct consequences the literature keeps separate: effects on total scores/experience and effects on the item parameters themselves.*

- **Subcategory 2.1: Difficulty ordering (easy→hard vs hard→easy vs random/spiraled): scores, anxiety, completion**
  - **Source:** Hambleton & Traub (1974); Tippets & Benson (1989); Plake et al. (1981); Leary & Dorans (1985); Davey & Lee (2011)
    - **DOK 1 — Facts:**
      - Hambleton & Traub (1974) reported that on a mathematics test the mean number of correct answers was **significantly lower** when items were arranged difficult-to-easy than when arranged easy-to-difficult, and that item order **affected the amount of stress** (measured physiologically) generated during the test. [T1; ADJACENT: sample not specified as K–8]
      - Tippets & Benson (1989) found, using an actual classroom exam with 128 graduate students, **significant effects of item arrangement on state test anxiety**; anxiety was highest under the hard-to-easy arrangement in one course and under the random arrangement in the other; the authors state item arrangement "may introduce a source of variance unrelated to content, thereby reducing the validity of achievement tests." [T1; ADJACENT: graduate students]
      - Plake et al. (1981) found, on a 48-item college mathematics exam assembled in three orderings (easy-hard, uniform, random) with/without knowledge of the arrangement, **no significant effect** of item order, knowledge of arrangement, or anxiety level on number-right or elimination scores (MANOVA/MANCOVA, α = .05); the authors note possible inadequate power. [T1; ADJACENT: undergraduates; UNVERIFIED: exact co-author list — ERIC lists "Plake, B. S.; And Others"]
      - Leary & Dorans (1985), reviewing the item-arrangement/context literature, concluded that the literature "has produced evidence of context effects, but has **not demonstrated that the effects are so strong as to invalidate** test theory or practice that is dependent on an assumption of item parameter invariance." [T1 review; COI: both authors ETS]
      - Davey & Lee (2011), as summarized by Ma & Harris (2024), reported that item-position effects influenced by **test speededness are a complicated function of test length, test difficulty, and time limits**. [T3 report; COI: ETS]
    - **DOK 2 — Summary:** Difficulty-ordering effects on total scores and anxiety are inconsistent — significant on speeded tests, null on power tests — and context effects are real but generally not strong enough to invalidate item-parameter invariance.
    - **Link to source:** [https://doi.org/10.1080/00220973.1974.10806302](https://doi.org/10.1080/00220973.1974.10806302) | [https://doi.org/10.1207/s15324818ame0204_2](https://doi.org/10.1207/s15324818ame0204_2) | [https://doi.org/10.1080/00220973.1981.11011786](https://doi.org/10.1080/00220973.1981.11011786)
- **Subcategory 2.2: Item-position effects on item difficulty (fatigue vs practice direction)**
  - **Source:** Christiansen & Janssen (2020); Albano et al. (2019); Albano (2013); Davis & Ferdous (2005); Weirich et al. (2017); Debeer et al. (2014); Wu et al. (2019); Nagy et al. (2018)
    - **DOK 1 — Facts:**
      - Christiansen & Janssen (2020) summarize that two opposite effects of item position on difficulty are observed: item difficulty may **increase** toward the end (a "fatigue" effect) or **decrease** toward the end (a "practice" effect). [T1; ADJACENT: 15-year-olds, foreign-language]
      - Albano et al. (2019) fit multilevel item-response models to an **early-literacy** measure and found statistically significant **increases in difficulty for items appearing later** in a 20-item form; the estimated linear change was **.024 logits per one-position increase**, i.e., a predicted **.46-logit** increase from the start to the end of the form. [T1; K–8: early education]
      - Albano (2013) modeled item position as a continuous variable using real data from a **K-12 reading achievement test** administered to over **90,000 students** (pilot items placed in random positions) and GRE pilot sections (~1,800 examinees), estimating position effects as **slopes (change in item difficulty per shift in position)**. [T1; K–8 relevant: K-12 reading]
      - Davis & Ferdous (2005) compared item difficulties (p-values and b-parameters) for the same items in field vs live administration and reported **declines in student performance as items dropped to later positions**; the item-position/difficulty relationship was statistically significant for Grade 5 Reading (Analysis 1), and correlation analyses were significant for all tested grade/subject combinations except Grade 3 Reading. [T4 conference/technical; K–8 grades]
      - Weirich et al. (2017) found, over a 60-minute large-scale assessment, a **substantial linear position effect (item difficulty increased across the test)** that **varied considerably across persons**; measured test-taking effort **diminished considerably across the test**, and only the **change** in effort (not initial effort) moderated the position effect. [T1; ADJACENT: German LSA]
      - Debeer et al. (2014) analyzed PISA 2009 reading (N = 467,819; 65 countries) and found a **consistent decrease in examinee effort across the test** ("persistence"), with individual differences within/between schools, **more pronounced in lower-performing countries**, concluding it is "important to model and control examinee effort in low-stakes assessments." [T1; ADJACENT: age 15]
      - Wu et al. (2019) analyzed PISA 2006/2009/2012 and found **individual differences in position effects (persistence)**; **girls sustained performance better than boys**, and students reporting greater reading enjoyment showed **less performance decline** (PISA 2009 reading). [T1; ADJACENT: age 15]
      - Nagy et al. (2018) modeled a reading-comprehension test with **random position effects on item difficulty and fixed position effects on item discrimination**, finding **gradually increasing difficulties and decreasing discriminations** toward the test end; variation in position effects related to students' **decoding speed and reading enjoyment**. [T1; ADJACENT: reading comprehension, secondary]
      - Christiansen & Janssen (2020) found, in the 2012 European Survey of Language Competences, **consistent item-position effects for listening comprehension but not for reading comprehension** across languages; for a large subset of items difficulty **decreased** with later position (practice effect). [T1; ADJACENT: 15-year-olds]
    - **DOK 2 — Summary:** Item-position effects on item difficulty are robustly documented — usually rising difficulty (a fatigue/effort-decline effect), sometimes falling (a practice effect) — vary across persons, and reach ~.024 logits per position in early education.
    - **Link to source:** [https://doi.org/10.1007/s11092-020-09335-7](https://doi.org/10.1007/s11092-020-09335-7) | [https://doi.org/10.1111/jedm.12215](https://doi.org/10.1111/jedm.12215) | [https://doi.org/10.1111/jedm.12026](https://doi.org/10.1111/jedm.12026) | [https://doi.org/10.1177/0146621616676791](https://doi.org/10.1177/0146621616676791) | [https://doi.org/10.3102/1076998614558485](https://doi.org/10.3102/1076998614558485) | [https://doi.org/10.1186/s40536-019-0073-6](https://doi.org/10.1186/s40536-019-0073-6) | [https://www.psychologie-aktuell.com/fileadmin/download/ptam/2-2018_20180627/03_PTAM-2-2018_Nagy_v2.pdf](https://www.psychologie-aktuell.com/fileadmin/download/ptam/2-2018_20180627/03_PTAM-2-2018_Nagy_v2.pdf)
- **Subcategory 2.3: Position effects and DIF (position as construct-irrelevant variance)**
  - **Source:** Debeer & Janssen (2013); Bulut, Guo & Gierl (2017); Bulut, Lei & Guo (2018); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - Debeer & Janssen (2013) showed that with a rotated booklet design, item difficulty and item position can be disentangled, and that item-position effects can be treated as **an instance of differential item functioning (DIF)** in which test-taker groups are defined by the booklet/position; a **linear trend** can summarize the DIF parameters across positions. [T1]
      - Bulut, Guo & Gierl (2017) introduced a **structural-equation-modeling (SEM)** approach (using the IRT / binary-factor-analysis equivalence) capable of estimating **form, passage-position, and item-position effects**, demonstrated on a large-scale reading assessment. [T1; UNVERIFIED-name: the journal's own citation string renders the middle author as "Quo"; the author's other records list "Qi Guo"]
      - Bulut, Lei & Guo (2018) applied the SEM approach to a computer-based **alternate assessment across grade bands 3–5, 6–8, and high school** and found the difficulty of some field-test items **differed depending on position**, and that overall field-test-task difficulty in **grade band 6–8 increased** as students reached it in later positions. [T1; K–8: grade bands 3–5, 6–8]
      - The *Standards for Educational and Psychological Testing* (AERA, APA & NCME, 2014) treat **construct-irrelevant variance** — score variance attributable to factors extraneous to the target construct — as a threat to validity, and treat **standardized administration conditions** as a basis for score comparability and fairness. [T2 canonical]
    - **DOK 2 — Summary:** Position effects are formally treated as construct-irrelevant variance and can be modeled as a form of DIF when subgroups receive different item sequences.
    - **Link to source:** [https://doi.org/10.1111/jedm.12009](https://doi.org/10.1111/jedm.12009) | [https://doi.org/10.1186/s40536-017-0042-x](https://doi.org/10.1186/s40536-017-0042-x) | [https://doi.org/10.1080/1743727X.2016.1262341](https://doi.org/10.1080/1743727X.2016.1262341)
- **Subcategory 2.4: Modeling position effects in IRT**
  - **Source:** Kingston & Dorans (1984); Debeer & Janssen (2013); Weirich, Hecht & Böhme (2014); Albano (2013); Hartig & Buchholz (2012); Rose et al. (2019)
    - **DOK 1 — Facts:**
      - Kingston & Dorans (1984) identified item-location (position/context) effects as **a form of multidimensionality**; investigated 10 GRE General Test item types and found 2 (analysis of explanations, logical diagrams) **clearly affected** and reading comprehension **somewhat affected**; and **strongly advised** that susceptible item types "not be used in an adaptive testing program without first assessing their susceptibility to location effects." [T1; COI: ETS]
      - Debeer & Janssen (2013) modeled item-position effects within the De Boeck & Wilson descriptive/explanatory IRT framework in a **one-step** procedure that can model effects on **both item difficulty and item discrimination** and can include **individual differences** in the position effect. [T1]
      - Weirich, Hecht & Böhme (2014) modeled item-position effects using the **linear logistic test model with an additional error term (LLTM + ε)** within a GLMM; it held the nominal Type-I rate under a **balanced** position design, and became **more conservative** (true effects less likely detected) as the design became less balanced. [T1; ADJACENT: German LSA]
      - Albano (2013) presented a **hierarchical generalized linear model** treating position as continuous and estimating position effects as **item × position interactions**. [T1]
      - Hartig & Buchholz (2012) proposed a **multilevel item-response model for item-position effects and individual persistence**, framing unmodeled position effects as a threat to IRT's local-independence assumption. [T1; ADJACENT: LSA]
      - Rose et al. (2019) used a GLMM parameterization of a multidimensional Rasch model to estimate **multiple context effects simultaneously** — within-block position, block position, domain order, and their interactions — on a booklet design drawn from three computerized adaptive tests, and reported that the **moderating effect of domain order was very strong**. [T1; ADJACENT: LSA calibration]
    - **DOK 2 — Summary:** Position effects are estimable within explanatory/GLMM/multilevel/SEM IRT frameworks on both item difficulty and discrimination, including individual differences in the effect.
    - **Link to source:** [https://doi.org/10.1177/014662168400800202](https://doi.org/10.1177/014662168400800202) | [https://doi.org/10.1111/jedm.12009](https://doi.org/10.1111/jedm.12009) | [https://doi.org/10.1177/0146621614534955](https://doi.org/10.1177/0146621614534955) | [https://doi.org/10.1111/jedm.12026](https://doi.org/10.1111/jedm.12026) | [https://doi.org/10.3389/fpsyg.2019.00248](https://doi.org/10.3389/fpsyg.2019.00248)
- **Subcategory 2.5: Context / carryover effects between items**
  - **Source:** Leary & Dorans (1985); Kingston & Dorans (1984); Wainer & Kiely (1987); Albano et al. (2020)
    - **DOK 1 — Facts:**
      - Leary & Dorans (1985) define an item's context by the features, content, and quantity of adjacent items, and note that when context changes, an item's **psychometric properties (difficulty, discrimination) can change**, biasing item-parameter estimates. [T1 review; COI: ETS]
      - Kingston & Dorans (1984) note that a within-test context effect implies that any equating method using item data should administer items in the **same position** across old and new forms, because a chain of equatings could otherwise **drift** through systematic bias. [T1; COI: ETS]
      - Wainer & Kiely (1987) introduced the **testlet** — "a group of items related to a single content area that is developed as a unit" — proposing it to alleviate **context effects, item-difficulty ordering, and content balancing** in computerized adaptive testing, so that each item "carries its own context with it." [T2 canonical; COI: ETS origin (RR-86-33)]
      - Albano et al. (2020) compared **blocked vs interleaved** task ordering (four alphabet-knowledge task types) in an early-childhood assessment: interleaving (varying item context) had a **negligible impact on mean performance** but produced **stronger internal-consistency reliability and improved item discrimination**, and **longer mean response time** (blocked 117.93 s vs interleaved 132.79 s; t95 = −2.67, p = 0.009; d = 0.51). [T1; K–8: early childhood]
    - **DOK 2 — Summary:** Adjacent-item context can shift an item's parameters (motivating the self-contained testlet), while interleaving standalone task types was psychometrically neutral-to-beneficial in an early-childhood measure.
    - **Link to source:** [https://doi.org/10.1177/014662168400800202](https://doi.org/10.1177/014662168400800202) | [https://doi.org/10.3389/feduc.2020.00133](https://doi.org/10.3389/feduc.2020.00133)
- **Subcategory 2.6: Warm-up / practice items and within-session practice/fatigue trends**
  - **Source:** Wing (1980); Christiansen & Janssen (2020); Albano et al. (2020)
    - **DOK 1 — Facts:**
      - Wing (1980) documented **practice effects with traditional mental-test items** (performance changes attributable to prior exposure/practice). [T1; ADJACENT: adults]
      - Christiansen & Janssen (2020) attribute the observed **decrease in difficulty at later positions** (for many items) to a **practice effect**, i.e., test-takers becoming more familiar with the task over the test. [T1; ADJACENT: 15-year-olds]
      - Albano et al. (2020) note in discussion that **initially unfamiliar / novel item types may become easier as test-takers "warm up" to them**, a mechanism producing decreasing difficulty across position. [T1; K–8: early childhood]
      - No located study isolates the **causal effect of dedicated (unscored) warm-up/practice items on subsequent scored-item difficulty, anxiety, or completion in a K–8 on-screen adaptive screener**; the warm-up rationale here is inferred from practice-effect direction and item-unfamiliarity findings. [gap]
    - **DOK 2 — Summary:** Falling difficulty at later positions for novel item types is attributed to a warm-up/practice effect, but no located study isolates the causal effect of dedicated unscored warm-up items in a K–8 adaptive screener.
    - **Link to source:** [https://doi.org/10.1007/s11092-020-09335-7](https://doi.org/10.1007/s11092-020-09335-7) | [https://doi.org/10.3389/feduc.2020.00133](https://doi.org/10.3389/feduc.2020.00133)
- **Subcategory 2.7: Ordering in fixed-form vs adaptive/MST delivery**
  - **Source:** Kingston & Dorans (1984); Albano et al. (2019); Davey & Lee (2011); Ma & Harris (2024)
    - **DOK 1 — Facts:**
      - Kingston & Dorans (1984) state that for computerized adaptive testing to be practical, **item pools that are unaffected by the order of administration are required**, and "the assumption of no location effect needs to be tested." [T1; COI: ETS]
      - Albano et al. (2019) ran a simulation of item-position effects within **item-level CAT** and found that ignoring position effects can introduce **non-negligible bias in person-ability estimation**. [T1; K–8: early education]
      - Davey & Lee (2011) reported item-position effects in GRE **multistage** data (scrambled linear forms and revised GRE) and found that **pretesting items in random locations** through the test can effectively mitigate position effects, at least when speededness effects are present. [T3 report; COI: ETS]
      - Ma & Harris (2024) compared approaches to controlling item-position effects in CAT and found that adjusting via a **pretesting design** or a **pool design** produced **better ability-estimation accuracy** than no adjustment or item-level adjustment. [T1]
    - **DOK 2 — Summary:** Ignoring position effects biases ability estimates in CAT, and the recommended control is pretesting items in multiple positions or pool-level calibration rather than item-level adjustment.
    - **Link to source:** [https://doi.org/10.1177/014662168400800202](https://doi.org/10.1177/014662168400800202) | [https://doi.org/10.1111/jedm.12215](https://doi.org/10.1111/jedm.12215)

### Category 3: Retakes & repeated administration

*General idea: Repeated administration is a decision-and-logistics policy: it reliably nudges scores up, and the size, fairness, and validity of that nudge depend on form type, interval, and number of occasions.*

- **Subcategory 3.1: Test–retest reliability vs. alternate-form reliability (what "the same test twice" even measures)**
  - **Source:** AERA/APA/NCME (2014), Standards for Educational and Psychological Testing, ch. 2
    - **DOK 1 — Facts:**
      - Classical test theory recognizes three broad families of reliability coefficient: **(a) alternate-form** (a *coefficient of equivalence* — alternate forms in independent sessions), **(b) test–retest** (a *coefficient of stability* — the **same** form on separate occasions), and **(c) internal-consistency** (single administration). *(AERA/APA/NCME, 2014, Standards for Educational and Psychological Testing, ch. 2, p. 37.)* `[T2]`
      - These coefficients are **not interchangeable** — "internal-consistency, alternate-form, and test–retest coefficients should not be considered equivalent, as each incorporates a unique definition of measurement error"; IRT error variances are generally not equivalent to those from other approaches. *(AERA/APA/NCME, 2014, **Standard 2.6** + comment.)* `[T2]`
      - When a test–retest or alternate-form approach is used, **the interval between administrations must be reported**, and it is unacceptable to report a bare "reliability = .90" without the design. *(AERA/APA/NCME, 2014, **Standard 2.19** comment.)* `[T2]`
      - The **reliability/precision of a difference (change) score can be much lower than the reliabilities of the two separate scores** it is computed from. *(AERA/APA/NCME, 2014, **Standard 2.4** comment.)* `[T2]`
      - Reliability is **lowest in the youngest children**: "preschool children tend to respond to test stimuli in a less consistent fashion than do older children." *(AERA/APA/NCME, 2014, **Standard 2.11** comment.)* `[T2]`
      - Reliability must be reported **per grade/age band**; a coefficient pooled across grades with steadily rising means "will generally give a spuriously inflated impression of reliability/precision." *(AERA/APA/NCME, 2014, **Standard 2.12**.)* `[T2]`
    - **DOK 2 — Summary:** Test–retest, alternate-form, and internal-consistency reliabilities are not interchangeable, the interval must be reported, a change score's reliability is lower than its components', and reliability is lowest in the youngest children and must be reported by age band.
    - **Link to source:** [https://www.testingstandards.net/](https://www.testingstandards.net/)
- **Subcategory 3.2: Overall practice/retest effect sizes (repeated administration raises scores)**
  - **Source:** Hausknecht et al. (2007); Scharfen, Peters & Holling (2018); Van Iddekinge & Arnold (2017)
    - **DOK 1 — Facts:**
      - Meta-analysis of cognitive-ability retesting in **selection**: 50 studies, **107 samples, N = 134,436**, **adjusted overall effect size d = .26** (uncorrected ≈ .24) — a *small* gain by Cohen's benchmarks; because cognitive ability is stable, factors other than true-ability change likely drive the gain. *(Hausknecht, Halpert, Di Paolo & Moriarty Gerrard, 2007, *Journal of Applied Psychology*, 92(2), 373–385, DOI 10.1037/0021-9010.92.2.373.)* `[T1][ADJACENT]`
      - Independent meta-analysis of cognitive-ability tests (broader than selection): **174 samples from 122 studies, 786 outcomes, N = 153,185**; retest effects were significant, with a mean **observed first-to-second standardized gain of SMCR ≈ 0.29** (bias-corrected standardized mean change, raw-score-standardized; interpretation ≈ Cohen's *d*; Table 1). *(Scharfen, Peters & Holling, 2018, *Intelligence*, 67, 44–66, DOI 10.1016/j.intell.2018.01.003.)* `[T1]`
      - **25%–50% of applicants** in organizational and educational settings are retested with cognitive-ability measures. *(Hausknecht et al., 2007.)* `[T1][ADJACENT]`
      - A recent review concludes retest scores tend to be **higher, more variable, more reliable, and to show somewhat stronger relations with criteria** (academic/job performance) than initial scores. *(Van Iddekinge & Arnold, 2017, *Annual Review of Organizational Psychology and Organizational Behavior*, 4, 445–471, DOI 10.1146/annurev-orgpsych-032516-113349.)* `[T1][ADJACENT]`
    - **DOK 2 — Summary:** Repeated administration reliably raises scores by a small amount (d ≈ .26; SMCR ≈ .29), and because ability is stable that gain is mostly not true-ability change.
    - **Link to source:** [https://doi.org/10.1037/0021-9010.92.2.373](https://doi.org/10.1037/0021-9010.92.2.373) | [https://doi.org/10.1016/j.intell.2018.01.003](https://doi.org/10.1016/j.intell.2018.01.003) | [https://doi.org/10.1146/annurev-orgpsych-032516-113349](https://doi.org/10.1146/annurev-orgpsych-032516-113349)
- **Subcategory 3.3: Effect size by FORM TYPE (identical vs. alternate/parallel)**
  - **Source:** Hausknecht et al. (2007); Scharfen et al. (2018); Kulik, Kulik & Bangert (1984); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - **Identical forms produce roughly twice the gain of alternate forms**: corrected **d = 0.46 (identical) vs. 0.24 (alternate)**. That scores rise *even across non-identical forms* shows the gain is not purely item memorization. *(Hausknecht et al., 2007.)* `[T1][ADJACENT]`
      - Test-form **equivalence was a significant moderator** in the largest cognitive-ability meta-analysis (identical > alternate). Secondary summaries report the first-to-second gain as **SMCR ≈ 0.37 (identical) vs. ≈ 0.23 (alternate)**. *(Scharfen et al., 2018; split value as reported in a secondary summary — d-nb.info/1270489011 — citing Scharfen et al.)* `[T1]` `[UNVERIFIED]` (split not located verbatim in the primary tables reviewed)
      - An earlier meta of **aptitude/achievement** tests (closest population to K–8 students) likewise found identical > alternate, **d ≈ 0.42 vs. 0.23**. *(Kulik, Kulik & Bangert, 1984, *American Educational Research Journal*, 21(2), 435–447, DOI 10.3102/00028312021002435; values as summarized in Scharfen et al., 2018 and secondary summary d-nb.info/1270489011.)* `[T1]` `[UNVERIFIED]`
      - Mechanism for the identical-form advantage: on an identical retest, examinees **recall prior answers and errors, freeing working-memory capacity** to attempt harder items — a test-specific strategy that is inapplicable when alternate (differently-worded) items are used. *(Cook & Campbell, 1979, as cited in Hausknecht et al., 2007; Scharfen et al., 2018, §1.3.2.)* `[T1]`
      - "Alternate form" is a term of art: forms **built to the same content and statistical specifications to measure the same construct**, with **equating** used to enhance cross-form comparability. *(AERA/APA/NCME, 2014, ch. 5, footnote on alternate forms; glossary "parallel forms".)* `[T2]`
    - **DOK 2 — Summary:** Identical forms produce roughly twice the gain of alternate forms (d ≈ 0.46 vs 0.24) because examinees recall answers and reallocate working memory — a strategy unavailable across alternate forms.
    - **Link to source:** [https://doi.org/10.3102/00028312021002435](https://doi.org/10.3102/00028312021002435)
- **Subcategory 3.4: Number of occasions (how many retakes before gains plateau)**
  - **Source:** Scharfen et al. (2018); Van Iddekinge & Arnold (2017); Hausknecht, Trevor & Farr (2002)
    - **DOK 1 — Facts:**
      - Score gains **plateau: no further significant score gains after the third administration**. *(Scharfen et al., 2018.)* `[T1]`
      - The relationship between number of retests and score change is **curvilinear** — scores improve from the initial test to the first retest and then stabilize (a pattern first noted on the U.S. Army Alpha in 1920). *(Van Iddekinge & Arnold, 2017.)* `[T1][ADJACENT]`
      - Field study of **N = 4,726** law-enforcement candidates on **identical** tests: significant score increases **both** 1st→2nd **and** 2nd→3rd administration. *(Hausknecht, Trevor & Farr, 2002, *Journal of Applied Psychology*, 87(2), 243–254, DOI 10.1037/0021-9010.87.2.243.)* `[T1][ADJACENT]`
    - **DOK 2 — Summary:** The retest gain is curvilinear and plateaus after about the third administration.
    - **Link to source:** [https://doi.org/10.1037/0021-9010.87.2.243](https://doi.org/10.1037/0021-9010.87.2.243)
- **Subcategory 3.5: Inter-test interval / spacing between retakes**
  - **Source:** Hausknecht et al. (2007); Scharfen et al. (2018)
    - **DOK 1 — Facts:**
      - **Shorter intervals produce larger gains; longer intervals produce smaller gains.** In the selection meta-analysis the median inter-test interval was only **20 days**. *(Hausknecht et al., 2007.)* `[T1][ADJACENT]`
      - Test–retest **interval was a significant moderator** with a **negative influence** on effect size; across primary studies the interval after which retest effects diminish ranged widely (≈ **2 to 13 years**). *(Scharfen et al., 2018, §1.3.3.)* `[T1]`
      - Mechanism: item-specific memory (recalled strategies, rules, and answers) decays with time, so short intervals preserve the recall advantage that inflates identical-form retests. *(Scharfen et al., 2018; Hausknecht et al., 2007.)* `[T1]`
    - **DOK 2 — Summary:** Shorter inter-test intervals produce larger gains because item-specific memory (recalled strategies and answers) decays with time.
    - **Link to source:** [https://doi.org/10.1037/0021-9010.92.2.373](https://doi.org/10.1037/0021-9010.92.2.373) | [https://doi.org/10.1016/j.intell.2018.01.003](https://doi.org/10.1016/j.intell.2018.01.003)
- **Subcategory 3.6: Retesting can change the *construct* and the *validity* of the score**
  - **Source:** Lievens, Reeve & Heggestad (2007); Van Iddekinge & Arnold (2017); Scharfen et al. (2018)
    - **DOK 1 — Facts:**
      - In a high-stakes setting (**N = 941**), a latent-variable analysis found **no measurement bias at initial testing, but retesting induced both measurement and predictive bias**: the retest factor was **less saturated with g and more associated with memory**, and these changes **eliminated the test's criterion-related validity**. *(Lievens, Reeve & Heggestad, 2007, *Journal of Applied Psychology*, 92(6), 1672–1682, DOI 10.1037/0021-9010.92.6.1672.)* `[T1][ADJACENT]`
      - There is direct evidence that **retesting can change the constructs test scores reflect**. *(Van Iddekinge & Arnold, 2017.)* `[T1][ADJACENT]`
      - The Scharfen meta isolated "pure" retesting: it **excluded any sample with a systematic between-test activity** (coaching, training, or medical intervention) and restricted to **sample mean ages 12–70** — i.e., **children under 12 were excluded** to avoid confounding retest gains with cognitive development. *(Scharfen et al., 2018, inclusion/exclusion criteria.)* `[T1]` `[gap]` (the practice-effect meta base does **not** cover the K–8 / ages 5–11 range)
    - **DOK 2 — Summary:** Retesting can change what the score measures — in one high-stakes sample it induced measurement and predictive bias and eliminated criterion validity as the retest factor drifted from g toward memory — and the practice-effect meta base excludes children under 12.
    - **Link to source:** [https://doi.org/10.1037/0021-9010.92.6.1672](https://doi.org/10.1037/0021-9010.92.6.1672)
- **Subcategory 3.7: Regression to the mean for extreme scorers *(cross-ref GA 8.2)***
  - **Source:** Van Iddekinge & Arnold (2017); companion GA 8.2 (Lohman & Korb, 2006; Warne, 2012)
    - **DOK 1 — Facts:**
      - Across studies, the share of a retest gain attributable to **regression toward the mean varies widely: ≈ 9%** (two Hausknecht primary studies), **25–30%** (Feinberg, medical credentialing), **44%** (Van Iddekinge, job-knowledge), **55%** (Raymond, certification), **≈ 60%** (Topp). *(Van Iddekinge & Arnold, 2017, review of primary studies.)* `[T1][ADJACENT]`
      - Regression effects are **larger when selection ratios are more lenient**, because applicants who initially failed and return to retest are a more extreme (lower-scoring) group. *(Van Iddekinge & Arnold, 2017.)* `[T1][ADJACENT]`
      - The specific instability of **extreme (gifted-tail) scorers on re-administration** — ~half of top-3% scorers fall out of the top 3% the next year; only ~35–40% remain top-3% from grade 3 to grade 8 — is owned by the companion brainlift **(GA 8.2; Lohman & Korb, 2006; Warne, 2012)** and is **not re-derived here**. `[T1]`
    - **DOK 2 — Summary:** Regression to the mean accounts for a highly variable 9–60% of observed gains and is worst for extreme, returning scorers, compounding the tail instability documented at the gifted cut.
    - **Link to source:** [https://doi.org/10.1146/annurev-orgpsych-032516-113349](https://doi.org/10.1146/annurev-orgpsych-032516-113349)
- **Subcategory 3.8: Reliable Change Index: did an *individual's* score really change?**
  - **Source:** Jacobson & Truax (1991)
    - **DOK 1 — Facts:**
      - The **Reliable Change Index** for one person's two scores is **RC = (x₂ − x₁) / S_diff**, where **S_diff = √2 × SE** and **SE = SD × √(1 − r_xx)** (r_xx = test reliability). **|RC| > 1.96** means the change is unlikely (p < .05) to be due to measurement error alone. *(Jacobson & Truax, 1991, *Journal of Consulting and Clinical Psychology*, 59(1), 12–19, DOI 10.1037/0022-006X.59.1.12.)* `[T2][ADJACENT]` (clinical-psychology origin; a domain-general statistic for individual change)
      - Jacobson & Truax pair the RCI with a second criterion (crossing a cutoff that separates two distributions), giving a **two-part definition of meaningful individual change** — reliable *and* threshold-crossing. *(Jacobson & Truax, 1991.)* `[T2][ADJACENT]`
    - **DOK 2 — Summary:** Whether an individual's score truly changed should be judged against a defensible threshold — the Reliable Change Index (|RC| > 1.96) plus a cutoff crossing — not a raw point difference.
    - **Link to source:** [https://doi.org/10.1037/0022-006X.59.1.12](https://doi.org/10.1037/0022-006X.59.1.12)
- **Subcategory 3.9: Subgroup-differential retest gains (fairness of allowing retakes)**
  - **Source:** Schleicher, Van Iddekinge, Morgeson & Campion (2010)
    - **DOK 1 — Facts:**
      - Across **written tests (N = 7,031)** and **performance tests (N = 2,060)**, **White applicants showed significantly larger retest gains than Black, Hispanic, and Asian applicants on all three written tests** (e.g., verbal-ability gain d = **0.12** White vs. **0.04** Black, **0.06** Hispanic, **0.04** Asian); **women and applicants under 40 gained more** than men and applicants 40+; and the differential White advantage was **larger on the written (more g-loaded) tests** than on performance tests. Practical implication: **allowing retakes can *exacerbate* adverse impact.** *(Schleicher, Van Iddekinge, Morgeson & Campion, 2010, *Journal of Applied Psychology*, 95(4), 603–617, DOI 10.1037/a0018920.)* `[T1][ADJACENT]`
    - **DOK 2 — Summary:** Retest gains differ by race, gender, and age, so an unmanaged retake right can widen subgroup gaps.
    - **Link to source:** [https://doi.org/10.1037/a0018920](https://doi.org/10.1037/a0018920)
- **Subcategory 3.10: Standards on classification consistency & retest policy (decision level)**
  - **Source:** AERA/APA/NCME (2014), Standards 2.16, 2.14, 13.2, 10.7, ch. 12
    - **DOK 1 — Facts:**
      - **When a test/composite is used for classification decisions, provide estimates of the percentage of test takers who would be classified the same way on two replications**; decision consistency "can and should be estimated directly through the use of a **test–retest approach**, if consistent with … test security and if the assumption of no change in the construct is met." *(AERA/APA/NCME, 2014, **Standard 2.16** + comment.)* `[T2]`
      - Report **conditional SEM in the vicinity of each cut score**. *(AERA/APA/NCME, 2014, **Standard 2.14**.)* `[T2]`
      - **When change/gain scores are used, report the construction procedure, technical qualities, and the time between administrations, and "care should be taken to avoid practice effects"**; the error of a change score exceeds the error of the scores it is built from. *(AERA/APA/NCME, 2014, **Standard 13.2** + comment.)* `[T2]`
      - Test takers must be told **before testing "whether the test taker will have an opportunity to retest, and under what circumstances retesting could occur."** *(AERA/APA/NCME, 2014, **Standard 10.7** comment; stated in the psychological-assessment chapter, disclosure principle is general.)* `[T2]`
      - In high-stakes decisions about students, fairness "can be enhanced by … providing students with **multiple opportunities** to demonstrate their capabilities." *(AERA/APA/NCME, 2014, ch. 12, educational-testing fairness discussion.)* `[T2]`
    - **DOK 2 — Summary:** The Standards treat repeated measurement as a decision-quality tool with documentation duties: estimate classification consistency (ideally via test–retest), report the interval, guard against practice effects, and disclose the retake policy in advance.
    - **Link to source:** [https://www.testingstandards.net/](https://www.testingstandards.net/)

### Category 4: Presentation & interaction design

*General idea: For a text-only screener, reading is treated as construct-relevant while every other presentation factor — interface, gesture, device, mode — remains construct-irrelevant variance to minimize and evidence.*

- **Subcategory 4.1: Text-only presentation: is reading load construct-relevant or construct-irrelevant?**
  - **Source:** AERA/APA/NCME (2014); Haladyna & Downing (2004); Abedi & Lord (2001)
    - **DOK 1 — Facts:**
      - The 2014 *Standards* define **construct-irrelevant variance (CIV)** as the "degree to which test scores
        are affected by processes that are extraneous to the test's intended construct." *(AERA/APA/NCME, 2014
        Standards; T2.)*
      - Standard 3.0 states all steps of the testing process "should be designed in such a manner as to
        **minimize construct-irrelevant variance**"; Standard 3.2 makes developers responsible for "minimizing
        the potential for tests' being affected by construct-irrelevant characteristics, such as **linguistic,
        communicative, cognitive, cultural, physical, or other characteristics**." *(AERA/APA/NCME, 2014
        Standards, pp. 63–64; T2.)*
      - Whether a given demand (e.g., reading) is "construct-relevant" or "construct-irrelevant" is defined
        **relative to the intended construct definition**, not in the abstract. *(Haladyna & Downing, 2004,
        DOI 10.1111/j.1745-3992.2004.tb00149.x — CIV taxonomy in a unitary validity framework; T1. Same
        definitional logic in AERA/APA/NCME, 2014; T2.)*
      - Empirically, when the intended construct was **mathematics**, reducing the **linguistic complexity** of
        released NAEP items produced significantly higher scores; English-language learners, low-SES students,
        and students in low/average math classes benefited most (n = 1,174 8th graders). This is presented by the
        authors as evidence that linguistic demand was construct-**irrelevant** variance *for the math construct*.
        *(Abedi & Lord, 2001, Applied Measurement in Education 14(3):219–234, DOI 10.1207/s15324818ame1403_2;
        T1. [ADJACENT]: grade 8, math achievement, ELL-focused — not a K–8 text-only reasoning screener.)*
      - The 2014 *Standards* distinguish **accommodations** (change delivery while retaining the intended
        construct → scores intended to be comparable) from **modifications** (change the intended construct →
        scores not necessarily comparable). *(AERA/APA/NCME, 2014 Standards; T2.)*

      > Note (no interpretation, boundary marker): whether *defining reading into the construct*
      > converts the Abedi-type "reading = CIV" finding into "reading = construct-relevant" is a **design/definitional
      > stance**, not an empirical result in the located sources. Recorded under Tensions, not asserted here. `[gap]`
    - **DOK 2 — Summary:** Whether a demand such as reading is construct-relevant or construct-irrelevant is defined relative to the intended construct, and developers are obligated to minimize construct-irrelevant variance — so defining reading into the construct is a design stance, not an empirical result.
    - **Link to source:** [https://doi.org/10.1111/j.1745-3992.2004.tb00149.x](https://doi.org/10.1111/j.1745-3992.2004.tb00149.x) | [https://doi.org/10.1207/s15324818ame1403_2](https://doi.org/10.1207/s15324818ame1403_2)
- **Subcategory 4.2: One-item-at-a-time vs. review-allowed (item review in CAT/MST)**
  - **Source:** Han (2013); Vispoel, Hendrickson & Bleiler (2000); Revuelta, Ximénez & Olea (2003); Olea et al. (2000)
    - **DOK 1 — Facts:**
      - **Most CAT programs do not allow test takers to review and change responses**, because unrestricted
        review "could seriously deteriorate the efficiency of measurement and make tests vulnerable to
        manipulative test-taking strategies" (the "Wainer-like" strategy of deliberately mis-answering to steer
        easier item selection, then revising). *(Han, 2013, Applied Psychological Measurement 37(4):259–275,
        DOI 10.1177/0146621612473638; T1. [ADJACENT]: high-stakes adult CAT.)*
      - When review is **restricted to items within successive blocks**, live testing showed **no trustworthy
        differences** across review conditions in proficiency estimates, measurement error, or testing time;
        more answers changed wrong→right than right→wrong, and most examinees who changed answers improved their
        estimate. *(Vispoel, Hendrickson & Bleiler, 2000, Journal of Educational Measurement 37(1):21–38,
        DOI 10.1111/j.1745-3984.2000.tb01074.x; T1. [ADJACENT]: adult vocabulary CAT.)*
      - Across administration types (adaptive, easy-adaptive, fixed) and four review conditions, **response
        review improved ability estimates and increased testing time**, and did not degrade estimation
        precision beyond the test-type differences already present. *(Revuelta, Ximénez & Olea, 2003,
        Educational and Psychological Measurement, DOI 10.1177/0013164403251282; n = 557 undergraduates; T1.
        [ADJACENT]: adults.)*
      - **Anxiety effect of review is not consistently replicated:** one study found state-anxiety **decreased**
        in review conditions and slightly increased without review *(Olea, Revuelta, Ximénez & Abad, 2000,
        Psicológica 21:157–173; T1, [ADJACENT] adults)*; a later study by an overlapping team found **no
        psychological effect on anxiety** from review *(Revuelta, Ximénez & Olea, 2003, DOI 10.1177/0013164403251282;
        T1, [ADJACENT] adults)*. No located study measures item-review anxiety effects in **K–8 children**. `[gap]`
    - **DOK 2 — Summary:** Item review is disabled by default in CAT to protect efficiency and prevent manipulation, but restricted within-block review preserves precision and tends to raise estimates, with anxiety effects inconsistent across studies and unstudied in children.
    - **Link to source:** [https://doi.org/10.1177/0146621612473638](https://doi.org/10.1177/0146621612473638) | [https://doi.org/10.1111/j.1745-3984.2000.tb01074.x](https://doi.org/10.1111/j.1745-3984.2000.tb01074.x) | [https://doi.org/10.1177/0013164403251282](https://doi.org/10.1177/0013164403251282)
- **Subcategory 4.3: Response / interaction formats (selected- vs constructed-response; tap/drag/click)**
  - **Source:** Rodriguez (2003); Bhavnani et al. (2019); Passell et al. (2021)
    - **DOK 1 — Facts:**
      - In a meta-analysis of 67 studies (56 disattenuated correlations), **multiple-choice (selected-response)
        and constructed-response items measured essentially the same construct when they were stem-equivalent**
        (mean disattenuated correlation approaching unity, ≈ .95), and diverged when non-stem-equivalent
        (≈ .85–.86, lowest for essay-type CR). *(Rodriguez, 2003, Journal of Educational Measurement
        40(2):163–184, DOI 10.1111/j.1745-3984.2003.tb01102.x; T1. [ADJACENT]: mixed ages, largely not young
        children.)*
      - In young children, **gesture type is not equally easy**: in DEEP piloting, tapping "came intuitively to
        the majority of children (9/10)," whereas **drag-and-drop was more difficult for children without prior
        smartphone exposure and required practice to master**; the developers therefore **clustered games by
        response type (tapping first, then drag-and-drop)** to avoid repeated gesture-switching. *(Bhavnani et al.,
        2019, Global Health Action 12:1548005, DOI 10.1080/16549716.2018.1548005; T1 pilot. [ADJACENT]: rural
        Indian preschoolers, assessor-administered.)*
      - Cross-domain corroboration that interface *input mode* is a distinct source of variance: device UI
        differences (screen size, mouse vs. touchscreen) produced significant performance differences on tasks
        "requiring fast reactions or fine motor movements," while an **untimed vocabulary measure was relatively
        unaffected**. *(Passell, … & Germine, 2021, Behavior Research Methods 53(6):2544–2557,
        DOI 10.3758/s13428-021-01597-3; N = 59,587; T1. [COI]: senior author directs/advises nonprofit assessment
        orgs, no financial compensation reported. [ADJACENT]: adult online sample.)*
    - **DOK 2 — Summary:** Selected- and constructed-response items are construct-equivalent when stem-equivalent, and among gestures tapping is more accessible than drag-and-drop for young or low-exposure children.
    - **Link to source:** [https://doi.org/10.1111/j.1745-3984.2003.tb01102.x](https://doi.org/10.1111/j.1745-3984.2003.tb01102.x) | [https://doi.org/10.1080/16549716.2018.1548005](https://doi.org/10.1080/16549716.2018.1548005) | [https://doi.org/10.3758/s13428-021-01597-3](https://doi.org/10.3758/s13428-021-01597-3)
- **Subcategory 4.4: Device / screen-size / touch effects on scores**
  - **Source:** Traylor et al. (2021); Brown, Grossenbacher & Warman (2023); Passell et al. (2021); Way et al.
    - **DOK 1 — Facts:**
      - A meta-analysis reported that in **operational (applicant) samples**, non-mobile test takers scored on
        average **0.79 SD higher** on general-mental-ability tests than mobile test takers (15 operational
        samples), but in **non-operational samples the device effect was negligible (d = 0.05)**. *(Traylor et al.,
        2021, as reported and corroborated in Brown, Grossenbacher & Warman, 2023; T1 meta-analysis
        [UNVERIFIED — exact venue/DOI not located; magnitude corroborated by ≥2 independent sources]. [ADJACENT]:
        adult employment selection.)*
      - Directly testing that gap: before adjustment, non-mobile applicants scored **0.58 SD** higher; after
        **propensity-score weighting to control self-selection, the device effect shrank by over 50% to d = 0.25**
        (and smaller under the average-treatment-on-matched estimate). The authors conclude operational device
        effects are likely inflated by **self-selection**, and recommend **random assignment** to establish device
        effects for any new/adapted test. *(Brown, Grossenbacher & Warman, 2023, Journal of Applied Psychology
        108(7):1190–1206, DOI 10.1037/apl0001067; T1. [ADJACENT]: adults.)*
      - Device effects concentrate in **speeded / reaction-time / fine-motor** measurement, not in untimed
        ability measures. *(Passell, … & Germine, 2021, DOI 10.3758/s13428-021-01597-3; T1. [ADJACENT] adults;
        [COI] as above.)*
      - Practitioner framing of "form factor": desktop and laptop scores are generally comparable (similar form
        factor), but tablets differ (smaller screens limit how much is visible at once; finger/touch input), so
        tablet↔computer comparability should not be assumed without evidence. *(Way, Davis, Keng & Strain-Seymour,
        device-comparability paper, NCME/ACARA; T3 practitioner/conference. [ADJACENT].)*
    - **DOK 2 — Summary:** Operational device effects on ability scores are large but roughly halve once self-selection is controlled and concentrate in speeded/fine-motor tasks, so device comparability must be established (ideally by random assignment) rather than assumed.
    - **Link to source:** [https://doi.org/10.1037/apl0001067](https://doi.org/10.1037/apl0001067) | [https://doi.org/10.3758/s13428-021-01597-3](https://doi.org/10.3758/s13428-021-01597-3)
- **Subcategory 4.5: Mode comparability (paper vs. digital) requirements**
  - **Source:** Wang et al. (2007, 2008); Kingston (2009); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - Meta-analysis of K–12 **mathematics** tests found **no statistically significant** paper-vs-computer
        administration-mode effect; mode differences were **larger for linear than for adaptive** delivery.
        *(Wang, Jiao, Young, Brooks & Olson, 2007, Educational and Psychological Measurement 67(2):219–238,
        DOI 10.1177/0013164406288166; T1. [ADJACENT]: MC achievement, not a reasoning screener.)*
      - Meta-analysis of K–12 **reading** tests likewise found **no statistically significant** mode effect.
        *(Wang, Jiao, Young, Brooks & Olson, 2008, Educational and Psychological Measurement 68(1):5–24,
        DOI 10.1177/0013164407305592; T1. [ADJACENT] as above.)*
      - Synthesis of 81 studies (1997–2007): overall mode effect was **very small (≈ −0.01 weighted)** and
        **grade level had no effect on comparability**, but **subject mattered** — a small computer advantage in
        ELA (0.11) and social studies (0.15), and a small paper advantage in mathematics (−0.06); roughly a third
        of effect sizes exceeded |0.1|. *(Kingston, 2009, Applied Measurement in Education 22(1):22–37,
        DOI 10.1080/08957340802558326; T1. [ADJACENT] as above.)*
      - The 2014 *Standards* require **comparability evidence** when scores from different modes/conditions are
        treated as interchangeable; "small on average" meta-analytic effects do not license skipping a
        program-specific comparability study. *(AERA/APA/NCME, 2014 Standards; T2.)*
    - **DOK 2 — Summary:** Paper-versus-digital mode effects in K–12 are small on average and grade-independent but subject-dependent, and still require program-specific comparability evidence.
    - **Link to source:** [https://doi.org/10.1177/0013164406288166](https://doi.org/10.1177/0013164406288166) | [https://doi.org/10.1177/0013164407305592](https://doi.org/10.1177/0013164407305592) | [https://doi.org/10.1080/08957340802558326](https://doi.org/10.1080/08957340802558326)
- **Subcategory 4.6: Instructions / onboarding: self-teaching demos + unscored warm-up trials**
  - **Source:** Mukherjee et al. (2020); companion GA 13.7
    - **DOK 1 — Facts:**
      - In the gamified preschool assessment **DEEP**, prediction accuracy was **not impacted by prior exposure
        to touchscreen games**: of 200 children, 87 (43.5%) had no prior touchscreen-game experience, yet the
        DEEP–BSID prediction error did **not differ significantly** between the prior-exposure and no-exposure
        groups (unpaired t-test **p = 0.28**). The authors attribute this to "the ease of play engineered during
        DEEP's design, as well as the addition of a 'demo' phase which allowed children to practice playing the
        games before data was collected." Performance was recorded only during play-mode. *(Mukherjee et al., 2020,
        Frontiers in Psychology 11:1202, DOI 10.3389/fpsyg.2020.01202; T1 proof-of-concept.)*
      - **Critical constraint-relevant caveat:** DEEP's demo phase was **not wordless and not self-administered**.
        "The assessor delivers **verbal instructions** during a demo-mode," teaches and lets the child practice
        "with help from the assessor if required," and "in cases where children are not able to follow verbal
        instructions … the assessor **holds the child's index finger to guide** him/her" on the tap/drag gesture.
        *(Mukherjee et al., 2020, DOI 10.3389/fpsyg.2020.01202; T1.)* Therefore this study does **not** demonstrate
        that a **text-only, no-audio, fully-automated self-teaching demo** (the text-only, automated-scoring requirement) neutralizes
        prior-exposure bias; it demonstrates that **human verbal + physical scaffolding** did. `[gap]` `[ADJACENT]`
      - The general principle that an assessment should **teach the task format before scoring** (demonstration,
        sample, and teaching items) so that "did not understand the task/controls" is not scored as low ability is
        established at the measurement-quality level and is **not re-derived here** (see Cross-references, **GA 13.7**).
    - **DOK 2 — Summary:** The strongest evidence that a demo phase neutralizes prior-exposure bias (DEEP) used assessor verbal instruction and physical guidance, so it does not validate a text-only, no-audio, fully-automated self-teaching demo — a genuine evidence gap.
    - **Link to source:** [https://doi.org/10.3389/fpsyg.2020.01202](https://doi.org/10.3389/fpsyg.2020.01202)

### Category 5: Cognitive load & working memory

*General idea: Cognitive Load Theory separates a scored task's essential (construct-relevant) difficulty from removable presentation artifacts — with the text-only rule foreclosing the single strongest remedy.*

- **Subcategory 5.1: Cognitive Load Theory — the three load types via *element interactivity***
  - **Source:** Sweller (1988); Sweller, van Merriënboer & Paas (1998/2019); Sweller (2010)
    - **DOK 1 — Facts:**
      - Working memory (WM) is severely limited when processing **novel** information; task/instructional
        design should direct that limited WM toward the target and away from incidental processing.
        *(Sweller, 1988, DOI 10.1207/s15516709cog1202_4; Sweller, van Merriënboer & Paas, 1998/2019, DOIs
        10.1023/A:1022193728205, 10.1007/s10648-019-09465-5.)* `[ADJACENT: learning]` `[proponent]`
      - **Intrinsic load** = the number of interacting elements that must be held in WM simultaneously
        (**element interactivity**) *relative to the solver's existing schemas* — i.e., the task's inherent
        difficulty for that person. **Extraneous load** = element interactivity created by *how* the material
        is presented (not essential to the task). In the 2019 reconceptualization, **germane load** is *not* a
        third additive source but the WM resources actually devoted to the essential (intrinsic) interactivity.
        *(Sweller, 2010, DOI 10.1007/s10648-010-9128-5; Sweller, van Merriënboer & Paas, 2019, DOI
        10.1007/s10648-019-09465-5.)* `[ADJACENT: learning]` `[proponent]`
      - Intrinsic + extraneous load draw on the **same fixed WM budget**; when their sum exceeds capacity,
        performance/learning degrades. *(Sweller, van Merriënboer & Paas, 1998/2019.)* `[ADJACENT: learning]`
    - **DOK 2 — Summary:** A fixed, limited working memory serves intrinsic load (essential element interactivity) and extraneous load (created by presentation), and performance degrades when their sum exceeds capacity.
    - **Link to source:** [https://doi.org/10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4) | [https://doi.org/10.1023/A:1022193728205](https://doi.org/10.1023/A:1022193728205) | [https://doi.org/10.1007/s10648-019-09465-5](https://doi.org/10.1007/s10648-019-09465-5) | [https://doi.org/10.1007/s10648-010-9128-5](https://doi.org/10.1007/s10648-010-9128-5)
- **Subcategory 5.2: The CLT design effects — and why the text-only design (text-only) removes the *modality* remedy**
  - **Source:** Chandler & Sweller (1991, 1992); Kalyuga, Chandler & Sweller (1999); Ginns (2005)
    - **DOK 1 — Facts:**
      - **Split-attention effect:** requiring learners to mentally integrate two mutually-referring sources
        separated in space/time (e.g., a diagram and its explanatory text) raises extraneous load and lowers
        outcomes vs a physically **integrated** presentation. Adding *seemingly useful but nonessential*
        explanatory material can itself be deleterious. *(Chandler & Sweller, 1991, DOI
        10.1207/s1532690xci0804_2; see also Chandler & Sweller, 1992, DOI 10.1111/j.2044-8279.1992.tb01017.x.)*
        `[ADJACENT: learning]`
      - **Redundancy effect:** presenting the *same* information in two forms at once (e.g., identical spoken
        **and** on-screen text) imposes load from the redundant stream and can lower outcomes; removing the
        redundant source helps. *(Kalyuga, Chandler & Sweller, 1999, DOI 10.1002/(SICI)1099-0720(199908)13:4<351::AID-ACP589>3.0.CO;2-6.)*
        `[ADJACENT: learning]`
      - **Modality effect:** distributing essential information across the **visual + auditory** channels
        (graphics + *spoken* text) outperforms all-visual (graphics + *printed* text); meta-analysis of 43
        independent effects supports it, with larger effects for high-element-interactivity material and
        system-paced presentation. *(Ginns, 2005, DOI 10.1016/j.learninstruc.2005.07.001; corroborated by
        Kalyuga, Chandler & Sweller, 1999.)* `[ADJACENT: learning]`
      - **Applied note (inference, flagged):** The single most powerful classical remedy for split-attention /
        high element interactivity is **off-loading text to the auditory channel** (the modality effect). Under
        **the text-only design (text-only, never audio)** that remedy is **foreclosed by design**. Because item stems, options,
        *and* stimuli must all compete for the **visual** channel, the split-attention/redundancy risk is if
        anything **heightened**, and extraneous-load control must rely on the remaining visual-only levers:
        physical integration, redundancy elimination, segmenting/one-at-a-time, and pre-taught formats. *(Inference
        from Ginns 2005 + Kalyuga 1999 + Chandler & Sweller 1991 applied to the text-only design.)* `[inference]`
    - **DOK 2 — Summary:** The classic load-reduction remedies are the split-attention, redundancy, and modality effects, but the strongest — offloading text to audio — is foreclosed by a text-only rule, which if anything intensifies split-attention risk on the single visual channel.
    - **Link to source:** [https://doi.org/10.1207/s1532690xci0804_2](https://doi.org/10.1207/s1532690xci0804_2) | [https://doi.org/10.1111/j.2044-8279.1992.tb01017.x](https://doi.org/10.1111/j.2044-8279.1992.tb01017.x) | [https://doi.org/10.1002/(SICI)1099-0720(199908)13:4<351::AID-ACP589>3.0.CO;2-6](https://doi.org/10.1002/(SICI)1099-0720(199908)13:4<351::AID-ACP589>3.0.CO;2-6) | [https://doi.org/10.1016/j.learninstruc.2005.07.001](https://doi.org/10.1016/j.learninstruc.2005.07.001)
- **Subcategory 5.3: Working-memory capacity — how much can be held at once**
  - **Source:** Miller (1956); Cowan (2001)
    - **DOK 1 — Facts:**
      - Immediate-memory span ≈ **7 ± 2 "chunks"** (Miller's estimate); capacity is counted in *chunks*, and
        what counts as a chunk **depends on the person's prior knowledge**. *(Miller, 1956, DOI 10.1037/h0043158.)*
        `[general cog-sci; adult]`
      - When chunking and rehearsal are experimentally blocked, the **"pure" capacity limit is ~4 chunks
        (range ≈ 3–5)** — materially lower than 7. *(Cowan, 2001, DOI 10.1017/S0140525X01003922.)*
        `[general cog-sci; adult → ADJACENT for children]`
    - **DOK 2 — Summary:** Working memory holds only about four chunks when chunking and rehearsal are blocked — materially fewer than the classic 7±2 — and what counts as a chunk depends on prior knowledge.
    - **Link to source:** [https://doi.org/10.1037/h0043158](https://doi.org/10.1037/h0043158) | [https://doi.org/10.1017/S0140525X01003922](https://doi.org/10.1017/S0140525X01003922)
- **Subcategory 5.4: Working-memory DEVELOPMENT across the K–8 age span**
  - **Source:** Gathercole, Pickering, Ambridge & Wearing (2004); Baddeley & Hitch (1974)
    - **DOK 1 — Facts:**
      - Across ages **4–15**, the three-component WM structure (central executive, phonological loop,
        visuospatial sketchpad; the Baddeley & Hitch, 1974 model) is identifiable **from age 6**, and **each
        component's functional capacity increases roughly linearly from early childhood through adolescence.**
        *(Gathercole, Pickering, Ambridge & Wearing, 2004, DOI 10.1037/0012-1649.40.2.177.)* `[directly on-point: K–8]`
      - **Extract (from the same data):** the K–8 band straddles a period of **large WM growth**, so a *fixed*
        item/interface complexity imposes a **different relative load** on a kindergartener than on an 8th-grader.
        *(Gathercole et al., 2004.)* `[on-point]`
    - **DOK 2 — Summary:** Working-memory capacity grows roughly linearly across the K–8 span, so a fixed item/interface complexity imposes a different relative load on a kindergartener than on an eighth-grader.
    - **Link to source:** [https://doi.org/10.1037/0012-1649.40.2.177](https://doi.org/10.1037/0012-1649.40.2.177)
- **Subcategory 5.5: The reasoning ⇄ working-memory confound — why "measure reasoning, not WM/load" is only *partly* achievable**
  - **Source:** Kyllonen & Christal (1990); Hagemann et al. (2023); Sweller (2010)
    - **DOK 1 — Facts:**
      - Latent **reasoning-ability and WM-capacity factors correlate r ≈ .80–.90** across four adult samples
        (N ≈ 723, 412, 415, 594). *(Kyllonen & Christal, 1990, DOI 10.1016/S0160-2896(05)80012-1.)*
        `[ADJACENT: adult]`
      - **Experimentally** loading the central executive during Advanced Progressive Matrices **causally
        lowered** matrix performance (accounting for ~15% of APM variance), yet WM did **not** explain all
        fluid-reasoning variance → fluid reasoning is *more than* WM. *(Hagemann, Ihmels, Bast, Neubauer,
        Schankin & Schubert, 2023, DOI 10.3390/jintelligence11040070.)* `[ADJACENT: adult]`
      - **Extract (inference):** For fluid-reasoning items, a substantial share of WM demand is **intrinsic /
        construct-relevant** — it cannot be removed without changing what is measured. Only **extraneous** load
        (interface, controls, instructions) is cleanly reducible. *(Synthesis of Kyllonen & Christal 1990 +
        Hagemann et al. 2023 + Sweller 2010.)* `[inference]`
    - **DOK 2 — Summary:** Fluid reasoning is itself heavily working-memory-loaded (r ≈ .80–.90), so working-memory demand cannot be purged without changing the construct — only extraneous (interface/instruction) load is cleanly reducible.
    - **Link to source:** [https://doi.org/10.1016/S0160-2896(05)80012-1](https://doi.org/10.1016/S0160-2896(05)80012-1) | [https://doi.org/10.3390/jintelligence11040070](https://doi.org/10.3390/jintelligence11040070)
- **Subcategory 5.6: How load interacts with ADAPTIVITY and item ordering**
  - **Source:** Sweller (2010); Kalyuga, Ayres, Chandler & Sweller (2003)
    - **DOK 1 — Facts:**
      - Because intrinsic load scales with element interactivity, **harder adaptive items inherently impose
        more WM load**; as difficulty adapts upward, the WM "headroom" left for any extraneous load **shrinks**.
        *(Sweller, 2010.)* `[ADJACENT / inference]`
      - **Expertise reversal effect:** load-reducing supports (worked examples, extra guidance) that help
        low-knowledge learners **lose effectiveness or become harmful** for higher-knowledge learners, because
        now-redundant guidance turns into extraneous load. *(Kalyuga, Ayres, Chandler & Sweller, 2003, DOI
        10.1207/s15326985ep3801_4.)* `[ADJACENT: learning]` `[proponent]`
      - **Extract (inference):** a *fixed* scaffold/instruction level is **not load-neutral** across the wide
        ability range an adaptive test deliberately targets; and front-loading high-intrinsic-load items leaves
        no low-load warm-up to build a format schema first (see GA 13.7 teaching items; ordering detail belongs
        to Cat 2). *(Inference from Kalyuga et al. 2003 + Sweller 2010.)* `[inference]`
    - **DOK 2 — Summary:** Reducible headroom shrinks precisely as adaptivity pushes items harder, and a fixed scaffold is not load-neutral across the wide ability range an adaptive test targets (the expertise-reversal effect).
    - **Link to source:** [https://doi.org/10.1207/s15326985ep3801_4](https://doi.org/10.1207/s15326985ep3801_4)
- **Subcategory 5.7: The measurement bridge & fairness anchor (on-point, not adjacent)**
  - **Source:** AERA/APA/NCME (2014), ch. 3 'Fairness in Testing'
    - **DOK 1 — Facts:**
      - The AERA/APA/NCME (2014) *Standards* place **fairness** in the foundational tier (parallel to validity
        and reliability); an **overarching standard** is that the **entire testing process be designed to
        minimize construct-irrelevant variance**. **Accessibility** is defined as "the *unobstructed
        opportunity* for all examinees to demonstrate their standing on the construct(s) being measured," and
        test design should reduce barriers (universal design). The fairness chapter's examples **explicitly
        include young children.** *(AERA, APA & NCME, 2014, *Standards for Educational and Psychological
        Testing*, Ch. 3 "Fairness in Testing"; ISBN 978-0-935302-35-6.)* `[T2; directly on-point]`
      - **Extract:** extraneous cognitive load from interface/instructions is, in *measurement* language, a
        source of **construct-irrelevant variance** and an **access barrier** — this is the mechanism by which
        CLT (a learning theory) attaches to a *scored* screener. `[bridge]`
    - **DOK 2 — Summary:** Extraneous load is, in measurement language, construct-irrelevant variance and an access barrier — the mechanism by which a learning theory attaches to a scored screener — and the Standards make minimizing it a foundational fairness obligation that explicitly includes young children.
    - **Link to source:** [https://www.testingstandards.net/](https://www.testingstandards.net/)
- **Subcategory 5.8: The sharp counter-pole — DESIRABLE DIFFICULTIES (a learning claim, in a measurement context)**
  - **Source:** Bjork & Bjork (2011); Soderstrom & Bjork (2015)
    - **DOK 1 — Facts:**
      - **Desirable difficulties** (spacing, interleaving, varying conditions of practice, and using tests/
        retrieval as study events) **reduce performance *during* acquisition but improve long-term retention
        and transfer.** They are "desirable" **only if** the learner has the background to respond successfully;
        otherwise they are "**undesirable** difficulties." *(E. L. Bjork & R. A. Bjork, 2011, "Making things
        hard on yourself, but in a good way," in *Psychology and the Real World*, Worth, pp. 56–64; term origin
        R. A. Bjork, 1994.)* `[ADJACENT: learning]` `[proponent]` `[no DOI — book chapter]`
      - **Learning ≠ performance:** learning (a durable, latent change in capability) and performance (current,
        observable behavior) are **dissociable**, and some manipulations have **opposite** effects on the two;
        therefore **current performance is an unreliable index of learning.** *(Soderstrom & Bjork, 2015, DOI
        10.1177/1745691615569000.)* `[ADJACENT: learning]`
      - **Extract (tension seed, not resolved here):** a gifted screener is a **one-shot performance/measurement**
        event that must read *current standing* accurately — it is **not** a learning event. The regime in which
        desirable difficulties pay off (durable learning measured *later*) is **not** the regime the screener
        operates in. `[DOK-3 seed → Tensions]`
    - **DOK 2 — Summary:** Desirable difficulties improve durable learning measured later but depress current performance, and since a one-shot screener must read current standing rather than learning, it sits in the opposite regime — a live tension, not a resolution.
    - **Link to source:** [https://doi.org/10.1177/1745691615569000](https://doi.org/10.1177/1745691615569000)

### Category 6: Session design & developmental fit

*General idea: For a low-stakes child screener the failure mode of 'too long' is disengagement rather than exhaustion, so design should follow measured effort and the developmental attention gradient, not attention-span myths.*

- **Subcategory 6.1: Test length, time-on-task, and cognitive fatigue**
  - **Source:** Ackerman & Kanfer (2009); Sievertsen, Gino & Piovesan (2016)
    - **DOK 1 — Facts:**
      - In a within-subject experiment (N=239 first-year university students), SAT batteries of 3.5, 4.5, and 5.5 hr
        were compared; **subjective fatigue rose monotonically with time-on-task, but mean *performance* did not fall —
        it was slightly *higher* in the longer conditions** (≈ +15 points for the 5.5-hr vs shorter session), and
        personality/interest/motivation trait complexes predicted fatigue better than test length did.
        *(Ackerman & Kanfer, 2009, J. Experimental Psychology: Applied, 15(2):163–181, DOI 10.1037/a0015719.)*
        `[ADJACENT]` — motivated, incentivized **adults**; establishes that "long ≠ automatically worse data" only
        when effort is high, which is not guaranteed in a low-stakes child screener (see 6.2).
      - Using the **full population** of Danish public-school children (ages 8–15, 2009/10–2012/13),
        **each additional hour later in the day reduced test performance by 0.9% of an SD (95% CI 0.7–1.0%)**, and
        **low-performing students were hurt more** by accumulated fatigue.
        *(Sievertsen, Gino & Piovesan, 2016, PNAS, 113(10):2621–2624, DOI 10.1073/pnas.1516947113.)* T1.
        `[gap]` sample starts at age 8 → weakest for the K-1 band (ages 5–6).
    - **DOK 2 — Summary:** Motivated adults tolerate very long batteries without a performance drop, but in a full child population scores fall ≈0.9% SD per hour later in the day and low performers are hurt more — so 'too long' fails through disengagement, not classical exhaustion.
    - **Link to source:** [https://doi.org/10.1037/a0015719](https://doi.org/10.1037/a0015719) | [https://doi.org/10.1073/pnas.1516947113](https://doi.org/10.1073/pnas.1516947113)
- **Subcategory 6.2: Effort/engagement decline across item position (rapid-guessing) — the concrete data-quality mechanism**
  - **Source:** Wise (2006); Wise & Kong (2005); Wise, Pastor & Kong (2009); Wise (2017)
    - **DOK 1 — Facts:**
      - On a low-stakes computer-based test, **the two strongest predictors of the effort an item received were item
        length (amount of reading/scanning) and item *position*** — items later in the test received less effort;
        treating rapid-guess responses as missing **lowered reliability but raised validity**.
        *(Wise, 2006, Applied Measurement in Education, 19(2):95–114, DOI 10.1207/s15324818ame1902_2.)* T1. `[ADJACENT]` older/low-stakes sample.
      - **Response Time Effort (RTE)** operationalizes "solution behavior vs. rapid-guessing" from item response times;
        rapid-guessed items are answered too fast to have read the item and are **correct only at chance rates**.
        *(Wise & Kong, 2005, Applied Measurement in Education, 18(2):163–183, DOI 10.1207/s15324818ame1802_2.)* T1.
      - Modeling examinee/item predictors (HGLM): **items with more text, or occurring later in the test, produced more
        rapid guessing; adding a graphic reduced it.** *(Wise, Pastor & Kong, 2009, Applied Measurement in Education,
        22(2):185–205, DOI 10.1080/08957340902754650.)* T1. `[ADJACENT]` (sole examinee predictor was SAT score → college sample).
      - A rapid guess is framed as the examinee **"opt[ing] out of being measured"; it carries no ability signal and
        distorts scores regardless of high- or low-stakes context**, so scoring it "makes little sense."
        *(Wise, 2017, Educational Measurement: Issues and Practice, 36(4), DOI 10.1111/emip.12165.)* T1. Ties **(GA 13.8)**.
    - **DOK 2 — Summary:** Effort declines and rapid-guessing rises with item length and later position; rapid guesses carry no ability signal, so scoring them makes little sense and treating them as missing raised validity.
    - **Link to source:** [https://doi.org/10.1207/s15324818ame1902_2](https://doi.org/10.1207/s15324818ame1902_2) | [https://doi.org/10.1207/s15324818ame1802_2](https://doi.org/10.1207/s15324818ame1802_2) | [https://doi.org/10.1080/08957340902754650](https://doi.org/10.1080/08957340902754650) | [https://doi.org/10.1111/emip.12165](https://doi.org/10.1111/emip.12165)
- **Subcategory 6.3: Breaks and session segmentation**
  - **Source:** Sievertsen, Gino & Piovesan (2016); AERA/APA/NCME (2014), ch. 6
    - **DOK 1 — Facts:**
      - In the same Danish population, **a 20-to-30-minute break improved subsequent performance by 1.7% of an SD
        (95% CI 1.2–2.2%) — a gain *larger* than the ≈0.9%/hr fatigue decrement**; the authors caution that
        **a break after *every* hour nets negative** (the hourly loss is smaller than one break's setup), so breaks
        should be placed to recharge, not to fragment. *(Sievertsen, Gino & Piovesan, 2016, PNAS, DOI 10.1073/pnas.1516947113.)* T1.
      - Standardized-administration conditions — **including timing, breaks, and instructions — are part of the
        standardization that must be defined, held constant, and documented**; departures can threaten score comparability.
        *(AERA, APA & NCME, 2014, Standards for Educational and Psychological Testing, Ch. 6 "Test Administration, Scoring,
        Reporting, and Interpretation.")* T2. Interacts with 6.7 (multi-sitting) and **(GA 13.7)**.
    - **DOK 2 — Summary:** A single 20–30-minute break restores more than an hour's fatigue loss, but breaking too often nets negative, so segmentation should recharge rather than fragment — and timing and breaks are part of documented standardization.
    - **Link to source:** [https://doi.org/10.1073/pnas.1516947113](https://doi.org/10.1073/pnas.1516947113)
- **Subcategory 6.4: Developmental sustained-attention by age (what actually develops)**
  - **Source:** Betts, McKay, Maruff & Anderson (2006); Ruff & Capozzoli (2003)
    - **DOK 1 — Facts:**
      - In children 5–12 (N=57), **sustained attention develops rapidly from 5–6 to 8–9 years and then plateaus from
        8–9 to 11–12** (only minor further gains, i.e., roughly adult-like by ~age 10); **high-load tasks produced
        poorer performance than low-load at every age, with the same developmental trajectory.**
        *(Betts, McKay, Maruff & Anderson, 2006, Child Neuropsychology, 12(3):205–221, DOI 10.1080/09297040500488522.)*
        T1. `[COI-minor]` — author Maruff is affiliated with CogState, the instrument used; the age-plateau pattern is corroborated below.
      - Observational study (N=172 at 10, 26, 42 months): **focused attention increases and casual/distractible attention
        decreases with age**, i.e., a steep early developmental gradient in the capacity to sustain and defend attention.
        *(Ruff & Capozzoli, 2003, Developmental Psychology, 39(5):877–890, DOI 10.1037/0012-1649.39.5.877.)* T1.
        `[ADJACENT]` (below school age, but establishes the age-gradient direction).
    - **DOK 2 — Summary:** Sustained attention climbs steeply from ages 5–6 to 8–9 and then plateaus (roughly adult-like by ~age 10), and high-load tasks depress performance at every age.
    - **Link to source:** [https://doi.org/10.1080/09297040500488522](https://doi.org/10.1080/09297040500488522) | [https://doi.org/10.1037/0012-1649.39.5.877](https://doi.org/10.1037/0012-1649.39.5.877)
- **Subcategory 6.5: The "attention span ≈ age in minutes" rule (and the "10–15 min" / "8-second" claims) — [UNVERIFIED] / likely myth**
  - **Source:** Bradbury (2016); Wilson & Korn (2007); Maybin/BBC News (2017)
    - **DOK 1 — Facts:**
      - The popular rule that a child's attention span equals **"~2–3 minutes per year of age"** (or the softer
        "1 minute per year") is repeated across parenting/education outlets **as a rule of thumb with no identifiable
        peer-reviewed primary source**. *(e.g., popular restatement: Times of India parenting, 2021.)* **T4 / `[UNVERIFIED]`.**
        It contradicts the developmental evidence in 6.4, which shows attention is **task-, load-, interest-, and
        context-dependent**, not a fixed minutes-per-year constant.
      - The analogous classroom claim that **student attention "declines after 10–15 minutes" is not supported by primary
        data** — it traces to a single 1978 report, is never quantitatively defined, and clicker/observation studies show
        waxing-and-waning with **no reliable downward trend**; individual differences dominate.
        *(Bradbury, 2016, Advances in Physiology Education, 40(4):509–513, DOI 10.1152/advan.00109.2016; Wilson & Korn, 2007,
        Teaching of Psychology, 34(2):85–89, DOI 10.1080/00986280701291291.)* T1 (reviews).
      - The "human attention span is 8 seconds, less than a goldfish" statistic traces to a **2015 Microsoft Canada
        "Attention Spans" report citing "Statistic Brain," with no verifiable underlying study**, and has been debunked.
        *(Maybin, BBC News, 2017 — "Busting the attention span myth.")* **T4 / `[UNVERIFIED]` (debunked).**
      - **Net:** design to *measured* effort/attention (6.2 RTE, response-time logging) and to the developmental gradient
        (6.4), **not** to any fixed "minutes = age" or "10-minute" clock. `[UNVERIFIED]` claims must not become config constants.
    - **DOK 2 — Summary:** The 'attention span ≈ age in minutes,' '10–15-minute,' and '8-second' rules trace to no credible primary source and contradict the developmental evidence, so they must not be hard-coded as design constants.
    - **Link to source:** [https://doi.org/10.1152/advan.00109.2016](https://doi.org/10.1152/advan.00109.2016) | [https://doi.org/10.1080/00986280701291291](https://doi.org/10.1080/00986280701291291)
- **Subcategory 6.6: Time-of-day / accumulated-fatigue effects**
  - **Source:** Sievertsen, Gino & Piovesan (2016)
    - **DOK 1 — Facts:**
      - Test **performance is systematically lower later in the school day** (−0.9% SD per hour; 6.1/6.3 source), a
        predictable, external bias on scores that a standardized screener can control by fixing or recording
        administration time. *(Sievertsen, Gino & Piovesan, 2016, PNAS, DOI 10.1073/pnas.1516947113.)* T1.
        Relates to speed/processing cautions in **(GA 15.1)** and standardization **(GA 13.7)**.
    - **DOK 2 — Summary:** Performance is systematically lower later in the school day (−0.9% SD per hour), a predictable external bias a standardized screener can control by fixing or recording administration time.
    - **Link to source:** [https://doi.org/10.1073/pnas.1516947113](https://doi.org/10.1073/pnas.1516947113)
- **Subcategory 6.7: Age-band design constraints: motor/touch, reading, attention (K-1 / 2-3 / 4-5 / 6-8)**
  - **Source:** Vatavu, Cramariuc & Schipor (2015); Hourcade (2008); Seymour, Aro & Erskine (2003)
    - **DOK 1 — Facts:**
      - **Motor/touch (K-1, 2-3):** In children 3–6 (N=89 children + 30 adults), **tap and drag-and-drop touch
        performance — target-acquisition accuracy and completion time — improved significantly with age and remained
        worse than adults**, and correlated with finger dexterity and graphomotor/visuospatial ability.
        *(Vatavu, Cramariuc & Schipor, 2015, Int. J. Human-Computer Studies, 74:54–76, DOI 10.1016/j.ijhcs.2014.10.007.)* T1.
      - **Design synthesis for children:** interface/motor demands must be matched to developmental level; young children
        show high within- and between-child variability and slower input, so targets, gestures, and visual complexity
        must be simplified. *(Hourcade, 2008, "Interaction Design and Children," Foundations & Trends HCI, 1(4):277–392,
        DOI 10.1561/1100000006.)* T2 (canonical review). Effort spent decoding controls is effort not spent reasoning — see **(GA 13.4)**.
      - **Reading (K-1 barrier under a text-only design):** in English, **word-reading accuracy is only ~34% in grade 1, rising to
        ~76% in grade 2, and English foundation literacy develops >2× slower than shallow orthographies** (≥2 years of
        experience needed). *(Seymour, Aro & Erskine, 2003, British Journal of Psychology, 94(2):143–174,
        DOI 10.1348/000712603321661859.)* T1. **Implication:** a **text-only** screen at K-1 largely measures
        decoding, not reasoning, for most 5–6-year-olds — a hard session-design/feasibility constraint, not an
        accommodation question. `[gap]` no verified per-band "max on-screen minutes" standard exists for young children.
      - **Attention band mapping (from 6.4):** 6-8 ≈ near-plateau (most adult-like sustained attention); 4-5 mid-development;
        2-3 and especially K-1 have the steepest fatigue/off-task risk and the tightest motor+reading limits.
    - **DOK 2 — Summary:** The binding K-1 constraints are touch/motor precision and — critically under a text-only design — English decoding, which is only ~34% accurate in grade 1, so a text-only screen at K-1 largely measures decoding rather than reasoning.
    - **Link to source:** [https://doi.org/10.1016/j.ijhcs.2014.10.007](https://doi.org/10.1016/j.ijhcs.2014.10.007) | [https://doi.org/10.1561/1100000006](https://doi.org/10.1561/1100000006) | [https://doi.org/10.1348/000712603321661859](https://doi.org/10.1348/000712603321661859)
- **Subcategory 6.8: Splitting a battery across blocks/sittings/days: the single-sitting tradeoff**
  - **Source:** AERA/APA/NCME (2014), ch. 6
    - **DOK 1 — Facts:**
      - **Within-day segmentation with a recharge break is net-positive** (6.3), but **splitting across separate
        sittings/days trades fatigue relief for occasion variance and standardization risk**: multiple occasions add
        test–retest/practice and administration-condition variation that must be controlled and documented.
        *(AERA/APA/NCME, 2014, Standards, Ch. 6.)* T2. Cross-refs this brainlift's **Category 3** (retakes/occasions) and **(GA 10.8)**.
      - **Direction of evidence, not a settled number:** no verified study fixes an optimal number of sittings for a K–8
        cognitive *screener*; 6.1 (motivated adults tolerate long single sittings) and 6.3 (children benefit from breaks)
        bound the tradeoff but do not resolve it. `[gap]`
    - **DOK 2 — Summary:** Splitting a battery across sittings or days relieves fatigue only by adding occasion and standardization variance, and no located study fixes an optimal number of sittings for a K–8 screener.
    - **Link to source:** [https://www.testingstandards.net/](https://www.testingstandards.net/)

### Category 7: Motivation, effort & engagement structure

*General idea: The defining tension is that the obvious anxiety fix — lowering the stakes — also lowers effort, so engagement must be protected structurally without touching the score construct.*

- **Subcategory 7.1: Test-anxiety magnitudes in K–8 (baseline anchor; cross-referenced, not re-derived)**
  - **Source:** von der Embse et al. (2018); Robson et al. (2023); companion GA 13.1
    - **DOK 1 — Facts:**
      - Test anxiety is negatively associated with achievement in the target age band: **Grades 1–5
        r ≈ −.22 (k = 9); Grades 6–8 r ≈ −.25 (k = 16)**, from a 238-study meta-analysis. *(von der
        Embse et al., 2018, *J. Affective Disorders*, 227, 483–493, DOI 10.1016/j.jad.2017.11.048 — T1;
        cross-ref **GA 13.1**.)*
      - A 20-year meta-analysis of primary-school children (ages 5–12; **N ≈ 53,617** per GA 13.1)
        confirms the negative anxiety–achievement link in exactly this population. *(Robson et al., 2023,
        *J. School Psychology*, DOI 10.1016/j.jsp.2023.02.003 — T1; cross-ref **GA 13.1**.)*
      - **Load-bearing implication (extracts identically):** anxiety is a *known downward bias* on the
        score, so structure that lowers it can raise measurement fidelity **without** making the test
        easier. Full treatment lives in **GA 13.1**; here it is only the anchor for the structural levers
        below.
    - **DOK 2 — Summary:** Test anxiety is a measurable downward bias on K–8 achievement (r ≈ −.22 to −.25), so structure that lowers it can raise measurement fidelity without making the test easier.
    - **Link to source:** [https://doi.org/10.1016/j.jad.2017.11.048](https://doi.org/10.1016/j.jad.2017.11.048) | [https://doi.org/10.1016/j.jsp.2023.02.003](https://doi.org/10.1016/j.jsp.2023.02.003)
- **Subcategory 7.2: Structural anxiety mitigation: framing, speededness, and the visible-vs-hidden-timer nuance**
  - **Source:** Hallez & Vallier (2025)
    - **DOK 1 — Facts:**
      - **Time pressure is a documented anxiety amplifier**, and time-constrained assessment *without* a
        visible time cue produced higher evaluation anxiety and lower math scores in children ages 7–9.
        *(Hallez & Vallier, 2025, *Eur. J. Investig. Health Psychol. Educ.*, 15(12):243, DOI
        10.3390/ejihpe15120243 — T1, **small n = 44**, `[ADJACENT]` timed math, France.)*
      - **The visible timer *reduced* anticipatory anxiety** (vs. no timer) and **reduced inattentive /
        motor-instability behavior** (most for higher-ADHD-risk children), **with no significant change
        in performance**; timer-checking was heterogeneous (25% checked >7×/5 min). Mechanism proposed:
        a visible timer *offloads* the cognitive load of internally tracking time. *(Hallez & Vallier,
        2025 — T1, small n, `[ADJACENT]`.)*
      - **Direction-of-effect caveat (extracts identically):** this evidence *complicates* the intake
        hypothesis "no visible countdown timer." For young children the harmful element is **uncertain /
        hidden time pressure and speededness**, not the visibility of a calm timer per se. `[gap]` no
        study isolates *no timer + no time limit* (fully untimed) against *visible timer* for a gifted
        reasoning screen.
      - **Retry-friendly / mastery framing** as an anxiety lever is asserted mainly in practitioner
        sources; its *psychometric* cost/benefit (practice effects, security, reliable change) is a
        **retake-policy** question owned by **Category 3** — cross-ref, do not decide here. `[ADJACENT]`
        `[gap]` (no K–8 gifted-screen evidence that per-item retries lower anxiety without inflating
        scores).
    - **DOK 2 — Summary:** For ages 7–9 a visible timer reduced anxiety and off-task behavior versus hidden/uncertain time pressure, so the harmful element is speededness and time-uncertainty, not timer visibility — which complicates the 'hide the timer' intuition.
    - **Link to source:** [https://doi.org/10.3390/ejihpe15120243](https://doi.org/10.3390/ejihpe15120243)
- **Subcategory 7.3: The stakes/effort paradox (the central tension of Category 7)**
  - **Source:** Wise & DeMars (2005); Finn (2015); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - **Lowering stakes lowers anxiety but also lowers effort.** A synthesis of 12 studies / 25
        comparisons found motivated examinees outscored less-motivated examinees by an **average
        d ≈ 0.6**, and low motivation "is associated with a substantial decrease in test performance"
        and threatens validity. *(Wise & DeMars, 2005, *Educational Assessment*, 10(1):1–17, DOI
        10.1207/s15326977ea1001_1 — T1, `[ADJACENT]` higher-ed.)*
      - Unmotivated test-takers inject **construct-irrelevant variance (CIV)**; test-taking motivation is
        positively correlated with performance, and score interpretation is biased if motivation is
        ignored. *(Finn, 2015, *ETS Research Report Series*, 2015(2):1–17, DOI 10.1002/ets2.12067 — T3
        institutional, `[ADJACENT]` higher-ed/accountability.)*
      - **CIV is a formal validity threat.** The Standards define construct-irrelevance as "the degree to
        which test scores are affected by processes that are extraneous to" the construct, and name it
        (with construct underrepresentation) as one of the two principal threats to validity. *(AERA,
        APA & NCME, 2014, *Standards for Educational and Psychological Testing*, AERA — T2.)*
      - **Extracts identically:** you cannot buy engagement by simply "making it low-stakes." A calm,
        low-anxiety frame must be paired with a **structural effort guarantee** (7.4–7.6) or effort
        itself becomes the leak.
    - **DOK 2 — Summary:** Lowering stakes lowers anxiety but also lowers effort (motivated examinees outscore others by d ≈ 0.6), injecting construct-irrelevant variance — so a calm frame must be paired with a structural effort guarantee.
    - **Link to source:** [https://doi.org/10.1207/s15326977ea1001_1](https://doi.org/10.1207/s15326977ea1001_1) | [https://doi.org/10.1002/ets2.12067](https://doi.org/10.1002/ets2.12067)
- **Subcategory 7.4: Rapid-guessing / disengagement detection: Response Time Effort (RTE)**
  - **Source:** Wise & Kong (2005); Wise (2017)
    - **DOK 1 — Facts:**
      - **RTE** operationalizes effort from behavior, not self-report: for each item *i* a threshold
        **Tᵢ** separates *rapid-guessing* (RTᵢⱼ < Tᵢ → solution-behavior indicator SBᵢⱼ = 0) from
        *solution behavior* (RTᵢⱼ ≥ Tᵢ → SBᵢⱼ = 1); an examinee's **RTE = mean(SBᵢⱼ) over k items**,
        ranging 0–1 (1 = full effort). In validation it showed internal consistency **α = .97**,
        converged with self-reported effort (**r = .25**) and person-fit (**r = −.42**), and was
        **near-zero correlated with SAT** (discriminant — effort ≠ ability). *(Wise & Kong, 2005,
        *Applied Measurement in Education*, 18(2):163–183, DOI 10.1207/s15324818ame1802_2 — T1,
        `[ADJACENT]` 80-item university test.)*
      - **A rapid guess is a choice to "momentarily opt out of being measured,"** occurs in **both high-
        and low-stakes** contexts, "does not reflect what a test taker knows and can do," and therefore
        "tends to negatively distort scores and… diminish validity"; the author concludes it "makes
        little sense to include them in scoring." *(Wise, 2017, *Educational Measurement: Issues and
        Practice*, 36(4):52–61, DOI 10.1111/emip.12165 — T1, **`[COI]` author is NWEA**, a commercial
        adaptive-test vendor.)*
    - **DOK 2 — Summary:** Response-Time Effort operationalizes effort from behavior rather than self-report, separating rapid-guessing from solution behavior, and is near-zero correlated with ability — so effort can be measured without measuring ability.
    - **Link to source:** [https://doi.org/10.1207/s15324818ame1802_2](https://doi.org/10.1207/s15324818ame1802_2) | [https://doi.org/10.1111/emip.12165](https://doi.org/10.1111/emip.12165)
- **Subcategory 7.5: Effort-moderated scoring / response-time-effort filtering (keeping effort out of the score)**
  - **Source:** Wise & DeMars (2005, 2006); Wise, Bhola & Yang (2006); Finn (2015)
    - **DOK 1 — Facts:**
      - **Effort-moderated IRT** models each response by its strategy: responses below Tᵢ (rapid guesses)
        get a **constant chance probability (gᵢ = 1/#options)** while responses at/above Tᵢ are modeled
        by the standard 3PL. With rapid-guessing present it produced **better model fit, more accurate
        item-parameter estimates, more accurate test information, and higher convergent validity** than
        the standard 3PL. *(Wise & DeMars, 2006, *Journal of Educational Measurement*, 43(1):19–38, DOI
        10.1111/j.1745-3984.2006.00002.x — T1, `[ADJACENT]`.)*
      - **Motivation filtering** (excluding/deweighting low-effort responses) has been shown to **remove
        CIV caused by lack-of-effort behavior** and to align low-stakes scores more closely with an
        independent high-stakes ability estimate. *(Wise & DeMars, 2005/2006, above; Finn, 2015 — T1/T3,
        `[ADJACENT]`.)*
      - An **effort-monitoring CBT** design uses response-time effort *during* delivery to identify and
        act on low-effort responding rather than only post-hoc. *(Wise, Bhola & Yang, 2006, *Educational
        Measurement: Issues and Practice*, 25(2):21–30, DOI 10.1111/j.1745-3992.2006.00054.x — T1,
        `[ADJACENT]`.)*
    - **DOK 2 — Summary:** Effort-moderated IRT and motivation filtering remove the construct-irrelevant variance caused by low-effort responding and align low-stakes scores with independent ability estimates.
    - **Link to source:** [https://doi.org/10.1111/j.1745-3984.2006.00002.x](https://doi.org/10.1111/j.1745-3984.2006.00002.x) | [https://doi.org/10.1111/j.1745-3992.2006.00054.x](https://doi.org/10.1111/j.1745-3992.2006.00054.x)
- **Subcategory 7.6: Reproducible thresholds and structural correlates of disengagement**
  - **Source:** Kong, Wise & Bhola (2007); Wise, Pastor & Kong (2009)
    - **DOK 1 — Facts:**
      - **Thresholds can be set reproducibly.** Four Tᵢ-setting methods — a **fixed** threshold, a
        **surface-feature** rule (amount of reading required), **visual inspection** of RT distributions,
        and a **two-state mixture model** — yielded **only minor differences** in the resulting effort
        scores. *(Kong, Wise & Bhola, 2007, *Educational and Psychological Measurement*, 67(4):606–619,
        DOI 10.1177/0013164406294779 — T1, `[ADJACENT]`.)* → For reproducibility, a **pre-registered, locked** Tᵢ
        rule makes effort detection deterministic and auditable (ties auditability, cross-ref **Category 9**).
      - **Structural features predict disengagement.** Items with **more text** and items **later in the
        test** drew **more** rapid-guessing; items **with a graphic** drew **less**; the only significant
        *examinee* predictor was SAT total score. *(Wise, Pastor & Kong, 2009, *Applied Measurement in
        Education*, 22(2):185–205, DOI 10.1080/08957340902754650 — T1, `[ADJACENT]`.)*
      - **Extracts identically / the text-only design collision:** a **text-only** screener (no graphics, reading = the
        capability) sits on the two features that *raise* rapid-guessing (heavy text, and cumulative
        position). This is a first-order structural risk for this specific product and ties directly to
        **session design / fatigue (Category 6)** and **cognitive load (Category 5)**. `[gap]` unstudied
        for K–8 gifted upper-tail.
    - **DOK 2 — Summary:** Rapid-guessing thresholds can be set reproducibly (a locked, pre-registered rule makes effort detection deterministic and auditable), but heavy text and later position drive rapid-guessing — a direct collision with a text-only screener.
    - **Link to source:** [https://doi.org/10.1177/0013164406294779](https://doi.org/10.1177/0013164406294779) | [https://doi.org/10.1080/08957340902754650](https://doi.org/10.1080/08957340902754650)
- **Subcategory 7.7: Flow / challenge–skill balance achieved through adaptivity (cross-referenced)**
  - **Source:** Csikszentmihalyi (1990); companion GA 13.2
    - **DOK 1 — Facts:**
      - Engagement peaks when **challenge matches skill**: challenge above skill breeds **anxiety**,
        below it breeds **boredom**. *(Csikszentmihalyi, 1990, *Flow* — T2; cross-ref **GA 13.2**.)*
      - **Structural bridge (extracts identically):** an adaptive engine that targets item
        difficulty near the examinee's provisional ability estimate (moderate success probability;
        exact target is model-dependent) is *the same mechanism* that maximizes measurement information
        (GA 10.1 / Category 1) **and** sustains the challenge–skill balance that protects effort — i.e.,
        adaptivity is an **effort lever that does not touch the score construct**. Detailed CAT
        item-selection/stopping mechanics are owned by **Category 1**; not re-derived here.
    - **DOK 2 — Summary:** Adaptive difficulty-matching is the same mechanism that maximizes measurement information and sustains the challenge–skill balance that protects effort — an effort lever that does not touch the score construct.
    - **Link to source:** [https://worldcat.org/title/20392741](https://worldcat.org/title/20392741)
- **Subcategory 7.8: Feedback timing & type inside a scored test (a risk, not a freebie)**
  - **Source:** Kluger & DeNisi (1996); Hattie & Timperley (2007)
    - **DOK 1 — Facts:**
      - **Feedback is not reliably positive.** In a meta-analysis of **607 effect sizes / 23,663
        observations**, feedback interventions raised performance on average (**d = .41**) but **over
        one-third *decreased* performance**; the drop was **not** explained by sampling error or feedback
        sign, and effectiveness fell as attention moved **from the task toward the self**. *(Kluger &
        DeNisi, 1996, *Psychological Bulletin*, 119(2):254–284, DOI 10.1037/0033-2909.119.2.254 — T1,
        `[ADJACENT]` learning/organizational, not scored screening.)*
      - Feedback impact is **positive or negative depending on type/level**: **self-level praise is
        least effective**, while feedback about the **task, process, and self-regulation** (and the
        "where to next?" question) is most effective; **timing matters**. *(Hattie & Timperley, 2007,
        *Review of Educational Research*, 77(1):81–112, DOI 10.3102/003465430298487 — T1, `[ADJACENT]`
        learning context.)*
      - **Extracts identically:** any within-test correctness/score feedback is a **live variable that
        can change subsequent effort and thereby leak into the ability estimate** — the opposite of a
        reproducible, effort-clean score.
    - **DOK 2 — Summary:** Within-test feedback lowered performance in over a third of studies (worst when it targets the self) and can leak into the ability estimate — the opposite of a reproducible, effort-clean score.
    - **Link to source:** [https://doi.org/10.1037/0033-2909.119.2.254](https://doi.org/10.1037/0033-2909.119.2.254) | [https://doi.org/10.3102/003465430298487](https://doi.org/10.3102/003465430298487)
- **Subcategory 7.9: Reward / points / badges crowding out intrinsic motivation (cross-referenced)**
  - **Source:** Deci, Koestner & Ryan (1999); companion GA 13.5
    - **DOK 1 — Facts:**
      - **Tangible / performance-contingent rewards undermined free-choice intrinsic motivation
        (d ≈ −0.28 to −0.40) and were "more detrimental for children than college students," whereas
        positive *verbal/informational* feedback *enhanced* it (d ≈ 0.33).** *(Deci, Koestner & Ryan,
        1999, *Psychological Bulletin*, 125(6):627–668, DOI 10.1037/0033-2909.125.6.627 — T1; cross-ref
        **GA 13.3**.)*
      - **Extracts identically:** points/badges/leaderboards tied to performance are contraindicated in a
        children's screener; the *informational* half of the same literature is what 7.8 says to keep —
        neutral, task-level, non-contingent framing. (Gamification's engagement≠validity distinction is
        owned by **GA 13.5**.)
    - **DOK 2 — Summary:** Performance-contingent rewards such as points and badges crowd out intrinsic motivation and are worse for children, so they are contraindicated; only the informational, non-contingent half of feedback should be kept.
    - **Link to source:** [https://doi.org/10.1037/0033-2909.125.6.627](https://doi.org/10.1037/0033-2909.125.6.627)

### Category 8: Fairness & access in structure

*General idea: Structural choices — item order, adaptive routing, exposure control, and a text-only reading gate — each carry a fairness cost that must be measured, not assumed away.*

- **Subcategory 8.1: Item order / position effects and position-induced DIF**
  - **Source:** Debeer & Janssen (2013); Albano (2013); Kingston & Dorans (1984); Weirich et al. (2017); Nagy et al. (2018)
    - **DOK 1 — Facts:**
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
    - **DOK 2 — Summary:** Because position changes difficulty in a person-varying, effort- and decoding-driven way, item position can inject subgroup-differential difficulty that mimics or adds to DIF — a risk greatest in adaptive delivery where the sequence differs per examinee.
    - **Link to source:** [https://doi.org/10.1111/jedm.12009](https://doi.org/10.1111/jedm.12009) | [https://doi.org/10.1111/jedm.12026](https://doi.org/10.1111/jedm.12026) | [https://doi.org/10.1177/014662168400800202](https://doi.org/10.1177/014662168400800202) | [https://doi.org/10.1177/0146621616676791](https://doi.org/10.1177/0146621616676791) | [https://doi.org/10.21031/epod.886920](https://doi.org/10.21031/epod.886920)
- **Subcategory 8.2: Fairness & measurement invariance under adaptivity (DIF in CAT)**
  - **Source:** Zwick, Thayer & Wingersky (1994); Zwick & Thayer (2002); Nandakumar & Roussos (2004)
    - **DOK 1 — Facts:**
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
    - **DOK 2 — Summary:** DIF remains detectable in CAT with IRT-matched, empirical-Bayes-stabilized methods, but detection is harder on sparse per-examinee data and an early DIF item can cascade through routing, so whether adaptivity nets out fairer than a fixed form is unresolved.
    - **Link to source:** [https://doi.org/10.1177/014662169401800203](https://doi.org/10.1177/014662169401800203) | [https://doi.org/10.1177/0146621602026001004](https://doi.org/10.1177/0146621602026001004) | [https://doi.org/10.3102/10769986029002177](https://doi.org/10.3102/10769986029002177)
- **Subcategory 8.3: Item exposure & test security ⇄ coaching ⇄ retakes (rotating banks as a fairness lever)**
  - **Source:** Stocking & Lewis (1995, 1998); Kingsbury & Zara (1989); van der Linden & Veldkamp (2007); Kulik, Bangert-Drowns & Kulik (1984); Hausknecht et al. (2007); Scharfen et al. (2018)
    - **DOK 1 — Facts:**
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
        resources → an equity concern (a gaming/burden concern). [T1] [ADJACENT: adult/college admissions]
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
    - **DOK 2 — Summary:** Because on-demand delivery strips paper-era exposure limits, exposure control plus a large rotating never-reused bank is at once a security control and an anti-coaching/anti-retest-advantage fairness lever, since coaching and practice effects both favor the resourced and repeat-testers.
    - **Link to source:** [https://doi.org/10.1002/j.2333-8504.1995.tb01660.x](https://doi.org/10.1002/j.2333-8504.1995.tb01660.x) | [https://doi.org/10.1207/s15324818ame0204_6](https://doi.org/10.1207/s15324818ame0204_6) | [https://doi.org/10.3102/10769986023001057](https://doi.org/10.3102/10769986023001057) | [https://doi.org/10.3102/1076998606298044](https://doi.org/10.3102/1076998606298044) | [https://doi.org/10.1037/0033-2909.95.2.179](https://doi.org/10.1037/0033-2909.95.2.179) | [https://doi.org/10.3102/00346543060003373](https://doi.org/10.3102/00346543060003373) | [https://doi.org/10.17763/haer.53.1.n06j5h5356217648](https://doi.org/10.17763/haer.53.1.n06j5h5356217648) | [https://doi.org/10.1037/0021-9010.92.2.373](https://doi.org/10.1037/0021-9010.92.2.373) | [https://doi.org/10.1016/j.intell.2018.01.003](https://doi.org/10.1016/j.intell.2018.01.003) | [https://doi.org/10.1037/0021-9010.92.6.1672](https://doi.org/10.1037/0021-9010.92.6.1672)
- **Subcategory 8.4: Universal Design for Assessment, accommodations, and the text-only reading-load tension**
  - **Source:** Thompson, Johnstone & Thurlow (2002); AERA/APA/NCME (2014); Sireci, Scarpati & Li (2005); Li (2014)
    - **DOK 1 — Facts:**
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
        adverse-impact/DIF question this design defers (and the reading-as-capability premise is unverified).
    - **DOK 2 — Summary:** The Standards demand minimizing construct-irrelevant variance and endorse Universal Design, yet also hold that removing a construct-relevant skill (their example: reading on a reading test) is a construct-changing modification — so the reading gate's legitimacy turns entirely on the unverified premise that reading is construct-relevant here.
    - **Link to source:** [https://doi.org/10.3102/00346543075004457](https://doi.org/10.3102/00346543075004457) | [https://doi.org/10.1111/emip.12027](https://doi.org/10.1111/emip.12027)

### Category 9: Auditability & reproducibility of structure

*General idea: An adaptive test is reproducible because its routing is a deterministic function of a specifiable, lockable rule set over a fixed bank — provided randomness is seeded and every session is logged and replayable.*

- **Subcategory 9.1: The adaptive rule set is deterministic and fully specifiable**
  - **Source:** AERA/APA/NCME (2014), Standard 4.3 & ch. 4; Kingsbury & Zara (1989); van der Linden & Glas (2010)
    - **DOK 1 — Facts:**
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
        **Category 1 (1.2–1.5)**; the point here is only that the rule set is *enumerable and fixable*.
      - `[INFERENCE]` Given a fixed calibrated bank, a fixed rule set, and a fixed response string, the
        sequence of items and the final θ/classification are a **deterministic function** of those inputs (a
        pure function of bank + rules + responses + any random seed); no source states this for a gifted
        screener specifically `[gap]`.
    - **DOK 2 — Summary:** The Standards require every routing rule (selection, start, stopping, exposure, scoring) to be documented, so an adaptive test's routing is a deterministic, fully specifiable function of a fixed bank, rule set, and response string.
    - **Link to source:** [https://doi.org/10.1207/s15324818ame0204_6](https://doi.org/10.1207/s15324818ame0204_6) | [https://doi.org/10.1007/978-0-387-85461-8](https://doi.org/10.1007/978-0-387-85461-8)
- **Subcategory 9.2: Where randomness enters routing (and how seeding preserves reproducibility)**
  - **Source:** Kingsbury & Zara (1989); Stocking & Lewis (1998)
    - **DOK 1 — Facts:**
      - The "**randomesque**" strategy selects the next item **at random from among the several most-
        informative candidate items**, deliberately introducing a stochastic step into selection to spread
        item exposure. *(Kingsbury & Zara, 1989, DOI 10.1207/s15324818ame0204_6.)* `T1`
      - Conditional exposure control admits a selected item **probabilistically** (a random draw against an
        exposure-control parameter) so that, e.g., a high-information item is not administered to ~100% of
        examinees at one ability level even when its overall rate looks safe. *(Stocking & Lewis, 1998,
        *Journal of Educational and Behavioral Statistics* 23(1):57–75, DOI 10.3102/10769986023001057.)* `T1`
        — exposure-control *mechanics* are owned by **Category 1 (1.5)**; extracted here only as the source of
        routing stochasticity.
      - `[INFERENCE]` Because randomesque and probabilistic exposure control make item selection **stochastic**,
        an operational session is reproducible **only if the pseudo-random draws are driven by a recorded seed**
        (a standard pseudo-random-number-generator property); replaying the same seed + bank + rules + responses
        then reproduces the identical item sequence. No located psychometric study validates seeded-PRNG replay
        for an operational gifted screener `[gap]`.
    - **DOK 2 — Summary:** The only non-deterministic element is the pseudo-randomness that randomesque and probabilistic exposure control inject, which becomes bit-for-bit reproducible once every draw is driven by a recorded seed.
    - **Link to source:** [https://doi.org/10.1207/s15324818ame0204_6](https://doi.org/10.1207/s15324818ame0204_6) | [https://doi.org/10.3102/10769986023001057](https://doi.org/10.3102/10769986023001057)
- **Subcategory 9.3: Logging, protocol retention & replay of adaptive sessions**
  - **Source:** AERA/APA/NCME (2014), Standards 6.15, 6.8, 6.14
    - **DOK 1 — Facts:**
      - **Reconstructability (a general auditability principle):** an independent reviewer "must be able to **reconstruct how students were
        selected**"; evidence includes that "selection rules and analysis choices are **locked before results
        are observed**" and that "**decisions and changes are logged**." *(general auditability principle.)*
      - The 2014 *Standards* require that, "when individual test data are retained, both the **test protocol**
        and any written report should also be preserved in some form," because "**the protocol may be needed to
        respond to a possible challenge from a test taker** or to facilitate interpretation at a subsequent
        time." *(AERA et al., 2014, **Standard 6.15**.)* `T2`
      - Test scorers "should establish scoring protocols," and where complex responses are scored by computer,
        "the **accuracy of the algorithm and processes should be documented**." *(AERA et al., 2014, **Standard
        6.8**.)* `T2` — the CAT-specific documentation anchor is Std 5.16 (9.4); 6.8 adds the general
        scoring-protocol duty.
      - Organizations retaining identifiable test data "should maintain appropriate data security, which should
        include administrative, technical, and physical protections," under a documented retention policy.
        *(AERA et al., 2014, **Standard 6.14**.)* `T2` — audit-trail retention is bounded by privacy duties (ties student protection).
      - `[INFERENCE]` Standards 6.15/6.8 + auditability together imply the auditable unit is a **complete session log**
        (item IDs, presentation order, responses, interim θ/SE, each selection and stop decision, the seed, and
        the engine + item-parameter-snapshot versions) sufficient to **re-execute the session and reproduce the
        classification**. Empirical validation of such deterministic replay for a K-8 gifted CAT is `[gap]`.
    - **DOK 2 — Summary:** The Standards independently require preserving the test protocol to answer a challenge and documenting scoring-algorithm accuracy, so auditability reduces to logging the full session and re-executing it to reproduce the classification.
    - **Link to source:** [https://www.testingstandards.net/](https://www.testingstandards.net/)
- **Subcategory 9.4: Comparability under adaptivity (standardization ⇄ adaptivity)**
  - **Source:** AERA/APA/NCME (2014), Standards 5.16, 5.17 & ch. 5; Wyse (2023)
    - **DOK 1 — Facts:**
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
    - **DOK 2 — Summary:** Every child sees a different item set, yet the Standards defend adaptive scores as comparable on a common IRT scale — provided documented algorithms, software, and QC and an equity-property analysis support it.
    - **Link to source:** [https://doi.org/10.1177/01466216231209749](https://doi.org/10.1177/01466216231209749)
- **Subcategory 9.5: Locking / pre-registration of rules & item parameters before operational use**
  - **Source:** AERA/APA/NCME (2014), ch. 3–4; Nosek, Ebersole, DeHaven & Mellor (2018)
    - **DOK 1 — Facts:**
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
        `T1` `[ADJACENT: open-science methodology, not testing-specific]` — supports auditability's "rules locked before
        results," applied here to the routing/stopping/scoring rules and the item-parameter snapshot.
    - **DOK 2 — Summary:** Comparability and fairness require the operating procedure, rules, and item parameters to be calibrated and locked before operational use — the testing analogue of pre-registration.
    - **Link to source:** [https://doi.org/10.1073/pnas.1708274114](https://doi.org/10.1073/pnas.1708274114)
- **Subcategory 9.6: Item-parameter drift vs a frozen scale (reproducibility ⇄ validity)**
  - **Source:** Veerkamp & Glas (2000); Wells, Subkoviak & Serlin (2002); AERA/APA/NCME (2014), ch. 4
    - **DOK 1 — Facts:**
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
        (position/context effects owned by sibling **Category 2**), which is a reproducibility concern for a
        frozen scale.
      - `[INFERENCE]` Reproducibility (identical re-scoring) is maximized by a **permanently frozen** item-
        parameter file, whereas validity/security argue for **periodic recalibration** because parameters drift
        and items leak (Veerkamp & Glas, 2000); the two goals are reconcilable only via **versioned, hashed
        parameter snapshots** (freeze per version; recalibrate to a *new* documented version). No source
        prescribes a recalibration cadence for a gifted screener `[gap]`.
    - **DOK 2 — Summary:** Reproducibility (a frozen parameter file) and validity/security (parameters drift and items leak) pull apart over time, and are reconcilable only via versioned, hashed parameter snapshots paired with an out-of-band drift/security monitor.
    - **Link to source:** [https://doi.org/10.3102/10769986025004373](https://doi.org/10.3102/10769986025004373) | [https://doi.org/10.1177/0146621602261005](https://doi.org/10.1177/0146621602261005)
- **Subcategory 9.7: Test security & audit trails (Standards Ch. 6)**
  - **Source:** AERA/APA/NCME (2014), Standards 6.6, 6.7; Stocking & Lewis (1998)
    - **DOK 1 — Facts:**
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
        control exists. *(Stocking & Lewis, 1998, DOI 10.3102/10769986023001057.)* `T1` — mechanics in **Category 1 (1.5)**.
    - **DOK 2 — Summary:** Test integrity and security are Standards obligations, and the 2014 revision explicitly names the tension between proprietary/complex algorithms and users' need to audit them — the operational reason exposure control and audit trails exist.
    - **Link to source:** [https://doi.org/10.3102/10769986023001057](https://doi.org/10.3102/10769986023001057)
