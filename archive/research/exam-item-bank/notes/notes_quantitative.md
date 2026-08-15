# Quantitative / Numerical Reasoning — item-type catalog notes

Construct: **quantitative** (numerical **reasoning**, not arithmetic computation).
Shard: `shards/items_quantitative.jsonl` — **40 rows**, all validated (each line is one
JSON object with exactly the 18 schema keys).

Research framing (per `research/exam-item-bank/README.md`): this shard is discovery
input toward **H1** (measure constructs a single reasoning cutoff under-weights),
**H4** (less-coachable, lower-bias item types that widen who can demonstrate ability),
**H10** (engagement affordances + coachability flags to cut gaming/burden), and **R5**
(an item-level evidence base toward a defensible capability standard). It does **not**
ratify building the exam.

## Coverage snapshot

- **Rows:** 40 (`example_item` = 24 public/linkable, `item_type` = 16 described formats).
- **Age bands:** K-1 = 4, 2-3 = 6, 4-5 = 10, 6-8 = 12, K-8 = 8 (spans-all-bands = 8).
- **IP mix:** gov_released = 18, proprietary_describe_only = 11,
  publisher_sample_describe_only = 7, research_described = 4.
- **Subconstructs (all seven required, covered):** number_series (5),
  pattern_completion (4), number_analogies (1), quantitative_comparison (4),
  number_sentence_building (3), word_problem_reasoning (11),
  number_sense_magnitude (6). Additional reasoning subtypes seeded:
  number_properties_reasoning, numeric_matrix, balance_equivalence,
  arithmetic_reasoning, quantitative_reasoning_mixed, proportional_reasoning.
- **Response formats:** constructed (15), mcq (15), timed_tap (5), drag_drop (2),
  spoken (2), other (1) — biased toward constructed/interactive to add process data.

## Reasoning vs computation — the gifted signal

The catalog is deliberately built to separate **numerical reasoning** (rule induction,
relational mapping, generalization, magnitude representation, equivalence/sufficiency
reasoning, proportional reasoning) from **arithmetic fluency**. Rows encode this in
`cognitive_process` and `advantage_vs_cogat`:

- Rule/relation discovery items (number series, number analogies, number matrices,
  Figure Weights, function machines) score *finding the rule*, not executing it.
- Magnitude items (number-line estimation, ANS dot comparison, symbolic comparison)
  index number sense with response-time/estimation-error data that computation tests
  never capture.
- Generalization and modeling items (PISA Triangular Pattern, PISA Apples, proportional
  "best-buy") reward far-transfer reasoning and justification.
- The quantitative-comparison format adds a **sufficiency judgment**
  ("cannot be determined"), i.e. reasoning under uncertainty.

Every proprietary/computation-adjacent row (e.g. WJ Applied Problems, WISC Arithmetic,
KeyMath Applied Problem Solving) is flagged where computation load caps the pure-reasoning
tail, so downstream item development can strip or gate the arithmetic.

## Best public sources (reproduce or link)

- **NAEP Mathematics** (U.S. gov, strongest reuse posture — released items reproducible
  with citation): Questions Tool <https://www.nationsreportcard.gov/nqt/> and sample
  questions <https://www.nationsreportcard.gov/mathematics/sample-questions/>. Number-line
  value, place-value decomposition, even/odd & factor reasoning, "largest result",
  compare/order, short constructed-response with scorer comments.
- **TIMSS released mathematics** (IEA; internationally released, adapt with attribution):
  hub <https://nces.ed.gov/timss/released-questions.asp>, canonical
  <https://timssandpirls.bc.edu/>, grade-4 PDF
  <https://nces.ed.gov/timss/pdf/TIMSS2003_G4_Math.pdf>. "Complete the number pattern",
  "number machine" input-output items, Patterns & Relationships + Reasoning domain.
- **PISA released units** (OECD; educational reuse with attribution):
  <https://nces.ed.gov/surveys/pisa/pdf/items2_math.pdf> and consolidated ACER set
  <https://www.acer.org/files/pisa_relitems_maths_2.pdf> (Triangular Pattern, Step Pattern,
  Number Cubes, Apples, Exchange Rate). 2022 annex also exists on oecd.org (browser-only;
  it 403s to automated fetchers).
- **Smarter Balanced practice/sample items** (consortium-released):
  <https://smarterbalanced.org/our-system/students-and-families/samples/> — number-line
  point placement, equation/numeric "make the relation true" (equation building), compare.
- **Massachusetts MCAS released items** (state):
  <https://www.doe.mass.edu/mcas/testitems.html> — multi-step open-response reasoning,
  grades 3-8. (Virginia SOL released tests are another good state bank but its DOE pages
  block automated fetchers; use in-browser.)
- **Competition banks (link/describe, do not reproduce verbatim):** Math Kangaroo USA
  samples <https://mathkangaroo.org/mks/practice/free-question-samples/> and past exams
  <https://mathkangaroo.org/mks/practice/pdf-exams/> (grades 1-8, low-language nonroutine);
  MAA AMC 8 official archive <https://live.poshenloh.com/past-contests>; MATHCOUNTS free
  past competitions <https://www.mathcounts.org/resources/past-competitions> and Problem of
  the Week <https://www.mathcounts.org/resources/problem-week-archive>.

## Research-described paradigms (re-implement + cite)

- **Number-line estimation** (Siegler & Opfer):
  <https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/Siegler2016-magknow.pdf>.
- **Approximate Number System / dot comparison** (Panamath, Halberda):
  <https://panamath.org/>.
- **Symbolic magnitude comparison + mathematical equivalence** (Schneider/Rittle-Johnson
  review):
  <https://www.uni-trier.de/fileadmin/fb1/prof/PSY/PAE/Team/Schneider/Schneider_Thompson_Rittle-Johnson_InPress.pdf>.

These are the most **culture/language-fair, low-coachability** anchors in the catalog and
are administrable before fluent reading (K-1) — directly serving H4.

## Proprietary formats — described only (never reproduce secure content)

- **CogAT Quantitative** (Number Series, Number Analogies, Number Puzzles), Riverside test
  descriptions <https://onlinehelp.riversideinsights.com/Help/DM/mergedProjects/DM_Assessments_Help/DataManager_Test_Assessment/Test_and_Score_Descriptions/CogAT_Test_Descriptions.htm>
  — the incumbent to out-perform.
- **Woodcock-Johnson IV**: Number Series (Gf/RQ)
  <https://info.riversideinsights.com/hubfs/WJ-IV_Test-Descriptions_Cognitive.pdf>;
  Applied Problems + Number Matrices (achievement descriptions)
  <https://7083436.fs1.hubspotusercontent-na1.net/hubfs/7083436/WJ%20IV%20ACH%20Test%20Descriptions%20(3)%20copy%20(2).pdf>.
- **WISC-V**: Figure Weights (balance/equivalence, near-language-free) & Arithmetic (QRI),
  Pearson <https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-scales.pdf>
  and <https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-interpretive-report.pdf>.
- **Stanford-Binet 5 Quantitative Reasoning** (adaptive verbal + nonverbal), PRO-ED sample
  report <https://proedinc.com/Downloads/14462%20SB-5_OSRS_SampleDescriptiveReport.pdf>.
- **KeyMath-3** Numeration + Applied Problem Solving, Pearson
  <https://www.pearsonclinical.com.au/content/dam/school/global/clinical/au/assets/keymaths3/KeyMaths-3-DA-Sample-Report.pdf>.
- **ETS GRE Quantitative Comparison** — the greater/less/equal/cannot-be-determined
  *format* (adapt to K-8 magnitudes; ETS item content is copyright):
  <https://www.ets.org/gre/test-takers/general-test/prepare/content/quantitative-reasoning.html>.

## Best engagement opportunities (H10)

Every row names a concrete game mechanic. Strongest, most build-ready:

- **"Crack the safe" / "combo lock"** for number series — each inferred term turns a dial.
- **"Function factory"** for input-output rule discovery.
- **"Balance beam / seesaw / gravity puzzle"** for equation-building, equivalence, and
  Figure-Weights balance reasoning (one mechanic, three subconstructs).
- **"Number-line archery" / "treasure map" / "zip-line drop"** for magnitude estimation
  with a precision meter + latency capture.
- **"Feed the monster"** ANS dot-comparison and **"sumo showdown"** magnitude tap for K-1.
- **"Boss battle" / "countdown arena" / "speed-run leaderboard"** for competition-grade
  tail items.

## Top advantages vs CogAT

1. **Process + latency data** (per-term, estimation-error, speed-accuracy) that CogAT's
   paper MC cannot produce.
2. **Higher, generator-controlled ceiling** (multi-rule series, dual-constraint matrices,
   generalization/justification, competition items) to discriminate the gifted tail.
3. **Constructs CogAT omits entirely**: number-line/magnitude sense, ANS acuity,
   quantitative comparison with a sufficiency option, mathematical equivalence,
   proportional reasoning.
4. **Lower-coachability / lower-bias options** (ANS, magnitude, Figure-Weights-style
   balance) that are near-language-free and testable pre-reading (H4).
5. **AIG-friendly**: most formats are template/parameter cloneable for adaptive pools.

## Adaptivity & tail notes

- Highest `adaptivity_fit`: series, function machines, matrices, balance/Figure-Weights,
  magnitude/number-line, comparison — all fully parameterizable for AIG and CAT.
- Highest `tail_discrimination`: generalize-and-justify (PISA), dual-constraint matrices,
  competition items (AMC 8 / MATHCOUNTS), and the "cannot be determined" comparison option.
- Prefer **constructed / interactive** responses over 4-option MC where possible: MC caps
  the ceiling and invites guessing; constructed answers plus latency raise both ceiling and
  signal.

## IP caveats

- `gov_released` rows (NAEP/TIMSS/PISA/Smarter Balanced/MCAS) may be reproduced or adapted
  **with citation**; NAEP (U.S. gov) is the cleanest for verbatim reuse, TIMSS/PISA require
  IEA/OECD attribution.
- Competition banks (Math Kangaroo/AMC 8/MATHCOUNTS) are **link/describe only** — content is
  copyrighted by the organizers; use official samples for illustration and author original
  clones for any scored use.
- All proprietary batteries (CogAT, WJ, WISC, SB5, KeyMath) are `describe_only`,
  `entry_kind=item_type` — **no secure item content is reproduced**; only the published
  format/description is captured.
- Research paradigms are `adapt_ok`: re-implement the method and cite the source.
- A few official pages (OECD 2022 PISA annex, Virginia DOE, MAA, AoPS) return 403 to
  automated fetchers but load normally in a browser; verified-live alternates were used as
  the `source_url` where needed (e.g. ACER/NCES for PISA, Po-Shen Loh archive for AMC 8,
  MCAS for a state bank).

## Gaps & next steps

- **number_analogies** has only one dedicated (proprietary CogAT) row because public banks
  rarely publish this exact format; author original public-domain number-analogy items or
  adapt the CogAT-described relation families.
- No **audio-first / spoken** early-numeracy public bank surfaced beyond WISC/WJ (described);
  consider building original spoken magnitude/counting items for K-1.
- Scoring for constructed/open items (NAEP CR, MCAS, MATHCOUNTS, equivalence explanations)
  needs a rubric or AI grader plus **DIF/fairness checks** before scored use.
- Validate that each "reasoning" affordance genuinely decouples from computation (pilot
  with latency + error-type analysis) before treating any item as a gifted signal.
