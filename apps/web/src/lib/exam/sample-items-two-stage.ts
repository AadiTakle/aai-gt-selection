import type {
  BankEmbeddedDemo,
  BankItem,
  BankSingleSelect,
  ExamDomain,
  LureClass,
} from './item';

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
 *     BRACKET it and close in from both sides. So Phase 1 is a pool of keyed
 *     single-select accuracy items at several ordinal difficulty rungs per domain,
 *     which the {@link TwoStageSequencer} binary-searches to localise each
 *     domain's level.
 *
 *   • Phase 2 — LEARNING-RATE (effort). Insight 3: desirable difficulty hurts a
 *     standing estimate but is exactly what surfaces learning-rate. So Phase 2 is
 *     an effort/interactive pool (embedded-demo items) tagged at difficulty rungs,
 *     from which the sequencer selects the task nearest each domain's Phase-1
 *     estimate (hard enough to struggle, still learnable) and reads telemetry /
 *     engagement rather than a single right/wrong.
 *
 * EVERY item here is a hand-authored placeholder (`generator: 'human'`),
 * `syntheticOnly: true`, `validated: false` (D-006, R9, RES-012/RES-013). Ordinal
 * `difficultyLevel` is a DESIGN RUNG, never calibrated IRT difficulty. Type codes
 * only reference the catalog in `research/exam-question-types/`. This bank exists
 * solely to make the two-stage sequencer clickable end-to-end for a stakeholder
 * demo; it is NOT a question set proposed for real use, and nothing here is an
 * admission or ability decision.
 *
 * The Phase-2 `demoPath`s reuse the existing self-contained `/exam-demos/*.html`
 * runtimes (they self-render, self-adapt, and self-score in-frame); the rung TAG
 * on each entry is what the sequencer targets — the placement, not the demo's own
 * internal adaptivity, is the "difficulty calibrated to the Phase-1 level" story.
 */

// --- Phase 1: STANDING / accuracy single-select pool --------------------------

interface StandingItemArgs {
  domain: ExamDomain;
  /** Ordinal design rung (1..20). Distinct per domain so the bracket can search. */
  rung: number;
  title: string;
  blurb: string;
  prompt: string;
  stimulus?: string;
  /** Exactly one option must be tagged `correct`; the key is derived from it. */
  options: { label: string; lure: LureClass }[];
}

const DOMAIN_ABBR: Record<ExamDomain, string> = {
  fluid_reasoning: 'FLU',
  verbal: 'VER',
  quantitative: 'QUANT',
  spatial: 'SPA',
};

function rungCode(rung: number): string {
  return `L${String(rung).padStart(2, '0')}`;
}

function standingItem(args: StandingItemArgs): BankSingleSelect {
  const typeCode = `${DOMAIN_ABBR[args.domain]}-STAND-${rungCode(args.rung)}`;
  const correctIndex = args.options.findIndex((o) => o.lure === 'correct');
  if (correctIndex < 0) {
    throw new Error(`two-stage standing item ${typeCode} has no option tagged "correct"`);
  }
  return {
    renderKind: 'single-select',
    itemId: `SYN-2S-${typeCode}`,
    typeCode,
    domain: args.domain,
    title: args.title,
    blurb: args.blurb,
    difficultyLevel: args.rung,
    content: {
      typeCode,
      prompt: args.prompt,
      ...(args.stimulus !== undefined ? { stimulus: args.stimulus } : {}),
      options: args.options,
    },
    answer: {
      correctIndex,
      distractorRationales: args.options.map((o) => o.lure),
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'human',
      generatorRef: 'gt-capstone-two-stage-demo@1',
      seed: `two-stage-${typeCode.toLowerCase()}`,
      validator: [
        {
          check: 'unique_answer',
          status: 'pass',
          detail: 'exactly one option tagged correct, by construction',
        },
        { check: 'lure_taxonomy_ok', status: 'pass' },
      ],
    },
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * Standing pool: five accuracy rungs per domain at ordinal levels 2/5/8/11/14 so
 * the sequencer has room to bracket (a moderate start, then close in from both
 * sides). Content difficulty rises with the rung; keys are hand-authored.
 */
export const TWO_STAGE_STANDING_ITEMS: BankSingleSelect[] = [
  // --- fluid_reasoning -------------------------------------------------------
  standingItem({
    domain: 'fluid_reasoning',
    rung: 2,
    title: 'Shape Alternation',
    blurb: 'Continue the simple back-and-forth pattern.',
    prompt: 'Which shape comes next?',
    stimulus: 'circle, square, circle, square, ___',
    options: [
      { label: 'circle', lure: 'correct' },
      { label: 'square', lure: 'reversed_relation' },
      { label: 'triangle', lure: 'rule_violation' },
      { label: 'star', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'fluid_reasoning',
    rung: 5,
    title: 'Opposite Change',
    blurb: 'Make the second pair change the same way as the first.',
    prompt: 'Complete the analogy so the change is the same.',
    stimulus: 'Big is to Small as Tall is to ___',
    options: [
      { label: 'Short', lure: 'correct' },
      { label: 'Tall', lure: 'surface_match' },
      { label: 'Huge', lure: 'associate' },
      { label: 'Wide', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'fluid_reasoning',
    rung: 8,
    title: 'Growing Group',
    blurb: 'The group grows by one each time.',
    prompt: 'Which group comes next?',
    stimulus: '▲, ▲▲, ▲▲▲, ___',
    options: [
      { label: '▲▲▲▲ (four)', lure: 'correct' },
      { label: '▲▲ (two)', lure: 'near_order' },
      { label: '▲ (one)', lure: 'reversed_relation' },
      { label: '■ (a square)', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'fluid_reasoning',
    rung: 11,
    title: 'Where It Lives',
    blurb: 'Match the relationship in the first pair.',
    prompt: 'Which word completes the second pair the same way?',
    stimulus: 'Bird is to Sky as Fish is to ___',
    options: [
      { label: 'Water', lure: 'correct' },
      { label: 'Ocean', lure: 'associate' },
      { label: 'Fin', lure: 'surface_match' },
      { label: 'Nest', lure: 'global_mismatch' },
    ],
  }),
  standingItem({
    domain: 'fluid_reasoning',
    rung: 14,
    title: 'Mirror Letters',
    blurb: 'Each pair steps in from both ends of the alphabet.',
    prompt: 'The pairs step in from both ends (A…Z, B…Y, C…X). What completes “D_”?',
    stimulus: 'AZ, BY, CX, D__',
    options: [
      { label: 'W', lure: 'correct' },
      { label: 'E', lure: 'near_order' },
      { label: 'X', lure: 'surface_match' },
      { label: 'V', lure: 'rule_violation' },
    ],
  }),

  // --- verbal ----------------------------------------------------------------
  standingItem({
    domain: 'verbal',
    rung: 2,
    title: 'Which Is an Animal',
    blurb: 'Pick the word that names an animal.',
    prompt: 'Which word names an animal?',
    options: [
      { label: 'Dog', lure: 'correct' },
      { label: 'Apple', lure: 'global_mismatch' },
      { label: 'Chair', lure: 'global_mismatch' },
      { label: 'Blue', lure: 'global_mismatch' },
    ],
  }),
  standingItem({
    domain: 'verbal',
    rung: 5,
    title: 'Fill the Gap',
    blurb: 'Choose the word that best completes the sentence.',
    prompt: 'Choose the word that best fills the gap.',
    stimulus: 'Because it started to rain, we ___ our umbrellas.',
    options: [
      { label: 'opened', lure: 'correct' },
      { label: 'closed', lure: 'local_fit' },
      { label: 'washed', lure: 'associate' },
      { label: 'the sky', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'verbal',
    rung: 8,
    title: 'Relation Match',
    blurb: 'Find the word that relates the same way.',
    prompt: 'Which word completes the second pair the same way?',
    stimulus: 'Bird is to Nest as Bee is to ___',
    options: [
      { label: 'Hive', lure: 'correct' },
      { label: 'Honey', lure: 'associate' },
      { label: 'Wing', lure: 'surface_match' },
      { label: 'Nest', lure: 'reversed_relation' },
    ],
  }),
  standingItem({
    domain: 'verbal',
    rung: 11,
    title: 'Same Meaning',
    blurb: 'Choose the closest meaning.',
    prompt: 'Which word means about the same as “rapid”?',
    options: [
      { label: 'Fast', lure: 'correct' },
      { label: 'Slow', lure: 'reversed_relation' },
      { label: 'Loud', lure: 'distractor_other' },
      { label: 'Wide', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'verbal',
    rung: 14,
    title: 'Who Makes What',
    blurb: 'Match the maker to what they make.',
    prompt: 'Which word completes the second pair the same way?',
    stimulus: 'Author is to Book as Composer is to ___',
    options: [
      { label: 'Symphony', lure: 'correct' },
      { label: 'Orchestra', lure: 'associate' },
      { label: 'Note', lure: 'surface_match' },
      { label: 'Painting', lure: 'global_mismatch' },
    ],
  }),

  // --- quantitative ----------------------------------------------------------
  standingItem({
    domain: 'quantitative',
    rung: 2,
    title: 'Count On',
    blurb: 'Continue the counting pattern.',
    prompt: 'What number comes next?',
    stimulus: '2, 4, 6, 8, ___',
    options: [
      { label: '10', lure: 'correct' },
      { label: '9', lure: 'near_order' },
      { label: '12', lure: 'rule_violation' },
      { label: '16', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'quantitative',
    rung: 5,
    title: 'Machine Rule',
    blurb: 'Work out the rule and apply it.',
    prompt: 'The machine adds the same amount every time (1→3, 2→4, 3→5). What does 5 become?',
    stimulus: '5 → ___',
    options: [
      { label: '7', lure: 'correct' },
      { label: '6', lure: 'near_order' },
      { label: '8', lure: 'rule_violation' },
      { label: '10', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'quantitative',
    rung: 8,
    title: 'Doubling',
    blurb: 'Each number doubles the one before.',
    prompt: 'What number comes next?',
    stimulus: '1, 2, 4, 8, ___',
    options: [
      { label: '16', lure: 'correct' },
      { label: '10', lure: 'near_order' },
      { label: '12', lure: 'rule_violation' },
      { label: '32', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'quantitative',
    rung: 11,
    title: 'Missing Middle',
    blurb: 'Find the number that fits the pattern.',
    prompt: 'What number is missing from the pattern?',
    stimulus: '3, 6, __, 12, 15',
    options: [
      { label: '9', lure: 'correct' },
      { label: '8', lure: 'near_order' },
      { label: '10', lure: 'rule_violation' },
      { label: '11', lure: 'distractor_other' },
    ],
  }),
  standingItem({
    domain: 'quantitative',
    rung: 14,
    title: 'Two-Step Rule',
    blurb: 'The rule has two steps.',
    prompt: 'The rule is “double, then add 1” (2→5, 3→7, 4→9). What does 6 become?',
    stimulus: '6 → ___',
    options: [
      { label: '13', lure: 'correct' },
      { label: '12', lure: 'near_order' },
      { label: '11', lure: 'rule_violation' },
      { label: '7', lure: 'distractor_other' },
    ],
  }),

  // --- spatial ---------------------------------------------------------------
  standingItem({
    domain: 'spatial',
    rung: 2,
    title: 'Missing Quarter',
    blurb: 'Find the empty part of the square.',
    prompt:
      'A square is split into four equal quarters. Three are filled and the top-right is empty. Which quarter is missing?',
    options: [
      { label: 'Top-right', lure: 'correct' },
      { label: 'Top-left', lure: 'surface_match' },
      { label: 'Bottom-right', lure: 'near_order' },
      { label: 'None — it is full', lure: 'rule_violation' },
    ],
  }),
  standingItem({
    domain: 'spatial',
    rung: 5,
    title: 'Rolling Cube',
    blurb: 'Track the cube as it tips over.',
    prompt:
      'A cube shows a star on top and a moon on its right side. It tips one step over its right edge. What is on top now?',
    options: [
      { label: 'Moon', lure: 'correct' },
      { label: 'Star', lure: 'reversed_relation' },
      { label: 'Sun', lure: 'distractor_other' },
      { label: 'The bottom face', lure: 'rule_violation' },
    ],
  }),
  standingItem({
    domain: 'spatial',
    rung: 8,
    title: 'Fold the Net',
    blurb: 'Fold the flat net into a cube in your head.',
    prompt:
      'A plus-shaped net has a star in the centre square and a moon on the far end square. Folded into a cube, which face is opposite the star?',
    options: [
      { label: 'Moon', lure: 'correct' },
      { label: 'Sun', lure: 'distractor_other' },
      { label: 'Star', lure: 'reversed_relation' },
      { label: 'They end up touching', lure: 'rule_violation' },
    ],
  }),
  standingItem({
    domain: 'spatial',
    rung: 11,
    title: 'Quarter Turn',
    blurb: 'Turn the arrow in your head.',
    prompt: 'An arrow points UP. Turn it a quarter-turn clockwise. Where does it point now?',
    options: [
      { label: 'Right', lure: 'correct' },
      { label: 'Left', lure: 'reversed_relation' },
      { label: 'Down', lure: 'near_order' },
      { label: 'Up', lure: 'surface_match' },
    ],
  }),
  standingItem({
    domain: 'spatial',
    rung: 14,
    title: 'Hidden Faces',
    blurb: 'Think about the whole cube, not just what you see.',
    prompt: 'A cube has 6 faces. From one corner you can see 3 at once. How many faces are hidden?',
    options: [
      { label: '3', lure: 'correct' },
      { label: '2', lure: 'near_order' },
      { label: '4', lure: 'rule_violation' },
      { label: '6', lure: 'distractor_other' },
    ],
  }),
];

// --- Phase 2: LEARNING-RATE / effort embedded-demo pool -----------------------

interface EffortItemArgs {
  domain: ExamDomain;
  /** Ordinal design rung the sequencer targets against the Phase-1 estimate. */
  rung: number;
  title: string;
  blurb: string;
  /** typeCode of an existing self-contained /exam-demos/*.html runtime. */
  demoTypeCode: string;
}

function effortItem(args: EffortItemArgs): BankEmbeddedDemo {
  const typeCode = `${DOMAIN_ABBR[args.domain]}-EFFORT-${rungCode(args.rung)}`;
  return {
    renderKind: 'embedded-demo',
    itemId: `SYN-2S-${typeCode}`,
    typeCode,
    domain: args.domain,
    title: args.title,
    blurb: args.blurb,
    difficultyLevel: args.rung,
    demoPath: `/exam-demos/${args.demoTypeCode}.html`,
    syntheticOnly: true,
    validated: false,
  };
}

/**
 * Effort pool: three interactive placements per domain at rungs 4/8/12, reusing
 * the existing self-adapting demos. The sequencer presents exactly the one whose
 * rung is nearest the domain's Phase-1 standing estimate (desirable difficulty),
 * then reads engagement/telemetry rather than a single accuracy verdict.
 */
export const TWO_STAGE_EFFORT_ITEMS: BankEmbeddedDemo[] = [
  // fluid_reasoning
  effortItem({
    domain: 'fluid_reasoning',
    rung: 4,
    title: 'Machine Matrix (easier)',
    blurb: 'Interactive pattern task — keep trying as it adapts.',
    demoTypeCode: 'FLU-MATRIX-01',
  }),
  effortItem({
    domain: 'fluid_reasoning',
    rung: 8,
    title: 'Shape Morph (moderate)',
    blurb: 'Interactive analogy task — telemetry captures how you work it out.',
    demoTypeCode: 'FLU-ANALOGY-01',
  }),
  effortItem({
    domain: 'fluid_reasoning',
    rung: 12,
    title: 'Machine Matrix (harder)',
    blurb: 'Interactive pattern task pitched to stretch you.',
    demoTypeCode: 'FLU-MATRIX-01',
  }),
  // verbal
  effortItem({
    domain: 'verbal',
    rung: 4,
    title: 'Fill the Gap (easier)',
    blurb: 'Interactive sentence task — keep going as it adapts.',
    demoTypeCode: 'VER-CLOZE-01',
  }),
  effortItem({
    domain: 'verbal',
    rung: 8,
    title: 'Relation Match (moderate)',
    blurb: 'Interactive relation task — engagement is the signal.',
    demoTypeCode: 'VER-RELPAIR-01',
  }),
  effortItem({
    domain: 'verbal',
    rung: 12,
    title: 'Relation Match (harder)',
    blurb: 'Interactive relation task pitched to stretch you.',
    demoTypeCode: 'VER-RELPAIR-01',
  }),
  // quantitative
  effortItem({
    domain: 'quantitative',
    rung: 4,
    title: 'Pattern Steps (easier)',
    blurb: 'Interactive number task — keep trying as it adapts.',
    demoTypeCode: 'QUANT-SERIES-01',
  }),
  effortItem({
    domain: 'quantitative',
    rung: 8,
    title: 'Machine Rule (moderate)',
    blurb: 'Interactive rule task — telemetry captures your approach.',
    demoTypeCode: 'QUANT-FUNC-01',
  }),
  effortItem({
    domain: 'quantitative',
    rung: 12,
    title: 'Machine Rule (harder)',
    blurb: 'Interactive rule task pitched to stretch you.',
    demoTypeCode: 'QUANT-FUNC-01',
  }),
  // spatial
  effortItem({
    domain: 'spatial',
    rung: 4,
    title: 'Fold-the-Net (easier)',
    blurb: 'Interactive folding task — keep going as it adapts.',
    demoTypeCode: 'SPA-FOLDNET-01',
  }),
  effortItem({
    domain: 'spatial',
    rung: 8,
    title: 'Rolling Cube (moderate)',
    blurb: 'Interactive cube task — engagement is the signal.',
    demoTypeCode: 'SPA-ROLL-01',
  }),
  effortItem({
    domain: 'spatial',
    rung: 12,
    title: 'Rolling Cube (harder)',
    blurb: 'Interactive cube task pitched to stretch you.',
    demoTypeCode: 'SPA-ROLL-01',
  }),
];

/**
 * The full two-stage synthetic bank: the standing (single-select) pool followed
 * by the effort (embedded-demo) pool. The {@link TwoStageSequencer} — not this
 * order — decides what is actually presented and when to switch regimes; a
 * different sequencer over this same bank would behave completely differently.
 */
export function syntheticTwoStageBank(): BankItem[] {
  return [...TWO_STAGE_STANDING_ITEMS, ...TWO_STAGE_EFFORT_ITEMS];
}
