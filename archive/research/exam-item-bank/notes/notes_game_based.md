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
