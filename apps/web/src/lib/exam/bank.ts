/**
 * The ~10-minute screening battery: 8 question types, 2 per reasoning domain,
 * drawn from the GT question-type catalog (research/exam-question-types). Each
 * `demoPath` points at a self-contained, self-adapting demo served from
 * `public/exam-demos/`; the runner sequences them and harvests each one's
 * on-screen metrics when it reaches its "done" phase.
 *
 * Order interleaves domains so a child never does two of the same in a row.
 * Titles/one-liners are from the catalog's `master_types.jsonl`.
 */

import type { BankEmbeddedDemo } from './item';

export type ExamDomain = 'fluid_reasoning' | 'verbal' | 'quantitative' | 'spatial';

export interface ExamBankItem {
  typeCode: string;
  domain: ExamDomain;
  title: string;
  blurb: string;
  demoPath: string;
}

export const DOMAIN_LABEL: Record<ExamDomain, string> = {
  fluid_reasoning: 'Fluid reasoning',
  verbal: 'Verbal',
  quantitative: 'Quantitative',
  spatial: 'Spatial',
};

/** All four domains, in display order. */
export const EXAM_DOMAINS: ExamDomain[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

function demo(typeCode: string): string {
  return `/exam-demos/${typeCode}.html`;
}

export const EXAM_BANK: ExamBankItem[] = [
  {
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    title: 'Machine Matrix',
    blurb: 'Tap the tile that completes the pattern.',
    demoPath: demo('FLU-MATRIX-01'),
  },
  {
    typeCode: 'VER-CLOZE-01',
    domain: 'verbal',
    title: 'Fill the Gap',
    blurb: 'Choose the word that best completes the sentence.',
    demoPath: demo('VER-CLOZE-01'),
  },
  {
    typeCode: 'QUANT-SERIES-01',
    domain: 'quantitative',
    title: 'Pattern Steps',
    blurb: 'Pick what continues the stepping pattern.',
    demoPath: demo('QUANT-SERIES-01'),
  },
  {
    typeCode: 'SPA-FOLDNET-01',
    domain: 'spatial',
    title: 'Fold-the-Net',
    blurb: 'Fold the flat net into a box and find the opposite face.',
    demoPath: demo('SPA-FOLDNET-01'),
  },
  {
    typeCode: 'FLU-ANALOGY-01',
    domain: 'fluid_reasoning',
    title: 'Shape Morph',
    blurb: 'Make the third shape change the same way as the first pair.',
    demoPath: demo('FLU-ANALOGY-01'),
  },
  {
    typeCode: 'VER-RELPAIR-01',
    domain: 'verbal',
    title: 'Relation Match',
    blurb: 'Find the pair of words that relate the same way.',
    demoPath: demo('VER-RELPAIR-01'),
  },
  {
    typeCode: 'QUANT-FUNC-01',
    domain: 'quantitative',
    title: 'Machine Rule',
    blurb: 'Work out the rule and choose what the machine makes next.',
    demoPath: demo('QUANT-FUNC-01'),
  },
  {
    typeCode: 'SPA-ROLL-01',
    domain: 'spatial',
    title: 'Rolling Cube',
    blurb: 'Track a cube as it tips along a path.',
    demoPath: demo('SPA-ROLL-01'),
  },
];

export function domainLabel(domain: string): string {
  return DOMAIN_LABEL[domain as ExamDomain] ?? domain.replace('_', ' ');
}

/**
 * Adapt the legacy iframe battery to the generic bank-item model so it can run
 * through the session shell + player like any other item type. These demos
 * self-adapt and self-score in-frame, so `difficultyLevel` is a placeholder (the
 * reached difficulty is harvested from the demo's `M-DIFFREACH`, not this field).
 */
export function embeddedDemoBank(): BankEmbeddedDemo[] {
  return EXAM_BANK.map((item) => ({
    renderKind: 'embedded-demo',
    itemId: item.typeCode,
    typeCode: item.typeCode,
    domain: item.domain,
    title: item.title,
    blurb: item.blurb,
    difficultyLevel: 1,
    demoPath: item.demoPath,
    syntheticOnly: true,
    validated: false,
  }));
}
