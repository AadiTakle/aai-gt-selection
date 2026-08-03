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
