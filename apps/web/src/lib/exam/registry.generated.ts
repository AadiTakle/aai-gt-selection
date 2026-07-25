// GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate with: node scripts/sync-exam-demos.mjs
//
// Every question type that has BOTH a structured bank
// (research/exam-question-types/banks/<CODE>.jsonl) AND a renderer demo that
// speaks the BUILD_PLAN §2 postMessage protocol. The sync script copies each
// wired demo to apps/web/public/exam-demos/ and emits this registry, which is
// the single source of truth for:
//
//   - the served-item pool (/api/exam-items)
//   - the server-side answer verifier (/api/exam-submit)
//   - the runner's type metadata + demo paths
//
// Wired: 25 types (fluid_reasoning 7 · quantitative 7 · spatial 4 · verbal 7).
// Adding a bank + compliant demo and re-running the sync is all it takes.

export type ExamRegistryDomain = 'fluid_reasoning' | 'verbal' | 'quantitative' | 'spatial';

/**
 * Which server-side verifier in `/api/exam-submit` grades this type. A type with
 * no verifier is never wired — it would score every child 0.
 */
export type ExamVerifier = 'keyed' | 'placement_tolerance' | 'constructed_value';

export interface ExamRegistryEntry {
  typeCode: string;
  domain: ExamRegistryDomain;
  /** Human-facing type name (catalog `name`). */
  title: string;
  /** Short child-facing instruction shown under the activity frame. */
  blurb: string;
  /** Age bands the bank targets — a selection hint, not a hard filter. */
  ageBands: string[];
  itemCount: number;
  difficultyMin: number;
  difficultyMax: number;
  verifier: ExamVerifier;
  /**
   * Metric ids this demo puts on its ItemResult. Biases the engine's
   * metric-coverage type selection; the stop rule never depends on it.
   */
  metrics: string[];
}

export const EXAM_TYPE_REGISTRY: readonly ExamRegistryEntry[] = [
  {
    typeCode: 'FLU-ANALOGY-01',
    domain: 'fluid_reasoning',
    title: 'Shape Morph',
    blurb: 'Make the third shape change the same way as the first pair.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 120,
    difficultyMin: 1.04,
    difficultyMax: 19.96,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'FLU-CARPET-01',
    domain: 'fluid_reasoning',
    title: 'Pattern Carpet',
    blurb: 'The child continues a woven pattern by picking the tile that keeps every row (and column) progressing the same way.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1.04,
    difficultyMax: 19.96,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'FLU-LADDER-01',
    domain: 'fluid_reasoning',
    title: 'Ranking Ladder',
    blurb: 'Clue cards each show one thing beating another; the child stacks all the clues together to work out the full winner-to-loser order and seats each character o…',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 120,
    difficultyMin: 1.04,
    difficultyMax: 19.96,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    title: 'Machine Matrix',
    blurb: 'Tap the tile that completes the pattern.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1.04,
    difficultyMax: 19.96,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'FLU-ODDPAIR-01',
    domain: 'fluid_reasoning',
    title: 'Odd Pair Out',
    blurb: 'Several before-and-after pairs all change in the same secret way except one; the child taps the pair whose change is different.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 120,
    difficultyMin: 1.04,
    difficultyMax: 19.96,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'FLU-STACK-01',
    domain: 'fluid_reasoning',
    title: 'Stack the Panel',
    blurb: 'The child figures out how two panels in a row combine into the third, then picks the panel that correctly stacks the last row together.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 120,
    difficultyMin: 1.04,
    difficultyMax: 19.96,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'FLU-VENN-01',
    domain: 'fluid_reasoning',
    title: 'Double Match',
    blurb: 'Two example groups each share a secret feature; the child picks the figure that belongs to BOTH groups at once.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 120,
    difficultyMin: 1.04,
    difficultyMax: 19.96,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'QUANT-BALANCE-01',
    domain: 'quantitative',
    title: 'Balance Lab',
    blurb: 'The child adds figure weights until both sides of a scale are exactly level.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'QUANT-BUILD-01',
    domain: 'quantitative',
    title: 'Biggest Number',
    blurb: 'The child rearranges quantity tiles to build the biggest or smallest value that obeys the pictured rules.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1.16,
    difficultyMax: 20,
    verifier: 'constructed_value',
    metrics: ['M-ENGAGE', 'M-PATH', 'M-RAPIDGUESS', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'QUANT-DOTS-01',
    domain: 'quantitative',
    title: 'More or Fewer',
    blurb: 'The child taps the side that flashed more dots.',
    ageBands: ['2-3', 'K-1'],
    itemCount: 120,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'QUANT-FUNC-01',
    domain: 'quantitative',
    title: 'Machine Rule',
    blurb: 'Work out the rule and choose what the machine makes next.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'QUANT-MATRIX-01',
    domain: 'quantitative',
    title: 'Number Web',
    blurb: 'The child finds the quantity tile that completes every connection in a number web.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'QUANT-NUMLINE-01',
    domain: 'quantitative',
    title: 'Number Line Jump',
    blurb: 'The child slides a jumper to the place on a line that matches a shown quantity.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'placement_tolerance',
    metrics: ['M-ENGAGE', 'M-PAE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'QUANT-SERIES-01',
    domain: 'quantitative',
    title: 'Pattern Steps',
    blurb: 'Pick what continues the stepping pattern.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 120,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-ENGAGE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'SPA-FOLDNET-01',
    domain: 'spatial',
    title: 'Fold-the-Net',
    blurb: 'Fold the flat net into a box and find the opposite face.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'SPA-PICKFOLD-01',
    domain: 'spatial',
    title: 'Which Fold Made It?',
    blurb: 'Shown a paper before and after a single fold, the child works out which crease and direction produced the result by choosing or performing the fold.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'SPA-ROLL-01',
    domain: 'spatial',
    title: 'Rolling Cube',
    blurb: 'Track a cube as it tips along a path.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-PATH', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'SPA-SHADOW-01',
    domain: 'spatial',
    title: 'Shadow Play',
    blurb: 'A light shines on a 3D object and the child works out the flat shadow it throws on the wall - or turns the object until its shadow matches a target.',
    ageBands: ['2-3', '4-5', '6-8'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-RAPIDGUESS', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'VER-BUILDIT-01',
    domain: 'verbal',
    title: 'Build-It Buddy',
    blurb: 'Listen to step-by-step spoken directions and build the picture by dragging, placing, and coloring the pieces so it matches what was described.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'VER-CLOZE-01',
    domain: 'verbal',
    title: 'Fill the Gap',
    blurb: 'Choose the word that best completes the sentence.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'VER-POLYSEME-01',
    domain: 'verbal',
    title: 'Two Meanings',
    blurb: 'Hear a word that has two meanings inside a spoken sentence, then tap the picture that shows the meaning the sentence points to.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'VER-RELPAIR-01',
    domain: 'verbal',
    title: 'Relation Match',
    blurb: 'Find the pair of words that relate the same way.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'VER-SEQUENCE-01',
    domain: 'verbal',
    title: 'Story Order',
    blurb: 'Put the mixed-up parts of a story in the right order, then choose what happens next.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'VER-SORTBOT-01',
    domain: 'verbal',
    title: 'Sorting Robot',
    blurb: 'Watch a robot drop a few example pictures or words into its IN bin or OUT bin, figure out the hidden category rule, then sort new items IN or OUT yourself.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
  {
    typeCode: 'VER-WORDTRAIN-01',
    domain: 'verbal',
    title: 'Word Train',
    blurb: 'Drag the scrambled word cars onto the train track in the right order to build one correct, meaningful sentence.',
    ageBands: ['2-3', '4-5', '6-8', 'K-1'],
    itemCount: 100,
    difficultyMin: 1,
    difficultyMax: 20,
    verifier: 'keyed',
    metrics: ['M-EXPLORE', 'M-REV', 'M-RT', 'M-RTFIRST'],
  },
] as const;

/** Types with a bank but no servable demo, and why. */
export const EXAM_BLOCKED_TYPES: readonly { typeCode: string; reason: string }[] = [
  { typeCode: 'SPA-MAZE-01', reason: 'no server verifier: constructed response {backtracks, blockedTries, gemsCollected, gemsTotal, moves, msToCommit, path, reachedGoal, steps} with scoring.rule=none carries no option key, so /api/exam-submit cannot decide correctness. Needs a bespoke scorer that re-derives the solution from response + content (the bank already ships the reference solution to validate it against).' },
  { typeCode: 'SPA-PIPES-01', reason: 'no server verifier: constructed response {connected, finalOrients, mode, msToCommit, rotations, touchedTiles} with scoring.rule=none carries no option key, so /api/exam-submit cannot decide correctness. Needs a bespoke scorer that re-derives the solution from response + content (the bank already ships the reference solution to validate it against).' },
  { typeCode: 'SPA-TANGRAM-01', reason: 'no server verifier: constructed response {auto, filledCount, mode, msToCommit, placements, placementsMade, revisions, rotations, targetArea, usedPieceIds} with scoring.rule=none carries no option key, so /api/exam-submit cannot decide correctness. Needs a bespoke scorer that re-derives the solution from response + content (the bank already ships the reference solution to validate it against).' },
] as const;

/** Every wired type code, in registry (alphabetical) order. */
export const EXAM_TYPE_CODES: readonly string[] = EXAM_TYPE_REGISTRY.map((t) => t.typeCode);
