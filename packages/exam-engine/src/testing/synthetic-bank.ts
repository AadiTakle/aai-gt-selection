/**
 * Born-synthetic bank + deterministic responder harness.
 *
 * Lets the engine run end-to-end before the real item banks exist (used by the unit tests and
 * available to the integration/frontend workstreams). Everything here is `syntheticOnly=true`,
 * `validated=false`, and fully deterministic.
 */
import { isDone } from '../done';
import { nextItem, nextType } from '../selection';
import { startState } from '../state';
import { clamp } from '../stats';
import { update } from '../update';
import {
  type AgeBand,
  type Area,
  type BankItem,
  type Banks,
  type EngineConfig,
  type MetricId,
  type QuestionType,
  type ScoredItem,
  type ServedItem,
  type SessionState,
} from '../types';

/**
 * Metrics every synthetic type reports: the `scope: 'all'` core metrics a RENDERER can actually
 * produce for a single item. Session-level aggregates (`M-RTVAR`, `M-CONSIST`, `M-LEARNRATE`,
 * `M-DIFFREACH`, `M-ROTSLOPE`) are deliberately absent — fabricating them here is what previously
 * made this harness unable to detect an unsatisfiable stop rule. The engine derives them from the
 * trace instead; see `derived.ts` and `real-bank.test.ts`.
 */
const ALL_SCOPE_METRICS: MetricId[] = [
  'M-ACC',
  'M-RT',
  'M-RTFIRST',
  'M-REV',
  'M-ERRTYPE',
  'M-ENGAGE',
  'M-RAPIDGUESS',
];

const TYPE_BLUEPRINTS: { typeCode: string; domain: Area; extra: MetricId[] }[] = [
  {
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    extra: ['M-RULEID', 'M-PATH', 'M-EFF', 'M-PLANFUL'],
  },
  { typeCode: 'FLU-SERIES-02', domain: 'fluid_reasoning', extra: ['M-RULEID'] },
  { typeCode: 'VER-RELPAIR-01', domain: 'verbal', extra: ['M-VOCABLVL', 'M-LURETYPE'] },
  { typeCode: 'VER-ANALOGY-02', domain: 'verbal', extra: ['M-VOCABLVL', 'M-LURETYPE'] },
  { typeCode: 'QUANT-SERIES-01', domain: 'quantitative', extra: ['M-PAE'] },
  { typeCode: 'QUANT-NUMLINE-02', domain: 'quantitative', extra: ['M-PAE'] },
  { typeCode: 'SPA-FOLDNET-01', domain: 'spatial', extra: [] },
  /** Carries an angular disparity per item so the derived `M-ROTSLOPE` path is exercisable. */
  { typeCode: 'SPA-ROT-02', domain: 'spatial', extra: [] },
];

/** The synthetic type whose items carry an angular disparity (mirrors SPA-VIEW-01 / SPA-XSCAN-01). */
const ROTATION_TYPE_CODE = 'SPA-ROT-02';
const ROTATION_DISPARITIES = [0, 45, 90, 135, 180];

const ALL_AGE_BANDS: AgeBand[] = ['K-1', '2-3', '4-5', '6-8', 'above-level'];

/** Map a difficulty (1..20) to its design age band (BUILD_PLAN §0 ramp). */
export function difficultyToBand(difficulty: number): AgeBand {
  if (difficulty <= 4) return 'K-1';
  if (difficulty <= 8) return '2-3';
  if (difficulty <= 12) return '4-5';
  if (difficulty <= 16) return '6-8';
  return 'above-level';
}

export interface SyntheticBankOptions {
  /** Copies per difficulty level per type. Default 2. */
  copies?: number;
  /** Difficulty step across the 1..20 ramp. Default 0.5 (≥5 items per ±1 pt band per type). */
  step?: number;
}

/** Build a deterministic synthetic bank spanning difficulty 1..20 for all four areas. */
export function buildSyntheticBanks(options: SyntheticBankOptions = {}): Banks {
  const copies = options.copies ?? 2;
  const step = options.step ?? 0.5;
  const types: QuestionType[] = TYPE_BLUEPRINTS.map((bp) => ({
    typeCode: bp.typeCode,
    domain: bp.domain,
    ageBands: [...ALL_AGE_BANDS],
    metrics: [...ALL_SCOPE_METRICS, ...bp.extra],
  }));

  const items: BankItem[] = [];
  for (const bp of TYPE_BLUEPRINTS) {
    for (let difficulty = 1; difficulty <= 20 + 1e-9; difficulty += step) {
      const level = Math.round(difficulty * 10) / 10;
      for (let copy = 0; copy < copies; copy++) {
        items.push({
          itemId: `${bp.typeCode}#${level.toFixed(1)}.${copy}`,
          typeCode: bp.typeCode,
          domain: bp.domain,
          difficulty: level,
          ageBands: [difficultyToBand(level)],
          content: { prompt: `${bp.typeCode} @ difficulty ${level.toFixed(1)}` },
          answer: { correctKey: 'A' },
          scoring: { mode: 'deterministic_key' },
          provenance: { generator: 'grammar' },
          syntheticOnly: true,
          validated: false,
        });
      }
    }
  }

  return { types, items };
}

/** A per-area "true ability" on the 1..20 scale for the simulated responder. */
export type TrueTheta = Record<Area, number>;

/**
 * Value for a per-item observed metric. Only metrics a renderer really emits reach this, so a
 * stable placeholder is honest for the ones with no modelled meaning here — unlike a fabricated
 * value for a session-level aggregate, which would paper over missing coverage.
 */
function metricValue(
  metricId: MetricId,
  difficulty: number,
  score: number,
  errType: number,
): number {
  if (metricId === 'M-ACC') return score;
  if (metricId === 'M-ERRTYPE') return errType;
  if (metricId === 'M-RT') return Math.round(900 + 60 * difficulty + (score >= 0.5 ? 0 : 250));
  if (metricId === 'M-RTFIRST') return Math.round(320 + 20 * difficulty);
  return 1;
}

/** Angular disparity for a rotation-type item, derived deterministically from its difficulty. */
function disparityFor(item: { typeCode: string; difficulty: number }): number | null {
  if (item.typeCode !== ROTATION_TYPE_CODE) return null;
  const index = Math.round(item.difficulty * 2) % ROTATION_DISPARITIES.length;
  return ROTATION_DISPARITIES[index] as number;
}

/**
 * Deterministic responder: gets items at or below its true ability right and harder ones wrong.
 * Wrong answers just above the ability threshold report a high `M-ERRTYPE` near-miss (so the
 * engine softens the downward step), fading to a random miss further above.
 */
export function respondSynthetically(
  served: ServedItem,
  banks: Banks,
  trueTheta: TrueTheta,
): ScoredItem {
  const theta = trueTheta[served.domain];
  const correct = served.difficulty <= theta;
  const score = correct ? 1 : 0;
  const errType = correct ? 0 : clamp(1 - (served.difficulty - theta) / 5, 0, 1);

  const type = banks.types.find((t) => t.typeCode === served.typeCode);
  const metrics: Record<MetricId, number> = {};
  if (type) {
    for (const metricId of type.metrics) {
      metrics[metricId] = metricValue(metricId, served.difficulty, score, errType);
    }
  }

  const disparity = disparityFor(served);

  return {
    itemId: served.itemId,
    typeCode: served.typeCode,
    domain: served.domain,
    response: { choice: correct ? 'A' : 'B' },
    metrics,
    telemetry: [],
    correct,
    score,
    difficulty: served.difficulty,
    ...(disparity === null ? {} : { stimulus: { angularDisparityDeg: disparity } }),
  };
}

export interface SessionStep {
  typeCode: string;
  itemId: string;
  domain: Area;
  difficulty: number;
  correct: boolean;
}

export interface SyntheticSessionResult {
  state: SessionState;
  banks: Banks;
  trace: SessionStep[];
  done: boolean;
}

/**
 * Run a full adaptive session against a synthetic bank and deterministic responder, looping
 * `nextType → nextItem → respond → update` until `isDone` (or nothing is left to serve).
 */
export function runSyntheticSession(
  gradeBand: AgeBand,
  trueTheta: TrueTheta,
  overrides?: Partial<EngineConfig>,
  bankOptions?: SyntheticBankOptions,
): SyntheticSessionResult {
  const banks = buildSyntheticBanks(bankOptions);
  let state = startState(gradeBand, overrides);
  const trace: SessionStep[] = [];

  while (!isDone(state)) {
    const typeCode = nextType(state, banks);
    if (typeCode === null) break;
    const served = nextItem(state, typeCode, banks);
    const scored = respondSynthetically(served, banks, trueTheta);
    state = update(state, scored);
    trace.push({
      typeCode,
      itemId: served.itemId,
      domain: served.domain,
      difficulty: served.difficulty,
      correct: scored.correct,
    });
  }

  return { state, banks, trace, done: isDone(state) };
}
