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
