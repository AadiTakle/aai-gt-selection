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
