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
