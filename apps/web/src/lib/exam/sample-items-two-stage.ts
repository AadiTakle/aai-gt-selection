import type { BankEmbeddedDemo, ExamDomain, ExamStage } from './item';

/**
 * Born-synthetic sample bank for the PROPOSED two-regime ("two-stage") screener
 * structure — an UNAPPROVED, pluggable design, not a ratified requirement.
 *
 * The structure it feeds is the author's Spiky PoV in
 * `brainlifting/test-structure-brainlift/brainlift-test-structure.md`:
 *
 *   • Phase 1 — STANDING (accuracy). Insight 1: a child's *standing* ("what can
 *     they already do?") is read most cleanly with load/difficulty MINIMISED and
 *     below their limit. Insight 2: to find that limit, do NOT ramp-to-failure —
 *     BRACKET it and close in from both sides. So Phase 1 is a pool of
 *     STANDING-tagged accuracy types at several ordinal difficulty rungs per
 *     domain, which the {@link TwoStageSequencer} binary-searches to localise each
 *     domain's level.
 *
 *   • Phase 2 — LEARNING-RATE (effort). Insight 3: desirable difficulty hurts a
 *     standing estimate but is exactly what surfaces learning-rate. So Phase 2 is
 *     an EFFORT-tagged process/growth pool tagged at difficulty rungs, from which
 *     the sequencer selects the task nearest each domain's Phase-1 estimate (hard
 *     enough to struggle, still learnable) and reads telemetry / engagement rather
 *     than a single right/wrong.
 *
 * WHAT DECIDES THE STAGE: the explicit {@link ExamStage} tag (`stage`), NOT how an
 * item renders. Every entry here renders as an `embedded-demo` (a self-contained
 * `/exam-demos/<TYPE>.html` runtime); "standing" vs "effort" is a property of what
 * the type MEASURES. The type codes are REAL entries from the question-type
 * catalog (`research/exam-question-types/`), classified per
 * `STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md`:
 *   - STANDING (keyed accuracy / θ, ceiling): matrix/analogy/odd-pair/set logic,
 *     cloze/relation/polysemy/sentence order, dot-compare/number-line/series/
 *     function rule, roll/fold-net/shadow/hidden-cube.
 *   - EFFORT (process / growth / learning-rate): rule-discovery & divergent
 *     (concept, squiggle, brainstorm), category induction & word games (sort-bot,
 *     word-forge, letter-climb), the quant DUAL vehicles (balance, mobile, story
 *     graph — the best learning-rate vehicles), and spatial build/route games
 *     (shape-fit, path-coder, path-forge).
 *
 * EVERY item is a hand-authored placeholder pointing at a real catalog demo,
 * `syntheticOnly: true`, `validated: false` (D-006, R9, RES-012/RES-013). Ordinal
 * `difficultyLevel` is a DESIGN RUNG, never calibrated IRT difficulty. This bank
 * exists solely to make the two-stage sequencer clickable end-to-end for a
 * stakeholder demo; it is NOT a question set proposed for real use, and nothing
 * here is an admission or ability decision.
 *
 * Each demo self-renders, self-adapts, and self-scores in-frame; the rung TAG on
 * each entry is what the sequencer targets — the placement, not the demo's own
 * internal adaptivity, is the "difficulty calibrated to the Phase-1 level" story.
 */

interface TwoStageItemArgs {
  /** REAL catalog type code; doubles as the `/exam-demos/<TYPE>.html` filename. */
  typeCode: string;
  domain: ExamDomain;
  /** Which regime the type belongs to — a property of what it MEASURES. */
  stage: ExamStage;
  /** Ordinal design rung (1..20). Distinct per domain so the bracket can search. */
  rung: number;
  title: string;
  blurb: string;
}

function twoStageItem(args: TwoStageItemArgs): BankEmbeddedDemo {
  return {
    renderKind: 'embedded-demo',
    itemId: `SYN-2S-${args.typeCode}`,
    typeCode: args.typeCode,
    domain: args.domain,
    title: args.title,
    blurb: args.blurb,
    difficultyLevel: args.rung,
    stage: args.stage,
    demoPath: `/exam-demos/${args.typeCode}.html`,
    syntheticOnly: true,
    validated: false,
  };
}

// --- Phase 1: STANDING / accuracy pool ----------------------------------------

/**
 * Standing pool: four keyed-accuracy catalog types per domain at ordinal rungs
 * 2/6/10/14, so the sequencer has room to bracket (start moderate, then close in
 * from both sides). Domains: fluid_reasoning, verbal, quantitative, spatial.
 */
export const TWO_STAGE_STANDING_ITEMS: BankEmbeddedDemo[] = [
  // --- fluid_reasoning -------------------------------------------------------
  twoStageItem({
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    stage: 'standing',
    rung: 2,
    title: 'Machine Matrix',
    blurb: 'Tap the tile that completes the pattern grid.',
  }),
  twoStageItem({
    typeCode: 'FLU-ANALOGY-01',
    domain: 'fluid_reasoning',
    stage: 'standing',
    rung: 6,
    title: 'Shape Morph',
    blurb: 'Make the third shape change the same way as the first pair.',
  }),
  twoStageItem({
    typeCode: 'FLU-ODDPAIR-01',
    domain: 'fluid_reasoning',
    stage: 'standing',
    rung: 10,
    title: 'Odd Pair Out',
    blurb: 'Find the pair whose change is different from the rest.',
  }),
  twoStageItem({
    typeCode: 'FLU-VENN-01',
    domain: 'fluid_reasoning',
    stage: 'standing',
    rung: 14,
    title: 'Double Match',
    blurb: 'Pick the figure that belongs to both groups at once.',
  }),

  // --- verbal ----------------------------------------------------------------
  twoStageItem({
    typeCode: 'VER-CLOZE-01',
    domain: 'verbal',
    stage: 'standing',
    rung: 2,
    title: 'Fill the Gap',
    blurb: 'Choose the word that best completes the sentence.',
  }),
  twoStageItem({
    typeCode: 'VER-RELPAIR-01',
    domain: 'verbal',
    stage: 'standing',
    rung: 6,
    title: 'Relation Match',
    blurb: 'Find the second pair that relates the same way.',
  }),
  twoStageItem({
    typeCode: 'VER-POLYSEME-01',
    domain: 'verbal',
    stage: 'standing',
    rung: 10,
    title: 'Two Meanings',
    blurb: 'Pick the picture for the meaning the sentence points to.',
  }),
  twoStageItem({
    typeCode: 'VER-WORDTRAIN-01',
    domain: 'verbal',
    stage: 'standing',
    rung: 14,
    title: 'Word Train',
    blurb: 'Order the scrambled word cars into one correct sentence.',
  }),

  // --- quantitative ----------------------------------------------------------
  twoStageItem({
    typeCode: 'QUANT-DOTS-01',
    domain: 'quantitative',
    stage: 'standing',
    rung: 2,
    title: 'More or Fewer',
    blurb: 'Tap the side that showed more dots.',
  }),
  twoStageItem({
    typeCode: 'QUANT-NUMLINE-01',
    domain: 'quantitative',
    stage: 'standing',
    rung: 6,
    title: 'Number Line Jump',
    blurb: 'Slide the jumper to the spot that matches the quantity.',
  }),
  twoStageItem({
    typeCode: 'QUANT-SERIES-01',
    domain: 'quantitative',
    stage: 'standing',
    rung: 10,
    title: 'Pattern Steps',
    blurb: 'Pick what continues the stepping pattern.',
  }),
  twoStageItem({
    typeCode: 'QUANT-FUNC-01',
    domain: 'quantitative',
    stage: 'standing',
    rung: 14,
    title: 'Machine Rule',
    blurb: 'Work out the rule and choose what the machine makes next.',
  }),

  // --- spatial ---------------------------------------------------------------
  twoStageItem({
    typeCode: 'SPA-ROLL-01',
    domain: 'spatial',
    stage: 'standing',
    rung: 2,
    title: 'Rolling Cube',
    blurb: 'Track the cube as it tips and find the top face.',
  }),
  twoStageItem({
    typeCode: 'SPA-FOLDNET-01',
    domain: 'spatial',
    stage: 'standing',
    rung: 6,
    title: 'Fold-the-Net',
    blurb: 'Fold the flat net into a box and find the opposite face.',
  }),
  twoStageItem({
    typeCode: 'SPA-SHADOW-01',
    domain: 'spatial',
    stage: 'standing',
    rung: 10,
    title: 'Shadow Play',
    blurb: 'Work out the flat shadow the 3D object throws.',
  }),
  twoStageItem({
    typeCode: 'SPA-HIDDENCUBE-01',
    domain: 'spatial',
    stage: 'standing',
    rung: 14,
    title: 'X-Ray Cubes',
    blurb: 'Count every block, including the ones hidden behind and underneath.',
  }),
];

// --- Phase 2: LEARNING-RATE / effort pool -------------------------------------

/**
 * Effort pool: three process/growth catalog types per domain at rungs 4/8/12,
 * each a self-adapting demo. The sequencer presents exactly the one whose rung is
 * nearest the domain's Phase-1 standing estimate (desirable difficulty), then
 * reads engagement/telemetry rather than a single accuracy verdict. Domain
 * assignment follows each type's catalog `areas` (e.g. CX-* creativity and GB-*
 * game types are placed in the reasoning area they exercise).
 */
export const TWO_STAGE_EFFORT_ITEMS: BankEmbeddedDemo[] = [
  // --- fluid_reasoning -------------------------------------------------------
  twoStageItem({
    typeCode: 'FLU-CONCEPT-01',
    domain: 'fluid_reasoning',
    stage: 'effort',
    rung: 4,
    title: 'Mystery Gate',
    blurb: 'Build figures to test a secret rule, then use what you learn.',
  }),
  twoStageItem({
    typeCode: 'CX-figural-01',
    domain: 'fluid_reasoning',
    stage: 'effort',
    rung: 8,
    title: 'Squiggle Studio',
    blurb: 'Turn one squiggle into as many different pictures as you can.',
  }),
  twoStageItem({
    typeCode: 'CX-diverge-01',
    domain: 'fluid_reasoning',
    stage: 'effort',
    rung: 12,
    title: 'Brainstorm Blaster',
    blurb: 'Come up with as many different uses as you can.',
  }),

  // --- verbal ----------------------------------------------------------------
  twoStageItem({
    typeCode: 'VER-SORTBOT-01',
    domain: 'verbal',
    stage: 'effort',
    rung: 4,
    title: 'Sorting Robot',
    blurb: 'Find the hidden rule, then sort new items in or out.',
  }),
  twoStageItem({
    typeCode: 'GB-WORDFORGE-01',
    domain: 'verbal',
    stage: 'effort',
    rung: 8,
    title: 'Word Forge',
    blurb: 'Build as many real words as you can before time runs out.',
  }),
  twoStageItem({
    typeCode: 'GB-WORDLADDER-01',
    domain: 'verbal',
    stage: 'effort',
    rung: 12,
    title: 'Letter Climb',
    blurb: 'Change one letter at a time to reach the goal word.',
  }),

  // --- quantitative ----------------------------------------------------------
  twoStageItem({
    typeCode: 'QUANT-BALANCE-01',
    domain: 'quantitative',
    stage: 'effort',
    rung: 4,
    title: 'Balance Lab',
    blurb: 'Add weights until both sides of the scale are exactly level.',
  }),
  twoStageItem({
    typeCode: 'QUANT-MOBILE-01',
    domain: 'quantitative',
    stage: 'effort',
    rung: 8,
    title: 'Hanging Mobile',
    blurb: 'Complete the mobile so every arm stays level at once.',
  }),
  twoStageItem({
    typeCode: 'QUANT-GRAPH-01',
    domain: 'quantitative',
    stage: 'effort',
    rung: 12,
    title: 'Story Graph',
    blurb: 'Build the graph that tells the same growing-quantity story.',
  }),

  // --- spatial ---------------------------------------------------------------
  twoStageItem({
    typeCode: 'GB-SHAPEFIT-01',
    domain: 'spatial',
    stage: 'effort',
    rung: 4,
    title: 'Shape Smith',
    blurb: 'Rotate and drop pieces to fill the shape with no gaps.',
  }),
  twoStageItem({
    typeCode: 'GB-ROBOPATH-01',
    domain: 'spatial',
    stage: 'effort',
    rung: 8,
    title: 'Path Coder',
    blurb: 'Plan a route of moves so the robot reaches the door.',
  }),
  twoStageItem({
    typeCode: 'GB-PATHFORGE-01',
    domain: 'spatial',
    stage: 'effort',
    rung: 12,
    title: 'Path Forge',
    blurb: 'Lay road tiles to build one continuous path to the goal.',
  }),
];

/**
 * The full two-stage synthetic bank: the STANDING pool followed by the EFFORT
 * pool. The {@link TwoStageSequencer} — not this order, and not `renderKind` —
 * decides what is actually presented and when to switch regimes; it routes on the
 * explicit {@link ExamStage} tag. A different sequencer over this same bank would
 * behave completely differently.
 */
export function syntheticTwoStageBank(): BankEmbeddedDemo[] {
  return [...TWO_STAGE_STANDING_ITEMS, ...TWO_STAGE_EFFORT_ITEMS];
}
