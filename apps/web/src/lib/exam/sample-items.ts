import type { BankItem, BankSingleSelect, ExamDomain, LureClass } from './item';

/**
 * Born-synthetic sample item bank for the runnable shell demo.
 *
 * Every item is hand-authored placeholder content (`generator: 'human'`),
 * `syntheticOnly: true`, `validated: false` — synthetic research content, never a
 * calibrated live item (D-006, R9, RES-012/RES-013). Ordinal `difficultyLevel` is
 * a design rung, NOT calibrated difficulty. These exist only to make the session
 * shell + player runnable end-to-end for a stakeholder demo; they are NOT a
 * question set proposed for real use, and their type codes merely reference the
 * catalog in `research/exam-question-types/`.
 *
 * Two items per domain (fluid_reasoning, verbal, quantitative, spatial) so the
 * domain-balanced FixedSequencer interleaves them F,V,Q,S,F,V,Q,S.
 */

interface SingleSelectArgs {
  itemId: string;
  typeCode: string;
  domain: ExamDomain;
  title: string;
  blurb: string;
  difficultyLevel: number;
  prompt: string;
  stimulus?: string;
  /** Exactly one option must be tagged `correct`; the key is derived from it. */
  options: { label: string; lure: LureClass }[];
  seed: string;
}

function singleSelect(args: SingleSelectArgs): BankSingleSelect {
  const correctIndex = args.options.findIndex((o) => o.lure === 'correct');
  if (correctIndex < 0) {
    throw new Error(`sample item ${args.itemId} has no option tagged "correct"`);
  }
  return {
    renderKind: 'single-select',
    itemId: args.itemId,
    typeCode: args.typeCode,
    domain: args.domain,
    title: args.title,
    blurb: args.blurb,
    difficultyLevel: args.difficultyLevel,
    content: {
      typeCode: args.typeCode,
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
      generatorRef: 'gt-capstone-synthetic-demo@1',
      seed: args.seed,
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

export const SYNTHETIC_SAMPLE_ITEMS: BankSingleSelect[] = [
  // --- fluid_reasoning -------------------------------------------------------
  singleSelect({
    itemId: 'SYN-FLU-MATRIX-01',
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    title: 'Machine Matrix',
    blurb: 'Find the shape that completes the pattern.',
    difficultyLevel: 3,
    prompt: 'Which shape completes the pattern?',
    stimulus: 'triangle, circle, triangle, circle, triangle, ___',
    options: [
      { label: 'circle', lure: 'correct' },
      { label: 'triangle', lure: 'reversed_relation' },
      { label: 'square', lure: 'rule_violation' },
      { label: 'star', lure: 'distractor_other' },
    ],
    seed: 'flu-matrix-alt-abab',
  }),
  singleSelect({
    itemId: 'SYN-FLU-ANALOGY-01',
    typeCode: 'FLU-ANALOGY-01',
    domain: 'fluid_reasoning',
    title: 'Shape Morph',
    blurb: 'Make the second pair change the same way as the first.',
    difficultyLevel: 5,
    prompt: 'Complete the analogy so the change is the same.',
    stimulus: 'Big is to Small as Tall is to ___',
    options: [
      { label: 'Short', lure: 'correct' },
      { label: 'Tall', lure: 'surface_match' },
      { label: 'High', lure: 'associate' },
      { label: 'Wide', lure: 'distractor_other' },
    ],
    seed: 'flu-analogy-antonym',
  }),

  // --- verbal ----------------------------------------------------------------
  singleSelect({
    itemId: 'SYN-VER-RELPAIR-01',
    typeCode: 'VER-RELPAIR-01',
    domain: 'verbal',
    title: 'Relation Match',
    blurb: 'Find the pair that relates the same way.',
    difficultyLevel: 4,
    prompt: 'Which word completes the second pair the same way?',
    stimulus: 'Bird is to Nest as Bee is to ___',
    options: [
      { label: 'Hive', lure: 'correct' },
      { label: 'Honey', lure: 'associate' },
      { label: 'Wing', lure: 'surface_match' },
      { label: 'Nest', lure: 'reversed_relation' },
    ],
    seed: 'ver-relpair-lives-in',
  }),
  singleSelect({
    itemId: 'SYN-VER-CLOZE-01',
    typeCode: 'VER-CLOZE-01',
    domain: 'verbal',
    title: 'Fill the Gap',
    blurb: 'Choose the word that best completes the sentence.',
    difficultyLevel: 3,
    prompt: 'Choose the word that best fills the gap.',
    stimulus: 'Because it started to rain, we ___ our umbrellas.',
    options: [
      { label: 'opened', lure: 'correct' },
      { label: 'closed', lure: 'local_fit' },
      { label: 'washed', lure: 'associate' },
      { label: 'the sky', lure: 'distractor_other' },
    ],
    seed: 'ver-cloze-umbrella',
  }),

  // --- quantitative ----------------------------------------------------------
  singleSelect({
    itemId: 'SYN-QUANT-SERIES-01',
    typeCode: 'QUANT-SERIES-01',
    domain: 'quantitative',
    title: 'Pattern Steps',
    blurb: 'Pick what continues the number pattern.',
    difficultyLevel: 3,
    prompt: 'What number comes next?',
    stimulus: '2, 4, 6, 8, ___',
    options: [
      { label: '10', lure: 'correct' },
      { label: '9', lure: 'near_order' },
      { label: '12', lure: 'rule_violation' },
      { label: '16', lure: 'distractor_other' },
    ],
    seed: 'quant-series-plus2',
  }),
  singleSelect({
    itemId: 'SYN-QUANT-FUNC-01',
    typeCode: 'QUANT-FUNC-01',
    domain: 'quantitative',
    title: 'Machine Rule',
    blurb: 'Work out the rule and choose what the machine makes.',
    difficultyLevel: 5,
    prompt: 'The machine adds the same amount every time (1 to 3, 2 to 4, 3 to 5). What does 5 become?',
    stimulus: '5 to ___',
    options: [
      { label: '7', lure: 'correct' },
      { label: '6', lure: 'near_order' },
      { label: '8', lure: 'rule_violation' },
      { label: '10', lure: 'distractor_other' },
    ],
    seed: 'quant-func-plus2',
  }),

  // --- spatial ---------------------------------------------------------------
  singleSelect({
    itemId: 'SYN-SPA-FOLDNET-01',
    typeCode: 'SPA-FOLDNET-01',
    domain: 'spatial',
    title: 'Missing Quarter',
    blurb: 'Find the missing part of the square.',
    difficultyLevel: 4,
    prompt:
      'A square is split into four equal quarters. Three are filled and the top-right quarter is empty. Which quarter is missing?',
    options: [
      { label: 'Top-right', lure: 'correct' },
      { label: 'Top-left', lure: 'surface_match' },
      { label: 'Bottom-right', lure: 'near_order' },
      { label: 'None — it is full', lure: 'rule_violation' },
    ],
    seed: 'spa-foldnet-quarter',
  }),
  singleSelect({
    itemId: 'SYN-SPA-ROLL-01',
    typeCode: 'SPA-ROLL-01',
    domain: 'spatial',
    title: 'Rolling Cube',
    blurb: 'Track the cube as it tips over.',
    difficultyLevel: 5,
    prompt:
      'A cube shows a star on top and a moon on its right side. It tips one step over its right edge. What is on top now?',
    options: [
      { label: 'Moon', lure: 'correct' },
      { label: 'Star', lure: 'reversed_relation' },
      { label: 'Sun', lure: 'distractor_other' },
      { label: 'The bottom face', lure: 'rule_violation' },
    ],
    seed: 'spa-roll-right',
  }),
];

/** The synthetic sample bank as generic BankItems (for the session shell). */
export function syntheticSampleBank(): BankItem[] {
  return [...SYNTHETIC_SAMPLE_ITEMS];
}
