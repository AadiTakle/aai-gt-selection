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
