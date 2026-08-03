# Exam Item-Bank Catalog — summary

**Total rows:** 318  |  **shards:** 8  |  **parse errors:** 0  |  **warnings:** 0

## Rows per construct
- game_based: 45
- working_memory: 42
- processing_speed: 40
- quantitative: 40
- spatial: 40
- fluid_reasoning: 39
- verbal: 38
- complementary: 34

## Rows per age band
- K-1: 55
- 2-3: 44
- 4-5: 59
- 6-8: 107
- K-8: 53

## Rows per IP status
- research_described: 132
- proprietary_describe_only: 66
- open_license: 54
- gov_released: 33
- public_domain: 26
- publisher_sample_describe_only: 7

## Entry kind
- item_type: 173
- example_item: 145

## Per-construct notes

### notes_complementary.md

# Notes — Complementary / Non-Cognitive Signals (`items_complementary.jsonl`)

## Construct and why it matters (H1)

**Construct = `complementary`:** the signals CogAT does **not** measure. CogAT
is a convergent reasoning battery (verbal, quantitative, nonverbal). It says
nothing about the other two rings of **Renzulli's three-ring conception of
giftedness** — **task commitment** and **creativity** — nor about the
motivational/dispositional soil they grow in (conscientiousness, grit,
curiosity, intrinsic motivation). This shard catalogs item types and example
items for those complementary dimensions so an in-house K–8 exam can measure
what a reasoning cutoff structurally misses.

The core H1 advantage is not "add nice-to-have soft skills." It is
**broadening WHO gets identified as gifted**: creatively gifted students,
determined/persistent students, intensely curious students, and
demonstrated-achievement students who do not top out a multiple-choice
reasoning test — disproportionately including twice-exceptional, low-income,
and culturally/linguistically diverse learners that ability-only screening
under-identifies. Every row's `advantage_vs_cogat` field restates the specific
dimension CogAT omits.

## What is in the shard

- **File:** `research/exam-item-bank/shards/items_complementary.jsonl`
- **Rows:** 34 (target was 25–40), one single-line JSON object each, exactly
  the 18 required keys, validated (`json.loads` on every line, key-set and
  enum checks, unique `item_id`s, zero errors).

### Age-band coverage (K–8)

| age_band | rows |
|---|---|
| K-1 | 5 |
| 2-3 | 4 |
| 4-5 | 4 |
| 6-8 | 11 |
| K-8 | 10 |

### Subconstruct coverage (all eight requested)

| subconstruct | rows |
|---|---|
| divergent_thinking | 7 |
| figural_creativity | 2 |
| task_commitment | 9 |
| conscientiousness | 3 |
| curiosity | 4 |
| intrinsic_motivation | 3 |
| situational_judgment | 3 |
| demonstrated_achievement | 3 |

### Format mix (self-report / teacher-parent report / behavioral)

Deliberately balanced, with a **preference for behavioral/observable
indicators** because self-report is the weakest link (see caveats).

- **Child self-report (rating scales / oral):** CX-012, CX-014, CX-017,
  CX-019, CX-021, CX-023 (6 rows).
- **Teacher / parent report:** CX-013, CX-015, CX-016, CX-031, CX-032,
  CX-033, CX-034 (7 rows).
- **Behavioral / performance (non-self-report):** effort/persistence and
  curiosity behavior CX-009, CX-010, CX-011, CX-018, CX-020, CX-022; plus
  performance-based creative production and portfolios CX-001–CX-005, CX-008,
  CX-027, CX-028, CX-029, CX-030.
- **Situational judgment (scenario MCQ):** CX-024, CX-025, CX-026.

## Subconstruct → source map (real, current URLs)

- **Divergent thinking (verbal):** Guilford Alternative Uses Task
  (https://en.wikipedia.org/wiki/Guilford%27s_Alternate_Uses); Wallach–Kogan
  Creativity Test — Instances / Alternate Uses / Similarities
  (https://upseducation.com/wallach-kogan-creativity-test/).
- **Figural creativity:** Wallach–Kogan Pattern/Line Meanings (same URL as
  above); Torrance TTCT Figural, proprietary
  (https://www.ststesting.com/gift/).
- **Creative-product scoring:** Consensual Assessment Technique (Amabile),
  discussed in a divergent-thinking scoring review
  (https://www.sciencedirect.com/science/article/pii/S1053811920308119).
- **Task commitment / persistence (behavioral):** Academic Diligence Task
  (Galla, Duckworth et al., 2014,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4170650/); delay-of-gratification /
  marshmallow paradigm (Mischel,
  https://en.wikipedia.org/wiki/Stanford_marshmallow_experiment).
- **Grit:** Short Grit Scale, Grit-S self-report
  (https://sjdm.org/dmidi/files/Grit-8-item.pdf); Grit-S informant/teacher
  report, documented in the validation paper
  (https://thedocs.worldbank.org/en/doc/608981538070396389-0090022018/original/DevelopmentandValidationoftheShortGritScaleGritS.pdf).
- **Conscientiousness (self + teacher/parent):** IPIP (public domain) —
  Conscientiousness facets (https://ipip.ori.org/newNEOKey.htm) and
  third-person/other-report guidance (https://ipip.ori.org/).
- **Curiosity:** IPIP inquisitiveness/curiosity scales
  (https://ipip.ori.org/newIndexofScaleLabels.htm); Jirout & Klahr (2012)
  behavioral uncertainty-preference measure
  (https://www.cmu.edu/dietrich/psychology/pdf/klahr/PDFs/Scientific%20curiosity.pdf);
  Jirout (2020) question-asking
  (https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01717/full);
  Five-Dimensional Curiosity Scale-Revised / Epistemic Curiosity Inventory
  (https://www.sciencedirect.com/science/article/abs/pii/S0191886919303289).
- **Intrinsic motivation:** Intrinsic Motivation Inventory + SDT free-choice
  behavioral measure (https://selfdeterminationtheory.org/intrinsic-motivation-inventory/).
- **Situational judgment:** MacCann & Roberts SJT-based EI (STEU/STEM)
  (https://ink.library.smu.edu.sg/cgi/viewcontent.cgi?article=6611&context=lkcsb_research);
  Mosaic by ACT SEL technical manual (SJT method, commercial)
  (https://www.act.org/content/dam/act/unsecured/documents/mosaic-sel-tech-manual.pdf);
  OECD (2024) working paper on innovative SEL assessment
  (https://one.oecd.org/document/EDU/WKP(2024)11/en/pdf).
- **Demonstrated achievement / portfolio:** NAGC Identification
  (https://www.nagc.org/identification) and Assessments & Tests
  (https://www.nagc.org/assessments-and-tests); KAGE performance/portfolio
  guidance (https://kagegifted.org/wp-content/uploads/2011/11/section5.pdf).
- **Teacher rating scales (proprietary, describe-only):** Renzulli SRBCSS —
  Creativity & Motivation Characteristics (dimensions documented by UConn
  gifted-education,
  https://gifted.education.uconn.edu/wp-content/uploads/sites/612/2014/08/Scales-for-Rating-the-Behvioral-Characteristics-of-Superior-Students.pdf);
  Gifted Rating Scales-School Form (Pfeiffer & Jarosewich, 2003) validation
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC4563806/); HOPE Teacher Rating
  Scale (Gentry et al., 2015), 11 items on a public FCPS screening form
  (https://www.fcps.edu/system/files/forms/2023-10/hoperatingscale.pdf).

## IP handling (how each `ip_status` was assigned)

- **`public_domain` (15 rows use IPIP or a public paradigm):** IPIP is
  explicitly public domain — copy/edit/translate/adapt freely. `reuse_note` =
  adapt_ok.
- **`open_research_use`:** Grit-S and IMI are copyrighted but the authors
  explicitly permit free non-commercial research/educational use. Adapt with
  attribution; do not use as a sole high-stakes criterion.
- **`public_research_paradigm`:** published methods (Alternative Uses,
  Wallach–Kogan, Academic Diligence Task, delay of gratification, Jirout–Klahr
  curiosity, SDT free-choice, SJT paradigm, CAT). The *paradigm* is reusable;
  build original prompts and local scoring keys.
- **`guidance_public`:** NAGC/KAGE identification guidance — reference, not an
  item bank; `reuse_note` = reference_ok.
- **`proprietary_describe_only`:** TTCT (STS), SRBCSS/Renzulli Scales
  (Routledge/Prufrock), GRS (Pearson). We catalog **dimensions/type only**
  (`entry_kind = item_type`), do not reproduce items, and must license before
  any operational use.
- **`proprietary_items_publicly_posted`:** HOPE Teacher Rating Scale — the
  manual is commercial, but its 11 item dimensions appear on public district
  screening forms; still treat as describe-only and license/validate before
  reuse.
- **`commercial_manual_public_docs`:** Mosaic by ACT — use the public
  technical manual to inform SJT design, not to copy items.

## Validity and fakeability caveats — WHY these are complementary, not primary

These measures broaden the net, but each has a failure mode that disqualifies
it as a *primary/high-stakes* criterion. This is captured per row in
`coachability_bias_risk`; the recurring themes:

1. **Self-report is fakeable and socially desirable.** Grit, conscientiousness,
   curiosity, and intrinsic-motivation self-reports ("I never give up," "I love
   to learn") are easy to game, ceiling out, and are especially unreliable
   below ~age 10 (Grit-S was validated from about age 10). Response styles
   (acquiescence) and reading load add noise. Use as supporting evidence only.
2. **Rater bias in teacher/parent reports.** Teacher rating scales are **not
   comparable across teachers** (documented for SRBCSS), suffer halo from prior
   achievement, and can *reinforce* inequity by favoring compliant or advantaged
   students. HOPE is the notable mitigation — built and validated to be
   measurement-invariant across low-income and diverse groups. Rater training
   and local norms are mandatory.
3. **Low scoring reliability for open creativity.** Divergent-thinking and
   product (CAT) scoring is subjective; inter-rater reliability is the
   bottleneck; fluency is coachable and verbal-load penalizes ELL/quiet
   students. Local originality keys and trained judges (≥80% exact agreement,
   per NAGC/KAGE) are required.
4. **Behavioral measures are less fakeable but context-dependent.** The
   Academic Diligence Task, free-choice, persistence, and Jirout–Klahr tasks
   resist faking and reduce reading load (an equity gain), but effort/choice is
   state- and motivation-dependent and can be gamed if stakes are known.
5. **The marshmallow caution.** Delay-of-gratification wait time is heavily
   trust/SES-dependent and later replications show weak, attenuated predictive
   validity (Watts et al.). Included as a minor complementary signal only, and
   flagged as such — it must not be over-weighted.
6. **Portfolios/performances carry an authorship/SES confound.** Home help
   inflates products; score process and persistence, not just polish, and
   verify provenance.

**Design implication:** prefer behavioral/observable indicators (ADT,
free-choice, uncertainty-preference, question-asking, performance tasks) as the
backbone; use SJTs for engaging, harder-to-fake judgment items; treat
self-report as low-weight corroboration; and always **triangulate** across
method sources rather than trusting any single one. This is exactly why the
literature calls these measures *complementary*.

## Adaptivity / tail-discrimination summary

- Most complementary measures are **low** `adaptivity_fit`: open-ended
  generation, behavioral protocols, and rating scales are not CAT-compatible
  (they need rubrics/keys or fixed protocols). The exceptions are **SJTs**
  (`med` — closed, keyable, bankable).
- `tail_discrimination` is generally **low–med**: self-report ceilings and
  rater leniency compress the top end; the strongest tail signals are
  **demonstrated achievement / performance / self-initiated projects**
  (`med-high`) and behavioral effort (`med`), which is why the shard leans on
  them.

## Best public sources to start from (URLs)

1. **IPIP** — public-domain conscientiousness & curiosity items, incl.
   other-report conversion: https://ipip.ori.org/
2. **Short Grit Scale (Grit-S)** — self + informant, free for research/ed:
   https://sjdm.org/dmidi/files/Grit-8-item.pdf
3. **Intrinsic Motivation Inventory + SDT free-choice** —
   https://selfdeterminationtheory.org/intrinsic-motivation-inventory/
4. **Academic Diligence Task** (behavioral effort, free) —
   https://pmc.ncbi.nlm.nih.gov/articles/PMC4170650/
5. **Jirout & Klahr behavioral curiosity** —
   https://www.cmu.edu/dietrich/psychology/pdf/klahr/PDFs/Scientific%20curiosity.pdf
6. **Guilford Alternative Uses / Wallach–Kogan** (public creativity paradigms) —
   https://en.wikipedia.org/wiki/Guilford%27s_Alternate_Uses and
   https://upseducation.com/wallach-kogan-creativity-test/
7. **NAGC identification guidance** (portfolios, performances, multiple
   criteria) — https://www.nagc.org/identification

## Open assumptions and limitations

- **Age bands are grade-band approximations.** Several instruments carry their
  own age ranges (Grit-S from ~age 10; GRS-S ages 6–13 with a separate GRS-P
  ages 4–6; TTCT Figural K–adult, Verbal grade 1+). Rows use the closest
  allowed band (`K-1`/`2-3`/`4-5`/`6-8`/`K-8`) with the true range noted in
  `reuse_note`/`item_format`.
- **Adapted child versions need re-validation.** Adult-normed scales (5DCR,
  Epistemic Curiosity Inventory, IMI, IPIP) require child wording and fresh
  psychometrics before operational use; rows mark this.
- **Proprietary rows are catalog entries only.** TTCT, SRBCSS, and GRS content
  is described at the dimension level; licensing is required to administer.
- **Not yet done here:** local norming, pilot reliability/validity, fairness/DIF
  analysis, and a scoring-automation plan for open responses. These are
  prerequisites before any of these signals informs a real selection decision.
- **Claim boundary:** predictive validity and equity benefits cited from the
  sources are *independent research context*, not verified findings for this
  program. Broadening the identified pool is a design intent, not a
  demonstrated outcome.

## Verification performed

- Wrote the two files only; no other files touched; no git commands run.
- Programmatic check: all 34 lines parse as JSON, each has exactly the 18
  required keys, `construct == "complementary"`, and `age_band`, `entry_kind`,
  `stimulus_modality`, `response_format` are all within the allowed
  enumerations; `item_id`s are unique (CX-001…CX-034); zero errors.

### notes_fluid_reasoning.md

# Fluid Reasoning (Gf) Item Catalog - Notes

Research/discovery input for a possible in-house K-8 gifted exam. This catalogs
**item types and released example items** for fluid reasoning / abstract nonverbal
reasoning (Gf). It does not ratify building the exam. Serves research framing
H1 (broader measures than a single reasoning cutoff), H4 (less-coachable, lower-bias
item types), H10 (engagement + coachability flags), R5 (item-level evidence base).

- **Shard:** `shards/items_fluid_reasoning.jsonl`
- **Rows:** 39 (target 30-45)
- **Subconstructs covered:** figural matrices (2x2/3x3), figure classification,
  figure series, figure analogy, odd-one-out, visual-inductive rule discovery,
  nonverbal deductive reasoning.

## Age-band coverage

| Band | Rows |
|---|---|
| K-1 | 7 |
| 2-3 | 6 |
| 4-5 | 6 |
| 6-8 | 16 |
| K-8 (spans levels) | 4 |

6-8 is intentionally heaviest: most open, IRT-calibrated instruments (ICAR, MaRs-IB,
Sandia, RAVEN/PGM, ARC, Bongard, Latin Square) target older children/adults, and the
gifted tail matters most at the upper grades. Lower bands are seeded by scaling those
paradigms down (documented per row in `item_format` / `reuse_note`).

## Best public / open sources used (with URLs)

These are the anchors we can reproduce, link, or (best) use as calibration seeds for
Automatic Item Generation (AIG):

1. **ICAR Matrix Reasoning** (public-domain) - 11 released 3x3 items with published IRT
   stats. https://icar-project.org/types/MR/MRstats.html . ICAR also documents a
   figural-analogies item type: https://icar-project.org/
2. **Open-Psychometrics Project** - open ICAR response data for calibration/norming.
   http://openpsychometrics.org/_rawdata/
3. **Sandia Matrices** (Matzen et al., 2010; open, with generator) - Raven-like matrices
   with a systematic rule-varying generator; ~.69-.93 correlation with Raven's.
   https://github.com/sandialabs/Matrices
4. **MaRs-IB** (Chierchia, Blakemore et al., 2019; CC-BY) - 80 open matrix items +
   online implementation + item-level data (ages 11-33).
   https://royalsocietypublishing.org/rsos/article/6/10/190232/94631/The-matrix-reasoning-item-bank-MaRs-IB-novel-open
5. **RAVEN / I-RAVEN** (Zhang 2019; Hu 2021; open generators) - procedurally generated
   RPM matrices; I-RAVEN adds attribute-balanced (bias-controlled) answer sets.
   https://github.com/WellyZhang/RAVEN and https://github.com/husheng12345/SRAN
6. **PGM - Procedurally Generated Matrices** (Barrett et al., 2018, DeepMind; open) -
   1.4M matrices with explicit relation x object x attribute structure and held-out
   generalization regimes. https://github.com/google-deepmind/abstract-reasoning-matrices
7. **ARC-AGI - Abstraction and Reasoning Corpus** (Chollet, 2019; Apache-2.0) -
   few-shot, constructed-response visual rule discovery.
   https://github.com/fchollet/ARC-AGI
8. **Bongard Problems** (Foundalis collection, after Bongard 1967) - open-ended visual
   concept induction. https://www.foundalis.com/res/bps/bpidx.htm
9. **Latin Square Task** (Birney, Halford & Andrews, 2006) - nonverbal *deductive*
   reasoning with a Rasch-validated relational-complexity difficulty dial.
   https://journals.sagepub.com/doi/10.1177/0013164405278570
10. **Embretson cognitive design system** (ETS) - the validated blueprint for generating
    calibrated matrices a priori (difficulty predicted from rule count/abstraction,
    multiple R ~ .80). https://www.ets.org/Media/Research/pdf/PICANG7.pdf

## Proprietary incumbents (described only - never reproduced)

Rows are `entry_kind=item_type`, `ip_status=proprietary_describe_only`,
`reuse_note=describe_only`. We describe the *format* to define what we must beat:

- **CogAT Nonverbal Battery** - Figure Matrices, Figure Classification (Riverside
  Insights). https://info.riversideinsights.com/datamanager-onlinehelp/cogat-test-descriptions
- **NNAT3** - Pattern Completion, Reasoning by Analogy, Serial Reasoning (Pearson).
  https://www.pearsonassessments.com/campaign/nnat3.html
- **Raven's 2** (Pearson) - notably itself an IRT/AIG item bank, which validates our
  approach but stays closed to us.
- **Cattell Culture Fair (CFIT)** - Series, Classification, Conditions/Topology.
  Conditions/Topology is a rare nonverbal *deductive* format.

## Top 3 engagement affordances (make Gf feel like play)

1. **Repair / snap-in the broken pattern.** Matrices, pattern-completion, and analogy
   items become "fix the cracked mosaic / robot panel" where the found tile snaps in
   with a chime and the full pattern lights up; new "worlds" unlock as rules stack.
2. **Rule-reveal + streaks.** After answering, reveal the hidden relation (XOR, AND,
   progression) as a mini "rule lab"; filmstrip "predict the next frame" and
   speed-accuracy streak meters (MaRs-IB efficiency) reward fast-accurate reasoning.
3. **Discover / sort the secret rule and build the answer.** Bongard "crack the secret
   rule" detective sorting, ARC "figure out the machine" constructed grids, and
   shape-sudoku deduction turn Gf into hypothesis-testing and constructive play (rich
   process data, very low guessability).

Cross-cutting: all are **low-language / ELL- and pre-reader-friendly**, so gamification
adds engagement without adding a reading-load confound.

## Top 3 advantages vs CogAT

1. **AIG + adaptivity = a bottomless, tail-targeted, refreshable bank.** Matrix/series/
   analogy/classification rules are parameterizable (Sandia, RAVEN, PGM, Embretson), so
   we can clone unlimited calibrated items, target the top 1% by stacking simultaneous
   rules, and issue fresh forms per sitting. CogAT ships fixed, finite, secure forms.
2. **Less coachable + fairer by construction.** Freshly generated items defeat item-
   exposure coaching (a real problem for the heavily-prepped CogAT/NNAT/Raven's forms),
   and I-RAVEN-style attribute-balanced distractors engineer out answer-set bias that
   CogAT's proprietary distractors cannot document to us.
3. **Constructs and process data CogAT lacks.** Odd-one-out (violation detection),
   open-ended rule discovery (Bongard/ARC), and nonverbal *deduction* (Latin Square,
   CFIT Conditions) are distinct Gf facets CogAT does not isolate; constructed-response
   and reaction-time data expose *how* a child reasons, not just the final pick.

## IP caveats

- **Never reproduce secure content.** CogAT, NNAT3, Raven's 2, and CFIT rows are
  describe-only (format/process only). No secure item content is included.
- **Public != free of coaching risk.** ICAR, MaRs-IB, Sandia, and the ARC/RAVEN/PGM sets
  are openly available and therefore also visible to test-prep. Use the exact public
  items only as *anchors/calibration seeds* and operate with AIG clones.
- **Licenses differ; attribute correctly.** ICAR = public domain (reuse ok);
  ARC-AGI = Apache-2.0; MaRs-IB = CC-BY (attribution required); Sandia = repo grant with
  citation; RAVEN/PGM/I-RAVEN = open research code (respect each repo license and cite).
- **Research paradigms (Bongard, Latin Square, Embretson, CFIT-tradition redraws)** are
  described methods: implement our own stimuli/generator rather than lifting figures.
- **Fairness checks:** for pictorial K-1 classification/odd-one-out, audit object
  familiarity (cultural DIF); for colored matrices (MaRs-IB style), audit color-blind
  accessibility; audit AIG distractors for unintended cues.

## Gaps / follow-ups

- **Young-band (K-1, 2-3) items are mostly scaled-down paradigms**, not natively normed
  instruments; they need child pilot data before any operational use.
- **Constructed-response scoring** (ARC-style build tasks, shape-sudoku) needs an
  auto-scoring + partial-credit design; richer than MCQ but heavier to score.
- **AIG difficulty calibration** must be empirically confirmed, not assumed from rule
  count alone (Embretson's model is the starting blueprint, not a guarantee).
- **Tail validity above the gifted cut** should be checked with IRT item-information
  targeting near the decision threshold (ICAR/MaRs-IB stats are a starting point).
- Predictive validity, program-impact, and counterfactual claims are **out of scope**
  here; this shard only supports item-type selection (R5 evidence base).

### notes_game_based.md

# Notes — Game-Based / Engagement shard (`items_game_based.jsonl`)

**Construct:** `game_based` (cross-cutting). This shard catalogs game **mechanics** and documented
**game-based-assessment (GBA) precedents** that embed the *other* constructs (fluid reasoning,
verbal, quantitative, spatial, working memory, processing speed, complementary) inside gameplay via
**stealth assessment**. Each row's `subconstruct` names the TARGET construct the mechanic measures.

**Rows:** 45 (`GB-001`–`GB-045`), all `entry_kind=item_type`, all validate against `build_catalog.py`
(18 keys, enums, proprietary rule) with 0 errors.

**Research framing / requirements served** (from the item-bank README): **H1** (broader measures than
a single reasoning cutoff), **H4** (expand who can demonstrate ability via less-coachable, lower-bias,
lower-anxiety formats), **H10** (engagement affordances; coachability flags), **R5** (item-level
evidence toward a defensible capability standard). This is discovery input; it does **not** ratify
building the exam, and none of the engagement claims below are validated on GT applicants yet.

---

## Coverage

| Target construct (`subconstruct` prefix) | rows | example IDs |
|---|---|---|
| fluid_reasoning | 7 | GB-001 physics sandbox, GB-002 tower-defense, GB-003 city-sim systems, GB-004 rule-induction, GB-006 figural matrix |
| spatial | 6 | GB-008 mental rotation, GB-009 block-packing, GB-010 voxel construction, GB-011 paper-folding, GB-012 3D navigation |
| working_memory | 5 | GB-014 n-back, GB-015 spatial span, GB-016 list-sorting, GB-017 filtering, GB-018 running memory |
| processing_speed | 5 | GB-019 multitask racer, GB-020 pattern comparison, GB-021 vigilance/CPT, GB-022 symbol coding, GB-044 EndeavorRx |
| complementary (EF/SEL/noncognitive) | 9 | GB-023 flanker, GB-024 card-sort switch, GB-025 Tower of London, GB-027 SEL SJT, GB-028 empathy, GB-029 persistence, GB-030 creativity |
| quantitative | 4 | GB-032 ANS dot-comparison, GB-033 number line, GB-034 Number Race, GB-035 place value |
| verbal | 4 | GB-036 picture vocabulary, GB-037 narrative inference, GB-038 argumentation, GB-039 word-building |
| cross-cutting precedents/method | 5 | GB-040 stealth/ECD, GB-041 Lumsden review, GB-042 ACE, GB-043 NIH Toolbox, GB-045 commercial suites |

**Age bands:** K-1 (7), 2-3 (6), 4-5 (11), 6-8 (15), K-8 (6). Younger bands lean on
low-language, pre-symbolic mechanics (ANS dot-comparison, spatial span, flanker/DCCS, number line);
older bands carry the heavier reasoning mechanics (systems sims, argumentation, portal-style puzzles).

---

## Strongest engagement mechanics found (mechanic → learning-science mechanism → source)

1. **Open physics/contraption sandboxes** (GB-001, GB-007, GB-030). Draw-and-watch or build-a-machine
   loops give **flow** (Csikszentmihalyi: clear goal + immediate feedback + challenge–skill balance)
   and **SDT autonomy + competence** (Deci & Ryan). Best for eliciting *generative* reasoning and
   creativity a static test cannot. Source: Shute & Ventura, *Stealth Assessment* (MIT Press);
   Physics Playground.
2. **Adaptive difficulty held near ~75–85% success** (GB-034 Number Race, GB-014 n-back, GB-042 ACE).
   Keeps every child in the **desirable-difficulty** zone (Bjork) — neither bored nor defeated —
   which is the single most reusable engagement lever and also the cleanest path to CAT-style scoring.
3. **Arcade speed/streak loops** (GB-008, GB-009, GB-019, GB-020, GB-022). Combo meters and
   personal-best framing convert dull chronometric tasks into flow; crucial for processing-speed and
   mental-rotation measurement where paper forms depress effort.
4. **Narrative / role-play framing** (GB-027 Zoo U, GB-028 Crystals of Kaydor, GB-037 story-quest,
   GB-038 Argubot). **Narrative transportation** + **SDT relatedness** yield authentic behavior and
   reduce social-desirability bias vs self-report — the key to SEL/verbal measurement.
5. **Construction + authorship** (GB-010 voxel build, GB-013 Roblox/Minecraft UGC). Maximizes all
   three SDT needs; highest raw engagement, but the weakest standardization (see gaps).

### Learning Science Rationale (principles actually acted on in the shard)

| Principle | Why it applies here | Concrete design decision embedded in rows | Source |
|---|---|---|---|
| Flow | Sustained effort at the tail requires challenge–skill balance | Adaptive staircases; combo/streak feedback; instant physics/sim feedback | Csikszentmihalyi (1990) |
| Self-Determination Theory | Intrinsic motivation → fuller effort than compliance | Autonomy (sandboxes, branching), competence (level-ups), relatedness (characters) | Deci & Ryan (1985; 2000) |
| Desirable difficulty | Keep every ability level engaged and discriminable | Target ~75% success; adaptive n / ratio / span | Bjork & Bjork (2011) |
| Cognitive load management | Novelty/instructions must not swamp the target construct | Mandatory tutorials, worked examples, low-text/audio UI | Sweller, van Merriënboer & Paas (2019) |
| Feedback (timely, task-focused) | Drives flow and effort, but is double-edged | Immediate outcome feedback; avoid ego/praise framing | Hattie & Timperley (2007); Kluger & DeNisi (1996) |
| Dual coding / multimedia | Reach pre-readers and reduce language load | Picture+audio items (ANS, vocabulary, narrative) | Mayer (2021); Paivio (1986) |
| Reduced evaluative threat / stereotype threat | Anxiety and threat depress measured ability, esp. spatial/math | Non-"test" game framing; no visible scoring; low-stakes retries | Steele & Aronson (1995) (reasoned application) |

*Honesty note:* the flow/SDT/anxiety mechanisms are well-established in their home literatures; their
application to **GT selection tail measurement** here is a **reasoned inference / design hypothesis**,
not a validated result on this population.

---

## Strongest advantages vs CogAT (the recurring thesis)

- **Engagement → full effort → a truer tail.** CogAT under-measures able-but-disengaged, anxious, or
  EL children on timed paper forms. Immersive framing keeps effort maximal, so the high end is
  measured more truthfully. *(Reasoned inference; supported indirectly by Lumsden et al. 2016 finding
  gamified tasks boost motivation and reduce attrition.)*
- **Process telemetry CogAT cannot capture.** Stealth assessment logs *how* a child reasons —
  strategy, planning latency, error-correction, solution novelty, RT distributions, persistence after
  failure. Validated examples: Use Your Brainz problem-solving indicators correlated with Raven's and
  MicroDYN (Shute et al. 2016); Zoo U scene scores concord with teacher SEL ratings (DeRosier &
  Thomas 2017). *(Verified findings, but predictive validity ≠ program impact and ≠ GT-selection validity.)*
- **Broader constructs.** Adds executive function, systems reasoning, SEL/empathy, persistence,
  creativity, spatial navigation, and number sense — dimensions CogAT under-weights or omits (H1).
- **Lower-language / more culture-fair options at young ages.** ANS dot-comparison and spatial/number-
  line mechanics minimize reading and coaching load, potentially widening who is identified (H4).
- **Discrimination at the top in a gifted-relevant construct (verified):** ANS acuity correlates with
  math achievement *even among mathematically gifted adolescents* (Wang, Halberda & Feigenson 2017),
  supporting tail discrimination for GB-032.

---

## Main construct-irrelevant-variance / coachability risks (and mitigations)

1. **Game familiarity / prior exposure.** Genre-savvy children (tower-defense, FPS, voxel builders)
   start ahead. This is the dominant threat for GB-002, GB-005, GB-009, GB-010, GB-012, GB-013.
   *Mitigate:* mandatory tutorials + warm-up/adaptation blocks; model game-skill as a covariate.
2. **Device / motor / input latency.** Touch precision and hardware responsiveness contaminate all
   speeded/tap tasks (GB-008, GB-019–022). *Mitigate:* standardized hardware; a motor-only baseline
   to subtract; forgiving hit-boxes for young children.
3. **Novelty effects.** First-time-on-a-game variance inflates error. *Mitigate:* practice items and
   untimed familiarization before any scored block (a documented ACE / NIH Toolbox design choice).
4. **Trainability / test-prep of the underlying construct.** Mental rotation and spatial skills are
   malleable (Uttal et al. 2013, g ≈ 0.47); matrices and n-back are highly practice-sensitive.
   *Mitigate:* randomized/AIG item generation; exposure control; treat as measured-can-improve, not fixed.
5. **Language & cultural load / DIF.** Verbal, SEL, and narrative rows (GB-027, GB-028, GB-036–039)
   carry vocabulary, reading, and display-rule bias. *Mitigate:* audio narration, culturally varied
   content, and formal DIF/fairness validation across subgroups before any selection use.
6. **Scoring reliability of open-ended play.** Creativity and free-build UGC (GB-030, GB-013) resist
   reliable calibration. *Mitigate:* structured (not free) tasks for scoring; rubric/telemetry models
   with human-in-the-loop.

---

## Best public / research sources (working URLs)

**Method & foundational GBA**
- Shute & Ventura (2013), *Stealth Assessment* (MIT Press): <https://mitpress.mit.edu/9780262518819/stealth-assessment/>
- Mislevy, Steinberg & Almond (2003), Evidence-Centered Design: <https://doi.org/10.1207/S15366359MEA0101_02>
- Shute, Ventura & Kim (2013), Physics/Newton's Playground: <https://myweb.fsu.edu/vshute/pdf/JER.pdf>
- Shute, Wang, Greiff, Zhao & Moore (2016), Use Your Brainz problem-solving stealth assessment: <https://myweb.fsu.edu/vshute/pdf/pvz.pdf>
- Lumsden et al. (2016) systematic review, *JMIR Serious Games*: <https://games.jmir.org/2016/2/e11/>

**Cognitive batteries / precedents**
- Adaptive Cognitive Evaluation (ACE), Neuroscape UCSF: <https://neuroscape.ucsf.edu/researchers-ace/>
- NIH Toolbox Cognition Battery: <https://nihtoolbox.org/domain/cognition/>
- NeuroRacer — Anguera et al. (2013), *Nature*: <https://pmc.ncbi.nlm.nih.gov/articles/PMC3983066/>

**Construct paradigms**
- ANS / Panamath — Halberda, Mazzocco & Feigenson (2008), *Nature*: <https://www.nature.com/articles/nature07246>
- ANS in gifted adolescents — Wang, Halberda & Feigenson (2017): <https://labforchilddevelopment.com/wp-content/uploads/2018/08/wang-j-j-halberda-j-feigenson-l-2017-approximate-number-sense-correlates-with-math-performance-in-gifted-adolescents-acta-psychologica-176-78-84.pdf>
- Number-line / linear board games — Siegler (2016): <https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/Siegler2016-magknow.pdf>
- The Number Race (adaptive) — Wilson & Dehaene: <https://www.thenumberrace.com/nr/nr_bgnd.php?lang=en>
- Tower of London — Shallice (1982): <https://doi.org/10.1098/rstb.1982.0082>
- Mental rotation — Shepard & Metzler (1971): <https://doi.org/10.1126/science.171.3972.701>
- n-back — Jaeggi et al. (2008), *PNAS*: <https://doi.org/10.1073/pnas.0801268105>
- Spatial-skill malleability meta-analysis — Uttal et al. (2013): <https://doi.org/10.1037/a0028446>
- Persistence GBA — Ventura & Shute (2013): <https://doi.org/10.1016/j.chb.2013.06.033>

**Domain games (research on commercial titles / free tools)**
- Portal 2 vs Lumosity — Shute, Ventura & Ke (2015): <https://myweb.fsu.edu/vshute/pdf/portal1.pdf>
- Minecraft spatial RCT — Slattery et al. (2024): <https://www.sciencedirect.com/science/article/pii/S0959475224001300>
- Roblox learning systematic review — Hu et al. (2023): <https://www.mdpi.com/2227-7102/13/3/296>
- Tetris & mental rotation (ACT-R) — Gentile & Lieto (2022): <https://www.sciencedirect.com/science/article/pii/S1389041721000991>
- Zoombinis computational-thinking stealth assessment — EdGE at TERC: <https://www.terc.edu/projects/zoombinis-research/>
- SimCityEDU / Argubot Academy (ECgD) — GlassLab/ETS: <https://spacenews.com/ets-research-behind-glasslabs-launch-of-mars-based-grade-school-game/>

**SEL GBA**
- Zoo U criterion validity — DeRosier & Thomas (2017): <https://www.sciencedirect.com/science/article/abs/pii/S0193397316301514>
- Crystals of Kaydor — Kral et al. (2018), *npj Science of Learning*: <https://www.nature.com/articles/s41539-018-0029-6>

---

## IP caveats

- **Public research paradigms / open tools** (mental rotation, n-back, Corsi/spatial span, Tower of
  London, flanker, DCCS, ANS/Panamath, number-line, The Number Race, Physics Playground, VSNA, ECD,
  stealth assessment): `research_described` / `open_license`, `adapt_ok` or `reuse_verbatim` — build
  original stimuli/art around the paradigm.
- **Commercial games studied in research** (Portal 2, Minecraft, Roblox, Tetris, Zoombinis, SimCityEDU/
  Argubot, PvZ2/Use Your Brainz): the *method/finding* is citable, but the specific title is IP →
  `reuse_note=describe_only`; build an original equivalent. Do not reproduce game content.
- **Proprietary products** (`ip_status=proprietary_describe_only`, `entry_kind=item_type`,
  `reuse_note` starts `describe_only`): **pymetrics/Harver** (GB-031), **EndeavorRx/Akili** (GB-044),
  **Lumosity/Peak/CogniFit** (GB-045). Mechanic/construct mapping only.
- **Overclaiming caution (independent context):** Lumos Labs settled a **2016 U.S. FTC** action over
  unsupported cognitive-benefit advertising. Treat commercial suites (GB-045) and any
  training→ability transfer claims skeptically; **predictive validity ≠ program impact**, and near/far
  transfer for games like Tetris is contested (registered replication found no mental-rotation transfer).
- **Licensed instruments** (NIH Toolbox): the battery is licensed; the underlying paradigms are public
  → build original items rather than reproducing Toolbox content.

---

## Gaps & open assumptions

- **Verbal is the hardest to gamify without language/culture load.** Only 4 rows, mostly leaning on
  audio+picture (vocabulary), narrative inference, and argumentation. A low-bias verbal-reasoning game
  for the high tail is an open design problem. *(Open assumption: audio delivery meaningfully reduces
  decoding confounds — needs testing.)*
- **Tail ceilings.** Several executive tasks (flanker, DCCS, go/no-go, basic spans/CPT) are built to
  differentiate typical development and can ceiling for gifted children; they are better as
  *profiling/screening* than top-tail ranking unless extended with harder variants.
- **No GT-population validation exists** for any row here; all engagement→tail-truth claims are
  hypotheses pending piloting, calibration (ECD evidence models), and DIF/fairness study.
- **Scoring cost.** Stealth assessment requires ECD evidence models / Bayesian nets, not simple keys;
  this is the main operational risk to adopting the richest mechanics (systems sims, sandboxes).
- **Not searched deeply:** dedicated phonological-awareness assessment games, and a fluid-reasoning
  *matrix* game validated specifically in the gifted range — candidates for a follow-up pass.

*Claim labeling (per project guardrails):* **Verified** = correlations/findings reported in the cited
peer-reviewed sources (e.g., Use Your Brainz↔Raven's/MicroDYN, ANS↔math incl. gifted, Zoo U↔teacher
ratings). **Reasoned inference** = the engagement→fuller-effort→truer-tail thesis and stereotype-threat
application. **Company/product claim** = anything from vendor pages (pymetrics, EndeavorRx marketing,
Lumosity/Peak/CogniFit). Null/contested results (Tetris transfer; gamification's "mixed" measurement
effects in Lumsden et al.) are retained as valid outcomes, not omitted.

### notes_processing_speed.md

# Processing Speed — item-bank research notes

**Construct:** `processing_speed` · **Shard:** `shards/items_processing_speed.jsonl` · **Rows:** 40 (PS-001…PS-040)
**Requirements framing (research/discovery only):** H1 (broader measures than a single reasoning cutoff), H4 (less-coachable, lower-bias item types), H10 (engagement + coachability flags), R5 (item-level evidence toward a capability standard). This is discovery input; it does **not** ratify building the exam.

> **Headline for a GIFTED screen:** raw processing speed is a **weak standalone gifted signal.** It is one of the most practice-, device-, and attention-confounded things you can measure in a child. Its defensible value is narrow and two-fold: (a) **collateral evidence** that a child was fully engaged/effortful when doing the *reasoning* items, and (b) **response CONSISTENCY** — intra-individual RT variability and lapse/slowest-response frequency — which tracks ability better than peak speed. Design and score for those, not for "who taps fastest."

---

## 1. Subconstructs covered

All eight requested paradigms are represented, spread across K–8:

| Subconstruct | Rows | What it taxes | Notable IP |
|---|---|---|---|
| `visual_matching` (pattern/number comparison) | 7 | perceptual same/different speed | NIH Toolbox (describe); WJ Number-Pattern Matching (proprietary) |
| `symbol_search` | 5 | visual search / target-present speed | WISC-V Symbol Search (proprietary) |
| `cancellation` | 6 | selective + sustained attention, scanning | d2, WISC-V Cancellation, WJ Pair Cancellation (proprietary) |
| `coding_digit_symbol` | 6 | key-lookup substitution + associative learning | WISC-V Coding (proprietary); DSST paradigm (public) |
| `rapid_automatized_naming` | 5 | rapid lexical retrieval + serial scanning | RAN paradigm (research; CTOPP/RAN-RAS kits proprietary) |
| `simple_reaction_time` | 3 | detection + motor speed | Deary-Liewald / PEBL (open) |
| `choice_reaction_time` | 5 | decision speed under choice load (Hick) | Deary-Liewald / PEBL (open) |
| `inspection_time` | 3 | motor-free perceptual intake speed | classic public paradigm |

Coverage checks (verified programmatically): 40 rows, all parse as JSON with exactly the 18 required keys; age bands K-1 (6), 2-3 (4), 4-5 (7), 6-8 (14), K-8 (9); entry kinds item_type (25) / example_item (15); IP status research_described (15), open_license (13), proprietary_describe_only (7), public_domain (5).

---

## 2. Best public / open sources (with URLs)

**Openly reusable (copy / adapt / embed):**
- **PsyToolkit Experiment Library** — free, browser-based, downloadable/modifiable scripts. Backbone for reaction-time and coding tasks.
  - Library: https://www.psytoolkit.org/experiment-library/
  - Deary–Liewald simple + choice RT: https://www.psytoolkit.org/experiment-library/deary_liewald.html
  - Digit Symbol Substitution (DSST): https://www.psytoolkit.org/experiment-library/digit_substitution.html
- **PEBL (Psychology Experiment Building Language)** — GPL v2, 100+ tests (visual search, RT, cancellation).
  - https://pebl.sourceforge.net/ · https://github.com/stmueller/pebl · paper: https://pmc.ncbi.nlm.nih.gov/articles/PMC3897935/
- **DSST paradigm** — public since Otis (1918)/Thorndike (1919): https://en.wikipedia.org/wiki/Digit_symbol_substitution_test
- **Salthouse & Babcock Pattern/Letter/Number Comparison** — classic public research speed tasks: https://agingmind.utdallas.edu/speed-of-processing-2/
- **Inspection time** — classic public Pi-figure paradigm: https://en.wikipedia.org/wiki/Inspection_time · mechanism study: https://journalofcognition.org/articles/10.5334/joc.123
- **Generic cancellation (Letter/target Cancellation Test)** — public paradigm (the d2 is its commercial variant): https://www.millisecond.com/library/lettercancellationtask
- **UCancellation** — freely accessible mobile cancellation with auto-scored concentration index: https://pmc.ncbi.nlm.nih.gov/articles/PMC8806014/

**Research-described (characterize the paradigm; build our own stimuli):**
- **NIH Toolbox Pattern Comparison Processing Speed Test** — the model child-ready speed task; smiley/frowny buttons for under-8s; 90-second correct-count score.
  - Primary paper: https://pmc.ncbi.nlm.nih.gov/articles/PMC4424947/ · LOINC: https://loinc.org/84436-5 · program: https://www.healthmeasures.net/
  - Normative data (incl. ~5.5-pt one-week practice effect): https://pubmed.ncbi.nlm.nih.gov/26025230/
  - NIH Toolbox **Oral Symbol Digit** (motor-reduced coding): https://resources.nihtoolbox.org/wp-content/uploads/2024/09/NIH-Toolbox-App-Administrators-Manual-v1.23-08.09.2024.pdf
- **RAN** — strong reading-fluency predictor and unusually coaching-resistant.
  - Norton & Wolf (what educators need to know): https://learnlab.northwestern.edu/wp-content/uploads/2020/10/Norton-What-educators-need-to-know-about-RAN.pdf
  - Reading Rockets (Shanahan): https://www.readingrockets.org/blogs/shanahan-on-literacy/how-can-i-teach-ran-improve-my-students-reading
  - Eye-tracking pilot (RLN/RDN predict word-reading fluency): https://pmc.ncbi.nlm.nih.gov/articles/PMC12921791/

---

## 3. Engagement opportunities (this is the easiest construct to gamify)

Speed tasks are the *most* naturally game-like items in the whole bank — arcade timing, countdowns, combo meters, "beat the clock." That is both the opportunity and the trap.

- **Top affordances:** arcade "spot/tap the target" with a combo meter (PS-009, PS-040); "whack-it" reflex game with catch trials (PS-029); auto-advancing mobile cancellation sweeps (PS-015, PS-016); rhythm-like scrolling DSST decode (PS-019, PS-039); level-up tiers via string length or choice count (PS-003, PS-032); unspeeded "what did you see?" flash rounds for inspection time (PS-035).
- **Design guardrail (non-negotiable):** never reward raw speed alone. Gate the combo on **accuracy** and break it on **false alarms** (PS-040 is the reference pattern), use **catch/empty-target trials** to punish anticipatory tapping (PS-027, PS-029), and headline **consistency/steadiness** rather than the single fastest response. Otherwise the game actively rewards impulsive fast-but-wrong responding — which is the opposite of the ability signal and biases against careful, able children.
- **Age fit:** K–1/2–3 lean on pictorial/interactive, non-verbal responses (smiley/frowny, tap-the-animal). Spoken RAN works from K–1 but needs voice-timing capture. Inspection time and Hick-slope choice RT suit 6–8.

---

## 4. Honest advantages **and** limits vs CogAT

**What CogAT does not give you (the genuine edge):**
- CogAT yields **no timing or process data at all.** Speed tasks add a behavioral layer: an **effort/engagement check** (was the child actually trying on the reasoning items?), an **impulsivity read** (false-alarm rate), and a **consistency signal** (RT variability / lapse frequency).
- **Response CONSISTENCY, not peak speed, is the ability-linked part.** Per the worst-performance rule, a child's *slowest* responses carry more of the ability signal than their fastest (PS-037). This is the single most important design lesson for the construct.
- **RAN is unusually coaching-resistant** (a dedicated training study found no reliable transfer to RAN or reading) and predicts reading fluency beyond phonological awareness — a genuinely *less-coachable*, equity-relevant collateral measure (serves H4).
- **Motor-free variants reduce confounds:** inspection time (unspeeded response, PS-034–036) and oral/spoken coding (PS-021) avoid the touchscreen/graphomotor latency that contaminates tap-speed tasks — a fairness advantage for motor-delayed but able children.

**The limits (state these plainly):**
- **Weak tail discrimination.** Every speed subtest here is `tail_discrimination: low` to `low-to-med`. Speed tasks are built to be easy and error-minimized, so they measure *rate*, not *ceiling ability*. Gifted children sometimes even score modestly on processing speed relative to their reasoning — using a speed cutoff would *mis-screen* able-but-deliberate kids.
- **Heavily confounded.** Large practice effects (the NIH norming showed ~5.5 points in a week; DSST/coding keys get memorized), device/frame-rate/touch latency, fine-motor demands, and especially **attention/ADHD, motivation, and fatigue** all move scores independent of ability.
- **Bottom line:** processing speed should be **collateral/supporting evidence**, never a standalone gifted criterion or gate. Its best uses are engagement verification and consistency/lapse analytics, not "faster = smarter."

---

## 5. IP caveats

- **Describe-only, proprietary (7 rows):** WISC-V **Coding**, **Symbol Search**, **Cancellation** (Pearson); Woodcock-Johnson **Number-Pattern (Visual) Matching**, **Letter-Pattern Matching**, **Pair Cancellation** (Riverside); **d2 Test of Attention** (Brickenkamp/Hogrefe). All entered as `entry_kind: item_type`, `ip_status: proprietary_describe_only`, `reuse_note: describe_only`. We characterize the *format only* and must build original stimuli/keys — never reproduce secure content or copy their symbols.
- **Paradigm vs. product:** DSST, cancellation, inspection time, simple/choice RT, and pattern comparison are **public/research paradigms** even where specific commercial implementations exist (e.g., WAIS/WISC Coding, Inquisit/Millisecond scripts, Cogstate DSST). We cite the paradigm and build our own; PS-039 flags that the Millisecond DSST *implementation* is commercial though the paradigm is public.
- **NIH Toolbox** is `research_described`/`describe_only`: the paradigm is well-documented and free to model, but Toolbox items/app content are controlled — reproduce the *design*, not the items.
- **RAN** is a public research paradigm, but normed kits (**CTOPP-2**, **RAN/RAS**) are proprietary — build our own grids.

---

## 6. Gaps / open questions for follow-up

- **Consistency scoring is a build dependency, not a freebie.** The ability-linked value (RT variability, tau, lapse rate) requires capturing the *full* response-time distribution and reliable device timing — spec this before piloting.
- **Speech-timed RAN** needs voice-onset capture/scoring; not yet a solved engineering piece for young children on tablets.
- **Device fairness:** touch-latency and frame-rate differences across devices could induce measurement bias; needs a calibration/normalization plan (or lean on motor-free inspection time).
- **DIF/fairness review** still owed for orthographic tasks (Letter-Pattern Matching, RAN letters) which advantage stronger/native readers.
- **No claim of predictive validity or program impact** is made here; these are candidate item *types*, and access ≠ reliability ≠ outcome change ≠ causal impact.

### notes_quantitative.md

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

### notes_spatial.md

# Spatial / Visualization — Item-Bank Research Notes

Companion to `shards/items_spatial.jsonl` (40 rows, item IDs `SP-001`–`SP-040`).

## Why this construct is our biggest advantage (H1)

- **Construct:** spatial / visualization ability — the capacity to generate,
  hold, and transform visual-spatial representations (rotate, fold, assemble,
  slice, and re-orient the self).
- **STEM prediction beyond verbal/quant:** In the SMPY / Project TALENT
  synthesis, spatial ability predicts STEM educational and occupational
  outcomes *over and above* math and verbal ability, and identifies talented
  students that math/verbal measures miss (Wai, Lubinski & Benbow, 2009,
  *Journal of Educational Psychology*).
- **The CogAT gap (the core opportunity):** CogAT's Nonverbal Battery
  (Figure Matrices, Paper Folding, Figure Classification) is primarily
  *figural reasoning* — it loads heavily on fluid *g*, not on true 3D
  visualization/mental rotation. Lohman (2005) and the Wai & Lakin review are
  explicit that nonverbal/matrix tests "do not [measure spatial reasoning]
  well, if at all," because spatial ability is most closely tied to 3D mental
  rotation, which such tests do not capture. So the incumbent under-weights
  exactly the ability that best forecasts STEM talent — and disproportionately
  overlooks spatially gifted, twice-exceptional, and English-language-learner
  (ELL) students.
- **Design consequence:** a purpose-built, *scaled and interactive* spatial
  battery is a defensible differentiator, not a nice-to-have.

## Subconstructs covered (all 8 requested)

| Subconstruct | Rows | Anchor sources |
|---|---|---|
| mental_rotation (2D/3D) | SP-001, 002, 003, 004, 005, 006, 007, 040 | Vandenberg-Kuse MRT; Shepard-Metzler; PSVT:R; ETS S-1/S-2; children's MRT |
| paper_folding | SP-008, 009, 010, 011, 012 | ETS VZ-2; Mental Folding Test for Children; CogAT (incumbent) |
| spatial_visualization | SP-013, 014, 015, 016, 037, 038, 039 | ETS VZ-3 Surface Development; DAT Space Relations; CogAT / NNAT (incumbents) |
| form_board / figure_assembly | SP-017, 018, 019, 020, 021, 022 | ETS VZ-1 Form Board; CMTT; TOSA; WISC-V Visual Puzzles (incumbent) |
| block_design | SP-023, 024 | WISC-V Block Design (incumbent); Kohs 1920 (public domain) |
| mazes / route_planning | SP-025, 026, 027, 028 | Porteus Maze Test; CogniFit/NEPSY route-finding |
| perspective_taking | SP-029, 030, 031, 032 | Spatial Orientation / Object Perspective Test; Money Road-Map |
| cross_sections of solids | SP-033, 034, 035, 036 | Santa Barbara Solids Test (Cohen & Hegarty; Munns IRT form) |

## Coverage summary (verified programmatically)

- **40 rows**, unique IDs, all valid single-line JSON with exactly the 18 keys.
- **Age bands:** K-1 = 7, 2-3 = 5, 4-5 = 4, 6-8 = 19, K-8 = 5 (all five bands present).
- **Entry kind:** 22 `example_item`, 18 `item_type`.
- **Modality:** 20 interactive, 18 figural, 2 pictorial.
- **Response format:** 24 mcq, 10 constructed, 3 drag_drop, 3 timed_tap.
- **IP status:** 9 public + 1 public_domain, 22 research_described, 1 vendor_described, 7 proprietary_describe_only (all 7 proprietary rows are `item_type` + `describe_only`).

## Age-scaling logic (K-1 up to 6-8)

- **K-1 / 2-3 (down-scaled):** concrete, low-language, high-manipulation —
  2D rotation of familiar animals (SP-004), rotate-not-flip matching (SP-005),
  single/two-fold folding with bicolor paper (SP-009/010), combine-two-pieces
  synthesis (SP-018), build-to-match assembly (SP-019/020/022), simple mazes
  (SP-027), road-map left/right (SP-031), doll's-eye viewpoint (SP-032),
  slice-the-fruit (SP-036).
- **4-5 (bridge):** interactive net folding (SP-015), Kohs cube designs
  (SP-024), path-tracing mazes (SP-025).
- **6-8 (full difficulty):** true 3D mental rotation and cube comparison
  (SP-001/002/003/040), multi-fold + punch (SP-008/012), surface development
  (SP-013), form board (SP-017), route optimization (SP-028), perspective
  transformation (SP-029/030), cross-sections incl. embedded solids and IRT
  short form (SP-033/034/035).
- **K-8 item families:** parameterized engines that span grades
  (drag-to-rotate SP-007; incumbent CogAT/NNAT contrasts SP-011/037/038/039).

## Engagement affordances (spatial tasks are inherently gamifiable)

Filled for every row. Recurring, buildable mechanics:

- **Drag-to-rotate / flick-to-spin** 3D objects with snap + haptics (SP-001, 007, 040) — "match-the-crystal", dice-matching.
- **Slider-driven cross-sections:** advance a cutting plane through a rotating solid with a live 2D section (SP-034).
- **Fold/build manipulatives:** fold the box (SP-015), tangram fill (SP-022), tower building (SP-020), origami fold-and-punch (SP-008/012).
- **Route/maze play:** help-the-puppy-home (SP-027), treasure map (SP-026), delivery-robot optimization (SP-028), drive-the-car left/right (SP-031).
- **Speeded "beat-the-clock" tap** for chronometric rotation (SP-003, 004).
- **Compass/dial pointing** for perspective-taking (SP-029, 030).

This interactivity is itself a differentiator: the incumbent formats
(CogAT, DAT, and even WISC's clinician-administered tasks) are static or
non-reusable; several rows explicitly note "none in the source" to mark that gap.

## Adaptivity & tail-discrimination strategy

- Most difficulty drivers are continuous and thus support **Automatic Item
  Generation (AIG)** and **computer-adaptive** delivery: rotation angle/axis,
  figure complexity (# cubes), fold/punch count, net faces, cutting-plane
  obliqueness, embedded-vs-simple solids, perspective-shift angle, maze
  branching, grid size/targets.
- **Tail discrimination** (for a gifted cut) is strongest with: large angular
  disparity + asymmetric/multi-cube figures; oblique cuts of embedded solids;
  multi-fold + multiple punches; no-preview interactive conditions; and
  latency-plus-accuracy scoring. The SBST **IRT short form** (SP-035) is called
  out because it maximizes information near the high-ability cut.

## Coachability, bias, and fairness

- **Malleability is real but benign:** spatial skills train up (Uttal et al.,
  2013 meta-analysis, Hedges's *g* ≈ 0.47), but gains are **durable and
  transfer** to untrained tasks — training effects do not by themselves
  invalidate the construct. Mitigate rote coaching with AIG-refreshed novel
  stimuli (noted per row).
- **ELL / low-language advantage:** figural and interactive items carry minimal
  reading load, improving fairness for ELL and pre-readers — a documented
  motivation for nonverbal testing, and a strength we exploit deliberately.
- **Fairness watch-items:** mental rotation shows well-documented mean sex
  differences (flag for DIF analysis, not exclusion); young spatial-assembly
  tasks (CMTT, TOSA) show SES-linked differences — monitor and pair with
  access/opportunity context, never treat as fixed talent.

## Best public / open sources (working URLs)

- **ETS Kit of Factor-Referenced Cognitive Tests (1976)** — VZ-1 Form Board,
  VZ-2 Paper Folding, VZ-3 Surface Development, S-1 Card Rotation, S-2 Cube
  Comparison: https://www.ets.org/content/dam/static-resources/Media/Research/pdf/FRCT-KIT-76.pdf
- **Vandenberg & Kuse Mental Rotations Test (1978)** (Shepard-Metzler redraws): https://doi.org/10.2466/pms.1978.47.2.599
- **Shepard & Metzler (1971), Science** (rotation paradigm): https://doi.org/10.1126/science.171.3972.701
- **Revised Purdue Spatial Visualization Test: Rotations (PSVT:R)** — SILC: https://www.spatiallearning.org/tools/revised-purdue-spatial-visualization-test-revised-psvtr-visualization-of-rotations
- **Santa Barbara Solids Test (Cohen & Hegarty, 2012; Munns et al., 2023 IRT)** — Hegarty Lab: https://hegarty-lab.psych.ucsb.edu/node/231 · SILC: https://www.spatiallearning.org/tools/santa-barbara-solids-test
- **Spatial Orientation / Object Perspective Test (Hegarty & Waller, 2004)** — Hegarty Lab: https://hegarty-lab.psych.ucsb.edu/node/221
- **Mental Folding Test for Children (Harris, Hirsh-Pasek & Newcombe, 2013)** — SILC: https://www.spatiallearning.org/tools/mental-folding-test-for-children-mftc
- **Children's Mental Transformation Task (Levine et al., 1999)** — SILC: https://www.spatiallearning.org/tools/childrens-mental-transformation-task-cmtt
- **Test of Spatial Assembly (Verdine et al., 2013)** — Child Development: https://doi.org/10.1111/cdev.12165
- **Kohs Block-Design Tests (1920, public domain)** — full text: https://upload.wikimedia.org/wikipedia/commons/6/66/Kohs-Block-Design_tests-1920.pdf
- **Porteus Maze Test (Porteus, 1950)**: https://en.wikipedia.org/wiki/Porteus_Maze_test

Supporting evidence (for rationale, not items):

- **Wai, Lubinski & Benbow (2009)** — spatial predicts STEM: https://cdn.vanderbilt.edu/t2-my/my-prd/wp-content/uploads/sites/826/2013/02/Wai2009SpatialAbility.pdf
- **Uttal et al. (2013)** — malleability meta-analysis (DOI 10.1037/a0028446): https://pubmed.ncbi.nlm.nih.gov/22663761/
- **Lohman (2005)** — nonverbal tests ≠ spatial ability (DOI 10.1177/001698620504900203); Wai & Lakin review: https://files.eric.ed.gov/fulltext/ED660319.pdf

## IP caveats

- **Public / public domain (reproduce or adapt):** ETS Kit tests (VZ-1/2/3,
  S-1, S-2) and Kohs 1920 blocks. `ip_status = public` / `public_domain`,
  `reuse_note = reproduce_ok` or `adapt_ok`. Author original stimuli even when
  reproduction is allowed, to control difficulty and resist coaching.
- **Research instruments (adapt / redraw for research):** MRT, PSVT:R, SBST,
  SOT/OPT, MFTC, CMTT, TOSA, children's MRT, Money Road-Map. `ip_status =
  research_described`, `reuse_note = adapt_ok`. Build our own figures in the
  documented style; cite originators.
- **Proprietary — DESCRIBE ONLY (do not copy items):** WISC-V Block Design
  (SP-023) and Visual Puzzles (SP-021), DAT Space Relations (SP-014), CogAT
  Nonverbal Paper Folding / Figure Matrices / Figure Classification
  (SP-011/037/038), NNAT Spatial Visualization cluster (SP-039). All are
  `entry_kind = item_type`, `ip_status = proprietary_describe_only`,
  `reuse_note = describe_only`. They are catalogued as incumbents/contrasts, not
  as reusable content.
- **Vendor-described:** CogniFit Maze Test (SP-028) documents a computerized
  maze/route paradigm derived from the public Porteus/NEPSY tradition; build
  original grids.

## Governance framing (this deliverable)

- **Serves:** H1 (spatial/visualization as the key advantage vs. CogAT). Feeds
  later requirement work on construct coverage, adaptivity, and fairness.
- **Acceptance evidence:** 40-row shard parses as JSON with all 18 keys and
  valid enums (verified); all 8 subconstructs and all age bands represented;
  every row has specific `advantage_vs_cogat` and `engagement_affordance`; IP
  status/reuse correct per source class.
- **Open assumptions:** (a) exact GT program R/H requirement IDs, cut scores,
  and delivery platform live in the capstone governance docs and are not
  restated here; (b) engagement affordances are design *proposals*, not yet
  usability-tested; (c) predictive-validity and DIF claims require our own data
  before any operational use.
- **Out of scope (for this task):** scoring keys, calibration data, final blueprint
  weighting, and any edits outside these two files.

### notes_verbal.md

# Verbal Reasoning — item-bank research notes

Companion narrative for `shards/items_verbal.jsonl`. This is **research/discovery input** to
inform possible in-house K–8 gifted item development. It does **not** ratify building the exam.

- **Construct:** `verbal` (item IDs `VR-001`–`VR-038`)
- **Requirements served (research framing):** H1 (broader measures than a single reasoning
  cutoff), H4 (expand who can demonstrate ability via less-coachable / lower-bias formats),
  H10 (minimize gaming/burden via engagement + coachability flags), R5 (item-level evidence
  base toward a defensible capability standard).
- **Rows:** 38 (target was 30–45).

## Why verbal is the highest-risk construct

Verbal items carry the **largest language and cultural bias and the highest coachability
risk** of any construct in the bank. Vocabulary, syntax, and world-knowledge loads all
correlate with print exposure, home language, and socioeconomic status, and every one of
these item types is drillable. Because a core project goal is **broadening the pool** (H4),
the design bet running through every row is:

> **oral/audio delivery + picture support + adaptive vocab-leveling** (holding *reasoning*
> difficulty constant while lowering *rare-word/decoding* load) is how a verbal screen can
> measure reasoning instead of privilege.

`coachability_bias_risk` is filled specifically for all 38 rows, and `advantage_vs_cogat`
explains, per row, how oral delivery / picture support / frequency-controlled vocabulary can
*reduce* that bias.

## Coverage

| Dimension | Breakdown |
|---|---|
| **Age bands** | K-1: 10 · 2-3: 5 · 4-5: 10 · 6-8: 12 · K-8: 1 |
| **Entry kind** | `example_item` (public/linked): 15 · `item_type` (described): 23 |
| **IP status** | gov_released: 12 · proprietary_describe_only: 14 · open_license: 5 · research_described: 5 · public_domain: 2 |
| **Subconstructs** | verbal_analogy: 5 · sentence_completion: 3 · sentence_arrangement: 1 · verbal_classification: 3 · antonyms_synonyms: 7 · verbal_absurdities: 2 · inference_reading_comprehension: 10 · following_oral_directions: 5 · receptive_vocabulary: 2 |
| **Modality** | verbal: 20 · mixed (audio+picture): 10 · audio: 4 · pictorial: 3 · interactive: 1 |

All seven requested subconstructs are covered, plus `receptive_vocabulary` (picture vocab)
and `sentence_arrangement` (productive syntax) as verbal extensions.

### Pre-reader (K–1) emphasis — 10 orally/picture-administered items

For pre-readers we deliberately avoid print. Ten K-1 rows are oral- or picture-based:

- `VR-002` Picture Analogies · `VR-005` Sentence Completion (oral) · `VR-009` Picture
  Classification · `VR-016` Picture Absurdities · `VR-023` Following Directions (oral) ·
  `VR-024` Aural Reasoning · `VR-025` HTKS-R opposites/following-directions · `VR-027`
  PPVT-5 receptive picture vocab · `VR-028` NIH Toolbox Picture Vocabulary (CAT) ·
  `VR-033` oral/picture opposites.

These let a 5-year-old demonstrate verbal *reasoning* without reading a word — the single
biggest fairness lever for early identification.

## Best public sources (reproduce / link)

| Source | URL | Use |
|---|---|---|
| NAEP Reading — Sample Questions | https://www.nationsreportcard.gov/reading/sample-questions/ | literary & informational inference; meaning-vocabulary-in-context |
| NAEP Questions Tool (3,000+ items) | https://www.nationsreportcard.gov/nqt/ | released reading items w/ scoring + p-values |
| Smarter Balanced Sample Items | https://sampleitems.smarterbalanced.org/ | context-clue cloze; ELA listening (oral) |
| Texas STAAR Released Test Questions | https://tea.texas.gov/data-reports/staar/staar-released-test-questions | reading inference; vocab-in-context; Spanish + read-aloud versions exist |
| NY State Grades 3–8 ELA Released Questions | https://www.nysedregents.org/ei/ela/2024/2024-released-items-ela-g3.pdf (and `...-g4.pdf`) | inference + "writing to sources"; word-meaning |
| PISA 2018 Released Reading (Rapa Nui, etc.) | https://www.oecd.org/en/about/programmes/pisa/pisa-test.html | fact/opinion, evaluate-and-reflect (strong tail) |
| SUBTLEX-US word frequency (CC-BY-SA) | https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexus | Zipf frequency for adaptive **vocab-leveling** across all item types |
| ICAR — Verbal Reasoning (public domain) | https://icar-project.org/ | calibrated, rotatable analogy / inference pool |

## Proprietary sources — describe format only (never reproduce secure content)

All 14 proprietary rows are `entry_kind=item_type`, `ip_status=proprietary_describe_only`,
`reuse_note=describe_only`.

- **CogAT** (Riverside Insights) — https://riversideinsights.com/k12-assessments/cogat —
  Verbal Analogies, Verbal/Picture Classification, Sentence Completion. K–2 (Levels 5/6–8)
  is **picture-based and read aloud** (no reading required) — the closest existing analog to
  our pre-reader plan and the incumbent we must beat on fairness.
- **OLSAT 8** (Pearson) — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/olsat8/olsat8-overview-brochure.pdf —
  Following Directions, Aural Reasoning (both **oral**, Levels A–C), Antonyms, Sentence
  Completion, Sentence Arrangement, Verbal Analogies/Classification.
- **WISC-V** (Pearson) — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wiscv-integrated-brochure.pdf —
  Vocabulary, Similarities, Comprehension (constructed/spoken; deep tail).
- **PPVT-5** (Pearson) — https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Academic-Learning/Peabody-Picture-Vocabulary-Test-%7C-Fifth-Edition/p/100001984 —
  receptive picture vocabulary (point-to-picture), ages 2:6+.
- **Miller Analogies Test** (Pearson) — https://en.wikipedia.org/wiki/Miller_Analogies_Test —
  **retired Nov 2023**; retained only as a *format reference* for ceiling-rich, rare-relation
  analogies.

## Open / research-described sources

- **HTKS / HTKS-R** (Oregon State Kindergarten Readiness) —
  https://health.oregonstate.edu/research/kreadiness/measure — near-language-free
  follow-the-opposite-command game; the HTKS-R adds a verbal "opposites" section. Lowest
  bias/coachability in the bank; request research access. `research_described`.
- **NIH Toolbox Picture Vocabulary Test** — https://nihtoolbox.org/test/picture-vocabulary-test/ —
  ready-made **computer-adaptive** receptive-vocab engine (ages 3+, ~3 min, iPad).
- **ETS Kit of Factor-Referenced Cognitive Tests** —
  https://www.ets.org/content/dam/static-resources/Media/Research/pdf/FRCT-KIT-76.pdf —
  validated factor markers (Opposites Test = antonyms; Vocabulary tests) to anchor a scale;
  **licensing/royalty required**, so describe and build parallels.
- **Absurdities exercises** (D. Newman, SLP; free) —
  https://impactofspecialneeds.weebly.com/uploads/3/4/1/9/3419723/absurdities.pdf — example
  material for the verbal-absurdities type (classic Stanford-Binet/DTLA lineage). Write
  original scenarios; confirm the author's terms before any verbatim use.

## Top engagement affordances (fold into a game layer)

1. **'word-bridge' / 'bridge builder'** — drag the word that completes an analogy across a
   bridge, with audio support for early readers (`VR-001`, `VR-038`).
2. **'listen-and-tap' / 'direction dash'** — Simon-Says oral-directions on a picture grid;
   auto-generates and scales difficulty (`VR-023`, `VR-037`).
3. **'spot the goof' / 'silly detector'** — tap what's wrong in a picture/scenario
   (absurdities); intrinsically fun and inference-rich (`VR-015`, `VR-016`).
4. **'context detective' / 'fact-finder'** — highlight the evidence, then answer;
   rewards close reading (`VR-007`, `VR-018`).
5. **'point-and-pop' CAT** — tap the matching picture for a spoken word; already adaptive
   via basal/ceiling rules (`VR-027`, `VR-028`).

## Biggest advantages vs CogAT (fairness-first)

- **Pre-reader oral/picture delivery at scale.** CogAT K–2 is picture/oral but fixed and
  not adaptive; we can adapt difficulty *and* rotate culturally-balanced imagery.
- **Adaptive vocab-leveling with an open corpus (SUBTLEX Zipf).** Equate word familiarity
  across items so *relation/reasoning* difficulty, not word rarity, drives the score —
  directly attacking the ELL / low-print-exposure bias CogAT verbal carries.
- **Channels CogAT omits:** following oral directions & aural reasoning (`VR-023/024/025/037`),
  critical evaluation / fact-vs-opinion (`VR-019/031`), evidence-based comprehension &
  writing (`VR-017/018/021`), and constructed verbal expression (`VR-014/034`).
- **A near-language-free option (HTKS-R)** to catch reasoning/self-regulation in children
  whose vocabulary hasn't yet caught up — the clearest pool-broadening lever.

## IP caveats

- **gov_released / public_domain / open_license** rows may be reproduced or linked
  (attribute SUBTLEX under CC-BY-SA; rotate exposed ICAR items).
- **research_described** rows require access requests or licensing (HTKS, NIH Toolbox, ETS
  Kit) or care with a third-party free resource (absurdities workbook) — describe/adapt, do
  not copy secure keys.
- **proprietary_describe_only** rows (CogAT, OLSAT, WISC-V, PPVT-5, MAT): **format
  descriptions only; no secure item content reproduced.**

## Gaps & next steps

- **No K-1 released public verbal items exist** — public banks (NAEP/STAAR/NY/PISA/SBAC)
  start at grade 3. Pre-reader items are therefore described `item_type`s to be built; this
  is the main original-authoring workload.
- **Constructed/spoken scoring** (`VR-014`, `VR-034`, `VR-015`) needs a rubric or AI scorer
  before it can scale.
- **DIF/fairness testing is mandatory** for every drafted verbal item (by home language,
  race/ethnicity, SES) before use — flagged because verbal is the highest-DIF construct.
- **Token Test-style multi-step oral directions** (strong tail, low print) is a promising
  addition once a citable open protocol is sourced; currently approximated by `VR-037`.

## URL liveness (checked)

17 of 19 unique source URLs returned HTTP 200 on a scripted check. The two **oecd.org**
URLs returned 403 to a non-browser user agent (OECD bot-protection); both resolve normally
in a browser and their content was retrieved during research.

### notes_working_memory.md

# Working Memory / Executive Function — item-bank notes

Research/discovery notes for the `working_memory` shard
(`shards/items_working_memory.jsonl`). This catalog is input for possible item
development. It does **not** ratify building the exam.

- **Construct:** working memory (WM) and executive function (EF), catalogued
  together because EF control tasks (inhibition, set-shifting) are the tasks
  that make WM measurable under load.
- **Requirements served (research framing):** H1 (measure constructs a single
  CogAT reasoning cutoff under-weights), H4 (less-coachable, lower-language-load
  item types that widen who can demonstrate ability), H10 (engagement / reduced
  gaming and burden), R5 (item-level evidence toward a defensible capability
  standard).
- **Rows:** 42 (target was 30–45).
- **Entry kinds:** 23 `example_item` (concrete, reproducible/adaptable tasks) +
  19 `item_type` (described types, incl. all proprietary + broad instruments).

## Coverage

| Age band | Rows |
|---|---|
| K-1 | 9 |
| 2-3 | 8 |
| 4-5 | 7 |
| 6-8 | 8 |
| K-8 (spans whole range) | 10 |

**Subconstructs (34 distinct).** All requested targets are covered:

- WM storage/manipulation: forward digit span (WM-001), backward digit span
  (WM-002), List Sorting / animal-size span (WM-003), WISC-V Digit Span
  (WM-004), Corsi forward (WM-005) and backward (WM-006), WISC-V Picture Span
  (WM-007), CANTAB Spatial WM self-ordered search (WM-008).
- Updating: n-back (WM-009, WM-010, WM-012), dual n-back (WM-011), running
  memory span (WM-013, WM-014), keep-track (WM-020), numeric memory updating
  (WM-021), symbol-counter (WM-022).
- Complex span: operation (WM-015), symmetry (WM-016), rotation (WM-017),
  reading (WM-018), counting (child) (WM-019).
- Inhibition: go/no-go (WM-023, WM-024), Flanker (WM-025, WM-026), Stroop
  (WM-027), numerical Stroop (WM-028), day-night child Stroop (WM-029),
  stop-signal (WM-030), NEPSY-II Inhibition/Statue (WM-031), D-KEFS Color-Word
  Interference (WM-032).
- Set-shifting: DCCS standard/border/computerized (WM-033, WM-034, WM-035),
  task switching alternating-runs and cued (WM-036, WM-037), Wisconsin/BCST
  card sort (WM-038), CANTAB IED (WM-039).
- Integrated EF: HTKS embodied opposites game (WM-040), TabCAT-EXAMINER tablet
  battery (WM-041), AWMA four-subcomponent child battery (WM-042).

K-1 rows are deliberately simpler and picture/animal/embodied
(fireflies Corsi, animal-size List Sorting, catch-the-fish go/no-go, fish
Flanker, opposite-day day-night Stroop, DCCS toy sort, HTKS).

## Best public / open sources (reproduce, adapt, or link)

- **PsyToolkit experiment library** — openly published, free-for-research task
  code for nearly every classic paradigm: Corsi
  (https://www.psytoolkit.org/experiment-library/corsi.html), backward Corsi
  (https://www.psytoolkit.org/experiment-library/backward_corsi.html), digit
  span (https://www.psytoolkit.org/experiment-library/digitspan.html), 2-back
  (https://www.psytoolkit.org/experiment-library/nback2.html), go/no-go
  (https://www.psytoolkit.org/experiment-library/go-no-go.html), Flanker
  (https://www.psytoolkit.org/experiment-library/flanker.html), Stroop
  (https://www.psytoolkit.org/experiment-library/stroop.html), task switching
  (https://www.psytoolkit.org/experiment-library/taskswitching.html), library
  index (https://www.psytoolkit.org/experiment-library/). Best single starting
  point for buildable prototypes.
- **PEBL Test Battery** — open-source (GPL) implementations incl. dual n-back,
  symbol-counter, and Berg/Wisconsin card sort:
  https://pebl.sourceforge.net/ ; task list
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3897935/ .
- **Georgia Tech Attention & Working Memory Lab (Engle lab)** — the reference
  automated complex-span and running-span tasks, free for research with
  citation: https://englelab.gatech.edu/standardtasks.html ,
  https://englelab.gatech.edu/taskdownloads , running span validation
  https://englelab.gatech.edu/articles/2010/broadway-engle-2010.pdf .
- **NIH Toolbox Cognition Battery** — normed, government-released models to
  describe/link (List Sorting WM https://nihtoolbox.org/test/test/ ; Flanker
  https://nihtoolbox.org/test/flanker-inhibitory-control-and-attention-test-age-12/ ;
  DCCS https://nihtoolbox.org/test/dimensional-change-card-sort-test/ ). Content
  is credential-gated, so treat as `describe_only`.
- **Zelazo DCCS (Nature Protocols)** https://www.nature.com/articles/nprot.2006.46
  and Millisecond DCCS scripts https://www.millisecond.com/library/cardsort/dccs .
- **Child-specific classics:** day-night task (Gerstadt, Hong & Diamond 1994)
  https://www.academia.edu/51238342/A_review_of_the_day_night_task_The_Stroop_paradigm_and_interference_control_in_young_children ;
  Head-Toes-Knees-Shoulders (HTKS) protocol
  https://cdn.vanderbilt.edu/t2-my/my-prd/wp-content/uploads/sites/412/2013/01/HTKS-without-stats-info.pdf .
- **Memory updating:** Ecker, Lewandowsky & Oberauer (2010)
  https://www.emc-lab.org/uploads/1/1/3/6/113627673/ecker.2010.jeplmc.pdf ;
  running-span updating time-course
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7790168/ .

## Best engagement opportunities (why WM/EF is the most gamifiable construct)

Every task here is inherently **timed and interactive**, so gamification is
native rather than bolted on:

- **Adaptive staircases feel like leveling up.** Span length (Corsi
  "fireflies", digit "train cars"), n-back depth, and stop-signal delay all
  auto-staircase to ability, so difficulty tracks skill with an endless
  auto-generated item pool (near-zero authoring cost, strong `adaptivity_fit`).
- **Vivid, low-language mechanics travel across ages and cultures:**
  catch-the-fish / dodge-the-shark (go/no-go), swimming-fish Flanker,
  opposite-day (day-night Stroop), sort-the-toys-then-flip-the-rule (DCCS),
  conveyor-belt running span, keep-the-latest scoreboard (keep-track),
  tally-monsters (symbol-counter), embodied opposites (HTKS).
- **Combo/streak reward loops** naturally reinforce the very thing being
  measured — sustained updating and control.

## Biggest advantages vs CogAT (the core case)

1. **Constructs CogAT omits.** CogAT indexes fluid/verbal/quantitative/spatial
   reasoning; it has no working-memory span, no updating, no inhibition, and no
   set-shifting measure. These tasks add a whole capability dimension (H1).
2. **Process data CogAT structurally cannot produce.** Because the tasks are
   timed and trial-by-trial, they emit reaction time (RT), RT variability,
   commission/omission errors, false-alarm rates, switch costs, interference
   costs, perseverative errors, and search-strategy indices. CogAT yields an
   answer-key score per item and no latency or error dynamics.
3. **Better tail discrimination.** Reversal (backward span), higher n, dual
   load, unpredictable stop/endpoint, and mixed switching all raise the ceiling,
   which matters for a gifted population where reasoning-only items saturate.
4. **Lower coachability and language/culture load** for the nonverbal variants
   (H4) than heavily verbal reasoning items — with important caveats below.

## Coachability, fairness, and the "score consistency, not speed" rule

This is the most important measurement caution for the whole shard, and it is
flagged in the `coachability_bias_risk` field of the timed rows:

- **Attention / ADHD is a first-order confound.** Go/no-go commission errors,
  stop-signal SSRT, Flanker/Stroop interference costs, and n-back lapses are all
  elevated by inattention and impulsivity. A low score can reflect attentional
  state rather than capability, so these tasks must not be read as pure ability
  and should be reported with error-type detail, not a single scalar.
- **A child's slowest / lapse responses — not their peak speed — track
  ability.** The "worst performance rule" holds that the slowest RT bins
  correlate with cognitive ability more strongly than the fastest bins, and this
  pattern is largely explained by occasional attentional lapses; it generalizes
  to children.
  - Attentional-lapses account: https://pmc.ncbi.nlm.nih.gov/articles/PMC8788519/
  - WMC / not-best-performance latent analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC7713012/
  - Generalization across the lifespan (incl. children): https://www.sciencedirect.com/science/article/abs/pii/S0160289613001323
  - **Design implication:** temporal features should target **consistency**
    (intra-individual RT variability, lapse rate, tail of the RT distribution),
    **not raw or peak speed**. Reward staying on-task, and treat lapse trials as
    signal to be modeled rather than noise to be maximized-away.
- **Trainable tasks.** N-back and dual n-back are famous training targets and
  are coachable; span tasks have a practice/rehearsal (chunking) market. Prefer
  tasks with a processing step (complex span), a hidden endpoint (running span),
  or an unpredictable rule (cued switching, WCST) where rote practice helps less.
- **Skill confounds to control for:** reading/decoding (reading span, Stroop),
  arithmetic (operation span, numeric updating), counting fluency (counting
  span), number knowledge (numerical Stroop), and fine-motor speed on touch
  taps for the youngest children.

## IP caveats

- **Open / adaptable (`open_license`, 17 rows):** PsyToolkit and PEBL tasks —
  free for research; re-skin and add adaptive staircasing. Cite the library.
- **Research-described (`research_described`, 14 rows):** Engle-lab complex/
  running spans (cite Unsworth 2005 / Broadway & Engle 2010 / Redick 2012),
  Ecker updating, Zelazo DCCS, day-night, HTKS, TabCAT. Paradigms are freely
  describable and buildable with our own stimuli; some require a use agreement
  or citation.
- **Government-released but credential-gated (`gov_released`, 3 rows):** NIH
  Toolbox List Sorting, Flanker, DCCS. Cognition content is access-restricted
  "to preserve test integrity," so **describe/link the type only** and build our
  own version; do not reproduce secure items.
- **Proprietary (`proprietary_describe_only`, 8 rows):** WISC-V Digit Span &
  Picture Span, CANTAB SWM/IED/SST, NEPSY-II, D-KEFS, AWMA. All entered as
  `item_type` with `reuse_note = describe_only`. **Never reproduce secure
  content** — model the format only. (Validated: all 8 satisfy this.)

## Gaps and open assumptions

- **Adaptive/AIG engine assumed, not verified.** High `adaptivity_fit` ratings
  assume we build an auto-generation + staircase engine; this is an engineering
  assumption, not an existing asset.
- **No high-ceiling norms for a gifted K-8 population.** Most instruments are
  normed for the general population; ceiling behavior at the gifted tail is an
  open empirical question (esp. NIH Toolbox and screening batteries like AWMA).
- **Fairness/DIF unverified.** Language load is low for nonverbal variants, but
  DIF across subgroups and the ADHD confound need empirical checks before any
  selection use (rights-before-research; H10/H4).
- **Predictive/criterion validity for *our* selection goal is unestablished.**
  Links to fluid intelligence and achievement exist in the literature, but that
  is predictive validity in other samples — not evidence for this program's
  capability standard or any causal claim (R5).
- **Touch/motor and scoring feasibility for K-1** (HTKS is observer-scored;
  young-child tapping mixes motor speed with cognition) needs piloting.

## Suggested next steps

1. Prototype 3–4 anchor tasks from the open sources (Corsi fireflies, adaptive
   n-back, running span, DCCS toy-sort) to test engagement and telemetry
   capture end-to-end.
2. Define a **consistency-based scoring spec** (RT variability, lapse rate,
   error types) as the default, with peak speed explicitly de-emphasized.
3. Add a fairness/ADHD-confound review to the critic checklist before any
   task is proposed for scoring or selection.
