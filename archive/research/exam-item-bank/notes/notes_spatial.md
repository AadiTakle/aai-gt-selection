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
