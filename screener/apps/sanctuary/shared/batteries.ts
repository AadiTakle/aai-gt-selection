import type { Domain } from './types';

/**
 * CogAT's three batteries, and the in-world verb each item type is dressed as.
 *
 * WHY THREE AND NOT FOUR. CogAT reports Verbal, Quantitative and Nonverbal. It has no working-memory
 * battery, and its Nonverbal battery is figure matrices, figure classification and paper folding, which
 * in this bank is the `FLU-*` types plus `SPA-*` together. So the app reports on CogAT's structure
 * rather than on the engine's four internal blueprint slots. Two things fall out of that, both good:
 *
 *   - Spatial stops being a one-type battery. `SPA-XFORM-01` alone would have made the "spatial
 *     estimate" really a 4x4-lattice-transformation estimate. Inside Nonverbal it sits beside three
 *     fluid types, 942 scorable records in total.
 *   - Three batteries reach a reportable interval in about nine visits rather than twelve, because the
 *     target is 3 x 32 items instead of 4 x 32.
 *
 * A sortie restricted to one battery's types IS a per-battery measurement. `POST /api/bank/sessions`
 * accepts `types`, and the coverage rule already passes any domain the pool does not contain, so a
 * Nonverbal sortie spanning FLU and SPA stops on those two alone.
 */
export type Battery = 'Verbal' | 'Quantitative' | 'Nonverbal';

export const BATTERIES: readonly Battery[] = ['Verbal', 'Quantitative', 'Nonverbal'];

export interface Verb {
  id: string;
  typeCode: string;
  battery: Battery;
  /** The engine's own domain label, kept because the serve carries it and it is worth cross-checking. */
  domain: Domain;
  /** What the child is doing. Never a question, never a test. */
  title: string;
  /** The world system this verb's outcome feeds. */
  drives: string;
  /** Lowest tenure tier that unlocks it. Tier is a function of visits, never of correctness. */
  tier: 1 | 2 | 3;
}

export const VERBS: readonly Verb[] = [
  // Nonverbal
  { id: 'coat', typeCode: 'FLU-MATRIX-01', battery: 'Nonverbal', domain: 'fluid', title: 'Coaxing a coat', drives: 'markings, which decide the adult form', tier: 1 },
  { id: 'mossbed', typeCode: 'FLU-CARPET-01', battery: 'Nonverbal', domain: 'fluid', title: 'Laying the mossbed', drives: 'which wild species visit', tier: 2 },
  { id: 'stones', typeCode: 'SPA-XFORM-01', battery: 'Nonverbal', domain: 'spatial', title: 'Stone-setting', drives: 'burrow shape', tier: 2 },
  { id: 'tumbler', typeCode: 'FLU-OPCHAIN-01', battery: 'Nonverbal', domain: 'fluid', title: 'The Tumbler', drives: 'what a creature becomes', tier: 3 },
  // Quantitative
  { id: 'tide-line', typeCode: 'QUANT-SERIES-01', battery: 'Quantitative', domain: 'quantitative', title: 'The tide-line', drives: 'growth cadence', tier: 1 },
  { id: 'sprouter', typeCode: 'QUANT-FUNC-01', battery: 'Quantitative', domain: 'quantitative', title: 'The Sprouter', drives: 'how much of a bed fills', tier: 2 },
  { id: 'bough', typeCode: 'QUANT-BALANCE-01', battery: 'Quantitative', domain: 'quantitative', title: 'The weighing bough', drives: 'who may share a glade', tier: 3 },
  // Verbal
  { id: 'log', typeCode: 'VER-SEQUENCE-01', battery: 'Verbal', domain: 'verbal', title: 'The day’s log', drives: 'the journal', tier: 1 },
  { id: 'gate', typeCode: 'VER-SORTBOT-01', battery: 'Verbal', domain: 'verbal', title: 'The sorting gate', drives: 'admissions', tier: 2 },
  { id: 'kinship', typeCode: 'VER-RELPAIR-01', battery: 'Verbal', domain: 'verbal', title: 'The kinship stone', drives: 'lineage', tier: 3 },
];

export function typesFor(battery: Battery, maxTier = 3): string[] {
  return VERBS.filter((v) => v.battery === battery && v.tier <= maxTier).map((v) => v.typeCode);
}

export function verbFor(typeCode: string): Verb | undefined {
  return VERBS.find((v) => v.typeCode === typeCode);
}

export function verbsFor(battery: Battery): Verb[] {
  return VERBS.filter((v) => v.battery === battery);
}
