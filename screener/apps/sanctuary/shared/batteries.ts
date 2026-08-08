import type { Domain } from './types';

/**
 * Which item types make up each battery, and the in-world verb each one is dressed as.
 *
 * A sortie restricted to one battery's types IS a per-battery measurement, which is why this app needs
 * no multidimensional engine: `POST /api/bank/sessions` accepts `types`, and the coverage rule already
 * passes a domain whose items are absent from the pool, so a quant-only pool satisfies the other three
 * automatically and stops on quantitative coverage alone.
 */
export interface Verb {
  id: string;
  typeCode: string;
  domain: Domain;
  /** What the child is doing. Never a question, never a test. */
  title: string;
  /** The world system this verb's outcome feeds. */
  drives: string;
  /** Lowest tenure tier that unlocks it. Tier is a function of visits, never of correctness. */
  tier: 1 | 2 | 3;
}

export const VERBS: readonly Verb[] = [
  { id: 'coat', typeCode: 'FLU-MATRIX-01', domain: 'fluid', title: 'Coaxing a coat', drives: 'markings', tier: 1 },
  { id: 'tide-line', typeCode: 'QUANT-SERIES-01', domain: 'quantitative', title: 'The tide-line', drives: 'growth cadence', tier: 1 },
  { id: 'glimmer', typeCode: 'QUANT-DOTS-01', domain: 'quantitative', title: 'The evening glimmer', drives: 'tomorrow’s weather', tier: 1 },
  { id: 'log', typeCode: 'VER-SEQUENCE-01', domain: 'verbal', title: 'The day’s log', drives: 'the journal', tier: 1 },
  { id: 'mossbed', typeCode: 'FLU-CARPET-01', domain: 'fluid', title: 'Laying the mossbed', drives: 'which species visit', tier: 2 },
  { id: 'sprouter', typeCode: 'QUANT-FUNC-01', domain: 'quantitative', title: 'The Sprouter', drives: 'how much of a bed fills', tier: 2 },
  { id: 'stones', typeCode: 'SPA-XFORM-01', domain: 'spatial', title: 'Stone-setting', drives: 'burrow shape', tier: 2 },
  { id: 'gate', typeCode: 'VER-SORTBOT-01', domain: 'verbal', title: 'The sorting gate', drives: 'admissions', tier: 2 },
  { id: 'tumbler', typeCode: 'FLU-OPCHAIN-01', domain: 'fluid', title: 'The Tumbler', drives: 'routing an arrival', tier: 3 },
  { id: 'bough', typeCode: 'QUANT-BALANCE-01', domain: 'quantitative', title: 'The weighing bough', drives: 'who may share a glade', tier: 3 },
  { id: 'kinship', typeCode: 'VER-RELPAIR-01', domain: 'verbal', title: 'The kinship stone', drives: 'lineage', tier: 3 },
];

export function typesFor(domain: Domain, maxTier = 3): string[] {
  return VERBS.filter((v) => v.domain === domain && v.tier <= maxTier).map((v) => v.typeCode);
}

export function verbFor(typeCode: string): Verb | undefined {
  return VERBS.find((v) => v.typeCode === typeCode);
}
